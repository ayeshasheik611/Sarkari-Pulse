import MySchemeScraperService from './scraper/myscheme_scraper.js';

async function debugScraper() {
  const scraper = new MySchemeScraperService();
  
  try {
    console.log('🔍 Starting debug scraper...');
    
    await scraper.initialize();
    
    // Navigate to the page
    await scraper.page.goto('https://www.myscheme.gov.in/search', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for content to load
    await scraper.page.waitForTimeout(5000);
    
    // Try to trigger more data loading
    await scraper.triggerDataLoad();
    await scraper.page.waitForTimeout(3000);
    
    console.log(`\n📡 Captured ${scraper.capturedApiData.length} API responses:`);
    
    // Debug each captured response
    for (let i = 0; i < scraper.capturedApiData.length; i++) {
      const capture = scraper.capturedApiData[i];
      console.log(`\n--- Response ${i + 1} ---`);
      console.log(`🔗 URL: ${capture.url}`);
      console.log(`📋 Data keys:`, Object.keys(capture.data || {}));
      console.log(`📊 Data type:`, typeof capture.data);
      console.log(`📄 Data sample:`, JSON.stringify(capture.data, null, 2).substring(0, 2000));
      
      if (capture.data && typeof capture.data === 'object') {
        // Check for common scheme data patterns
        const possibleArrays = [];
        
        // Deep search for arrays
        function findArrays(obj, path = '') {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (Array.isArray(value)) {
              possibleArrays.push({ 
                path: currentPath, 
                length: value.length, 
                sample: value[0] ? JSON.stringify(value[0]).substring(0, 200) : 'empty'
              });
            } else if (value && typeof value === 'object') {
              findArrays(value, currentPath);
            }
          }
        }
        
        findArrays(capture.data);
        
        if (possibleArrays.length > 0) {
          console.log(`🎯 Found arrays:`, possibleArrays);
        }
        
        // Specifically check for results
        if (capture.data.data && capture.data.data.results) {
          console.log(`🎯 Found results array with ${capture.data.data.results.length} items`);
          if (capture.data.data.results.length > 0) {
            console.log(`📋 First result sample:`, JSON.stringify(capture.data.data.results[0], null, 2));
          }
        }
      }
    }
    
    await scraper.close();
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    await scraper.close();
  }
}

debugScraper();