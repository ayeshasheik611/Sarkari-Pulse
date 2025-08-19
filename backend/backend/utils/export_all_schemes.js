import mongoose from 'mongoose';
import Scheme from '../models/Scheme.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

/**
 * Export all schemes in multiple formats
 */
async function exportAllSchemes() {
  try {
    console.log('📊 EXPORTING ALL GOVERNMENT SCHEMES');
    console.log('===================================');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');

    // Fetch all schemes
    const schemes = await Scheme.find({})
      .sort({ name: 1 })
      .lean();

    console.log(`📋 Found ${schemes.length} schemes to export`);
    console.log('');

    // Export as JSON
    await exportAsJSON(schemes);
    
    // Export as CSV
    await exportAsCSV(schemes);
    
    // Export as formatted text
    await exportAsFormattedText(schemes);
    
    // Export as HTML
    await exportAsHTML(schemes);

    console.log('🎉 All exports completed successfully!');
    console.log('');
    console.log('📁 Generated files:');
    console.log('   - all_government_schemes.json (JSON format)');
    console.log('   - all_government_schemes.csv (CSV format)');
    console.log('   - all_government_schemes.txt (Formatted text)');
    console.log('   - all_government_schemes.html (HTML format)');

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

async function exportAsJSON(schemes) {
  console.log('📄 Exporting as JSON...');
  
  const exportData = {
    metadata: {
      totalSchemes: schemes.length,
      exportDate: new Date().toISOString(),
      sources: [...new Set(schemes.map(s => s.source))],
      ministries: [...new Set(schemes.map(s => s.ministry).filter(m => m))],
      sectors: [...new Set(schemes.map(s => s.sector).filter(s => s))]
    },
    schemes: schemes.map(scheme => ({
      id: scheme._id,
      name: scheme.name,
      ministry: scheme.ministry || 'Not specified',
      description: scheme.description || 'No description available',
      sector: scheme.sector || 'General',
      targetAudience: scheme.targetAudience || 'Citizens',
      level: scheme.level || 'Central',
      beneficiaryState: scheme.beneficiaryState || 'All',
      source: scheme.source,
      sourceUrl: scheme.sourceUrl,
      schemeId: scheme.schemeId,
      isActive: scheme.isActive,
      scrapedAt: scheme.scrapedAt,
      createdAt: scheme.createdAt,
      updatedAt: scheme.updatedAt
    }))
  };

  fs.writeFileSync('all_government_schemes.json', JSON.stringify(exportData, null, 2));
  console.log('   ✅ JSON export completed');
}

async function exportAsCSV(schemes) {
  console.log('📄 Exporting as CSV...');
  
  const headers = [
    'Name',
    'Ministry',
    'Description',
    'Sector',
    'Target Audience',
    'Level',
    'Beneficiary State',
    'Source',
    'Source URL',
    'Scheme ID',
    'Is Active',
    'Scraped At',
    'Created At',
    'Updated At'
  ];

  let csvContent = headers.join(',') + '\n';

  schemes.forEach(scheme => {
    const row = [
      `"${(scheme.name || '').replace(/"/g, '""')}"`,
      `"${(scheme.ministry || 'Not specified').replace(/"/g, '""')}"`,
      `"${(scheme.description || 'No description available').replace(/"/g, '""')}"`,
      `"${(scheme.sector || 'General').replace(/"/g, '""')}"`,
      `"${(scheme.targetAudience || 'Citizens').replace(/"/g, '""')}"`,
      `"${(scheme.level || 'Central').replace(/"/g, '""')}"`,
      `"${(scheme.beneficiaryState || 'All').replace(/"/g, '""')}"`,
      `"${scheme.source || ''}"`,
      `"${scheme.sourceUrl || ''}"`,
      `"${scheme.schemeId || ''}"`,
      scheme.isActive ? 'Yes' : 'No',
      scheme.scrapedAt ? new Date(scheme.scrapedAt).toISOString() : '',
      scheme.createdAt ? new Date(scheme.createdAt).toISOString() : '',
      scheme.updatedAt ? new Date(scheme.updatedAt).toISOString() : ''
    ];
    csvContent += row.join(',') + '\n';
  });

  fs.writeFileSync('all_government_schemes.csv', csvContent);
  console.log('   ✅ CSV export completed');
}

async function exportAsFormattedText(schemes) {
  console.log('📄 Exporting as formatted text...');
  
  let textContent = `COMPREHENSIVE GOVERNMENT SCHEME DATABASE
========================================

Total Schemes: ${schemes.length}
Export Date: ${new Date().toISOString()}
Sources: ${[...new Set(schemes.map(s => s.source))].join(', ')}

COMPLETE SCHEME LISTING
======================

`;

  schemes.forEach((scheme, index) => {
    textContent += `[${index + 1}] ${scheme.name}
    Ministry: ${scheme.ministry || 'Not specified'}
    Description: ${scheme.description || 'No description available'}
    Sector: ${scheme.sector || 'General'}
    Target Audience: ${scheme.targetAudience || 'Citizens'}
    Level: ${scheme.level || 'Central'}
    Coverage: ${scheme.beneficiaryState || 'All'}
    Source: ${scheme.source}
    Scheme ID: ${scheme.schemeId || 'N/A'}
    Active: ${scheme.isActive ? 'Yes' : 'No'}
    Last Updated: ${scheme.updatedAt ? new Date(scheme.updatedAt).toLocaleDateString() : 'N/A'}

`;
  });

  // Add summary statistics
  const sourceBreakdown = schemes.reduce((acc, scheme) => {
    acc[scheme.source] = (acc[scheme.source] || 0) + 1;
    return acc;
  }, {});

  const ministryBreakdown = schemes.reduce((acc, scheme) => {
    const ministry = scheme.ministry || 'Not specified';
    acc[ministry] = (acc[ministry] || 0) + 1;
    return acc;
  }, {});

  textContent += `
SUMMARY STATISTICS
==================

Schemes by Source:
`;
  Object.entries(sourceBreakdown).forEach(([source, count]) => {
    textContent += `  ${source}: ${count} schemes\n`;
  });

  textContent += `
Top Ministries:
`;
  Object.entries(ministryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([ministry, count]) => {
      textContent += `  ${ministry}: ${count} schemes\n`;
    });

  fs.writeFileSync('all_government_schemes.txt', textContent);
  console.log('   ✅ Text export completed');
}

async function exportAsHTML(schemes) {
  console.log('📄 Exporting as HTML...');
  
  let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Government Scheme Database</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
        }
        .header h1 {
            color: #007bff;
            margin-bottom: 10px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #007bff;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .scheme-card {
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .scheme-name {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .scheme-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .detail-item {
            padding: 5px 0;
        }
        .detail-label {
            font-weight: bold;
            color: #666;
        }
        .source-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            color: white;
        }
        .source-api { background-color: #28a745; }
        .source-dbt-bharat { background-color: #007bff; }
        .source-bulk-api { background-color: #ffc107; color: #333; }
        .search-box {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 16px;
        }
        .filter-buttons {
            margin-bottom: 20px;
        }
        .filter-btn {
            padding: 8px 16px;
            margin: 5px;
            border: none;
            border-radius: 4px;
            background: #e9ecef;
            cursor: pointer;
        }
        .filter-btn.active {
            background: #007bff;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ Comprehensive Government Scheme Database</h1>
            <p>Complete collection of ${schemes.length} government schemes from multiple official sources</p>
            <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${schemes.length}</div>
                <div>Total Schemes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${[...new Set(schemes.map(s => s.source))].length}</div>
                <div>Data Sources</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${[...new Set(schemes.map(s => s.ministry).filter(m => m))].length}</div>
                <div>Ministries</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${[...new Set(schemes.map(s => s.sector).filter(s => s))].length}</div>
                <div>Sectors</div>
            </div>
        </div>

        <input type="text" id="searchBox" class="search-box" placeholder="🔍 Search schemes by name, ministry, or sector...">
        
        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterBySource('all')">All Sources</button>
            <button class="filter-btn" onclick="filterBySource('api')">MyScheme.gov.in</button>
            <button class="filter-btn" onclick="filterBySource('dbt-bharat')">DBT Bharat</button>
            <button class="filter-btn" onclick="filterBySource('bulk-api')">Bulk API</button>
        </div>

        <div id="schemesList">
`;

  schemes.forEach((scheme, index) => {
    const sourceClass = `source-${scheme.source.replace(/[^a-z0-9]/g, '-')}`;
    
    htmlContent += `
            <div class="scheme-card" data-source="${scheme.source}" data-search="${(scheme.name + ' ' + (scheme.ministry || '') + ' ' + (scheme.sector || '')).toLowerCase()}">
                <div class="scheme-name">${index + 1}. ${scheme.name}</div>
                <div class="scheme-details">
                    <div class="detail-item">
                        <span class="detail-label">Ministry:</span> ${scheme.ministry || 'Not specified'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Sector:</span> ${scheme.sector || 'General'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Target:</span> ${scheme.targetAudience || 'Citizens'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Level:</span> ${scheme.level || 'Central'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Coverage:</span> ${scheme.beneficiaryState || 'All'}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Source:</span> 
                        <span class="source-badge ${sourceClass}">${scheme.source}</span>
                    </div>
                </div>
                ${scheme.description && scheme.description !== 'No description available' ? 
                  `<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                     <strong>Description:</strong> ${scheme.description}
                   </div>` : ''}
            </div>
`;
  });

  htmlContent += `
        </div>
    </div>

    <script>
        // Search functionality
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const schemes = document.querySelectorAll('.scheme-card');
            
            schemes.forEach(scheme => {
                const searchData = scheme.getAttribute('data-search');
                if (searchData.includes(searchTerm)) {
                    scheme.style.display = 'block';
                } else {
                    scheme.style.display = 'none';
                }
            });
        });

        // Filter functionality
        function filterBySource(source) {
            const schemes = document.querySelectorAll('.scheme-card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // Update button states
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            schemes.forEach(scheme => {
                if (source === 'all' || scheme.getAttribute('data-source') === source) {
                    scheme.style.display = 'block';
                } else {
                    scheme.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>`;

  fs.writeFileSync('all_government_schemes.html', htmlContent);
  console.log('   ✅ HTML export completed');
}

// Run the export
exportAllSchemes();