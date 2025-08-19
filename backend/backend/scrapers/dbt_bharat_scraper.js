import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * DBT Bharat Scraper
 * Extracts Direct Benefit Transfer schemes from dbtbharat.gov.in
 */
class DBTBharatScraperService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.extractedSchemes = new Map();
    this.stats = {
      pagesProcessed: 0,
      schemesFound: 0,
      duplicatesSkipped: 0,
      errors: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing DBT Bharat scraper...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    });

    console.log('✅ DBT Bharat scraper initialized');
  }

  async scrapeSchemes() {
    try {
      console.log('🔍 Starting DBT Bharat scheme extraction...');
      
      // Navigate to the schemes list page
      const schemesUrl = 'https://www.dbtbharat.gov.in/central-scheme/list';
      console.log(`📄 Navigating to: ${schemesUrl}`);
      
      await this.page.goto(schemesUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);
      
      // Extract schemes from the page
      const schemes = await this.page.evaluate(() => {
        const schemeElements = [];
        
        // Look for different possible selectors for scheme data
        const selectors = [
          '.scheme-card',
          '.card',
          'tr',
          '.list-item',
          '[class*="scheme"]',
          '.row .col'
        ];
        
        let foundElements = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements = Array.from(elements);
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            break;
          }
        }
        
        // If no structured elements found, try to extract from text
        if (foundElements.length === 0) {
          // Look for scheme names in the page text
          const pageText = document.body.textContent;
          const lines = pageText.split('\n').map(line => line.trim()).filter(line => line.length > 10);
          
          // Filter lines that look like scheme names
          const schemeLines = lines.filter(line => {
            const lower = line.toLowerCase();
            return (lower.includes('scheme') || lower.includes('yojana') || lower.includes('program')) &&
                   line.length < 200 && // Not too long
                   !line.includes('http') && // Not a URL
                   !line.includes('@'); // Not an email
          });
          
          return schemeLines.map(line => ({
            name: line,
            description: '',
            ministry: '',
            source: 'text-extraction'
          }));
        }
        
        // Process structured elements
        foundElements.forEach((element, index) => {
          try {
            let schemeName = '';
            let description = '';
            let ministry = '';
            let additionalInfo = '';
            
            // Try to extract scheme name from various elements
            const nameSelectors = [
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              '.title', '.name', '.scheme-name',
              'td:first-child', '.card-title',
              'strong', 'b'
            ];
            
            for (const selector of nameSelectors) {
              const nameEl = element.querySelector(selector);
              if (nameEl && nameEl.textContent.trim()) {
                schemeName = nameEl.textContent.trim();
                break;
              }
            }
            
            // If no name found in child elements, use element text
            if (!schemeName) {
              const text = element.textContent.trim();
              if (text.length > 5 && text.length < 200) {
                schemeName = text.split('\n')[0].trim();
              }
            }
            
            // Try to extract description
            const descSelectors = [
              '.description', '.summary', '.details',
              'p', '.card-text', 'td:nth-child(2)'
            ];
            
            for (const selector of descSelectors) {
              const descEl = element.querySelector(selector);
              if (descEl && descEl.textContent.trim() && descEl.textContent.trim() !== schemeName) {
                description = descEl.textContent.trim();
                break;
              }
            }
            
            // Try to extract ministry information
            const allText = element.textContent.toLowerCase();
            if (allText.includes('ministry')) {
              const ministryMatch = allText.match(/ministry[^,\n]*/i);
              if (ministryMatch) {
                ministry = ministryMatch[0].trim();
              }
            }
            
            if (schemeName && schemeName.length > 3) {
              schemeElements.push({
                name: schemeName,
                description: description || 'Direct Benefit Transfer Scheme',
                ministry: ministry || 'Government of India',
                department: '',
                targetAudience: 'Citizens',
                sector: 'Direct Benefit Transfer',
                source: 'dbt-bharat',
                additionalInfo: additionalInfo
              });
            }
          } catch (error) {
            console.error('Error processing element:', error);
          }
        });
        
        return schemeElements;
      });

      console.log(`📊 Extracted ${schemes.length} schemes from DBT Bharat`);
      
      // Process and store schemes
      for (const schemeData of schemes) {
        const key = schemeData.name.toLowerCase().trim();
        
        if (!this.extractedSchemes.has(key)) {
          this.extractedSchemes.set(key, {
            ...schemeData,
            level: 'Central',
            beneficiaryState: 'All',
            schemeId: `dbt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sourceUrl: 'https://www.dbtbharat.gov.in/central-scheme/list',
            scrapedAt: new Date(),
            isActive: true
          });
          this.stats.schemesFound++;
        } else {
          this.stats.duplicatesSkipped++;
        }
      }
      
      this.stats.pagesProcessed++;
      
      // Try to find and process additional pages or sections
      await this.exploreAdditionalPages();
      
      const finalSchemes = Array.from(this.extractedSchemes.values());
      console.log(`✅ DBT Bharat extraction completed: ${finalSchemes.length} unique schemes`);
      
      return finalSchemes;
      
    } catch (error) {
      console.error('❌ Error during DBT Bharat scraping:', error.message);
      this.stats.errors++;
      throw error;
    }
  }

  async exploreAdditionalPages() {
    try {
      console.log('🔍 Exploring additional DBT pages...');
      
      // Look for pagination or additional scheme categories
      const additionalLinks = await this.page.evaluate(() => {
        const links = [];
        const linkElements = document.querySelectorAll('a[href*="scheme"], a[href*="list"], a[href*="central"]');
        
        linkElements.forEach(link => {
          const href = link.getAttribute('href');
          const text = link.textContent.trim();
          
          if (href && text && 
              (text.toLowerCase().includes('scheme') || 
               text.toLowerCase().includes('list') ||
               text.toLowerCase().includes('central') ||
               text.toLowerCase().includes('state'))) {
            
            // Convert relative URLs to absolute
            const fullUrl = href.startsWith('http') ? href : `https://www.dbtbharat.gov.in${href}`;
            links.push({ url: fullUrl, text: text });
          }
        });
        
        return links.slice(0, 5); // Limit to first 5 additional links
      });
      
      console.log(`🔗 Found ${additionalLinks.length} additional links to explore`);
      
      for (const link of additionalLinks) {
        try {
          console.log(`📄 Exploring: ${link.text} - ${link.url}`);
          
          await this.page.goto(link.url, {
            waitUntil: 'networkidle',
            timeout: 20000
          });
          
          await this.page.waitForTimeout(2000);
          
          // Extract schemes from this page using similar logic
          const additionalSchemes = await this.page.evaluate(() => {
            const schemes = [];
            const text = document.body.textContent;
            
            // Look for scheme names in the text
            const lines = text.split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 10 && line.length < 150);
            
            const schemeLines = lines.filter(line => {
              const lower = line.toLowerCase();
              return (lower.includes('scheme') || lower.includes('yojana') || lower.includes('program')) &&
                     !line.includes('http') && !line.includes('@');
            });
            
            return schemeLines.slice(0, 20).map(line => ({
              name: line,
              description: 'DBT Scheme',
              ministry: 'Government of India',
              source: 'dbt-additional'
            }));
          });
          
          // Add new schemes
          for (const scheme of additionalSchemes) {
            const key = scheme.name.toLowerCase().trim();
            if (!this.extractedSchemes.has(key)) {
              this.extractedSchemes.set(key, {
                ...scheme,
                level: 'Central',
                beneficiaryState: 'All',
                sector: 'Direct Benefit Transfer',
                schemeId: `dbt-add-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                sourceUrl: link.url,
                scrapedAt: new Date(),
                isActive: true
              });
              this.stats.schemesFound++;
            }
          }
          
          this.stats.pagesProcessed++;
          
        } catch (linkError) {
          console.error(`❌ Error exploring link ${link.url}:`, linkError.message);
          this.stats.errors++;
        }
      }
      
    } catch (error) {
      console.log('⚠️ Could not explore additional pages:', error.message);
    }
  }

  async saveSchemesToDatabase(schemes) {
    console.log(`💾 Saving ${schemes.length} DBT schemes to database...`);
    
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
      console.log('✅ DBT Bharat scraper closed');
    }
  }

  getStats() {
    return {
      ...this.stats,
      uniqueSchemes: this.extractedSchemes.size
    };
  }
}

// Main execution function
async function runDBTBharatScraper() {
  let scraper = null;
  
  try {
    console.log('🚀 Starting DBT Bharat Scheme Scraper...');
    console.log('🎯 Target: Direct Benefit Transfer schemes from dbtbharat.gov.in');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize and run scraper
    scraper = new DBTBharatScraperService();
    await scraper.initialize();
    
    const startTime = new Date();
    const schemes = await scraper.scrapeSchemes();
    const endTime = new Date();
    
    // Save to database
    const saveResult = await scraper.saveSchemesToDatabase(schemes);
    
    const duration = Math.round((endTime - startTime) / 1000);
    const stats = scraper.getStats();

    console.log('');
    console.log('🎉 DBT BHARAT SCRAPING COMPLETED!');
    console.log('=================================');
    console.log(`✅ Total schemes extracted: ${schemes.length}`);
    console.log(`💾 Database results: ${saveResult.savedCount} new, ${saveResult.updatedCount} updated`);
    console.log(`⏱️ Total time: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📄 Pages processed: ${stats.pagesProcessed}`);
    console.log(`🔄 Duplicates skipped: ${stats.duplicatesSkipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('');

    // Show sample schemes
    if (schemes.length > 0) {
      console.log('📋 Sample extracted schemes:');
      schemes.slice(0, 10).forEach((scheme, index) => {
        console.log(`${index + 1}. ${scheme.name}`);
        if (scheme.description && scheme.description !== scheme.name) {
          console.log(`   Description: ${scheme.description.substring(0, 100)}...`);
        }
      });
    }

  } catch (error) {
    console.error('❌ DBT Bharat scraping failed:', error.message);
    console.error(error.stack);
  } finally {
    if (scraper) {
      await scraper.close();
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
    
    console.log('🏁 DBT Bharat scraper finished');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDBTBharatScraper();
}

export default DBTBharatScraperService;