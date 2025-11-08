import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface Ticket {
  id: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function useTicketStatusMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => 
      ticketsApi.updateStatus(id, to),
    
    onMutate: async ({ id, to }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      await queryClient.cancelQueries({ queryKey: ['ticket', id] });

      // Snapshot the previous value
      const previousTickets = queryClient.getQueryData<Ticket[]>(['tickets']);
      const previousTicket = queryClient.getQueryData<Ticket>(['ticket', id]);

      // Optimistically update tickets list
      if (previousTickets) {
        queryClient.setQueryData<Ticket[]>(['tickets'], (old) =>
          old?.map((ticket) =>
            ticket.id === id ? { ...ticket, status: to } : ticket
          )
        );
      }

      // Optimistically update single ticket
      if (previousTicket) {
        queryClient.setQueryData<Ticket>(['ticket', id], (old) =>
          old ? { ...old, status: to } : old
        );
      }

      // Return context with snapshot
      return { previousTickets, previousTicket };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTickets) {
        queryClient.setQueryData(['tickets'], context.previousTickets);
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', variables.id], context.previousTicket);
      }
      toast.error(`Failed to update ticket status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },

    onSuccess: (_data, variables) => {
      toast.success(`Ticket status updated to ${variables.to}`);
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline', variables.id] });
    },
  });
}

export function useTicketApproveMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey?: string }) => 
      ticketsApi.approve(id, idempotencyKey),
    
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      await queryClient.cancelQueries({ queryKey: ['ticket', id] });

      // Snapshot the previous value
      const previousTickets = queryClient.getQueryData<Ticket[]>(['tickets']);
      const previousTicket = queryClient.getQueryData<Ticket>(['ticket', id]);

      // Optimistically update to APPROVED status
      if (previousTickets) {
        queryClient.setQueryData<Ticket[]>(['tickets'], (old) =>
          old?.map((ticket) =>
            ticket.id === id ? { ...ticket, status: 'APPROVED' } : ticket
          )
        );
      }

      if (previousTicket) {
        queryClient.setQueryData<Ticket>(['ticket', id], (old) =>
          old ? { ...old, status: 'APPROVED' } : old
        );
      }

      return { previousTickets, previousTicket };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTickets) {
        queryClient.setQueryData(['tickets'], context.previousTickets);
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', variables.id], context.previousTicket);
      }
      toast.error(`Failed to approve ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },

    onSuccess: () => {
      toast.success('Ticket approved successfully!');
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline', variables.id] });
    },
  });
}

export function useTicketAssignMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, contractorId }: { id: string; contractorId: string }) => 
      ticketsApi.assign(id, contractorId),
    
    onMutate: async ({ id, contractorId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      await queryClient.cancelQueries({ queryKey: ['ticket', id] });

      // Snapshot the previous value
      const previousTickets = queryClient.getQueryData<Ticket[]>(['tickets']);
      const previousTicket = queryClient.getQueryData<Ticket>(['ticket', id]);

      // Optimistically update assignee
      if (previousTickets) {
        queryClient.setQueryData<Ticket[]>(['tickets'], (old) =>
          old?.map((ticket) =>
            ticket.id === id ? { ...ticket, assignedToId: contractorId } : ticket
          )
        );
      }

      if (previousTicket) {
        queryClient.setQueryData<Ticket>(['ticket', id], (old) =>
          old ? { ...old, assignedToId: contractorId } : old
        );
      }

      return { previousTickets, previousTicket };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTickets) {
        queryClient.setQueryData(['tickets'], context.previousTickets);
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', variables.id], context.previousTicket);
      }
      toast.error(`Failed to assign ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },

    onSuccess: () => {
      toast.success('Ticket assigned successfully!');
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline', variables.id] });
    },
  });
}

export function useTicketQuoteMutation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, amount, notes }: { id: string; amount: number; notes?: string }) => 
      ticketsApi.createQuote(id, { amount, notes }),
    
    onError: (err) => {
      toast.error(`Failed to submit quote: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },

    onSuccess: () => {
      toast.success('Quote submitted successfully!');
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline', variables.id] });
    },
  });
}
