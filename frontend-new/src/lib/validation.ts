/**
 * Email validation regex pattern
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address
 * @param email Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Structure of an API error response
 */
interface ApiErrorResponse {
  data?: {
    detail?: string;
    message?: string;
    error?: string;
  };
  status?: number;
}

/**
 * Structure of an error object with response
 */
interface ErrorWithResponse {
  response?: ApiErrorResponse;
}

/**
 * Extracts a user-friendly error message from an API error
 * @param err Error object from axios or fetch
 * @returns User-friendly error message
 */
export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    // Check for response error
    if ('response' in err) {
      const { response } = err as ErrorWithResponse;
      if (response) {
        // Handle rate limiting specifically
        if (response.status === 429) {
          return 'Too many requests. Please wait a moment and try again.';
        }
        
        return response.data?.detail || 
               response.data?.message || 
               response.data?.error ||
               `Request failed with status ${response.status || 'unknown'}`;
      }
    }
    
    // Check for request error (no response) - but only if it's a network error, not rate limiting
    if ('request' in err && !('response' in err)) {
      // Check if it's actually a network error or just a failed request
      const errorMessage = (err as { message?: string }).message || '';
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      return 'Unable to connect to server. Please check your connection and try again.';
    }
    
    // Check for generic error with message
    if ('message' in err && typeof (err as { message: string }).message === 'string') {
      const message = (err as { message: string }).message;
      if (message.includes('429') || message.includes('rate limit') || message.includes('Too many requests')) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      return message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}
