import { chromium } from 'playwright';
import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Extract India.gov.in Schemes and Save to Database
 */
async function extractIndiaGovSchemes() {
  let browser = null;
  
  try {
    console.log('🚀 Extracting India.gov.in Schemes...');
    console.log('====================================');
    
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
    
    const allSchemes = [];
    
    // Try multiple India.gov.in URLs
    const urls = [
      'https://www.india.gov.in/my-government/schemes-0',
      'https://www.india.gov.in/topics/social-welfare-schemes',
      'https://www.india.gov.in/my-government/government-schemes-and-programmes'
    ];
    
    for (const url of urls) {
      try {
        console.log(`📄 Navigating to: ${url}`);
        
        const response = await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        if (!response.ok()) {
          console.log(`   ❌ Failed to load: ${response.status()}`);
          continue;
        }
        
        console.log('   ✅ Page loaded');
        await page.waitForTimeout(3000);
        
        // Extract schemes from this page
        const schemes = await page.evaluate(() => {
          const extractedSchemes = [];
          
          // Strategy 1: Look for scheme links
          const links = document.querySelectorAll('a');
          
          Array.from(links).forEach(link => {
            const text = link.textContent.trim();
            const href = link.getAttribute('href');
            
            if (text && text.length > 10 && text.length < 200 && 
                (text.toLowerCase().includes('scheme') || 
                 text.toLowerCase().includes('yojana') || 
                 text.toLowerCase().includes('program'))) {
              
              // Clean up the text
              const cleanName = text.replace(/\s+/g, ' ').trim();
              
              extractedSchemes.push({
                name: cleanName,
                description: 'Government Scheme from National Portal of India',
                ministry: 'Government of India',
                department: '',
                targetAudience: 'Citizens',
                sector: 'Government Services',
                level: 'Central',
                beneficiaryState: 'All',
                source: 'india-gov',
                linkUrl: href
              });
            }
          });
          
          // Strategy 2: Look for scheme names in text content
          const bodyText = document.body.textContent;
          const lines = bodyText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 10 && line.length < 200);
          
          const schemeLines = lines.filter(line => {
            const lower = line.toLowerCase();
            return (lower.includes('scheme') || lower.includes('yojana') || lower.includes('program')) &&
                   !line.includes('http') && !line.includes('@') && !line.includes('©') &&
                   !lower.includes('website') && !lower.includes('portal');
          });
          
          // Add unique scheme lines
          const existingNames = new Set(extractedSchemes.map(s => s.name.toLowerCase()));
          
          schemeLines.forEach(line => {
            const cleanName = line.replace(/\s+/g, ' ').trim();
            if (!existingNames.has(cleanName.toLowerCase()) && cleanName.length > 5) {
              extractedSchemes.push({
                name: cleanName,
                description: 'Government Scheme from National Portal of India',
                ministry: 'Government of India',
                department: '',
                targetAudience: 'Citizens',
                sector: 'Government Services',
                level: 'Central',
                beneficiaryState: 'All',
                source: 'india-gov'
              });
              existingNames.add(cleanName.toLowerCase());
            }
          });
          
          return extractedSchemes.slice(0, 50); // Limit per page
        });
        
        console.log(`   🎯 Extracted ${schemes.length} schemes from this page`);
        allSchemes.push(...schemes);
        
      } catch (error) {
        console.log(`   ❌ Error with ${url}: ${error.message}`);
      }
      
      await page.waitForTimeout(2000); // Rate limiting
    }
    
    // Remove duplicates
    const uniqueSchemes = [];
    const seenNames = new Set();
    
    for (const scheme of allSchemes) {
      const key = scheme.name.toLowerCase().trim();
      if (!seenNames.has(key) && scheme.name.length > 5) {
        uniqueSchemes.push(scheme);
        seenNames.add(key);
      }
    }
    
    console.log(`🎯 Total unique schemes extracted: ${uniqueSchemes.length}`);
    
    if (uniqueSchemes.length === 0) {
      console.log('⚠️ No schemes extracted');
      return [];
    }
    
    // Save schemes to database
    console.log('💾 Saving schemes to database...');
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const schemeData of uniqueSchemes) {
      try {
        // Add unique scheme ID and other required fields
        schemeData.schemeId = `india-gov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        schemeData.sourceUrl = 'https://www.india.gov.in/my-government/schemes-0';
        schemeData.scrapedAt = new Date();
        schemeData.isActive = true;
        
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
    console.log('🎉 INDIA.GOV.IN EXTRACTION COMPLETED!');
    console.log('====================================');
    console.log(`✅ Total schemes extracted: ${uniqueSchemes.length}`);
    console.log(`💾 Database results: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
    console.log('');

    // Show sample schemes
    if (uniqueSchemes.length > 0) {
      console.log('📋 Sample extracted schemes:');
      uniqueSchemes.slice(0, 15).forEach((scheme, index) => {
        console.log(`${index + 1}. ${scheme.name}`);
      });
      
      if (uniqueSchemes.length > 15) {
        console.log(`   ... and ${uniqueSchemes.length - 15} more schemes`);
      }
    }

    return uniqueSchemes;
    
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
extractIndiaGovSchemes().then(schemes => {
  console.log('');
  console.log('🏁 Extraction completed');
  if (schemes.length > 0) {
    console.log(`✅ Successfully added ${schemes.length} India.gov.in schemes to the database`);
    console.log('💡 These schemes are now available via the API endpoints');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Extraction error:', error.message);
  process.exit(1);
});