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
 * Extracts a user-friendly error message from an API error
 * @param err Error object from axios or fetch
 * @returns User-friendly error message
 */
export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    if ('response' in err) {
      const response = (err as { response?: { data?: { detail?: string; message?: string; error?: string }; status?: number } }).response;
      if (response) {
        return response.data?.detail || 
               response.data?.message || 
               response.data?.error ||
               `Request failed with status ${response.status || 'unknown'}`;
      }
    }
    if ('request' in err) {
      // Request was made but no response
      return 'Unable to connect to server. Please check your connection and try again.';
    }
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      // Something else happened
      return (err as { message: string }).message;
    }
  }
  return 'An unexpected error occurred. Please try again.';
}
