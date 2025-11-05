"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';

export default function OpsTicketDetailPage() {
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
  const updateStatus = useMutation({
    mutationFn: async (status: TicketStatus) => {
      return apiRequest(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err: any) => {
      setActionError(err.detail || 'Failed to update status');
    },
  });
  if (isLoading) return <p>Loading…</p>;
  if (error || !ticket) return <p className="text-red-600">Unable to load ticket</p>;
  const statuses: TicketStatus[] = [
    TicketStatus.OPEN,
    TicketStatus.ASSIGNED,
    TicketStatus.QUOTED,
    TicketStatus.IN_PROGRESS,
    TicketStatus.NEEDS_APPROVAL,
    TicketStatus.APPROVED,
    TicketStatus.COMPLETED,
    TicketStatus.REJECTED,
  ];
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Ticket {ticket.id}</h2>
      <p>
        <strong>Status:</strong>{' '}
        <Badge color="info">{ticket.status}</Badge>
      </p>
      <p>
        <strong>Category:</strong> {ticket.category}
      </p>
      <p>
        <strong>Description:</strong> {ticket.description}
      </p>
      {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Change Status</h3>
        <select
          value={ticket.status}
          onChange={(e) => updateStatus.mutate(e.target.value as TicketStatus)}
          className="mt-1 block w-full max-w-sm rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}