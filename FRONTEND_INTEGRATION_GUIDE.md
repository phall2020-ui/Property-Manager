# Frontend Integration Guide

This guide explains how to integrate with the Property Management Platform frontend, including authentication, API calls, state management, and testing.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Authentication Integration](#authentication-integration)
- [API Client Usage](#api-client-usage)
- [State Management with React Query](#state-management-with-react-query)
- [Toast Notifications](#toast-notifications)
- [File Uploads](#file-uploads)
- [Real-time Updates](#real-time-updates)
- [Testing](#testing)
- [Common Patterns](#common-patterns)

## Architecture Overview

The frontend uses:
- **React 19** with TypeScript
- **Vite** for build tooling
- **TanStack Query (React Query)** for server state management
- **React Router** for routing
- **Tailwind CSS** for styling
- **Axios** for HTTP requests

## Authentication Integration

### How Authentication Works

1. User logs in with email/password
2. Backend returns `accessToken` (stored in localStorage)
3. Backend sets `refreshToken` in httpOnly cookie
4. Access token is sent with every request via `Authorization` header
5. When access token expires (401), automatically refresh using cookie
6. If refresh fails, redirect to login

### Using the Auth Context

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();

  // Check if user is authenticated
  if (!user) {
    return <div>Please log in</div>;
  }

  // Access user information
  const userName = user.name;
  const userRole = user.organisations?.[0]?.role; // LANDLORD, TENANT, CONTRACTOR, OPS

  // Login
  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password');
      // User is now logged in
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Logout
  const handleLogout = async () => {
    await logout();
    // User is now logged out
  };

  return <div>Welcome, {userName}!</div>;
}
```

### Role-Based Access Control

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function RequireRole({ children, allowedRoles }: { 
  children: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const { user } = useAuth();
  const userRole = user?.organisations?.[0]?.role;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}

// Usage
<RequireRole allowedRoles={['LANDLORD', 'OPS']}>
  <TicketAssignPage />
</RequireRole>
```

## API Client Usage

### Basic API Calls

```tsx
import { ticketsApi, propertiesApi } from '../lib/api';

// List tickets
const tickets = await ticketsApi.list();

// Get single ticket
const ticket = await ticketsApi.getById('ticket-id');

// Create ticket
const newTicket = await ticketsApi.create({
  propertyId: 'prop-123',
  title: 'Leaking tap',
  description: 'Kitchen tap is dripping',
  priority: 'HIGH',
  category: 'PLUMBING'
});

// Update ticket status
await ticketsApi.updateStatus('ticket-id', 'TRIAGED');

// Assign ticket to contractor
await ticketsApi.assign('ticket-id', 'contractor-id');

// Submit quote
await ticketsApi.createQuote('ticket-id', {
  amount: 250,
  notes: 'Parts and labor included'
});

// Approve ticket
await ticketsApi.approve('ticket-id');
```

### Available API Modules

- `authApi` - Authentication (login, signup, logout, refresh)
- `ticketsApi` - Ticket management
- `propertiesApi` - Property management
- `tenanciesApi` - Tenancy management
- `complianceApi` - Compliance tracking
- `financeApi` - Financial operations
- `jobsApi` - Background job management
- `notificationsApi` - User notifications
- `documentsApi` - Document management

### Error Handling

The API client automatically:
- Adds authentication tokens to requests
- Refreshes expired tokens
- Redirects to login on auth failure

```tsx
try {
  const ticket = await ticketsApi.getById('invalid-id');
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
  }
}
```

## State Management with React Query

### Basic Query Usage

```tsx
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../lib/api';

function TicketsList() {
  const { data: tickets, isLoading, error, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketsApi.list(),
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {tickets?.map(ticket => (
        <div key={ticket.id}>{ticket.title}</div>
      ))}
    </div>
  );
}
```

### Using Custom Mutation Hooks

```tsx
import { useTicketStatusMutation, useTicketApproveMutation, useTicketAssignMutation } from '../hooks/useTicketMutations';

function TicketActions({ ticketId }: { ticketId: string }) {
  const statusMutation = useTicketStatusMutation();
  const approveMutation = useTicketApproveMutation();
  const assignMutation = useTicketAssignMutation();

  const handleTriage = () => {
    statusMutation.mutate({ id: ticketId, to: 'TRIAGED' });
    // Toast notification automatically shown on success/error
  };

  const handleApprove = () => {
    approveMutation.mutate({ id: ticketId });
    // Optimistic update applied, then confirmed on success
  };

  const handleAssign = (contractorId: string) => {
    assignMutation.mutate({ id: ticketId, contractorId });
  };

  return (
    <div>
      <button 
        onClick={handleTriage}
        disabled={statusMutation.isPending}
      >
        {statusMutation.isPending ? 'Updating...' : 'Triage'}
      </button>
      
      <button 
        onClick={handleApprove}
        disabled={approveMutation.isPending}
      >
        {approveMutation.isPending ? 'Approving...' : 'Approve'}
      </button>
    </div>
  );
}
```

### Optimistic Updates

Mutations use optimistic updates to provide instant feedback:

1. **onMutate**: Update cache immediately (optimistic)
2. **onError**: Rollback cache on failure
3. **onSuccess**: Show success toast
4. **onSettled**: Refetch to ensure consistency

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';

function useCustomMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data) => api.post('/endpoint', data),
    
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['items'] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(['items']);
      
      // Optimistically update
      queryClient.setQueryData(['items'], (old) => [...old, newData]);
      
      return { previous };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['items'], context.previous);
      toast.error(`Failed: ${err.message}`);
    },
    
    onSuccess: () => {
      toast.success('Success!');
    },
    
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

### Query Invalidation

Invalidate queries to trigger refetches:

```tsx
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleUpdate = async () => {
    await updateSomething();
    
    // Invalidate specific query
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    
    // Invalidate multiple related queries
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    queryClient.invalidateQueries({ queryKey: ['ticket-timeline', ticketId] });
  };
}
```

## Toast Notifications

### Using Toast Context

```tsx
import { useToast } from '../contexts/ToastContext';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Operation completed successfully!');
  };

  const handleError = () => {
    toast.error('Something went wrong. Please try again.');
  };

  const handleInfo = () => {
    toast.info('New notification available');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleInfo}>Show Info</button>
    </div>
  );
}
```

### Toast in Mutations

Mutations in `useTicketMutations` automatically show toasts:

```tsx
const mutation = useTicketApproveMutation();

// Shows "Ticket approved successfully!" on success
// Shows error message on failure
mutation.mutate({ id: 'ticket-123' });
```

## File Uploads

### Upload Component

```tsx
import { ticketsApi } from '../lib/api';
import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

function FileUploader({ ticketId }: { ticketId: string }) {
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, GIF, PDF');
      return;
    }

    setUploading(true);
    try {
      await ticketsApi.uploadAttachment(ticketId, file);
      toast.success('File uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        accept="image/*,application/pdf"
      />
      {uploading && <span>Uploading...</span>}
    </div>
  );
}
```

### Supported File Types

- Images: JPG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, TXT
- Spreadsheets: XLS, XLSX, CSV
- Maximum size: 10MB

## Real-time Updates

### Polling with React Query

```tsx
const { data: tickets } = useQuery({
  queryKey: ['tickets'],
  queryFn: () => ticketsApi.list(),
  refetchInterval: 5000, // Poll every 5 seconds
});
```

### Server-Sent Events (SSE)

```tsx
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

function useTicketEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource('/api/events/tickets');

    eventSource.addEventListener('ticket.created', (event) => {
      const ticket = JSON.parse(event.data);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    });

    eventSource.addEventListener('ticket.updated', (event) => {
      const ticket = JSON.parse(event.data);
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    });

    return () => eventSource.close();
  }, [queryClient]);
}
```

## Testing

### Unit Testing Components

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import TicketCreatePage from './TicketCreatePage';

describe('TicketCreatePage', () => {
  it('creates a ticket successfully', async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <TicketCreatePage />
      </QueryClientProvider>
    );

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'Leaking tap');
    await user.type(screen.getByLabelText(/description/i), 'Kitchen tap is dripping');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'HIGH');

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText(/ticket created/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Testing with Playwright

```typescript
import { test, expect } from '@playwright/test';

test('complete ticket workflow', async ({ page }) => {
  // Login as tenant
  await page.goto('/login');
  await page.fill('[name="email"]', 'tenant@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Create ticket
  await page.goto('/tickets/new');
  await page.fill('[name="title"]', 'E2E Test Ticket');
  await page.fill('[name="description"]', 'Test description');
  await page.selectOption('[name="priority"]', 'HIGH');
  await page.click('button[type="submit"]');

  // Verify ticket appears
  await expect(page.getByText('E2E Test Ticket')).toBeVisible();
});
```

## Common Patterns

### Loading States

```tsx
function TicketDetail({ id }: { id: string }) {
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return <TicketCard ticket={ticket} />;
}
```

### Conditional Rendering by Role

```tsx
function TicketActions({ ticket }: { ticket: Ticket }) {
  const { user } = useAuth();
  const userRole = user?.organisations?.[0]?.role;

  return (
    <div>
      {userRole === 'CONTRACTOR' && ticket.status === 'OPEN' && (
        <QuoteForm ticketId={ticket.id} />
      )}

      {userRole === 'LANDLORD' && ticket.status === 'QUOTED' && (
        <ApproveButton ticketId={ticket.id} />
      )}

      {userRole === 'OPS' && (
        <AssignForm ticketId={ticket.id} />
      )}
    </div>
  );
}
```

### Form Handling

```tsx
function TicketForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM'
  });

  const mutation = useMutation({
    mutationFn: (data) => ticketsApi.create(data),
    onSuccess: () => {
      setFormData({ title: '', description: '', priority: 'MEDIUM' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="title"
        value={formData.title}
        onChange={handleChange}
        required
      />
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        required
      />
      <select
        name="priority"
        value={formData.priority}
        onChange={handleChange}
      >
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Ticket'}
      </button>
    </form>
  );
}
```

### Pagination

```tsx
function TicketList() {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data } = useQuery({
    queryKey: ['tickets', page],
    queryFn: () => ticketsApi.list({ page, pageSize }),
  });

  return (
    <div>
      {data?.items.map(ticket => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
      
      <div>
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        
        <span>Page {page}</span>
        
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={!data?.has_next}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Troubleshooting

### Issue: "Cannot read property of undefined"
**Solution**: Use optional chaining and default values
```tsx
const userName = user?.name ?? 'Guest';
const userRole = user?.organisations?.[0]?.role ?? 'TENANT';
```

### Issue: Stale data after mutation
**Solution**: Ensure query invalidation in mutation hooks
```tsx
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['tickets'] });
}
```

### Issue: Toast not showing
**Solution**: Ensure ToastProvider wraps your app
```tsx
// In App.tsx
<ToastProvider>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</ToastProvider>
```

### Issue: 401 Unauthorized errors
**Solution**: Token might be expired. Check token refresh logic or re-login
```tsx
// API automatically handles refresh, but if it persists:
await authApi.logout();
navigate('/login');
```

### Issue: File upload fails
**Solution**: Check file size (<10MB) and format (allowed types only)
```tsx
const isValidSize = file.size <= 10 * 1024 * 1024;
const isValidType = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
```

## Best Practices

1. **Always use mutation hooks** instead of direct API calls for operations that modify data
2. **Implement loading states** for better UX
3. **Show toast notifications** for user feedback on success/error
4. **Use optimistic updates** for instant feedback
5. **Invalidate related queries** after mutations to keep UI consistent
6. **Handle errors gracefully** with user-friendly messages
7. **Implement proper TypeScript types** for type safety
8. **Test critical user flows** with E2E tests
9. **Use role-based conditional rendering** for access control
10. **Keep forms simple** with clear validation messages

## Additional Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Playwright Testing Documentation](https://playwright.dev/)
- [Backend API Documentation](http://localhost:4000/api/docs)
