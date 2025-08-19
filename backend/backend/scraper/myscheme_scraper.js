import { chromium } from 'playwright';

/**
 * MyScheme.gov.in Scraper
 * Opens the schemes page, extracts scheme data, and returns structured results
 */
export class MySchemeScraperService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.capturedApiData = [];
  }

  /**
   * Initialize the browser and set up network interception
   */
  async initialize() {
    try {
      console.log('🚀 Initializing MyScheme scraper...');
      
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      });

      // Intercept API calls to capture JSON data
      await this.page.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        
        await route.continue();
        
        // Capture scheme-related API responses
        if (url.includes('api') && (url.includes('scheme') || url.includes('search'))) {
          try {
            const response = await request.response();
            if (response && response.status() === 200) {
              const contentType = response.headers()['content-type'] || '';
              if (contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`📡 Captured API data from: ${url}`);
                this.capturedApiData.push({ url, data, timestamp: new Date() });
              }
            }
          } catch (e) {
            // Ignore capture errors
          }
        }
      });
      
      console.log('✅ Scraper initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize scraper:', error.message);
      throw error;
    }
  }

  /**
   * Main scraping function - extracts schemes from MyScheme.gov.in
   */
  async scrapeSchemes() {
    try {
      if (!this.page) {
        await this.initialize();
      }

      console.log('🔍 Navigating to MyScheme schemes page...');
      this.capturedApiData = [];
      
      // Navigate to the main schemes page first to establish session
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for content to load
      await this.page.waitForTimeout(3000);

      // Now make multiple API calls with pagination to get more schemes
      await this.scrapePaginatedData();
      await this.page.waitForTimeout(2000);

      console.log(`📡 Captured ${this.capturedApiData.length} API responses`);

      // Extract schemes from captured API data first
      let schemes = this.extractFromApiData();

      // If no API data, fall back to DOM scraping
      if (schemes.length === 0) {
        console.log('🔄 No API data found, scraping DOM...');
        schemes = await this.scrapeDOMData();
      }

      console.log(`✅ Successfully extracted ${schemes.length} schemes`);
      return schemes;

    } catch (error) {
      console.error('❌ Error during scraping:', error.message);
      throw error;
    }
  }

  /**
   * Scrape paginated data by making multiple API calls
   */
  async scrapePaginatedData() {
    try {
      console.log('📄 Starting paginated data extraction...');
      
      // Make multiple API calls with different pagination parameters
      const pagesToScrape = 20; // Get first 20 pages (20 * 50 = 1000 schemes)
      const pageSize = 50;
      
      for (let page = 0; page < pagesToScrape; page++) {
        const from = page * pageSize;
        const apiUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=&sort=&from=${from}&size=${pageSize}`;
        
        try {
          console.log(`📄 Fetching page ${page + 1}/${pagesToScrape} (from=${from}, size=${pageSize})`);
          
          await this.page.goto(apiUrl, {
            waitUntil: 'networkidle',
            timeout: 30000
          });
          
          await this.page.waitForTimeout(1000); // Rate limiting
          
        } catch (error) {
          console.error(`❌ Error on page ${page + 1}:`, error.message);
        }
      }
      
      console.log(`✅ Completed paginated extraction: ${pagesToScrape} pages requested`);
      
    } catch (error) {
      console.log('⚠️ Error in paginated data extraction:', error.message);
    }
  }

  /**
   * Try to trigger additional data loading on the page
   */
  async triggerDataLoad() {
    try {
      // Look for search/load buttons
      const triggers = [
        'button[type="submit"]',
        '.search-btn',
        '.load-more',
        'button:has-text("Search")',
        'button:has-text("Show")'
      ];

      for (const selector of triggers) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`🔘 Clicking trigger: ${selector}`);
            await element.click();
            await this.page.waitForTimeout(2000);
            break;
          }
        } catch (e) {
          // Continue to next trigger
        }
      }

      // Scroll to trigger lazy loading
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

    } catch (error) {
      console.log('ℹ️ Could not trigger additional data loading');
    }
  }

  /**
   * Extract schemes from captured API responses
   */
  extractFromApiData() {
    const schemes = [];
    
    for (const capture of this.capturedApiData) {
      try {
        const { data, url } = capture;
        
        // Debug: Log the structure of captured data
        console.log(`🔍 Analyzing API response from: ${url}`);
        console.log(`📋 Data keys:`, Object.keys(data || {}));
        console.log(`📊 Data sample:`, JSON.stringify(data, null, 2).substring(0, 500) + '...');
        
        // Handle different API response structures
        let schemeArray = [];
        
        // MyScheme API specific structure
        if (data.data && data.data.hits && data.data.hits.items && Array.isArray(data.data.hits.items)) {
          schemeArray = data.data.hits.items;
          console.log(`🎯 Found ${schemeArray.length} schemes in data.data.hits.items`);
        } else if (data.data && data.data.results && Array.isArray(data.data.results)) {
          schemeArray = data.data.results;
          console.log(`🎯 Found ${schemeArray.length} schemes in data.data.results`);
        } else if (data.results && Array.isArray(data.results)) {
          schemeArray = data.results;
          console.log(`🎯 Found ${schemeArray.length} schemes in data.results`);
        } else if (Array.isArray(data)) {
          schemeArray = data;
          console.log(`🎯 Found ${schemeArray.length} schemes in root array`);
        } else if (data.data && Array.isArray(data.data)) {
          schemeArray = data.data;
          console.log(`🎯 Found ${schemeArray.length} schemes in data.data`);
        } else if (data.schemes && Array.isArray(data.schemes)) {
          schemeArray = data.schemes;
          console.log(`🎯 Found ${schemeArray.length} schemes in data.schemes`);
        } else if (data.hits && Array.isArray(data.hits)) {
          schemeArray = data.hits;
          console.log(`🎯 Found ${schemeArray.length} schemes in data.hits`);
        } else if (data.items && Array.isArray(data.items)) {
          schemeArray = data.items;
          console.log(`🎯 Found ${schemeArray.length} schemes in data.items`);
        } else {
          console.log(`⚠️ No scheme array found in expected locations for ${url}`);
        }

        // Process each scheme
        for (const item of schemeArray) {
          // MyScheme API structure: data is in item.fields
          const fields = item.fields || item;
          const schemeId = item.id || item._id;
          
          // Extract scheme name from various possible fields
          const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title || fields.scheme_name;
          
          if (schemeName) {
            console.log(`📋 Processing scheme: ${schemeName}`);
            schemes.push({
              name: schemeName,
              description: fields.schemeDescription || fields.description || fields.summary || '',
              ministry: fields.nodalMinistryName || fields.sponsoringMinistry || fields.ministry || fields.sponsoring_ministry || '',
              department: fields.sponsoringDepartment || fields.department || fields.sponsoring_department || '',
              targetAudience: fields.schemeFor || fields.beneficiaryType || fields.beneficiary_type || fields.target_audience || '',
              sector: Array.isArray(fields.schemeCategory) ? fields.schemeCategory.join(', ') : (fields.schemeCategory || fields.category || fields.sector || ''),
              launchDate: fields.launchDate || fields.launch_date ? new Date(fields.launchDate || fields.launch_date) : null,
              budget: fields.budget || null,
              // Additional MyScheme specific fields
              level: fields.level || '', // Central/State
              beneficiaryState: Array.isArray(fields.beneficiaryState) ? fields.beneficiaryState.join(', ') : (fields.beneficiaryState || ''),
              schemeId: schemeId,
              source: 'api',
              sourceUrl: capture.url,
              scrapedAt: new Date()
            });
          } else {
            console.log(`⚠️ Skipping item without name. Available fields:`, Object.keys(fields || {}));
          }
        }
      } catch (error) {
        console.error('Error processing API data:', error.message);
      }
    }

    console.log(`📊 Extracted ${schemes.length} schemes from API data`);
    return schemes;
  }

  /**
   * Fallback DOM scraping when API data is not available
   */
  async scrapeDOMData() {
    try {
      const schemes = await this.page.evaluate(() => {
        const extractedSchemes = [];
        
        // Try multiple selectors for scheme containers
        const containerSelectors = [
          '.scheme-card', '.card', '.scheme-item', '.result-item',
          '[class*="scheme"]', '[class*="card"]', '.list-item'
        ];

        let schemeElements = [];
        for (const selector of containerSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            schemeElements = Array.from(elements);
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            break;
          }
        }

        schemeElements.forEach((element, index) => {
          try {
            // Extract scheme name/title
            const nameSelectors = [
              '.scheme-name', '.card-title', '.title', '.name',
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              '[class*="name"]', '[class*="title"]'
            ];
            
            let schemeName = '';
            for (const selector of nameSelectors) {
              const nameEl = element.querySelector(selector);
              if (nameEl && nameEl.textContent.trim()) {
                schemeName = nameEl.textContent.trim();
                break;
              }
            }

            // Extract description
            const descSelectors = [
              '.scheme-description', '.card-text', '.description', '.summary',
              'p', '.content', '[class*="desc"]'
            ];
            
            let description = '';
            for (const selector of descSelectors) {
              const descEl = element.querySelector(selector);
              if (descEl && descEl.textContent.trim() && descEl.textContent.trim() !== schemeName) {
                description = descEl.textContent.trim();
                break;
              }
            }

            // Extract additional information from text content
            const allText = element.textContent || '';
            const ministry = this.extractPattern(allText, /ministry[:\s]+([^,\n]+)/i) || 'Government of India';
            const sector = this.extractPattern(allText, /sector[:\s]+([^,\n]+)/i) || 'General';

            if (schemeName && schemeName.length > 3) {
              extractedSchemes.push({
                name: schemeName,
                description: description || 'No description available',
                ministry: ministry,
                sector: sector,
                targetAudience: 'Citizens',
                source: 'dom',
                scrapedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Error extracting scheme data:', error);
          }
        });

        return extractedSchemes;
      });

      console.log(`📊 Extracted ${schemes.length} schemes from DOM`);
      return schemes;
    } catch (error) {
      console.error('❌ Error in DOM scraping:', error.message);
      return [];
    }
  }

  /**
   * Clean up browser resources
   */
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

  /**
   * Get scraping statistics
   */
  getStats() {
    return {
      capturedApiCalls: this.capturedApiData.length,
      lastRun: new Date(),
      browserActive: !!this.browser
    };
  }
}

export default MySchemeScraperService;