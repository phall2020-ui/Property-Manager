"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket } from '@/types/models';
import { Table } from '@/components/Table';
import { StatusBadge } from '@/components/StatusBadge';

export default function TenantTicketsPage() {
  const {
    data: ticketsResponse,
    isLoading,
    error,
  } = useQuery<{ data: Ticket[] }>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<{ data: Ticket[] }>('/tickets'),
  });
  
  const tickets = ticketsResponse?.data || [];
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Unable to load tickets</p>;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Tickets</h2>
      {tickets && tickets.length > 0 ? (
        <Table
          data={tickets}
          columns={[
            {
              header: 'Ticket',
              accessor: 'id',
              render: (ticket) => (
                <Link href={`/my-tickets/${ticket.id}`} className="text-primary underline">
                  {ticket.id}
                </Link>
              ),
            },
            { header: 'Status', accessor: 'status', render: (ticket) => (
              <StatusBadge status={ticket.status} />
            ) },
            { header: 'Category', accessor: 'category' },
            {
              header: 'Updated',
              accessor: 'updatedAt',
              render: (ticket) => new Date(ticket.updatedAt).toLocaleDateString(),
            },
          ]}
        />
      ) : (
        <p>You have not submitted any tickets yet.</p>
      )}
    </div>
  );
}