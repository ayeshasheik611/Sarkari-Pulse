import fetch from 'node-fetch';

/**
 * Multi-Scrape Runner
 * Calls the existing scraper API multiple times with different strategies
 */
async function runMultipleScrapes() {
  try {
    console.log('🚀 Starting Multiple Scraping Sessions...');
    console.log('🎯 Strategy: Call existing scraper API multiple times to accumulate schemes');
    console.log('');

    const baseUrl = 'http://localhost:9000/api/myscheme/scrape';
    let totalScraped = 0;
    let totalSaved = 0;
    let totalUpdated = 0;

    // Strategy 1: Multiple regular scrapes (sometimes gets different results)
    console.log('📡 Strategy 1: Multiple regular scrapes...');
    for (let i = 1; i <= 5; i++) {
      try {
        console.log(`🔄 Running scrape session ${i}/5...`);
        
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            saveToDb: true,
            notifyClients: false
          })
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Session ${i}: ${result.scraped} scraped, ${result.saved} saved, ${result.updated} updated`);
          totalScraped += result.scraped || 0;
          totalSaved += result.saved || 0;
          totalUpdated += result.updated || 0;
        } else {
          console.log(`❌ Session ${i} failed: ${result.message}`);
        }

        // Wait between scrapes to avoid rate limiting
        if (i < 5) {
          console.log('⏳ Waiting 30 seconds before next scrape...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }

      } catch (error) {
        console.error(`❌ Error in session ${i}:`, error.message);
      }
    }

    // Get current total
    console.log('');
    console.log('📊 Checking current database status...');
    
    try {
      const statusResponse = await fetch('http://localhost:9000/api/myscheme/bulk-status');
      const statusResult = await statusResponse.json();
      
      if (statusResult.success) {
        const currentTotal = statusResult.status.totalSchemes;
        console.log(`📈 Current total schemes in database: ${currentTotal}`);
        console.log(`🎯 Progress: ${Math.round((currentTotal / 3850) * 100)}% of target (3,850 schemes)`);
        
        if (currentTotal > 100) {
          console.log('🎉 SUCCESS: Significant progress made!');
        } else if (currentTotal > 50) {
          console.log('✅ GOOD: Making progress');
        } else {
          console.log('⚠️ LIMITED: Need different approach');
        }
      }
    } catch (error) {
      console.error('❌ Error checking status:', error.message);
    }

    console.log('');
    console.log('🎉 MULTI-SCRAPE SESSION COMPLETED!');
    console.log('===================================');
    console.log(`📊 Total across all sessions:`);
    console.log(`   - Scraped: ${totalScraped}`);
    console.log(`   - Saved: ${totalSaved}`);
    console.log(`   - Updated: ${totalUpdated}`);
    console.log('');

  } catch (error) {
    console.error('❌ Multi-scrape failed:', error.message);
  }
}

// Run the multi-scraper
runMultipleScrapes();