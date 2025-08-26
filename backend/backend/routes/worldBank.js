import express from 'express';
import {
  getEconomyData,
  getBusinessData,
  getSocialData,
  getEnvironmentData,
  getHealthData,
  getEducationData,
  getInfrastructureData,
  getCountries,
  getIndicators,
  getDashboardData,
  refreshData,
  getDataStats
} from '../controllers/worldBankController.js';

const router = express.Router();

/**
 * World Bank Open Data API Routes
 * Provides clean REST endpoints for World Bank data
 */

// Economy endpoints
router.get('/economy', getEconomyData);
router.get('/economy/:indicator', getEconomyData);

// Business endpoints
router.get('/business', getBusinessData);
router.get('/business/:indicator', getBusinessData);

// Social endpoints
router.get('/social', getSocialData);
router.get('/social/:indicator', getSocialData);

// Environment endpoints
router.get('/environment', getEnvironmentData);
router.get('/environment/:indicator', getEnvironmentData);

// Health endpoints
router.get('/health', getHealthData);
router.get('/health/:indicator', getHealthData);

// Education endpoints
router.get('/education', getEducationData);
router.get('/education/:indicator', getEducationData);

// Infrastructure endpoints
router.get('/infrastructure', getInfrastructureData);
router.get('/infrastructure/:indicator', getInfrastructureData);

// Utility endpoints
router.get('/countries', getCountries);
router.get('/indicators', getIndicators);
router.get('/dashboard', getDashboardData);
router.get('/stats', getDataStats);

// Data management endpoints
router.post('/refresh', refreshData);

/**
 * Specific indicator shortcuts for common requests
 */

// Economy shortcuts
router.get('/gdp', (req, res, next) => {
  req.params.indicator = 'gdp';
  getEconomyData(req, res, next);
});

router.get('/inflation', (req, res, next) => {
  req.params.indicator = 'inflation';
  getEconomyData(req, res, next);
});

router.get('/fdi', (req, res, next) => {
  req.params.indicator = 'fdi';
  getEconomyData(req, res, next);
});

// Social shortcuts
router.get('/population', (req, res, next) => {
  req.params.indicator = 'population';
  getSocialData(req, res, next);
});

router.get('/unemployment', (req, res, next) => {
  req.params.indicator = 'unemployment';
  getSocialData(req, res, next);
});

// Health shortcuts
router.get('/life-expectancy', (req, res, next) => {
  req.params.indicator = 'life-expectancy';
  getHealthData(req, res, next);
});

// Environment shortcuts
router.get('/co2-emissions', (req, res, next) => {
  req.params.indicator = 'co2-emissions';
  getEnvironmentData(req, res, next);
});

router.get('/energy-use', (req, res, next) => {
  req.params.indicator = 'energy-use';
  getEnvironmentData(req, res, next);
});

/**
 * API Documentation endpoint
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'World Bank Open Data API',
    version: '1.0.0',
    endpoints: {
      economy: {
        base: '/api/worldbank/economy',
        indicators: ['gdp', 'gdp-per-capita', 'inflation', 'fdi', 'trade', 'trade-balance', 'interest-rate', 'debt'],
        shortcuts: ['/api/worldbank/gdp', '/api/worldbank/inflation', '/api/worldbank/fdi']
      },
      business: {
        base: '/api/worldbank/business',
        indicators: ['ease-of-business', 'business-registration', 'tax-rate', 'credit-info', 'legal-rights']
      },
      social: {
        base: '/api/worldbank/social',
        indicators: ['population', 'population-growth', 'unemployment', 'inequality', 'urbanization', 'life-expectancy'],
        shortcuts: ['/api/worldbank/population', '/api/worldbank/unemployment']
      },
      environment: {
        base: '/api/worldbank/environment',
        indicators: ['co2-emissions', 'energy-use', 'forest-area', 'water-use', 'air-pollution'],
        shortcuts: ['/api/worldbank/co2-emissions', '/api/worldbank/energy-use']
      },
      health: {
        base: '/api/worldbank/health',
        indicators: ['life-expectancy', 'infant-mortality', 'maternal-mortality', 'health-expenditure', 'physicians', 'immunization'],
        shortcuts: ['/api/worldbank/life-expectancy']
      },
      education: {
        base: '/api/worldbank/education',
        indicators: ['literacy', 'primary-enrollment', 'secondary-enrollment', 'tertiary-enrollment', 'education-expenditure']
      },
      infrastructure: {
        base: '/api/worldbank/infrastructure',
        indicators: ['internet-users', 'mobile-subscriptions', 'electricity-access', 'water-access', 'paved-roads']
      },
      utility: {
        countries: '/api/worldbank/countries',
        indicators: '/api/worldbank/indicators',
        dashboard: '/api/worldbank/dashboard',
        stats: '/api/worldbank/stats',
        refresh: '/api/worldbank/refresh (POST)'
      }
    },
    queryParameters: {
      country: 'Country code (e.g., IN, US, CN)',
      year: 'Specific year (e.g., 2023)',
      startYear: 'Start year for range (e.g., 2020)',
      endYear: 'End year for range (e.g., 2023)',
      limit: 'Number of results per page (default: 100)',
      page: 'Page number (default: 1)',
      region: 'Region code for countries endpoint',
      incomeLevel: 'Income level code for countries endpoint'
    },
    examples: {
      'GDP data for India': '/api/worldbank/gdp?country=IN',
      'Inflation data 2020-2023': '/api/worldbank/inflation?startYear=2020&endYear=2023',
      'Population data for multiple countries': '/api/worldbank/population?country=IN,US,CN',
      'Dashboard for India': '/api/worldbank/dashboard?country=IN',
      'All economy indicators': '/api/worldbank/economy',
      'Countries in South Asia': '/api/worldbank/countries?region=SAS'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;