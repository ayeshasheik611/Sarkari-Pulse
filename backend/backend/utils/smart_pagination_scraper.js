import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Smart Pagination Scraper
 * Uses the working browser approach but with intelligent pagination
 */
class SmartPaginationScraperService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.extractedSchemes = new Map();
    this.stats = {
      totalPages: 0,
      successfulPages: 0,
      schemesFound: 0,
      duplicatesSkipped: 0,
      errors: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing Smart Pagination scraper...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set realistic browser headers
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Referer': 'https://www.myscheme.gov.in/'
    });

    console.log('✅ Smart scraper initialized');
  }

  async scrapeAllSchemes() {
    try {
      console.log('🎯 Starting smart pagination extraction...');
      console.log('📊 Strategy: Use browser to bypass rate limits with intelligent pagination');
      
      // First, get the total count and determine optimal strategy
      const totalSchemes = await this.getTotalSchemeCount();
      console.log(`🎯 Total schemes available: ${totalSchemes}`);
      
      if (totalSchemes > 0) {
        // Calculate optimal pagination strategy
        const maxPageSize = 100; // Start with reasonable size
        const totalPages = Math.ceil(totalSchemes / maxPageSize);
        
        console.log(`📄 Pagination plan: ${totalPages} pages with ${maxPageSize} schemes per page`);
        
        // Extract schemes page by page
        await this.extractWithPagination(totalPages, maxPageSize);
      }
      
      const schemes = Array.from(this.extractedSchemes.values());
      console.log(`🎉 Smart pagination completed: ${schemes.length} unique schemes extracted`);
      
      return schemes;
      
    } catch (error) {
      console.error('❌ Smart pagination failed:', error.message);
      throw error;
    }
  }

  async getTotalSchemeCount() {
    try {
      console.log('📊 Getting total scheme count...');
      
      // Navigate to the main page first to establish session
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      await this.page.waitForTimeout(3000);
      
      // Now make API call to get total count
      const apiUrl = 'https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=&sort=&from=0&size=1';
      
      const response = await this.page.goto(apiUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      if (response.ok()) {
        const content = await this.page.textContent('body');
        const data = JSON.parse(content);
        
        if (data.data && data.data.summary && data.data.summary.total) {
          return data.data.summary.total;
        }
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Error getting total count:', error.message);
      return 0;
    }
  }

  async extractWithPagination(totalPages, pageSize) {
    console.log(`📄 Starting pagination extraction: ${totalPages} pages`);
    
    for (let page = 0; page < totalPages; page++) {
      try {
        const from = page * pageSize;
        console.log(`📄 Extracting page ${page + 1}/${totalPages} (from=${from}, size=${pageSize})`);
        
        // Navigate back to main site first to maintain session
        if (page % 10 === 0) {
          console.log('🔄 Refreshing session...');
          await this.page.goto('https://www.myscheme.gov.in/search', {
            waitUntil: 'networkidle',
            timeout: 30000
          });
          await this.page.waitForTimeout(2000);
        }
        
        // Make API call for this page
        const apiUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=&sort=&from=${from}&size=${pageSize}`;
        
        const response = await this.page.goto(apiUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        this.stats.totalPages++;
        
        if (response.ok()) {
          const content = await this.page.textContent('body');
          const data = JSON.parse(content);
          
          if (data.data && data.data.hits && data.data.hits.items) {
            const schemes = data.data.hits.items;
            console.log(`✅ Found ${schemes.length} schemes on page ${page + 1}`);
            
            if (schemes.length === 0) {
              console.log('📄 Empty page reached, stopping pagination');
              break;
            }
            
            this.processSchemes(schemes, apiUrl);
            this.stats.successfulPages++;
          } else {
            console.log(`⚠️ No schemes found on page ${page + 1}`);
          }
        } else {
          console.log(`❌ Page ${page + 1} failed: ${response.status()} ${response.statusText()}`);
          this.stats.errors++;
          
          // If we get rate limited, wait longer
          if (response.status() === 429) {
            console.log('⏳ Rate limited, waiting 10 seconds...');
            await this.page.waitForTimeout(10000);
          }
        }
        
        // Progressive delay - longer waits as we make more requests
        const delay = Math.min(1000 + (page * 50), 5000);
        await this.page.waitForTimeout(delay);
        
      } catch (error) {
        console.error(`❌ Error on page ${page + 1}:`, error.message);
        this.stats.errors++;
        
        // Wait before retrying
        await this.page.waitForTimeout(3000);
      }
    }
  }

  processSchemes(schemes, sourceUrl) {
    for (const item of schemes) {
      try {
        const fields = item.fields || item;
        const schemeId = item.id || item._id || '';
        
        const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
        
        if (schemeName && schemeName.trim().length > 3) {
          const key = schemeName.toLowerCase().trim();
          
          if (!this.extractedSchemes.has(key)) {
            this.extractedSchemes.set(key, {
              name: schemeName.trim(),
              description: fields.schemeDescription || fields.description || '',
              ministry: fields.nodalMinistryName || fields.sponsoringMinistry || fields.ministry || '',
              department: fields.sponsoringDepartment || fields.department || '',
              targetAudience: fields.schemeFor || fields.beneficiaryType || fields.target_audience || '',
              sector: Array.isArray(fields.schemeCategory) ? fields.schemeCategory.join(', ') : (fields.schemeCategory || ''),
              launchDate: fields.launchDate ? new Date(fields.launchDate) : null,
              budget: fields.budget || null,
              level: fields.level || '',
              beneficiaryState: Array.isArray(fields.beneficiaryState) ? fields.beneficiaryState.join(', ') : (fields.beneficiaryState || ''),
              schemeId: schemeId,
              source: 'smart-pagination',
              sourceUrl: sourceUrl,
              scrapedAt: new Date(),
              isActive: true
            });
            this.stats.schemesFound++;
          } else {
            this.stats.duplicatesSkipped++;
          }
        }
      } catch (error) {
        console.error('Error processing scheme:', error.message);
      }
    }
  }

  async saveSchemesToDatabase(schemes) {
    console.log(`💾 Saving ${schemes.length} schemes to database...`);
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const schemeData of schemes) {
      try {
        const existingScheme = await Scheme.findOne({ 
          name: { $regex: `^${schemeData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });

        if (existingScheme) {
          await Scheme.findByIdAndUpdate(existingScheme._id, {
            ...schemeData,
            updatedAt: new Date()
          });
          updatedCount++;
        } else {
          await Scheme.create({
            ...schemeData,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          savedCount++;
        }
      } catch (schemeError) {
        console.error(`❌ Error saving scheme "${schemeData.name}":`, schemeError.message);
        errorCount++;
      }
    }

    console.log(`✅ Database save completed: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
    return { savedCount, updatedCount, errorCount };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  getStats() {
    return {
      ...this.stats,
      uniqueSchemes: this.extractedSchemes.size,
      successRate: this.stats.totalPages > 0 ? 
        Math.round((this.stats.successfulPages / this.stats.totalPages) * 100) : 0
    };
  }
}

// Main execution
async function runSmartPaginationScraping() {
  let scraper = null;
  
  try {
    console.log('🚀 Starting SMART PAGINATION MyScheme scraping...');
    console.log('🎯 Target: ALL 3,850 schemes using intelligent browser-based pagination');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize scraper
    scraper = new SmartPaginationScraperService();
    await scraper.initialize();
    
    // Start smart scraping
    const startTime = new Date();
    const schemes = await scraper.scrapeAllSchemes();
    const endTime = new Date();
    
    // Save to database
    const saveResult = await scraper.saveSchemesToDatabase(schemes);
    
    const duration = Math.round((endTime - startTime) / 1000);
    const stats = scraper.getStats();

    console.log('');
    console.log('🎉 SMART PAGINATION SCRAPING COMPLETED!');
    console.log('========================================');
    console.log(`✅ Total unique schemes: ${schemes.length}`);
    console.log(`💾 Saved to database: ${saveResult.savedCount} new, ${saveResult.updatedCount} updated`);
    console.log(`⏱️ Total time: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📄 Pages processed: ${stats.totalPages}`);
    console.log(`✅ Successful pages: ${stats.successfulPages}`);
    console.log(`📊 Success rate: ${stats.successRate}%`);
    console.log(`🔄 Duplicates skipped: ${stats.duplicatesSkipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('');

    if (schemes.length >= 3000) {
      console.log('🎯 EXCELLENT: Extracted 3,000+ schemes - nearly complete!');
    } else if (schemes.length >= 1000) {
      console.log('✅ GREAT: Extracted 1,000+ schemes - substantial progress!');
    } else if (schemes.length >= 500) {
      console.log('👍 GOOD: Extracted 500+ schemes');
    } else {
      console.log('⚠️ Limited extraction: ' + schemes.length + ' schemes');
    }

  } catch (error) {
    console.error('❌ Smart pagination scraping failed:', error.message);
    console.error(error.stack);
  } finally {
    if (scraper) {
      await scraper.close();
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmartPaginationScraping();
}

export default SmartPaginationScraperService;