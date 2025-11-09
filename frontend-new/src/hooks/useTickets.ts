import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { ticketsApi, api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category?: string;
  propertyId?: string;
  tenancyId?: string;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    address1: string;
  };
  createdBy?: {
    name: string;
    email: string;
  };
}

export interface TicketsResponse {
  items: Ticket[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface Quote {
  id: string;
  ticketId: string;
  amount: number;
  notes?: string;
  status: string;
  createdAt: string;
}

/**
 * Hook to fetch list of tickets
 */
export function useTickets(options?: UseQueryOptions<TicketsResponse>) {
  return useQuery<TicketsResponse>({
    queryKey: ['tickets'],
    queryFn: async () => {
      const data = await ticketsApi.list();
      // Normalize response format
      if (Array.isArray(data)) {
        return {
          items: data,
          page: 1,
          page_size: data.length,
          total: data.length,
          has_next: false,
        };
      }
      return data;
    },
    ...options,
  });
}

/**
 * Hook to fetch a single ticket by ID
 */
export function useTicket(id: string | undefined, options?: UseQueryOptions<Ticket>) {
  return useQuery<Ticket>({
    queryKey: ['tickets', id],
    queryFn: () => ticketsApi.getById(id!),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to create a new ticket
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: {
      propertyId?: string;
      tenancyId?: string;
      title: string;
      description: string;
      priority: string;
      category?: string;
    }) => ticketsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });
}

/**
 * Hook to fetch comments for a ticket
 */
export function useTicketComments(ticketId: string | undefined, options?: UseQueryOptions<Comment[]>) {
  return useQuery<Comment[]>({
    queryKey: ['tickets', ticketId, 'comments'],
    queryFn: async () => {
      const response = await api.get(`/tickets/${ticketId}/comments`);
      return response.data;
    },
    enabled: !!ticketId,
    ...options,
  });
}

/**
 * Hook to add a comment to a ticket
 */
export function useAddTicketComment() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const response = await api.post(`/tickets/${ticketId}/comments`, { content });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-timeline', variables.ticketId] });
      toast.success('Comment added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

/**
 * Hook to approve a quote
 */
export function useApproveQuote() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ quoteId }: { quoteId: string }) => ticketsApi.approveQuote(quoteId),
    onSuccess: (_data, variables) => {
      // We need to find which ticket this quote belongs to - for now invalidate all tickets
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Quote approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve quote: ${error.message}`);
    },
  });
}

/**
 * Hook to reject a quote
 */
export function useRejectQuote() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ quoteId }: { quoteId: string }) => {
      const response = await api.post(`/tickets/quotes/${quoteId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Quote rejected successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject quote: ${error.message}`);
    },
  });
}

/**
 * Hook to cancel an appointment
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      const response = await api.post(`/tickets/appointments/${appointmentId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel appointment: ${error.message}`);
    },
  });
}
