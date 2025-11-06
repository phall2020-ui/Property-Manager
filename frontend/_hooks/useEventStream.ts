"use client";

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface EventStreamOptions {
  onEvent?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

/**
 * Hook to connect to SSE (Server-Sent Events) for real-time updates
 * This automatically invalidates React Query caches when relevant events occur
 */
export function useEventStream(options: EventStreamOptions = {}) {
  const { onEvent, onError, enabled = true } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Get access token from localStorage or memory
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.warn('No access token available for SSE connection');
      return;
    }

    // Create event source with auth token
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
    // Note: EventSource doesn't support custom headers, so we pass token as query param
    const eventSource = new EventSource(`${baseUrl}/events?token=${accessToken}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection established');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE event received:', data);

        // Handle different event types
        switch (data.type) {
          case 'ticket.created':
          case 'ticket.status_changed':
          case 'ticket.quote_submitted':
          case 'ticket.approved':
          case 'ticket.completed':
            // Invalidate tickets queries
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            if (data.ticketId) {
              queryClient.invalidateQueries({ queryKey: ['ticket', data.ticketId] });
              queryClient.invalidateQueries({ queryKey: ['ticket', data.ticketId, 'timeline'] });
            }
            break;

          case 'invoice.created':
          case 'invoice.paid':
            // Invalidate finance queries
            queryClient.invalidateQueries({ queryKey: ['finance'] });
            queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
            if (data.invoiceId) {
              queryClient.invalidateQueries({ queryKey: ['invoice', data.invoiceId] });
            }
            break;

          case 'notification':
            // Invalidate notifications queries
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
            break;

          case 'property.created':
          case 'property.updated':
            // Invalidate properties queries
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            if (data.propertyId) {
              queryClient.invalidateQueries({ queryKey: ['property', data.propertyId] });
            }
            break;

          default:
            console.log('Unknown event type:', data.type);
        }

        // Call custom event handler
        if (onEvent) {
          onEvent(event);
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
      
      if (onError) {
        onError(error);
      }
      
      // EventSource will automatically try to reconnect
    };

    // Cleanup on unmount
    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, onEvent, onError, queryClient]);

  return {
    isConnected,
    eventSource: eventSourceRef.current,
  };
}
