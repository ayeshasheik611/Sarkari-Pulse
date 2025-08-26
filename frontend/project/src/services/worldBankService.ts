// World Bank API Service for fetching real economic data
export interface WorldBankIndicator {
  id: string;
  name: string;
  sourceNote: string;
  sourceOrganization: string;
}

export interface WorldBankCountry {
  id: string;
  iso2Code: string;
  name: string;
  region: {
    id: string;
    iso2code: string;
    value: string;
  };
  adminregion: {
    id: string;
    iso2code: string;
    value: string;
  };
  incomeLevel: {
    id: string;
    iso2code: string;
    value: string;
  };
  lendingType: {
    id: string;
    iso2code: string;
    value: string;
  };
  capitalCity: string;
  longitude: string;
  latitude: string;
}

export interface WorldBankDataPoint {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
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
  lastUpdated: string;
  trendData: {
    year: number;
    gdp: number;
    gdpGrowth: number;
    inflation: number;
    population: number;
  }[];
}

export interface FilterOptions {
  countries?: string[];
  regions?: string[];
  indicators?: string[];
  startYear?: number;
  endYear?: number;
}

class WorldBankService {
  private baseUrl = 'https://api.worldbank.org/v2';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes

  // World Bank Indicator IDs for key economic metrics
  private indicators = {
    GDP: 'NY.GDP.MKTP.CD',
    GDP_PER_CAPITA: 'NY.GDP.PCAP.CD',
    GDP_GROWTH: 'NY.GDP.MKTP.KD.ZG',
    POPULATION: 'SP.POP.TOTL',
    INFLATION: 'FP.CPI.TOTL.ZG',
    UNEMPLOYMENT: 'SL.UEM.TOTL.ZS',
    EXPORTS: 'NE.EXP.GNFS.CD',
    IMPORTS: 'NE.IMP.GNFS.CD',
    ENERGY_USE: 'EG.USE.PCAP.KG.OE',
    CO2_EMISSIONS: 'EN.ATM.CO2E.PC',
    RENEWABLE_ENERGY: 'EG.FEC.RNEW.ZS',
    TRADE_BALANCE: 'NE.RSB.GNFS.CD',
    FOREIGN_INVESTMENT: 'BX.KLT.DINV.CD.WD',
    GOVERNMENT_DEBT: 'GC.DOD.TOTL.GD.ZS'
  };

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

  private async fetchFromAPI(endpoint: string): Promise<any> {
    const cacheKey = endpoint;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}?format=json&per_page=500`);
      if (!response.ok) {
        throw new Error(`World Bank API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('World Bank API fetch error:', error);
      throw error;
    }
  }

  async getCountries(): Promise<WorldBankCountry[]> {
    try {
      const data = await this.fetchFromAPI('/countries');
      return data[1] || []; // World Bank API returns [metadata, data]
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }

  async getIndicators(): Promise<WorldBankIndicator[]> {
    try {
      const data = await this.fetchFromAPI('/indicators');
      return data[1] || [];
    } catch (error) {
      console.error('Error fetching indicators:', error);
      return [];
    }
  }

  async getIndicatorData(
    indicatorId: string, 
    countries: string[] = [], 
    startYear: number = 2019, 
    endYear: number = 2023
  ): Promise<WorldBankDataPoint[]> {
    try {
      const countryParam = countries.length > 0 ? countries.join(';') : 'all';
      const endpoint = `/countries/${countryParam}/indicators/${indicatorId}`;
      const params = `&date=${startYear}:${endYear}`;
      
      const data = await this.fetchFromAPI(`${endpoint}${params}`);
      return data[1] || [];
    } catch (error) {
      console.error(`Error fetching indicator ${indicatorId}:`, error);
      return [];
    }
  }

  async getMultipleIndicators(
    indicatorIds: string[], 
    countries: string[] = [], 
    startYear: number = 2019, 
    endYear: number = 2023
  ): Promise<{ [indicatorId: string]: WorldBankDataPoint[] }> {
    const results: { [indicatorId: string]: WorldBankDataPoint[] } = {};
    
    // Fetch all indicators in parallel
    const promises = indicatorIds.map(async (indicatorId) => {
      const data = await this.getIndicatorData(indicatorId, countries, startYear, endYear);
      results[indicatorId] = data;
    });

    await Promise.all(promises);
    return results;
  }

  async getProcessedCountryData(
    countries: string[] = [],
    startYear: number = 2019,
    endYear: number = 2023
  ): Promise<ProcessedCountryData[]> {
    try {
      // Get all countries if none specified
      const allCountries = await this.getCountries();
      const targetCountries = countries.length > 0 
        ? countries 
        : allCountries
            .filter(c => c.region.value !== 'Aggregates' && c.incomeLevel.value !== 'Aggregates')
            .map(c => c.iso2Code)
            .slice(0, 50); // Limit to 50 countries for performance

      // Fetch all required indicators
      const indicatorData = await this.getMultipleIndicators(
        Object.values(this.indicators),
        targetCountries,
        startYear,
        endYear
      );

      // Process and combine data by country
      const processedData: ProcessedCountryData[] = [];
      const countryMap = new Map(allCountries.map(c => [c.iso2Code, c]));

      for (const countryCode of targetCountries) {
        const country = countryMap.get(countryCode);
        if (!country) continue;

        // Get latest values for each indicator
        const getLatestValue = (indicatorId: string): number => {
          const data = indicatorData[indicatorId] || [];
          const countryData = data
            .filter(d => d.country.id === countryCode && d.value !== null)
            .sort((a, b) => parseInt(b.date) - parseInt(a.date));
          return countryData[0]?.value || 0;
        };

        // Build trend data
        const trendData: ProcessedCountryData['trendData'] = [];
        for (let year = startYear; year <= endYear; year++) {
          const yearStr = year.toString();
          trendData.push({
            year,
            gdp: indicatorData[this.indicators.GDP]
              ?.find(d => d.country.id === countryCode && d.date === yearStr)?.value || 0,
            gdpGrowth: indicatorData[this.indicators.GDP_GROWTH]
              ?.find(d => d.country.id === countryCode && d.date === yearStr)?.value || 0,
            inflation: indicatorData[this.indicators.INFLATION]
              ?.find(d => d.country.id === countryCode && d.date === yearStr)?.value || 0,
            population: indicatorData[this.indicators.POPULATION]
              ?.find(d => d.country.id === countryCode && d.date === yearStr)?.value || 0,
          });
        }

        processedData.push({
          code: countryCode,
          name: country.name,
          region: country.region.value,
          population: getLatestValue(this.indicators.POPULATION),
          gdp: getLatestValue(this.indicators.GDP),
          gdpPerCapita: getLatestValue(this.indicators.GDP_PER_CAPITA),
          gdpGrowth: getLatestValue(this.indicators.GDP_GROWTH),
          inflation: getLatestValue(this.indicators.INFLATION),
          unemployment: getLatestValue(this.indicators.UNEMPLOYMENT),
          exports: getLatestValue(this.indicators.EXPORTS),
          imports: getLatestValue(this.indicators.IMPORTS),
          energyUse: getLatestValue(this.indicators.ENERGY_USE),
          co2Emissions: getLatestValue(this.indicators.CO2_EMISSIONS),
          renewableEnergy: getLatestValue(this.indicators.RENEWABLE_ENERGY),
          lastUpdated: new Date().toISOString(),
          trendData: trendData.filter(d => d.gdp > 0) // Only include years with data
        });
      }

      return processedData.filter(d => d.gdp > 0); // Only return countries with GDP data
    } catch (error) {
      console.error('Error processing country data:', error);
      return [];
    }
  }

  // Specific data fetchers for dashboard sections
  async getTopCountriesByGDP(limit: number = 10): Promise<ProcessedCountryData[]> {
    const data = await this.getProcessedCountryData();
    return data
      .sort((a, b) => b.gdp - a.gdp)
      .slice(0, limit);
  }

  async getRegionalData(): Promise<{ [region: string]: ProcessedCountryData[] }> {
    const data = await this.getProcessedCountryData();
    const regional: { [region: string]: ProcessedCountryData[] } = {};
    
    data.forEach(country => {
      if (!regional[country.region]) {
        regional[country.region] = [];
      }
      regional[country.region].push(country);
    });

    return regional;
  }

  async getEnergyMixData(): Promise<{ renewable: number; nonRenewable: number }> {
    try {
      const renewableData = await this.getIndicatorData(this.indicators.RENEWABLE_ENERGY);
      const totalRenewable = renewableData
        .filter(d => d.value !== null && d.date === '2022')
        .reduce((sum, d) => sum + (d.value || 0), 0);
      
      const countryCount = renewableData
        .filter(d => d.value !== null && d.date === '2022').length;
      
      const avgRenewable = countryCount > 0 ? totalRenewable / countryCount : 0;
      
      return {
        renewable: avgRenewable,
        nonRenewable: 100 - avgRenewable
      };
    } catch (error) {
      console.error('Error fetching energy mix data:', error);
      return { renewable: 0, nonRenewable: 100 };
    }
  }

  async getGDPTrendsForCountries(countryCodes: string[]): Promise<{
    [countryCode: string]: { year: number; gdp: number; growth: number }[]
  }> {
    const results: { [countryCode: string]: { year: number; gdp: number; growth: number }[] } = {};
    
    const indicatorData = await this.getMultipleIndicators(
      [this.indicators.GDP, this.indicators.GDP_GROWTH],
      countryCodes,
      2000,
      2023
    );

    countryCodes.forEach(countryCode => {
      const gdpData = indicatorData[this.indicators.GDP] || [];
      const growthData = indicatorData[this.indicators.GDP_GROWTH] || [];
      
      const trends: { year: number; gdp: number; growth: number }[] = [];
      
      for (let year = 2000; year <= 2023; year++) {
        const yearStr = year.toString();
        const gdp = gdpData.find(d => d.country.id === countryCode && d.date === yearStr)?.value || 0;
        const growth = growthData.find(d => d.country.id === countryCode && d.date === yearStr)?.value || 0;
        
        if (gdp > 0) {
          trends.push({ year, gdp, growth });
        }
      }
      
      results[countryCode] = trends;
    });

    return results;
  }

  // Export functionality
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
      'Renewable Energy (%)', 'Last Updated'
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
        country.lastUpdated
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

export const worldBankService = new WorldBankService();