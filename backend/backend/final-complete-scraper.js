import axios from 'axios';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

// The API key we discovered from network analysis
const API_KEY = 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc';

class FinalCompleteScraper {
  constructor() {
    this.allSchemes = new Map();
    this.processedIds = new Set();
  }

  async scrapeAllSchemes() {
    try {
      console.log('🚀 Starting FINAL complete scraping with discovered API key...');
      
      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');

      const baseUrl = 'https://api.myscheme.gov.in/search/v5/schemes';
      
      // First, get the total count
      console.log('📊 Getting total scheme count...');
      const firstResponse = await this.makeApiCall(baseUrl, { from: 0, size: 1 });
      
      if (!firstResponse) {
        throw new Error('Failed to get initial response');
      }
      
      const totalSchemes = firstResponse.data.summary.total;
      console.log(`📈 Total schemes available: ${totalSchemes}`);
      
      // Calculate pagination - use larger page sizes for efficiency
      const pageSize = 100; // Maximum reasonable page size
      const totalPages = Math.ceil(totalSchemes / pageSize);
      console.log(`📄 Will fetch ${totalPages} pages with ${pageSize} schemes each`);
      
      // Fetch all pages
      for (let page = 0; page < totalPages; page++) {
        const from = page * pageSize;
        console.log(`📥 Fetching page ${page + 1}/${totalPages} (schemes ${from + 1}-${Math.min(from + pageSize, totalSchemes)})`);
        
        try {
          const response = await this.makeApiCall(baseUrl, { 
            from, 
            size: pageSize 
          });
          
          if (response && response.data.hits && response.data.hits.items) {
            const schemes = response.data.hits.items;
            console.log(`   ✅ Got ${schemes.length} schemes from page ${page + 1}`);
            
            // Process schemes
            for (const item of schemes) {
              this.processSchemeItem(item);
            }
          } else {
            console.log(`   ⚠️ No schemes found on page ${page + 1}`);
          }
          
          // Progress update
          console.log(`   📈 Total unique schemes collected so far: ${this.allSchemes.size}`);
          
          // Respectful delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (pageError) {
          console.error(`   ❌ Error fetching page ${page + 1}:`, pageError.message);
          // Continue with next page
        }
      }
      
      // Try different query filters to get more schemes
      await this.tryDifferentFilters();
      
      console.log(`\n🎉 Scraping completed! Collected ${this.allSchemes.size} unique schemes`);
      
      // Save to database
      const result = await this.saveToDatabase();
      
      console.log(`\n🏆 FINAL SCRAPING COMPLETED!`);
      console.log(`🎯 Successfully extracted ${this.allSchemes.size} unique schemes from MyScheme.gov.in`);
      console.log(`📊 Database now contains ${result.finalCount} total schemes!`);
      
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
      
      return result;

    } catch (error) {
      console.error('❌ Final scraping failed:', error.message);
      throw error;
    }
  }

  async makeApiCall(baseUrl, params) {
    try {
      const queryString = new URLSearchParams({
        lang: 'en',
        from: params.from?.toString() || '0',
        size: params.size?.toString() || '10',
        sort: params.sort || '',
        keyword: params.keyword || '',
        q: params.q || '%5B%5D'
      });

      const response = await axios.get(`${baseUrl}?${queryString}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.myscheme.gov.in/search',
          'Origin': 'https://www.myscheme.gov.in',
          'x-api-key': API_KEY // The crucial missing piece!
        },
        timeout: 30000
      });

      if (response.data.status === 'Success') {
        return response.data;
      } else {
        console.error(`API call failed: ${response.data.statusCode} - ${response.data.errorDescription}`);
        return null;
      }

    } catch (error) {
      console.error(`API call error: ${error.message}`);
      return null;
    }
  }

  async tryDifferentFilters() {
    console.log('\n🔍 Trying different filters to get more schemes...');
    
    const filters = [
      // Level filters
      { q: JSON.stringify([{"identifier":"level","value":"Central"}]), name: "Central schemes" },
      { q: JSON.stringify([{"identifier":"level","value":"State"}]), name: "State schemes" },
      
      // Different sorting
      { sort: 'schemename-asc', name: "Alphabetical A-Z" },
      { sort: 'schemename-desc', name: "Alphabetical Z-A" },
      
      // Keyword searches
      { keyword: 'pradhan', name: "Pradhan schemes" },
      { keyword: 'yojana', name: "Yojana schemes" },
      { keyword: 'agriculture', name: "Agriculture schemes" },
      { keyword: 'health', name: "Health schemes" },
      { keyword: 'education', name: "Education schemes" },
      { keyword: 'employment', name: "Employment schemes" },
    ];

    for (const filter of filters) {
      try {
        console.log(`   🔎 Trying filter: ${filter.name}`);
        
        const response = await this.makeApiCall('https://api.myscheme.gov.in/search/v5/schemes', {
          from: 0,
          size: 100,
          ...filter
        });
        
        if (response && response.data.hits && response.data.hits.items) {
          const schemes = response.data.hits.items;
          console.log(`     ✅ Found ${schemes.length} schemes with filter: ${filter.name}`);
          
          let newSchemes = 0;
          for (const item of schemes) {
            if (this.processSchemeItem(item)) {
              newSchemes++;
            }
          }
          console.log(`     🆕 ${newSchemes} new unique schemes from this filter`);
        }
        
        // Delay between filter requests
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (filterError) {
        console.error(`     ❌ Filter "${filter.name}" failed:`, filterError.message);
      }
    }
  }

  processSchemeItem(item) {
    try {
      const fields = item.fields || item;
      const schemeId = item.id || item._id;
      const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title || fields.scheme_name;
      
      if (schemeName && schemeId) {
        const key = `${schemeId}`;
        if (!this.allSchemes.has(key) && !this.processedIds.has(schemeId)) {
          this.processedIds.add(schemeId);
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
          console.log(`     ✅ New scheme: ${schemeName}`);
          return true; // New scheme added
        }
      }
      return false; // Duplicate or invalid scheme
    } catch (error) {
      console.error('Error processing scheme item:', error);
      return false;
    }
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
          
          // Upsert logic
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
          
          // Progress indicator
          if ((i + 1) % 100 === 0) {
            console.log(`   📈 Processed ${i + 1}/${schemes.length} schemes (${savedCount} saved, ${updatedCount} updated)`);
          }
          
        } catch (schemeError) {
          console.error(`❌ Error saving scheme "${scheme.name}":`, schemeError.message);
          errorCount++;
        }
      }
      
      const finalCount = await Scheme.countDocuments();
      
      console.log(`\n🎉 Database operation completed!`);
      console.log(`📊 Results:`);
      console.log(`   💾 Saved: ${savedCount} new schemes`);
      console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
      console.log(`   ❌ Errors: ${errorCount} failed operations`);
      console.log(`   📈 Total processed: ${schemes.length} schemes`);
      console.log(`   🏛️ Final database count: ${finalCount} schemes`);
      
      return { saved: savedCount, updated: updatedCount, errors: errorCount, total: schemes.length, finalCount };
      
    } catch (error) {
      console.error('❌ Database operation failed:', error.message);
      throw error;
    }
  }
}

async function runFinalScraper() {
  const scraper = new FinalCompleteScraper();
  
  try {
    await scraper.scrapeAllSchemes();
  } catch (error) {
    console.error('❌ Final scraper failed:', error.message);
  }
}

// Run the final scraper
runFinalScraper();