import axios from 'axios';

async function getMoreSchemes() {
  try {
    console.log('🚀 Getting more schemes by running multiple scraping sessions...');
    
    const totalRuns = 5; // Run scraper 5 times to get different batches
    let totalScraped = 0;
    let totalSaved = 0;
    let totalUpdated = 0;
    
    for (let run = 1; run <= totalRuns; run++) {
      console.log(`\n🔄 Running scraping session ${run}/${totalRuns}...`);
      
      try {
        const response = await axios.post('http://localhost:9000/api/myscheme/scrape', {
          saveToDb: true,
          notifyClients: false
        }, {
          timeout: 60000 // 60 second timeout
        });
        
        if (response.data.success) {
          console.log(`✅ Session ${run} completed:`);
          console.log(`   📊 Scraped: ${response.data.scraped}`);
          console.log(`   💾 Saved: ${response.data.saved}`);
          console.log(`   🔄 Updated: ${response.data.updated}`);
          
          totalScraped += response.data.scraped;
          totalSaved += response.data.saved;
          totalUpdated += response.data.updated;
        } else {
          console.log(`❌ Session ${run} failed: ${response.data.message}`);
        }
        
        // Wait between runs to avoid overwhelming the server
        if (run < totalRuns) {
          console.log('⏳ Waiting 10 seconds before next run...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
      } catch (runError) {
        console.error(`❌ Session ${run} error:`, runError.message);
      }
    }
    
    console.log(`\n🎉 All scraping sessions completed!`);
    console.log(`📊 Total Results:`);
    console.log(`   📊 Total Scraped: ${totalScraped}`);
    console.log(`   💾 Total Saved: ${totalSaved}`);
    console.log(`   🔄 Total Updated: ${totalUpdated}`);
    
    // Get final stats
    console.log('\n📈 Getting final database stats...');
    const statsResponse = await axios.get('http://localhost:9000/api/myscheme/stats');
    if (statsResponse.data.success) {
      const stats = statsResponse.data.stats;
      console.log(`✅ Database now contains:`);
      console.log(`   🏛️ Total Schemes: ${stats.totalSchemes}`);
      console.log(`   🏢 Total Ministries: ${stats.totalMinistries}`);
      console.log(`   📂 Total Sectors: ${stats.totalSectors}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to get more schemes:', error.message);
  }
}

getMoreSchemes();