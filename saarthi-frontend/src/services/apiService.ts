// src/services/apiService.ts
import { UserProfile, Scheme, SchemeRecommendation } from '@/types';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

interface CreateUserResponse extends ApiResponse {
  user?: UserProfile & { id: string };
  recommendations?: SchemeRecommendation[];
}

interface RecommendationsResponse extends ApiResponse {
  recommendations: SchemeRecommendation[];
  count: number;
}

interface SchemesResponse extends ApiResponse {
  schemes: Scheme[];
  count: number;
  filters?: Record<string, any>;
}

interface SchemeResponse extends ApiResponse {
  scheme: Scheme;
  eligibilityCheck?: {
    eligible: boolean;
    reasons: string[];
    confidence: number;
  };
  personalizedExplanation?: string;
}

interface HealthResponse extends ApiResponse {
  status: 'OK' | 'ERROR';
  version?: string;
  uptime?: number;
  services?: {
    elevenlabs: boolean;
    gemini: boolean;
    database: string;
  };
}

class ApiService {
  private readonly baseURL: string = 'http://localhost:3001';
  private readonly timeout: number = 10000; // 10 seconds

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async createUser(profileData: Partial<UserProfile>): Promise<CreateUserResponse> {
    try {
      console.log('👤 Creating user:', profileData.name);

      const response = await this.fetchWithTimeout(`${this.baseURL}/api/users`, {
        method: 'POST',
        body: JSON.stringify(profileData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      console.log('✅ User created successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Create user failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create user');
    }
  }

  async getRecommendations(userId: string): Promise<RecommendationsResponse> {
    try {
      console.log('🎯 Fetching recommendations for user:', userId);

      const response = await this.fetchWithTimeout(
        `${this.baseURL}/api/users/${userId}/recommendations`
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      console.log('✅ Recommendations fetched:', result.count);
      return result;

    } catch (error) {
      console.error('❌ Get recommendations failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get recommendations');
    }
  }

  async getSchemes(filters: Record<string, any> = {}): Promise<SchemesResponse> {
    try {
      console.log('📋 Fetching schemes with filters:', filters);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const url = `${this.baseURL}/api/schemes${params.toString() ? `?${params}` : ''}`;
      const response = await this.fetchWithTimeout(url);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      console.log('✅ Schemes fetched:', result.count);
      return result;

    } catch (error) {
      console.error('❌ Get schemes failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get schemes');
    }
  }

  async getScheme(schemeId: string, userId?: string): Promise<SchemeResponse> {
    try {
      console.log('📄 Fetching scheme details:', schemeId);

      const params = userId ? `?userId=${userId}` : '';
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/api/schemes/${schemeId}${params}`
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      console.log('✅ Scheme details fetched:', result.scheme?.title);
      return result;

    } catch (error) {
      console.error('❌ Get scheme failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get scheme details');
    }
  }

  async getSchemeCategories(): Promise<{ success: boolean; categories: string[]; count: number }> {
    try {
      console.log('🏷️ Fetching scheme categories');

      const response = await this.fetchWithTimeout(`${this.baseURL}/api/schemes/categories`);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      console.log('✅ Categories fetched:', result.count);
      return result;

    } catch (error) {
      console.error('❌ Get categories failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get categories');
    }
  }

  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Health check passed:', result.status);
      return result;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        success: false,
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Backend unavailable',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Utility method to check if backend is available
  async isBackendAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'OK';
    } catch {
      return false;
    }
  }

  // Get base URL for external use
  getBaseURL(): string {
    return this.baseURL;
  }
}

export default new ApiService();
