import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

/**
 * RFC 7807 Problem Details for HTTP APIs
 * Standard format for API error responses
 */
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>; // Field-level validation errors
  [key: string]: unknown;
}

/**
 * UI-friendly error structure
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  details?: string;
  technicalDetails?: string;
}

/**
 * Parse RFC 7807 error response and convert to UI-friendly format
 */
export function parseApiError(error: unknown): ApiError {
  // Network error (no response)
  if (axios.isAxiosError(error) && !error.response) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      technicalDetails: error.message,
    };
  }

  // Axios error with response
  if (axios.isAxiosError(error) && error.response) {
    const { data, status } = error.response;

    // RFC 7807 format
    if (data && typeof data === 'object' && 'title' in data) {
      const problem = data as ProblemDetails;
      return {
        message: problem.title || 'An error occurred',
        status: problem.status || status,
        code: problem.type,
        details: problem.detail,
        fieldErrors: problem.errors,
        technicalDetails: JSON.stringify(problem, null, 2),
      };
    }

    // Standard error format with message
    if (data && typeof data === 'object' && 'message' in data) {
      return {
        message: String(data.message) || 'An error occurred',
        status,
        fieldErrors: 'errors' in data ? (data.errors as Record<string, string[]>) : undefined,
        technicalDetails: JSON.stringify(data, null, 2),
      };
    }

    // Generic HTTP error
    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'You need to be logged in to perform this action.',
      403: 'You don\'t have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'This action conflicts with existing data.',
      422: 'The data provided is invalid.',
      429: 'Too many requests. Please try again later.',
      500: 'A server error occurred. Please try again.',
      502: 'Service temporarily unavailable. Please try again.',
      503: 'Service temporarily unavailable. Please try again.',
      504: 'Request timeout. Please try again.',
    };

    return {
      message: statusMessages[status] || 'An unexpected error occurred',
      status,
      technicalDetails: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
    };
  }

  // Non-Axios error
  if (error instanceof Error) {
    return {
      message: 'An unexpected error occurred',
      technicalDetails: error.message,
    };
  }

  // Unknown error
  return {
    message: 'An unexpected error occurred',
    technicalDetails: String(error),
  };
}

/**
 * Create centralized Axios instance with interceptors
 */
export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
  });

  // Request interceptor - attach JWT
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Track if we're currently refreshing to prevent multiple refresh attempts
  let isRefreshing = false;
  let refreshSubscribers: ((token: string) => void)[] = [];

  function subscribeTokenRefresh(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
  }

  function onTokenRefreshed(token: string) {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
  }

  // Response interceptor - handle 401 with auto-refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 - auto-refresh token once
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Wait for the ongoing refresh to complete
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );

          const newToken = data.accessToken;
          localStorage.setItem('accessToken', newToken);
          isRefreshing = false;

          // Notify all waiting requests
          onTokenRefreshed(newToken);

          // Retry the original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear token and redirect to login
          isRefreshing = false;
          refreshSubscribers = [];
          localStorage.removeItem('accessToken');
          
          // Only redirect if we're not already on the login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// Export singleton instance
export const apiClient = createApiClient();
