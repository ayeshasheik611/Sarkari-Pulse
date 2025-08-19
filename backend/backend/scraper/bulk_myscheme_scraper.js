import { chromium } from 'playwright';
import Scheme from '../models/Scheme.js';
import websocketService from '../services/websocketService.js';

/**
 * Bulk MyScheme.gov.in Scraper
 * Designed to extract all 3,850+ schemes using multiple strategies
 */
export class BulkMySchemeScraperService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.capturedApiData = [];
    this.extractedSchemes = new Map(); // Use Map to avoid duplicates
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      duplicatesSkipped: 0,
      schemesExtracted: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Initialize the browser with optimized settings for bulk scraping
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Bulk MyScheme scraper...');
      
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images', // Speed up by not loading images
          '--disable-javascript-harmony-shipping'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic browser headers
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.myscheme.gov.in/',
        'Origin': 'https://www.myscheme.gov.in'
      });

      // Block unnecessary resources to speed up
      await this.page.route('**/*', async (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();
        
        // Block images, fonts, and other non-essential resources
        if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
          await route.abort();
          return;
        }
        
        await route.continue();
        
        // Capture API responses
        if (url.includes('api') && (url.includes('scheme') || url.includes('search'))) {
          this.stats.totalRequests++;
          try {
            const response = await request.response();
            if (response && response.status() === 200) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`📡 Captured API data from: ${url}`);
                this.capturedApiData.push({ url, data, timestamp: new Date() });
                this.stats.successfulRequests++;
              }
            }
          } catch (e) {
            this.stats.failedRequests++;
            console.log(`⚠️ Failed to capture response from: ${url}`);
          }
        }
      });
      
      console.log('✅ Bulk scraper initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize bulk scraper:', error.message);
      throw error;
    }
  }

  /**
   * Main bulk scraping function - extracts ALL schemes using multiple strategies
   */
  async scrapeAllSchemes(options = {}) {
    const {
      maxPages = 500,
      pageSize = 50,
      delayBetweenRequests = 1000,
      saveToDb = true,
      notifyProgress = true
    } = options;

    try {
      this.stats.startTime = new Date();
      console.log('🔍 Starting bulk extraction of all MyScheme schemes...');
      
      if (notifyProgress && websocketService.io) {
        websocketService.broadcast('bulk-scrape-started', {
          message: 'Bulk scraping started - targeting 3,850+ schemes',
          timestamp: new Date().toISOString()
        });
      }

      if (!this.page) {
        await this.initialize();
      }

      // Strategy 1: Direct API calls with pagination
      await this.scrapeViaDirectAPI(maxPages, pageSize, delayBetweenRequests);
      
      // Strategy 2: Search with different filters
      await this.scrapeViaFilteredSearch(delayBetweenRequests);
      
      // Strategy 3: Category-based extraction
      await this.scrapeByCategories(delayBetweenRequests);
      
      // Strategy 4: Ministry-wise extraction
      await this.scrapeByMinistries(delayBetweenRequests);

      // Process all captured data
      this.processAllCapturedData();

      const schemes = Array.from(this.extractedSchemes.values());
      this.stats.schemesExtracted = schemes.length;
      this.stats.endTime = new Date();

      console.log(`✅ Bulk extraction completed: ${schemes.length} unique schemes extracted`);
      
      if (notifyProgress && websocketService.io) {
        websocketService.broadcast('bulk-scrape-completed', {
          message: `Bulk scraping completed: ${schemes.length} schemes extracted`,
          stats: this.stats,
          timestamp: new Date().toISOString()
        });
      }

      // Save to database if requested
      if (saveToDb && schemes.length > 0) {
        await this.saveSchemesToDatabase(schemes);
      }

      return schemes;

    } catch (error) {
      console.error('❌ Error during bulk scraping:', error.message);
      
      if (websocketService.io) {
        websocketService.broadcast('bulk-scrape-error', {
          message: 'Bulk scraping failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      throw error;
    }
  }

  /**
   * Strategy 1: Direct API calls with pagination
   */
  async scrapeViaDirectAPI(maxPages, pageSize, delay) {
    console.log('📡 Strategy 1: Direct API pagination...');
    
    const baseUrl = 'https://api.myscheme.gov.in/search/v5/schemes';
    
    for (let page = 0; page < maxPages; page++) {
      try {
        const from = page * pageSize;
        const apiUrl = `${baseUrl}?lang=en&q=[]&keyword=&sort=&from=${from}&size=${pageSize}`;
        
        console.log(`📄 Fetching page ${page + 1}/${maxPages} (from=${from}, size=${pageSize})`);
        
        await this.page.goto(apiUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.page.waitForTimeout(delay);
        
        // Check if we got data
        const content = await this.page.textContent('body');
        if (content && content.includes('"items"')) {
          console.log(`✅ Page ${page + 1} loaded successfully`);
        } else {
          console.log(`⚠️ Page ${page + 1} may be empty, stopping pagination`);
          break;
        }
        
        // Progress notification
        if (websocketService.io && page % 10 === 0) {
          websocketService.broadcast('bulk-scrape-progress', {
            message: `Processed ${page + 1} pages via direct API`,
            progress: Math.round((page / maxPages) * 25), // 25% of total progress
            timestamp: new Date().toISOString()
          });
        }
        
      } catch (error) {
        console.error(`❌ Error on page ${page + 1}:`, error.message);
        // Continue with next page
      }
    }
  }

  /**
   * Strategy 2: Search with different filters and keywords
   */
  async scrapeViaFilteredSearch(delay) {
    console.log('🔍 Strategy 2: Filtered search extraction...');
    
    const searchTerms = [
      'pradhan mantri', 'pm', 'yojana', 'scheme', 'scholarship', 'pension',
      'health', 'education', 'agriculture', 'employment', 'housing', 'insurance',
      'loan', 'subsidy', 'welfare', 'development', 'rural', 'urban', 'women',
      'child', 'elderly', 'disability', 'minority', 'tribal', 'farmer'
    ];

    for (const term of searchTerms) {
      try {
        console.log(`🔍 Searching for: "${term}"`);
        
        const searchUrl = `https://www.myscheme.gov.in/search?keyword=${encodeURIComponent(term)}`;
        await this.page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.page.waitForTimeout(delay);
        
        // Try to load more results
        await this.triggerLoadMore();
        
      } catch (error) {
        console.error(`❌ Error searching for "${term}":`, error.message);
      }
    }
  }

  /**
   * Strategy 3: Category-based extraction
   */
  async scrapeByCategories(delay) {
    console.log('📂 Strategy 3: Category-based extraction...');
    
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
        
        // Navigate to category page or use API filter
        const categoryUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[{"key":"schemeCategory","value":"${encodeURIComponent(category)}"}]&keyword=&sort=&from=0&size=100`;
        
        await this.page.goto(categoryUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.page.waitForTimeout(delay);
        
      } catch (error) {
        console.error(`❌ Error extracting category "${category}":`, error.message);
      }
    }
  }

  /**
   * Strategy 4: Ministry-wise extraction
   */
  async scrapeByMinistries(delay) {
    console.log('🏛️ Strategy 4: Ministry-wise extraction...');
    
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
      'Ministry of Electronics and Information Technology'
    ];

    for (const ministry of ministries) {
      try {
        console.log(`🏛️ Extracting ministry: "${ministry}"`);
        
        const ministryUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[{"key":"nodalMinistryName","value":"${encodeURIComponent(ministry)}"}]&keyword=&sort=&from=0&size=100`;
        
        await this.page.goto(ministryUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await this.page.waitForTimeout(delay);
        
      } catch (error) {
        console.error(`❌ Error extracting ministry "${ministry}":`, error.message);
      }
    }
  }

  /**
   * Try to trigger "Load More" buttons or infinite scroll
   */
  async triggerLoadMore() {
    try {
      // Look for load more buttons
      const loadMoreSelectors = [
        'button:has-text("Load More")',
        'button:has-text("Show More")',
        '.load-more',
        '.show-more',
        '[class*="load"]',
        '[class*="more"]'
      ];

      for (const selector of loadMoreSelectors) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`🔘 Clicking load more: ${selector}`);
            await element.click();
            await this.page.waitForTimeout(2000);
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Scroll to trigger lazy loading
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(1000);

    } catch (error) {
      // Ignore errors in load more triggering
    }
  }

  /**
   * Process all captured API data and extract schemes
   */
  processAllCapturedData() {
    console.log(`📊 Processing ${this.capturedApiData.length} captured API responses...`);
    
    for (const capture of this.capturedApiData) {
      try {
        const schemes = this.extractSchemesFromApiResponse(capture);
        
        for (const scheme of schemes) {
          // Use scheme name as key to avoid duplicates
          const key = scheme.name.toLowerCase().trim();
          if (!this.extractedSchemes.has(key)) {
            this.extractedSchemes.set(key, scheme);
          } else {
            this.stats.duplicatesSkipped++;
          }
        }
      } catch (error) {
        console.error('Error processing captured data:', error.message);
      }
    }
    
    console.log(`✅ Processed all data: ${this.extractedSchemes.size} unique schemes`);
  }

  /**
   * Extract schemes from a single API response
   */
  extractSchemesFromApiResponse(capture) {
    const schemes = [];
    const { data, url } = capture;
    
    try {
      // Handle MyScheme API structure
      let schemeArray = [];
      
      if (data.data && data.data.hits && data.data.hits.items && Array.isArray(data.data.hits.items)) {
        schemeArray = data.data.hits.items;
      } else if (data.data && Array.isArray(data.data)) {
        schemeArray = data.data;
      } else if (Array.isArray(data)) {
        schemeArray = data;
      }

      for (const item of schemeArray) {
        const fields = item.fields || item;
        const schemeId = item.id || item._id || '';
        
        const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
        
        if (schemeName && schemeName.trim().length > 3) {
          schemes.push({
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
            source: 'bulk-api',
            sourceUrl: url,
            scrapedAt: new Date(),
            isActive: true
          });
        }
      }
    } catch (error) {
      console.error('Error extracting schemes from API response:', error.message);
    }
    
    return schemes;
  }

  /**
   * Save extracted schemes to database with batch processing
   */
  async saveSchemesToDatabase(schemes) {
    console.log(`💾 Saving ${schemes.length} schemes to database...`);
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    for (let i = 0; i < schemes.length; i += batchSize) {
      const batch = schemes.slice(i, i + batchSize);
      
      console.log(`💾 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(schemes.length/batchSize)}`);
      
      for (const schemeData of batch) {
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
      
      // Progress notification
      if (websocketService.io) {
        websocketService.broadcast('bulk-save-progress', {
          message: `Saved batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(schemes.length/batchSize)}`,
          saved: savedCount,
          updated: updatedCount,
          errors: errorCount,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log(`✅ Database save completed: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
    return { savedCount, updatedCount, errorCount };
  }

  /**
   * Clean up browser resources
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('✅ Bulk scraper browser closed successfully');
      }
    } catch (error) {
      console.error('❌ Error closing bulk scraper browser:', error.message);
    }
  }

  /**
   * Get comprehensive scraping statistics
   */
  getStats() {
    const duration = this.stats.endTime && this.stats.startTime ? 
      this.stats.endTime - this.stats.startTime : 0;
    
    return {
      ...this.stats,
      duration: duration,
      durationMinutes: Math.round(duration / 60000),
      successRate: this.stats.totalRequests > 0 ? 
        Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100) : 0,
      uniqueSchemes: this.extractedSchemes.size,
      capturedApiCalls: this.capturedApiData.length
    };
  }
}

export default BulkMySchemeScraperService;