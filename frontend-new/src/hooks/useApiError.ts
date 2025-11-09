import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { parseApiError } from '../lib/api-client';
import type { ApiError } from '../lib/api-client';

/**
 * Hook for handling API errors with toast notifications
 * Provides consistent error handling across the application
 */
export function useApiError() {
  const toast = useToast();

  const handleError = useCallback(
    (error: unknown, customMessage?: string): ApiError => {
      const apiError = parseApiError(error);
      
      // Display toast notification
      const displayMessage = customMessage || apiError.message;
      toast.error(displayMessage);
      
      // Log to console for debugging
      console.error('API Error:', apiError);
      
      return apiError;
    },
    [toast]
  );

  const handleSuccess = useCallback(
    (message: string) => {
      toast.success(message);
    },
    [toast]
  );

  return {
    handleError,
    handleSuccess,
    parseError: parseApiError,
  };
}

/**
 * Extract field errors from API error for inline form validation
 */
export function extractFieldErrors(error: unknown): Record<string, string> | null {
  const apiError = parseApiError(error);
  
  if (!apiError.fieldErrors) {
    return null;
  }

  // Convert array of errors per field to single string
  const fieldErrors: Record<string, string> = {};
  for (const [field, errors] of Object.entries(apiError.fieldErrors)) {
    fieldErrors[field] = errors.join(', ');
  }

  return fieldErrors;
}
