import { chromium } from 'playwright';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

class CompleteScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allSchemes = [];
    this.processedIds = new Set();
  }

  async initialize() {
    try {
      console.log('🚀 Initializing complete scraper...');
      
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic browser headers
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      console.log('✅ Complete scraper initialized');
    } catch (error) {
      console.error('❌ Failed to initialize scraper:', error.message);
      throw error;
    }
  }

  async scrapeAllSchemes() {
    try {
      console.log('🔍 Starting complete scheme extraction...');
      
      // First, get the total count and understand the API structure
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);

      // Now we'll use the page context to make direct API calls
      const totalSchemes = await this.page.evaluate(async () => {
        try {
          // Make the initial API call to get total count
          const response = await fetch('https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=&sort=&from=0&size=1', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://www.myscheme.gov.in/search'
            }
          });
          
          const data = await response.json();
          if (data.status === 'Success') {
            return data.data.summary.total;
          }
          return 0;
        } catch (error) {
          console.error('Error getting total:', error);
          return 0;
        }
      });

      console.log(`📊 Total schemes available: ${totalSchemes}`);

      if (totalSchemes === 0) {
        throw new Error('Could not determine total scheme count');
      }

      // Calculate pagination
      const pageSize = 50; // Larger page size for efficiency
      const totalPages = Math.ceil(totalSchemes / pageSize);
      console.log(`📄 Will fetch ${totalPages} pages with ${pageSize} schemes each`);

      // Fetch all pages
      for (let page = 0; page < totalPages; page++) {
        const from = page * pageSize;
        console.log(`📥 Fetching page ${page + 1}/${totalPages} (schemes ${from + 1}-${Math.min(from + pageSize, totalSchemes)})`);
        
        try {
          const schemes = await this.page.evaluate(async (fromIndex, size) => {
            try {
              const response = await fetch(`https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=&sort=&from=${fromIndex}&size=${size}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://www.myscheme.gov.in/search'
                }
              });
              
              const data = await response.json();
              if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
                return data.data.hits.items;
              }
              return [];
            } catch (error) {
              console.error('Error fetching page:', error);
              return [];
            }
          }, from, pageSize);

          if (schemes.length > 0) {
            console.log(`   ✅ Got ${schemes.length} schemes from page ${page + 1}`);
            
            // Process schemes
            for (const item of schemes) {
              const fields = item.fields || item;
              const schemeId = item.id || item._id;
              
              // Skip if already processed
              if (this.processedIds.has(schemeId)) {
                continue;
              }
              
              this.processedIds.add(schemeId);
              
              const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title || fields.scheme_name;
              
              if (schemeName) {
                this.allSchemes.push({
                  schemeId,
                  name: schemeName,
                  description: fields.schemeDescription || fields.description || fields.summary || '',
                  ministry: fields.nodalMinistryName || fields.sponsoringMinistry || fields.ministry || fields.sponsoring_ministry || '',
                  department: fields.sponsoringDepartment || fields.department || fields.sponsoring_department || '',
                  targetAudience: fields.schemeFor || fields.beneficiaryType || fields.beneficiary_type || fields.target_audience || '',
                  sector: Array.isArray(fields.schemeCategory) ? fields.schemeCategory.join(', ') : (fields.schemeCategory || fields.category || fields.sector || ''),
                  launchDate: fields.launchDate || fields.launch_date ? new Date(fields.launchDate || fields.launch_date) : null,
                  budget: fields.budget || null,
                  level: fields.level || '',
                  beneficiaryState: Array.isArray(fields.beneficiaryState) ? fields.beneficiaryState.join(', ') : (fields.beneficiaryState || ''),
                  source: 'api',
                  sourceUrl: 'https://api.myscheme.gov.in/search/v5/schemes',
                  scrapedAt: new Date()
                });
              }
            }
          } else {
            console.log(`   ⚠️ No schemes found on page ${page + 1}`);
          }
          
          // Progress update
          console.log(`   📈 Total unique schemes collected so far: ${this.allSchemes.length}`);
          
          // Respectful delay between requests
          await this.page.waitForTimeout(1500);
          
        } catch (pageError) {
          console.error(`   ❌ Error fetching page ${page + 1}:`, pageError.message);
          // Continue with next page
        }
      }

      console.log(`\n🎉 Scraping completed! Collected ${this.allSchemes.length} unique schemes`);
      return this.allSchemes;

    } catch (error) {
      console.error('❌ Error during complete scraping:', error.message);
      throw error;
    }
  }

  async saveToDatabase() {
    try {
      console.log('💾 Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');

      console.log(`📊 Processing ${this.allSchemes.length} schemes for database storage...`);
      
      let savedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < this.allSchemes.length; i++) {
        const scheme = this.allSchemes[i];
        
        try {
          const schemeData = {
            name: scheme.name,
            description: scheme.description,
            ministry: scheme.ministry,
            department: scheme.department,
            targetAudience: scheme.targetAudience,
            sector: scheme.sector,
            launchDate: scheme.launchDate,
            budget: scheme.budget,
            level: scheme.level,
            beneficiaryState: scheme.beneficiaryState,
            schemeId: scheme.schemeId,
            source: scheme.source,
            sourceUrl: scheme.sourceUrl,
            scrapedAt: scheme.scrapedAt,
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
          if ((i + 1) % 100 === 0) {
            console.log(`   📈 Processed ${i + 1}/${this.allSchemes.length} schemes (${savedCount} saved, ${updatedCount} updated)`);
          }
          
        } catch (schemeError) {
          console.error(`❌ Error saving scheme "${scheme.name}":`, schemeError.message);
          errorCount++;
        }
      }
      
      console.log(`\n🎉 Database operation completed!`);
      console.log(`📊 Final Results:`);
      console.log(`   💾 Saved: ${savedCount} new schemes`);
      console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
      console.log(`   ❌ Errors: ${errorCount} failed operations`);
      console.log(`   📈 Total processed: ${this.allSchemes.length} schemes`);
      
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
      
      return { saved: savedCount, updated: updatedCount, errors: errorCount, total: this.allSchemes.length };
      
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

async function runCompleteScraper() {
  const scraper = new CompleteScraper();
  
  try {
    await scraper.initialize();
    await scraper.scrapeAllSchemes();
    const result = await scraper.saveToDatabase();
    
    console.log(`\n🏆 MISSION ACCOMPLISHED!`);
    console.log(`🎯 Successfully extracted and saved government schemes from MyScheme.gov.in`);
    console.log(`📊 Database now contains ${result.saved + result.updated} schemes!`);
    
  } catch (error) {
    console.error('❌ Complete scraper failed:', error.message);
  } finally {
    await scraper.close();
  }
}

// Run the complete scraper
runCompleteScraper();