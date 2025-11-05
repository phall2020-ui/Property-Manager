"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { TicketTimeline } from '@/components/TicketTimeline';

export default function LandlordTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: () => apiRequest<Ticket>(`/tickets/${ticketId}`),
    enabled: typeof ticketId === 'string',
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const approveMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      return apiRequest(`/tickets/${ticketId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err: any) => {
      setActionError(err.detail || 'Failed to update ticket');
    },
  });
  if (isLoading) return <p>Loading…</p>;
  if (error || !ticket) return <p className="text-red-600">Unable to load ticket</p>;
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Ticket {ticket.id}</h2>
      <p>
        <strong>Status:</strong>{' '}
        <Badge
          color={
            ticket.status === TicketStatus.COMPLETED
              ? 'success'
              : ticket.status === TicketStatus.NEEDS_APPROVAL
              ? 'warning'
              : 'info'
          }
        >
          {ticket.status}
        </Badge>
      </p>
      <p>
        <strong>Category:</strong> {ticket.category}
      </p>
      <p>
        <strong>Description:</strong> {ticket.description}
      </p>
      {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
      {ticket.status === TicketStatus.NEEDS_APPROVAL && (
        <div className="flex space-x-4">
          <Button
            variant="primary"
            onClick={() => approveMutation.mutate(true)}
            disabled={approveMutation.isLoading}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            onClick={() => approveMutation.mutate(false)}
            disabled={approveMutation.isLoading}
          >
            Decline
          </Button>
        </div>
      )}
      {/* Timeline placeholder; ideally fetched from GET /tickets/:id but not defined in spec */}
      {/* <TicketTimeline events={ticket.events} /> */}
    </div>
  );
}