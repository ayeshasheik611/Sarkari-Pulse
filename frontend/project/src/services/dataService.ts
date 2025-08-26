import { mockCountries, CountryData } from '../data/mockGlobalData';
import { BackendScheme, FrontendScheme, convertSchemesArray } from './schemeAdapter';
import { worldBankService, ProcessedCountryData } from './worldBankService';
import { backendWorldBankService } from './backendWorldBankService';

// API Response interface
interface ApiResponse {
  success: boolean;
  data: BackendScheme[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  timestamp: string;
}

// Stats interface
interface SchemeStats {
  totalSchemes: number;
  activeSchemesCount: number;
  ministriesCount: number;
  sectorsCount: number;
  sourceBreakdown: Record<string, number>;
  levelBreakdown: Record<string, number>;
}

const API_BASE_URL = 'http://localhost:9000';
const WS_URL = 'ws://localhost:9000';
const WORLDBANK_API_BASE = 'http://localhost:9000/api/worldbank';

// WebSocket connection for real-time updates
class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: ((event: any) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    try {
      console.log('🔄 Attempting WebSocket connection to:', WS_URL);
      this.ws = new WebSocket(WS_URL);
      
      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected successfully');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          console.log('📨 WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          this.listeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), 3000 * this.reconnectAttempts);
    }
  }

  addListener(listener: (event: any) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (event: any) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export class DataService {
  private static instance: DataService;
  private schemes: FrontendScheme[] = [];
  private countries: CountryData[] = mockCountries; // Fallback data
  private worldBankData: ProcessedCountryData[] = [];
  private updateListeners: (() => void)[] = [];
  private wsManager: WebSocketManager;
  private stats: SchemeStats | null = null;
  private isLoadingWorldBankData = false;

  // Helper method for authenticated API calls
  private async authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
    const token = localStorage.getItem('auth_token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: headers as HeadersInit,
    });

    // Handle authentication errors
    if (response.status === 401) {
      console.warn('🔒 Authentication required - redirecting to login');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.reload();
      throw new Error('Authentication required');
    }

    return response;
  }

  constructor() {
    this.wsManager = new WebSocketManager();
    this.setupWebSocketListeners();
    this.wsManager.connect();
  }

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private setupWebSocketListeners() {
    this.wsManager.addListener((event) => {
      console.log('📡 WebSocket event:', event);
      
      switch (event.type) {
        case 'scrape-started':
        case 'bulk-scrape-started':
          console.log('🚀 Scraping started');
          break;
        case 'scrape-progress':
        case 'bulk-scrape-progress':
          console.log('📊 Scraping progress:', event.data);
          break;
        case 'scrape-completed':
        case 'bulk-scrape-completed':
          console.log('✅ Scraping completed, refreshing data');
          this.refreshSchemes();
          break;
      }
    });
  }

  addUpdateListener(listener: () => void) {
    this.updateListeners.push(listener);
  }

  removeUpdateListener(listener: () => void) {
    this.updateListeners = this.updateListeners.filter(l => l !== listener);
  }

  private notifyListeners() {
    this.updateListeners.forEach(listener => listener());
  }

  // API Methods
  async fetchSchemes(params?: {
    limit?: number;
    page?: number;
    search?: string;
    ministry?: string;
    sector?: string;
  }): Promise<ApiResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.ministry) queryParams.append('ministry', params.ministry);
      if (params?.sector) queryParams.append('sector', params.sector);

      const url = `${API_BASE_URL}/api/myscheme?${queryParams}`;
      console.log('🔄 Fetching schemes from:', url);
      
      const response = await this.authenticatedFetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data: ApiResponse = await response.json();
      console.log('✅ Received schemes data:', data);
      
      this.schemes = convertSchemesArray(data.data);
      console.log('🔄 Converted schemes:', this.schemes.length, 'schemes');
      
      this.notifyListeners();
      return data;
    } catch (error) {
      console.error('❌ Error fetching schemes:', error);
      throw error;
    }
  }

  async fetchStats(): Promise<SchemeStats> {
    try {
      const response = await this.authenticatedFetch(`${API_BASE_URL}/api/myscheme/stats`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const stats: SchemeStats = await response.json();
      this.stats = stats;
      return stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  async triggerScraping(options: { saveToDb?: boolean; notifyClients?: boolean } = {}): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${API_BASE_URL}/api/myscheme/scrape`, {
        method: 'POST',
        body: JSON.stringify({
          saveToDb: options.saveToDb ?? true,
          notifyClients: options.notifyClients ?? true,
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      console.log('🚀 Scraping triggered successfully');
    } catch (error) {
      console.error('Error triggering scraping:', error);
      throw error;
    }
  }

  async triggerBulkScraping(options: { 
    maxPages?: number; 
    pageSize?: number; 
    saveToDb?: boolean 
  } = {}): Promise<void> {
    try {
      const response = await this.authenticatedFetch(`${API_BASE_URL}/api/myscheme/bulk-scrape`, {
        method: 'POST',
        body: JSON.stringify({
          maxPages: options.maxPages ?? 200,
          pageSize: options.pageSize ?? 50,
          saveToDb: options.saveToDb ?? true,
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      console.log('🚀 Bulk scraping triggered successfully');
    } catch (error) {
      console.error('Error triggering bulk scraping:', error);
      throw error;
    }
  }

  async getBulkStatus(): Promise<any> {
    try {
      const response = await this.authenticatedFetch(`${API_BASE_URL}/api/myscheme/bulk-status`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching bulk status:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<any> {
    try {
      const response = await this.authenticatedFetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  }

  // Refresh schemes data
  async refreshSchemes(): Promise<void> {
    try {
      await this.fetchSchemes({ limit: 200, page: 1 });
      console.log('✅ Schemes data refreshed');
    } catch (error) {
      console.error('Error refreshing schemes:', error);
    }
  }

  // World Bank data methods using backend API
  async fetchWorldBankData(forceRefresh = false, filters?: {
    countries?: string[];
    regions?: string[];
    indicators?: string[];
    yearRange?: [number, number];
  }): Promise<ProcessedCountryData[]> {
    if (this.worldBankData.length > 0 && !forceRefresh && !filters) {
      return this.worldBankData;
    }

    if (this.isLoadingWorldBankData) {
      // Return existing data while loading
      return this.worldBankData;
    }

    try {
      this.isLoadingWorldBankData = true;
      console.log('🔄 Fetching World Bank data from backend with filters:', filters);
      
      // If force refresh, refresh backend data first
      if (forceRefresh) {
        console.log('🔄 Refreshing backend data...');
        await backendWorldBankService.refreshData();
      }

      // Determine countries to fetch
      let targetCountries: string[];
      if (filters?.countries && filters.countries.length > 0) {
        targetCountries = filters.countries;
      } else {
        // Fetch data for major economies and regions (your backend has 296 countries!)
        targetCountries = []; // Empty array means fetch all available countries
      }

      // Set year range
      const startYear = filters?.yearRange?.[0] || 2019;
      const endYear = filters?.yearRange?.[1] || 2023;

      // Use backend service instead of direct World Bank API
      this.worldBankData = await backendWorldBankService.getProcessedCountryData(targetCountries, startYear, endYear);
      
      console.log(`✅ Fetched ${this.worldBankData.length} countries from backend`);
      this.notifyListeners();
      return this.worldBankData;
    } catch (error) {
      console.error('❌ Error fetching World Bank data from backend:', error);
      console.log('🔄 Falling back to direct World Bank API...');
      
      // Fallback to direct World Bank API if backend fails
      try {
        const targetCountries = filters?.countries?.length ? filters.countries : 
          ['US', 'CN', 'JP', 'DE', 'IN', 'GB', 'FR', 'IT', 'BR', 'CA', 'RU', 'KR', 'AU', 'ES', 'MX'];
        const startYear = filters?.yearRange?.[0] || 2019;
        const endYear = filters?.yearRange?.[1] || 2023;
        
        this.worldBankData = await worldBankService.getProcessedCountryData(targetCountries, startYear, endYear);
        console.log(`✅ Fallback: Fetched ${this.worldBankData.length} countries from World Bank API`);
        this.notifyListeners();
        return this.worldBankData;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        // Return mock data as final fallback
        return this.convertMockToProcessed();
      }
    } finally {
      this.isLoadingWorldBankData = false;
    }
  }

  private convertMockToProcessed(): ProcessedCountryData[] {
    return this.countries.map(country => ({
      code: country.code,
      name: country.name,
      region: country.region,
      population: country.population,
      gdp: country.gdp,
      gdpPerCapita: country.gdp / country.population,
      gdpGrowth: country.economicIndicators.growthRate,
      inflation: country.economicIndicators.inflationRate,
      unemployment: country.economicIndicators.unemploymentRate,
      exports: country.exports.reduce((sum, exp) => sum + exp.value, 0),
      imports: country.imports.reduce((sum, imp) => sum + imp.value, 0),
      energyUse: country.consumption.energy / country.population * 1000,
      co2Emissions: 5.0, // Mock value
      renewableEnergy: 15.0, // Mock value
      lastUpdated: country.lastUpdated,
      trendData: country.trendData.map(trend => ({
        year: trend.year,
        gdp: trend.gdp,
        gdpGrowth: Math.random() * 5 - 1, // Mock growth rate
        inflation: Math.random() * 8,
        population: country.population * (1 + (trend.year - 2020) * 0.01)
      }))
    }));
  }

  async getTopCountriesByGDP(limit = 10): Promise<ProcessedCountryData[]> {
    try {
      return await backendWorldBankService.getTopCountriesByGDP(limit);
    } catch (error) {
      console.error('Error fetching top countries from backend:', error);
      // Fallback to processed data
      const data = await this.fetchWorldBankData();
      return data
        .sort((a, b) => b.gdp - a.gdp)
        .slice(0, limit);
    }
  }

  async getRegionalData(): Promise<{ [region: string]: ProcessedCountryData[] }> {
    const data = await this.fetchWorldBankData();
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
      return await backendWorldBankService.getEnergyMixData();
    } catch (error) {
      console.error('Error fetching energy mix from backend:', error);
      // Fallback to direct World Bank API
      try {
        return await worldBankService.getEnergyMixData();
      } catch (fallbackError) {
        console.error('Error fetching energy mix from World Bank API:', fallbackError);
        return { renewable: 15, nonRenewable: 85 }; // Final fallback values
      }
    }
  }

  async getGDPTrendsForCountries(countryCodes: string[]): Promise<{
    [countryCode: string]: { year: number; gdp: number; growth: number }[]
  }> {
    try {
      return await backendWorldBankService.getGDPTrendsForCountries(countryCodes);
    } catch (error) {
      console.error('Error fetching GDP trends from backend:', error);
      // Fallback to direct World Bank API
      try {
        return await worldBankService.getGDPTrendsForCountries(countryCodes);
      } catch (fallbackError) {
        console.error('Error fetching GDP trends from World Bank API:', fallbackError);
        return {};
      }
    }
  }

  async exportData(format: 'csv' | 'json' = 'csv', filters?: any): Promise<string> {
    const data = await this.fetchWorldBankData(false, filters);
    try {
      return await backendWorldBankService.exportData(data, format);
    } catch (error) {
      console.error('Error exporting data via backend:', error);
      // Fallback to direct export
      return worldBankService.exportData(data, format);
    }
  }

  // Enhanced data fetching with real-time filtering
  async fetchFilteredData(filters: {
    countries?: string[];
    regions?: string[];
    indicators?: string[];
    yearRange?: [number, number];
    gdpRange?: [number, number];
    searchTerm?: string;
  }): Promise<ProcessedCountryData[]> {
    let data = await this.fetchWorldBankData(false, filters);
    
    // Apply additional client-side filters
    if (filters.gdpRange) {
      data = data.filter(country => 
        country.gdp >= filters.gdpRange![0] && country.gdp <= filters.gdpRange![1]
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      data = data.filter(country =>
        country.name.toLowerCase().includes(searchLower) ||
        country.region.toLowerCase().includes(searchLower) ||
        country.code.toLowerCase().includes(searchLower)
      );
    }

    if (filters.regions && filters.regions.length > 0) {
      data = data.filter(country => filters.regions!.includes(country.region));
    }

    return data;
  }

  // Real-time data updates
  async subscribeToDataUpdates(callback: (data: ProcessedCountryData[]) => void): Promise<void> {
    // Set up periodic updates every 5 minutes
    const updateInterval = setInterval(async () => {
      try {
        const freshData = await this.fetchWorldBankData(true);
        callback(freshData);
      } catch (error) {
        console.error('Error in periodic data update:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Store interval ID for cleanup
    (this as any).updateInterval = updateInterval;
  }

  // Cleanup method for subscriptions
  unsubscribeFromDataUpdates(): void {
    if ((this as any).updateInterval) {
      clearInterval((this as any).updateInterval);
      delete (this as any).updateInterval;
    }
  }

  // Legacy methods for compatibility with existing frontend
  async fetchCountries(): Promise<CountryData[]> {
    // Convert World Bank data to legacy format for compatibility
    const worldBankData = await this.fetchWorldBankData();
    return this.convertProcessedToLegacy(worldBankData);
  }

  private convertProcessedToLegacy(data: ProcessedCountryData[]): CountryData[] {
    return data.map(country => ({
      code: country.code,
      name: country.name,
      region: country.region,
      population: country.population,
      gdp: country.gdp,
      consumption: {
        food: country.gdp * 0.1, // Estimate
        energy: country.energyUse * country.population / 1000,
        fuel: country.gdp * 0.05 // Estimate
      },
      marketChallenges: [
        'Supply chain disruptions',
        'Inflation pressures',
        'Labor market changes',
        'Digital transformation'
      ],
      supplyChainIssues: [
        'Transportation bottlenecks',
        'Raw material scarcity',
        'Logistics inefficiency',
        'Quality standardization'
      ],
      exports: [
        { category: 'Goods', value: country.exports * 0.6 },
        { category: 'Services', value: country.exports * 0.4 }
      ],
      imports: [
        { category: 'Goods', value: country.imports * 0.7 },
        { category: 'Services', value: country.imports * 0.3 }
      ],
      economicIndicators: {
        inflationRate: country.inflation,
        unemploymentRate: country.unemployment,
        growthRate: country.gdpGrowth
      },
      lastUpdated: country.lastUpdated,
      trendData: country.trendData.map(trend => ({
        year: trend.year,
        gdp: trend.gdp,
        consumption: trend.gdp * 0.6,
        exports: country.exports,
        imports: country.imports
      }))
    }));
  }

  async updateSchemes(): Promise<void> {
    await this.refreshSchemes();
  }

  async updateCountries(): Promise<void> {
    console.log('🔄 Updating global market data from World Bank...');
    try {
      await this.fetchWorldBankData(true); // Force refresh
      console.log('✅ Global market data updated from World Bank');
    } catch (error) {
      console.error('❌ Error updating global market data:', error);
    }
  }

  getSchemes(): FrontendScheme[] {
    return this.schemes;
  }

  getCountries(): CountryData[] {
    return this.countries;
  }

  getSchemeById(id: string): FrontendScheme | undefined {
    return this.schemes.find(scheme => scheme.id === id);
  }

  getCountryByCode(code: string): CountryData | undefined {
    return this.countries.find(country => country.code === code);
  }

  // Cleanup method
  disconnect(): void {
    this.wsManager.disconnect();
  }
}
  