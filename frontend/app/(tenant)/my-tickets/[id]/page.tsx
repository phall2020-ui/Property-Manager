"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';

export default function TenantTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;
  const router = useRouter();
  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: () => apiRequest<Ticket>(`/tickets/${ticketId}`),
    enabled: typeof ticketId === 'string',
    refetchInterval: 10000, // poll every 10s
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
    </div>
  );
}