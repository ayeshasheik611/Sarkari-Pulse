import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Direct Pagination Scraper
 * Makes direct API calls and processes responses immediately
 */
async function directPaginationScraper() {
  let browser = null;
  let page = null;
  
  try {
    console.log('🚀 Starting Direct Pagination MyScheme scraping...');
    console.log('🎯 Target: Extract schemes using direct API pagination');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.myscheme.gov.in/'
    });

    console.log('✅ Browser initialized');

    // First, establish session by visiting the main site
    console.log('🔗 Establishing session...');
    await page.goto('https://www.myscheme.gov.in/search', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    console.log('✅ Session established');

    const extractedSchemes = new Map();
    let totalProcessed = 0;
    let successfulPages = 0;
    let errors = 0;

    // Now make paginated API calls
    const totalPages = 77; // 3850 / 50 = 77 pages
    const pageSize = 50;

    console.log(`📄 Starting pagination: ${totalPages} pages with ${pageSize} schemes each`);
    console.log('');

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      try {
        const from = pageNum * pageSize;
        const apiUrl = `https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=[]&keyword=&sort=&from=${from}&size=${pageSize}`;
        
        console.log(`📄 Page ${pageNum + 1}/${totalPages} (from=${from}, size=${pageSize})`);
        
        // Navigate to API URL
        const response = await page.goto(apiUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        if (response.ok()) {
          // Get the JSON response
          const content = await page.textContent('body');
          
          try {
            const data = JSON.parse(content);
            
            if (data.data && data.data.hits && data.data.hits.items) {
              const schemes = data.data.hits.items;
              console.log(`   ✅ Found ${schemes.length} schemes`);
              
              if (schemes.length === 0) {
                console.log('   📄 Empty page reached, stopping pagination');
                break;
              }
              
              // Process schemes immediately
              for (const item of schemes) {
                try {
                  const fields = item.fields || item;
                  const schemeId = item.id || item._id || '';
                  
                  const schemeName = fields.schemeName || fields.schemeShortTitle || fields.name || fields.title;
                  
                  if (schemeName && schemeName.trim().length > 3) {
                    const key = schemeName.toLowerCase().trim();
                    
                    if (!extractedSchemes.has(key)) {
                      const schemeData = {
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
                        source: 'direct-pagination',
                        sourceUrl: apiUrl,
                        scrapedAt: new Date(),
                        isActive: true
                      };
                      
                      extractedSchemes.set(key, schemeData);
                      totalProcessed++;
                    }
                  }
                } catch (schemeError) {
                  console.error(`   ❌ Error processing scheme:`, schemeError.message);
                }
              }
              
              successfulPages++;
            } else {
              console.log(`   ⚠️ No schemes found in response`);
            }
          } catch (parseError) {
            console.error(`   ❌ Error parsing JSON:`, parseError.message);
            errors++;
          }
        } else {
          console.log(`   ❌ API call failed: ${response.status()} ${response.statusText()}`);
          errors++;
          
          // If rate limited, wait longer
          if (response.status() === 429) {
            console.log('   ⏳ Rate limited, waiting 10 seconds...');
            await page.waitForTimeout(10000);
          }
        }
        
        // Progressive delay
        const delay = Math.min(500 + (pageNum * 25), 3000);
        await page.waitForTimeout(delay);
        
        // Progress update every 10 pages
        if ((pageNum + 1) % 10 === 0) {
          console.log(`   📊 Progress: ${pageNum + 1}/${totalPages} pages, ${extractedSchemes.size} unique schemes`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error on page ${pageNum + 1}:`, error.message);
        errors++;
        await page.waitForTimeout(2000);
      }
    }

    const schemes = Array.from(extractedSchemes.values());
    
    console.log('');
    console.log('💾 Saving schemes to database...');
    
    let savedCount = 0;
    let updatedCount = 0;
    let saveErrors = 0;

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
        saveErrors++;
      }
    }

    console.log('');
    console.log('🎉 DIRECT PAGINATION SCRAPING COMPLETED!');
    console.log('=========================================');
    console.log(`✅ Total unique schemes extracted: ${schemes.length}`);
    console.log(`💾 Database results: ${savedCount} new, ${updatedCount} updated, ${saveErrors} errors`);
    console.log(`📄 Pages processed: ${successfulPages}/${totalPages}`);
    console.log(`📊 Success rate: ${Math.round((successfulPages / totalPages) * 100)}%`);
    console.log(`❌ Errors encountered: ${errors}`);
    console.log('');

    if (schemes.length >= 3000) {
      console.log('🎯 EXCELLENT: Extracted 3,000+ schemes - nearly complete database!');
    } else if (schemes.length >= 1000) {
      console.log('✅ GREAT: Extracted 1,000+ schemes - major progress!');
    } else if (schemes.length >= 500) {
      console.log('👍 GOOD: Extracted 500+ schemes - solid progress');
    } else if (schemes.length >= 100) {
      console.log('📈 PROGRESS: Extracted 100+ schemes');
    } else {
      console.log('⚠️ LIMITED: Only extracted ' + schemes.length + ' schemes');
    }

  } catch (error) {
    console.error('❌ Direct pagination scraping failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
    
    console.log('🏁 Direct pagination scraping finished');
    process.exit(0);
  }
}

// Run the scraper
directPaginationScraper();