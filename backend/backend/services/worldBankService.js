import fetch from 'node-fetch';
import WorldBankIndicator from '../models/WorldBankIndicator.js';
import WorldBankCountry from '../models/WorldBankCountry.js';

/**
 * World Bank Open Data API Service
 * Handles fetching, processing, and storing World Bank data
 */
class WorldBankService {
  constructor() {
    this.baseUrl = 'https://api.worldbank.org/v2';
    this.defaultParams = {
      format: 'json',
      per_page: 1000,
      date: '2000:2024' // Default date range
    };
    
    // Define indicator mappings with categories
    this.indicators = {
      // Economy indicators
      economy: {
        'NY.GDP.MKTP.CD': { name: 'GDP (current US$)', subcategory: 'gdp', unit: 'current US$' },
        'NY.GDP.PCAP.CD': { name: 'GDP per capita (current US$)', subcategory: 'gdp-per-capita', unit: 'current US$' },
        'FP.CPI.TOTL.ZG': { name: 'Inflation, consumer prices (annual %)', subcategory: 'inflation', unit: '%' },
        'BX.KLT.DINV.CD.WD': { name: 'Foreign direct investment, net inflows (BoP, current US$)', subcategory: 'fdi', unit: 'current US$' },
        'NE.TRD.GNFS.ZS': { name: 'Trade (% of GDP)', subcategory: 'trade', unit: '% of GDP' },
        'BN.CAB.XOKA.CD': { name: 'Current account balance (BoP, current US$)', subcategory: 'trade-balance', unit: 'current US$' },
        'FR.INR.RINR': { name: 'Real interest rate (%)', subcategory: 'interest-rate', unit: '%' },
        'GC.DOD.TOTL.GD.ZS': { name: 'Central government debt, total (% of GDP)', subcategory: 'debt', unit: '% of GDP' }
      },
      
      // Business indicators
      business: {
        'IC.BUS.EASE.XQ': { name: 'Ease of doing business score', subcategory: 'ease-of-business', unit: 'score' },
        'IC.REG.DURS': { name: 'Time required to start a business (days)', subcategory: 'business-registration', unit: 'days' },
        'IC.TAX.TOTL.CP.ZS': { name: 'Total tax and contribution rate (% of profit)', subcategory: 'tax-rate', unit: '% of profit' },
        'IC.CRD.INFO.XQ': { name: 'Depth of credit information index', subcategory: 'credit-info', unit: 'index' },
        'IC.LGL.CRED.XQ': { name: 'Strength of legal rights index', subcategory: 'legal-rights', unit: 'index' }
      },
      
      // Social indicators
      social: {
        'SP.POP.TOTL': { name: 'Population, total', subcategory: 'population', unit: 'people' },
        'SP.POP.GROW': { name: 'Population growth (annual %)', subcategory: 'population-growth', unit: '%' },
        'SL.UEM.TOTL.ZS': { name: 'Unemployment, total (% of total labor force)', subcategory: 'unemployment', unit: '%' },
        'SI.POV.GINI': { name: 'Gini index', subcategory: 'inequality', unit: 'index' },
        'SP.URB.TOTL.IN.ZS': { name: 'Urban population (% of total population)', subcategory: 'urbanization', unit: '%' },
        'SP.DYN.LE00.IN': { name: 'Life expectancy at birth, total (years)', subcategory: 'life-expectancy', unit: 'years' }
      },
      
      // Environment indicators
      environment: {
        'EN.ATM.CO2E.PC': { name: 'CO2 emissions (metric tons per capita)', subcategory: 'co2-emissions', unit: 'metric tons per capita' },
        'EG.USE.PCAP.KG.OE': { name: 'Energy use (kg of oil equivalent per capita)', subcategory: 'energy-use', unit: 'kg of oil equivalent per capita' },
        'AG.LND.FRST.ZS': { name: 'Forest area (% of land area)', subcategory: 'forest-area', unit: '% of land area' },
        'ER.H2O.FWTL.ZS': { name: 'Annual freshwater withdrawals, total (% of internal resources)', subcategory: 'water-use', unit: '%' },
        'EN.ATM.PM25.MC.M3': { name: 'PM2.5 air pollution, mean annual exposure', subcategory: 'air-pollution', unit: 'micrograms per cubic meter' }
      },
      
      // Health indicators
      health: {
        'SP.DYN.LE00.IN': { name: 'Life expectancy at birth, total (years)', subcategory: 'life-expectancy', unit: 'years' },
        'SP.DYN.IMRT.IN': { name: 'Mortality rate, infant (per 1,000 live births)', subcategory: 'infant-mortality', unit: 'per 1,000 live births' },
        'SH.STA.MMRT': { name: 'Maternal mortality ratio', subcategory: 'maternal-mortality', unit: 'per 100,000 live births' },
        'SH.XPD.CHEX.GD.ZS': { name: 'Current health expenditure (% of GDP)', subcategory: 'health-expenditure', unit: '% of GDP' },
        'SH.MED.PHYS.ZS': { name: 'Physicians (per 1,000 people)', subcategory: 'physicians', unit: 'per 1,000 people' },
        'SH.IMM.MEAS': { name: 'Immunization, measles (% of children ages 12-23 months)', subcategory: 'immunization', unit: '%' }
      },
      
      // Education indicators
      education: {
        'SE.ADT.LITR.ZS': { name: 'Literacy rate, adult total (% of people ages 15 and above)', subcategory: 'literacy', unit: '%' },
        'SE.PRM.NENR': { name: 'School enrollment, primary (% net)', subcategory: 'primary-enrollment', unit: '%' },
        'SE.SEC.NENR': { name: 'School enrollment, secondary (% net)', subcategory: 'secondary-enrollment', unit: '%' },
        'SE.TER.ENRR': { name: 'School enrollment, tertiary (% gross)', subcategory: 'tertiary-enrollment', unit: '%' },
        'SE.XPD.TOTL.GD.ZS': { name: 'Government expenditure on education, total (% of GDP)', subcategory: 'education-expenditure', unit: '% of GDP' }
      },
      
      // Infrastructure indicators
      infrastructure: {
        'IT.NET.USER.ZS': { name: 'Individuals using the Internet (% of population)', subcategory: 'internet-users', unit: '%' },
        'IT.CEL.SETS.P2': { name: 'Mobile cellular subscriptions (per 100 people)', subcategory: 'mobile-subscriptions', unit: 'per 100 people' },
        'EG.ELC.ACCS.ZS': { name: 'Access to electricity (% of population)', subcategory: 'electricity-access', unit: '%' },
        'SH.H2O.BASW.ZS': { name: 'People using at least basic drinking water services (% of population)', subcategory: 'water-access', unit: '%' },
        'IS.ROD.PAVE.ZS': { name: 'Roads, paved (% of total roads)', subcategory: 'paved-roads', unit: '%' }
      }
    };
    
    // Priority countries for initial data fetch
    this.priorityCountries = [
      'IN', 'US', 'CN', 'JP', 'DE', 'GB', 'FR', 'BR', 'CA', 'AU',
      'RU', 'KR', 'IT', 'ES', 'MX', 'ID', 'NL', 'SA', 'TR', 'CH'
    ];
  }

  /**
   * Fetch countries data from World Bank API
   */
  async fetchCountries() {
    try {
      console.log('🌍 Fetching countries data from World Bank API...');
      
      const url = `${this.baseUrl}/country?format=json&per_page=300`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const countries = data[1]; // World Bank API returns [metadata, data]
      
      if (!countries) {
        throw new Error('No countries data received');
      }
      
      console.log(`📊 Processing ${countries.length} countries...`);
      
      let savedCount = 0;
      let updatedCount = 0;
      
      for (const country of countries) {
        try {
          const countryData = {
            code: country.id,
            name: country.name,
            region: {
              code: country.region?.id || '',
              name: country.region?.value || ''
            },
            incomeLevel: {
              code: country.incomeLevel?.id || '',
              name: country.incomeLevel?.value || ''
            },
            capitalCity: country.capitalCity || '',
            longitude: parseFloat(country.longitude) || null,
            latitude: parseFloat(country.latitude) || null,
            lastUpdated: new Date()
          };
          
          const existingCountry = await WorldBankCountry.findOne({ code: country.id });
          
          if (existingCountry) {
            await WorldBankCountry.findByIdAndUpdate(existingCountry._id, countryData);
            updatedCount++;
          } else {
            await WorldBankCountry.create(countryData);
            savedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing country ${country.id}:`, error.message);
        }
      }
      
      console.log(`✅ Countries processed: ${savedCount} new, ${updatedCount} updated`);
      return { savedCount, updatedCount };
      
    } catch (error) {
      console.error('❌ Error fetching countries:', error.message);
      throw error;
    }
  }

  /**
   * Fetch indicator data for specific countries and indicators
   */
  async fetchIndicatorData(countries = this.priorityCountries, categories = null) {
    try {
      console.log('📊 Starting World Bank indicator data fetch...');
      
      const categoriesToFetch = categories || Object.keys(this.indicators);
      let totalProcessed = 0;
      let totalSaved = 0;
      let totalUpdated = 0;
      
      for (const category of categoriesToFetch) {
        console.log(`📈 Processing ${category} indicators...`);
        
        const indicators = this.indicators[category];
        
        for (const [indicatorCode, indicatorInfo] of Object.entries(indicators)) {
          console.log(`  📊 Fetching ${indicatorInfo.name}...`);
          
          for (const countryCode of countries) {
            try {
              const result = await this.fetchSingleIndicator(countryCode, indicatorCode, category, indicatorInfo);
              totalProcessed += result.processed;
              totalSaved += result.saved;
              totalUpdated += result.updated;
              
              // Rate limiting - wait between requests
              await this.delay(100);
              
            } catch (error) {
              console.error(`❌ Error fetching ${indicatorCode} for ${countryCode}:`, error.message);
            }
          }
        }
      }
      
      console.log(`✅ Data fetch completed: ${totalProcessed} processed, ${totalSaved} new, ${totalUpdated} updated`);
      return { totalProcessed, totalSaved, totalUpdated };
      
    } catch (error) {
      console.error('❌ Error in fetchIndicatorData:', error.message);
      throw error;
    }
  }

  /**
   * Fetch data for a single indicator and country
   */
  async fetchSingleIndicator(countryCode, indicatorCode, category, indicatorInfo) {
    try {
      const url = `${this.baseUrl}/country/${countryCode}/indicator/${indicatorCode}?format=json&per_page=100&date=2000:2024`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const indicatorData = data[1]; // World Bank API returns [metadata, data]
      
      if (!indicatorData || indicatorData.length === 0) {
        return { processed: 0, saved: 0, updated: 0 };
      }
      
      let processed = 0;
      let saved = 0;
      let updated = 0;
      
      for (const dataPoint of indicatorData) {
        if (dataPoint.value !== null) {
          try {
            const indicatorDocument = {
              country: {
                code: dataPoint.country.id,
                name: dataPoint.country.value
              },
              indicator: {
                code: indicatorCode,
                name: indicatorInfo.name,
                category: category,
                subcategory: indicatorInfo.subcategory
              },
              year: parseInt(dataPoint.date),
              value: parseFloat(dataPoint.value),
              unit: indicatorInfo.unit,
              lastUpdated: new Date()
            };
            
            const existingRecord = await WorldBankIndicator.findOne({
              'country.code': dataPoint.country.id,
              'indicator.code': indicatorCode,
              year: parseInt(dataPoint.date)
            });
            
            if (existingRecord) {
              await WorldBankIndicator.findByIdAndUpdate(existingRecord._id, indicatorDocument);
              updated++;
            } else {
              await WorldBankIndicator.create(indicatorDocument);
              saved++;
            }
            
            processed++;
          } catch (error) {
            console.error(`❌ Error saving data point:`, error.message);
          }
        }
      }
      
      return { processed, saved, updated };
      
    } catch (error) {
      console.error(`❌ Error fetching single indicator ${indicatorCode}:`, error.message);
      return { processed: 0, saved: 0, updated: 0 };
    }
  }

  /**
   * Get available indicators by category
   */
  getIndicatorsByCategory(category) {
    return this.indicators[category] || {};
  }

  /**
   * Get all available categories
   */
  getCategories() {
    return Object.keys(this.indicators);
  }

  /**
   * Get indicator information
   */
  getIndicatorInfo(indicatorCode) {
    for (const category of Object.keys(this.indicators)) {
      if (this.indicators[category][indicatorCode]) {
        return {
          ...this.indicators[category][indicatorCode],
          category,
          code: indicatorCode
        };
      }
    }
    return null;
  }

  /**
   * Utility function for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get data freshness status
   */
  async getDataFreshness() {
    try {
      const latestUpdate = await WorldBankIndicator.findOne()
        .sort({ lastUpdated: -1 })
        .select('lastUpdated');
      
      const totalRecords = await WorldBankIndicator.countDocuments();
      const totalCountries = await WorldBankCountry.countDocuments();
      
      return {
        latestUpdate: latestUpdate?.lastUpdated || null,
        totalRecords,
        totalCountries,
        needsUpdate: !latestUpdate || (Date.now() - latestUpdate.lastUpdated.getTime()) > 24 * 60 * 60 * 1000
      };
    } catch (error) {
      console.error('❌ Error checking data freshness:', error.message);
      return { needsUpdate: true, totalRecords: 0, totalCountries: 0 };
    }
  }
}

export default WorldBankService;