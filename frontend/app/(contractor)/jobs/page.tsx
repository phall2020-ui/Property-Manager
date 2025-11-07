"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { StatusBadge } from '@/components/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { Search } from 'lucide-react';

export default function ContractorJobsPage() {
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

  // Filter jobs with debounced search
  const filteredJobs = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter(ticket => {
      // Search filter
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Unable to load jobs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Jobs</h2>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value={TicketStatus.OPEN}>Open</option>
              <option value={TicketStatus.ASSIGNED}>Assigned</option>
              <option value={TicketStatus.IN_PROGRESS}>In Progress</option>
              <option value={TicketStatus.COMPLETED}>Completed</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all') && (
            <div className="md:col-span-3">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Jobs Table */}
      {filteredJobs && filteredJobs.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <Table
            data={filteredJobs}
            columns={[
              {
                header: 'Job',
                accessor: 'title',
                render: (ticket) => (
                  <Link href={`/jobs/${ticket.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {ticket.title || `Job #${ticket.id.substring(0, 8)}`}
                  </Link>
                ),
              },
              {
                header: 'Status',
                accessor: 'status',
                render: (ticket) => <StatusBadge status={ticket.status} />,
              },
              { 
                header: 'Category', 
                accessor: 'category',
                render: (ticket) => (
                  <span className="text-gray-900">{ticket.category || '-'}</span>
                ),
              },
              { 
                header: 'Property', 
                accessor: 'propertyId',
                render: (ticket) => (
                  <span className="text-sm text-gray-600">{ticket.propertyId?.substring(0, 8) || '-'}</span>
                ),
              },
            ]}
          />
        </div>
      ) : searchTerm || statusFilter !== 'all' ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No jobs match your search criteria</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No jobs available.</p>
        </div>
      )}
    </div>
  );
}