"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { SlaChip } from '@/components/SlaChip';
import { SearchInput } from '@/components/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';

export default function OpsQueuePage() {
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebounce('', 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<Ticket[]>('/tickets'),
  });

  // Filter tickets based on search and status
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter(ticket => {
      // Search filter - use debounced value
      if (debouncedSearchTerm) {
        const query = debouncedSearchTerm.toLowerCase();
        const matchesSearch = 
          ticket.title?.toLowerCase().includes(query) ||
          ticket.description?.toLowerCase().includes(query) ||
          ticket.id.toLowerCase().includes(query) ||
          ticket.propertyId?.toLowerCase().includes(query) ||
          ticket.category?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, debouncedSearchTerm, statusFilter]);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Unable to load queue</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ops Queue</h2>
        <p className="text-gray-600">{filteredTickets.length} tickets</p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search tickets by title, ID, category..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value={TicketStatus.OPEN}>Open</option>
          <option value={TicketStatus.ASSIGNED}>Assigned</option>
          <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
          <option value={TicketStatus.NEEDS_APPROVAL}>Needs Approval</option>
          <option value={TicketStatus.COMPLETED}>Completed</option>
        </select>
      </div>
      {filteredTickets && filteredTickets.length > 0 ? (
        <Table
          data={filteredTickets}
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