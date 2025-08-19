import React, { useState, useMemo } from 'react';
import { Search, Globe, TrendingUp, DollarSign, Users, BarChart3, AlertCircle, ExternalLink, Filter, ArrowUpDown, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useData } from '../context/DataContext';
import { getRegions, getCountryByCode, CountryData } from '../data/mockGlobalData';

const GlobalTrends: React.FC = () => {
  const { countries, isLoading, countriesUpdateStatus, manualUpdateCountries } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [compareCountries, setCompareCountries] = useState<CountryData[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'details' | 'compare'>('overview');
  const [sortBy, setSortBy] = useState('gdp');

  const filteredCountries = useMemo(() => {
    let filtered = countries.filter(country => {
      const matchesSearch = country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           country.region.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = !selectedRegion || country.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'gdp':
          return b.gdp - a.gdp;
        case 'population':
          return b.population - a.population;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [countries, searchTerm, selectedRegion, sortBy]);

  const formatNumber = (num: number) => {
    if (num >= 1000000000000) return `${(num / 1000000000000).toFixed(1)}T`;
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000000000) return `$${(num / 1000000000000).toFixed(1)}T`;
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
  };

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

  const addToCompare = (country: CountryData) => {
    if (compareCountries.length < 4 && !compareCountries.find(c => c.code === country.code)) {
      setCompareCountries([...compareCountries, country]);
    }
  };

  const removeFromCompare = (countryCode: string) => {
    setCompareCountries(compareCountries.filter(c => c.code !== countryCode));
  };

  const globalStats = useMemo(() => {
    const totalGDP = countries.reduce((sum, country) => sum + country.gdp, 0);
    const totalPopulation = countries.reduce((sum, country) => sum + country.population, 0);
    const avgInflation = countries.reduce((sum, country) => sum + country.economicIndicators.inflationRate, 0) / countries.length;
    const avgGrowth = countries.reduce((sum, country) => sum + country.economicIndicators.growthRate, 0) / countries.length;

    return {
      totalGDP,
      totalPopulation,
      avgInflation,
      avgGrowth,
      totalCountries: countries.length
    };
  }, [countries]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-2 text-lg text-gray-600">Loading global trends data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Global Market Trends</h1>
            <p className="text-lg text-gray-600">
              Comprehensive analysis of worldwide consumption patterns, economic indicators, and market challenges across 195+ countries.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {countriesUpdateStatus.isUpdating && (
              <div className="flex items-center text-orange-600">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Updating...</span>
              </div>
            )}
            <button
              onClick={manualUpdateCountries}
              disabled={countriesUpdateStatus.isUpdating}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${countriesUpdateStatus.isUpdating ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Global GDP</p>
              <p className="text-2xl font-bold">{formatCurrency(globalStats.totalGDP)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Population</p>
              <p className="text-2xl font-bold">{formatNumber(globalStats.totalPopulation)}</p>
            </div>
            <Users className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Avg Inflation</p>
              <p className="text-2xl font-bold">{globalStats.avgInflation.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Avg Growth</p>
              <p className="text-2xl font-bold">{globalStats.avgGrowth.toFixed(1)}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Countries</p>
              <p className="text-2xl font-bold">{globalStats.totalCountries}</p>
            </div>
            <Globe className="w-8 h-8 text-indigo-200" />
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Country Details
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'compare'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Compare Countries ({compareCountries.length})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Regions</option>
              {getRegions().map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="gdp">Sort by GDP</option>
              <option value="population">Sort by Population</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Data freshness indicator */}
        {countriesUpdateStatus.lastUpdated && (
          <div className="mt-4 text-sm text-gray-600">
            Last updated: {new Date(countriesUpdateStatus.lastUpdated).toLocaleTimeString()}
            {countriesUpdateStatus.nextUpdate && (
              <span className="ml-2">
                • Next update: {new Date(countriesUpdateStatus.nextUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-8">
          {/* Regional Distribution Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">GDP by Region</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getRegions().map(region => {
                const regionCountries = countries.filter(c => c.region === region);
                const totalGDP = regionCountries.reduce((sum, c) => sum + c.gdp, 0);
                const avgGrowth = regionCountries.reduce((sum, c) => sum + c.economicIndicators.growthRate, 0) / regionCountries.length;
                return {
                  region,
                  totalGDP: totalGDP / 1000000000000, // Convert to trillions
                  avgGrowth,
                  countries: regionCountries.length
                };
              })}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'totalGDP' ? `$${value}T` : `${value}${name === 'avgGrowth' ? '%' : ''}`,
                    name === 'totalGDP' ? 'Total GDP' : name === 'avgGrowth' ? 'Avg Growth Rate' : 'Countries'
                  ]}
                />
                <Bar dataKey="totalGDP" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Countries by Various Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Top Countries by GDP</h3>
              <div className="space-y-4">
                {countries.slice(0, 5).map((country, index) => (
                  <div key={country.code} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => {setSelectedCountry(country); setViewMode('details');}}>
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{country.name}</p>
                        <p className="text-sm text-gray-600">{country.region}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(country.gdp)}</p>
                      <p className="text-sm text-green-600">+{country.economicIndicators.growthRate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Economic Indicators Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={countries.slice(0, 5).map(country => ({
                  name: country.code,
                  inflation: country.economicIndicators.inflationRate,
                  unemployment: country.economicIndicators.unemploymentRate,
                  growth: country.economicIndicators.growthRate
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  <Line type="monotone" dataKey="inflation" stroke={COLORS.danger} strokeWidth={3} />
                  <Line type="monotone" dataKey="unemployment" stroke={COLORS.accent} strokeWidth={3} />
                  <Line type="monotone" dataKey="growth" stroke={COLORS.secondary} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Countries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCountries.map((country) => (
              <div key={country.code} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{country.name}</h3>
                      <p className="text-sm text-gray-600">{country.region}</p>
                      <p className="text-xs text-gray-500 mt-1">Pop: {formatNumber(country.population)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addToCompare(country)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Add to comparison"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {setSelectedCountry(country); setViewMode('details');}}
                        className="text-gray-600 hover:text-gray-800 p-1"
                        title="View details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">GDP</span>
                      <span className="text-sm font-semibold">{formatCurrency(country.gdp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Growth Rate</span>
                      <span className={`text-sm font-semibold ${country.economicIndicators.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {country.economicIndicators.growthRate >= 0 ? '+' : ''}{country.economicIndicators.growthRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Inflation</span>
                      <span className="text-sm font-semibold text-orange-600">{country.economicIndicators.inflationRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Unemployment</span>
                      <span className="text-sm font-semibold text-red-600">{country.economicIndicators.unemploymentRate}%</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Last updated:</span>
                      <span>{new Date(country.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details Mode */}
      {viewMode === 'details' && selectedCountry && (
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedCountry.name}</h2>
                <p className="text-lg text-gray-600">{selectedCountry.region}</p>
                <p className="text-sm text-gray-500">Population: {formatNumber(selectedCountry.population)}</p>
              </div>
              <button
                onClick={() => setSelectedCountry(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Search className="w-6 h-6" />
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <DollarSign className="w-10 h-10 text-blue-600" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-900">{formatCurrency(selectedCountry.gdp)}</p>
                    <p className="text-sm text-blue-600">Gross Domestic Product</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-10 h-10 text-green-600" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-900">{selectedCountry.economicIndicators.growthRate}%</p>
                    <p className="text-sm text-green-600">Economic Growth Rate</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <BarChart3 className="w-10 h-10 text-orange-600" />
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-900">{selectedCountry.economicIndicators.inflationRate}%</p>
                    <p className="text-sm text-orange-600">Inflation Rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Consumption Breakdown */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Consumption Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Food', value: selectedCountry.consumption.food, color: COLORS.primary },
                        { name: 'Energy', value: selectedCountry.consumption.energy, color: COLORS.secondary },
                        { name: 'Fuel', value: selectedCountry.consumption.fuel, color: COLORS.accent }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {[selectedCountry.consumption.food, selectedCountry.consumption.energy, selectedCountry.consumption.fuel].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Historical Trends */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Economic Trends (5 Years)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={selectedCountry.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [formatCurrency(value as number), name]} />
                    <Area type="monotone" dataKey="gdp" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="exports" stackId="2" stroke={COLORS.secondary} fill={COLORS.secondary} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="imports" stackId="3" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exports & Imports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Exports</h3>
                <div className="space-y-3">
                  {selectedCountry.exports.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="font-semibold text-green-700">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Imports</h3>
                <div className="space-y-3">
                  {selectedCountry.imports.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="font-semibold text-red-700">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Challenges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-yellow-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  Market Challenges
                </h3>
                <ul className="space-y-2">
                  {selectedCountry.marketChallenges.map((challenge, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  Supply Chain Issues
                </h3>
                <ul className="space-y-2">
                  {selectedCountry.supplyChainIssues.map((issue, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Mode */}
      {viewMode === 'compare' && (
        <div className="space-y-8">
          {compareCountries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Countries Selected</h3>
              <p className="text-gray-600 mb-4">Add countries from the overview to start comparing economic data.</p>
              <button
                onClick={() => setViewMode('overview')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Overview
              </button>
            </div>
          ) : (
            <>
              {/* Selected Countries */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Selected Countries</h3>
                  <span className="text-sm text-gray-600">{compareCountries.length}/4 countries</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {compareCountries.map((country) => (
                    <div key={country.code} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center space-x-2">
                      <span className="text-sm font-medium">{country.name}</span>
                      <button
                        onClick={() => removeFromCompare(country.code)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">GDP Comparison</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={compareCountries.map(country => ({
                      name: country.code,
                      gdp: country.gdp / 1000000000000 // Convert to trillions
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}T`, 'GDP']} />
                      <Bar dataKey="gdp" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Economic Indicators</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={compareCountries.map(country => ({
                      name: country.code,
                      growth: country.economicIndicators.growthRate,
                      inflation: country.economicIndicators.inflationRate,
                      unemployment: country.economicIndicators.unemploymentRate
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                      <Line type="monotone" dataKey="growth" stroke={COLORS.secondary} strokeWidth={3} />
                      <Line type="monotone" dataKey="inflation" stroke={COLORS.danger} strokeWidth={3} />
                      <Line type="monotone" dataKey="unemployment" stroke={COLORS.accent} strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Comparison Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Detailed Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                        {compareCountries.map(country => (
                          <th key={country.code} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {country.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">GDP</td>
                        {compareCountries.map(country => (
                          <td key={country.code} className="px-6 py-4 text-sm text-gray-700">
                            {formatCurrency(country.gdp)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Population</td>
                        {compareCountries.map(country => (
                          <td key={country.code} className="px-6 py-4 text-sm text-gray-700">
                            {formatNumber(country.population)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Growth Rate</td>
                        {compareCountries.map(country => (
                          <td key={country.code} className="px-6 py-4 text-sm text-gray-700">
                            <span className={country.economicIndicators.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {country.economicIndicators.growthRate >= 0 ? '+' : ''}{country.economicIndicators.growthRate}%
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Inflation Rate</td>
                        {compareCountries.map(country => (
                          <td key={country.code} className="px-6 py-4 text-sm text-orange-600">
                            {country.economicIndicators.inflationRate}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Unemployment</td>
                        {compareCountries.map(country => (
                          <td key={country.code} className="px-6 py-4 text-sm text-red-600">
                            {country.economicIndicators.unemploymentRate}%
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalTrends;