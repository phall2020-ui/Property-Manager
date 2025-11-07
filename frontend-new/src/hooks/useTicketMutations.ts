import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../lib/api';

interface Ticket {
  id: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function useTicketStatusMutation() {
  const queryClient = useQueryClient();

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

    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousTickets) {
        queryClient.setQueryData(['tickets'], context.previousTickets);
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', variables.id], context.previousTicket);
      }
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

    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousTickets) {
        queryClient.setQueryData(['tickets'], context.previousTickets);
      }
      if (context?.previousTicket) {
        queryClient.setQueryData(['ticket', variables.id], context.previousTicket);
      }
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline', variables.id] });
    },
  });
}
