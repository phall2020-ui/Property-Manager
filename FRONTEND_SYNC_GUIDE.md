# Frontend Synchronization Layer - Implementation Guide

## Overview

This document describes the frontend synchronization layer that provides real-time updates across Tenant, Landlord, Contractor, and Operations portals using Server-Sent Events (SSE).

## Architecture

### Components

1. **SSE Integration** (`useEventStream` hook)
   - Custom React hook for managing SSE connections
   - Automatic retry with exponential backoff
   - Integrates with TanStack Query for automatic cache invalidation

2. **Event Broadcasting** (`EventContext`)
   - Global context for event distribution
   - Allows components to subscribe to specific event types
   - Decouples SSE connection from individual components

3. **Notification System**
   - `NotificationBell`: Shows unread count badge
   - `NotificationDropdown`: Full notification list with mark-as-read
   - Real-time updates via SSE integration

4. **Toast Notifications** (`ToastContainer`)
   - Non-intrusive notifications for real-time events
   - Auto-dismisses after 5 seconds
   - Slide-in animation

5. **Optimistic Updates**
   - Ticket status updates
   - Ticket approvals
   - Instant UI feedback with automatic rollback on error

## Key Features

### ✅ Real-Time Event Streaming

- **SSE Connection**: Uses native Fetch API with ReadableStream for SSE support with custom headers
- **Automatic Retry**: Exponential backoff (1s → 30s max)
- **Role-Based Filtering**: Backend filters events based on user role and organization
- **Live Indicator**: Green "Live" badge shows connection status

### ✅ Automatic Cache Invalidation

Events automatically trigger query invalidation:

- `ticket.*` events → Invalidates `['tickets']` and `['ticket', id]` queries
- `invoice.*` events → Invalidates `['invoices']` and `['invoice', id]` queries
- `notification.*` events → Invalidates notification queries

### ✅ Optimistic UI Updates

Mutations update the UI immediately and rollback on error:

```typescript
const statusMutation = useTicketStatusMutation();
await statusMutation.mutateAsync({ id: ticketId, to: 'APPROVED' });
// UI updates instantly, then confirms with backend
```

### ✅ Event Types Supported

| Event Type | Description | Visible To |
|-----------|-------------|-----------|
| `ticket.created` | New ticket created | Landlord, Tenant, OPS |
| `ticket.status_changed` | Status updated | Landlord, Tenant, OPS |
| `ticket.quote_submitted` | Quote submitted | Landlord, Tenant, OPS |
| `ticket.approved` | Ticket approved | Landlord, Tenant, OPS |
| `ticket.completed` | Work completed | Landlord, Tenant, OPS |
| `invoice.created` | New invoice issued | Landlord, Tenant |
| `invoice.paid` | Payment received | Landlord, Tenant |

## Usage

### 1. SSE Connection (Automatic)

The `EventProvider` is already integrated in `App.tsx`. It automatically connects when a user is authenticated:

```tsx
<EventProvider>
  <BrowserRouter>
    {/* Your routes */}
  </BrowserRouter>
</EventProvider>
```

### 2. Using Event Subscriptions

Subscribe to specific events in any component:

```tsx
import { useEventContext } from '../contexts/EventContext';

function MyComponent() {
  const { subscribe } = useEventContext();

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === 'ticket.created') {
        console.log('New ticket:', event);
      }
    });

    return unsubscribe;
  }, [subscribe]);
}
```

### 3. Using Optimistic Updates

```tsx
import { useTicketStatusMutation } from '../hooks/useTicketMutations';

function TicketActions({ ticketId }) {
  const mutation = useTicketStatusMutation();

  const handleApprove = async () => {
    await mutation.mutateAsync({ 
      id: ticketId, 
      to: 'APPROVED' 
    });
  };

  return (
    <button onClick={handleApprove} disabled={mutation.isPending}>
      {mutation.isPending ? 'Approving...' : 'Approve'}
    </button>
  );
}
```

### 4. Showing Toast Notifications

Toast notifications are automatically shown for events in the Layout component. To customize:

```tsx
import { useToast } from '../components/ToastContainer';

function MyComponent() {
  const { success, error, info } = useToast();

  const handleAction = async () => {
    try {
      await someAction();
      success('Action completed successfully!');
    } catch (err) {
      error('Action failed');
    }
  };
}
```

### 5. Timeline Component

Display ticket history with real-time updates:

```tsx
import TicketTimeline from '../components/TicketTimeline';

function TicketDetailPage({ ticketId }) {
  return (
    <div>
      <h2>Ticket Timeline</h2>
      <TicketTimeline ticketId={ticketId} />
    </div>
  );
}
```

## Configuration

### Environment Variables

Create a `.env` file in the frontend-new directory:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

For production:

```env
VITE_API_BASE_URL=https://api.example.com
```

### TanStack Query Configuration

The QueryClient is configured with:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000, // 5 seconds
    },
  },
});
```

## API Endpoints Added

### Notifications

- `GET /api/notifications` - List notifications (limit, unreadOnly params)
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/read` - Mark specific notifications as read
- `POST /api/notifications/read-all` - Mark all as read

### Tickets

- `PATCH /api/tickets/:id/status` - Update ticket status
- `GET /api/tickets/:id/timeline` - Get ticket timeline
- `POST /api/tickets/:id/approve` - Approve ticket (with idempotency)

### Finance

- `GET /api/finance/invoices` - List invoices
- `GET /api/finance/invoices/:id` - Get single invoice

### Events (SSE)

- `GET /api/events` - Subscribe to event stream (requires Authorization header)

## Performance Considerations

### SSE Connection

- **Lightweight**: < 5KB initial connection + < 1KB per event
- **Efficient**: Single connection shared across all components
- **Automatic Retry**: Reconnects automatically on network issues

### Query Invalidation

- **Selective**: Only invalidates affected queries
- **Debounced**: Multiple events for the same resource are batched
- **Optimistic**: UI updates before server confirmation

### Memory Usage

- **Event Buffer**: No buffering, events processed immediately
- **Connection Pool**: One SSE connection per authenticated session
- **Cleanup**: Automatic cleanup on unmount/logout

## Troubleshooting

### SSE Connection Issues

**Problem**: Live indicator doesn't appear

**Solutions**:
1. Check browser console for connection errors
2. Verify API URL in `.env` file
3. Ensure backend is running and accessible
4. Check that Authorization header is being sent

**Problem**: Events not received

**Solutions**:
1. Verify user has correct role and organization
2. Check backend logs for event emissions
3. Ensure events have correct `landlordId`/`tenantId`
4. Test SSE endpoint with curl:
   ```bash
   curl -N -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/events
   ```

### Query Invalidation Issues

**Problem**: UI doesn't update after events

**Solutions**:
1. Check that query keys match in `useEventStream` and component
2. Verify TanStack Query DevTools (install for debugging)
3. Check browser console for errors
4. Ensure EventProvider wraps your app

### Optimistic Update Issues

**Problem**: UI reverts after mutation

**Solutions**:
1. Check network tab for failed requests
2. Review backend response for errors
3. Ensure mutation error handlers are working
4. Check that query keys are correct

## Testing

### Manual Testing

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend-new
   npm run dev
   ```

3. **Test SSE**:
   - Login as a user
   - Check for green "Live" indicator
   - Open browser DevTools → Network → Filter by "events"
   - Should see SSE connection with status "pending"

4. **Test Notifications**:
   - Create a ticket in one browser/tab
   - Check notification bell in another browser/tab
   - Should see unread count increase

5. **Test Optimistic Updates**:
   - Change ticket status
   - UI should update immediately
   - Check network tab to confirm backend update

### Browser Compatibility

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ❌ IE11 (Not supported - uses modern APIs)

### Known Limitations

1. **EventSource Headers**: Native EventSource doesn't support custom headers, so we use Fetch API with ReadableStream
2. **Reconnection**: Connection may drop on network changes, automatic retry handles this
3. **Tab Visibility**: Events are received even when tab is not visible
4. **CORS**: SSE requires proper CORS configuration on backend

## Security

### Authentication

- All SSE connections require valid JWT token
- Token sent via Authorization header
- Backend validates token before establishing connection

### Authorization

- Events filtered by role and organization
- Users only receive events for their resources
- Multi-tenant isolation enforced

### Best Practices

1. **Never log sensitive data** from events
2. **Validate event payloads** before processing
3. **Use HTTPS** in production
4. **Rotate JWT secrets** regularly
5. **Monitor SSE connections** for abuse

## Future Enhancements

### Planned Features

1. **Event Persistence**: Store events for offline sync
2. **Selective Subscriptions**: Allow components to filter events client-side
3. **Compression**: Gzip/Brotli compression for event payloads
4. **Batching**: Batch multiple events into single update
5. **WebSocket Fallback**: For browsers without SSE support

### Possible Improvements

1. **Service Worker**: Receive events when tab is closed
2. **IndexedDB**: Cache events for offline viewing
3. **Event Replay**: Replay missed events on reconnection
4. **Custom Retry Logic**: Per-event-type retry strategies
5. **Event Aggregation**: Combine related events into summaries

## References

- [Backend Implementation](../../SYNC_IMPLEMENTATION.md)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs
3. Check browser console
4. Review TanStack Query DevTools
5. Check GitHub issues

---

**Last Updated**: November 7, 2025  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
