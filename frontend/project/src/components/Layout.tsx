import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Globe, Home, Menu, X, LogOut, User } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import UpdateIndicator from './UpdateIndicator';
import UpdateNotification from './UpdateNotification';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'schemes' | 'global'}>>([]);
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const {
    schemesUpdateStatus,
    countriesUpdateStatus,
    manualUpdateSchemes,
    manualUpdateCountries
  } = useData();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Government Schemes', href: '/schemes', icon: BarChart3 },
    { name: 'Global Trends', href: '/global-trends', icon: Globe },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Show notifications when data updates
  useEffect(() => {
    if (schemesUpdateStatus.lastUpdated && !schemesUpdateStatus.isUpdating) {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, {
        id,
        message: 'Government schemes data has been refreshed with latest information.',
        type: 'schemes'
      }]);
    }
  }, [schemesUpdateStatus.lastUpdated]);

  useEffect(() => {
    if (countriesUpdateStatus.lastUpdated && !countriesUpdateStatus.isUpdating) {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, {
        id,
        message: 'Global market trends data has been updated.',
        type: 'global'
      }]);
    }
  }, [countriesUpdateStatus.lastUpdated]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Sarkari Pulse</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Real-Time Global Insights Dashboard • Backend API • World Bank Data</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActivePath(item.href)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Update Indicators */}
              <div className="flex items-center space-x-2">
                <UpdateIndicator
                  updateStatus={schemesUpdateStatus}
                  onManualUpdate={manualUpdateSchemes}
                  dataType="Schemes"
                />
                <UpdateIndicator
                  updateStatus={countriesUpdateStatus}
                  onManualUpdate={manualUpdateCountries}
                  dataType="Global"
                />
              </div>
              
              {/* User Menu */}
              <div className="flex items-center space-x-4 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{user?.username || user?.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900 p-2"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                      isActivePath(item.href)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Update Indicators */}
              <div className="px-3 py-2 space-y-2">
                <UpdateIndicator
                  updateStatus={schemesUpdateStatus}
                  onManualUpdate={manualUpdateSchemes}
                  dataType="Schemes"
                />
                <UpdateIndicator
                  updateStatus={countriesUpdateStatus}
                  onManualUpdate={manualUpdateCountries}
                  dataType="Global"
                />
              </div>
              
              {/* Mobile User Menu */}
              <div className="px-3 py-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{user?.username || user?.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2024 Sarkari Pulse. Data sourced from World Bank Open Data, official government portals, and international organizations.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Backend API (localhost:9000) • 296 countries • 6,790+ indicators • Interactive visualizations • Export capabilities • Last updated: {new Date().toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </footer>

      {/* Update Notifications */}
      {notifications.map((notification) => (
        <UpdateNotification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default Layout;