"use client";

import React from 'react';
import { TimelineEvent } from '@/types/models';

interface Props {
  events: TimelineEvent[];
}

/**
 * Renders a vertical timeline of events for a ticket. Each event displays
 * its type, description and timestamp. You can extend this component to
 * include user avatars or icons.
 */
export const TicketTimeline: React.FC<Props> = ({ events }) => {
  return (
    <ul className="space-y-4">
      {events.map((event, index) => (
        <li key={index} className="relative pl-8">
          <span className="absolute left-0 top-0 h-2 w-2 rounded-full bg-primary"></span>
          <div className="text-sm font-medium capitalize">{event.type.replace('_', ' ')}</div>
          <div className="text-sm text-gray-700">{event.description}</div>
          <div className="text-xs text-gray-500">{new Date(event.at).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
};