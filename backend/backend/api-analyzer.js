import { chromium } from 'playwright';
import axios from 'axios';

class MySchemeApiAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
    
    // Enable request interception
    await this.page.route('**/*', route => {
      const request = route.request();
      console.log(`🌐 ${request.method()} ${request.url()}`);
      if (request.url().includes('api.myscheme.gov.in')) {
        console.log(`📡 API Headers:`, request.headers());
        console.log(`📡 API Body:`, request.postData());
      }
      route.continue();
    });
  }

  async analyzeApiStructure() {
    try {
      console.log('🔍 Analyzing MyScheme API structure...');
      
      // Go to the main page and observe network traffic
      await this.page.goto('https://www.myscheme.gov.in/search', {
        waitUntil: 'networkidle'
      });
      
      await this.page.waitForTimeout(5000);
      
      // Try to understand the API by making direct calls with different parameters
      console.log('\n📡 Testing API endpoints directly...');
      
      const baseUrl = 'https://api.myscheme.gov.in/search/v5/schemes';
      const testParams = [
        // Test different pagination
        { from: 0, size: 10 },
        { from: 10, size: 10 },
        { from: 20, size: 10 },
        { from: 0, size: 50 },
        { from: 0, size: 100 },
        
        // Test different query parameters
        { from: 0, size: 10, q: '[]' },
        { from: 0, size: 10, q: '[{"identifier":"level","value":"Central"}]' },
        { from: 0, size: 10, q: '[{"identifier":"level","value":"State"}]' },
        
        // Test different sorting
        { from: 0, size: 10, sort: 'schemename-asc' },
        { from: 0, size: 10, sort: 'schemename-desc' },
        { from: 0, size: 10, sort: 'multiple_sort' },
        
        // Test with keywords
        { from: 0, size: 10, keyword: 'pradhan' },
        { from: 0, size: 10, keyword: 'yojana' },
        { from: 0, size: 10, keyword: 'agriculture' },
      ];
      
      for (let i = 0; i < testParams.length; i++) {
        const params = testParams[i];
        console.log(`\n🧪 Test ${i + 1}/${testParams.length}: ${JSON.stringify(params)}`);
        
        try {
          const queryString = new URLSearchParams({
            lang: 'en',
            from: params.from?.toString() || '0',
            size: params.size?.toString() || '10',
            sort: params.sort || '',
            keyword: params.keyword || '',
            q: params.q || '%5B%5D'
          });
          
          const response = await axios.get(`${baseUrl}?${queryString}`, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.myscheme.gov.in/search',
              'Origin': 'https://www.myscheme.gov.in'
            },
            timeout: 10000
          });
          
          if (response.data.status === 'Success') {
            const data = response.data.data;
            console.log(`   ✅ Success: ${data.summary.total} total, ${data.hits?.items?.length || 0} returned`);
            
            if (data.hits?.items?.length > 0) {
              const firstScheme = data.hits.items[0];
              console.log(`   📋 First scheme: ${firstScheme.fields?.schemeName || firstScheme.fields?.schemeShortTitle || 'Unknown'}`);
              console.log(`   🆔 Scheme ID: ${firstScheme.id}`);
            }
            
            // Check if we got different results
            const schemeIds = data.hits?.items?.map(item => item.id) || [];
            console.log(`   🔢 Scheme IDs: ${schemeIds.slice(0, 3).join(', ')}${schemeIds.length > 3 ? '...' : ''}`);
            
          } else {
            console.log(`   ❌ Failed: ${response.data.statusCode} - ${response.data.errorDescription}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Try to understand facets and filters
      console.log('\n🔍 Analyzing available facets and filters...');
      
      try {
        const facetsResponse = await axios.get('https://api.myscheme.gov.in/search/v5/schemes/facets?lang=en', {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.myscheme.gov.in/search'
          }
        });
        
        if (facetsResponse.data.status === 'Success') {
          console.log('📊 Available facets:');
          const facets = facetsResponse.data.data.facets || [];
          facets.forEach(facet => {
            console.log(`   - ${facet.identifier}: ${facet.label} (${facet.entries?.length || 0} options)`);
            if (facet.entries && facet.entries.length > 0) {
              console.log(`     Top options: ${facet.entries.slice(0, 3).map(e => `${e.label} (${e.count})`).join(', ')}`);
            }
          });
        }
        
      } catch (error) {
        console.log(`❌ Facets request failed: ${error.message}`);
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function runApiAnalysis() {
  const analyzer = new MySchemeApiAnalyzer();
  
  try {
    await analyzer.initialize();
    await analyzer.analyzeApiStructure();
  } catch (error) {
    console.error('❌ API analysis failed:', error.message);
  } finally {
    await analyzer.close();
  }
}

runApiAnalysis();