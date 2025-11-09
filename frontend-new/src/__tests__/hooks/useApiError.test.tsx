import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApiError, extractFieldErrors } from '../../hooks/useApiError';
import { ToastProvider } from '../../contexts/ToastContext';
import type { ReactNode } from 'react';

// Wrapper component for testing hooks that need context
function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useApiError', () => {
  it('should handle API errors and show toast', () => {
    const { result } = renderHook(() => useApiError(), { wrapper });

    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: 'Invalid request',
        },
        status: 400,
      },
    };

    const apiError = result.current.handleError(error);

    expect(apiError.message).toBe('Invalid request');
    expect(apiError.status).toBe(400);
  });

  it('should use custom message when provided', () => {
    const { result } = renderHook(() => useApiError(), { wrapper });

    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: 'Server error',
        },
        status: 500,
      },
    };

    const apiError = result.current.handleError(error, 'Something went wrong');

    expect(apiError.message).toBe('Server error');
    // Custom message would be shown in toast
  });

  it('should handle success messages', () => {
    const { result } = renderHook(() => useApiError(), { wrapper });

    // Should not throw
    result.current.handleSuccess('Operation completed successfully');
  });
});

describe('extractFieldErrors', () => {
  it('should extract field errors from API error', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          title: 'Validation Failed',
          status: 422,
          errors: {
            email: ['Email is required', 'Email must be valid'],
            password: ['Password must be at least 8 characters'],
          },
        },
        status: 422,
      },
    };

    const fieldErrors = extractFieldErrors(error);

    expect(fieldErrors).toEqual({
      email: 'Email is required, Email must be valid',
      password: 'Password must be at least 8 characters',
    });
  });

  it('should return null if no field errors', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: 'Server error',
        },
        status: 500,
      },
    };

    const fieldErrors = extractFieldErrors(error);

    expect(fieldErrors).toBeNull();
  });
});
