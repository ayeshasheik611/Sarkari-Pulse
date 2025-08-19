import express from 'express';
import MySchemeScraperService from '../scraper/myscheme_scraper.js';
import BulkMySchemeScraperService from '../scraper/bulk_myscheme_scraper.js';
import Scheme from '../models/Scheme.js';
import websocketService from '../services/websocketService.js';

const router = express.Router();

/**
 * GET /api/myscheme
 * Returns schemes from database with optional filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      ministry, 
      sector,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build query object
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (ministry) {
      query.ministry = { $regex: ministry, $options: 'i' };
    }
    
    if (sector) {
      query.sector = { $regex: sector, $options: 'i' };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const schemes = await Scheme.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Scheme.countDocuments(query);

    res.json({
      success: true,
      data: schemes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching schemes:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schemes',
      message: error.message
    });
  }
});

/**
 * POST /api/myscheme/scrape
 * Triggers the scraper and optionally saves results to database
 */
router.post('/scrape', async (req, res) => {
  const scraper = new MySchemeScraperService();
  
  try {
    const { saveToDb = true, notifyClients = true } = req.body;

    console.log('🔄 Starting MyScheme scraping process...');
    
    // Notify WebSocket clients that scraping started
    if (notifyClients && websocketService.io) {
      websocketService.broadcast('scrape-started', {
        message: 'MyScheme scraping started',
        timestamp: new Date().toISOString()
      });
    }

    // Initialize and run scraper
    await scraper.initialize();
    const scrapedSchemes = await scraper.scrapeSchemes();
    
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Save to database if requested
    if (saveToDb && scrapedSchemes.length > 0) {
      console.log(`💾 Saving ${scrapedSchemes.length} schemes to database...`);
      
      for (const schemeData of scrapedSchemes) {
        try {
          // Check if scheme already exists (by name)
          const existingScheme = await Scheme.findOne({ 
            name: { $regex: `^${schemeData.name}$`, $options: 'i' }
          });

          if (existingScheme) {
            // Update existing scheme
            await Scheme.findByIdAndUpdate(existingScheme._id, {
              ...schemeData,
              updatedAt: new Date()
            });
            updatedCount++;
          } else {
            // Create new scheme
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
    }

    const result = {
      success: true,
      scraped: scrapedSchemes.length,
      saved: savedCount,
      updated: updatedCount,
      errors: errorCount,
      schemes: scrapedSchemes,
      stats: scraper.getStats(),
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Scraping completed: ${scrapedSchemes.length} scraped, ${savedCount} saved, ${updatedCount} updated`);

    // Notify WebSocket clients of completion
    if (notifyClients && websocketService.io) {
      websocketService.broadcast('scrape-completed', {
        message: 'MyScheme scraping completed',
        result: {
          scraped: scrapedSchemes.length,
          saved: savedCount,
          updated: updatedCount,
          errors: errorCount
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    
    // Notify WebSocket clients of error
    if (websocketService.io) {
      websocketService.broadcast('scrape-error', {
        message: 'MyScheme scraping failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: 'Scraping failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await scraper.close();
  }
});

/**
 * GET /api/myscheme/stats
 * Returns database statistics for MyScheme data
 */
router.get('/stats', async (req, res) => {
  try {
    const totalSchemes = await Scheme.countDocuments();
    const recentSchemes = await Scheme.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name ministry sector updatedAt')
      .lean();

    // Get unique ministries and sectors
    const ministries = await Scheme.distinct('ministry');
    const sectors = await Scheme.distinct('sector');

    // Get schemes by source
    const sourceStats = await Scheme.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalSchemes,
        totalMinistries: ministries.filter(m => m && m.trim()).length,
        totalSectors: sectors.filter(s => s && s.trim()).length,
        recentSchemes,
        sourceBreakdown: sourceStats,
        lastUpdated: recentSchemes[0]?.updatedAt || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/myscheme/bulk-scrape
 * Triggers bulk scraping to extract ALL schemes (3,850+)
 */
router.post('/bulk-scrape', async (req, res) => {
  const scraper = new BulkMySchemeScraperService();
  
  try {
    const { 
      maxPages = 100,
      pageSize = 50,
      delayBetweenRequests = 1000,
      saveToDb = true,
      notifyProgress = true 
    } = req.body;

    console.log('🚀 Starting BULK MyScheme scraping process...');
    console.log(`📊 Target: ALL schemes (estimated 3,850+)`);
    console.log(`⚙️ Settings: maxPages=${maxPages}, pageSize=${pageSize}, delay=${delayBetweenRequests}ms`);
    
    // Start the bulk scraping process
    res.json({
      success: true,
      message: 'Bulk scraping started - this will take several minutes',
      estimatedTime: '15-30 minutes',
      targetSchemes: '3,850+',
      settings: { maxPages, pageSize, delayBetweenRequests, saveToDb },
      timestamp: new Date().toISOString()
    });

    // Run scraping in background
    scraper.scrapeAllSchemes({
      maxPages,
      pageSize,
      delayBetweenRequests,
      saveToDb,
      notifyProgress
    }).then(schemes => {
      console.log(`✅ BULK scraping completed: ${schemes.length} schemes extracted`);
    }).catch(error => {
      console.error('❌ BULK scraping failed:', error.message);
    }).finally(() => {
      scraper.close();
    });

  } catch (error) {
    console.error('❌ Bulk scraping initialization failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Bulk scraping initialization failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    await scraper.close();
  }
});

/**
 * GET /api/myscheme/bulk-status
 * Get the current status of bulk scraping operation
 */
router.get('/bulk-status', async (req, res) => {
  try {
    const totalSchemes = await Scheme.countDocuments();
    const recentSchemes = await Scheme.find()
      .sort({ scrapedAt: -1 })
      .limit(10)
      .select('name ministry scrapedAt source')
      .lean();

    // Get schemes by source to see bulk vs regular scraping
    const sourceStats = await Scheme.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          latestScrape: { $max: '$scrapedAt' }
        }
      }
    ]);

    res.json({
      success: true,
      status: {
        totalSchemes,
        recentSchemes,
        sourceBreakdown: sourceStats,
        progress: {
          target: 3850,
          current: totalSchemes,
          percentage: Math.round((totalSchemes / 3850) * 100)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching bulk status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bulk status',
      message: error.message
    });
  }
});

/**
 * GET /api/myscheme/test
 * Test the scraper without saving to database
 */
router.get('/test', async (req, res) => {
  const scraper = new MySchemeScraperService();
  
  try {
    console.log('🧪 Testing MyScheme scraper...');
    
    await scraper.initialize();
    const schemes = await scraper.scrapeSchemes();
    const stats = scraper.getStats();
    
    res.json({
      success: true,
      message: 'Scraper test completed',
      schemes,
      count: schemes.length,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Scraper test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Scraper test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await scraper.close();
  }
});

export default router;