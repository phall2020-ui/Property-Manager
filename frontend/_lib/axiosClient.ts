import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';

/**
 * API client using Axios with interceptors for better request/response handling.
 * Features:
 * - Automatic bearer token attachment
 * - 401 interceptor with automatic token refresh
 * - Request/response logging in development
 * - Problem details error handling
 */

let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Set the current in-memory access token. Refresh token is handled
 * via httpOnly cookies by the server. Clearing the token to `null` 
 * effectively logs the user out on the client side.
 */
export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  // Refresh token is now in httpOnly cookie, not stored in localStorage
}

/**
 * Initialize tokens from localStorage on app start
 * Note: Refresh token is now in httpOnly cookie, so nothing to initialize
 */
export function initTokens() {
  // Refresh token is in httpOnly cookie, managed by browser
}

/**
 * Get the current access token. Useful for attaching to headers outside of
 * this module (e.g. when uploading directly to S3).
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Legacy function for backward compatibility
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Basic problem details schema based on RFC 7807.
 */
const ProblemDetails = z.object({
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  message: z.string().optional(),
});

export type Problem = z.infer<typeof ProblemDetails>;

function parseProblem(error: AxiosError): Problem {
  if (error.response?.data) {
    const result = ProblemDetails.safeParse(error.response.data);
    if (result.success) return result.data;
    
    // If not in problem details format, try to extract message
    const data = error.response.data as any;
    if (data.message) {
      return {
        title: 'Error',
        status: error.response.status,
        detail: data.message,
      };
    }
  }
  
  return {
    title: error.message || 'Unknown error',
    status: error.response?.status,
    detail: error.response?.statusText,
  };
}

export interface RequestOptions extends Omit<AxiosRequestConfig, 'url' | 'method'> {
  /**
   * If `true` the Authorization header will not be appended and no refresh
   * attempt will be made. Useful for login/signup endpoints.
   */
  skipAuth?: boolean;
}

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || '',
  withCredentials: true, // Always include cookies for httpOnly refresh token
  timeout: 30000, // 30 second timeout
});

// Request interceptor to attach access token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if request has skipAuth flag
    const skipAuth = (config as any).skipAuth;
    
    if (accessToken && !skipAuth) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 and refresh token
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; skipAuth?: boolean };
    
    // If error is 401 and we haven't retried yet and not skipAuth
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.skipAuth) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt refresh using httpOnly cookie
        const refreshResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE || ''}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const { accessToken: newAccessToken } = refreshResponse.data;
        setTokens(newAccessToken, null); // Refresh token stays in cookie
        
        // Update the authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        
        processQueue(null, newAccessToken);
        isRefreshing = false;
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        setTokens(null, null);
        
        // Optionally redirect to login
        if (typeof window !== 'undefined') {
          // window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[API Error] ${error.response?.status} ${error.config?.url}`, error.response?.data);
    }

    // Convert axios error to Problem format and reject
    const problem = parseProblem(error);
    return Promise.reject(problem);
  }
);

/**
 * Perform an HTTP request using axios. This helper automatically
 * prefixes the URL with `NEXT_PUBLIC_API_BASE`, attaches the current access
 * token, and attempts a refresh on 401. If the refresh is successful the
 * original request is retried. Throws a Problem on non-OK responses.
 */
export async function apiRequest<T = unknown>(
  url: string,
  { skipAuth, ...options }: RequestOptions = {}
): Promise<T> {
  try {
    const response = await axiosInstance.request<T>({
      url,
      ...options,
      skipAuth, // Pass skipAuth through config
    } as any);
    return response.data;
  } catch (error) {
    // Error is already processed by interceptor
    throw error;
  }
}

// Export axios instance for direct use if needed
export { axiosInstance };
