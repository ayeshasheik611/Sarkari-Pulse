import React, { useState } from 'react';
import { DataService } from '../services/dataService';

const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const dataService = DataService.getInstance();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBackendConnection = async () => {
    addResult('🔄 Testing backend connection...');
    try {
      const health = await dataService.checkHealth();
      addResult('✅ Backend health check passed');
      console.log('Health response:', health);
    } catch (error) {
      addResult('❌ Backend health check failed: ' + error);
    }
  };

  const testAuth = async () => {
    addResult('🔐 Testing authentication...');
    try {
      // Test login with the credentials from the screenshot
      const loginResponse = await fetch('http://localhost:9000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'ayeshasheik611@gmail.com',
          password: 'Ayesha@2005'
        })
      });
      
      const loginData = await loginResponse.json();
      addResult('📡 Raw Response: ' + JSON.stringify(loginData, null, 2));
      addResult('🔍 Response Keys: ' + Object.keys(loginData).join(', '));
      
      if (loginData.token) {
        addResult('✅ Token found: ' + loginData.token.substring(0, 20) + '...');
        addResult('👤 User in response: ' + (loginData.user ? 'YES' : 'NO'));
        if (loginData.user) {
          addResult('👤 User data: ' + JSON.stringify(loginData.user, null, 2));
        } else {
          addResult('📋 All response data: ' + JSON.stringify(loginData, null, 2));
        }
      } else {
        addResult('❌ No token in response');
      }
    } catch (error) {
      addResult('❌ Auth test failed: ' + error);
    }
  };

  const testFetchSchemes = async () => {
    addResult('🔄 Testing fetch schemes...');
    try {
      const response = await dataService.fetchSchemes({ limit: 5, page: 1 });
      addResult(`✅ Fetched ${response.data.length} schemes`);
      console.log('Schemes response:', response);
    } catch (error) {
      addResult('❌ Fetch schemes failed: ' + error);
    }
  };

  const testWebSocket = () => {
    addResult('🔄 Testing WebSocket connection...');
    // WebSocket is already connected in the service
    addResult('📡 WebSocket connection attempt logged to console');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700"
        >
          🔧 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">Backend Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testBackendConnection}
          className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
        >
          Test Backend Health
        </button>
        <button
          onClick={testFetchSchemes}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
        >
          Test Fetch Schemes
        </button>
        <button
          onClick={testWebSocket}
          className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700"
        >
          Test WebSocket
        </button>
        <button
          onClick={testAuth}
          className="w-full bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700"
        >
          Test Auth API
        </button>
        <button
          onClick={clearResults}
          className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      <div className="bg-gray-100 p-3 rounded text-xs max-h-48 overflow-y-auto">
        <div className="font-mono">
          {testResults.length === 0 ? (
            <div className="text-gray-500">No test results yet. Click a test button above.</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;