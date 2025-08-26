import React, { useState } from 'react';
import { Filter, X, Search, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { ProcessedCountryData } from '../services/worldBankService';

interface FilterState {
  countries: string[];
  regions: string[];
  yearRange: [number, number];
  gdpRange: [number, number];
  searchTerm: string;
  sortBy: 'name' | 'gdp' | 'population' | 'growth';
  sortOrder: 'asc' | 'desc';
}

interface DashboardFiltersProps {
  data: ProcessedCountryData[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  data,
  filters,
  onFiltersChange,
  onReset
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique values for filter options
  const regions = Array.from(new Set(data.map(country => country.region))).sort();
  const countries = data.map(country => ({ code: country.code, name: country.name })).sort((a, b) => a.name.localeCompare(b.name));
  
  const minYear = Math.min(...data.flatMap(country => country.trendData.map(trend => trend.year)));
  const maxYear = Math.max(...data.flatMap(country => country.trendData.map(trend => trend.year)));
  
  const minGDP = Math.min(...data.map(country => country.gdp));
  const maxGDP = Math.max(...data.map(country => country.gdp));

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleCountry = (countryCode: string) => {
    const newCountries = filters.countries.includes(countryCode)
      ? filters.countries.filter(c => c !== countryCode)
      : [...filters.countries, countryCode];
    updateFilter('countries', newCountries);
  };

  const toggleRegion = (region: string) => {
    const newRegions = filters.regions.includes(region)
      ? filters.regions.filter(r => r !== region)
      : [...filters.regions, region];
    updateFilter('regions', newRegions);
  };

  const formatGDP = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  const activeFiltersCount = 
    filters.countries.length + 
    filters.regions.length + 
    (filters.searchTerm ? 1 : 0) +
    (filters.yearRange[0] !== minYear || filters.yearRange[1] !== maxYear ? 1 : 0) +
    (filters.gdpRange[0] !== minGDP || filters.gdpRange[1] !== maxGDP ? 1 : 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onReset}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick Filters (Always Visible) */}
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search countries..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sort */}
        <div className="flex space-x-2">
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="gdp">Sort by GDP</option>
            <option value="population">Sort by Population</option>
            <option value="growth">Sort by Growth Rate</option>
          </select>
          <button
            onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <TrendingUp className={`w-4 h-4 ${filters.sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Regions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              Regions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {regions.map(region => (
                <label key={region} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.regions.includes(region)}
                    onChange={() => toggleRegion(region)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{region}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Year Range: {filters.yearRange[0]} - {filters.yearRange[1]}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={filters.yearRange[0]}
                onChange={(e) => updateFilter('yearRange', [parseInt(e.target.value), filters.yearRange[1]])}
                className="w-full"
              />
              <input
                type="range"
                min={minYear}
                max={maxYear}
                value={filters.yearRange[1]}
                onChange={(e) => updateFilter('yearRange', [filters.yearRange[0], parseInt(e.target.value)])}
                className="w-full"
              />
            </div>
          </div>

          {/* GDP Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GDP Range: {formatGDP(filters.gdpRange[0])} - {formatGDP(filters.gdpRange[1])}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min={minGDP}
                max={maxGDP}
                step={maxGDP / 100}
                value={filters.gdpRange[0]}
                onChange={(e) => updateFilter('gdpRange', [parseFloat(e.target.value), filters.gdpRange[1]])}
                className="w-full"
              />
              <input
                type="range"
                min={minGDP}
                max={maxGDP}
                step={maxGDP / 100}
                value={filters.gdpRange[1]}
                onChange={(e) => updateFilter('gdpRange', [filters.gdpRange[0], parseFloat(e.target.value)])}
                className="w-full"
              />
            </div>
          </div>

          {/* Countries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Countries ({filters.countries.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {countries.map(country => (
                <label key={country.code} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.countries.includes(country.code)}
                    onChange={() => toggleCountry(country.code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{country.name}</span>
                  <span className="text-xs text-gray-500">({country.code})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            {filters.searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {filters.searchTerm}
                <button
                  onClick={() => updateFilter('searchTerm', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filters.regions.map(region => (
              <span key={region} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {region}
                <button
                  onClick={() => toggleRegion(region)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            
            {filters.countries.slice(0, 3).map(countryCode => {
              const country = countries.find(c => c.code === countryCode);
              return country ? (
                <span key={countryCode} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {country.name}
                  <button
                    onClick={() => toggleCountry(countryCode)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
            
            {filters.countries.length > 3 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                +{filters.countries.length - 3} more countries
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;