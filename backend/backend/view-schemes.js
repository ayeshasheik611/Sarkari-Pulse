import Scheme from './models/Scheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

async function viewAllSchemes() {
  try {
    console.log('🔍 Connecting to database to view extracted schemes...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all schemes
    const schemes = await Scheme.find().sort({ createdAt: -1 });
    
    console.log(`🏛️ TOTAL EXTRACTED SCHEMES: ${schemes.length}\n`);
    console.log('=' .repeat(80));
    
    // Display each scheme with details
    schemes.forEach((scheme, index) => {
      console.log(`\n📋 SCHEME ${index + 1}:`);
      console.log(`🏷️  Name: ${scheme.name}`);
      console.log(`🏢 Ministry: ${scheme.ministry || 'Not specified'}`);
      console.log(`🏛️  Department: ${scheme.department || 'Not specified'}`);
      console.log(`📂 Sector: ${scheme.sector || 'Not specified'}`);
      console.log(`👥 Target Audience: ${scheme.targetAudience || 'Not specified'}`);
      console.log(`🎯 Level: ${scheme.level || 'Not specified'}`);
      console.log(`🗺️  State: ${scheme.beneficiaryState || 'All States'}`);
      console.log(`📝 Description: ${scheme.description ? scheme.description.substring(0, 150) + '...' : 'No description'}`);
      console.log(`🔗 Source: ${scheme.source || 'manual'}`);
      console.log(`📅 Scraped: ${scheme.scrapedAt ? scheme.scrapedAt.toLocaleDateString() : 'N/A'}`);
      console.log(`🆔 Scheme ID: ${scheme.schemeId || 'N/A'}`);
      console.log('-'.repeat(80));
    });

    // Get statistics
    console.log('\n📊 STATISTICS:');
    console.log('=' .repeat(50));
    
    // Count by ministry
    const ministryStats = await Scheme.aggregate([
      { $group: { _id: '$ministry', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n🏢 SCHEMES BY MINISTRY:');
    ministryStats.forEach(stat => {
      if (stat._id) {
        console.log(`   ${stat.count.toString().padStart(2)} schemes - ${stat._id}`);
      }
    });

    // Count by sector
    const sectorStats = await Scheme.aggregate([
      { $group: { _id: '$sector', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📂 SCHEMES BY SECTOR:');
    sectorStats.forEach(stat => {
      if (stat._id) {
        console.log(`   ${stat.count.toString().padStart(2)} schemes - ${stat._id}`);
      }
    });

    // Count by level
    const levelStats = await Scheme.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n🎯 SCHEMES BY LEVEL:');
    levelStats.forEach(stat => {
      if (stat._id) {
        console.log(`   ${stat.count.toString().padStart(2)} schemes - ${stat._id}`);
      }
    });

    // Count by source
    const sourceStats = await Scheme.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n🔗 SCHEMES BY SOURCE:');
    sourceStats.forEach(stat => {
      console.log(`   ${stat.count.toString().padStart(2)} schemes - ${stat._id || 'manual'}`);
    });

    // Recent schemes
    const recentSchemes = await Scheme.find({ scrapedAt: { $exists: true } })
      .sort({ scrapedAt: -1 })
      .limit(5);
    
    console.log('\n🕐 MOST RECENTLY SCRAPED:');
    recentSchemes.forEach((scheme, index) => {
      console.log(`   ${index + 1}. ${scheme.name} (${scheme.scrapedAt.toLocaleDateString()})`);
    });

    // Popular schemes (by name keywords)
    const popularKeywords = ['Pradhan Mantri', 'Prime Minister', 'PM-', 'Ayushman', 'Kisan'];
    console.log('\n🌟 MAJOR GOVERNMENT SCHEMES:');
    
    for (const keyword of popularKeywords) {
      const keywordSchemes = await Scheme.find({ 
        name: { $regex: keyword, $options: 'i' } 
      }).limit(3);
      
      if (keywordSchemes.length > 0) {
        console.log(`\n   ${keyword} Schemes:`);
        keywordSchemes.forEach(scheme => {
          console.log(`     • ${scheme.name}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 EXTRACTION SUMMARY:');
    console.log(`   📊 Total Schemes: ${schemes.length}`);
    console.log(`   🏢 Ministries: ${ministryStats.length}`);
    console.log(`   📂 Sectors: ${sectorStats.length}`);
    console.log(`   🔗 Data Sources: ${sourceStats.length}`);
    console.log('=' .repeat(80));

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error viewing schemes:', error.message);
  }
}

// Run the viewer
viewAllSchemes();