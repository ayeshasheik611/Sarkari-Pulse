import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, Calendar, MapPin, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useData } from '../context/DataContext';

const SchemeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { schemes } = useData();
  const scheme = schemes.find(s => s.id === id);

  if (!scheme) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Scheme not found</h3>
          <p className="text-gray-500 mb-4">The requested scheme could not be found.</p>
          <Link to="/schemes" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Schemes
          </Link>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 10000000000) return `₹${(num / 10000000000).toFixed(1)}K Cr`;
    if (num >= 1000000000) return `₹${(num / 1000000000).toFixed(1)} Cr`;
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link to="/schemes" className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Schemes</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{scheme.name}</h1>
            <p className="text-lg text-gray-600 mb-2">{scheme.ministry}</p>
            <div className="flex items-center space-x-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {scheme.sector}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                scheme.status === 'Active' ? 'bg-green-100 text-green-800' :
                scheme.status === 'Inactive' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {scheme.status}
              </span>
            </div>
          </div>
          <a
            href={scheme.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Official Website</span>
          </a>
        </div>

        <p className="text-xl text-gray-700 leading-relaxed mb-6">{scheme.objective}</p>
        <p className="text-gray-600 leading-relaxed">{scheme.description}</p>
        
        {/* Real-time update indicator */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-green-600">
            ✅ Live data • Last updated: {new Date(scheme.lastUpdated).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-10 h-10 text-blue-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{formatNumber(scheme.beneficiaries)}</p>
              <p className="text-sm text-gray-600">Current Beneficiaries</p>
            </div>
          </div>
          <div className="bg-blue-200 rounded-full h-3 mb-2">
            <div 
              className="bg-blue-600 h-3 rounded-full" 
              style={{ width: `${getProgressPercentage(scheme.beneficiaries, scheme.targetBeneficiaries)}%` }}
            ></div>
          </div>
          <p className="text-sm text-blue-600">
            Target: {formatNumber(scheme.targetBeneficiaries)} ({getProgressPercentage(scheme.beneficiaries, scheme.targetBeneficiaries).toFixed(1)}% achieved)
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-10 h-10 text-green-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(scheme.budgetUtilized)}</p>
              <p className="text-sm text-gray-600">Budget Utilized</p>
            </div>
          </div>
          <div className="bg-green-200 rounded-full h-3 mb-2">
            <div 
              className="bg-green-600 h-3 rounded-full" 
              style={{ width: `${getProgressPercentage(scheme.budgetUtilized, scheme.budget)}%` }}
            ></div>
          </div>
          <p className="text-sm text-green-600">
            Total Budget: {formatCurrency(scheme.budget)} ({getProgressPercentage(scheme.budgetUtilized, scheme.budget).toFixed(1)}% used)
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-10 h-10 text-orange-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{scheme.launchYear}</p>
              <p className="text-sm text-gray-600">Launch Year</p>
            </div>
          </div>
          <p className="text-sm text-orange-600">
            Running for {new Date().getFullYear() - scheme.launchYear} years
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <MapPin className="w-10 h-10 text-purple-600" />
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{scheme.regionStats.length}</p>
              <p className="text-sm text-gray-600">States Covered</p>
            </div>
          </div>
          <p className="text-sm text-purple-600">Pan-India Coverage</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Progress Over Time */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Progress Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scheme.progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'beneficiaries' ? formatNumber(value as number) : formatCurrency(value as number),
                  name === 'beneficiaries' ? 'Beneficiaries' : 'Budget'
                ]}
              />
              <Line type="monotone" dataKey="beneficiaries" stroke="#3B82F6" strokeWidth={3} />
              <Line type="monotone" dataKey="budget" stroke="#10B981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* State-wise Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Top 5 States by Beneficiaries</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scheme.regionStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip formatter={(value) => formatNumber(value as number)} />
              <Bar dataKey="beneficiaries" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* State-wise Details */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">State-wise Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiaries</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Allocated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scheme.regionStats.map((region, index) => (
                <tr key={region.state} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${COLORS[index % COLORS.length]}`} style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-sm font-medium text-gray-900">{region.state}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(region.beneficiaries)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(region.budget)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(region.beneficiaries / scheme.beneficiaries) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {((region.beneficiaries / scheme.beneficiaries) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Eligibility Criteria */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Eligibility Criteria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(scheme.eligibility).map(([key, value]) => (
            <div key={key} className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-gray-600">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchemeDetail;