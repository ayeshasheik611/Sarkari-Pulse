import BulkMySchemeScraperService from '../scraper/bulk_myscheme_scraper.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Standalone bulk scraping runner
 * Run this script to extract all 3,850+ schemes
 */
async function runBulkScraping() {
  let scraper = null;
  
  try {
    console.log('🚀 Starting BULK MyScheme scraping...');
    console.log('📊 Target: ALL 3,850+ schemes from MyScheme.gov.in');
    console.log('⏱️ Estimated time: 15-30 minutes');
    console.log('');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize bulk scraper
    scraper = new BulkMySchemeScraperService();
    
    // Configure scraping parameters
    const options = {
      maxPages: 200,        // Increase pages to ensure we get all schemes
      pageSize: 50,         // Optimal page size
      delayBetweenRequests: 800,  // Slightly faster but still respectful
      saveToDb: true,       // Save to database
      notifyProgress: false // No WebSocket notifications in standalone mode
    };

    console.log('⚙️ Scraping configuration:');
    console.log(`   - Max pages: ${options.maxPages}`);
    console.log(`   - Page size: ${options.pageSize}`);
    console.log(`   - Delay between requests: ${options.delayBetweenRequests}ms`);
    console.log('');

    // Start bulk scraping
    const startTime = new Date();
    const schemes = await scraper.scrapeAllSchemes(options);
    const endTime = new Date();
    
    const duration = Math.round((endTime - startTime) / 1000);
    const stats = scraper.getStats();

    console.log('');
    console.log('🎉 BULK SCRAPING COMPLETED!');
    console.log('================================');
    console.log(`✅ Total schemes extracted: ${schemes.length}`);
    console.log(`⏱️ Total time: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📡 API requests made: ${stats.totalRequests}`);
    console.log(`✅ Successful requests: ${stats.successfulRequests}`);
    console.log(`❌ Failed requests: ${stats.failedRequests}`);
    console.log(`🔄 Duplicates skipped: ${stats.duplicatesSkipped}`);
    console.log(`📊 Success rate: ${stats.successRate}%`);
    console.log('');

    // Show sample of extracted schemes
    console.log('📋 Sample of extracted schemes:');
    console.log('================================');
    schemes.slice(0, 10).forEach((scheme, index) => {
      console.log(`${index + 1}. ${scheme.name}`);
      console.log(`   Ministry: ${scheme.ministry || 'N/A'}`);
      console.log(`   Sector: ${scheme.sector || 'N/A'}`);
      console.log('');
    });

    if (schemes.length >= 3000) {
      console.log('🎯 SUCCESS: Extracted 3,000+ schemes - likely got most/all schemes!');
    } else if (schemes.length >= 1000) {
      console.log('✅ GOOD: Extracted 1,000+ schemes - substantial coverage');
    } else {
      console.log('⚠️ WARNING: Only extracted ' + schemes.length + ' schemes - may need to adjust strategy');
    }

  } catch (error) {
    console.error('❌ Bulk scraping failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (scraper) {
      await scraper.close();
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
    
    console.log('🏁 Bulk scraping process finished');
    process.exit(0);
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the bulk scraping
if (import.meta.url === `file://${process.argv[1]}`) {
  runBulkScraping();
}

export default runBulkScraping;