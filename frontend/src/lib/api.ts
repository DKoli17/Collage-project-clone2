// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔗 API Base URL:', API_BASE_URL);

// Create headers with auth token if available
export const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authToken = token || localStorage.getItem('auth_token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
};

// API endpoints
export const ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/auth/login',
  SIGNUP: '/auth/register',
  GET_CURRENT_USER: '/auth/me',
  UPDATE_PROFILE: '/auth/profile',
  DELETE_ACCOUNT: '/auth/account',

  // Discount endpoints
  GET_ALL_DISCOUNTS: '/discounts',
  GET_DISCOUNT: (id: string) => `/discounts/${id}`,
  CREATE_DISCOUNT: '/discounts',
  UPDATE_DISCOUNT: (id: string) => `/discounts/${id}`,
  DELETE_DISCOUNT: (id: string) => `/discounts/${id}`,
  REDEEM_DISCOUNT: (id: string) => `/discounts/${id}/redeem`,

  // User endpoints
  GET_ALL_USERS: '/users',
  GET_USER: (id: string) => `/users/${id}`,
  UPDATE_USER_ROLE: (id: string) => `/users/${id}/role`,
  VERIFY_USER: (id: string) => `/users/${id}/verify`,
  DEACTIVATE_USER: (id: string) => `/users/${id}/deactivate`,

  // Admin endpoints
  GET_ANALYTICS: '/admin/analytics',
};

// API request helper
export const apiRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  token?: string
) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: getHeaders(token),
    credentials: 'include', // Include cookies for CORS
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request failed: ${endpoint}`, error);
    throw error;
  }
};

// Default API client with convenience methods
const api = {
  get: (endpoint: string, token?: string) => apiRequest(endpoint, 'GET', undefined, token),
  post: (endpoint: string, data?: any, token?: string) => apiRequest(endpoint, 'POST', data, token),
  put: (endpoint: string, data?: any, token?: string) => apiRequest(endpoint, 'PUT', data, token),
  delete: (endpoint: string, token?: string) => apiRequest(endpoint, 'DELETE', undefined, token),
};

export default api;
