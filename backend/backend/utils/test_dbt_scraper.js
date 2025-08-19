import { chromium } from 'playwright';

/**
 * Test DBT Bharat Scraper
 * Simple test to extract schemes from DBT Bharat portal
 */
async function testDBTScraper() {
  let browser = null;
  
  try {
    console.log('🚀 Testing DBT Bharat Scraper...');
    console.log('================================');
    
    // Initialize browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    console.log('✅ Browser initialized');
    
    // Navigate to DBT schemes page
    const url = 'https://www.dbtbharat.gov.in/central-scheme/list';
    console.log(`📄 Navigating to: ${url}`);
    
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!response.ok()) {
      throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`);
    }
    
    console.log('✅ Page loaded successfully');
    await page.waitForTimeout(3000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'dbt_schemes_page.png' });
    console.log('📸 Screenshot saved: dbt_schemes_page.png');
    
    // Analyze page content
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 1000),
        hasTable: !!document.querySelector('table'),
        hasCards: !!document.querySelector('.card, [class*="card"]'),
        hasList: !!document.querySelector('ul, ol'),
        linkCount: document.querySelectorAll('a').length,
        schemeKeywords: (document.body.textContent.toLowerCase().match(/scheme/g) || []).length
      };
    });
    
    console.log('📊 Page Analysis:');
    console.log(`   Title: ${pageInfo.title}`);
    console.log(`   URL: ${pageInfo.url}`);
    console.log(`   Has table: ${pageInfo.hasTable}`);
    console.log(`   Has cards: ${pageInfo.hasCards}`);
    console.log(`   Has lists: ${pageInfo.hasList}`);
    console.log(`   Link count: ${pageInfo.linkCount}`);
    console.log(`   Scheme keywords: ${pageInfo.schemeKeywords}`);
    console.log('');
    
    console.log('📄 Page content sample:');
    console.log(pageInfo.bodyText);
    console.log('');
    
    // Try to extract scheme data
    const schemes = await page.evaluate(() => {
      const extractedSchemes = [];
      
      // Strategy 1: Look for table rows
      const tableRows = document.querySelectorAll('table tr');
      if (tableRows.length > 1) {
        console.log(`Found ${tableRows.length} table rows`);
        
        Array.from(tableRows).slice(1).forEach((row, index) => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 1) {
            const firstCell = cells[0].textContent.trim();
            if (firstCell && firstCell.length > 5 && firstCell.length < 200) {
              extractedSchemes.push({
                name: firstCell,
                description: cells[1] ? cells[1].textContent.trim() : 'DBT Scheme',
                source: 'table-extraction',
                rowIndex: index
              });
            }
          }
        });
      }
      
      // Strategy 2: Look for card elements
      if (extractedSchemes.length === 0) {
        const cards = document.querySelectorAll('.card, [class*="card"], .scheme, [class*="scheme"]');
        console.log(`Found ${cards.length} card elements`);
        
        Array.from(cards).forEach((card, index) => {
          const text = card.textContent.trim();
          if (text && text.length > 10 && text.length < 300) {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const name = lines[0] || text.substring(0, 100);
            
            extractedSchemes.push({
              name: name,
              description: lines[1] || 'DBT Scheme',
              source: 'card-extraction',
              cardIndex: index
            });
          }
        });
      }
      
      // Strategy 3: Look for list items
      if (extractedSchemes.length === 0) {
        const listItems = document.querySelectorAll('li, .list-item');
        console.log(`Found ${listItems.length} list items`);
        
        Array.from(listItems).forEach((item, index) => {
          const text = item.textContent.trim();
          if (text && text.length > 10 && text.length < 200 && 
              (text.toLowerCase().includes('scheme') || text.toLowerCase().includes('yojana'))) {
            extractedSchemes.push({
              name: text,
              description: 'DBT Scheme',
              source: 'list-extraction',
              listIndex: index
            });
          }
        });
      }
      
      // Strategy 4: Text-based extraction
      if (extractedSchemes.length === 0) {
        const bodyText = document.body.textContent;
        const lines = bodyText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 10 && line.length < 200);
        
        const schemeLines = lines.filter(line => {
          const lower = line.toLowerCase();
          return (lower.includes('scheme') || lower.includes('yojana') || lower.includes('program')) &&
                 !line.includes('http') && !line.includes('@') && !line.includes('©');
        });
        
        console.log(`Found ${schemeLines.length} potential scheme lines`);
        
        schemeLines.slice(0, 50).forEach((line, index) => {
          extractedSchemes.push({
            name: line,
            description: 'DBT Scheme',
            source: 'text-extraction',
            textIndex: index
          });
        });
      }
      
      return extractedSchemes.slice(0, 100); // Limit to first 100
    });
    
    console.log(`🎯 Extraction Results:`);
    console.log(`   Total schemes found: ${schemes.length}`);
    
    if (schemes.length > 0) {
      console.log(`   Extraction method: ${schemes[0].source}`);
      console.log('');
      console.log('📋 Sample schemes:');
      schemes.slice(0, 10).forEach((scheme, index) => {
        console.log(`${index + 1}. ${scheme.name}`);
        if (scheme.description && scheme.description !== scheme.name) {
          console.log(`   Description: ${scheme.description}`);
        }
      });
      
      if (schemes.length > 10) {
        console.log(`   ... and ${schemes.length - 10} more schemes`);
      }
    } else {
      console.log('   ⚠️ No schemes extracted - page structure may be different');
    }
    
    return schemes;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }
  }
}

// Run the test
testDBTScraper().then(schemes => {
  console.log('');
  console.log('🏁 Test completed');
  if (schemes.length > 0) {
    console.log(`✅ Successfully extracted ${schemes.length} schemes from DBT Bharat`);
  } else {
    console.log('⚠️ No schemes extracted - may need to adjust extraction strategy');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});