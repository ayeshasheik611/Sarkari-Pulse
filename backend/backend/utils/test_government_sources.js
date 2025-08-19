import fetch from 'node-fetch';

/**
 * Test Government Sources
 * Quick test of major government scheme portals
 */
async function testGovernmentSources() {
  console.log('🔍 Testing Alternative Government Scheme Sources...');
  console.log('==================================================');
  console.log('');

  const sources = [
    {
      name: 'India.gov.in Portal',
      url: 'https://www.india.gov.in/',
      testUrl: 'https://www.india.gov.in/topics/social-welfare-schemes',
      description: 'Official India portal - Social welfare schemes section'
    },
    {
      name: 'DBT Bharat Portal',
      url: 'https://dbtbharat.gov.in/',
      testUrl: 'https://dbtbharat.gov.in/data/scheme',
      description: 'Direct Benefit Transfer schemes database'
    },
    {
      name: 'Digital India Portal',
      url: 'https://digitalindia.gov.in/',
      testUrl: 'https://digitalindia.gov.in/content/programmes',
      description: 'Digital India initiatives and schemes'
    },
    {
      name: 'National Scholarship Portal',
      url: 'https://scholarships.gov.in/',
      testUrl: 'https://scholarships.gov.in/fresh/schemesList',
      description: 'Comprehensive scholarship schemes database'
    },
    {
      name: 'Jansuraksha Portal',
      url: 'https://www.jansuraksha.gov.in/',
      testUrl: 'https://www.jansuraksha.gov.in/schemes-page.aspx',
      description: 'Social security schemes'
    },
    {
      name: 'PM India Portal',
      url: 'https://www.pmindia.gov.in/',
      testUrl: 'https://www.pmindia.gov.in/en/government_schemes/',
      description: 'Prime Minister office schemes'
    }
  ];

  const results = [];

  for (const source of sources) {
    console.log(`🔍 Testing: ${source.name}`);
    console.log(`   URL: ${source.testUrl}`);
    
    try {
      const response = await fetch(source.testUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 15000
      });

      const result = {
        name: source.name,
        url: source.testUrl,
        description: source.description,
        status: response.status,
        accessible: response.ok,
        contentType: response.headers.get('content-type') || 'unknown',
        size: response.headers.get('content-length') || 'unknown'
      };

      if (response.ok) {
        console.log(`   ✅ Status: ${response.status} - Accessible`);
        console.log(`   📄 Content-Type: ${result.contentType}`);
        
        // Try to get a sample of the content
        try {
          const content = await response.text();
          const contentLower = content.toLowerCase();
          
          // Count scheme-related keywords
          const schemeKeywords = ['scheme', 'yojana', 'program', 'benefit', 'scholarship'];
          const keywordCounts = schemeKeywords.map(keyword => ({
            keyword,
            count: (contentLower.match(new RegExp(keyword, 'g')) || []).length
          }));
          
          result.keywordAnalysis = keywordCounts;
          result.hasSchemeContent = keywordCounts.some(k => k.count > 5);
          result.contentLength = content.length;
          
          console.log(`   📊 Content length: ${content.length} characters`);
          console.log(`   🔍 Scheme keywords found:`);
          keywordCounts.forEach(k => {
            if (k.count > 0) {
              console.log(`      - ${k.keyword}: ${k.count} occurrences`);
            }
          });
          
          if (result.hasSchemeContent) {
            console.log(`   🎯 VIABLE: Contains significant scheme content`);
          } else {
            console.log(`   ⚠️ LIMITED: Low scheme content detected`);
          }
          
        } catch (contentError) {
          console.log(`   ⚠️ Could not analyze content: ${contentError.message}`);
          result.contentError = contentError.message;
        }
        
      } else {
        console.log(`   ❌ Status: ${response.status} - ${response.statusText}`);
        result.error = response.statusText;
      }

      results.push(result);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        name: source.name,
        url: source.testUrl,
        description: source.description,
        accessible: false,
        error: error.message
      });
    }
    
    console.log('');
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate summary report
  console.log('📊 SUMMARY REPORT');
  console.log('=================');
  console.log('');

  const accessible = results.filter(r => r.accessible);
  const withSchemeContent = results.filter(r => r.hasSchemeContent);

  console.log(`📈 Statistics:`);
  console.log(`   Total sources tested: ${results.length}`);
  console.log(`   Accessible sources: ${accessible.length}`);
  console.log(`   Sources with scheme content: ${withSchemeContent.length}`);
  console.log('');

  if (withSchemeContent.length > 0) {
    console.log(`🎯 VIABLE SOURCES FOR SCRAPING:`);
    withSchemeContent.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name}`);
      console.log(`   URL: ${source.url}`);
      console.log(`   Description: ${source.description}`);
      console.log(`   Content size: ${source.contentLength} characters`);
      console.log(`   Top keywords: ${source.keywordAnalysis?.filter(k => k.count > 0).map(k => `${k.keyword}(${k.count})`).join(', ')}`);
      console.log('');
    });
  }

  if (accessible.length > withSchemeContent.length) {
    console.log(`📋 OTHER ACCESSIBLE SOURCES:`);
    accessible.filter(r => !r.hasSchemeContent).forEach((source, index) => {
      console.log(`${index + 1}. ${source.name} - ${source.url}`);
    });
    console.log('');
  }

  console.log(`💡 NEXT STEPS:`);
  if (withSchemeContent.length > 0) {
    console.log(`1. Create dedicated scrapers for the ${withSchemeContent.length} viable sources`);
    console.log(`2. Implement structured data extraction for each source`);
    console.log(`3. Set up automated data collection pipeline`);
    console.log(`4. Combine data from multiple sources for comprehensive coverage`);
  } else {
    console.log(`1. Investigate API endpoints for accessible sources`);
    console.log(`2. Try alternative URLs or search functionality`);
    console.log(`3. Consider ministry-specific portals`);
    console.log(`4. Explore state government scheme portals`);
  }
  
  return results;
}

// Run the test
testGovernmentSources().then(results => {
  console.log('✅ Analysis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error.message);
  process.exit(1);
});