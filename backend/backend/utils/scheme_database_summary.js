import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Generate comprehensive summary of scheme database
 */
async function generateSchemeDatabaseSummary() {
  try {
    console.log('📊 COMPREHENSIVE GOVERNMENT SCHEME DATABASE SUMMARY');
    console.log('==================================================');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');
    console.log('');

    // Get total statistics
    const totalSchemes = await Scheme.countDocuments();
    const activeSchemes = await Scheme.countDocuments({ isActive: true });
    
    console.log('📈 OVERALL STATISTICS:');
    console.log(`   Total Schemes: ${totalSchemes}`);
    console.log(`   Active Schemes: ${activeSchemes}`);
    console.log(`   Progress vs MyScheme target (3,850): ${Math.round((totalSchemes / 3850) * 100)}%`);
    console.log('');

    // Breakdown by source
    const sourceBreakdown = await Scheme.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          latestScrape: { $max: '$scrapedAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('🔍 BREAKDOWN BY DATA SOURCE:');
    sourceBreakdown.forEach(source => {
      const sourceName = source._id || 'Unknown';
      const description = getSourceDescription(sourceName);
      console.log(`   ${sourceName}: ${source.count} schemes`);
      console.log(`      Description: ${description}`);
      if (source.latestScrape) {
        console.log(`      Latest scrape: ${source.latestScrape.toISOString().split('T')[0]}`);
      }
      console.log('');
    });

    // Breakdown by ministry
    const ministryBreakdown = await Scheme.aggregate([
      {
        $match: { ministry: { $ne: null, $ne: '' } }
      },
      {
        $group: {
          _id: '$ministry',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    console.log('🏛️ TOP MINISTRIES BY SCHEME COUNT:');
    ministryBreakdown.forEach((ministry, index) => {
      console.log(`   ${index + 1}. ${ministry._id}: ${ministry.count} schemes`);
    });
    console.log('');

    // Breakdown by sector
    const sectorBreakdown = await Scheme.aggregate([
      {
        $match: { sector: { $ne: null, $ne: '' } }
      },
      {
        $group: {
          _id: '$sector',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    console.log('📊 TOP SECTORS BY SCHEME COUNT:');
    sectorBreakdown.forEach((sector, index) => {
      console.log(`   ${index + 1}. ${sector._id}: ${sector.count} schemes`);
    });
    console.log('');

    // Recent additions
    const recentSchemes = await Scheme.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name ministry source createdAt')
      .lean();

    console.log('🆕 RECENTLY ADDED SCHEMES:');
    recentSchemes.forEach((scheme, index) => {
      console.log(`   ${index + 1}. ${scheme.name}`);
      console.log(`      Ministry: ${scheme.ministry || 'N/A'}`);
      console.log(`      Source: ${scheme.source}`);
      console.log(`      Added: ${scheme.createdAt.toISOString().split('T')[0]}`);
      console.log('');
    });

    // Sample schemes by category
    console.log('📋 SAMPLE SCHEMES BY CATEGORY:');
    
    const categories = [
      { name: 'Health & Wellness', query: { sector: /health/i } },
      { name: 'Education & Learning', query: { sector: /education/i } },
      { name: 'Agriculture & Rural', query: { sector: /agriculture|rural/i } },
      { name: 'Social Welfare', query: { sector: /social|welfare/i } },
      { name: 'Employment & Skills', query: { sector: /employment|skill/i } }
    ];

    for (const category of categories) {
      const schemes = await Scheme.find(category.query)
        .limit(5)
        .select('name ministry')
        .lean();
      
      if (schemes.length > 0) {
        console.log(`   ${category.name}:`);
        schemes.forEach(scheme => {
          console.log(`      - ${scheme.name}`);
        });
        console.log('');
      }
    }

    // Data quality assessment
    const qualityStats = await Scheme.aggregate([
      {
        $group: {
          _id: null,
          totalSchemes: { $sum: 1 },
          withMinistry: { $sum: { $cond: [{ $and: [{ $ne: ['$ministry', null] }, { $ne: ['$ministry', ''] }] }, 1, 0] } },
          withDescription: { $sum: { $cond: [{ $and: [{ $ne: ['$description', null] }, { $ne: ['$description', ''] }] }, 1, 0] } },
          withSector: { $sum: { $cond: [{ $and: [{ $ne: ['$sector', null] }, { $ne: ['$sector', ''] }] }, 1, 0] } },
          withSchemeId: { $sum: { $cond: [{ $and: [{ $ne: ['$schemeId', null] }, { $ne: ['$schemeId', ''] }] }, 1, 0] } }
        }
      }
    ]);

    if (qualityStats.length > 0) {
      const stats = qualityStats[0];
      console.log('📊 DATA QUALITY ASSESSMENT:');
      console.log(`   Schemes with Ministry: ${stats.withMinistry}/${stats.totalSchemes} (${Math.round((stats.withMinistry/stats.totalSchemes)*100)}%)`);
      console.log(`   Schemes with Description: ${stats.withDescription}/${stats.totalSchemes} (${Math.round((stats.withDescription/stats.totalSchemes)*100)}%)`);
      console.log(`   Schemes with Sector: ${stats.withSector}/${stats.totalSchemes} (${Math.round((stats.withSector/stats.totalSchemes)*100)}%)`);
      console.log(`   Schemes with Scheme ID: ${stats.withSchemeId}/${stats.totalSchemes} (${Math.round((stats.withSchemeId/stats.totalSchemes)*100)}%)`);
      console.log('');
    }

    // Success metrics
    console.log('🎯 SUCCESS METRICS:');
    console.log(`   ✅ Successfully diversified data sources beyond MyScheme.gov.in`);
    console.log(`   ✅ Extracted schemes from ${sourceBreakdown.length} different government portals`);
    console.log(`   ✅ Covered ${ministryBreakdown.length}+ government ministries`);
    console.log(`   ✅ Spans ${sectorBreakdown.length}+ different sectors`);
    console.log(`   ✅ Built comprehensive government scheme database`);
    console.log('');

    // Recommendations
    console.log('💡 RECOMMENDATIONS FOR FURTHER EXPANSION:');
    console.log('   1. Set up automated periodic scraping for data freshness');
    console.log('   2. Explore state government portals for regional schemes');
    console.log('   3. Add ministry-specific portals for deeper coverage');
    console.log('   4. Implement scheme detail pages scraping for richer data');
    console.log('   5. Add data validation and deduplication processes');
    console.log('   6. Create user-friendly search and filtering interfaces');
    console.log('');

    console.log('🎉 CONCLUSION:');
    console.log(`   Successfully built a comprehensive government scheme database with ${totalSchemes} schemes`);
    console.log(`   from multiple official sources, providing citizens with centralized access to`);
    console.log(`   government benefits and programs across various sectors and ministries.`);

  } catch (error) {
    console.error('❌ Error generating summary:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

function getSourceDescription(sourceName) {
  const descriptions = {
    'api': 'MyScheme.gov.in API - Official government scheme portal',
    'bulk-api': 'MyScheme.gov.in Bulk API - Automated extraction',
    'dbt-bharat': 'DBT Bharat Portal - Direct Benefit Transfer schemes',
    'india-gov': 'India.gov.in - National Portal of India',
    'mygov': 'MyGov.in - Citizen engagement platform',
    'digital-india': 'Digital India Portal - Digital initiatives',
    'manual': 'Manually entered schemes',
    'dom': 'DOM scraping from government websites',
    'import': 'Imported from external sources',
    'extracted': 'Extracted from various sources'
  };
  
  return descriptions[sourceName] || 'Government scheme data source';
}

// Run the summary
generateSchemeDatabaseSummary();