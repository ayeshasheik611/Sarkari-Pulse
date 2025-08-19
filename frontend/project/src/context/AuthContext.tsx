import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService, { User, LoginRequest, SignupRequest } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authService = AuthService.getInstance();

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 Initializing authentication...');
      
      // Check if user has a stored token
      if (authService.isAuthenticated()) {
        try {
          // Verify the token with the server
          const userData = await authService.verifyToken();
          
          if (userData) {
            setIsAuthenticated(true);
            setUser(userData);
            console.log('✅ User authenticated from stored token');
          } else {
            // Token is invalid, get stored user data as fallback
            const storedUser = authService.getStoredUser();
            if (storedUser) {
              setIsAuthenticated(true);
              setUser(storedUser);
              console.log('⚠️ Using stored user data (offline mode)');
            }
          }
        } catch (error) {
          console.error('❌ Token verification failed:', error);
          // Clear invalid authentication
          await authService.logout();
        }
      }
      
      setIsLoading(false);
      console.log('✅ Authentication initialization complete');
    };

    initializeAuth();
  }, [authService]);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('🔐 AuthContext: Starting login process...');
      const response = await authService.login({ identifier, password });
      
      console.log('📡 AuthContext: Login response received:', response);
      
      // Check if login was successful (either has user or has token)
      if (response.success && (response.user || response.token)) {
        console.log('✅ AuthContext: Setting authenticated state');
        
        // Use provided user or create a minimal user object
        const user = response.user || {
          id: 'temp-id',
          username: identifier.split('@')[0], // Use part of email as username
          email: identifier,
          createdAt: new Date().toISOString()
        };
        
        console.log('👤 AuthContext: Using user data:', JSON.stringify(user, null, 2));
        
        // Force state updates in sequence to ensure re-render
        setUser(user);
        setIsAuthenticated(true);
        
        console.log('🎯 AuthContext: Authentication state updated');
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          console.log('🔄 AuthContext: Final state check - isAuthenticated:', true);
        }, 100);
        
        return { success: true, message: 'Login successful!' };
      } else {
        console.log('❌ AuthContext: Login failed - response:', JSON.stringify(response, null, 2));
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Login failed. Please try again.' 
      };
    }
  };

  const signup = async (username: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authService.signup({ username, email, password });
      
      if (response.success && response.user) {
        setIsAuthenticated(true);
        setUser(response.user);
        return { success: true, message: 'Account created successfully!' };
      } else {
        return { success: false, message: response.message || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Signup failed. Please try again.' 
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      isLoading,
      login,
      signup,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};