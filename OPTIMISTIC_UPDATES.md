# Optimistic Updates Pattern

## Overview

Optimistic updates provide instant UI feedback by updating the cache immediately when a mutation is triggered, before waiting for the server response. This creates a more responsive user experience.

## Implementation with React Query

We use React Query's `onMutate`, `onError`, and `onSuccess` callbacks to implement optimistic updates.

### Pattern Structure

```typescript
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  
  // 1. Before mutation runs - update cache optimistically
  onMutate: async (newData) => {
    // Cancel any outgoing refetches to avoid overwriting
    await queryClient.cancelQueries({ queryKey: ['items'] });
    
    // Snapshot the previous value for rollback
    const previousItems = queryClient.getQueryData(['items']);
    
    // Optimistically update the cache
    queryClient.setQueryData(['items'], (old: any[]) => {
      const optimisticItem = {
        id: `temp-${Date.now()}`, // Temporary ID
        ...newData,
        createdAt: new Date().toISOString(),
      };
      return old ? [...old, optimisticItem] : [optimisticItem];
    });
    
    // Return context for potential rollback
    return { previousItems };
  },
  
  // 2. If mutation fails - rollback
  onError: (err, newData, context) => {
    // Restore the snapshot
    queryClient.setQueryData(['items'], context?.previousItems);
    setError(err.response?.data?.message || 'Failed to create item');
  },
  
  // 3. After mutation succeeds - sync with server
  onSuccess: () => {
    // Invalidate to fetch the real data from server
    queryClient.invalidateQueries({ queryKey: ['items'] });
    navigate('/items');
  },
});
```

## Current Implementations

### 1. Ticket Creation (`TicketCreatePage.tsx`)

- Optimistically adds a new ticket to the tickets list
- Creates a temporary ticket with `id: 'temp-${timestamp}'`
- Includes property information if available
- Sets initial status to 'OPEN'
- Rolls back on error and displays error message
- Invalidates query on success to sync with server

### 2. Property Creation (`PropertyCreatePage.tsx`)

- Optimistically adds a new property to both `properties` and `enhanced-properties` queries
- Creates a temporary property with `id: 'temp-${timestamp}'`
- Rolls back both queries on error
- Invalidates both queries on success

## Benefits

1. **Instant Feedback**: Users see their changes immediately
2. **Better UX**: No waiting for server response before UI updates
3. **Error Handling**: Automatic rollback on failure
4. **Consistency**: Server data eventually replaces optimistic data

## Best Practices

1. **Use Temporary IDs**: Create unique temporary IDs using timestamps
2. **Cancel Pending Queries**: Prevent race conditions with `cancelQueries`
3. **Always Snapshot**: Save previous state for rollback
4. **Invalidate on Success**: Ensure data stays in sync with server
5. **Handle Errors Gracefully**: Show clear error messages and restore UI state

## When to Use Optimistic Updates

✅ **Good candidates:**
- Creating new items
- Simple status changes
- Toggling boolean flags
- Adding items to lists

❌ **Avoid for:**
- Complex server-side calculations
- Operations with side effects
- When server response has critical computed fields
- When rollback would be confusing to users

## Further Reading

- [React Query Optimistic Updates Documentation](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [React Query Best Practices](https://tkdodo.eu/blog/react-query-best-practices)
