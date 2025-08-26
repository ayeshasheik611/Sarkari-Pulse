import mongoose from 'mongoose';
import WorldBankService from '../services/worldBankService.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * World Bank Initial Data Loader
 * Loads initial data from World Bank API into the database
 */
async function loadInitialWorldBankData() {
  let worldBankService = null;
  
  try {
    console.log('🚀 Starting World Bank Initial Data Load...');
    console.log('===========================================');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Initialize World Bank service
    worldBankService = new WorldBankService();
    console.log('✅ World Bank service initialized');
    console.log('');

    // Check current data status
    console.log('📊 Checking current data status...');
    const freshness = await worldBankService.getDataFreshness();
    console.log(`   Current records: ${freshness.totalRecords}`);
    console.log(`   Current countries: ${freshness.totalCountries}`);
    console.log(`   Needs update: ${freshness.needsUpdate}`);
    console.log('');

    // Load countries data
    console.log('🌍 Loading countries data...');
    const startTime = new Date();
    
    const countryResult = await worldBankService.fetchCountries();
    console.log(`✅ Countries loaded: ${countryResult.savedCount} new, ${countryResult.updatedCount} updated`);
    console.log('');

    // Load indicator data for priority countries
    console.log('📊 Loading indicator data...');
    console.log('🎯 Priority countries: India, US, China, Japan, Germany, UK, France, Brazil, Canada, Australia');
    console.log('📈 Categories: Economy, Business, Social, Environment, Health, Education, Infrastructure');
    console.log('');

    const priorityCountries = ['IN', 'US', 'CN', 'JP', 'DE', 'GB', 'FR', 'BR', 'CA', 'AU'];
    const indicatorResult = await worldBankService.fetchIndicatorData(priorityCountries);
    
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('');
    console.log('🎉 WORLD BANK DATA LOAD COMPLETED!');
    console.log('==================================');
    console.log(`✅ Total time: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📊 Countries: ${countryResult.savedCount + countryResult.updatedCount} processed`);
    console.log(`📈 Indicators: ${indicatorResult.totalProcessed} processed`);
    console.log(`💾 New records: ${indicatorResult.totalSaved}`);
    console.log(`🔄 Updated records: ${indicatorResult.totalUpdated}`);
    console.log('');

    // Show final statistics
    const finalFreshness = await worldBankService.getDataFreshness();
    console.log('📊 Final Database Status:');
    console.log(`   Total records: ${finalFreshness.totalRecords}`);
    console.log(`   Total countries: ${finalFreshness.totalCountries}`);
    console.log(`   Last update: ${finalFreshness.latestUpdate}`);
    console.log('');

    // Show sample data by category
    console.log('📋 Sample Data by Category:');
    const categories = worldBankService.getCategories();
    
    for (const category of categories.slice(0, 4)) { // Show first 4 categories
      const sampleData = await mongoose.model('WorldBankIndicator').findOne({
        'indicator.category': category,
        'country.code': 'IN'
      }).lean();
      
      if (sampleData) {
        console.log(`   ${category}: ${sampleData.indicator.name} (${sampleData.year}) = ${sampleData.value} ${sampleData.unit}`);
      }
    }
    console.log('');

    // API endpoint examples
    console.log('🔗 API Endpoints Ready:');
    console.log('   Economy: http://localhost:9000/api/worldbank/economy');
    console.log('   GDP: http://localhost:9000/api/worldbank/gdp?country=IN');
    console.log('   Social: http://localhost:9000/api/worldbank/social');
    console.log('   Health: http://localhost:9000/api/worldbank/health');
    console.log('   Dashboard: http://localhost:9000/api/worldbank/dashboard?country=IN');
    console.log('   Countries: http://localhost:9000/api/worldbank/countries');
    console.log('');

    console.log('🌐 Dashboard Available:');
    console.log('   http://localhost:9000/worldbank-dashboard.html');
    console.log('');

    if (finalFreshness.totalRecords >= 1000) {
      console.log('🎯 SUCCESS: Comprehensive World Bank data loaded!');
      console.log('   Your backend now serves real-time World Bank Open Data');
      console.log('   Ready for frontend dashboard integration');
    } else if (finalFreshness.totalRecords >= 100) {
      console.log('✅ GOOD: Basic World Bank data loaded');
      console.log('   Consider running full refresh for complete coverage');
    } else {
      console.log('⚠️ LIMITED: Minimal data loaded');
      console.log('   Check API connectivity and run refresh');
    }

  } catch (error) {
    console.error('❌ World Bank data load failed:', error.message);
    console.error(error.stack);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB disconnected');
    }
    
    console.log('🏁 World Bank initial data load finished');
    process.exit(0);
  }
}

// Run the initial data load
loadInitialWorldBankData();