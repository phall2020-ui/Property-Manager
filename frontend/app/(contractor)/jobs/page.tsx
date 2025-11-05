"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';

export default function ContractorJobsPage() {
  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<Ticket[]>('/tickets'),
  });
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Unable to load jobs</p>;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Jobs</h2>
      {tickets && tickets.length > 0 ? (
        <Table
          data={tickets}
          columns={[
            {
              header: 'Job',
              accessor: 'id',
              render: (ticket) => (
                <Link href={`/jobs/${ticket.id}`} className="text-primary underline">
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
            { header: 'Property', accessor: 'propertyId' },
            { header: 'Category', accessor: 'category' },
          ]}
        />
      ) : (
        <p>No jobs available.</p>
      )}
    </div>
  );
}