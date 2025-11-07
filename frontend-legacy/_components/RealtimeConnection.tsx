"use client";

import React from 'react';
import { useEventStream } from '@/hooks/useEventStream';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeConnection() {
  const { isConnected } = useEventStream({
    enabled: true,
    onEvent: (event) => {
      console.log('Real-time event received:', event);
    },
    onError: (error) => {
      console.error('Real-time connection error:', error);
    },
  });

  return (
    <div className="flex items-center space-x-1" title={isConnected ? 'Real-time updates connected' : 'Real-time updates disconnected'}>
      {isConnected ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-gray-400" />
      )}
    </div>
  );
}
