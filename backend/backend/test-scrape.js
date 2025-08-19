import axios from 'axios';

async function testScrape() {
  try {
    console.log('🧪 Testing scrape endpoint...');
    
    const response = await axios.post('http://localhost:9000/api/myscheme/scrape', {
      saveToDb: true,
      notifyClients: true
    });
    
    console.log('✅ Scrape test result:', response.data);
  } catch (error) {
    console.error('❌ Scrape test failed:', error.message);
  }
}

testScrape();