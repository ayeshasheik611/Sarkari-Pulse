import { chromium } from 'playwright';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

class PaginationScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allSchemes = new Map();
    this.processedIds = new Set();
  }

  async initialize() {
    console.log('🚀 Initializing pagination-focused scraper...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    // Intercept API calls
    await this.page.route('**/api.myscheme.gov.in/search/v5/schemes**', async (route) => {
      const request = route.request();
      const url = request.url();
      
      await route.continue();
      
      try {
        const response = await request.response();
        if (response && response.status() === 200) {
          const data = await response.json();
          if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
            console.log(`📡 Captured ${data.data.hits.items.length} schemes from: ${url}`);
            this.processSchemes(data.data.hits.items);
          }
        }
      } catch (e) {
        // Ignore
      }
    });
    
    console.log('✅ Pagination scraper ready');
  }

  async scrapeWithPagination() {
    try {
      console.log('🔍 Starting pagination-focused extraction...');
      
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      
      // Navigate to search page
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      await this.page.waitForTimeout(3000);
      
      // Try to trigger pagination by scrolling and interacting
      let previousCount = 0;
      let stagnantRounds = 0;
      const maxStagnantRounds = 5;
      
      for (let round = 1; round <= 50; round++) {
        console.log(`\n🔄 Pagination Round ${round}/50`);
        
        // Scroll to bottom
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await this.page.waitForTimeout(2000);
        
        // Try to find and click "Load More" or pagination buttons
        const paginationActions = [
          async () => {
            const loadMore = await this.page.$('button:has-text("Load More"), button:has-text("Show More"), .load-more');
            if (loadMore) {
              await loadMore.click();
              console.log('   🖱️ Clicked Load More');
              return true;
            }
            return false;
          },
          async () => {
            const nextButton = await this.page.$('button:has-text("Next"), a:has-text("Next"), .next');
            if (nextButton) {
              await nextButton.click();
              console.log('   🖱️ Clicked Next');
              return true;
            }
            return false;
          },
          async () => {
            // Try to find pagination numbers
            const pageNumbers = await this.page.$$('.pagination button, .pagination a');
            for (const pageNum of pageNumbers.slice(0, 3)) {
              try {
                await pageNum.click();
                console.log('   🖱️ Clicked page number');
                await this.page.waitForTimeout(2000);
                return true;
              } catch (e) {
                // Continue
              }
            }
            return false;
          }
        ];
        
        // Try each pagination action
        let actionSucceeded = false;
        for (const action of paginationActions) {
          try {
            if (await action()) {
              actionSucceeded = true;
              break;
            }
          } catch (e) {
            // Continue
          }
        }
        
        if (!actionSucceeded) {
          // Try random interactions to trigger more data
          await this.randomInteractions();
        }
        
        // Wait for new data to load
        await this.page.waitForTimeout(3000);
        
        // Check progress
        const currentCount = this.allSchemes.size;
        console.log(`   📊 Current schemes: ${currentCount} (${currentCount - previousCount} new this round)`);
        
        if (currentCount === previousCount) {
          stagnantRounds++;
          console.log(`   ⚠️ No new schemes found (${stagnantRounds}/${maxStagnantRounds} stagnant rounds)`);
          
          if (stagnantRounds >= maxStagnantRounds) {
            console.log('   🛑 Stopping pagination - no new schemes found in recent rounds');
            break;
          }
        } else {
          stagnantRounds = 0; // Reset stagnant counter
        }
        
        previousCount = currentCount;
        
        // If we've reached a good number, we can continue but with less frequency
        if (currentCount >= 100 && round % 5 !== 0) {
          continue; // Skip some rounds to speed up
        }
      }
      
      console.log(`\n🎉 Pagination extraction completed!`);
      console.log(`📊 Total unique schemes extracted: ${this.allSchemes.size}`);
      
      // Save to database
      const result = await this.saveToDatabase();
      
      await mongoose.disconnect();
      console.log('✅ Database disconnected');
      
      return result;
      
    } catch (error) {
      console.error('❌ Pagination scraping failed:', error.message);
      throw error;
    }
  }

  async randomInteractions() {
    try {
      // Random scroll
      const scrollAmount = Math.floor(Math.random() * 800) + 200;
      await this.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
      
      // Try clicking random safe elements
      const safeSelectors = ['button:not([type="submit"])', '.btn:not(.danger)', 'a[href*="scheme"]'];
      for (const selector of safeSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            const randomElement = elements[Math.floor(Math.random() * Math.min(elements.length, 2))];
            await randomElement.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    } catch (error) {
      // Ignore
    }
  }

  processSchemes(schemes) {
    for (const item of schemes) {
      const fields = item.fields || item;
      const schemeId = item.id || item._id;
      const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
      
      if (schemeName && schemeId && !this.processedIds.has(schemeId)) {
        this.processedIds.add(schemeId);
        const key = `api_${schemeId}`;
        
        this.allSchemes.set(key, {
          schemeId,
          name: schemeName,
          description: fields.schemeDescription || fields.description || '',
          ministry: fields.nodalMinistryName || fields.sponsoringMinistry || '',
          department: fields.sponsoringDepartment || fields.department || '',
          targetAudience: fields.schemeFor || fields.beneficiaryType || '',
          sector: Array.isArray(fields.schemeCategory) ? fields.schemeCategory.join(', ') : (fields.schemeCategory || ''),
          level: fields.level || '',
          beneficiaryState: Array.isArray(fields.beneficiaryState) ? fields.beneficiaryState.join(', ') : (fields.beneficiaryState || ''),
          source: 'api',
          extractedAt: new Date()
        });
        
        console.log(`     ✅ New scheme: ${schemeName}`);
      }
    }
  }

  async saveToDatabase() {
    try {
      const schemes = Array.from(this.allSchemes.values());
      let savedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (const scheme of schemes) {
        try {
          const result = await Scheme.findOneAndUpdate(
            { 
              $or: [
                { schemeId: scheme.schemeId },
                { name: { $regex: `^${scheme.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
              ]
            },
            {
              name: scheme.name,
              description: scheme.description,
              ministry: scheme.ministry,
              department: scheme.department,
              targetAudience: scheme.targetAudience,
              sector: scheme.sector,
              level: scheme.level,
              beneficiaryState: scheme.beneficiaryState,
              schemeId: scheme.schemeId,
              source: scheme.source,
              sourceUrl: 'https://www.myscheme.gov.in',
              scrapedAt: scheme.extractedAt,
              isActive: true,
              updatedAt: new Date()
            },
            { 
              upsert: true, 
              new: true,
              setDefaultsOnInsert: true
            }
          );

          if (result.isNew !== false) {
            savedCount++;
          } else {
            updatedCount++;
          }
          
        } catch (schemeError) {
          errorCount++;
        }
      }
      
      const finalCount = await Scheme.countDocuments();
      
      console.log(`\n🎉 DATABASE OPERATION COMPLETED!`);
      console.log(`   💾 Saved: ${savedCount} new schemes`);
      console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
      console.log(`   ❌ Errors: ${errorCount} failed operations`);
      console.log(`   🏛️ TOTAL IN DATABASE: ${finalCount} schemes`);
      
      return { saved: savedCount, updated: updatedCount, errors: errorCount, total: schemes.length, finalCount };
      
    } catch (error) {
      console.error('❌ Database save failed:', error.message);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function runPaginationScraper() {
  const scraper = new PaginationScraper();
  
  try {
    await scraper.initialize();
    const result = await scraper.scrapeWithPagination();
    
    console.log(`\n🏆 PAGINATION SCRAPING COMPLETE!`);
    console.log(`🎯 Database now contains ${result.finalCount} government schemes!`);
    
  } catch (error) {
    console.error('❌ Pagination scraper failed:', error.message);
  } finally {
    await scraper.close();
  }
}

runPaginationScraper();