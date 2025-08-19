import MySchemeScraperService from './scraper/myscheme_scraper.js';

async function testExtraction() {
  const scraper = new MySchemeScraperService();
  
  try {
    console.log('🔍 Testing scheme extraction...');
    
    await scraper.initialize();
    const schemes = await scraper.scrapeSchemes();
    
    console.log(`\n✅ Extraction completed!`);
    console.log(`📊 Total schemes found: ${schemes.length}`);
    
    if (schemes.length > 0) {
      console.log(`\n📋 First few schemes:`);
      schemes.slice(0, 3).forEach((scheme, index) => {
        console.log(`\n--- Scheme ${index + 1} ---`);
        console.log(`Name: ${scheme.name}`);
        console.log(`Ministry: ${scheme.ministry}`);
        console.log(`Target: ${scheme.targetAudience}`);
        console.log(`Level: ${scheme.level}`);
        console.log(`State: ${scheme.beneficiaryState}`);
        console.log(`Category: ${scheme.sector}`);
      });
    }
    
    await scraper.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await scraper.close();
  }
}

testExtraction();