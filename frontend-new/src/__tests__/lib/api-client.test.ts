import { describe, it, expect, vi } from 'vitest';
import axios, { AxiosError } from 'axios';
import { parseApiError, createApiClient } from '../../lib/api-client';
import type { ProblemDetails } from '../../lib/api-client';

describe('parseApiError', () => {
  it('should parse RFC 7807 error response', () => {
    const problemDetails: ProblemDetails = {
      type: 'https://example.com/errors/validation',
      title: 'Validation Failed',
      status: 422,
      detail: 'The request contains invalid data',
      errors: {
        email: ['Email is required', 'Email must be valid'],
        password: ['Password must be at least 8 characters'],
      },
    };

    const axiosError = {
      isAxiosError: true,
      response: {
        data: problemDetails,
        status: 422,
      },
    } as AxiosError;

    const result = parseApiError(axiosError);

    expect(result.message).toBe('Validation Failed');
    expect(result.status).toBe(422);
    expect(result.code).toBe('https://example.com/errors/validation');
    expect(result.details).toBe('The request contains invalid data');
    expect(result.fieldErrors).toEqual({
      email: ['Email is required', 'Email must be valid'],
      password: ['Password must be at least 8 characters'],
    });
  });

  it('should parse standard error with message', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: 'User not found',
        },
        status: 404,
      },
    } as AxiosError;

    const result = parseApiError(axiosError);

    expect(result.message).toBe('User not found');
    expect(result.status).toBe(404);
  });

  it('should handle network errors', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Network Error',
    } as AxiosError;

    const result = parseApiError(axiosError);

    expect(result.message).toBe('Network error. Please check your connection and try again.');
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.technicalDetails).toBe('Network Error');
  });

  it('should handle 401 errors', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {},
        status: 401,
      },
    } as AxiosError;

    const result = parseApiError(axiosError);

    expect(result.message).toBe('You need to be logged in to perform this action.');
    expect(result.status).toBe(401);
  });

  it('should handle 403 errors', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {},
        status: 403,
      },
    } as AxiosError;

    const result = parseApiError(axiosError);

    expect(result.message).toBe("You don't have permission to perform this action.");
    expect(result.status).toBe(403);
  });

  it('should handle 500 errors', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {},
        status: 500,
      },
    } as AxiosError;

    const result = parseApiError(axiosError);

    expect(result.message).toBe('A server error occurred. Please try again.');
    expect(result.status).toBe(500);
  });

  it('should handle non-Axios errors', () => {
    const error = new Error('Something went wrong');

    const result = parseApiError(error);

    expect(result.message).toBe('An unexpected error occurred');
    expect(result.technicalDetails).toBe('Something went wrong');
  });

  it('should handle unknown errors', () => {
    const result = parseApiError('unknown error');

    expect(result.message).toBe('An unexpected error occurred');
    expect(result.technicalDetails).toBe('unknown error');
  });
});

describe('createApiClient', () => {
  it('should create axios instance with correct config', () => {
    const client = createApiClient();

    expect(client.defaults.baseURL).toBeDefined();
    expect(client.defaults.withCredentials).toBe(true);
    expect(client.defaults.headers['Content-Type']).toBe('application/json');
    expect(client.defaults.timeout).toBe(30000);
  });

  it('should attach JWT token in request interceptor', async () => {
    const client = createApiClient();
    const mockToken = 'test-token-123';
    
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(mockToken);

    // Mock the request to avoid actual HTTP call
    const mockRequest = {
      headers: {},
      url: '/test',
    };

    // Get the request interceptor
    const interceptor = client.interceptors.request['handlers'][0];
    const result = await interceptor.fulfilled(mockRequest as any);

    expect(result.headers.Authorization).toBe(`Bearer ${mockToken}`);
    
    vi.restoreAllMocks();
  });
});
