import { chromium } from 'playwright';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

class AdvancedSchemeExtractor {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allSchemes = new Map(); // Use Map to avoid duplicates
    this.processedUrls = new Set();
  }

  async initialize() {
    try {
      console.log('🚀 Initializing advanced scheme extractor...');
      
      this.browser = await chromium.launch({
        headless: false, // Run in visible mode to see what's happening
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic browser environment
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      });

      console.log('✅ Advanced extractor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize extractor:', error.message);
      throw error;
    }
  }

  async extractAllSchemes() {
    try {
      console.log('🔍 Starting comprehensive scheme extraction...');
      
      // Strategy 1: Try different search parameters and filters
      await this.tryDifferentSearchParameters();
      
      // Strategy 2: Try different sorting options
      await this.tryDifferentSortingOptions();
      
      // Strategy 3: Try category-based extraction
      await this.tryCategoryBasedExtraction();
      
      // Strategy 4: Try state-based extraction
      await this.tryStateBasedExtraction();
      
      // Strategy 5: Try ministry-based extraction
      await this.tryMinistryBasedExtraction();
      
      // Strategy 6: Try direct API manipulation
      await this.tryDirectApiManipulation();
      
      console.log(`\n🎉 Extraction completed! Found ${this.allSchemes.size} unique schemes`);
      return Array.from(this.allSchemes.values());

    } catch (error) {
      console.error('❌ Error during extraction:', error.message);
      throw error;
    }
  }

  async tryDifferentSearchParameters() {
    console.log('\n🔍 Strategy 1: Trying different search parameters...');
    
    const searchTerms = [
      '', // Empty search
      'pradhan mantri',
      'yojana',
      'scheme',
      'agriculture',
      'health',
      'education',
      'employment',
      'housing',
      'insurance',
      'pension',
      'subsidy',
      'loan',
      'scholarship',
      'welfare'
    ];

    for (const term of searchTerms) {
      try {
        console.log(`   🔎 Searching for: "${term}"`);
        await this.page.goto('https://www.myscheme.gov.in/search', {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await this.page.waitForTimeout(2000);

        // Try to enter search term
        if (term) {
          try {
            const searchInput = await this.page.$('input[type="text"], input[type="search"], .search-input');
            if (searchInput) {
              await searchInput.fill(term);
              await this.page.keyboard.press('Enter');
              await this.page.waitForTimeout(3000);
            }
          } catch (e) {
            console.log(`     ⚠️ Could not enter search term: ${term}`);
          }
        }

        await this.extractSchemesFromCurrentPage();
        await this.page.waitForTimeout(2000);

      } catch (error) {
        console.log(`     ❌ Error with search term "${term}":`, error.message);
      }
    }
  }

  async tryDifferentSortingOptions() {
    console.log('\n🔍 Strategy 2: Trying different sorting options...');
    
    const sortOptions = [
      'relevance',
      'name-asc',
      'name-desc',
      'date-asc',
      'date-desc'
    ];

    for (const sort of sortOptions) {
      try {
        console.log(`   📊 Trying sort: ${sort}`);
        
        // Navigate and try to change sorting
        await this.page.goto('https://www.myscheme.gov.in/search', {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await this.page.waitForTimeout(2000);

        // Try to find and click sort options
        const sortSelectors = [
          `option[value*="${sort}"]`,
          `[data-sort="${sort}"]`,
          `.sort-${sort}`,
          `button:has-text("${sort}")`,
          `a:has-text("${sort}")`
        ];

        for (const selector of sortSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              await this.page.waitForTimeout(3000);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        await this.extractSchemesFromCurrentPage();

      } catch (error) {
        console.log(`     ❌ Error with sort "${sort}":`, error.message);
      }
    }
  }

  async tryCategoryBasedExtraction() {
    console.log('\n🔍 Strategy 3: Trying category-based extraction...');
    
    const categories = [
      'Agriculture',
      'Health',
      'Education',
      'Employment',
      'Housing',
      'Social Welfare',
      'Financial Services',
      'Rural Development',
      'Urban Development',
      'Women and Child',
      'Senior Citizens',
      'Disability',
      'Minority',
      'Tribal',
      'Backward Classes'
    ];

    for (const category of categories) {
      try {
        console.log(`   📂 Trying category: ${category}`);
        
        await this.page.goto('https://www.myscheme.gov.in/search', {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await this.page.waitForTimeout(2000);

        // Try to find and select category filters
        const categorySelectors = [
          `input[value*="${category}"]`,
          `label:has-text("${category}")`,
          `.category-${category.toLowerCase().replace(/\s+/g, '-')}`,
          `[data-category="${category}"]`
        ];

        for (const selector of categorySelectors) {
          try {
            const elements = await this.page.$$(selector);
            for (const element of elements) {
              await element.click();
              await this.page.waitForTimeout(2000);
            }
          } catch (e) {
            // Continue
          }
        }

        await this.extractSchemesFromCurrentPage();

      } catch (error) {
        console.log(`     ❌ Error with category "${category}":`, error.message);
      }
    }
  }

  async tryStateBasedExtraction() {
    console.log('\n🔍 Strategy 4: Trying state-based extraction...');
    
    const states = [
      'All',
      'Andhra Pradesh',
      'Bihar',
      'Gujarat',
      'Haryana',
      'Karnataka',
      'Kerala',
      'Madhya Pradesh',
      'Maharashtra',
      'Rajasthan',
      'Tamil Nadu',
      'Uttar Pradesh',
      'West Bengal'
    ];

    for (const state of states) {
      try {
        console.log(`   🏛️ Trying state: ${state}`);
        
        await this.page.goto('https://www.myscheme.gov.in/search', {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await this.page.waitForTimeout(2000);

        // Try to select state
        const stateSelectors = [
          `option:has-text("${state}")`,
          `input[value*="${state}"]`,
          `label:has-text("${state}")`,
          `[data-state="${state}"]`
        ];

        for (const selector of stateSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              await this.page.waitForTimeout(3000);
              break;
            }
          } catch (e) {
            // Continue
          }
        }

        await this.extractSchemesFromCurrentPage();

      } catch (error) {
        console.log(`     ❌ Error with state "${state}":`, error.message);
      }
    }
  }

  async tryMinistryBasedExtraction() {
    console.log('\n🔍 Strategy 5: Trying ministry-based extraction...');
    
    const ministries = [
      'Ministry of Agriculture',
      'Ministry of Health',
      'Ministry of Education',
      'Ministry of Rural Development',
      'Ministry of Housing',
      'Ministry of Labour',
      'Ministry of Finance',
      'Ministry of Social Justice',
      'Ministry of Women and Child Development'
    ];

    for (const ministry of ministries) {
      try {
        console.log(`   🏢 Trying ministry: ${ministry}`);
        
        await this.page.goto('https://www.myscheme.gov.in/search', {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await this.page.waitForTimeout(2000);

        // Try to search for ministry
        try {
          const searchInput = await this.page.$('input[type="text"], input[type="search"]');
          if (searchInput) {
            await searchInput.fill(ministry);
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(3000);
          }
        } catch (e) {
          // Continue
        }

        await this.extractSchemesFromCurrentPage();

      } catch (error) {
        console.log(`     ❌ Error with ministry "${ministry}":`, error.message);
      }
    }
  }

  async tryDirectApiManipulation() {
    console.log('\n🔍 Strategy 6: Trying direct API manipulation...');
    
    try {
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);

      // Try to manipulate API calls directly in the browser
      const schemes = await this.page.evaluate(async () => {
        const allSchemes = [];
        
        try {
          // Try different API parameters
          const apiParams = [
            { from: 0, size: 50 },
            { from: 50, size: 50 },
            { from: 100, size: 50 },
            { from: 0, size: 100 },
            { from: 0, size: 10, sort: 'schemename-asc' },
            { from: 0, size: 10, sort: 'schemename-desc' },
            { from: 0, size: 10, q: JSON.stringify([{"identifier":"level","value":"Central"}]) },
            { from: 0, size: 10, q: JSON.stringify([{"identifier":"level","value":"State"}]) }
          ];

          for (const params of apiParams) {
            try {
              const queryString = new URLSearchParams({
                lang: 'en',
                keyword: '',
                from: params.from.toString(),
                size: params.size.toString(),
                sort: params.sort || '',
                q: params.q || '%5B%5D'
              }).toString();

              const response = await fetch(`https://api.myscheme.gov.in/search/v5/schemes?${queryString}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://www.myscheme.gov.in/search'
                }
              });

              if (response.ok) {
                const data = await response.json();
                if (data.status === 'Success' && data.data.hits && data.data.hits.items) {
                  console.log(`API call successful: ${data.data.hits.items.length} schemes from ${params.from}`);
                  allSchemes.push(...data.data.hits.items);
                }
              }

              // Small delay between API calls
              await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (apiError) {
              console.error('API call failed:', apiError);
            }
          }

        } catch (error) {
          console.error('Direct API manipulation failed:', error);
        }

        return allSchemes;
      });

      console.log(`   📡 Direct API calls returned ${schemes.length} schemes`);
      
      // Process the schemes
      for (const item of schemes) {
        this.processSchemeItem(item);
      }

    } catch (error) {
      console.log(`     ❌ Direct API manipulation failed:`, error.message);
    }
  }

  async extractSchemesFromCurrentPage() {
    try {
      // Wait for any network requests to complete
      await this.page.waitForTimeout(2000);

      // Try to extract schemes from the current page
      const schemes = await this.page.evaluate(() => {
        const extractedSchemes = [];
        
        // Try multiple selectors for scheme containers
        const containerSelectors = [
          '.scheme-card', '.card', '.scheme-item', '.result-item',
          '[class*="scheme"]', '[class*="card"]', '.list-item',
          '.search-result', '.scheme-container', '.scheme-list-item'
        ];

        let schemeElements = [];
        for (const selector of containerSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            schemeElements = Array.from(elements);
            break;
          }
        }

        schemeElements.forEach((element, index) => {
          try {
            // Extract scheme name
            const nameSelectors = [
              '.scheme-name', '.card-title', '.title', '.name',
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              '[class*="name"]', '[class*="title"]', 'strong', 'b'
            ];
            
            let schemeName = '';
            for (const selector of nameSelectors) {
              const nameEl = element.querySelector(selector);
              if (nameEl && nameEl.textContent.trim()) {
                schemeName = nameEl.textContent.trim();
                break;
              }
            }

            if (schemeName && schemeName.length > 3) {
              extractedSchemes.push({
                name: schemeName,
                description: element.textContent.substring(0, 200),
                source: 'dom',
                extractedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error extracting scheme:', error);
          }
        });

        return extractedSchemes;
      });

      // Process extracted schemes
      for (const scheme of schemes) {
        const key = `${scheme.name}_dom`;
        if (!this.allSchemes.has(key)) {
          this.allSchemes.set(key, scheme);
          console.log(`     ✅ Found new scheme: ${scheme.name}`);
        }
      }

    } catch (error) {
      console.log(`     ❌ Error extracting from current page:`, error.message);
    }
  }

  processSchemeItem(item) {
    try {
      const fields = item.fields || item;
      const schemeId = item.id || item._id;
      const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title || fields.scheme_name;
      
      if (schemeName) {
        const key = `${schemeId}_${schemeName}`;
        if (!this.allSchemes.has(key)) {
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
          console.log(`     ✅ Found new API scheme: ${schemeName}`);
        }
      }
    } catch (error) {
      console.error('Error processing scheme item:', error);
    }
  }

  async saveToDatabase() {
    try {
      console.log('\n💾 Saving schemes to database...');
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');

      const schemes = Array.from(this.allSchemes.values());
      let savedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (const scheme of schemes) {
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
            schemeId: scheme.schemeId || `extracted_${Date.now()}_${Math.random()}`,
            source: scheme.source || 'extracted',
            sourceUrl: 'https://www.myscheme.gov.in',
            scrapedAt: new Date(),
            isActive: true
          };

          const existingScheme = await Scheme.findOne({ 
            name: { $regex: `^${scheme.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
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
          console.error(`❌ Error saving scheme "${scheme.name}":`, schemeError.message);
          errorCount++;
        }
      }

      console.log(`\n🎉 Database operation completed!`);
      console.log(`📊 Results:`);
      console.log(`   💾 Saved: ${savedCount} new schemes`);
      console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
      console.log(`   ❌ Errors: ${errorCount} failed operations`);
      console.log(`   📈 Total processed: ${schemes.length} schemes`);

      const finalCount = await Scheme.countDocuments();
      console.log(`   🏛️ Total schemes in database: ${finalCount}`);

      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');

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

async function runAdvancedExtraction() {
  const extractor = new AdvancedSchemeExtractor();
  
  try {
    await extractor.initialize();
    await extractor.extractAllSchemes();
    const result = await extractor.saveToDatabase();
    
    console.log(`\n🏆 ADVANCED EXTRACTION COMPLETED!`);
    console.log(`🎯 Successfully extracted government schemes using multiple strategies`);
    console.log(`📊 Final database contains ${result.finalCount} schemes!`);
    
  } catch (error) {
    console.error('❌ Advanced extraction failed:', error.message);
  } finally {
    await extractor.close();
  }
}

// Run the advanced extractor
runAdvancedExtraction();