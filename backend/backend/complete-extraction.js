import { chromium } from 'playwright';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

class CompleteExtractionService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allSchemes = new Map();
    this.processedIds = new Set();
    this.totalTarget = 3850; // Target from MyScheme API
    this.batchSize = 50;
    this.maxRetries = 3;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing complete extraction service...');
      
      this.browser = await chromium.launch({
        headless: false, // Keep visible to monitor progress
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic browser environment
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      });

      console.log('✅ Complete extraction service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize extraction service:', error.message);
      throw error;
    }
  }

  async extractAllSchemes() {
    try {
      console.log(`🎯 TARGET: Extract all ${this.totalTarget} schemes from MyScheme.gov.in`);
      console.log('📊 Starting comprehensive extraction...\n');
      
      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      
      // Strategy 1: Systematic pagination through all pages
      await this.systematicPagination();
      
      // Strategy 2: Category-based extraction
      await this.categoryBasedExtraction();
      
      // Strategy 3: State-based extraction
      await this.stateBasedExtraction();
      
      // Strategy 4: Ministry-based extraction
      await this.ministryBasedExtraction();
      
      // Strategy 5: Keyword-based searches
      await this.keywordBasedExtraction();
      
      console.log(`\n🎉 EXTRACTION COMPLETED!`);
      console.log(`📊 Total unique schemes extracted: ${this.allSchemes.size}`);
      console.log(`🎯 Target coverage: ${((this.allSchemes.size / this.totalTarget) * 100).toFixed(1)}%`);
      
      // Save all schemes to database
      const result = await this.saveAllToDatabase();
      
      console.log(`\n🏆 MISSION ACCOMPLISHED!`);
      console.log(`💾 Database now contains ${result.finalCount} total schemes`);
      console.log(`📈 Extraction efficiency: ${((result.finalCount / this.totalTarget) * 100).toFixed(1)}%`);
      
      await mongoose.disconnect();
      console.log('✅ Database disconnected');
      
      return result;

    } catch (error) {
      console.error('❌ Complete extraction failed:', error.message);
      throw error;
    }
  }

  async systematicPagination() {
    console.log('\n🔍 STRATEGY 1: Systematic Pagination');
    console.log('=' .repeat(50));
    
    try {
      // Navigate to search page
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      await this.page.waitForTimeout(3000);
      
      // Calculate total pages needed
      const totalPages = Math.ceil(this.totalTarget / this.batchSize);
      console.log(`📄 Will attempt to extract ${totalPages} pages with ${this.batchSize} schemes each`);
      
      for (let page = 0; page < totalPages; page++) {
        const from = page * this.batchSize;
        console.log(`\n📥 Page ${page + 1}/${totalPages} (schemes ${from + 1}-${from + this.batchSize})`);
        
        try {
          // Use browser context to make API calls with proper session
          const schemes = await this.page.evaluate(async (fromIndex, size) => {
            try {
              const response = await fetch(`https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=&sort=&from=${fromIndex}&size=${size}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': navigator.userAgent,
                  'Referer': 'https://www.myscheme.gov.in/search',
                  'Origin': 'https://www.myscheme.gov.in'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
                  return data.data.hits.items;
                }
              }
              return [];
            } catch (error) {
              console.error('Browser API call failed:', error);
              return [];
            }
          }, from, this.batchSize);

          if (schemes.length > 0) {
            console.log(`   ✅ Retrieved ${schemes.length} schemes`);
            
            let newSchemes = 0;
            for (const scheme of schemes) {
              if (this.processScheme(scheme)) {
                newSchemes++;
              }
            }
            console.log(`   🆕 ${newSchemes} new unique schemes added`);
            console.log(`   📊 Total unique schemes so far: ${this.allSchemes.size}`);
          } else {
            console.log(`   ⚠️ No schemes retrieved from page ${page + 1}`);
            
            // If we get no results, try with smaller batch size
            if (this.batchSize > 10) {
              console.log(`   🔄 Retrying with smaller batch size...`);
              this.batchSize = Math.max(10, Math.floor(this.batchSize / 2));
              page--; // Retry this page
              continue;
            }
          }
          
          // Respectful delay between requests
          await this.page.waitForTimeout(2000);
          
        } catch (pageError) {
          console.error(`   ❌ Error on page ${page + 1}:`, pageError.message);
          
          // Retry logic
          if (page > 0) {
            console.log(`   🔄 Retrying page ${page + 1}...`);
            await this.page.waitForTimeout(5000);
            page--; // Retry this page
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Systematic pagination failed:', error.message);
    }
  }

  async categoryBasedExtraction() {
    console.log('\n🔍 STRATEGY 2: Category-Based Extraction');
    console.log('=' .repeat(50));
    
    const categories = [
      'Agriculture', 'Health', 'Education', 'Employment', 'Housing',
      'Social Welfare', 'Financial Services', 'Rural Development',
      'Urban Development', 'Women and Child', 'Senior Citizens',
      'Disability', 'Minority', 'Tribal', 'Backward Classes',
      'Transport', 'Energy', 'Environment', 'Technology', 'Tourism'
    ];

    for (const category of categories) {
      try {
        console.log(`\n📂 Extracting category: ${category}`);
        
        const schemes = await this.page.evaluate(async (cat) => {
          try {
            // Try different category filter formats
            const queries = [
              `[{"identifier":"category","value":"${cat}"}]`,
              `[{"identifier":"schemeCategory","value":"${cat}"}]`,
              `[{"identifier":"sector","value":"${cat}"}]`
            ];
            
            for (const query of queries) {
              const response = await fetch(`https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=${encodeURIComponent(query)}&keyword=&sort=&from=0&size=100`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': navigator.userAgent,
                  'Referer': 'https://www.myscheme.gov.in/search'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
                  return data.data.hits.items;
                }
              }
            }
            return [];
          } catch (error) {
            return [];
          }
        }, category);

        if (schemes.length > 0) {
          let newSchemes = 0;
          for (const scheme of schemes) {
            if (this.processScheme(scheme)) {
              newSchemes++;
            }
          }
          console.log(`   ✅ ${schemes.length} schemes found, ${newSchemes} new unique`);
        } else {
          console.log(`   ⚠️ No schemes found for category: ${category}`);
        }
        
        await this.page.waitForTimeout(1500);
        
      } catch (error) {
        console.error(`   ❌ Error with category ${category}:`, error.message);
      }
    }
  }

  async stateBasedExtraction() {
    console.log('\n🔍 STRATEGY 3: State-Based Extraction');
    console.log('=' .repeat(50));
    
    const states = [
      'All', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
      'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
      'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
      'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
      'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
      'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
    ];

    for (const state of states) {
      try {
        console.log(`\n🏛️ Extracting state: ${state}`);
        
        const schemes = await this.page.evaluate(async (stateName) => {
          try {
            const query = `[{"identifier":"beneficiaryState","value":"${stateName}"}]`;
            const response = await fetch(`https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=${encodeURIComponent(query)}&keyword=&sort=&from=0&size=100`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': navigator.userAgent,
                'Referer': 'https://www.myscheme.gov.in/search'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
                return data.data.hits.items;
              }
            }
            return [];
          } catch (error) {
            return [];
          }
        }, state);

        if (schemes.length > 0) {
          let newSchemes = 0;
          for (const scheme of schemes) {
            if (this.processScheme(scheme)) {
              newSchemes++;
            }
          }
          console.log(`   ✅ ${schemes.length} schemes found, ${newSchemes} new unique`);
        }
        
        await this.page.waitForTimeout(1000);
        
      } catch (error) {
        console.error(`   ❌ Error with state ${state}:`, error.message);
      }
    }
  }

  async ministryBasedExtraction() {
    console.log('\n🔍 STRATEGY 4: Ministry-Based Extraction');
    console.log('=' .repeat(50));
    
    const ministries = [
      'Agriculture', 'Health', 'Education', 'Finance', 'Defence',
      'Rural Development', 'Urban Development', 'Social Justice',
      'Women and Child Development', 'Labour and Employment',
      'Skill Development', 'Science and Technology', 'Environment',
      'Petroleum', 'Power', 'Railways', 'Road Transport', 'Shipping',
      'Textiles', 'Tourism', 'Tribal Affairs', 'Youth Affairs'
    ];

    for (const ministry of ministries) {
      try {
        console.log(`\n🏢 Searching ministry: ${ministry}`);
        
        const schemes = await this.page.evaluate(async (ministryName) => {
          try {
            const response = await fetch(`https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=${encodeURIComponent(ministryName)}&sort=&from=0&size=100`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': navigator.userAgent,
                'Referer': 'https://www.myscheme.gov.in/search'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
                return data.data.hits.items;
              }
            }
            return [];
          } catch (error) {
            return [];
          }
        }, ministry);

        if (schemes.length > 0) {
          let newSchemes = 0;
          for (const scheme of schemes) {
            if (this.processScheme(scheme)) {
              newSchemes++;
            }
          }
          console.log(`   ✅ ${schemes.length} schemes found, ${newSchemes} new unique`);
        }
        
        await this.page.waitForTimeout(1000);
        
      } catch (error) {
        console.error(`   ❌ Error with ministry ${ministry}:`, error.message);
      }
    }
  }

  async keywordBasedExtraction() {
    console.log('\n🔍 STRATEGY 5: Keyword-Based Extraction');
    console.log('=' .repeat(50));
    
    const keywords = [
      'pradhan mantri', 'prime minister', 'yojana', 'scheme', 'subsidy',
      'pension', 'insurance', 'loan', 'scholarship', 'employment',
      'housing', 'health', 'education', 'agriculture', 'rural',
      'urban', 'women', 'child', 'senior', 'disability', 'tribal',
      'minority', 'backward', 'welfare', 'development', 'skill',
      'training', 'startup', 'business', 'entrepreneur'
    ];

    for (const keyword of keywords) {
      try {
        console.log(`\n🔎 Searching keyword: "${keyword}"`);
        
        const schemes = await this.page.evaluate(async (kw) => {
          try {
            const response = await fetch(`https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=${encodeURIComponent(kw)}&sort=&from=0&size=100`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': navigator.userAgent,
                'Referer': 'https://www.myscheme.gov.in/search'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
                return data.data.hits.items;
              }
            }
            return [];
          } catch (error) {
            return [];
          }
        }, keyword);

        if (schemes.length > 0) {
          let newSchemes = 0;
          for (const scheme of schemes) {
            if (this.processScheme(scheme)) {
              newSchemes++;
            }
          }
          console.log(`   ✅ ${schemes.length} schemes found, ${newSchemes} new unique`);
        }
        
        await this.page.waitForTimeout(800);
        
      } catch (error) {
        console.error(`   ❌ Error with keyword "${keyword}":`, error.message);
      }
    }
  }

  processScheme(item) {
    try {
      const fields = item.fields || item;
      const schemeId = item.id || item._id;
      const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
      
      if (schemeName && schemeId && !this.processedIds.has(schemeId)) {
        this.processedIds.add(schemeId);
        
        this.allSchemes.set(schemeId, {
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
        
        return true; // New scheme added
      }
      return false; // Duplicate or invalid
    } catch (error) {
      return false;
    }
  }

  async saveAllToDatabase() {
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
            description: scheme.description,
            ministry: scheme.ministry,
            department: scheme.department,
            targetAudience: scheme.targetAudience,
            sector: scheme.sector,
            level: scheme.level,
            beneficiaryState: scheme.beneficiaryState,
            schemeId: scheme.schemeId,
            source: scheme.source,
            sourceUrl: 'https://api.myscheme.gov.in/search/v5/schemes',
            scrapedAt: scheme.extractedAt,
            isActive: true
          };
          
          const result = await Scheme.findOneAndUpdate(
            { schemeId: scheme.schemeId },
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
          
          if ((i + 1) % 100 === 0) {
            console.log(`   📈 Processed ${i + 1}/${schemes.length} (${savedCount} saved, ${updatedCount} updated)`);
          }
          
        } catch (schemeError) {
          errorCount++;
        }
      }
      
      const finalCount = await Scheme.countDocuments();
      
      console.log(`\n🎉 Database operation completed!`);
      console.log(`📊 Results:`);
      console.log(`   💾 Saved: ${savedCount} new schemes`);
      console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
      console.log(`   ❌ Errors: ${errorCount} failed operations`);
      console.log(`   🏛️ Total in database: ${finalCount} schemes`);
      
      return { saved: savedCount, updated: updatedCount, errors: errorCount, finalCount };
      
    } catch (error) {
      console.error('❌ Database save failed:', error.message);
      throw error;
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Browser closed');
      }
    } catch (error) {
      console.error('❌ Error closing browser:', error.message);
    }
  }
}

async function runCompleteExtraction() {
  const extractor = new CompleteExtractionService();
  
  try {
    await extractor.initialize();
    await extractor.extractAllSchemes();
  } catch (error) {
    console.error('❌ Complete extraction failed:', error.message);
  } finally {
    await extractor.close();
  }
}

// Run the complete extraction
runCompleteExtraction();