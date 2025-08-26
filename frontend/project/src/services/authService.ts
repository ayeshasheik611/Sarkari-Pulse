// Authentication service for API calls
const API_BASE_URL = 'https://sarkari-pulse.onrender.com';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface LoginRequest {
  identifier: string; // Can be email or username
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  // Set authorization header for API calls
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  // API call helper with error handling
  private async apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: this.getAuthHeaders(),
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('🔐 AuthService: Attempting login for:', credentials.identifier);
    
    try {
      const response = await this.apiCall<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      console.log('📡 AuthService: Login response received');

      // Handle your backend's nested response format
      let authResponse: AuthResponse;
      
      if (response.success && response.data) {
        // Your backend format: { success, message, data: { user, token } }
        const userData = response.data.user;
        const token = response.data.token;
        
        const user = {
          id: userData._id || userData.id,
          username: userData.username,
          email: userData.email,
          createdAt: userData.createdAt
        };
        
        console.log('👤 AuthService: Extracted user data:', JSON.stringify(user, null, 2));
        
        authResponse = {
          success: true,
          message: response.message || 'Login successful',
          user: user,
          token: token
        };
      } else if (response.token) {
        // Direct token format
        const user = response.user || {
          id: response.userId || response.id || response._id,
          username: response.username || response.user?.username,
          email: response.email || response.user?.email,
          createdAt: response.createdAt || response.user?.createdAt || new Date().toISOString()
        };
        
        authResponse = {
          success: true,
          message: response.message || 'Login successful',
          user: user,
          token: response.token
        };
      } else if (response.success) {
        // Standard format
        authResponse = response;
      } else {
        // Error format
        authResponse = {
          success: false,
          message: response.message || 'Login failed'
        };
      }

      console.log('🔄 AuthService: Processed response:', JSON.stringify(authResponse, null, 2));

      if (authResponse.success && authResponse.token) {
        this.token = authResponse.token;
        localStorage.setItem('auth_token', authResponse.token);
        localStorage.setItem('user', JSON.stringify(authResponse.user));
        console.log('✅ AuthService: Login successful, token stored');
      }

      return authResponse;
    } catch (error) {
      console.error('❌ AuthService: Login error:', error);
      throw error;
    }
  }

  // Register new user
  async signup(userData: SignupRequest): Promise<AuthResponse> {
    console.log('📝 AuthService: Attempting signup for:', userData.email);
    
    try {
      const response = await this.apiCall<any>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      console.log('📡 AuthService: Signup raw response:', JSON.stringify(response, null, 2));

      // Handle your backend's nested response format
      let authResponse: AuthResponse;
      
      if (response.success && response.data) {
        // Your backend format: { success, message, data: { user, token } }
        const userInfo = response.data.user;
        const token = response.data.token;
        
        const user = {
          id: userInfo._id || userInfo.id,
          username: userInfo.username,
          email: userInfo.email,
          createdAt: userInfo.createdAt
        };
        
        authResponse = {
          success: true,
          message: response.message || 'Signup successful',
          user: user,
          token: token
        };
      } else {
        authResponse = {
          success: false,
          message: response.message || 'Signup failed'
        };
      }

      if (authResponse.success && authResponse.token) {
        this.token = authResponse.token;
        localStorage.setItem('auth_token', authResponse.token);
        localStorage.setItem('user', JSON.stringify(authResponse.user));
        console.log('✅ AuthService: Signup successful, token stored');
      }

      return authResponse;
    } catch (error) {
      console.error('❌ AuthService: Signup error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    console.log('🚪 Logging out user');
    
    try {
      // Call logout endpoint to invalidate token on server
      await this.apiCall('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }

    // Clear local storage
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    console.log('✅ Logout complete');
  }

  // Verify token and get user info
  async verifyToken(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    try {
      console.log('🔍 Verifying token...');
      const response = await this.apiCall<{ success: boolean; user: User }>('/api/auth/profile');
      
      if (response.success) {
        console.log('✅ Token verified');
        return response.user;
      }
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      // Clear invalid token
      this.logout();
    }

    return null;
  }

  // Get current token
  getToken(): string | null {
    return this.token;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Get stored user data
  getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      console.log('🔄 Refreshing token...');
      const response = await this.apiCall<{ success: boolean; token: string }>('/api/auth/refresh');
      
      if (response.success && response.token) {
        this.token = response.token;
        localStorage.setItem('auth_token', response.token);
        console.log('✅ Token refreshed');
        return true;
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.logout();
    }

    return false;
  }
}

export default AuthService;