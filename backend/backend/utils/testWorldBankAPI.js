import fetch from 'node-fetch';

/**
 * Test World Bank API Integration
 * Quick test to verify API connectivity and data structure
 */
async function testWorldBankAPI() {
  console.log('🧪 Testing World Bank API Integration...');
  console.log('=====================================');
  console.log('');

  const tests = [
    {
      name: 'Countries API',
      url: 'https://api.worldbank.org/v2/country?format=json&per_page=10',
      description: 'Test countries endpoint'
    },
    {
      name: 'GDP Data for India',
      url: 'https://api.worldbank.org/v2/country/IN/indicator/NY.GDP.MKTP.CD?format=json&per_page=5&date=2020:2023',
      description: 'Test GDP indicator for India'
    },
    {
      name: 'Population Data for US',
      url: 'https://api.worldbank.org/v2/country/US/indicator/SP.POP.TOTL?format=json&per_page=5&date=2020:2023',
      description: 'Test population indicator for US'
    },
    {
      name: 'Life Expectancy for China',
      url: 'https://api.worldbank.org/v2/country/CN/indicator/SP.DYN.LE00.IN?format=json&per_page=5&date=2020:2023',
      description: 'Test health indicator for China'
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url);
      
      if (!response.ok) {
        console.log(`   ❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length < 2) {
        console.log(`   ❌ Invalid response structure`);
        continue;
      }
      
      const metadata = data[0];
      const results = data[1];
      
      console.log(`   ✅ Success: ${response.status}`);
      console.log(`   📊 Results: ${results ? results.length : 0} items`);
      
      if (results && results.length > 0) {
        const sample = results[0];
        if (test.name.includes('Countries')) {
          console.log(`   📋 Sample: ${sample.name} (${sample.id})`);
        } else {
          console.log(`   📋 Sample: ${sample.country?.value} ${sample.date} = ${sample.value}`);
        }
      }
      
      passedTests++;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('📊 TEST RESULTS');
  console.log('===============');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ World Bank API is accessible and working correctly');
    console.log('✅ Data structure is as expected');
    console.log('✅ Ready to proceed with data loading');
  } else if (passedTests > 0) {
    console.log('⚠️ PARTIAL SUCCESS');
    console.log('✅ World Bank API is accessible');
    console.log('⚠️ Some endpoints may have issues');
    console.log('💡 Consider checking network connectivity or API limits');
  } else {
    console.log('❌ ALL TESTS FAILED');
    console.log('❌ World Bank API may be inaccessible');
    console.log('💡 Check internet connection and API availability');
  }

  console.log('');
  console.log('🔗 Next Steps:');
  console.log('1. Run: node backend/utils/worldBankInitialLoader.js');
  console.log('2. Start server: node backend/server.js');
  console.log('3. Visit: http://localhost:9000/worldbank-dashboard.html');
  console.log('');
}

// Run the test
testWorldBankAPI().then(() => {
  console.log('🏁 World Bank API test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});