"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { SlaChip } from '@/components/SlaChip';

export default function LandlordTicketsPage() {
  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<Ticket[]>('/tickets'),
  });
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Error loading tickets</p>;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tickets</h2>
      {tickets && tickets.length > 0 ? (
        <Table
          data={tickets}
          columns={[
            {
              header: 'Ticket',
              accessor: 'id',
              render: (ticket) => (
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="text-primary underline"
                >
                  {ticket.id}
                </Link>
              ),
            },
            {
              header: 'Status',
              accessor: 'status',
              render: (ticket) => {
                let color: 'info' | 'success' | 'warning' | 'danger' = 'info';
                if (ticket.status === TicketStatus.COMPLETED) color = 'success';
                else if (ticket.status === TicketStatus.NEEDS_APPROVAL) color = 'warning';
                else if (ticket.status === TicketStatus.REJECTED) color = 'danger';
                return <Badge color={color}>{ticket.status}</Badge>;
              },
            },
            { header: 'Property', accessor: 'propertyId' },
            { header: 'Category', accessor: 'category' },
            {
              header: 'Created',
              accessor: 'createdAt',
              render: (ticket) => new Date(ticket.createdAt).toLocaleDateString(),
            },
          ]}
        />
      ) : (
        <p>No tickets.</p>
      )}
    </div>
  );
}