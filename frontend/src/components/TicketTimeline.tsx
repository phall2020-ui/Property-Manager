import { useQuery } from '@tanstack/react-query';
import { Clock, User } from 'lucide-react';
import { ticketsApi } from '../lib/api';

interface TimelineEvent {
  id: string;
  ticketId: string;
  eventType: string;
  actorId: string;
  details: string;
  createdAt: string;
}

interface TicketTimelineProps {
  ticketId: string;
}

export default function TicketTimeline({ ticketId }: TicketTimelineProps) {
  const { data: timeline, isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['ticket-timeline', ticketId],
    queryFn: () => ticketsApi.getTimeline(ticketId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No timeline events yet</p>
      </div>
    );
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-blue-100 text-blue-600';
      case 'status_changed':
        return 'bg-purple-100 text-purple-600';
      case 'quote_submitted':
        return 'bg-yellow-100 text-yellow-600';
      case 'approved':
        return 'bg-green-100 text-green-600';
      case 'completed':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const parseDetails = (details: string) => {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  const formatDetails = (eventType: string, details: Record<string, unknown>) => {
    switch (eventType) {
      case 'created':
        return `Created with priority: ${details.priority}`;
      case 'status_changed':
        return `Status changed from ${details.from} to ${details.to}`;
      case 'quote_submitted':
        return `Quote submitted: $${details.amount}`;
      case 'approved':
        return 'Ticket approved';
      case 'completed':
        return 'Work completed';
      default:
        return formatEventType(eventType);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {timeline.map((event, eventIdx) => {
          const details = parseDetails(event.details);
          const isLast = eventIdx === timeline.length - 1;

          return (
            <li key={event.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getEventColor(
                        event.eventType
                      )}`}
                    >
                      <User className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatEventType(event.eventType)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDetails(event.eventType, details)}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      <time dateTime={event.createdAt}>{formatTime(event.createdAt)}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
