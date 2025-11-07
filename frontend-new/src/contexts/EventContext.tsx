import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useEventStream } from '../hooks/useEventStream';
import type { SystemEvent } from '../hooks/useEventStream';
import { useAuth } from './AuthContext';

interface EventContextType {
  lastEvent: SystemEvent | null;
  isConnected: boolean;
  subscribe: (listener: (event: SystemEvent) => void) => () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lastEvent, setLastEvent] = useState<SystemEvent | null>(null);
  const [listeners, setListeners] = useState<Array<(event: SystemEvent) => void>>([]);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const handleEvent = useCallback((event: SystemEvent) => {
    setLastEvent(event);
    // Notify all subscribers
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }, [listeners]);

  const { isConnected } = useEventStream({
    token: token || '',
    enabled: !!user && !!token,
    onEvent: handleEvent,
    onError: (error) => {
      console.error('Event stream error:', error);
    },
  });

  const subscribe = useCallback((listener: (event: SystemEvent) => void) => {
    setListeners(prev => [...prev, listener]);
    
    // Return unsubscribe function
    return () => {
      setListeners(prev => prev.filter(l => l !== listener));
    };
  }, []);

  return (
    <EventContext.Provider value={{ lastEvent, isConnected, subscribe }}>
      {children}
    </EventContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEventContext() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
}
