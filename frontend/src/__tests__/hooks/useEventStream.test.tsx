import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventStream } from '../../hooks/useEventStream';

// Mock fetch for SSE connection
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useEventStream', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('does not connect when enabled is false', async () => {
    renderHook(
      () => useEventStream({ token: 'test-token', enabled: false }),
      { wrapper }
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not connect when token is empty', async () => {
    renderHook(
      () => useEventStream({ token: '', enabled: true }),
      { wrapper }
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('connects to the event stream with correct URL and headers', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValue(mockResponse);

    renderHook(
      () => useEventStream({ token: 'test-token', enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/events'),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
            'Accept': 'text/event-stream',
          },
        })
      );
    });
  });

  it('sets isConnected to true on successful connection', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"connected"}\n\n'),
        })
        .mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useEventStream({ token: 'test-token', enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    }, { timeout: 3000 });
  });

  it('calls onEvent when receiving an event', async () => {
    const onEvent = vi.fn();
    const testEvent = {
      type: 'ticket.created',
      actorRole: 'TENANT',
      resources: [{ type: 'ticket', id: 'ticket-123' }],
      version: 1,
      at: new Date().toISOString(),
    };

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"connected"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(`data: ${JSON.stringify({ data: testEvent })}\n\n`),
        })
        .mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValue(mockResponse);

    renderHook(
      () => useEventStream({ token: 'test-token', enabled: true, onEvent }),
      { wrapper }
    );

    await waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ticket.created',
        actorRole: 'TENANT',
      }));
    }, { timeout: 3000 });
  });

  it('invalidates ticket queries when receiving ticket events', async () => {
    const testEvent = {
      type: 'ticket.updated',
      actorRole: 'LANDLORD',
      resources: [{ type: 'ticket', id: 'ticket-123' }],
      version: 1,
      at: new Date().toISOString(),
    };

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"connected"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(`data: ${JSON.stringify({ data: testEvent })}\n\n`),
        })
        .mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValue(mockResponse);

    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(
      () => useEventStream({ token: 'test-token', enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['tickets'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['ticket', 'ticket-123'] });
    }, { timeout: 3000 });
  });

  it('calls disconnect to close the connection', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useEventStream({ token: 'test-token', enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Disconnect
    result.current.disconnect();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    expect(mockReader.cancel).toHaveBeenCalled();
  });

  it('handles connection errors with onError callback', async () => {
    const onError = vi.fn();

    mockFetch.mockRejectedValue(new Error('Connection failed'));

    renderHook(
      () => useEventStream({ token: 'test-token', enabled: true, onError }),
      { wrapper }
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('cleans up on unmount', async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      cancel: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValue(mockResponse);

    const { unmount } = renderHook(
      () => useEventStream({ token: 'test-token', enabled: true }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    unmount();

    expect(mockReader.cancel).toHaveBeenCalled();
  });
});
