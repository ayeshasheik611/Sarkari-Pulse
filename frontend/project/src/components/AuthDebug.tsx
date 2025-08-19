import React from 'react';
import { useAuth } from '../context/AuthContext';

const AuthDebug: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="mb-2 font-bold text-yellow-300">Auth Debug</div>
      <div>Loading: {isLoading ? '✅' : '❌'}</div>
      <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
      <div>User: {user ? '✅' : '❌'}</div>
      {user && (
        <div className="mt-2 text-xs">
          <div>ID: {user.id}</div>
          <div>Username: {user.username}</div>
          <div>Email: {user.email}</div>
        </div>
      )}
      <div className="mt-2">
        Token: {localStorage.getItem('auth_token') ? '✅' : '❌'}
      </div>
    </div>
  );
};

export default AuthDebug;