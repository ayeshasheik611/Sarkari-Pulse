import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Extract DBT Schemes and Save to Database
 */
async function extractDBTSchemes() {
  let browser = null;
  
  try {
    console.log('🚀 Extracting DBT Bharat Schemes...');
    console.log('===================================');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
    
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
    
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Page loaded');
    await page.waitForTimeout(3000);
    
    // Extract schemes
    const schemes = await page.evaluate(() => {
      const extractedSchemes = [];
      
      // Look for list items containing scheme names
      const listItems = document.querySelectorAll('li, .list-item, .scheme-item');
      
      Array.from(listItems).forEach(item => {
        const text = item.textContent.trim();
        if (text && text.length > 10 && text.length < 200 && 
            (text.toLowerCase().includes('scheme') || 
             text.toLowerCase().includes('yojana') || 
             text.toLowerCase().includes('program'))) {
          
          // Clean up the text
          const cleanName = text.replace(/\s+/g, ' ').trim();
          
          // Skip generic text
          if (!cleanName.toLowerCase().includes('schemes from') && 
              !cleanName.toLowerCase().includes('ministries') &&
              cleanName.length > 5) {
            
            extractedSchemes.push({
              name: cleanName,
              description: 'Direct Benefit Transfer Scheme',
              ministry: 'Government of India',
              department: '',
              targetAudience: 'Citizens',
              sector: 'Direct Benefit Transfer',
              level: 'Central',
              beneficiaryState: 'All',
              source: 'dbt-bharat',
              sourceUrl: 'https://www.dbtbharat.gov.in/central-scheme/list',
              scrapedAt: new Date().toISOString(),
              isActive: true
            });
          }
        }
      });
      
      return extractedSchemes;
    });
    
    console.log(`🎯 Extracted ${schemes.length} schemes from DBT Bharat`);
    
    if (schemes.length === 0) {
      console.log('⚠️ No schemes extracted - checking page content...');
      
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          textSample: document.body.textContent.substring(0, 500),
          hasSchemeKeyword: document.body.textContent.toLowerCase().includes('scheme')
        };
      });
      
      console.log('📄 Page info:', pageContent);
      return [];
    }
    
    // Save schemes to database
    console.log('💾 Saving schemes to database...');
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const schemeData of schemes) {
      try {
        // Add unique scheme ID
        schemeData.schemeId = `dbt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const existingScheme = await Scheme.findOne({ 
          name: { $regex: `^${schemeData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });

        if (existingScheme) {
          await Scheme.findByIdAndUpdate(existingScheme._id, {
            ...schemeData,
            updatedAt: new Date()
          });
          updatedCount++;
        } else {
          await Scheme.create({
            ...schemeData,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          savedCount++;
        }
      } catch (schemeError) {
        console.error(`❌ Error saving scheme "${schemeData.name}":`, schemeError.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('🎉 DBT BHARAT EXTRACTION COMPLETED!');
    console.log('===================================');
    console.log(`✅ Total schemes extracted: ${schemes.length}`);
    console.log(`💾 Database results: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
    console.log('');

    // Show sample schemes
    if (schemes.length > 0) {
      console.log('📋 Sample extracted schemes:');
      schemes.slice(0, 15).forEach((scheme, index) => {
        console.log(`${index + 1}. ${scheme.name}`);
      });
      
      if (schemes.length > 15) {
        console.log(`   ... and ${schemes.length - 15} more schemes`);
      }
    }

    return schemes;
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
  }
}

// Run the extraction
extractDBTSchemes().then(schemes => {
  console.log('');
  console.log('🏁 Extraction completed');
  if (schemes.length > 0) {
    console.log(`✅ Successfully added ${schemes.length} DBT schemes to the database`);
    console.log('💡 These schemes are now available via the API endpoints');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Extraction error:', error.message);
  process.exit(1);
});