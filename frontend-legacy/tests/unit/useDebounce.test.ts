import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    
    expect(result.current.searchTerm).toBe('initial');
    expect(result.current.debouncedSearchTerm).toBe('initial');
  });

  it('updates searchTerm immediately', () => {
    const { result } = renderHook(() => useDebounce('', 300));
    
    act(() => {
      result.current.setSearchTerm('test');
    });

    expect(result.current.searchTerm).toBe('test');
    expect(result.current.debouncedSearchTerm).toBe('');
  });

  it('updates debouncedSearchTerm after delay', () => {
    const { result } = renderHook(() => useDebounce('', 300));
    
    act(() => {
      result.current.setSearchTerm('test');
    });

    expect(result.current.searchTerm).toBe('test');
    expect(result.current.debouncedSearchTerm).toBe('');

    // Fast-forward time by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearchTerm).toBe('test');
  });

  it('cancels previous timeout when searchTerm changes quickly', () => {
    const { result } = renderHook(() => useDebounce('', 300));
    
    act(() => {
      result.current.setSearchTerm('test1');
    });

    // Fast-forward by 100ms (not enough to trigger debounce)
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Update again before debounce completes
    act(() => {
      result.current.setSearchTerm('test2');
    });

    // The debounced value should still be the initial value
    expect(result.current.debouncedSearchTerm).toBe('');

    // Fast-forward by another 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now it should have the latest value
    expect(result.current.debouncedSearchTerm).toBe('test2');
  });

  it('works with custom delay', () => {
    const { result } = renderHook(() => useDebounce('', 500));
    
    act(() => {
      result.current.setSearchTerm('test');
    });

    // Fast-forward by 300ms (not enough)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearchTerm).toBe('');

    // Fast-forward by another 200ms (total 500ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedSearchTerm).toBe('test');
  });

  it('handles empty string updates', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    
    act(() => {
      result.current.setSearchTerm('');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearchTerm).toBe('');
  });

  it('works with non-string values', () => {
    const { result } = renderHook(() => useDebounce<number>(0, 300));
    
    act(() => {
      result.current.setSearchTerm(42);
    });

    expect(result.current.searchTerm).toBe(42);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearchTerm).toBe(42);
  });
});
