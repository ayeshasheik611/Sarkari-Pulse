import axios from 'axios';
import MyScheme from '../models/schemeModel.js';
import { loadSampleData } from '../utils/sampleData.js';
import MySchemeScraperService from '../services/myschemeScraperService.js';
import websocketService from '../services/websocketService.js';

// Fetch schemes from database (for frontend)
export const getMySchemeSchemes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, ministry, category } = req.query;
    
    // Build query
    let query = {};
    if (search) {
      query.$text = { $search: search };
    }
    if (ministry) {
      query.ministry = new RegExp(ministry, 'i');
    }
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    const schemes = await MyScheme.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await MyScheme.countDocuments(query);

    res.status(200).json({
      schemes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error('Error fetching schemes from DB:', err);
    res.status(500).json({ error: 'Failed to fetch schemes' });
  }
};

// Fetch and store schemes using comprehensive scraping
export const fetchAndStoreSchemes = async (req, res) => {
  const scraper = new MySchemeScraperService();
  
  try {
    console.log('🔄 Starting comprehensive scheme data collection...');
    
    // Notify WebSocket clients that sync started
    websocketService.notifySyncStart();
    
    let schemes = [];
    let dataSource = 'unknown';

    // Try web scraping first (more reliable than API)
    try {
      console.log('🔄 Initializing web scraper...');
      await scraper.initialize();
      schemes = await scraper.scrapeSchemes();
      
      if (schemes.length > 0) {
        console.log(`✅ Web scraping successful: ${schemes.length} schemes found`);
        dataSource = 'scraping';
        
        // Optionally enrich with detailed information
        const enrichDetails = req.query.enrich === 'true' || req.body?.enrich === true;
        if (enrichDetails) {
          console.log('🔍 Enriching schemes with detailed information...');
          schemes = await scraper.enrichSchemesWithDetails(schemes, 10);
        }
      }
    } catch (scrapingError) {
      console.log('❌ Web scraping failed:', scrapingError.message);
    }

    // Fallback to API if scraping failed
    if (schemes.length === 0) {
      try {
        console.log('🔄 Falling back to API approach...');
        const response = await axios.get(
          'https://api.myscheme.gov.in/search/v5/schemes',
          {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.myscheme.gov.in/search',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 10000
          }
        );
        schemes = response.data?.results || [];
        if (schemes.length > 0) {
          console.log(`✅ API approach successful: ${schemes.length} schemes`);
          dataSource = 'api';
        }
      } catch (apiError) {
        console.log('❌ API approach also failed:', apiError.message);
      }
    }

    // Final fallback to sample data
    if (schemes.length === 0) {
      console.log('⚠️ All live methods failed, loading sample data...');
      const sampleResult = await loadSampleData(MyScheme);
      
      if (res) {
        res.status(200).json({
          message: 'No live data available, loaded sample data',
          saved: sampleResult.saved,
          updated: sampleResult.updated,
          total: sampleResult.total,
          dataSource: 'sample',
          fallback: true
        });
      }
      
      return sampleResult;
    }

    // Process and store schemes with upsert logic
    console.log(`📊 Processing ${schemes.length} schemes for database storage...`);
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const scheme of schemes) {
      try {
        // Generate unique scheme ID
        const schemeId = scheme.id || 
                        scheme.scheme_id || 
                        `${dataSource}_${scheme.scheme_name?.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

        const schemeData = {
          schemeId,
          schemeName: scheme.scheme_name || scheme.title || scheme.name || 'Unknown Scheme',
          schemeDescription: scheme.description || scheme.scheme_description || scheme.summary || '',
          ministry: scheme.ministry || scheme.sponsoring_ministry || 'Government of India',
          department: scheme.department || scheme.sponsoring_department || '',
          category: scheme.category || scheme.scheme_category || 'General',
          subCategory: scheme.sub_category || scheme.scheme_sub_category || '',
          beneficiaryType: scheme.beneficiary_type || 'Citizens',
          eligibility: scheme.eligibility || scheme.eligibility_criteria || '',
          benefits: scheme.benefits || scheme.scheme_benefits || '',
          applicationProcess: scheme.application_process || scheme.applicationProcess || '',
          documentsRequired: Array.isArray(scheme.documents_required) ? 
                           scheme.documents_required : 
                           (scheme.documentsRequired ? [scheme.documentsRequired] : []),
          officialWebsite: scheme.official_website || scheme.officialWebsite || scheme.website || '',
          launchDate: scheme.launch_date ? new Date(scheme.launch_date) : 
                     (scheme.launchDate ? new Date(scheme.launchDate) : null),
          status: scheme.status || 'Active',
          dataSource,
          lastUpdated: new Date()
        };

        // Upsert logic - update if exists, create if not
        // Use upsert with proper counting
        const existingScheme = await MyScheme.findOne({ schemeId: schemeData.schemeId });
        
        if (existingScheme) {
          await MyScheme.updateOne({ schemeId: schemeData.schemeId }, schemeData);
          updatedCount++;
        } else {
          await MyScheme.create(schemeData);
          savedCount++;
        }

      } catch (schemeError) {
        console.error(`❌ Error processing scheme: ${scheme.scheme_name}`, schemeError.message);
        errorCount++;
      }
    }

    const result = { saved: savedCount, updated: updatedCount, errors: errorCount, total: schemes.length, dataSource };
    
    console.log(`✅ Database operation completed:`);
    console.log(`   📝 Saved: ${savedCount} new schemes`);
    console.log(`   🔄 Updated: ${updatedCount} existing schemes`);
    console.log(`   ❌ Errors: ${errorCount} failed operations`);
    
    // Notify WebSocket clients of completion
    websocketService.notifySyncComplete(result);
    
    if (res) {
      res.status(200).json({
        message: 'Schemes synchronized successfully',
        ...result,
        timestamp: new Date().toISOString()
      });
    }

    return result;

  } catch (err) {
    console.error('❌ Critical error in fetchAndStoreSchemes:', err.message);
    
    // Final fallback to sample data
    try {
      const sampleResult = await loadSampleData(MyScheme);
      console.log('✅ Emergency fallback: sample data loaded');
      
      if (res) {
        res.status(200).json({
          message: 'Critical error occurred, loaded sample data as fallback',
          saved: sampleResult.saved,
          updated: sampleResult.updated,
          total: sampleResult.total,
          dataSource: 'sample',
          fallback: true,
          error: err.message
        });
      }
      
      return sampleResult;
    } catch (sampleError) {
      console.error('❌ Even sample data loading failed:', sampleError.message);
      if (res) {
        res.status(500).json({ 
          error: 'All data collection methods failed', 
          details: err.message 
        });
      }
      throw err;
    }
  } finally {
    // Always close the browser
    await scraper.close();
  }
};

// Get scheme statistics
export const getSchemeStats = async (req, res) => {
  try {
    const totalSchemes = await MyScheme.countDocuments();
    const ministries = await MyScheme.distinct('ministry');
    const categories = await MyScheme.distinct('category');
    const lastUpdated = await MyScheme.findOne().sort({ lastUpdated: -1 });

    res.status(200).json({
      totalSchemes,
      totalMinistries: ministries.length,
      totalCategories: categories.length,
      lastUpdated: lastUpdated?.lastUpdated || null,
      ministries: ministries.filter(m => m && m.trim()),
      categories: categories.filter(c => c && c.trim())
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
