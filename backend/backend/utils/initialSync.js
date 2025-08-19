import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fetchAndStoreSchemes } from '../controllers/schemeController.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

async function initialSync() {
  try {
    console.log('🔄 Starting initial MyScheme data sync...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Fetch and store schemes
    const result = await fetchAndStoreSchemes();
    
    console.log('🎉 Initial sync completed successfully!');
    console.log(`📊 Results: ${result.saved} new, ${result.updated} updated, ${result.total} total`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Initial sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
initialSync();

export default initialSync;