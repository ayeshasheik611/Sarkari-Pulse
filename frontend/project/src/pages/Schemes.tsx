import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, TrendingUp, Users, DollarSign, Calendar, MapPin, ExternalLink, RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getSectors, getMinistries, formatCurrency, formatNumber } from '../utils/schemeUtils';

const Schemes: React.FC = () => {
  const { schemes, isLoading, schemesUpdateStatus, manualUpdateSchemes } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('beneficiaries');

  // Get dynamic sectors and ministries from actual data
  const availableSectors = useMemo(() => getSectors(schemes), [schemes]);
  const availableMinistries = useMemo(() => getMinistries(schemes), [schemes]);

  const filteredSchemes = useMemo(() => {
    let filtered = schemes.filter(scheme => {
      const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           scheme.objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           scheme.ministry.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = !selectedSector || scheme.sector.includes(selectedSector);
      const matchesMinistry = !selectedMinistry || scheme.ministry === selectedMinistry;
      const matchesStatus = !selectedStatus || scheme.status === selectedStatus;

      return matchesSearch && matchesSector && matchesMinistry && matchesStatus;
    });

    // Sort schemes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'beneficiaries':
          return b.beneficiaries - a.beneficiaries;
        case 'budget':
          return b.budget - a.budget;
        case 'year':
          return b.launchYear - a.launchYear;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [schemes, searchTerm, selectedSector, selectedMinistry, selectedStatus, sortBy]);

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-2 text-lg text-gray-600">Loading schemes data...</span>
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
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Government Schemes</h1>
            <p className="text-lg text-gray-600">
              Track progress and impact of major Indian government schemes with real-time data and insights.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {schemesUpdateStatus.isUpdating && (
              <div className="flex items-center text-blue-600">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Updating...</span>
              </div>
            )}
            <button
              onClick={async () => {
                try {
                  const dataService = (await import('../services/dataService')).DataService.getInstance();
                  await dataService.triggerScraping();
                } catch (error) {
                  console.error('Failed to trigger scraping:', error);
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Scrape New</span>
            </button>
            <button
              onClick={manualUpdateSchemes}
              disabled={schemesUpdateStatus.isUpdating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${schemesUpdateStatus.isUpdating ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Schemes</p>
              <p className="text-2xl font-bold text-gray-900">{schemes.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Schemes</p>
              <p className="text-2xl font-bold text-green-900">
                {schemes.filter(s => s.status === 'Active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ministries</p>
              <p className="text-2xl font-bold text-purple-900">{availableMinistries.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sectors</p>
              <p className="text-2xl font-bold text-orange-900">{availableSectors.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Filter className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search schemes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sector Filter */}
          <div>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sectors</option>
              {availableSectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="beneficiaries">Sort by Beneficiaries</option>
              <option value="budget">Sort by Budget</option>
              <option value="year">Sort by Launch Year</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing <span className="font-semibold">{filteredSchemes.length}</span> of {schemes.length} schemes
          {schemesUpdateStatus.lastUpdated && (
            <span className="ml-2 text-sm text-green-600">
              • Last updated: {new Date(schemesUpdateStatus.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSchemes.map((scheme) => (
          <div key={scheme.id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{scheme.name}</h3>
                    {scheme.schemeId && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        ID: {scheme.schemeId.slice(-8)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{scheme.ministry}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-blue-600 font-medium">{scheme.sector}</p>
                    <span className="text-xs text-gray-500">• {scheme.source}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {scheme.beneficiaryState !== 'All' ? `State: ${scheme.beneficiaryState}` : 'All States'} • 
                    Level: {scheme.eligibility.level}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    scheme.status === 'Active' ? 'bg-green-100 text-green-800' :
                    scheme.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {scheme.status}
                  </span>
                </div>
              </div>

              {/* Objective */}
              <p className="text-gray-700 mb-6 leading-relaxed">{scheme.objective}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-900">{formatNumber(scheme.beneficiaries)}</p>
                      <p className="text-sm text-blue-600">Beneficiaries</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${getProgressPercentage(scheme.beneficiaries, scheme.targetBeneficiaries)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {getProgressPercentage(scheme.beneficiaries, scheme.targetBeneficiaries).toFixed(1)}% of target
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(scheme.budgetUtilized)}</p>
                      <p className="text-sm text-green-600">Budget Used</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="bg-green-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${getProgressPercentage(scheme.budgetUtilized, scheme.budget)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {getProgressPercentage(scheme.budgetUtilized, scheme.budget).toFixed(1)}% utilized
                    </p>
                  </div>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Launched {scheme.launchYear}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{scheme.regionStats.length} States</span>
                  </div>
                </div>
                <span>Updated {new Date(scheme.lastUpdated).toLocaleDateString('en-IN')}</span>
              </div>

              {/* Data Source Info */}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-6 pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-3">
                  <span>Source: {scheme.source.replace('-', ' ').toUpperCase()}</span>
                  {scheme.scrapedAt && (
                    <span>Scraped: {new Date(scheme.scrapedAt).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
                {scheme.schemeId && (
                  <span className="font-mono">#{scheme.schemeId.slice(-6)}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Link
                  to={`/schemes/${scheme.id}`}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>View Details</span>
                </Link>
                <a
                  href={scheme.officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Official Site</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredSchemes.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schemes found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Schemes;