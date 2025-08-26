import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter
} from 'recharts';
import { 
  Download, Filter, RefreshCw, TrendingUp, TrendingDown, 
  Globe, DollarSign, Users, Zap, Leaf, Factory, Heart, Building2, 
  Activity, Briefcase
} from 'lucide-react';
import { ProcessedCountryData } from '../services/worldBankService';
import { ChartExporter } from '../utils/chartExport';
import DashboardFilters from './DashboardFilters';
import GDPTrendsChart from './GDPTrendsChart';

interface GlobalDashboardProps {
  data: ProcessedCountryData[];
  isLoading: boolean;
  onRefresh: () => void;
  onExport: (format: 'csv' | 'json') => void;
}

type TabType = 'economy' | 'business' | 'social' | 'environment' | 'health';

interface FilterState {
  countries: string[];
  regions: string[];
  yearRange: [number, number];
  gdpRange: [number, number];
  searchTerm: string;
  sortBy: 'name' | 'gdp' | 'population' | 'growth';
  sortOrder: 'asc' | 'desc';
}

const GlobalDashboard: React.FC<GlobalDashboardProps> = ({ 
  data, 
  isLoading, 
  onRefresh, 
  onExport 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('economy');
  const [filters, setFilters] = useState<FilterState>({
    countries: [],
    regions: [],
    yearRange: [2019, 2023],
    gdpRange: [0, 0],
    searchTerm: '',
    sortBy: 'gdp',
    sortOrder: 'desc'
  });

  // Initialize GDP range when data loads
  useEffect(() => {
    if (data.length > 0 && filters.gdpRange[1] === 0) {
      const minGDP = Math.min(...data.map(country => country.gdp));
      const maxGDP = Math.max(...data.map(country => country.gdp));
      setFilters(prev => ({
        ...prev,
        gdpRange: [minGDP, maxGDP]
      }));
    }
  }, [data, filters.gdpRange]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'CN', 'IN']);
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  const COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981', 
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    indigo: '#6366F1',
    teal: '#14B8A6'
  };

  const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.danger, COLORS.purple];

  // Filter and sort data based on current filters
  const filteredData = useMemo(() => {
    let filtered = data.filter(country => {
      const matchesCountry = filters.countries.length === 0 || filters.countries.includes(country.code);
      const matchesRegion = filters.regions.length === 0 || filters.regions.includes(country.region);
      const matchesSearch = !filters.searchTerm || 
        country.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        country.region.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchesGDP = country.gdp >= filters.gdpRange[0] && country.gdp <= filters.gdpRange[1];
      
      return matchesCountry && matchesRegion && matchesSearch && matchesGDP;
    });

    // Sort data
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'gdp':
          comparison = a.gdp - b.gdp;
          break;
        case 'population':
          comparison = a.population - b.population;
          break;
        case 'growth':
          comparison = a.gdpGrowth - b.gdpGrowth;
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data, filters]);

  // Get unique regions
  const regions = useMemo(() => {
    return Array.from(new Set(data.map(country => country.region)));
  }, [data]);

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  // Calculate global statistics
  const globalStats = useMemo(() => {
    const totalGDP = filteredData.reduce((sum, country) => sum + country.gdp, 0);
    const totalPopulation = filteredData.reduce((sum, country) => sum + country.population, 0);
    const avgInflation = filteredData.reduce((sum, country) => sum + country.inflation, 0) / filteredData.length;
    const avgGrowth = filteredData.reduce((sum, country) => sum + country.gdpGrowth, 0) / filteredData.length;
    const avgRenewable = filteredData.reduce((sum, country) => sum + country.renewableEnergy, 0) / filteredData.length;

    return {
      totalGDP,
      totalPopulation,
      avgInflation: avgInflation || 0,
      avgGrowth: avgGrowth || 0,
      avgRenewable: avgRenewable || 0,
      totalCountries: filteredData.length
    };
  }, [filteredData]);

  // Prepare chart data
  const topCountriesByGDP = useMemo(() => {
    return filteredData
      .sort((a, b) => b.gdp - a.gdp)
      .slice(0, 10)
      .map(country => ({
        name: country.name,
        code: country.code,
        gdp: country.gdp / 1e12, // Convert to trillions
        growth: country.gdpGrowth
      }));
  }, [filteredData]);

  const energyMixData = useMemo(() => {
    const avgRenewable = globalStats.avgRenewable;
    return [
      { name: 'Renewable', value: avgRenewable, color: COLORS.secondary },
      { name: 'Non-Renewable', value: 100 - avgRenewable, color: COLORS.danger }
    ];
  }, [globalStats.avgRenewable]);

  const regionalGDPData = useMemo(() => {
    const regionalData: { [region: string]: { totalGDP: number; countries: number; avgGrowth: number } } = {};
    
    filteredData.forEach(country => {
      if (!regionalData[country.region]) {
        regionalData[country.region] = { totalGDP: 0, countries: 0, avgGrowth: 0 };
      }
      regionalData[country.region].totalGDP += country.gdp;
      regionalData[country.region].countries += 1;
      regionalData[country.region].avgGrowth += country.gdpGrowth;
    });

    return Object.entries(regionalData).map(([region, data]) => ({
      region,
      totalGDP: data.totalGDP / 1e12, // Convert to trillions
      countries: data.countries,
      avgGrowth: data.avgGrowth / data.countries
    }));
  }, [filteredData]);

  const comparisonData = useMemo(() => {
    return selectedCountries
      .map(code => filteredData.find(country => country.code === code))
      .filter(Boolean)
      .map(country => ({
        name: country!.name,
        code: country!.code,
        gdp: country!.gdp / 1e12,
        gdpPerCapita: country!.gdpPerCapita,
        growth: country!.gdpGrowth,
        inflation: country!.inflation,
        unemployment: country!.unemployment,
        renewable: country!.renewableEnergy
      }));
  }, [selectedCountries, filteredData]);

  const tabs = [
    { id: 'economy', label: 'Economy', icon: DollarSign },
    { id: 'business', label: 'Business', icon: Briefcase },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'environment', label: 'Environment', icon: Leaf },
    { id: 'health', label: 'Health', icon: Heart }
  ];

  const handleExport = (format: 'csv' | 'json') => {
    onExport(format);
  };

  const resetFilters = () => {
    const minGDP = Math.min(...data.map(country => country.gdp));
    const maxGDP = Math.max(...data.map(country => country.gdp));
    const minYear = Math.min(...data.flatMap(country => country.trendData.map(trend => trend.year)));
    const maxYear = Math.max(...data.flatMap(country => country.trendData.map(trend => trend.year)));
    
    setFilters({
      countries: [],
      regions: [],
      yearRange: [minYear, maxYear],
      gdpRange: [minGDP, maxGDP],
      searchTerm: '',
      sortBy: 'gdp',
      sortOrder: 'desc'
    });
  };

  const downloadChart = async (chartId: string) => {
    try {
      ChartExporter.prepareChartForExport(chartId);
      await ChartExporter.exportChart(chartId, {
        filename: `${chartId}-${new Date().toISOString().split('T')[0]}`,
        format: 'png',
        quality: 2.0
      });
      ChartExporter.restoreChartAfterExport(chartId);
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-lg text-gray-600">Loading global data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Insights Dashboard</h1>
            <p className="text-gray-600">Real-time data from World Bank Open Data</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Export data as CSV"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                title="Export data as JSON"
              >
                <Download className="w-4 h-4" />
                <span>JSON</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    await ChartExporter.exportAllVisibleCharts({
                      format: 'png',
                      quality: 2.0
                    });
                  } catch (error) {
                    console.error('Error exporting all charts:', error);
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                title="Export all charts as PNG"
              >
                <Download className="w-4 h-4" />
                <span>Charts</span>
              </button>
            </div>
          </div>
        </div>


      </div>

      {/* Filters */}
      <DashboardFilters
        data={data}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={resetFilters}
      />

      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Global GDP</p>
              <p className="text-xl font-bold">${formatNumber(globalStats.totalGDP)}</p>
            </div>
            <DollarSign className="w-6 h-6 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Population</p>
              <p className="text-xl font-bold">{formatNumber(globalStats.totalPopulation)}</p>
            </div>
            <Users className="w-6 h-6 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Avg Inflation</p>
              <p className="text-xl font-bold">{globalStats.avgInflation.toFixed(1)}%</p>
            </div>
            {globalStats.avgInflation > 3 ? 
              <TrendingUp className="w-6 h-6 text-orange-200" /> :
              <TrendingDown className="w-6 h-6 text-orange-200" />
            }
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Avg Growth</p>
              <p className="text-xl font-bold">{globalStats.avgGrowth.toFixed(1)}%</p>
            </div>
            {globalStats.avgGrowth > 0 ? 
              <TrendingUp className="w-6 h-6 text-purple-200" /> :
              <TrendingDown className="w-6 h-6 text-purple-200" />
            }
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm">Renewable</p>
              <p className="text-xl font-bold">{globalStats.avgRenewable.toFixed(1)}%</p>
            </div>
            <Leaf className="w-6 h-6 text-teal-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Countries</p>
              <p className="text-xl font-bold">{globalStats.totalCountries}</p>
            </div>
            <Globe className="w-6 h-6 text-indigo-200" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'economy' && (
            <div className="space-y-8">
              {/* Top Countries by GDP */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="gdp-bar-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Top 10 Countries by GDP</h3>
                    <button onClick={() => downloadChart('gdp-bar-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCountriesByGDP}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}T`, 'GDP']} />
                      <Bar dataKey="gdp" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div id="regional-gdp-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Regional GDP Distribution</h3>
                    <button onClick={() => downloadChart('regional-gdp-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={regionalGDPData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="region" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}T`, 'Total GDP']} />
                      <Bar dataKey="totalGDP" fill={COLORS.secondary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Country Comparison */}
              <div id="comparison-chart" className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Economic Indicators Comparison</h3>
                  <button onClick={() => downloadChart('comparison-chart')} className="text-gray-500 hover:text-gray-700">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="growth" stroke={COLORS.secondary} strokeWidth={3} name="GDP Growth %" />
                    <Line type="monotone" dataKey="inflation" stroke={COLORS.danger} strokeWidth={3} name="Inflation %" />
                    <Line type="monotone" dataKey="unemployment" stroke={COLORS.accent} strokeWidth={3} name="Unemployment %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Country Selector and GDP Trends */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">GDP Growth Trends (2000-2023)</h3>
                  <button
                    onClick={() => setShowCountrySelector(!showCountrySelector)}
                    className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Select Countries</span>
                  </button>
                </div>

                {showCountrySelector && (
                  <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {filteredData.slice(0, 24).map(country => (
                        <label key={country.code} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedCountries.includes(country.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCountries(prev => [...prev, country.code]);
                              } else {
                                setSelectedCountries(prev => prev.filter(c => c !== country.code));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{country.code}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {selectedCountries.length} countries selected
                      </span>
                      <div className="space-x-2">
                        <button
                          onClick={() => setSelectedCountries([])}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => setSelectedCountries(['US', 'CN', 'IN', 'JP', 'DE'])}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Top 5
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <GDPTrendsChart
                  countryCodes={selectedCountries}
                  title=""
                  height={400}
                />
              </div>
            </div>
          )}

          {activeTab === 'environment' && (
            <div className="space-y-8">
              {/* Energy Mix */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="energy-pie-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Global Energy Mix</h3>
                    <button onClick={() => downloadChart('energy-pie-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={energyMixData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      >
                        {energyMixData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div id="renewable-bar-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Renewable Energy by Country</h3>
                    <button onClick={() => downloadChart('renewable-bar-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Renewable Energy']} />
                      <Bar dataKey="renewable" fill={COLORS.secondary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-8">
              {/* Business Environment Indicators */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="trade-balance-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Trade Balance by Country</h3>
                    <button onClick={() => downloadChart('trade-balance-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`${formatNumber(value * 1e12)}`, 'Trade Balance']} />
                      <Bar dataKey="exports" fill={COLORS.secondary} name="Exports" />
                      <Bar dataKey="imports" fill={COLORS.danger} name="Imports" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div id="unemployment-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Unemployment Rates</h3>
                    <button onClick={() => downloadChart('unemployment-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Unemployment Rate']} />
                      <Line type="monotone" dataKey="unemployment" stroke={COLORS.accent} strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Economic Correlation Analysis */}
              <div id="correlation-chart" className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">GDP vs GDP Per Capita Correlation</h3>
                  <button onClick={() => downloadChart('correlation-chart')} className="text-gray-500 hover:text-gray-700">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart data={filteredData.slice(0, 20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="gdpPerCapita" 
                      name="GDP Per Capita"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                    />
                    <YAxis 
                      dataKey="gdp" 
                      name="Total GDP"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value, name) => [
                        name === 'gdp' ? formatNumber(value) : `$${formatNumber(value)}`,
                        name === 'gdp' ? 'Total GDP' : 'GDP Per Capita'
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.name || ''}
                    />
                    <Scatter dataKey="gdp" fill={COLORS.primary} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-8">
              {/* Population and Demographics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="population-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Population Distribution</h3>
                    <button onClick={() => downloadChart('population-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCountriesByGDP.map(entry => ({
                      ...entry,
                      population: (filteredData.find(c => c.code === entry.code)?.population || 0) / 1e6 // Convert to millions
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatNumber(value), 'Population (M)']} />
                      <Bar 
                        dataKey="population" 
                        fill={COLORS.purple}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div id="social-indicators-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Social Development Index</h3>
                    <button onClick={() => downloadChart('social-indicators-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="gdpPerCapita" 
                        stackId="1" 
                        stroke={COLORS.teal} 
                        fill={COLORS.teal} 
                        name="GDP Per Capita (scaled)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quality of Life Indicators */}
              <div id="quality-life-chart" className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Quality of Life Indicators</h3>
                  <button onClick={() => downloadChart('quality-life-chart')} className="text-gray-500 hover:text-gray-700">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={comparisonData.map(entry => ({
                    ...entry,
                    employmentRate: 100 - entry.unemployment
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="gdpPerCapita" 
                      stroke={COLORS.primary} 
                      strokeWidth={3} 
                      name="GDP Per Capita (USD)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="employmentRate" 
                      stroke={COLORS.secondary} 
                      strokeWidth={3} 
                      name="Employment Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-8">
              {/* Health and Environmental Indicators */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="co2-emissions-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">CO2 Emissions per Capita</h3>
                    <button onClick={() => downloadChart('co2-emissions-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData.map(entry => ({
                      ...entry,
                      co2Emissions: filteredData.find(c => c.code === entry.code)?.co2Emissions || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} tons`, 'CO2 per Capita']} />
                      <Bar 
                        dataKey="co2Emissions" 
                        fill={COLORS.danger} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div id="energy-consumption-chart" className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Energy Consumption vs Renewable %</h3>
                    <button onClick={() => downloadChart('energy-consumption-chart')} className="text-gray-500 hover:text-gray-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={filteredData.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="energyUse" 
                        name="Energy Use"
                        type="number"
                      />
                      <YAxis 
                        dataKey="renewableEnergy" 
                        name="Renewable %"
                        type="number"
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'energyUse' ? `${value} kg oil eq` : `${value}%`,
                          name === 'energyUse' ? 'Energy Use per Capita' : 'Renewable Energy %'
                        ]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.name || ''}
                      />
                      <Scatter dataKey="renewableEnergy" fill={COLORS.secondary} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Environmental Health Index */}
              <div id="environmental-health-chart" className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Environmental Health Score</h3>
                  <button onClick={() => downloadChart('environmental-health-chart')} className="text-gray-500 hover:text-gray-700">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={comparisonData.map(entry => ({
                    ...entry,
                    lowCarbonScore: Math.max(0, 20 - (filteredData.find(c => c.code === entry.code)?.co2Emissions || 0))
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="renewable" 
                      stackId="1" 
                      stroke={COLORS.secondary} 
                      fill={COLORS.secondary} 
                      name="Renewable Energy %"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lowCarbonScore" 
                      stackId="2" 
                      stroke={COLORS.teal} 
                      fill={COLORS.teal} 
                      name="Low Carbon Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Default message for incomplete tabs */}
          {!['economy', 'business', 'social', 'environment', 'health'].includes(activeTab) && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Activity className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {tabs.find(t => t.id === activeTab)?.label} Dashboard
              </h3>
              <p className="text-gray-600">
                This section is under development. More indicators and visualizations coming soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboard;