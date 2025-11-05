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
export function extractErrorMessage(err: any): string {
  if (err.response) {
    // Server responded with error
    return err.response.data?.detail || 
           err.response.data?.message || 
           err.response.data?.error ||
           `Request failed with status ${err.response.status}`;
  } else if (err.request) {
    // Request was made but no response
    return 'Unable to connect to server. Please check your connection and try again.';
  } else if (err.message) {
    // Something else happened
    return err.message;
  } else {
    return 'An unexpected error occurred. Please try again.';
  }
}
