import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DataService } from '../services/dataService';
import { FrontendScheme } from '../services/schemeAdapter';
import { CountryData } from '../data/mockGlobalData';
import { useAutoUpdate } from '../hooks/useAutoUpdate';

interface DataContextType {
  schemes: FrontendScheme[];
  countries: CountryData[];
  schemesUpdateStatus: any;
  countriesUpdateStatus: any;
  manualUpdateSchemes: () => void;
  manualUpdateCountries: () => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [schemes, setSchemes] = useState<FrontendScheme[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dataService = DataService.getInstance();

  // Auto-update hooks
  const {
    updateStatus: schemesUpdateStatus,
    manualUpdate: manualUpdateSchemes
  } = useAutoUpdate(async () => {
    await dataService.updateSchemes();
    setSchemes(dataService.getSchemes());
  }, 15); // Update every 15 minutes for demo

  const {
    updateStatus: countriesUpdateStatus,
    manualUpdate: manualUpdateCountries
  } = useAutoUpdate(async () => {
    await dataService.updateCountries();
    setCountries(dataService.getCountries());
  }, 20); // Update every 20 minutes for demo

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🚀 Starting initial data load...');
      
      // First check if backend is accessible
      try {
        console.log('🏥 Checking backend health...');
        await dataService.checkHealth();
        console.log('✅ Backend is healthy');
      } catch (error) {
        console.error('❌ Backend health check failed:', error);
        console.log('⚠️  Make sure your backend is running on http://localhost:9000');
      }
      
      try {
        console.log('📡 Fetching schemes and countries...');
        const [schemesResponse, countriesData] = await Promise.all([
          dataService.fetchSchemes({ limit: 200, page: 1 }),
          dataService.fetchCountries()
        ]);
        
        const schemes = dataService.getSchemes();
        console.log('✅ Data loaded successfully. Schemes:', schemes.length, 'Countries:', countriesData.length);
        
        setSchemes(schemes);
        setCountries(countriesData);
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        console.log('💡 Possible issues:');
        console.log('   - Backend not running on http://localhost:9000');
        console.log('   - CORS issues');
        console.log('   - Network connectivity');
      } finally {
        setIsLoading(false);
        console.log('✅ Initial data load complete');
      }
    };

    loadInitialData();

    // Listen for data updates
    const handleUpdate = () => {
      setSchemes(dataService.getSchemes());
      setCountries(dataService.getCountries());
    };

    dataService.addUpdateListener(handleUpdate);

    return () => {
      dataService.removeUpdateListener(handleUpdate);
    };
  }, [dataService]);

  return (
    <DataContext.Provider value={{
      schemes,
      countries,
      schemesUpdateStatus,
      countriesUpdateStatus,
      manualUpdateSchemes,
      manualUpdateCountries,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};