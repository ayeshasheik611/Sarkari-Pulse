import fetch from 'node-fetch';

/**
 * Discover Government Scheme Sources
 * Test main government portals and discover scheme-related pages
 */
async function discoverSchemeSources() {
  console.log('🔍 Discovering Government Scheme Sources...');
  console.log('==========================================');
  console.log('');

  const mainPortals = [
    {
      name: 'India.gov.in',
      baseUrl: 'https://www.india.gov.in',
      description: 'Official India Government Portal'
    },
    {
      name: 'Digital India',
      baseUrl: 'https://www.digitalindia.gov.in',
      description: 'Digital India Initiative Portal'
    },
    {
      name: 'MyGov Portal',
      baseUrl: 'https://www.mygov.in',
      description: 'Citizen Engagement Platform'
    },
    {
      name: 'DBT Bharat',
      baseUrl: 'https://www.dbtbharat.gov.in',
      description: 'Direct Benefit Transfer Portal'
    },
    {
      name: 'National Scholarship Portal',
      baseUrl: 'https://www.scholarships.gov.in',
      description: 'Scholarship Schemes Database'
    },
    {
      name: 'Pradhan Mantri Schemes',
      baseUrl: 'https://pmschemes.gov.in',
      description: 'PM Schemes Dedicated Portal'
    }
  ];

  const results = [];

  for (const portal of mainPortals) {
    console.log(`🔍 Testing: ${portal.name}`);
    console.log(`   Base URL: ${portal.baseUrl}`);
    
    try {
      const response = await fetch(portal.baseUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000,
        redirect: 'follow'
      });

      const result = {
        name: portal.name,
        baseUrl: portal.baseUrl,
        description: portal.description,
        status: response.status,
        accessible: response.ok,
        finalUrl: response.url,
        contentType: response.headers.get('content-type') || 'unknown'
      };

      if (response.ok) {
        console.log(`   ✅ Status: ${response.status} - Accessible`);
        
        if (response.url !== portal.baseUrl) {
          console.log(`   🔄 Redirected to: ${response.url}`);
        }
        
        try {
          const content = await response.text();
          
          // Analyze content for scheme-related information
          const analysis = analyzeContent(content);
          result.analysis = analysis;
          
          console.log(`   📄 Page title: ${analysis.title}`);
          console.log(`   📊 Content size: ${content.length} characters`);
          console.log(`   🔍 Scheme keywords: ${analysis.schemeKeywords} occurrences`);
          console.log(`   🔗 Scheme-related links: ${analysis.schemeLinks.length}`);
          
          if (analysis.schemeLinks.length > 0) {
            console.log(`   📋 Found scheme links:`);
            analysis.schemeLinks.slice(0, 5).forEach(link => {
              console.log(`      - ${link.text}: ${link.href}`);
            });
            if (analysis.schemeLinks.length > 5) {
              console.log(`      ... and ${analysis.schemeLinks.length - 5} more`);
            }
          }
          
          if (analysis.apiEndpoints.length > 0) {
            console.log(`   📡 Potential API endpoints: ${analysis.apiEndpoints.length}`);
            analysis.apiEndpoints.slice(0, 3).forEach(api => {
              console.log(`      - ${api}`);
            });
          }
          
          result.viable = analysis.schemeKeywords > 10 || analysis.schemeLinks.length > 3;
          
          if (result.viable) {
            console.log(`   🎯 VIABLE: Good potential for scheme data extraction`);
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
        name: portal.name,
        baseUrl: portal.baseUrl,
        description: portal.description,
        accessible: false,
        error: error.message
      });
    }
    
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test some known working government APIs
  console.log('🔍 Testing Known Government APIs...');
  console.log('===================================');
  
  const apiSources = [
    {
      name: 'Open Government Data Platform',
      url: 'https://api.data.gov.in/catalog',
      description: 'Government open data API'
    },
    {
      name: 'India Stack APIs',
      url: 'https://www.indiastack.org/about/',
      description: 'Digital infrastructure APIs'
    }
  ];

  for (const api of apiSources) {
    console.log(`🔍 Testing API: ${api.name}`);
    console.log(`   URL: ${api.url}`);
    
    try {
      const response = await fetch(api.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/html'
        },
        timeout: 10000
      });

      if (response.ok) {
        console.log(`   ✅ Status: ${response.status} - Accessible`);
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const data = await response.json();
            console.log(`   📊 JSON response with ${Object.keys(data).length} top-level keys`);
            console.log(`   🔑 Keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
          } catch (e) {
            console.log(`   ⚠️ Could not parse JSON response`);
          }
        } else {
          console.log(`   📄 Content-Type: ${contentType}`);
        }
        
        results.push({
          name: api.name,
          baseUrl: api.url,
          description: api.description,
          status: response.status,
          accessible: true,
          type: 'api'
        });
      } else {
        console.log(`   ❌ Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  generateDiscoveryReport(results);
  return results;
}

function analyzeContent(content) {
  const text = content.toLowerCase();
  
  // Count scheme-related keywords
  const keywords = ['scheme', 'yojana', 'program', 'benefit', 'scholarship', 'pension', 'subsidy', 'insurance'];
  const schemeKeywords = keywords.reduce((count, keyword) => {
    return count + (text.match(new RegExp(keyword, 'g')) || []).length;
  }, 0);
  
  // Extract title
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'No title found';
  
  // Find scheme-related links
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  const schemeLinks = [];
  let linkMatch;
  
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const href = linkMatch[1];
    const text = linkMatch[2].toLowerCase();
    
    if (keywords.some(keyword => text.includes(keyword)) || 
        href.toLowerCase().includes('scheme') || 
        href.toLowerCase().includes('yojana')) {
      schemeLinks.push({
        href: href,
        text: linkMatch[2].trim()
      });
    }
  }
  
  // Look for potential API endpoints
  const apiPatterns = [
    /api[\/\w]*\/[\/\w]*/g,
    /\/api\/[\/\w]*/g,
    /\.json/g,
    /\/data\/[\/\w]*/g
  ];
  
  const apiEndpoints = [];
  apiPatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    apiEndpoints.push(...matches);
  });
  
  return {
    title,
    schemeKeywords,
    schemeLinks: schemeLinks.slice(0, 20), // Limit to first 20 links
    apiEndpoints: [...new Set(apiEndpoints)].slice(0, 10) // Unique endpoints, limit to 10
  };
}

function generateDiscoveryReport(results) {
  console.log('📊 DISCOVERY REPORT');
  console.log('==================');
  console.log('');

  const accessible = results.filter(r => r.accessible);
  const viable = results.filter(r => r.viable);

  console.log(`📈 Summary:`);
  console.log(`   Total sources tested: ${results.length}`);
  console.log(`   Accessible sources: ${accessible.length}`);
  console.log(`   Viable sources: ${viable.length}`);
  console.log('');

  if (viable.length > 0) {
    console.log(`🎯 VIABLE SOURCES:`);
    viable.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name}`);
      console.log(`   URL: ${source.finalUrl || source.baseUrl}`);
      console.log(`   Scheme keywords: ${source.analysis?.schemeKeywords || 0}`);
      console.log(`   Scheme links: ${source.analysis?.schemeLinks?.length || 0}`);
      console.log(`   API endpoints: ${source.analysis?.apiEndpoints?.length || 0}`);
      console.log('');
    });
  }

  if (accessible.length > viable.length) {
    console.log(`📋 OTHER ACCESSIBLE SOURCES:`);
    accessible.filter(r => !r.viable).forEach((source, index) => {
      console.log(`${index + 1}. ${source.name} - ${source.finalUrl || source.baseUrl}`);
    });
    console.log('');
  }

  console.log(`💡 RECOMMENDATIONS:`);
  if (viable.length > 0) {
    console.log(`1. Create scrapers for ${viable.length} viable government portals`);
    console.log(`2. Focus on portals with the most scheme links and keywords`);
    console.log(`3. Implement link following to discover more scheme pages`);
    console.log(`4. Set up monitoring for content changes`);
  } else {
    console.log(`1. Try alternative government portals and ministry websites`);
    console.log(`2. Explore state government scheme portals`);
    console.log(`3. Consider RSS feeds or news sources for scheme announcements`);
    console.log(`4. Look into government mobile app APIs`);
  }
  
  console.log(`5. Combine multiple sources for comprehensive scheme database`);
  console.log(`6. Implement data validation and deduplication`);
}

// Run the discovery
discoverSchemeSources().then(() => {
  console.log('✅ Discovery complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Discovery failed:', error.message);
  process.exit(1);
});