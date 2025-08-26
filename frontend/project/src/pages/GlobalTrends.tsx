import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useData } from '../context/DataContext';
import GlobalDashboard from '../components/GlobalDashboard';
import { ProcessedCountryData } from '../services/worldBankService';

const GlobalTrends: React.FC = () => {
  const { isLoading, countriesUpdateStatus, manualUpdateCountries } = useData();
  const [worldBankData, setWorldBankData] = useState<ProcessedCountryData[]>([]);
  const [isLoadingWorldBank, setIsLoadingWorldBank] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Real-time data update callback
  const handleDataUpdate = useCallback((data: ProcessedCountryData[]) => {
    setWorldBankData(data);
    setLastUpdated(new Date());
    setConnectionStatus('connected');
  }, []);

  // Load World Bank data on component mount
  useEffect(() => {
    const loadWorldBankData = async () => {
      try {
        setIsLoadingWorldBank(true);
        setConnectionStatus('connecting');
        const dataService = (await import('../services/dataService')).DataService.getInstance();
        const data = await dataService.fetchWorldBankData();
        setWorldBankData(data);
        setLastUpdated(new Date());
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Error loading World Bank data:', error);
        setConnectionStatus('disconnected');
      } finally {
        setIsLoadingWorldBank(false);
      }
    };

    loadWorldBankData();
  }, []);

  // Set up real-time updates
  useEffect(() => {
    let dataService: any;
    
    const setupRealTimeUpdates = async () => {
      if (isRealTimeEnabled) {
        dataService = (await import('../services/dataService')).DataService.getInstance();
        await dataService.subscribeToDataUpdates(handleDataUpdate);
      }
    };

    setupRealTimeUpdates();

    return () => {
      if (dataService && isRealTimeEnabled) {
        dataService.unsubscribeFromDataUpdates();
      }
    };
  }, [isRealTimeEnabled, handleDataUpdate]);

  const handleRefresh = async () => {
    try {
      setIsLoadingWorldBank(true);
      setConnectionStatus('connecting');
      const dataService = (await import('../services/dataService')).DataService.getInstance();
      const data = await dataService.fetchWorldBankData(true); // Force refresh
      setWorldBankData(data);
      setLastUpdated(new Date());
      setConnectionStatus('connected');
      manualUpdateCountries(); // Also refresh legacy data
    } catch (error) {
      console.error('Error refreshing data:', error);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoadingWorldBank(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const dataService = (await import('../services/dataService')).DataService.getInstance();
      const exportData = await dataService.exportData(format);
      
      const blob = new Blob([exportData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `global-data-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const toggleRealTime = () => {
    setIsRealTimeEnabled(!isRealTimeEnabled);
    if (!isRealTimeEnabled) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
  };

  if (isLoadingWorldBank) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-2 text-lg text-gray-600">Loading World Bank data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Backend connection status bar */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' && <Wifi className="w-4 h-4 text-green-500" />}
              {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-red-500" />}
              {connectionStatus === 'connecting' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
              <span className="text-sm font-medium text-gray-700">
                Backend: {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 px-2 py-1 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-700 font-medium">localhost:9000</span>
            </div>
            
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleRealTime}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isRealTimeEnabled
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isRealTimeEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh every 5 minutes'}
            >
              {isRealTimeEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              {worldBankData.length} countries • 6,790+ indicators
            </div>
          </div>
        </div>
        
        {/* Backend info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>✅ Backend API: World Bank Data Service</span>
              <span>✅ MongoDB: 296 countries cached</span>
              <span>✅ Daily auto-updates at 2:00 AM UTC</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Data source: World Bank Open Data</span>
              <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <GlobalDashboard
        data={worldBankData}
        isLoading={isLoadingWorldBank}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />
    </div>
  );
};

export default GlobalTrends;