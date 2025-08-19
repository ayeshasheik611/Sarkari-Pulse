import { chromium } from 'playwright';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

class RobustScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allSchemes = new Map();
    this.processedIds = new Set();
    this.capturedApiData = [];
  }

  async initialize() {
    try {
      console.log('🚀 Initializing robust scraper...');
      
      this.browser = await chromium.launch({
        headless: false, // Run visible to see what's happening
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic browser environment
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      });

      // Intercept network requests to capture API responses
      await this.page.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        
        // Continue with the request
        await route.continue();
        
        // Capture API responses
        if (url.includes('api.myscheme.gov.in') && url.includes('schemes')) {
          try {
            const response = await request.response();
            if (response && response.status() === 200) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`📡 Captured API response from: ${url}`);
                this.capturedApiData.push({ url, data, timestamp: new Date() });
              }
            }
          } catch (e) {
            // Ignore errors in response capture
          }
        }
      });
      
      console.log('✅ Robust scraper initialized');
    } catch (error) {
      console.error('❌ Failed to initialize scraper:', error.message);
      throw error;
    }
  }

  async scrapeAllSchemes() {
    try {
      console.log('🔍 Starting comprehensive scheme extraction...');
      
      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      
      // Strategy 1: Use browser automation to get schemes naturally
      await this.browserBasedScraping();
      
      // Strategy 2: Try to extract more by interacting with the page
      await this.interactiveExtraction();
      
      // Strategy 3: Try to find individual scheme pages
      await this.findIndividualSchemePages();
      
      console.log(`\n🎉 Extraction completed! Found ${this.allSchemes.size} unique schemes`);
      
      // Save to database
      const result = await this.saveToDatabase();
      
      console.log(`\n🏆 ROBUST SCRAPING COMPLETED!`);
      console.log(`🎯 Successfully extracted ${this.allSchemes.size} unique schemes`);
      console.log(`📊 Database now contains ${result.finalCount} total schemes!`);
      
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
      
      return result;

    } catch (error) {
      console.error('❌ Robust scraping failed:', error.message);
      throw error;
    }
  }

  async browserBasedScraping() {
    console.log('\n🔍 Strategy 1: Browser-based scraping...');
    
    try {
      // Navigate to the search page
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for content to load
      await this.page.waitForTimeout(5000);

      // Extract schemes from captured API data
      this.processApiData();

      // Try to scroll and load more content
      for (let i = 0; i < 5; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await this.page.waitForTimeout(2000);
      }

      // Process any new API data
      this.processApiData();

    } catch (error) {
      console.error('❌ Browser-based scraping failed:', error.message);
    }
  }

  async interactiveExtraction() {
    console.log('\n🔍 Strategy 2: Interactive extraction...');
    
    try {
      // Try to find and click various elements that might load more schemes
      const interactionSelectors = [
        'button', '.btn', '.load-more', '.show-more', '.view-all',
        '.pagination a', '.next', '.page-link', 'a[href*="page"]'
      ];

      for (const selector of interactionSelectors) {
        try {
          const elements = await this.page.$$(selector);
          console.log(`   🔘 Found ${elements.length} elements for selector: ${selector}`);
          
          for (let i = 0; i < Math.min(elements.length, 3); i++) {
            try {
              const element = elements[i];
              const text = await element.textContent();
              console.log(`     🖱️ Clicking: "${text?.substring(0, 50)}"`);
              
              await element.click();
              await this.page.waitForTimeout(3000);
              
              // Process any new API data
              this.processApiData();
              
            } catch (clickError) {
              console.log(`     ⚠️ Click failed: ${clickError.message}`);
            }
          }
        } catch (selectorError) {
          // Continue to next selector
        }
      }

    } catch (error) {
      console.error('❌ Interactive extraction failed:', error.message);
    }
  }

  async findIndividualSchemePages() {
    console.log('\n🔍 Strategy 3: Finding individual scheme pages...');
    
    try {
      // Try to find links to individual scheme pages
      const schemeLinks = await this.page.$$eval('a[href*="/schemes/"], a[href*="scheme"]', links => 
        links.map(link => ({
          href: link.href,
          text: link.textContent?.trim()
        })).filter(link => link.href && link.text)
      );

      console.log(`   🔗 Found ${schemeLinks.length} potential scheme links`);

      // Visit a few individual scheme pages
      for (let i = 0; i < Math.min(schemeLinks.length, 10); i++) {
        const link = schemeLinks[i];
        try {
          console.log(`   📄 Visiting: ${link.text}`);
          
          await this.page.goto(link.href, {
            waitUntil: 'networkidle',
            timeout: 15000
          });

          await this.page.waitForTimeout(2000);

          // Extract scheme details from the page
          const schemeDetails = await this.page.evaluate(() => {
            const title = document.querySelector('h1, .title, .scheme-name')?.textContent?.trim();
            const description = document.querySelector('.description, .summary, p')?.textContent?.trim();
            const ministry = document.querySelector('.ministry, .dept')?.textContent?.trim();
            
            return {
              name: title,
              description: description?.substring(0, 500),
              ministry: ministry,
              source: 'individual_page'
            };
          });

          if (schemeDetails.name) {
            const key = `individual_${schemeDetails.name}`;
            if (!this.allSchemes.has(key)) {
              this.allSchemes.set(key, {
                ...schemeDetails,
                schemeId: `individual_${Date.now()}_${i}`,
                extractedAt: new Date()
              });
              console.log(`     ✅ Extracted: ${schemeDetails.name}`);
            }
          }

        } catch (pageError) {
          console.log(`     ❌ Failed to visit ${link.text}: ${pageError.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Individual page extraction failed:', error.message);
    }
  }

  processApiData() {
    for (const capture of this.capturedApiData) {
      try {
        const { data } = capture;
        
        // Handle MyScheme API structure
        if (data.data && data.data.hits && data.data.hits.items) {
          const schemes = data.data.hits.items;
          console.log(`   📊 Processing ${schemes.length} schemes from API data`);
          
          for (const item of schemes) {
            const fields = item.fields || item;
            const schemeId = item.id || item._id;
            const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
            
            if (schemeName && schemeId) {
              const key = `api_${schemeId}`;
              if (!this.allSchemes.has(key) && !this.processedIds.has(schemeId)) {
                this.processedIds.add(schemeId);
                this.allSchemes.set(key, {
                  schemeId,
                  name: schemeName,
                  description: fields.schemeDescription || fields.description || fields.summary || '',
                  ministry: fields.nodalMinistryName || fields.sponsoringMinistry || fields.ministry || '',
                  department: fields.sponsoringDepartment || fields.department || '',
                  targetAudience: fields.schemeFor || fields.beneficiaryType || '',
                  sector: Array.isArray(fields.schemeCategory) ? fields.schemeCategory.join(', ') : (fields.schemeCategory || ''),
                  level: fields.level || '',
                  beneficiaryState: Array.isArray(fields.beneficiaryState) ? fields.beneficiaryState.join(', ') : (fields.beneficiaryState || ''),
                  source: 'api',
                  extractedAt: new Date()
                });
                console.log(`     ✅ New API scheme: ${schemeName}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing API data:', error);
      }
    }
    
    // Clear processed data to avoid reprocessing
    this.capturedApiData = [];
  }

  async saveToDatabase() {
    try {
      console.log(`\n💾 Saving ${this.allSchemes.size} schemes to database...`);
      
      const schemes = Array.from(this.allSchemes.values());
      let savedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < schemes.length; i++) {
        const scheme = schemes[i];
        
        try {
          const schemeData = {
            name: scheme.name,
            description: scheme.description || '',
            ministry: scheme.ministry || '',
            department: scheme.department || '',
            targetAudience: scheme.targetAudience || '',
            sector: scheme.sector || '',
            level: scheme.level || '',
            beneficiaryState: scheme.beneficiaryState || '',
            schemeId: scheme.schemeId || `extracted_${Date.now()}_${i}`,
            source: scheme.source || 'extracted',
            sourceUrl: 'https://www.myscheme.gov.in',
            scrapedAt: scheme.extractedAt || new Date(),
            isActive: true
          };
          
          // Upsert logic
          const result = await Scheme.findOneAndUpdate(
            { 
              $or: [
                { schemeId: scheme.schemeId },
                { name: { $regex: `^${scheme.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
              ]
            },
            {
              ...schemeData,
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
          
          // Progress indicator
          if ((i + 1) % 10 === 0) {
            console.log(`   📈 Processed ${i + 1}/${schemes.length} schemes (${savedCount} saved, ${updatedCount} updated)`);
          }
          
        } catch (schemeError) {
          console.error(`❌ Error saving scheme "${scheme.name}":`, schemeError.message);
          errorCount++;
        }
      }
      
      const finalCount = await Scheme.countDocuments();
      
      console.log(`\n🎉 Database operation completed!`);
      console.log(`📊 Results:`);
      console.log(`   💾 Saved: ${savedCount} new schemes`);
      console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
      console.log(`   ❌ Errors: ${errorCount} failed operations`);
      console.log(`   📈 Total processed: ${schemes.length} schemes`);
      console.log(`   🏛️ Final database count: ${finalCount} schemes`);
      
      return { saved: savedCount, updated: updatedCount, errors: errorCount, total: schemes.length, finalCount };
      
    } catch (error) {
      console.error('❌ Database operation failed:', error.message);
      throw error;
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Browser closed successfully');
      }
    } catch (error) {
      console.error('❌ Error closing browser:', error.message);
    }
  }
}

async function runRobustScraper() {
  const scraper = new RobustScraper();
  
  try {
    await scraper.initialize();
    await scraper.scrapeAllSchemes();
  } catch (error) {
    console.error('❌ Robust scraper failed:', error.message);
  } finally {
    await scraper.close();
  }
}

// Run the robust scraper
runRobustScraper();