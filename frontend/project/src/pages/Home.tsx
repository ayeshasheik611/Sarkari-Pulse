import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Globe, TrendingUp, Users, MapPin, Clock } from 'lucide-react';

const Home: React.FC = () => {
  const stats = [
    { label: 'Active Schemes', value: '156+', icon: BarChart3, color: 'bg-blue-500' },
    { label: 'Beneficiaries', value: '2.1M+', icon: Users, color: 'bg-green-500' },
    { label: 'Countries Tracked', value: '195', icon: Globe, color: 'bg-orange-500' },
    { label: 'Real-time Updates', value: '24/7', icon: Clock, color: 'bg-purple-500' },
  ];

  const features = [
    {
      title: 'Government Schemes',
      description: 'Track and analyze Indian government schemes with real-time data, eligibility criteria, and progress metrics.',
      icon: BarChart3,
      href: '/schemes',
      color: 'from-blue-500 to-blue-600',
      stats: '156+ Active Schemes'
    },
    {
      title: 'Global Market Trends',
      description: 'Monitor worldwide consumption patterns, market challenges, and economic indicators across 195+ countries.',
      icon: Globe,
      href: '/global-trends',
      color: 'from-orange-500 to-orange-600',
      stats: '195+ Countries'
    }
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="block">Sarkari Pulse</span>
              <span className="block text-orange-200 text-2xl sm:text-3xl lg:text-4xl font-medium">
                Real-Time Government & Market Intelligence
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Your comprehensive dashboard for Indian government schemes and global market trends. 
              Get real-time insights, track progress, and make informed decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/schemes"
                className="bg-white text-blue-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
              >
                Explore Schemes
              </Link>
              <Link
                to="/global-trends"
                className="bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-600 transition-colors shadow-lg"
              >
                View Global Trends
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">{stat.label}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Comprehensive Data Intelligence
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access verified, real-time data from official sources with intuitive visualizations and insights.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={index}
                to={feature.href}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                <div className="p-8">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {feature.stats}
                    </span>
                    <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Updates */}
      <section className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Updates</h2>
            <p className="text-lg text-gray-600">Stay informed with the most recent data refreshes and insights</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Scheme Data</h3>
                <span className="text-xs text-gray-500">2 min ago</span>
              </div>
              <p className="text-sm text-gray-600">Updated beneficiary counts for PM-KISAN and MGNREGA schemes</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Global Markets</h3>
                <span className="text-xs text-gray-500">15 min ago</span>
              </div>
              <p className="text-sm text-gray-600">New consumption data from World Bank for Q4 2024</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">System Status</h3>
                <span className="text-xs text-gray-500">1 hr ago</span>
              </div>
              <p className="text-sm text-gray-600">All data sources operational with 99.9% uptime</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;