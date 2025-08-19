import axios from 'axios';

async function testScrapeAndSave() {
  try {
    console.log('🧪 Testing scrape and save endpoint...');
    
    const response = await axios.post('http://localhost:9000/api/myscheme/scrape', {
      saveToDb: true,
      notifyClients: true
    });
    
    console.log('✅ Scrape and save result:');
    console.log(`📊 Scraped: ${response.data.scraped}`);
    console.log(`💾 Saved: ${response.data.saved}`);
    console.log(`🔄 Updated: ${response.data.updated}`);
    console.log(`❌ Errors: ${response.data.errors}`);
    
    if (response.data.schemes && response.data.schemes.length > 0) {
      console.log(`\n📋 Sample schemes:`);
      response.data.schemes.slice(0, 3).forEach((scheme, index) => {
        console.log(`${index + 1}. ${scheme.name} (${scheme.ministry})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Scrape and save failed:', error.response?.data || error.message);
  }
}

testScrapeAndSave();