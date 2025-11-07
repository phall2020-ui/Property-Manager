import { useState, useEffect } from 'react';

/**
 * Custom hook for debounced search input.
 * 
 * Usage:
 * ```tsx
 * const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebounce('', 300);
 * 
 * // Use searchTerm for the input value
 * <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 * 
 * // Use debouncedSearchTerm for API calls or filtering
 * useQuery(['items', debouncedSearchTerm], () => fetchItems(debouncedSearchTerm));
 * ```
 * 
 * @param initialValue - Initial value for the search term
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with searchTerm, debouncedSearchTerm, and setSearchTerm
 */
export function useDebounce<T = string>(initialValue: T = '' as T, delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState<T>(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<T>(initialValue);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    // Clean up the timeout if searchTerm changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delay]);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
  };
}
