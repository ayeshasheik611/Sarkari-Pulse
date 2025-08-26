// Backend World Bank Service - connects to your local backend API
export interface BackendWorldBankData {
  country: {
    code: string;
    name: string;
  };
  indicator: {
    code: string;
    name: string;
    category: string;
    subcategory: string;
  };
  year: number;
  value: number;
  unit: string;
  dataSource: string;
}

export interface BackendApiResponse {
  success: boolean;
  data: BackendWorldBankData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  timestamp: string;
}

export interface ProcessedCountryData {
  code: string;
  name: string;
  region: string;
  population: number;
  gdp: number;
  gdpPerCapita: number;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  exports: number;
  imports: number;
  energyUse: number;
  co2Emissions: number;
  renewableEnergy: number;
  lifeExpectancy: number;
  lastUpdated: string;
  trendData: {
    year: number;
    gdp: number;
    gdpGrowth: number;
    inflation: number;
    population: number;
  }[];
}

class BackendWorldBankService {
  private baseUrl = 'http://localhost:9000/api/worldbank';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchFromBackend(endpoint: string, params?: Record<string, string>): Promise<BackendApiResponse> {
    const queryParams = new URLSearchParams(params);
    const url = `${this.baseUrl}${endpoint}${params ? `?${queryParams}` : ''}`;
    const cacheKey = url;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      console.log(`🔄 Fetching from backend: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} - ${response.statusText}`);
      }
      
      const data: BackendApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Backend API returned unsuccessful response');
      }

      this.setCache(cacheKey, data);
      console.log(`✅ Fetched ${data.data.length} records from backend`);
      return data;
    } catch (error) {
      console.error('Backend API fetch error:', error);
      throw error;
    }
  }

  // Get all countries
  async getCountries(): Promise<{ code: string; name: string; region: string }[]> {
    try {
      const response = await this.fetchFromBackend('/countries');
      
      // Process countries data to extract unique countries with regions
      const countriesMap = new Map<string, { code: string; name: string; region: string }>();
      
      response.data.forEach(item => {
        if (!countriesMap.has(item.country.code)) {
          countriesMap.set(item.country.code, {
            code: item.country.code,
            name: item.country.name,
            region: this.getRegionFromCountryCode(item.country.code) // You might want to add region to your backend
          });
        }
      });

      return Array.from(countriesMap.values());
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }

  // Get dashboard summary data
  async getDashboardData(): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/dashboard');
  }

  // Get economic indicators
  async getEconomicData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/economy', params as Record<string, string>);
  }

  // Get business indicators
  async getBusinessData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/business', params as Record<string, string>);
  }

  // Get social indicators
  async getSocialData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/social', params as Record<string, string>);
  }

  // Get environmental indicators
  async getEnvironmentData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/environment', params as Record<string, string>);
  }

  // Get health indicators
  async getHealthData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/health', params as Record<string, string>);
  }

  // Get specific indicator data (GDP, inflation, etc.)
  async getGDPData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/gdp', params as Record<string, string>);
  }

  async getInflationData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/inflation', params as Record<string, string>);
  }

  async getPopulationData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/population', params as Record<string, string>);
  }

  async getUnemploymentData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/unemployment', params as Record<string, string>);
  }

  async getCO2EmissionsData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/co2-emissions', params as Record<string, string>);
  }

  async getLifeExpectancyData(params?: { country?: string; startYear?: number; endYear?: number }): Promise<BackendApiResponse> {
    return this.fetchFromBackend('/life-expectancy', params as Record<string, string>);
  }

  // Process and combine data from multiple endpoints to create ProcessedCountryData
  async getProcessedCountryData(
    countries: string[] = [],
    startYear: number = 2019,
    endYear: number = 2023
  ): Promise<ProcessedCountryData[]> {
    try {
      console.log(`🔄 Processing data for ${countries.length || 'all'} countries (${startYear}-${endYear})`);
      
      const params = {
        startYear: startYear.toString(),
        endYear: endYear.toString(),
        ...(countries.length > 0 && { country: countries.join(',') })
      };

      // Fetch all required data in parallel
      const [
        economicData,
        businessData,
        socialData,
        environmentData,
        healthData
      ] = await Promise.all([
        this.getEconomicData(params),
        this.getBusinessData(params),
        this.getSocialData(params),
        this.getEnvironmentData(params),
        this.getHealthData(params)
      ]);

      // Combine all data
      const allData = [
        ...economicData.data,
        ...businessData.data,
        ...socialData.data,
        ...environmentData.data,
        ...healthData.data
      ];

      // Group by country
      const countryDataMap = new Map<string, BackendWorldBankData[]>();
      allData.forEach(item => {
        const countryCode = item.country.code;
        if (!countryDataMap.has(countryCode)) {
          countryDataMap.set(countryCode, []);
        }
        countryDataMap.get(countryCode)!.push(item);
      });

      // Process each country's data
      const processedData: ProcessedCountryData[] = [];
      
      for (const [countryCode, countryData] of countryDataMap) {
        const countryName = countryData[0]?.country.name || countryCode;
        
        // Helper function to get latest value for an indicator
        const getLatestValue = (indicatorCode: string): number => {
          const items = countryData
            .filter(item => item.indicator.code === indicatorCode)
            .sort((a, b) => b.year - a.year);
          return items[0]?.value || 0;
        };

        // Helper function to get trend data
        const getTrendData = () => {
          const trends: ProcessedCountryData['trendData'] = [];
          for (let year = startYear; year <= endYear; year++) {
            const yearData = countryData.filter(item => item.year === year);
            if (yearData.length > 0) {
              trends.push({
                year,
                gdp: yearData.find(item => item.indicator.code === 'NY.GDP.MKTP.CD')?.value || 0,
                gdpGrowth: yearData.find(item => item.indicator.code === 'NY.GDP.MKTP.KD.ZG')?.value || 0,
                inflation: yearData.find(item => item.indicator.code === 'FP.CPI.TOTL.ZG')?.value || 0,
                population: yearData.find(item => item.indicator.code === 'SP.POP.TOTL')?.value || 0
              });
            }
          }
          return trends;
        };

        const processedCountry: ProcessedCountryData = {
          code: countryCode,
          name: countryName,
          region: this.getRegionFromCountryCode(countryCode),
          population: getLatestValue('SP.POP.TOTL'),
          gdp: getLatestValue('NY.GDP.MKTP.CD'),
          gdpPerCapita: getLatestValue('NY.GDP.PCAP.CD'),
          gdpGrowth: getLatestValue('NY.GDP.MKTP.KD.ZG'),
          inflation: getLatestValue('FP.CPI.TOTL.ZG'),
          unemployment: getLatestValue('SL.UEM.TOTL.ZS'),
          exports: getLatestValue('NE.EXP.GNFS.CD'),
          imports: getLatestValue('NE.IMP.GNFS.CD'),
          energyUse: getLatestValue('EG.USE.PCAP.KG.OE'),
          co2Emissions: getLatestValue('EN.ATM.CO2E.PC'),
          renewableEnergy: getLatestValue('EG.FEC.RNEW.ZS'),
          lifeExpectancy: getLatestValue('SP.DYN.LE00.IN'),
          lastUpdated: new Date().toISOString(),
          trendData: getTrendData()
        };

        // Only include countries with meaningful data
        if (processedCountry.gdp > 0 || processedCountry.population > 0) {
          processedData.push(processedCountry);
        }
      }

      console.log(`✅ Processed ${processedData.length} countries with complete data`);
      return processedData.sort((a, b) => b.gdp - a.gdp); // Sort by GDP descending
    } catch (error) {
      console.error('Error processing country data:', error);
      return [];
    }
  }

  // Get top countries by GDP
  async getTopCountriesByGDP(limit: number = 10): Promise<ProcessedCountryData[]> {
    const data = await this.getProcessedCountryData();
    return data.slice(0, limit);
  }

  // Get energy mix data
  async getEnergyMixData(): Promise<{ renewable: number; nonRenewable: number }> {
    try {
      const environmentData = await this.getEnvironmentData();
      const renewableData = environmentData.data.filter(item => 
        item.indicator.code === 'EG.FEC.RNEW.ZS' && item.year >= 2020
      );

      if (renewableData.length === 0) {
        return { renewable: 15, nonRenewable: 85 }; // Fallback
      }

      const avgRenewable = renewableData.reduce((sum, item) => sum + item.value, 0) / renewableData.length;
      return {
        renewable: avgRenewable,
        nonRenewable: 100 - avgRenewable
      };
    } catch (error) {
      console.error('Error fetching energy mix data:', error);
      return { renewable: 15, nonRenewable: 85 };
    }
  }

  // Get GDP trends for specific countries
  async getGDPTrendsForCountries(countryCodes: string[]): Promise<{
    [countryCode: string]: { year: number; gdp: number; growth: number }[]
  }> {
    try {
      const results: { [countryCode: string]: { year: number; gdp: number; growth: number }[] } = {};
      
      for (const countryCode of countryCodes) {
        const [gdpData, growthData] = await Promise.all([
          this.getGDPData({ country: countryCode, startYear: 2000, endYear: 2023 }),
          this.fetchFromBackend('/gdp', { country: countryCode, startYear: 2000, endYear: 2023 })
        ]);

        const trends: { year: number; gdp: number; growth: number }[] = [];
        
        // Combine GDP and growth data by year
        const gdpByYear = new Map<number, number>();
        const growthByYear = new Map<number, number>();

        gdpData.data.forEach(item => {
          if (item.indicator.code === 'NY.GDP.MKTP.CD') {
            gdpByYear.set(item.year, item.value);
          }
        });

        growthData.data.forEach(item => {
          if (item.indicator.code === 'NY.GDP.MKTP.KD.ZG') {
            growthByYear.set(item.year, item.value);
          }
        });

        // Create trend data
        for (let year = 2000; year <= 2023; year++) {
          const gdp = gdpByYear.get(year) || 0;
          const growth = growthByYear.get(year) || 0;
          
          if (gdp > 0) {
            trends.push({ year, gdp, growth });
          }
        }

        results[countryCode] = trends;
      }

      return results;
    } catch (error) {
      console.error('Error fetching GDP trends:', error);
      return {};
    }
  }

  // Refresh backend data
  async refreshData(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      // Clear cache after refresh
      this.cache.clear();
      console.log('✅ Backend data refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing backend data:', error);
      return false;
    }
  }

  // Export data
  async exportData(data: ProcessedCountryData[], format: 'csv' | 'json' = 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    const headers = [
      'Country Code', 'Country Name', 'Region', 'Population', 'GDP (USD)', 
      'GDP per Capita (USD)', 'GDP Growth (%)', 'Inflation (%)', 
      'Unemployment (%)', 'Exports (USD)', 'Imports (USD)', 
      'Energy Use (kg oil eq per capita)', 'CO2 Emissions (metric tons per capita)',
      'Renewable Energy (%)', 'Life Expectancy (years)', 'Last Updated'
    ];

    const csvRows = [headers.join(',')];
    
    data.forEach(country => {
      const row = [
        country.code,
        `"${country.name}"`,
        `"${country.region}"`,
        country.population,
        country.gdp,
        country.gdpPerCapita,
        country.gdpGrowth,
        country.inflation,
        country.unemployment,
        country.exports,
        country.imports,
        country.energyUse,
        country.co2Emissions,
        country.renewableEnergy,
        country.lifeExpectancy,
        country.lastUpdated
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Helper function to map country codes to regions
  private getRegionFromCountryCode(countryCode: string): string {
    const regionMap: { [key: string]: string } = {
      // North America
      'US': 'North America', 'CA': 'North America', 'MX': 'North America',
      
      // Europe
      'GB': 'Europe', 'DE': 'Europe', 'FR': 'Europe', 'IT': 'Europe', 'ES': 'Europe',
      'NL': 'Europe', 'BE': 'Europe', 'CH': 'Europe', 'AT': 'Europe', 'SE': 'Europe',
      'NO': 'Europe', 'DK': 'Europe', 'FI': 'Europe', 'IE': 'Europe', 'PT': 'Europe',
      'GR': 'Europe', 'PL': 'Europe', 'CZ': 'Europe', 'HU': 'Europe', 'SK': 'Europe',
      'RO': 'Europe', 'BG': 'Europe', 'HR': 'Europe', 'SI': 'Europe', 'EE': 'Europe',
      'LV': 'Europe', 'LT': 'Europe', 'LU': 'Europe', 'MT': 'Europe', 'CY': 'Europe',
      
      // Asia
      'CN': 'East Asia & Pacific', 'JP': 'East Asia & Pacific', 'KR': 'East Asia & Pacific',
      'IN': 'South Asia', 'ID': 'East Asia & Pacific', 'TH': 'East Asia & Pacific',
      'MY': 'East Asia & Pacific', 'SG': 'East Asia & Pacific', 'PH': 'East Asia & Pacific',
      'VN': 'East Asia & Pacific', 'BD': 'South Asia', 'PK': 'South Asia',
      'LK': 'South Asia', 'MM': 'East Asia & Pacific', 'KH': 'East Asia & Pacific',
      'LA': 'East Asia & Pacific', 'MN': 'East Asia & Pacific', 'TW': 'East Asia & Pacific',
      
      // Middle East
      'SA': 'Middle East & North Africa', 'AE': 'Middle East & North Africa',
      'QA': 'Middle East & North Africa', 'KW': 'Middle East & North Africa',
      'BH': 'Middle East & North Africa', 'OM': 'Middle East & North Africa',
      'IL': 'Middle East & North Africa', 'TR': 'Europe & Central Asia',
      'IR': 'Middle East & North Africa', 'IQ': 'Middle East & North Africa',
      'JO': 'Middle East & North Africa', 'LB': 'Middle East & North Africa',
      'SY': 'Middle East & North Africa', 'YE': 'Middle East & North Africa',
      
      // Africa
      'ZA': 'Sub-Saharan Africa', 'NG': 'Sub-Saharan Africa', 'EG': 'Middle East & North Africa',
      'KE': 'Sub-Saharan Africa', 'GH': 'Sub-Saharan Africa', 'ET': 'Sub-Saharan Africa',
      'TZ': 'Sub-Saharan Africa', 'UG': 'Sub-Saharan Africa', 'ZW': 'Sub-Saharan Africa',
      'ZM': 'Sub-Saharan Africa', 'MW': 'Sub-Saharan Africa', 'MZ': 'Sub-Saharan Africa',
      'MG': 'Sub-Saharan Africa', 'AO': 'Sub-Saharan Africa', 'CM': 'Sub-Saharan Africa',
      'CI': 'Sub-Saharan Africa', 'SN': 'Sub-Saharan Africa', 'ML': 'Sub-Saharan Africa',
      'BF': 'Sub-Saharan Africa', 'NE': 'Sub-Saharan Africa', 'TD': 'Sub-Saharan Africa',
      'SD': 'Sub-Saharan Africa', 'SS': 'Sub-Saharan Africa', 'ER': 'Sub-Saharan Africa',
      'DJ': 'Sub-Saharan Africa', 'SO': 'Sub-Saharan Africa', 'RW': 'Sub-Saharan Africa',
      'BI': 'Sub-Saharan Africa', 'CF': 'Sub-Saharan Africa', 'CG': 'Sub-Saharan Africa',
      'CD': 'Sub-Saharan Africa', 'GA': 'Sub-Saharan Africa', 'GQ': 'Sub-Saharan Africa',
      'ST': 'Sub-Saharan Africa', 'CV': 'Sub-Saharan Africa', 'GM': 'Sub-Saharan Africa',
      'GW': 'Sub-Saharan Africa', 'LR': 'Sub-Saharan Africa', 'SL': 'Sub-Saharan Africa',
      'TG': 'Sub-Saharan Africa', 'BJ': 'Sub-Saharan Africa', 'GN': 'Sub-Saharan Africa',
      'MR': 'Sub-Saharan Africa', 'DZ': 'Middle East & North Africa',
      'TN': 'Middle East & North Africa', 'LY': 'Middle East & North Africa',
      'MA': 'Middle East & North Africa', 'EH': 'Middle East & North Africa',
      
      // South America
      'BR': 'Latin America & Caribbean', 'AR': 'Latin America & Caribbean',
      'CL': 'Latin America & Caribbean', 'PE': 'Latin America & Caribbean',
      'CO': 'Latin America & Caribbean', 'VE': 'Latin America & Caribbean',
      'EC': 'Latin America & Caribbean', 'BO': 'Latin America & Caribbean',
      'PY': 'Latin America & Caribbean', 'UY': 'Latin America & Caribbean',
      'GY': 'Latin America & Caribbean', 'SR': 'Latin America & Caribbean',
      'GF': 'Latin America & Caribbean',
      
      // Central America & Caribbean
      'GT': 'Latin America & Caribbean', 'BZ': 'Latin America & Caribbean',
      'SV': 'Latin America & Caribbean', 'HN': 'Latin America & Caribbean',
      'NI': 'Latin America & Caribbean', 'CR': 'Latin America & Caribbean',
      'PA': 'Latin America & Caribbean', 'CU': 'Latin America & Caribbean',
      'JM': 'Latin America & Caribbean', 'HT': 'Latin America & Caribbean',
      'DO': 'Latin America & Caribbean', 'PR': 'Latin America & Caribbean',
      'TT': 'Latin America & Caribbean', 'BB': 'Latin America & Caribbean',
      'LC': 'Latin America & Caribbean', 'VC': 'Latin America & Caribbean',
      'GD': 'Latin America & Caribbean', 'AG': 'Latin America & Caribbean',
      'KN': 'Latin America & Caribbean', 'DM': 'Latin America & Caribbean',
      'BS': 'Latin America & Caribbean',
      
      // Oceania
      'AU': 'East Asia & Pacific', 'NZ': 'East Asia & Pacific',
      'PG': 'East Asia & Pacific', 'FJ': 'East Asia & Pacific',
      'SB': 'East Asia & Pacific', 'NC': 'East Asia & Pacific',
      'PF': 'East Asia & Pacific', 'VU': 'East Asia & Pacific',
      'WS': 'East Asia & Pacific', 'TO': 'East Asia & Pacific',
      'KI': 'East Asia & Pacific', 'TV': 'East Asia & Pacific',
      'NR': 'East Asia & Pacific', 'PW': 'East Asia & Pacific',
      'FM': 'East Asia & Pacific', 'MH': 'East Asia & Pacific',
      
      // Eastern Europe & Central Asia
      'RU': 'Europe & Central Asia', 'UA': 'Europe & Central Asia',
      'BY': 'Europe & Central Asia', 'MD': 'Europe & Central Asia',
      'GE': 'Europe & Central Asia', 'AM': 'Europe & Central Asia',
      'AZ': 'Europe & Central Asia', 'KZ': 'Europe & Central Asia',
      'KG': 'Europe & Central Asia', 'TJ': 'Europe & Central Asia',
      'TM': 'Europe & Central Asia', 'UZ': 'Europe & Central Asia',
      'AF': 'South Asia', 'MV': 'South Asia', 'BT': 'South Asia'
    };

    return regionMap[countryCode] || 'Other';
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

export const backendWorldBankService = new BackendWorldBankService();