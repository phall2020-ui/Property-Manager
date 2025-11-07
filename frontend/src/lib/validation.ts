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
        return response.data?.detail || 
               response.data?.message || 
               response.data?.error ||
               `Request failed with status ${response.status || 'unknown'}`;
      }
    }
    
    // Check for request error (no response)
    if ('request' in err) {
      return 'Unable to connect to server. Please check your connection and try again.';
    }
    
    // Check for generic error with message
    if ('message' in err && typeof (err as { message: string }).message === 'string') {
      return (err as { message: string }).message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}
