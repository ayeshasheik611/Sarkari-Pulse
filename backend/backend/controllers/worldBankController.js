import WorldBankIndicator from '../models/WorldBankIndicator.js';
import WorldBankCountry from '../models/WorldBankCountry.js';
import WorldBankService from '../services/worldBankService.js';

const worldBankService = new WorldBankService();

/**
 * World Bank Data Controller
 * Handles all World Bank data API endpoints
 */

/**
 * Get economy indicators
 * GET /api/worldbank/economy/:indicator?
 */
export const getEconomyData = async (req, res) => {
  try {
    const { indicator } = req.params;
    const { country, year, startYear, endYear, limit = 100, page = 1 } = req.query;
    
    // Build query
    const query = { 'indicator.category': 'economy' };
    
    if (indicator) {
      query['indicator.subcategory'] = indicator;
    }
    
    if (country) {
      query['country.code'] = country.toUpperCase();
    }
    
    if (year) {
      query.year = parseInt(year);
    } else if (startYear || endYear) {
      query.year = {};
      if (startYear) query.year.$gte = parseInt(startYear);
      if (endYear) query.year.$lte = parseInt(endYear);
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const data = await WorldBankIndicator.find(query)
      .sort({ 'country.code': 1, year: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankIndicator.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching economy data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch economy data',
      message: error.message
    });
  }
};

/**
 * Get business indicators
 * GET /api/worldbank/business/:indicator?
 */
export const getBusinessData = async (req, res) => {
  try {
    const { indicator } = req.params;
    const { country, year, startYear, endYear, limit = 100, page = 1 } = req.query;
    
    const query = { 'indicator.category': 'business' };
    
    if (indicator) {
      query['indicator.subcategory'] = indicator;
    }
    
    if (country) {
      query['country.code'] = country.toUpperCase();
    }
    
    if (year) {
      query.year = parseInt(year);
    } else if (startYear || endYear) {
      query.year = {};
      if (startYear) query.year.$gte = parseInt(startYear);
      if (endYear) query.year.$lte = parseInt(endYear);
    }
    
    const skip = (page - 1) * limit;
    const data = await WorldBankIndicator.find(query)
      .sort({ 'country.code': 1, year: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankIndicator.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching business data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business data',
      message: error.message
    });
  }
};

/**
 * Get social indicators
 * GET /api/worldbank/social/:indicator?
 */
export const getSocialData = async (req, res) => {
  try {
    const { indicator } = req.params;
    const { country, year, startYear, endYear, limit = 100, page = 1 } = req.query;
    
    const query = { 'indicator.category': 'social' };
    
    if (indicator) {
      query['indicator.subcategory'] = indicator;
    }
    
    if (country) {
      query['country.code'] = country.toUpperCase();
    }
    
    if (year) {
      query.year = parseInt(year);
    } else if (startYear || endYear) {
      query.year = {};
      if (startYear) query.year.$gte = parseInt(startYear);
      if (endYear) query.year.$lte = parseInt(endYear);
    }
    
    const skip = (page - 1) * limit;
    const data = await WorldBankIndicator.find(query)
      .sort({ 'country.code': 1, year: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankIndicator.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching social data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social data',
      message: error.message
    });
  }
};

/**
 * Get environment indicators
 * GET /api/worldbank/environment/:indicator?
 */
export const getEnvironmentData = async (req, res) => {
  try {
    const { indicator } = req.params;
    const { country, year, startYear, endYear, limit = 100, page = 1 } = req.query;
    
    const query = { 'indicator.category': 'environment' };
    
    if (indicator) {
      query['indicator.subcategory'] = indicator;
    }
    
    if (country) {
      query['country.code'] = country.toUpperCase();
    }
    
    if (year) {
      query.year = parseInt(year);
    } else if (startYear || endYear) {
      query.year = {};
      if (startYear) query.year.$gte = parseInt(startYear);
      if (endYear) query.year.$lte = parseInt(endYear);
    }
    
    const skip = (page - 1) * limit;
    const data = await WorldBankIndicator.find(query)
      .sort({ 'country.code': 1, year: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankIndicator.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching environment data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch environment data',
      message: error.message
    });
  }
};

/**
 * Get health indicators
 * GET /api/worldbank/health/:indicator?
 */
export const getHealthData = async (req, res) => {
  try {
    const { indicator } = req.params;
    const { country, year, startYear, endYear, limit = 100, page = 1 } = req.query;
    
    const query = { 'indicator.category': 'health' };
    
    if (indicator) {
      query['indicator.subcategory'] = indicator;
    }
    
    if (country) {
      query['country.code'] = country.toUpperCase();
    }
    
    if (year) {
      query.year = parseInt(year);
    } else if (startYear || endYear) {
      query.year = {};
      if (startYear) query.year.$gte = parseInt(startYear);
      if (endYear) query.year.$lte = parseInt(endYear);
    }
    
    const skip = (page - 1) * limit;
    const data = await WorldBankIndicator.find(query)
      .sort({ 'country.code': 1, year: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankIndicator.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching health data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health data',
      message: error.message
    });
  }
};

/**
 * Get education indicators
 * GET /api/worldbank/education/:indicator?
 */
export const getEducationData = async (req, res) => {
  try {
    const { indicator } = req.params;
    const { country, year, startYear, endYear, limit = 100, page = 1 } = req.query;
    
    const query = { 'indicator.category': 'education' };
    
    if (indicator) {
      query['indicator.subcategory'] = indicator;
    }
    
    if (country) {
      query['country.code'] = country.toUpperCase();
    }
    
    if (year) {
      query.year = parseInt(year);
    } else if (startYear || endYear) {
      query.year = {};
      if (startYear) query.year.$gte = parseInt(startYear);
      if (endYear) query.year.$lte = parseInt(endYear);
    }
    
    const skip = (page - 1) * limit;
    const data = await WorldBankIndicator.find(query)
      .sort({ 'country.code': 1, year: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankIndicator.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching education data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch education data',
      message: error.message
    });
  }
};

/**
 * Get infrastructure indicators
 * GET /api/worldbank/infrastructure/:indicator?
 */
export const getInfrastructureData = async (req, res) => {
  try {
    const { indicator } = req.params;
    const { country, year, startYear, endYear, limit = 100, page = 1 } = req.query;
    
    const query = { 'indicator.category': 'infrastructure' };
    
    if (indicator) {
      query['indicator.subcategory'] = indicator;
    }
    
    if (country) {
      query['country.code'] = country.toUpperCase();
    }
    
    if (year) {
      query.year = parseInt(year);
    } else if (startYear || endYear) {
      query.year = {};
      if (startYear) query.year.$gte = parseInt(startYear);
      if (endYear) query.year.$lte = parseInt(endYear);
    }
    
    const skip = (page - 1) * limit;
    const data = await WorldBankIndicator.find(query)
      .sort({ 'country.code': 1, year: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankIndicator.countDocuments(query);
    
    res.json({
      success: true,
      data,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching infrastructure data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch infrastructure data',
      message: error.message
    });
  }
};

/**
 * Get countries list
 * GET /api/worldbank/countries
 */
export const getCountries = async (req, res) => {
  try {
    const { region, incomeLevel, limit = 100, page = 1 } = req.query;
    
    const query = {};
    
    if (region) {
      query['region.code'] = region.toUpperCase();
    }
    
    if (incomeLevel) {
      query['incomeLevel.code'] = incomeLevel.toUpperCase();
    }
    
    const skip = (page - 1) * limit;
    const countries = await WorldBankCountry.find(query)
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await WorldBankCountry.countDocuments(query);
    
    res.json({
      success: true,
      data: countries,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching countries:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch countries',
      message: error.message
    });
  }
};

/**
 * Get available indicators
 * GET /api/worldbank/indicators
 */
export const getIndicators = async (req, res) => {
  try {
    const { category } = req.query;
    
    if (category) {
      const indicators = worldBankService.getIndicatorsByCategory(category);
      res.json({
        success: true,
        category,
        indicators,
        timestamp: new Date().toISOString()
      });
    } else {
      const categories = worldBankService.getCategories();
      const allIndicators = {};
      
      categories.forEach(cat => {
        allIndicators[cat] = worldBankService.getIndicatorsByCategory(cat);
      });
      
      res.json({
        success: true,
        categories,
        indicators: allIndicators,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching indicators:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch indicators',
      message: error.message
    });
  }
};

/**
 * Get dashboard summary data
 * GET /api/worldbank/dashboard
 */
export const getDashboardData = async (req, res) => {
  try {
    const { country = 'IN' } = req.query;
    
    // Get latest data for key indicators
    const keyIndicators = [
      'gdp', 'gdp-per-capita', 'inflation', 'unemployment',
      'life-expectancy', 'co2-emissions', 'population'
    ];
    
    const dashboardData = {};
    
    for (const indicator of keyIndicators) {
      const latestData = await WorldBankIndicator.findOne({
        'country.code': country.toUpperCase(),
        'indicator.subcategory': indicator,
        value: { $ne: null }
      })
      .sort({ year: -1 })
      .lean();
      
      if (latestData) {
        dashboardData[indicator] = {
          value: latestData.value,
          year: latestData.year,
          unit: latestData.unit,
          name: latestData.indicator.name
        };
      }
    }
    
    // Get data freshness info
    const freshness = await worldBankService.getDataFreshness();
    
    res.json({
      success: true,
      country: country.toUpperCase(),
      data: dashboardData,
      freshness,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
};

/**
 * Trigger data refresh
 * POST /api/worldbank/refresh
 */
export const refreshData = async (req, res) => {
  try {
    const { categories, countries } = req.body;
    
    console.log('🔄 Starting World Bank data refresh...');
    
    // First refresh countries
    const countryResult = await worldBankService.fetchCountries();
    
    // Then refresh indicator data
    const indicatorResult = await worldBankService.fetchIndicatorData(countries, categories);
    
    res.json({
      success: true,
      message: 'Data refresh completed',
      results: {
        countries: countryResult,
        indicators: indicatorResult
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error refreshing data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data',
      message: error.message
    });
  }
};

/**
 * Get data statistics
 * GET /api/worldbank/stats
 */
export const getDataStats = async (req, res) => {
  try {
    const totalIndicators = await WorldBankIndicator.countDocuments();
    const totalCountries = await WorldBankCountry.countDocuments();
    
    // Get breakdown by category
    const categoryStats = await WorldBankIndicator.aggregate([
      {
        $group: {
          _id: '$indicator.category',
          count: { $sum: 1 },
          latestYear: { $max: '$year' },
          earliestYear: { $min: '$year' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get breakdown by country (top 10)
    const countryStats = await WorldBankIndicator.aggregate([
      {
        $group: {
          _id: '$country.code',
          name: { $first: '$country.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get data freshness
    const freshness = await worldBankService.getDataFreshness();
    
    res.json({
      success: true,
      stats: {
        totalIndicators,
        totalCountries,
        categoryBreakdown: categoryStats,
        topCountries: countryStats,
        freshness
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
};