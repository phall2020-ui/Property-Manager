import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTicketStatusMutation, useTicketApproveMutation } from '../../hooks/useTicketMutations';
import * as api from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  ticketsApi: {
    updateStatus: vi.fn(),
    approve: vi.fn(),
  },
}));

describe('useTicketMutations', () => {
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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useTicketStatusMutation', () => {
    it('updates ticket status optimistically', async () => {
      const mockTickets = [
        { id: 'ticket-1', status: 'OPEN', title: 'Test Ticket 1' },
        { id: 'ticket-2', status: 'OPEN', title: 'Test Ticket 2' },
      ];

      // Set initial data
      queryClient.setQueryData(['tickets'], mockTickets);

      vi.mocked(api.ticketsApi.updateStatus).mockResolvedValueOnce({
        id: 'ticket-1',
        status: 'IN_PROGRESS',
      });

      const { result } = renderHook(() => useTicketStatusMutation(), { wrapper });

      // Mutate
      result.current.mutate({ id: 'ticket-1', to: 'IN_PROGRESS' });

      // Check optimistic update
      await waitFor(() => {
        const tickets = queryClient.getQueryData<typeof mockTickets>(['tickets']);
        expect(tickets).toBeDefined();
        expect(tickets![0].status).toBe('IN_PROGRESS');
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.ticketsApi.updateStatus).toHaveBeenCalledWith('ticket-1', 'IN_PROGRESS');
    });

    it('rolls back on error', async () => {
      const mockTickets = [
        { id: 'ticket-1', status: 'OPEN', title: 'Test Ticket 1' },
      ];

      queryClient.setQueryData(['tickets'], mockTickets);

      vi.mocked(api.ticketsApi.updateStatus).mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useTicketStatusMutation(), { wrapper });

      result.current.mutate({ id: 'ticket-1', to: 'IN_PROGRESS' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check rollback
      const tickets = queryClient.getQueryData<typeof mockTickets>(['tickets']);
      expect(tickets![0].status).toBe('OPEN');
    });

    it('invalidates queries on settlement', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
      
      vi.mocked(api.ticketsApi.updateStatus).mockResolvedValueOnce({
        id: 'ticket-1',
        status: 'CLOSED',
      });

      const { result } = renderHook(() => useTicketStatusMutation(), { wrapper });

      result.current.mutate({ id: 'ticket-1', to: 'CLOSED' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['tickets'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['ticket', 'ticket-1'] });
    });
  });

  describe('useTicketApproveMutation', () => {
    it('approves ticket and updates status optimistically', async () => {
      const mockTickets = [
        { id: 'ticket-1', status: 'PENDING_APPROVAL', title: 'Test Ticket' },
      ];

      queryClient.setQueryData(['tickets'], mockTickets);

      vi.mocked(api.ticketsApi.approve).mockResolvedValueOnce({
        id: 'ticket-1',
        status: 'APPROVED',
      });

      const { result } = renderHook(() => useTicketApproveMutation(), { wrapper });

      result.current.mutate({ id: 'ticket-1' });

      // Check optimistic update
      await waitFor(() => {
        const tickets = queryClient.getQueryData<typeof mockTickets>(['tickets']);
        expect(tickets![0].status).toBe('APPROVED');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.ticketsApi.approve).toHaveBeenCalledWith('ticket-1', undefined);
    });

    it('passes idempotency key when provided', async () => {
      vi.mocked(api.ticketsApi.approve).mockResolvedValueOnce({
        id: 'ticket-1',
        status: 'APPROVED',
      });

      const { result } = renderHook(() => useTicketApproveMutation(), { wrapper });

      result.current.mutate({ id: 'ticket-1', idempotencyKey: 'unique-key-123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.ticketsApi.approve).toHaveBeenCalledWith('ticket-1', 'unique-key-123');
    });

    it('rolls back on approval failure', async () => {
      const mockTickets = [
        { id: 'ticket-1', status: 'PENDING_APPROVAL', title: 'Test Ticket' },
      ];

      queryClient.setQueryData(['tickets'], mockTickets);

      vi.mocked(api.ticketsApi.approve).mockRejectedValueOnce(new Error('Approval failed'));

      const { result } = renderHook(() => useTicketApproveMutation(), { wrapper });

      result.current.mutate({ id: 'ticket-1' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check rollback
      const tickets = queryClient.getQueryData<typeof mockTickets>(['tickets']);
      expect(tickets![0].status).toBe('PENDING_APPROVAL');
    });
  });
});
