import fetch from 'node-fetch';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Simple Bulk Scraper using direct API calls
 */
async function simpleBulkScrape() {
  try {
    console.log('🚀 Starting Simple Bulk MyScheme scraping...');
    console.log('🎯 Target: Extract maximum schemes using direct API calls');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    const extractedSchemes = new Map();
    let totalApiCalls = 0;
    let successfulCalls = 0;
    
    // Strategy 1: Large pagination
    console.log('📡 Strategy 1: Large pagination...');
    
    for (let page = 0; page < 100; page++) {
      const from = page * 100;
      const apiUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=&sort=&from=${from}&size=100`;
      
      try {
        console.log(`📄 Fetching page ${page + 1} (from=${from})`);
        
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.myscheme.gov.in/'
          }
        });
        
        totalApiCalls++;
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.data && data.data.hits && data.data.hits.items) {
            const schemes = data.data.hits.items;
            console.log(`✅ Found ${schemes.length} schemes on page ${page + 1}`);
            
            if (schemes.length === 0) {
              console.log('📄 Empty page reached, stopping pagination');
              break;
            }
            
            // Process schemes
            for (const item of schemes) {
              const fields = item.fields || item;
              const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
              
              if (schemeName && schemeName.trim().length > 3) {
                const key = schemeName.toLowerCase().trim();
                
                if (!extractedSchemes.has(key)) {
                  extractedSchemes.set(key, {
                    name: schemeName.trim(),
                    description: fields.schemeDescription || fields.description || '',
                    ministry: fields.nodalMinistryName || fields.sponsoringMinistry || fields.ministry || '',
                    department: fields.sponsoringDepartment || fields.department || '',
                    targetAudience: fields.schemeFor || fields.beneficiaryType || '',
                    sector: Array.isArray(fields.schemeCategory) ? fields.schemeCategory.join(', ') : (fields.schemeCategory || ''),
                    level: fields.level || '',
                    beneficiaryState: Array.isArray(fields.beneficiaryState) ? fields.beneficiaryState.join(', ') : (fields.beneficiaryState || ''),
                    schemeId: item.id || item._id || '',
                    source: 'simple-bulk-api',
                    sourceUrl: apiUrl,
                    scrapedAt: new Date(),
                    isActive: true
                  });
                }
              }
            }
            
            successfulCalls++;
          }
        } else {
          console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error on page ${page + 1}:`, error.message);
      }
    }
    
    // Strategy 2: Search by common terms
    console.log('🔍 Strategy 2: Search by common terms...');
    
    const searchTerms = [
      'pradhan mantri', 'pm', 'yojana', 'scheme', 'scholarship', 'pension',
      'health', 'education', 'agriculture', 'employment', 'housing', 'insurance'
    ];
    
    for (const term of searchTerms) {
      try {
        console.log(`🔍 Searching for: "${term}"`);
        
        const searchUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=${encodeURIComponent(term)}&sort=&from=0&size=100`;
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.myscheme.gov.in/'
          }
        });
        
        totalApiCalls++;
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.data && data.data.hits && data.data.hits.items) {
            const schemes = data.data.hits.items;
            console.log(`✅ Found ${schemes.length} schemes for "${term}"`);
            
            // Process schemes (same logic as above)
            for (const item of schemes) {
              const fields = item.fields || item;
              const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
              
              if (schemeName && schemeName.trim().length > 3) {
                const key = schemeName.toLowerCase().trim();
                
                if (!extractedSchemes.has(key)) {
                  extractedSchemes.set(key, {
                    name: schemeName.trim(),
                    description: fields.schemeDescription || fields.description || '',
                    ministry: fields.nodalMinistryName || fields.sponsoringMinistry || fields.ministry || '',
                    department: fields.sponsoringDepartment || fields.department || '',
                    targetAudience: fields.schemeFor || fields.beneficiaryType || '',
                    sector: Array.isArray(fields.schemeCategory) ? fields.schemeCategory.join(', ') : (fields.schemeCategory || ''),
                    level: fields.level || '',
                    beneficiaryState: Array.isArray(fields.beneficiaryState) ? fields.beneficiaryState.join(', ') : (fields.beneficiaryState || ''),
                    schemeId: item.id || item._id || '',
                    source: 'simple-bulk-search',
                    sourceUrl: searchUrl,
                    scrapedAt: new Date(),
                    isActive: true
                  });
                }
              }
            }
            
            successfulCalls++;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`❌ Error searching for "${term}":`, error.message);
      }
    }
    
    const schemes = Array.from(extractedSchemes.values());
    console.log(`🎉 Simple bulk scraping completed: ${schemes.length} unique schemes extracted`);
    
    // Save to database
    console.log('💾 Saving schemes to database...');
    
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
    
    console.log('');
    console.log('🎉 SIMPLE BULK SCRAPING COMPLETED!');
    console.log('===================================');
    console.log(`✅ Total unique schemes: ${schemes.length}`);
    console.log(`💾 Saved to database: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
    console.log(`📡 API calls made: ${totalApiCalls}`);
    console.log(`✅ Successful calls: ${successfulCalls}`);
    console.log(`📊 Success rate: ${Math.round((successfulCalls / totalApiCalls) * 100)}%`);
    
    if (schemes.length >= 1000) {
      console.log('🎯 EXCELLENT: Extracted 1,000+ schemes!');
    } else if (schemes.length >= 500) {
      console.log('✅ GOOD: Extracted 500+ schemes');
    } else if (schemes.length >= 100) {
      console.log('👍 DECENT: Extracted 100+ schemes');
    } else {
      console.log('⚠️ Limited extraction: ' + schemes.length + ' schemes');
    }
    
  } catch (error) {
    console.error('❌ Simple bulk scraping failed:', error.message);
    console.error(error.stack);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
    
    console.log('🏁 Simple bulk scraping process finished');
    process.exit(0);
  }
}

// Run the scraper
simpleBulkScrape();