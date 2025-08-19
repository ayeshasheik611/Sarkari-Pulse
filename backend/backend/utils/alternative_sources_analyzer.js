import { chromium } from 'playwright';
import fetch from 'node-fetch';

/**
 * Alternative Government Scheme Data Sources Analyzer
 * Explores and tests various official government portals for scheme data
 */
class AlternativeSourcesAnalyzer {
  constructor() {
    this.browser = null;
    this.sources = [];
    this.results = [];
  }

  async initialize() {
    console.log('🔍 Initializing Alternative Sources Analyzer...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Define potential government scheme data sources
    this.sources = [
      {
        name: 'India.gov.in - Citizen Services',
        url: 'https://www.india.gov.in/topics/social-welfare-schemes',
        type: 'portal',
        description: 'Official India portal with scheme listings'
      },
      {
        name: 'Digital India Portal',
        url: 'https://digitalindia.gov.in/schemes',
        type: 'portal',
        description: 'Digital India schemes and initiatives'
      },
      {
        name: 'PM India Portal',
        url: 'https://www.pmindia.gov.in/en/government_schemes/',
        type: 'portal',
        description: 'Prime Minister\'s office scheme listings'
      },
      {
        name: 'DBT Mission Portal',
        url: 'https://dbtbharat.gov.in/schemes',
        type: 'portal',
        description: 'Direct Benefit Transfer schemes database'
      },
      {
        name: 'National Portal of India',
        url: 'https://www.india.gov.in/my-government/schemes',
        type: 'portal',
        description: 'Comprehensive government schemes portal'
      },
      {
        name: 'Jansuraksha Portal',
        url: 'https://www.jansuraksha.gov.in/',
        type: 'portal',
        description: 'Social security schemes portal'
      },
      {
        name: 'Ministry of Rural Development',
        url: 'https://rural.nic.in/schemes',
        type: 'ministry',
        description: 'Rural development schemes'
      },
      {
        name: 'Ministry of Agriculture',
        url: 'https://agricoop.nic.in/schemes',
        type: 'ministry',
        description: 'Agriculture and farmer welfare schemes'
      },
      {
        name: 'Ministry of Health',
        url: 'https://mohfw.gov.in/schemes-list',
        type: 'ministry',
        description: 'Health and family welfare schemes'
      },
      {
        name: 'Ministry of Education',
        url: 'https://www.education.gov.in/schemes',
        type: 'ministry',
        description: 'Education schemes and scholarships'
      },
      {
        name: 'Ministry of Social Justice',
        url: 'https://socialjustice.gov.in/schemes',
        type: 'ministry',
        description: 'Social justice and empowerment schemes'
      },
      {
        name: 'Ministry of Women & Child Development',
        url: 'https://wcd.nic.in/schemes-listing',
        type: 'ministry',
        description: 'Women and child development schemes'
      },
      {
        name: 'NITI Aayog Development Monitoring',
        url: 'https://www.niti.gov.in/schemes',
        type: 'policy',
        description: 'Policy think tank scheme monitoring'
      },
      {
        name: 'Pradhan Mantri Schemes Portal',
        url: 'https://pmschemes.gov.in/',
        type: 'portal',
        description: 'Dedicated PM schemes portal'
      },
      {
        name: 'Scholarship Portal',
        url: 'https://scholarships.gov.in/schemesList',
        type: 'portal',
        description: 'National scholarship schemes database'
      }
    ];
    
    console.log(`✅ Analyzer initialized with ${this.sources.length} potential sources`);
  }

  async analyzeAllSources() {
    console.log('🔍 Starting comprehensive analysis of government scheme sources...');
    console.log('');

    for (const source of this.sources) {
      await this.analyzeSource(source);
      await this.delay(2000); // Rate limiting between sources
    }

    return this.results;
  }

  async analyzeSource(source) {
    console.log(`🔍 Analyzing: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    
    const result = {
      ...source,
      status: 'unknown',
      accessibility: false,
      hasSchemeData: false,
      dataStructure: null,
      schemeCount: 0,
      extractionMethod: null,
      apiEndpoints: [],
      challenges: [],
      opportunities: []
    };

    try {
      // First, try to access the URL
      const page = await this.browser.newPage();
      
      // Set up network monitoring
      const apiCalls = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('api') || url.includes('json') || url.includes('scheme')) {
          apiCalls.push({
            url: url,
            status: response.status(),
            contentType: response.headers()['content-type'] || ''
          });
        }
      });

      try {
        const response = await page.goto(source.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        if (response.ok()) {
          result.status = 'accessible';
          result.accessibility = true;
          
          // Wait for content to load
          await page.waitForTimeout(3000);
          
          // Analyze page content
          const analysis = await page.evaluate(() => {
            const text = document.body.textContent.toLowerCase();
            const html = document.body.innerHTML;
            
            // Look for scheme-related content
            const schemeKeywords = [
              'scheme', 'yojana', 'program', 'initiative', 'benefit',
              'subsidy', 'scholarship', 'pension', 'insurance', 'loan'
            ];
            
            const schemeCount = schemeKeywords.reduce((count, keyword) => {
              const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
              return count + matches;
            }, 0);
            
            // Look for structured data
            const hasTable = html.includes('<table');
            const hasList = html.includes('<ul') || html.includes('<ol');
            const hasCards = html.includes('card') || html.includes('scheme-');
            const hasJson = html.includes('application/json');
            
            // Look for pagination or load more
            const hasPagination = text.includes('next') || text.includes('more') || text.includes('page');
            
            // Count potential scheme entries
            const schemeElements = document.querySelectorAll([
              '[class*="scheme"]',
              '[class*="program"]',
              '[class*="yojana"]',
              '.card',
              'tr',
              'li'
            ].join(', ')).length;
            
            return {
              schemeKeywordCount: schemeCount,
              hasStructuredData: hasTable || hasList || hasCards,
              hasTable,
              hasList,
              hasCards,
              hasJson,
              hasPagination,
              potentialSchemeElements: schemeElements,
              title: document.title,
              hasSearchForm: !!document.querySelector('input[type="search"], input[name*="search"]')
            };
          });
          
          // Update result based on analysis
          result.hasSchemeData = analysis.schemeKeywordCount > 10;
          result.schemeCount = analysis.potentialSchemeElements;
          result.dataStructure = {
            hasTable: analysis.hasTable,
            hasList: analysis.hasList,
            hasCards: analysis.hasCards,
            hasJson: analysis.hasJson,
            hasPagination: analysis.hasPagination,
            hasSearch: analysis.hasSearchForm
          };
          
          // Determine extraction method
          if (apiCalls.length > 0) {
            result.extractionMethod = 'api';
            result.apiEndpoints = apiCalls;
            result.opportunities.push('API endpoints detected');
          } else if (analysis.hasTable) {
            result.extractionMethod = 'table-scraping';
            result.opportunities.push('Structured table data available');
          } else if (analysis.hasList || analysis.hasCards) {
            result.extractionMethod = 'dom-scraping';
            result.opportunities.push('Structured DOM elements available');
          } else {
            result.extractionMethod = 'text-parsing';
            result.challenges.push('Unstructured data - requires text parsing');
          }
          
          // Assess viability
          if (result.hasSchemeData && result.schemeCount > 5) {
            result.opportunities.push(`Potentially ${result.schemeCount} schemes available`);
          }
          
          if (analysis.hasPagination) {
            result.opportunities.push('Pagination detected - can extract multiple pages');
          }
          
          if (analysis.hasSearch) {
            result.opportunities.push('Search functionality available');
          }
          
          console.log(`   ✅ Status: ${result.status}`);
          console.log(`   📊 Potential schemes: ${result.schemeCount}`);
          console.log(`   🔧 Extraction method: ${result.extractionMethod}`);
          console.log(`   📡 API calls detected: ${apiCalls.length}`);
          
        } else {
          result.status = 'inaccessible';
          result.challenges.push(`HTTP ${response.status()}: ${response.statusText()}`);
          console.log(`   ❌ Status: ${response.status()} ${response.statusText()}`);
        }
        
      } catch (pageError) {
        result.status = 'error';
        result.challenges.push(`Page load error: ${pageError.message}`);
        console.log(`   ❌ Error: ${pageError.message}`);
      }
      
      await page.close();
      
    } catch (error) {
      result.status = 'error';
      result.challenges.push(`Analysis error: ${error.message}`);
      console.log(`   ❌ Analysis failed: ${error.message}`);
    }
    
    this.results.push(result);
    console.log('');
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateReport() {
    console.log('📊 ALTERNATIVE GOVERNMENT SCHEME SOURCES ANALYSIS REPORT');
    console.log('========================================================');
    console.log('');

    const accessible = this.results.filter(r => r.accessibility);
    const withSchemeData = this.results.filter(r => r.hasSchemeData);
    const withAPIs = this.results.filter(r => r.apiEndpoints.length > 0);

    console.log(`📈 SUMMARY STATISTICS:`);
    console.log(`   Total sources analyzed: ${this.results.length}`);
    console.log(`   Accessible sources: ${accessible.length}`);
    console.log(`   Sources with scheme data: ${withSchemeData.length}`);
    console.log(`   Sources with API endpoints: ${withAPIs.length}`);
    console.log('');

    console.log(`🎯 TOP VIABLE SOURCES:`);
    const viableSources = this.results
      .filter(r => r.accessibility && r.hasSchemeData)
      .sort((a, b) => b.schemeCount - a.schemeCount)
      .slice(0, 10);

    viableSources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name}`);
      console.log(`   URL: ${source.url}`);
      console.log(`   Potential schemes: ${source.schemeCount}`);
      console.log(`   Extraction method: ${source.extractionMethod}`);
      console.log(`   Opportunities: ${source.opportunities.join(', ')}`);
      if (source.challenges.length > 0) {
        console.log(`   Challenges: ${source.challenges.join(', ')}`);
      }
      console.log('');
    });

    console.log(`🔧 API ENDPOINTS DISCOVERED:`);
    withAPIs.forEach(source => {
      console.log(`${source.name}:`);
      source.apiEndpoints.forEach(api => {
        console.log(`   - ${api.url} (${api.status})`);
      });
      console.log('');
    });

    console.log(`💡 RECOMMENDATIONS:`);
    console.log(`1. Prioritize sources with API endpoints for reliable data extraction`);
    console.log(`2. Focus on sources with high scheme counts (${viableSources[0]?.schemeCount || 0}+ schemes)`);
    console.log(`3. Implement scrapers for top 5 viable sources`);
    console.log(`4. Use table/DOM scraping for structured data sources`);
    console.log(`5. Set up periodic monitoring for data updates`);
    console.log('');

    return {
      summary: {
        totalSources: this.results.length,
        accessibleSources: accessible.length,
        sourcesWithData: withSchemeData.length,
        sourcesWithAPIs: withAPIs.length
      },
      viableSources: viableSources,
      apiEndpoints: withAPIs,
      fullResults: this.results
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Main execution
async function analyzeAlternativeSources() {
  const analyzer = new AlternativeSourcesAnalyzer();
  
  try {
    await analyzer.initialize();
    await analyzer.analyzeAllSources();
    const report = analyzer.generateReport();
    
    // Save report to file for reference
    const fs = await import('fs');
    fs.writeFileSync(
      'alternative_sources_report.json', 
      JSON.stringify(report, null, 2)
    );
    
    console.log('📄 Full report saved to: alternative_sources_report.json');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await analyzer.close();
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeAlternativeSources();
}

export default AlternativeSourcesAnalyzer;