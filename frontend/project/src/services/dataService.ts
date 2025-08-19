import { mockCountries, CountryData } from '../data/mockGlobalData';
import { BackendScheme, FrontendScheme, convertSchemesArray } from './schemeAdapter';

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
  private countries: CountryData[] = mockCountries; // Keep global data as mock for now
  private updateListeners: (() => void)[] = [];
  private wsManager: WebSocketManager;
  private stats: SchemeStats | null = null;

  // Helper method for authenticated API calls
  private async authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
    const token = localStorage.getItem('auth_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
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

  // Legacy methods for compatibility with existing frontend
  async fetchCountries(): Promise<CountryData[]> {
    // Keep using mock data for global countries since backend doesn't have this
    return this.countries;
  }

  async updateSchemes(): Promise<void> {
    await this.refreshSchemes();
  }

  async updateCountries(): Promise<void> {
    // Mock update for countries data
    console.log('🔄 Mock updating global market data...');
    this.notifyListeners();
    console.log('✅ Global market data updated');
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
  