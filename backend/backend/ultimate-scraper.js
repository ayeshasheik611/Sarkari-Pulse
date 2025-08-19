import { chromium } from 'playwright';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

class UltimateSchemeExtractor {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allSchemes = new Map();
    this.processedIds = new Set();
    this.capturedApiData = [];
    this.totalTarget = 3850; // Target from API
  }

  async initialize() {
    try {
      console.log('🚀 Initializing ULTIMATE scheme extractor...');
      console.log(`🎯 Target: Extract ALL ${this.totalTarget} schemes from MyScheme.gov.in`);
      
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      });

      // Intercept ALL network requests
      await this.page.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        
        // Continue with the request
        await route.continue();
        
        // Capture scheme-related API responses
        if (url.includes('api.myscheme.gov.in') && url.includes('schemes')) {
          try {
            const response = await request.response();
            if (response && response.status() === 200) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`📡 Captured: ${url}`);
                this.capturedApiData.push({ url, data, timestamp: new Date() });
              }
            }
          } catch (e) {
            // Ignore capture errors
          }
        }
      });
      
      console.log('✅ Ultimate extractor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize extractor:', error.message);
      throw error;
    }
  }

  async extractAllSchemes() {
    try {
      console.log('🔍 Starting ULTIMATE extraction process...');
      
      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      
      // Strategy 1: Aggressive pagination scrolling
      await this.aggressivePaginationExtraction();
      
      // Strategy 2: Multiple browser sessions with different approaches
      await this.multipleBrowserSessions();
      
      // Strategy 3: Deep link exploration
      await this.deepLinkExploration();
      
      // Strategy 4: Filter-based extraction
      await this.filterBasedExtraction();
      
      // Strategy 5: Time-based extraction (different times might show different schemes)
      await this.timeBasedExtraction();
      
      console.log(`\n🎉 ULTIMATE EXTRACTION COMPLETED!`);
      console.log(`📊 Total unique schemes found: ${this.allSchemes.size}`);
      console.log(`🎯 Target was: ${this.totalTarget} schemes`);
      console.log(`📈 Success rate: ${((this.allSchemes.size / this.totalTarget) * 100).toFixed(1)}%`);
      
      // Save to database
      const result = await this.saveToDatabase();
      
      console.log(`\n🏆 MISSION STATUS:`);
      if (this.allSchemes.size >= this.totalTarget * 0.8) {
        console.log(`🎉 EXCELLENT! Extracted ${this.allSchemes.size} schemes (${((this.allSchemes.size / this.totalTarget) * 100).toFixed(1)}% of target)`);
      } else if (this.allSchemes.size >= this.totalTarget * 0.5) {
        console.log(`👍 GOOD! Extracted ${this.allSchemes.size} schemes (${((this.allSchemes.size / this.totalTarget) * 100).toFixed(1)}% of target)`);
      } else {
        console.log(`📊 PARTIAL SUCCESS: Extracted ${this.allSchemes.size} schemes (${((this.allSchemes.size / this.totalTarget) * 100).toFixed(1)}% of target)`);
      }
      
      await mongoose.disconnect();
      console.log('✅ Database disconnected');
      
      return result;

    } catch (error) {
      console.error('❌ Ultimate extraction failed:', error.message);
      throw error;
    }
  }

  async aggressivePaginationExtraction() {
    console.log('\n🔍 Strategy 1: Aggressive Pagination Extraction...');
    
    try {
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);
      
      // Continuously scroll and interact to trigger more API calls
      for (let round = 0; round < 20; round++) {
        console.log(`   🔄 Pagination round ${round + 1}/20`);
        
        // Scroll down aggressively
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await this.page.waitForTimeout(2000);
        
        // Try to click any pagination or load more buttons
        const paginationSelectors = [
          '.pagination button', '.pagination a', '.load-more', '.show-more',
          'button:has-text("Next")', 'button:has-text("More")', 
          'a:has-text("Next")', '[aria-label*="next"]', '[aria-label*="more"]'
        ];
        
        for (const selector of paginationSelectors) {
          try {
            const elements = await this.page.$$(selector);
            for (const element of elements) {
              try {
                await element.click();
                await this.page.waitForTimeout(2000);
                console.log(`     🖱️ Clicked pagination element`);
              } catch (e) {
                // Continue
              }
            }
          } catch (e) {
            // Continue
          }
        }
        
        // Process any new API data
        this.processApiData();
        
        // Random interactions to trigger different states
        await this.randomInteractions();
        
        console.log(`     📊 Current unique schemes: ${this.allSchemes.size}`);
      }
      
    } catch (error) {
      console.error('❌ Aggressive pagination failed:', error.message);
    }
  }

  async multipleBrowserSessions() {
    console.log('\n🔍 Strategy 2: Multiple Browser Sessions...');
    
    const sessions = [
      { name: 'Fresh Session', url: 'https://www.myscheme.gov.in/search' },
      { name: 'Direct Search', url: 'https://www.myscheme.gov.in/find-scheme' },
      { name: 'Home Page', url: 'https://www.myscheme.gov.in/' },
      { name: 'Schemes List', url: 'https://www.myscheme.gov.in/schemes' }
    ];
    
    for (const session of sessions) {
      try {
        console.log(`   🌐 ${session.name}: ${session.url}`);
        
        await this.page.goto(session.url, {
          waitUntil: 'networkidle',
          timeout: 20000
        });
        
        await this.page.waitForTimeout(3000);
        
        // Aggressive interaction for each session
        await this.aggressiveInteraction();
        
        // Process captured data
        this.processApiData();
        
        console.log(`     📊 Session result: ${this.allSchemes.size} total schemes`);
        
      } catch (error) {
        console.log(`     ❌ ${session.name} failed: ${error.message}`);
      }
    }
  }

  async deepLinkExploration() {
    console.log('\n🔍 Strategy 3: Deep Link Exploration...');
    
    try {
      // Navigate to search page first
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      await this.page.waitForTimeout(3000);
      
      // Find all scheme links
      const schemeLinks = await this.page.$$eval('a[href*="/schemes/"]', links => 
        links.map(link => ({
          href: link.href,
          text: link.textContent?.trim()
        })).filter(link => link.href && link.text)
      );
      
      console.log(`   🔗 Found ${schemeLinks.length} scheme links to explore`);
      
      // Visit individual scheme pages (limit to avoid timeout)
      const maxLinks = Math.min(schemeLinks.length, 50);
      for (let i = 0; i < maxLinks; i++) {
        const link = schemeLinks[i];
        try {
          console.log(`   📄 Visiting ${i + 1}/${maxLinks}: ${link.text}`);
          
          await this.page.goto(link.href, {
            waitUntil: 'networkidle',
            timeout: 15000
          });
          
          await this.page.waitForTimeout(1000);
          
          // Extract detailed scheme information
          const schemeDetails = await this.extractSchemeDetails();
          if (schemeDetails) {
            const key = `detail_${schemeDetails.name}`;
            if (!this.allSchemes.has(key)) {
              this.allSchemes.set(key, schemeDetails);
              console.log(`     ✅ Extracted: ${schemeDetails.name}`);
            }
          }
          
        } catch (pageError) {
          console.log(`     ⚠️ Failed to visit: ${link.text}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Deep link exploration failed:', error.message);
    }
  }

  async filterBasedExtraction() {
    console.log('\n🔍 Strategy 4: Filter-Based Extraction...');
    
    const filters = [
      // State-based filters
      { type: 'state', values: ['All', 'Andhra Pradesh', 'Bihar', 'Gujarat', 'Haryana', 'Karnataka', 'Kerala', 'Maharashtra', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh', 'West Bengal'] },
      
      // Ministry-based searches
      { type: 'ministry', values: ['Agriculture', 'Health', 'Education', 'Rural Development', 'Finance', 'Social Justice', 'Women Child'] },
      
      // Category-based searches
      { type: 'category', values: ['Agriculture', 'Health', 'Education', 'Employment', 'Housing', 'Insurance', 'Pension', 'Scholarship'] }
    ];
    
    for (const filterGroup of filters) {
      console.log(`   🎯 Exploring ${filterGroup.type} filters...`);
      
      for (const filterValue of filterGroup.values) {
        try {
          console.log(`     🔎 Filter: ${filterValue}`);
          
          // Navigate to search page
          await this.page.goto('https://www.myscheme.gov.in/search', {
            waitUntil: 'networkidle',
            timeout: 20000
          });
          
          await this.page.waitForTimeout(2000);
          
          // Try to apply filter
          await this.applyFilter(filterGroup.type, filterValue);
          
          // Wait for results and process
          await this.page.waitForTimeout(3000);
          this.processApiData();
          
          console.log(`       📊 Current total: ${this.allSchemes.size} schemes`);
          
        } catch (filterError) {
          console.log(`     ❌ Filter ${filterValue} failed: ${filterError.message}`);
        }
      }
    }
  }

  async timeBasedExtraction() {
    console.log('\n🔍 Strategy 5: Time-Based Extraction...');
    
    // Try multiple sessions with delays to potentially get different results
    for (let session = 1; session <= 5; session++) {
      try {
        console.log(`   ⏰ Time-based session ${session}/5`);
        
        // Clear browser cache and cookies
        await this.page.context().clearCookies();
        
        // Navigate with fresh session
        await this.page.goto('https://www.myscheme.gov.in/search', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        // Wait different amounts of time
        await this.page.waitForTimeout(session * 2000);
        
        // Aggressive interaction
        await this.aggressiveInteraction();
        
        // Process data
        this.processApiData();
        
        console.log(`     📊 Session ${session} result: ${this.allSchemes.size} total schemes`);
        
        // Wait between sessions
        await this.page.waitForTimeout(3000);
        
      } catch (error) {
        console.log(`     ❌ Time session ${session} failed: ${error.message}`);
      }
    }
  }

  async randomInteractions() {
    try {
      // Random scrolling
      const scrollAmount = Math.floor(Math.random() * 1000) + 500;
      await this.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
      await this.page.waitForTimeout(1000);
      
      // Random clicks on safe elements
      const safeSelectors = ['button', '.btn', 'a', '.link'];
      for (const selector of safeSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            const randomElement = elements[Math.floor(Math.random() * Math.min(elements.length, 3))];
            await randomElement.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    } catch (error) {
      // Ignore interaction errors
    }
  }

  async aggressiveInteraction() {
    try {
      // Scroll multiple times
      for (let i = 0; i < 5; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 500));
        await this.page.waitForTimeout(500);
      }
      
      // Try to interact with various elements
      const interactionSelectors = [
        'button', '.btn', '.load-more', '.show-more', '.view-all',
        '.pagination a', '.next', '.page-link', 'input[type="submit"]'
      ];
      
      for (const selector of interactionSelectors) {
        try {
          const elements = await this.page.$$(selector);
          for (let i = 0; i < Math.min(elements.length, 2); i++) {
            try {
              await elements[i].click();
              await this.page.waitForTimeout(1500);
            } catch (e) {
              // Continue
            }
          }
        } catch (e) {
          // Continue
        }
      }
    } catch (error) {
      // Ignore interaction errors
    }
  }

  async applyFilter(filterType, filterValue) {
    try {
      // Try to find and apply filters
      const filterSelectors = [
        `input[value*="${filterValue}"]`,
        `option:has-text("${filterValue}")`,
        `label:has-text("${filterValue}")`,
        `[data-${filterType}="${filterValue}"]`,
        `button:has-text("${filterValue}")`
      ];
      
      for (const selector of filterSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(2000);
            return;
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Try search input
      const searchInput = await this.page.$('input[type="text"], input[type="search"]');
      if (searchInput) {
        await searchInput.fill(filterValue);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(2000);
      }
    } catch (error) {
      // Ignore filter errors
    }
  }

  async extractSchemeDetails() {
    try {
      return await this.page.evaluate(() => {
        const title = document.querySelector('h1, .title, .scheme-name, .scheme-title')?.textContent?.trim();
        const description = document.querySelector('.description, .summary, .content, p')?.textContent?.trim();
        const ministry = document.querySelector('.ministry, .dept, .department')?.textContent?.trim();
        const category = document.querySelector('.category, .sector, .type')?.textContent?.trim();
        
        if (title && title.length > 3) {
          return {
            name: title,
            description: description?.substring(0, 500) || '',
            ministry: ministry || '',
            sector: category || '',
            source: 'individual_page',
            schemeId: `detail_${Date.now()}_${Math.random()}`,
            extractedAt: new Date()
          };
        }
        return null;
      });
    } catch (error) {
      return null;
    }
  }

  processApiData() {
    for (const capture of this.capturedApiData) {
      try {
        const { data } = capture;
        
        if (data.data && data.data.hits && data.data.hits.items) {
          const schemes = data.data.hits.items;
          
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
            }
          }
        }
      } catch (error) {
        // Continue processing other captures
      }
    }
    
    // Clear processed data
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
            schemeId: scheme.schemeId || `ultimate_${Date.now()}_${i}`,
            source: scheme.source || 'ultimate',
            sourceUrl: 'https://www.myscheme.gov.in',
            scrapedAt: scheme.extractedAt || new Date(),
            isActive: true
          };
          
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
          
          if ((i + 1) % 50 === 0) {
            console.log(`   📈 Processed ${i + 1}/${schemes.length} schemes (${savedCount} saved, ${updatedCount} updated)`);
          }
          
        } catch (schemeError) {
          errorCount++;
        }
      }
      
      const finalCount = await Scheme.countDocuments();
      
      console.log(`\n🎉 ULTIMATE EXTRACTION DATABASE RESULTS:`);
      console.log(`   💾 Saved: ${savedCount} new schemes`);
      console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
      console.log(`   ❌ Errors: ${errorCount} failed operations`);
      console.log(`   📈 Total processed: ${schemes.length} schemes`);
      console.log(`   🏛️ FINAL DATABASE COUNT: ${finalCount} schemes`);
      
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

async function runUltimateExtraction() {
  const extractor = new UltimateSchemeExtractor();
  
  try {
    await extractor.initialize();
    const result = await extractor.extractAllSchemes();
    
    console.log(`\n🏆 ULTIMATE EXTRACTION MISSION COMPLETE!`);
    console.log(`🎯 Final Database Contains: ${result.finalCount} Government Schemes`);
    console.log(`📊 This session added: ${result.saved} new schemes`);
    
  } catch (error) {
    console.error('❌ Ultimate extraction failed:', error.message);
  } finally {
    await extractor.close();
  }
}

// Run the ultimate extractor
runUltimateExtraction();