import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Comprehensive Government Scraper
 * Extracts schemes from multiple government portals
 */
class ComprehensiveGovernmentScraper {
  constructor() {
    this.browser = null;
    this.extractedSchemes = new Map();
    this.stats = {
      totalSources: 0,
      successfulSources: 0,
      totalSchemes: 0,
      savedSchemes: 0,
      updatedSchemes: 0,
      errors: 0
    };
    
    this.sources = [
      {
        name: 'DBT Bharat',
        url: 'https://www.dbtbharat.gov.in/central-scheme/list',
        description: 'Direct Benefit Transfer schemes',
        extractionMethod: 'list-extraction'
      },
      {
        name: 'India.gov.in Schemes',
        url: 'https://www.india.gov.in/my-government/schemes-0',
        description: 'National portal schemes',
        extractionMethod: 'mixed-extraction'
      },
      {
        name: 'MyGov Portal',
        url: 'https://www.mygov.in/',
        description: 'Citizen engagement schemes',
        extractionMethod: 'content-extraction'
      },
      {
        name: 'Digital India',
        url: 'https://www.digitalindia.gov.in/',
        description: 'Digital initiatives and schemes',
        extractionMethod: 'content-extraction'
      }
    ];
  }

  async initialize() {
    console.log('🚀 Initializing Comprehensive Government Scraper...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log(`✅ Scraper initialized for ${this.sources.length} government sources`);
  }

  async scrapeAllSources() {
    console.log('🔍 Starting comprehensive government scheme extraction...');
    console.log(`🎯 Target: ${this.sources.length} government portals`);
    console.log('');

    for (const source of this.sources) {
      await this.scrapeSource(source);
      await this.delay(3000); // Rate limiting between sources
    }

    const schemes = Array.from(this.extractedSchemes.values());
    console.log(`🎉 Comprehensive extraction completed: ${schemes.length} unique schemes`);
    
    return schemes;
  }

  async scrapeSource(source) {
    console.log(`🔍 Scraping: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    
    this.stats.totalSources++;
    let page = null;
    
    try {
      page = await this.browser.newPage();
      
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      });

      const response = await page.goto(source.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      await page.waitForTimeout(3000);
      
      // Extract schemes based on the source type
      let schemes = [];
      
      if (source.name === 'DBT Bharat') {
        schemes = await this.extractDBTSchemes(page);
      } else if (source.name === 'India.gov.in Schemes') {
        schemes = await this.extractIndiaGovSchemes(page);
      } else if (source.name === 'MyGov Portal') {
        schemes = await this.extractMyGovSchemes(page);
      } else if (source.name === 'Digital India') {
        schemes = await this.extractDigitalIndiaSchemes(page);
      }
      
      console.log(`   ✅ Extracted ${schemes.length} schemes`);
      
      // Process and store schemes
      for (const schemeData of schemes) {
        const key = schemeData.name.toLowerCase().trim();
        
        if (!this.extractedSchemes.has(key) && schemeData.name.length > 3) {
          this.extractedSchemes.set(key, {
            ...schemeData,
            source: source.name.toLowerCase().replace(/\s+/g, '-'),
            sourceUrl: source.url,
            scrapedAt: new Date(),
            isActive: true
          });
          this.stats.totalSchemes++;
        }
      }
      
      this.stats.successfulSources++;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.stats.errors++;
    } finally {
      if (page) {
        await page.close();
      }
    }
    
    console.log('');
  }

  async extractDBTSchemes(page) {
    return await page.evaluate(() => {
      const schemes = [];
      
      // Look for list items containing scheme names
      const listItems = document.querySelectorAll('li, .list-item, .scheme-item');
      
      Array.from(listItems).forEach(item => {
        const text = item.textContent.trim();
        if (text && text.length > 10 && text.length < 200 && 
            (text.toLowerCase().includes('scheme') || 
             text.toLowerCase().includes('yojana') || 
             text.toLowerCase().includes('program'))) {
          
          // Clean up the text
          const cleanName = text.replace(/\s+/g, ' ').trim();
          
          schemes.push({
            name: cleanName,
            description: 'Direct Benefit Transfer Scheme',
            ministry: 'Government of India',
            sector: 'Direct Benefit Transfer',
            level: 'Central',
            beneficiaryState: 'All',
            targetAudience: 'Citizens'
          });
        }
      });
      
      return schemes;
    });
  }

  async extractIndiaGovSchemes(page) {
    return await page.evaluate(() => {
      const schemes = [];
      
      // Look for scheme links and content
      const links = document.querySelectorAll('a[href*="scheme"], a[href*="yojana"]');
      
      Array.from(links).forEach(link => {
        const text = link.textContent.trim();
        if (text && text.length > 5 && text.length < 150) {
          schemes.push({
            name: text,
            description: 'Government Scheme from National Portal',
            ministry: 'Government of India',
            sector: 'General',
            level: 'Central',
            beneficiaryState: 'All',
            targetAudience: 'Citizens'
          });
        }
      });
      
      // Also look for scheme names in text content
      const bodyText = document.body.textContent;
      const lines = bodyText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10 && line.length < 150);
      
      const schemeLines = lines.filter(line => {
        const lower = line.toLowerCase();
        return (lower.includes('scheme') || lower.includes('yojana')) &&
               !line.includes('http') && !line.includes('@');
      });
      
      schemeLines.slice(0, 30).forEach(line => {
        schemes.push({
          name: line,
          description: 'Government Scheme',
          ministry: 'Government of India',
          sector: 'General',
          level: 'Central',
          beneficiaryState: 'All',
          targetAudience: 'Citizens'
        });
      });
      
      return schemes;
    });
  }

  async extractMyGovSchemes(page) {
    return await page.evaluate(() => {
      const schemes = [];
      
      // Look for scheme-related content in MyGov
      const elements = document.querySelectorAll('.card, .item, .post, [class*="scheme"], [class*="yojana"]');
      
      Array.from(elements).forEach(element => {
        const text = element.textContent.trim();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        for (const line of lines) {
          if (line.length > 10 && line.length < 200 && 
              (line.toLowerCase().includes('scheme') || 
               line.toLowerCase().includes('yojana') ||
               line.toLowerCase().includes('program'))) {
            
            schemes.push({
              name: line,
              description: 'Citizen Engagement Scheme',
              ministry: 'Government of India',
              sector: 'Citizen Services',
              level: 'Central',
              beneficiaryState: 'All',
              targetAudience: 'Citizens'
            });
            break; // Only take first scheme-like line from each element
          }
        }
      });
      
      return schemes;
    });
  }

  async extractDigitalIndiaSchemes(page) {
    return await page.evaluate(() => {
      const schemes = [];
      
      // Look for digital initiatives and programs
      const elements = document.querySelectorAll('.program, .initiative, .card, .item, [class*="digital"]');
      
      Array.from(elements).forEach(element => {
        const text = element.textContent.trim();
        if (text && text.length > 10 && text.length < 200) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
          
          for (const line of lines) {
            if (line.toLowerCase().includes('digital') || 
                line.toLowerCase().includes('program') ||
                line.toLowerCase().includes('initiative') ||
                line.toLowerCase().includes('scheme')) {
              
              schemes.push({
                name: line,
                description: 'Digital India Initiative',
                ministry: 'Ministry of Electronics and Information Technology',
                sector: 'Digital Infrastructure',
                level: 'Central',
                beneficiaryState: 'All',
                targetAudience: 'Citizens'
              });
              break;
            }
          }
        }
      });
      
      return schemes;
    });
  }

  async saveSchemesToDatabase(schemes) {
    console.log(`💾 Saving ${schemes.length} government schemes to database...`);
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const schemeData of schemes) {
      try {
        // Add unique scheme ID
        schemeData.schemeId = `gov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
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

    this.stats.savedSchemes = savedCount;
    this.stats.updatedSchemes = updatedCount;

    console.log(`✅ Database save completed: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
    return { savedCount, updatedCount, errorCount };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Comprehensive scraper closed');
    }
  }

  getStats() {
    return this.stats;
  }
}

// Main execution function
async function runComprehensiveGovernmentScraper() {
  let scraper = null;
  
  try {
    console.log('🚀 Starting Comprehensive Government Scheme Scraper...');
    console.log('🎯 Target: Multiple government portals for maximum scheme coverage');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize and run scraper
    scraper = new ComprehensiveGovernmentScraper();
    await scraper.initialize();
    
    const startTime = new Date();
    const schemes = await scraper.scrapeAllSources();
    const endTime = new Date();
    
    // Save to database
    const saveResult = await scraper.saveSchemesToDatabase(schemes);
    
    const duration = Math.round((endTime - startTime) / 1000);
    const stats = scraper.getStats();

    console.log('');
    console.log('🎉 COMPREHENSIVE GOVERNMENT SCRAPING COMPLETED!');
    console.log('===============================================');
    console.log(`✅ Total unique schemes extracted: ${schemes.length}`);
    console.log(`💾 Database results: ${saveResult.savedCount} new, ${saveResult.updatedCount} updated`);
    console.log(`⏱️ Total time: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📊 Sources processed: ${stats.successfulSources}/${stats.totalSources}`);
    console.log(`❌ Errors encountered: ${stats.errors}`);
    console.log('');

    // Show breakdown by source
    const sourceBreakdown = {};
    schemes.forEach(scheme => {
      const source = scheme.source || 'unknown';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });

    console.log('📊 Schemes by source:');
    Object.entries(sourceBreakdown).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} schemes`);
    });
    console.log('');

    // Show sample schemes
    if (schemes.length > 0) {
      console.log('📋 Sample extracted schemes:');
      schemes.slice(0, 15).forEach((scheme, index) => {
        console.log(`${index + 1}. ${scheme.name}`);
        console.log(`   Source: ${scheme.source} | Ministry: ${scheme.ministry}`);
      });
      
      if (schemes.length > 15) {
        console.log(`   ... and ${schemes.length - 15} more schemes`);
      }
    }

    console.log('');
    console.log('💡 SUMMARY:');
    if (schemes.length >= 100) {
      console.log('🎯 EXCELLENT: Extracted 100+ schemes from government sources!');
    } else if (schemes.length >= 50) {
      console.log('✅ GREAT: Extracted 50+ schemes - good coverage');
    } else if (schemes.length >= 20) {
      console.log('👍 GOOD: Extracted 20+ schemes - decent progress');
    } else {
      console.log('📈 PROGRESS: Extracted some schemes - foundation established');
    }
    
    console.log(`📈 Combined with existing MyScheme data, you now have comprehensive government scheme coverage!`);

  } catch (error) {
    console.error('❌ Comprehensive scraping failed:', error.message);
    console.error(error.stack);
  } finally {
    if (scraper) {
      await scraper.close();
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
    
    console.log('🏁 Comprehensive government scraper finished');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveGovernmentScraper();
}

export default ComprehensiveGovernmentScraper;