import axios from 'axios';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

async function bulkScrapeAllSchemes() {
  try {
    console.log('🚀 Starting bulk scrape of all MyScheme schemes...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const baseUrl = 'https://api.myscheme.gov.in/search/v5/schemes';
    const pageSize = 50; // Increase page size for efficiency
    let currentPage = 0;
    let totalSchemes = 0;
    let allSchemes = [];
    
    // First, get the total count
    console.log('📊 Getting total scheme count...');
    const firstResponse = await axios.get(`${baseUrl}?lang=en&q=%5B%5D&keyword=&sort=&from=0&size=1`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.myscheme.gov.in/search'
      }
    });
    
    if (firstResponse.data.status === 'Success') {
      totalSchemes = firstResponse.data.data.summary.total;
      console.log(`📈 Total schemes available: ${totalSchemes}`);
    } else {
      throw new Error('Failed to get scheme count');
    }
    
    // Calculate total pages needed
    const totalPages = Math.ceil(totalSchemes / pageSize);
    console.log(`📄 Total pages to fetch: ${totalPages}`);
    
    // Fetch all pages
    for (let page = 0; page < totalPages; page++) {
      const from = page * pageSize;
      console.log(`📥 Fetching page ${page + 1}/${totalPages} (records ${from}-${from + pageSize - 1})`);
      
      try {
        const response = await axios.get(`${baseUrl}?lang=en&q=%5B%5D&keyword=&sort=&from=${from}&size=${pageSize}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.myscheme.gov.in/search'
          },
          timeout: 30000
        });
        
        if (response.data.status === 'Success' && response.data.data.hits && response.data.data.hits.items) {
          const schemes = response.data.data.hits.items;
          console.log(`   ✅ Got ${schemes.length} schemes from page ${page + 1}`);
          allSchemes.push(...schemes);
        } else {
          console.log(`   ⚠️ No schemes found on page ${page + 1}`);
        }
        
        // Add delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (pageError) {
        console.error(`   ❌ Error fetching page ${page + 1}:`, pageError.message);
        // Continue with next page
      }
    }
    
    console.log(`\n📊 Total schemes fetched: ${allSchemes.length}`);
    
    // Process and save schemes
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    console.log('💾 Processing and saving schemes to database...');
    
    for (let i = 0; i < allSchemes.length; i++) {
      const item = allSchemes[i];
      const fields = item.fields || item;
      const schemeId = item.id || item._id;
      
      try {
        // Extract scheme name from various possible fields
        const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title || fields.scheme_name;
        
        if (schemeName) {
          const schemeData = {
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
            sourceUrl: baseUrl,
            scrapedAt: new Date(),
            isActive: true
          };
          
          // Check if scheme already exists (by name or schemeId)
          const existingScheme = await Scheme.findOne({ 
            $or: [
              { name: { $regex: `^${schemeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
              { schemeId: schemeId }
            ]
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
          
          // Progress indicator
          if ((i + 1) % 100 === 0) {
            console.log(`   📈 Processed ${i + 1}/${allSchemes.length} schemes (${savedCount} saved, ${updatedCount} updated)`);
          }
        }
      } catch (schemeError) {
        console.error(`❌ Error processing scheme ${i + 1}:`, schemeError.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Bulk scraping completed!`);
    console.log(`📊 Results:`);
    console.log(`   💾 Saved: ${savedCount} new schemes`);
    console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
    console.log(`   ❌ Errors: ${errorCount} failed operations`);
    console.log(`   📈 Total processed: ${allSchemes.length} schemes`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Bulk scraping failed:', error.message);
    process.exit(1);
  }
}

// Run the bulk scraper
bulkScrapeAllSchemes();