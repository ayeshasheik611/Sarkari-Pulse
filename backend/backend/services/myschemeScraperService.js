import { chromium } from 'playwright';

export class MySchemeScraperService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.capturedData = [];
  }

  async initialize() {
    try {
      console.log('🚀 Initializing browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic viewport and user agent
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });

      // Intercept network responses to capture API data
      this.page.on('response', async (response) => {
        const url = response.url();
        
        // Capture API responses
        if ((url.includes('api') || url.includes('search') || url.includes('scheme')) && 
            response.status() === 200) {
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              const data = await response.json();
              console.log(`📡 Captured API response from: ${url}`);
              this.capturedData.push({ url, data, timestamp: new Date() });
            }
          } catch (e) {
            console.log(`⚠️ Could not parse JSON from: ${url}`);
          }
        }
      });
      
      console.log('✅ Browser initialized with network interception');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error.message);
      throw error;
    }
  }

  async scrapeSchemes() {
    try {
      if (!this.page) {
        await this.initialize();
      }

      console.log('🔍 Navigating to MyScheme website...');
      this.capturedData = []; // Reset captured data
      
      // Navigate and wait for network activity
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for dynamic content to load
      await this.page.waitForTimeout(5000);

      // Try to trigger search/load more data
      await this.triggerDataLoad();

      // Wait for any additional network requests
      await this.page.waitForTimeout(3000);

      console.log(`📡 Captured ${this.capturedData.length} API responses`);

      // First, try to extract from captured JSON data
      let schemes = this.extractFromCapturedData();

      // If no schemes from API, fall back to DOM scraping
      if (schemes.length === 0) {
        console.log('🔄 No API data found, falling back to DOM scraping...');
        schemes = await this.scrapeDOMData();
      }

      // If still no schemes, try alternative methods
      if (schemes.length === 0) {
        console.log('🔄 Trying alternative scraping methods...');
        schemes = await this.tryAlternativeMethods();
      }

      console.log(`✅ Total extracted: ${schemes.length} schemes`);
      return schemes;

    } catch (error) {
      console.error('❌ Error scraping schemes:', error.message);
      throw error;
    }
  }

  async triggerDataLoad() {
    try {
      console.log('🔄 Attempting to trigger scheme data loading...');
      
      // Wait for page to fully load
      await this.page.waitForLoadState('networkidle');
      
      // Try to interact with search/filter elements
      const interactions = [
        // Try clicking search button
        async () => {
          const searchBtn = this.page.locator('button:has-text("Search"), button[type="submit"], .search-button');
          if (await searchBtn.first().isVisible({ timeout: 2000 })) {
            console.log('🔘 Clicking search button');
            await searchBtn.first().click();
            await this.page.waitForTimeout(3000);
            return true;
          }
          return false;
        },
        
        // Try interacting with filters
        async () => {
          const filters = this.page.locator('.filter, .category-filter, select');
          if (await filters.first().isVisible({ timeout: 2000 })) {
            console.log('🔘 Interacting with filters');
            await filters.first().click();
            await this.page.waitForTimeout(2000);
            return true;
          }
          return false;
        },
        
        // Try scrolling to trigger lazy loading
        async () => {
          console.log('📜 Scrolling to trigger lazy loading');
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await this.page.waitForTimeout(2000);
          
          // Scroll back up
          await this.page.evaluate(() => {
            window.scrollTo(0, 0);
          });
          await this.page.waitForTimeout(2000);
          return true;
        },
        
        // Try pressing Enter in search box
        async () => {
          const searchInput = this.page.locator('input[type="search"], input[placeholder*="search"], .search-input');
          if (await searchInput.first().isVisible({ timeout: 2000 })) {
            console.log('⌨️ Pressing Enter in search box');
            await searchInput.first().press('Enter');
            await this.page.waitForTimeout(3000);
            return true;
          }
          return false;
        }
      ];

      // Try each interaction
      for (const interaction of interactions) {
        try {
          const success = await interaction();
          if (success) {
            // Wait for potential network requests
            await this.page.waitForTimeout(2000);
          }
        } catch (e) {
          console.log(`⚠️ Interaction failed: ${e.message}`);
        }
      }

      // Final wait for any delayed requests
      await this.page.waitForTimeout(3000);

    } catch (error) {
      console.log('ℹ️ Could not trigger additional data load:', error.message);
    }
  }

  extractFromCapturedData() {
    const schemes = [];
    
    for (const capture of this.capturedData) {
      try {
        const { data, url } = capture;
        console.log(`🔍 Processing captured data from: ${url}`);
        console.log(`📄 Data structure:`, Object.keys(data));
        
        // Handle different API response structures
        let schemeArray = [];
        
        // MyScheme API specific structure
        if (data.hits && Array.isArray(data.hits)) {
          schemeArray = data.hits;
        } else if (data.results && Array.isArray(data.results)) {
          schemeArray = data.results;
        } else if (data.schemes && Array.isArray(data.schemes)) {
          schemeArray = data.schemes;
        } else if (data.data && Array.isArray(data.data)) {
          schemeArray = data.data;
        } else if (Array.isArray(data)) {
          schemeArray = data;
        } else if (data._source) {
          // Single scheme object
          schemeArray = [data._source];
        }

        console.log(`📊 Found ${schemeArray.length} potential schemes in this response`);

        for (const item of schemeArray) {
          try {
            // Handle nested _source structure (common in Elasticsearch responses)
            const source = item._source || item;
            
            if (source && (source.name || source.title || source.scheme_name || source.schemeName)) {
              const scheme = {
                id: source.id || source.scheme_id || source._id || `api_${Date.now()}_${Math.random()}`,
                scheme_name: source.scheme_name || source.schemeName || source.name || source.title,
                description: source.description || source.scheme_description || source.summary || source.brief || '',
                ministry: source.ministry || source.sponsoring_ministry || source.ministerName || '',
                department: source.department || source.sponsoring_department || source.departmentName || '',
                category: source.category || source.scheme_category || source.categoryName || '',
                sub_category: source.sub_category || source.scheme_sub_category || source.subCategoryName || '',
                beneficiary_type: source.beneficiary_type || source.beneficiaryType || source.targetAudience || '',
                eligibility: source.eligibility || source.eligibility_criteria || source.eligibilityCriteria || '',
                benefits: source.benefits || source.scheme_benefits || source.schemeBenefits || '',
                application_process: source.application_process || source.applicationProcess || source.howToApply || '',
                documents_required: source.documents_required || source.documentsRequired || source.requiredDocuments || [],
                official_website: source.official_website || source.officialWebsite || source.website || source.url || '',
                launch_date: source.launch_date || source.launchDate || source.created_date || source.createdDate,
                status: source.status || 'Active',
                source: 'api'
              };
              
              schemes.push(scheme);
              console.log(`✅ Extracted scheme: ${scheme.scheme_name}`);
            }
          } catch (itemError) {
            console.error('Error processing individual scheme:', itemError.message);
          }
        }
      } catch (error) {
        console.error('Error processing captured data:', error.message);
      }
    }

    console.log(`📊 Total extracted ${schemes.length} schemes from API data`);
    return schemes;
  }

  async scrapeDOMData() {
    try {
      const schemes = await this.page.evaluate(() => {
        const extractedSchemes = [];
        
        // Try multiple selectors for scheme containers
        const containerSelectors = [
          '.scheme-card', '.card', '.scheme-item', '.result-item',
          '[class*="scheme"]', '[class*="card"]', '.list-item',
          '.search-result', '.scheme-container'
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

            // Extract description
            const descSelectors = [
              '.scheme-description', '.card-text', '.description', '.summary',
              'p', '.content', '[class*="desc"]', '.text'
            ];
            
            let description = '';
            for (const selector of descSelectors) {
              const descEl = element.querySelector(selector);
              if (descEl && descEl.textContent.trim() && descEl.textContent.trim() !== schemeName) {
                description = descEl.textContent.trim();
                break;
              }
            }

            // Extract additional info
            const allText = element.textContent || '';
            const ministry = this.extractPattern(allText, /ministry[:\s]+([^,\n]+)/i) || 'Government of India';
            const category = this.extractPattern(allText, /category[:\s]+([^,\n]+)/i) || 'Government Scheme';

            if (schemeName && schemeName.length > 3) {
              extractedSchemes.push({
                id: `dom_${index}_${Date.now()}`,
                scheme_name: schemeName,
                description: description || 'No description available',
                ministry: ministry,
                category: category,
                source: 'dom',
                scraped_at: new Date().toISOString()
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

  async tryAlternativeMethods() {
    try {
      // First try direct API calls with the discovered endpoints
      const directApiSchemes = await this.tryDirectApiCalls();
      if (directApiSchemes.length > 0) {
        return directApiSchemes;
      }

      // Try different pages or search approaches
      const alternativeUrls = [
        'https://www.myscheme.gov.in/',
        'https://www.myscheme.gov.in/find-scheme',
        'https://www.myscheme.gov.in/schemes'
      ];

      for (const url of alternativeUrls) {
        try {
          console.log(`🔄 Trying alternative URL: ${url}`);
          await this.page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
          await this.page.waitForTimeout(3000);
          
          const schemes = await this.scrapeDOMData();
          if (schemes.length > 0) {
            return schemes;
          }
        } catch (e) {
          console.log(`❌ Failed to scrape ${url}`);
        }
      }

      return [];
    } catch (error) {
      console.error('❌ Error in alternative methods:', error.message);
      return [];
    }
  }

  async tryDirectApiCalls() {
    try {
      console.log('🔄 Trying direct API calls...');
      
      // Use the browser context to make API calls with proper headers
      const schemes = await this.page.evaluate(async () => {
        try {
          const apiUrls = [
            'https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=&sort=&from=0&size=50',
            'https://api.myscheme.gov.in/search/v5/schemes?lang=en&from=0&size=50',
            'https://api.myscheme.gov.in/search/v5/schemes'
          ];

          for (const apiUrl of apiUrls) {
            try {
              console.log(`🔗 Trying API: ${apiUrl}`);
              const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Referer': 'https://www.myscheme.gov.in/search',
                  'Origin': 'https://www.myscheme.gov.in'
                }
              });

              if (response.ok) {
                const data = await response.json();
                console.log(`✅ API call successful:`, Object.keys(data));
                
                // Extract schemes from response
                let schemeArray = [];
                if (data.hits && Array.isArray(data.hits)) {
                  schemeArray = data.hits;
                } else if (data.results && Array.isArray(data.results)) {
                  schemeArray = data.results;
                } else if (Array.isArray(data)) {
                  schemeArray = data;
                }

                if (schemeArray.length > 0) {
                  return schemeArray.map((item, index) => {
                    const source = item._source || item;
                    return {
                      id: source.id || `direct_api_${index}`,
                      scheme_name: source.scheme_name || source.schemeName || source.name || source.title || 'Unknown Scheme',
                      description: source.description || source.scheme_description || '',
                      ministry: source.ministry || source.sponsoring_ministry || '',
                      category: source.category || source.scheme_category || '',
                      source: 'direct_api'
                    };
                  });
                }
              }
            } catch (apiError) {
              console.log(`❌ API call failed: ${apiError.message}`);
            }
          }
          
          return [];
        } catch (error) {
          console.error('Error in direct API calls:', error.message);
          return [];
        }
      });

      console.log(`📊 Direct API calls returned ${schemes.length} schemes`);
      return schemes;
    } catch (error) {
      console.error('❌ Error in direct API calls:', error.message);
      return [];
    }
  }

  async scrapeSchemeDetails(schemeUrl) {
    try {
      if (!this.page) {
        await this.initialize();
      }

      console.log(`🔍 Scraping details for: ${schemeUrl}`);
      await this.page.goto(schemeUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);

      const details = await this.page.evaluate(() => {
        const getTextBySelectors = (selectors) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
              return element.textContent.trim();
            }
          }
          return '';
        };

        const getListBySelectors = (selectors) => {
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              return Array.from(elements).map(el => el.textContent.trim()).filter(text => text);
            }
          }
          return [];
        };

        return {
          eligibility: getTextBySelectors([
            '.eligibility', '.eligibility-criteria', '[class*="eligib"]', 
            'section:has-text("Eligibility")', 'div:has-text("Eligibility")',
            '.criteria', '.requirements'
          ]),
          benefits: getTextBySelectors([
            '.benefits', '.scheme-benefits', '[class*="benefit"]', 
            'section:has-text("Benefits")', 'div:has-text("Benefits")',
            '.advantages', '.features'
          ]),
          applicationProcess: getTextBySelectors([
            '.application', '.application-process', '[class*="apply"]', 
            'section:has-text("Apply")', 'div:has-text("Application")',
            '.process', '.procedure', '.how-to-apply'
          ]),
          documentsRequired: getListBySelectors([
            '.documents li', '.document-list li', '.required-docs li',
            '.documents p', '.document-list p'
          ]).join(', ') || getTextBySelectors([
            '.documents', '.document-list', '[class*="document"]', 
            'section:has-text("Documents")', 'div:has-text("Documents")',
            '.required-documents'
          ]),
          ministry: getTextBySelectors([
            '.ministry', '.sponsoring-ministry', '[class*="ministry"]',
            '.department', '.govt-dept'
          ]),
          launchDate: getTextBySelectors([
            '.launch-date', '.start-date', '[class*="date"]',
            '.created-date', '.published-date'
          ]),
          officialWebsite: (() => {
            const links = document.querySelectorAll('a[href*="gov.in"], a[href*="nic.in"]');
            for (const link of links) {
              if (link.href && link.href !== window.location.href) {
                return link.href;
              }
            }
            return '';
          })()
        };
      });

      return details;
    } catch (error) {
      console.error('❌ Error scraping scheme details:', error.message);
      return {};
    }
  }

  async enrichSchemesWithDetails(schemes, maxDetails = 5) {
    console.log(`🔍 Enriching ${Math.min(schemes.length, maxDetails)} schemes with detailed information...`);
    
    const enrichedSchemes = [];
    
    for (let i = 0; i < Math.min(schemes.length, maxDetails); i++) {
      const scheme = schemes[i];
      
      try {
        // Try to find detail page URL
        let detailUrl = null;
        
        if (scheme.url || scheme.link || scheme.detail_url) {
          detailUrl = scheme.url || scheme.link || scheme.detail_url;
        } else {
          // Try to construct detail URL
          const schemeId = scheme.id || scheme.scheme_id;
          if (schemeId) {
            detailUrl = `https://www.myscheme.gov.in/schemes/${schemeId}`;
          }
        }

        if (detailUrl) {
          console.log(`📄 Fetching details for: ${scheme.scheme_name}`);
          const details = await this.scrapeSchemeDetails(detailUrl);
          
          // Merge details with scheme
          enrichedSchemes.push({
            ...scheme,
            ...details,
            enriched: true
          });
        } else {
          enrichedSchemes.push(scheme);
        }
        
        // Small delay between requests
        await this.page.waitForTimeout(1000);
        
      } catch (error) {
        console.error(`❌ Error enriching scheme ${scheme.scheme_name}:`, error.message);
        enrichedSchemes.push(scheme);
      }
    }

    // Add remaining schemes without enrichment
    enrichedSchemes.push(...schemes.slice(maxDetails));
    
    return enrichedSchemes;
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

  // Alternative method: Try to scrape from search results page
  async scrapeFromSearchPage() {
    try {
      if (!this.page) {
        await this.initialize();
      }

      console.log('🔍 Trying alternative scraping method...');
      
      // Try the search API endpoint directly in browser context
      await this.page.goto('https://www.myscheme.gov.in/search');
      await this.page.waitForTimeout(3000);

      // Intercept network requests to capture API calls
      const schemes = await this.page.evaluate(async () => {
        try {
          // Try to find and trigger search
          const searchButton = document.querySelector('button[type="submit"], .search-btn, .btn-search');
          if (searchButton) {
            searchButton.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          // Look for scheme data in the page
          const schemeData = [];
          const schemeElements = document.querySelectorAll('[class*="scheme"], [class*="card"], .result-item');
          
          schemeElements.forEach((el, idx) => {
            const name = el.querySelector('h1, h2, h3, h4, .title, .name')?.textContent?.trim();
            const desc = el.querySelector('p, .description, .summary')?.textContent?.trim();
            
            if (name) {
              schemeData.push({
                id: `scraped_${idx}_${Date.now()}`,
                scheme_name: name,
                description: desc || 'No description available',
                ministry: 'Government of India',
                category: 'Government Scheme',
                scraped_at: new Date().toISOString()
              });
            }
          });

          return schemeData;
        } catch (error) {
          console.error('Error in page evaluation:', error);
          return [];
        }
      });

      return schemes;
    } catch (error) {
      console.error('❌ Error in alternative scraping:', error.message);
      return [];
    }
  }
}

export default MySchemeScraperService;