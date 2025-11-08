import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SystemEvent {
  type: string;
  actorRole: string;
  tenantId?: string;
  landlordId?: string;
  resources: Array<{ type: string; id: string }>;
  version: number;
  at: string;
  payload?: Record<string, unknown>;
}

interface UseEventStreamOptions {
  token: string;
  enabled?: boolean;
  onEvent?: (event: SystemEvent) => void;
  onError?: (error: Event) => void;
}

const MAX_RETRY_DELAY = 60000; // 60 seconds (increased to avoid rate limits)
const INITIAL_RETRY_DELAY = 5000; // 5 seconds (increased initial delay)

export function useEventStream({
  token,
  enabled = true,
  onEvent,
  onError,
}: UseEventStreamOptions) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectFnRef = useRef<(() => Promise<void>) | null>(null);

  const getApiUrl = useCallback(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
    return `${baseUrl}/events`;
  }, []);

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Skip connection messages
        if (data.type === 'connected') {
          setIsConnected(true);
          retryCountRef.current = 0; // Reset retry count on successful connection
          return;
        }

        // Extract the actual event data
        const systemEvent: SystemEvent = data.data || data;

        // Call custom event handler if provided
        if (onEvent) {
          onEvent(systemEvent);
        }

        // Invalidate relevant queries based on event type
        if (systemEvent.type.startsWith('ticket.')) {
          // Invalidate tickets list
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          
          // Invalidate specific ticket if we have the ID
          const ticketResource = systemEvent.resources?.find(r => r.type === 'ticket');
          if (ticketResource) {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketResource.id] });
            queryClient.invalidateQueries({ queryKey: ['ticket-timeline', ticketResource.id] });
          }
        } else if (systemEvent.type.startsWith('invoice.')) {
          // Invalidate invoices and payments
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          
          const invoiceResource = systemEvent.resources?.find(r => r.type === 'invoice');
          if (invoiceResource) {
            queryClient.invalidateQueries({ queryKey: ['invoice', invoiceResource.id] });
          }
        } else if (systemEvent.type.startsWith('notification.')) {
          // Invalidate notifications
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      } catch (error) {
        console.error('Error processing event:', error);
      }
    },
    [queryClient, onEvent]
  );

  const handleError = useCallback(
    (event: Event) => {
      console.error('EventSource error:', event);
      setIsConnected(false);

      if (onError) {
        onError(event);
      }

      // Close the connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Retry with exponential backoff
      const retryDelay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current),
        MAX_RETRY_DELAY
      );
      
      retryCountRef.current++;
      
      console.log(`Retrying in ${retryDelay}ms (attempt ${retryCountRef.current})`);
      
      retryTimeoutRef.current = setTimeout(() => {
        if (enabled && token && connectFnRef.current) {
          connectFnRef.current();
        }
      }, retryDelay);
    },
    [enabled, token, onError]
  );

  const connect = useCallback(async () => {
    // Clear any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (!enabled || !token) {
      return;
    }

    const apiUrl = getApiUrl();
    
    console.log('Connecting to event stream...');
    
    try {
      // Use fetch with Authorization header since EventSource doesn't support custom headers
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        // If rate limited, wait longer before retrying
        if (response.status === 429) {
          console.warn('Event stream rate limited, will retry with longer delay');
          retryCountRef.current = Math.max(retryCountRef.current, 3); // Force longer delay
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // Create a fake EventSource interface
      const fakeEventSource = {
        close: () => {
          reader.cancel();
        },
        readLoop: async () => {
          try {
            setIsConnected(true);
            retryCountRef.current = 0;
            
            let buffer = '';
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                console.log('Stream ended');
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              
              // Process complete messages
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || ''; // Keep incomplete message in buffer
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6);
                  const event = new MessageEvent('message', { data });
                  handleEvent(event);
                }
              }
            }
          } catch (error) {
            console.error('Stream read error:', error);
            handleError(new Event('error'));
          }
        }
      };

      eventSourceRef.current = fakeEventSource as unknown as EventSource;
      fakeEventSource.readLoop();
      
    } catch (error) {
      console.error('Failed to connect:', error);
      handleError(new Event('error'));
    }
  }, [enabled, token, getApiUrl, handleEvent, handleError]);

  // Store connect function in ref for handleError to use
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      setIsConnected(false);
    },
  };
}
