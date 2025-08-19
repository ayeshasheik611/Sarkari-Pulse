import MySchemeScraperService from './scraper/myscheme_scraper.js';
import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

async function massScrapingSession() {
  try {
    console.log('🚀 Starting mass scraping session to extract maximum schemes...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    let totalScraped = 0;
    let totalSaved = 0;
    let totalUpdated = 0;
    let uniqueSchemes = new Set();
    
    // Strategy: Run scraper many times with delays to get different batches
    const maxRuns = 50; // Run 50 times to try to get different scheme batches
    const delayBetweenRuns = 5000; // 5 seconds between runs
    
    console.log(`📊 Will run ${maxRuns} scraping sessions with ${delayBetweenRuns/1000}s delays`);
    console.log('🎯 Goal: Extract as many unique schemes as possible');
    
    for (let run = 1; run <= maxRuns; run++) {
      console.log(`\n🔄 === Scraping Session ${run}/${maxRuns} ===`);
      
      const scraper = new MySchemeScraperService();
      
      try {
        await scraper.initialize();
        
        // Add some randomization to potentially get different results
        await scraper.page.goto('https://www.myscheme.gov.in/search', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        // Random wait time to potentially hit different server states
        const randomWait = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
        await scraper.page.waitForTimeout(randomWait);
        
        // Try different interactions
        const interactions = [
          // Scroll to different positions
          async () => {
            const scrollAmount = Math.floor(Math.random() * 2000) + 500;
            await scraper.page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
            await scraper.page.waitForTimeout(1000);
          },
          // Click random elements
          async () => {
            try {
              const buttons = await scraper.page.$$('button, .btn, a');
              if (buttons.length > 0) {
                const randomButton = buttons[Math.floor(Math.random() * Math.min(buttons.length, 3))];
                await randomButton.click();
                await scraper.page.waitForTimeout(2000);
              }
            } catch (e) {
              // Ignore click errors
            }
          },
          // Refresh the page
          async () => {
            await scraper.page.reload({ waitUntil: 'networkidle' });
            await scraper.page.waitForTimeout(2000);
          }
        ];
        
        // Execute random interaction
        const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];
        await randomInteraction();
        
        // Trigger data load
        await scraper.triggerDataLoad();
        await scraper.page.waitForTimeout(3000);
        
        // Extract schemes
        const schemes = scraper.extractFromApiData();
        console.log(`   📊 Found ${schemes.length} schemes in session ${run}`);
        
        // Count unique schemes
        let newSchemesInThisRun = 0;
        for (const scheme of schemes) {
          const schemeKey = `${scheme.name}_${scheme.ministry}`;
          if (!uniqueSchemes.has(schemeKey)) {
            uniqueSchemes.add(schemeKey);
            newSchemesInThisRun++;
          }
        }
        
        console.log(`   🆕 New unique schemes in this run: ${newSchemesInThisRun}`);
        console.log(`   📈 Total unique schemes so far: ${uniqueSchemes.size}`);
        
        // Save schemes to database
        let sessionSaved = 0;
        let sessionUpdated = 0;
        
        for (const scheme of schemes) {
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
              sessionUpdated++;
            } else {
              await Scheme.create({
                ...schemeData,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              sessionSaved++;
            }
          } catch (schemeError) {
            console.error(`   ❌ Error saving scheme:`, schemeError.message);
          }
        }
        
        totalScraped += schemes.length;
        totalSaved += sessionSaved;
        totalUpdated += sessionUpdated;
        
        console.log(`   💾 Session ${run}: ${sessionSaved} saved, ${sessionUpdated} updated`);
        
        await scraper.close();
        
        // If we haven't found new schemes in the last few runs, we might have hit the limit
        if (run > 10 && newSchemesInThisRun === 0 && run % 5 === 0) {
          console.log(`   ⚠️ No new schemes found in recent runs. Continuing but may have reached limit.`);
        }
        
        // Delay between runs
        if (run < maxRuns) {
          console.log(`   ⏳ Waiting ${delayBetweenRuns/1000}s before next session...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenRuns));
        }
        
      } catch (runError) {
        console.error(`   ❌ Session ${run} failed:`, runError.message);
        await scraper.close();
      }
    }
    
    // Final statistics
    console.log(`\n🎉 MASS SCRAPING COMPLETED!`);
    console.log(`📊 Final Results:`);
    console.log(`   🔄 Total sessions run: ${maxRuns}`);
    console.log(`   📊 Total schemes scraped: ${totalScraped}`);
    console.log(`   🆕 Unique schemes found: ${uniqueSchemes.size}`);
    console.log(`   💾 New schemes saved: ${totalSaved}`);
    console.log(`   🔄 Existing schemes updated: ${totalUpdated}`);
    
    // Get final database count
    const finalCount = await Scheme.countDocuments();
    console.log(`   🏛️ Total schemes in database: ${finalCount}`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Mass scraping failed:', error.message);
  }
}

// Run the mass scraper
massScrapingSession();