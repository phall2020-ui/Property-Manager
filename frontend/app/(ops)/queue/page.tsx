"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { SlaChip } from '@/components/SlaChip';

export default function OpsQueuePage() {
  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<Ticket[]>('/tickets'),
  });
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Unable to load queue</p>;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Ops Queue</h2>
      {tickets && tickets.length > 0 ? (
        <Table
          data={tickets}
          columns={[
            {
              header: 'Ticket',
              accessor: 'id',
              render: (ticket) => (
                <Link href={`/queue-tickets/${ticket.id}`} className="text-primary underline">
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
                else if (ticket.status === TicketStatus.IN_PROGRESS) color = 'warning';
                else if (ticket.status === TicketStatus.REJECTED) color = 'danger';
                return <Badge color={color}>{ticket.status}</Badge>;
              },
            },
            { header: 'Category', accessor: 'category' },
            {
              header: 'SLA',
              accessor: 'updatedAt',
              render: (ticket) => {
                // For demo, compute SLA due as 72h after createdAt
                const created = new Date(ticket.createdAt);
                const slaDue = new Date(created.getTime() + 72 * 60 * 60 * 1000);
                return <SlaChip slaDueAt={slaDue.toISOString()} />;
              },
            },
          ]}
        />
      ) : (
        <p>No tickets in queue.</p>
      )}
    </div>
  );
}