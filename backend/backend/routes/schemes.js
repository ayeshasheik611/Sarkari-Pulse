import express from 'express';
import { 
  getMySchemeSchemes, 
  fetchAndStoreSchemes, 
  getSchemeStats 
} from '../controllers/schemeController.js';
import MySchemeScraperService from '../services/myschemeScraperService.js';

const router = express.Router();

// GET /api/schemes/myscheme - Query schemes from database
// Supports: ?page=1&limit=20&search=term&ministry=name&category=type
router.get('/myscheme', getMySchemeSchemes);

// POST /api/schemes/myscheme/sync - Trigger data synchronization
// Body: { enrich: true } - optional, enriches schemes with detailed info
router.post('/myscheme/sync', fetchAndStoreSchemes);

// GET /api/schemes/myscheme/stats - Get database statistics
router.get('/myscheme/stats', getSchemeStats);

// GET /api/schemes/myscheme/test-scrape - Test scraping functionality
router.get('/myscheme/test-scrape', async (req, res) => {
  const scraper = new MySchemeScraperService();
  try {
    console.log('🧪 Testing scraper functionality...');
    await scraper.initialize();
    
    const schemes = await scraper.scrapeSchemes();
    await scraper.close();
    
    res.json({ 
      success: true,
      schemes, 
      count: schemes.length,
      capturedApiCalls: scraper.capturedData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await scraper.close();
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/schemes/myscheme/health - Health check for the service
router.get('/myscheme/health', async (req, res) => {
  try {
    const MyScheme = (await import('../models/schemeModel.js')).default;
    const count = await MyScheme.countDocuments();
    const lastUpdated = await MyScheme.findOne().sort({ lastUpdated: -1 });
    
    res.json({
      status: 'healthy',
      database: {
        connected: true,
        schemeCount: count,
        lastUpdated: lastUpdated?.lastUpdated || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
