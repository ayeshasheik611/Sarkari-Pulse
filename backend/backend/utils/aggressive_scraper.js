import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Aggressive MyScheme Scraper
 * Uses multiple strategies to extract maximum schemes
 */
class AggressiveMySchemeScraperService {
  constructor() {
    this.browser = null;
    this.extractedSchemes = new Map();
    this.stats = {
      totalApiCalls: 0,
      successfulCalls: 0,
      schemesFound: 0,
      duplicatesSkipped: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing Aggressive MyScheme scraper...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Browser initialized');
  }

  async scrapeAllSchemes() {
    try {
      console.log('🎯 Starting aggressive extraction of ALL MyScheme schemes...');
      console.log('📊 Target: 3,850+ schemes using multiple strategies');
      
      // Strategy 1: Direct API pagination with large page sizes
      await this.directApiPagination();
      
      // Strategy 2: Search by every letter and number
      await this.searchByCharacters();
      
      // Strategy 3: Category exhaustive search
      await this.categoryExhaustiveSearch();
      
      // Strategy 4: Ministry exhaustive search
      await this.ministryExhaustiveSearch();
      
      // Strategy 5: State-wise search
      await this.stateWiseSearch();
      
      const schemes = Array.from(this.extractedSchemes.values());
      console.log(`🎉 Aggressive scraping completed: ${schemes.length} unique schemes extracted`);
      
      return schemes;
      
    } catch (error) {
      console.error('❌ Aggressive scraping failed:', error.message);
      throw error;
    }
  }

  async directApiPagination() {
    console.log('📡 Strategy 1: Direct API pagination with large pages...');
    
    const page = await this.browser.newPage();
    
    try {
      // Try different page sizes and starting points
      const configurations = [
        { size: 100, maxPages: 50 },
        { size: 200, maxPages: 25 },
        { size: 500, maxPages: 10 }
      ];
      
      for (const config of configurations) {
        console.log(`📄 Testing pagination: size=${config.size}, maxPages=${config.maxPages}`);
        
        for (let pageNum = 0; pageNum < config.maxPages; pageNum++) {
          const from = pageNum * config.size;
          const apiUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=&sort=&from=${from}&size=${config.size}`;
          
          try {
            console.log(`📥 Fetching page ${pageNum + 1}/${config.maxPages} (from=${from}, size=${config.size})`);
            
            const response = await page.goto(apiUrl, { waitUntil: 'networkidle', timeout: 30000 });
            
            if (response.ok()) {
              const content = await page.textContent('body');
              const data = JSON.parse(content);
              
              if (data.data && data.data.hits && data.data.hits.items) {
                const schemes = data.data.hits.items;
                console.log(`✅ Found ${schemes.length} schemes on page ${pageNum + 1}`);
                
                if (schemes.length === 0) {
                  console.log('📄 Empty page reached, stopping this configuration');
                  break;
                }
                
                this.processSchemes(schemes, apiUrl);
                this.stats.successfulCalls++;
              }
            }
            
            this.stats.totalApiCalls++;
            await page.waitForTimeout(500); // Rate limiting
            
          } catch (error) {
            console.error(`❌ Error on page ${pageNum + 1}:`, error.message);
          }
        }
      }
    } finally {
      await page.close();
    }
  }

  async searchByCharacters() {
    console.log('🔤 Strategy 2: Search by characters and numbers...');
    
    const page = await this.browser.newPage();
    
    try {
      const searchTerms = [
        // Single characters
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
        'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        // Numbers
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
        // Common prefixes
        'pr', 'pm', 'sc', 'yo', 'sh', 'kr', 'ma', 'ra', 'sa', 'ka'
      ];
      
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching for: "${term}"`);
          
          const searchUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=${encodeURIComponent(term)}&sort=&from=0&size=100`;
          
          const response = await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
          
          if (response.ok()) {
            const content = await page.textContent('body');
            const data = JSON.parse(content);
            
            if (data.data && data.data.hits && data.data.hits.items) {
              const schemes = data.data.hits.items;
              console.log(`✅ Found ${schemes.length} schemes for "${term}"`);
              this.processSchemes(schemes, searchUrl);
              this.stats.successfulCalls++;
            }
          }
          
          this.stats.totalApiCalls++;
          await page.waitForTimeout(300);
          
        } catch (error) {
          console.error(`❌ Error searching for "${term}":`, error.message);
        }
      }
    } finally {
      await page.close();
    }
  }

  async categoryExhaustiveSearch() {
    console.log('📂 Strategy 3: Exhaustive category search...');
    
    const page = await this.browser.newPage();
    
    try {
      const categories = [
        'Agriculture,Rural & Environment',
        'Banking,Financial Services and Insurance',
        'Business & Entrepreneurship',
        'Education & Learning',
        'Health & Wellness',
        'Housing & Shelter',
        'Public Safety,Law & Justice',
        'Science, IT & Communications',
        'Skills & Employment',
        'Social welfare & Empowerment',
        'Sports & Culture',
        'Transport & Infrastructure',
        'Travel & Tourism',
        'Utility & Sanitation',
        'Women and Child'
      ];

      for (const category of categories) {
        try {
          console.log(`📂 Extracting category: "${category}"`);
          
          // Try multiple page sizes for each category
          for (const size of [50, 100, 200]) {
            const categoryUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[{"key":"schemeCategory","value":"${encodeURIComponent(category)}"}]&keyword=&sort=&from=0&size=${size}`;
            
            const response = await page.goto(categoryUrl, { waitUntil: 'networkidle', timeout: 30000 });
            
            if (response.ok()) {
              const content = await page.textContent('body');
              const data = JSON.parse(content);
              
              if (data.data && data.data.hits && data.data.hits.items) {
                const schemes = data.data.hits.items;
                console.log(`✅ Found ${schemes.length} schemes in "${category}" (size=${size})`);
                this.processSchemes(schemes, categoryUrl);
                this.stats.successfulCalls++;
              }
            }
            
            this.stats.totalApiCalls++;
            await page.waitForTimeout(400);
          }
          
        } catch (error) {
          console.error(`❌ Error extracting category "${category}":`, error.message);
        }
      }
    } finally {
      await page.close();
    }
  }

  async ministryExhaustiveSearch() {
    console.log('🏛️ Strategy 4: Exhaustive ministry search...');
    
    const page = await this.browser.newPage();
    
    try {
      const ministries = [
        'Ministry of Agriculture and Farmers Welfare',
        'Ministry of Education',
        'Ministry of Health and Family Welfare',
        'Ministry of Finance',
        'Ministry of Rural Development',
        'Ministry of Social Justice and Empowerment',
        'Ministry of Women and Child Development',
        'Ministry of Labour and Employment',
        'Ministry of Housing and Urban Affairs',
        'Ministry of Skill Development and Entrepreneurship',
        'Ministry of Micro, Small and Medium Enterprises',
        'Ministry of Electronics and Information Technology',
        'Ministry of Defence',
        'Ministry of Home Affairs',
        'Ministry of External Affairs',
        'Ministry of Commerce and Industry',
        'Ministry of Environment, Forest and Climate Change',
        'Ministry of Power',
        'Ministry of Coal',
        'Ministry of Petroleum and Natural Gas'
      ];

      for (const ministry of ministries) {
        try {
          console.log(`🏛️ Extracting ministry: "${ministry}"`);
          
          for (const size of [50, 100, 200]) {
            const ministryUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[{"key":"nodalMinistryName","value":"${encodeURIComponent(ministry)}"}]&keyword=&sort=&from=0&size=${size}`;
            
            const response = await page.goto(ministryUrl, { waitUntil: 'networkidle', timeout: 30000 });
            
            if (response.ok()) {
              const content = await page.textContent('body');
              const data = JSON.parse(content);
              
              if (data.data && data.data.hits && data.data.hits.items) {
                const schemes = data.data.hits.items;
                console.log(`✅ Found ${schemes.length} schemes in "${ministry}" (size=${size})`);
                this.processSchemes(schemes, ministryUrl);
                this.stats.successfulCalls++;
              }
            }
            
            this.stats.totalApiCalls++;
            await page.waitForTimeout(400);
          }
          
        } catch (error) {
          console.error(`❌ Error extracting ministry "${ministry}":`, error.message);
        }
      }
    } finally {
      await page.close();
    }
  }

  async stateWiseSearch() {
    console.log('🗺️ Strategy 5: State-wise search...');
    
    const page = await this.browser.newPage();
    
    try {
      const states = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
        'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
        'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
        'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
        'Jammu and Kashmir', 'Ladakh', 'Delhi', 'Puducherry'
      ];

      for (const state of states) {
        try {
          console.log(`🗺️ Extracting state: "${state}"`);
          
          const stateUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[{"key":"beneficiaryState","value":"${encodeURIComponent(state)}"}]&keyword=&sort=&from=0&size=100`;
          
          const response = await page.goto(stateUrl, { waitUntil: 'networkidle', timeout: 30000 });
          
          if (response.ok()) {
            const content = await page.textContent('body');
            const data = JSON.parse(content);
            
            if (data.data && data.data.hits && data.data.hits.items) {
              const schemes = data.data.hits.items;
              console.log(`✅ Found ${schemes.length} schemes in "${state}"`);
              this.processSchemes(schemes, stateUrl);
              this.stats.successfulCalls++;
            }
          }
          
          this.stats.totalApiCalls++;
          await page.waitForTimeout(300);
          
        } catch (error) {
          console.error(`❌ Error extracting state "${state}":`, error.message);
        }
      }
    } finally {
      await page.close();
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
              source: 'aggressive-api',
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
      successRate: this.stats.totalApiCalls > 0 ? 
        Math.round((this.stats.successfulCalls / this.stats.totalApiCalls) * 100) : 0
    };
  }
}

// Main execution
async function runAggressiveScraping() {
  let scraper = null;
  
  try {
    console.log('🚀 Starting AGGRESSIVE MyScheme scraping...');
    console.log('🎯 Target: ALL 3,850+ schemes using exhaustive strategies');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize scraper
    scraper = new AggressiveMySchemeScraperService();
    await scraper.initialize();
    
    // Start aggressive scraping
    const startTime = new Date();
    const schemes = await scraper.scrapeAllSchemes();
    const endTime = new Date();
    
    // Save to database
    const saveResult = await scraper.saveSchemesToDatabase(schemes);
    
    const duration = Math.round((endTime - startTime) / 1000);
    const stats = scraper.getStats();

    console.log('');
    console.log('🎉 AGGRESSIVE SCRAPING COMPLETED!');
    console.log('=====================================');
    console.log(`✅ Total unique schemes: ${schemes.length}`);
    console.log(`💾 Saved to database: ${saveResult.savedCount} new, ${saveResult.updatedCount} updated`);
    console.log(`⏱️ Total time: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📡 API calls made: ${stats.totalApiCalls}`);
    console.log(`✅ Successful calls: ${stats.successfulCalls}`);
    console.log(`📊 Success rate: ${stats.successRate}%`);
    console.log(`🔄 Duplicates skipped: ${stats.duplicatesSkipped}`);
    console.log('');

    if (schemes.length >= 1000) {
      console.log('🎯 EXCELLENT: Extracted 1,000+ schemes!');
    } else if (schemes.length >= 500) {
      console.log('✅ GOOD: Extracted 500+ schemes');
    } else {
      console.log('⚠️ Limited extraction: ' + schemes.length + ' schemes');
    }

  } catch (error) {
    console.error('❌ Aggressive scraping failed:', error.message);
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
  runAggressiveScraping();
}

export default AggressiveMySchemeScraperService;