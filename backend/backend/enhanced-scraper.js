import MySchemeScraperService from './scraper/myscheme_scraper.js';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

async function enhancedScraping() {
  try {
    console.log('🚀 Starting enhanced scraping with multiple strategies...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const scraper = new MySchemeScraperService();
    await scraper.initialize();
    
    let allSchemes = [];
    let uniqueSchemes = new Set();
    
    // Strategy 1: Try different search pages and interactions
    const strategies = [
      { url: 'https://www.myscheme.gov.in/search', name: 'Main Search' },
      { url: 'https://www.myscheme.gov.in/find-scheme', name: 'Find Scheme' },
      { url: 'https://www.myscheme.gov.in/', name: 'Home Page' }
    ];
    
    for (const strategy of strategies) {
      console.log(`\n🔍 Trying strategy: ${strategy.name}`);
      
      try {
        // Navigate to the page
        await scraper.page.goto(strategy.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        await scraper.page.waitForTimeout(3000);
        
        // Try different interactions to trigger more data
        const interactions = [
          // Scroll down multiple times
          async () => {
            for (let i = 0; i < 5; i++) {
              await scraper.page.evaluate(() => window.scrollBy(0, 1000));
              await scraper.page.waitForTimeout(1000);
            }
          },
          // Try clicking various elements
          async () => {
            const clickableElements = [
              'button', '.btn', '.load-more', '.show-more', 
              '.pagination', '.next', '.view-all'
            ];
            
            for (const selector of clickableElements) {
              try {
                const elements = await scraper.page.$$(selector);
                for (const element of elements.slice(0, 3)) { // Try first 3 elements
                  try {
                    await element.click();
                    await scraper.page.waitForTimeout(2000);
                  } catch (e) {
                    // Continue if click fails
                  }
                }
              } catch (e) {
                // Continue if selector not found
              }
            }
          },
          // Try form interactions
          async () => {
            try {
              // Look for search forms and try submitting
              const forms = await scraper.page.$$('form');
              for (const form of forms.slice(0, 2)) {
                try {
                  await form.evaluate(f => f.submit());
                  await scraper.page.waitForTimeout(3000);
                } catch (e) {
                  // Continue if submit fails
                }
              }
            } catch (e) {
              // Continue if no forms found
            }
          }
        ];
        
        // Execute interactions
        for (let i = 0; i < interactions.length; i++) {
          console.log(`   🎯 Executing interaction ${i + 1}/${interactions.length}`);
          try {
            await interactions[i]();
            await scraper.page.waitForTimeout(2000);
          } catch (e) {
            console.log(`   ⚠️ Interaction ${i + 1} failed, continuing...`);
          }
        }
        
        // Extract schemes from this strategy
        const schemes = scraper.extractFromApiData();
        console.log(`   📊 ${strategy.name}: Found ${schemes.length} schemes`);
        
        // Add unique schemes
        for (const scheme of schemes) {
          const schemeKey = `${scheme.name}_${scheme.ministry}`;
          if (!uniqueSchemes.has(schemeKey)) {
            uniqueSchemes.add(schemeKey);
            allSchemes.push(scheme);
          }
        }
        
        // Reset captured data for next strategy
        scraper.capturedApiData = [];
        
      } catch (strategyError) {
        console.error(`   ❌ Strategy ${strategy.name} failed:`, strategyError.message);
      }
    }
    
    console.log(`\n📊 Total unique schemes found: ${allSchemes.length}`);
    
    // Save schemes to database
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const scheme of allSchemes) {
      try {
        const schemeData = {
          name: scheme.name,
          description: scheme.description || '',
          ministry: scheme.ministry || '',
          department: scheme.department || '',
          targetAudience: scheme.targetAudience || '',
          sector: scheme.sector || '',
          launchDate: scheme.launchDate,
          budget: scheme.budget,
          level: scheme.level || '',
          beneficiaryState: scheme.beneficiaryState || '',
          schemeId: scheme.schemeId,
          source: 'api',
          sourceUrl: scheme.sourceUrl,
          scrapedAt: new Date(),
          isActive: true
        };
        
        const existingScheme = await Scheme.findOne({ 
          $or: [
            { name: { $regex: `^${scheme.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
            { schemeId: scheme.schemeId }
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
      } catch (schemeError) {
        console.error(`❌ Error saving scheme:`, schemeError.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Enhanced scraping completed!`);
    console.log(`📊 Results:`);
    console.log(`   💾 Saved: ${savedCount} new schemes`);
    console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
    console.log(`   ❌ Errors: ${errorCount} failed operations`);
    
    await scraper.close();
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Enhanced scraping failed:', error.message);
  }
}

enhancedScraping();