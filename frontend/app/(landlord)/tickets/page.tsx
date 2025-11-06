"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CreateTicketModal } from '@/components/CreateTicketModal';
import { Search, Filter, Plus } from 'lucide-react';

export default function LandlordTicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    data: tickets,
    isLoading,
    error,
  } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<Ticket[]>('/tickets'),
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchIntervalInBackground: false,
  });

  // Get unique categories
  const categories = useMemo(() => {
    if (!tickets) return [];
    const cats = new Set(tickets.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tickets]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter(ticket => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          ticket.title?.toLowerCase().includes(query) ||
          ticket.description?.toLowerCase().includes(query) ||
          ticket.id.toLowerCase().includes(query) ||
          ticket.propertyId?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && ticket.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, statusFilter, categoryFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    if (!tickets) return {};
    return tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [tickets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading tickets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Error loading tickets</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600 mt-1">{filteredTickets.length} tickets</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter('all')}>
          <p className="text-sm text-gray-600">All Tickets</p>
          <p className="text-2xl font-bold text-gray-900">{tickets?.length || 0}</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === TicketStatus.OPEN ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter(TicketStatus.OPEN)}>
          <p className="text-sm text-gray-600">Open</p>
          <p className="text-2xl font-bold text-blue-600">{statusCounts[TicketStatus.OPEN] || 0}</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === TicketStatus.NEEDS_APPROVAL ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter(TicketStatus.NEEDS_APPROVAL)}>
          <p className="text-sm text-gray-600">Needs Approval</p>
          <p className="text-2xl font-bold text-yellow-600">{statusCounts[TicketStatus.NEEDS_APPROVAL] || 0}</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === TicketStatus.IN_PROGRESS ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter(TicketStatus.IN_PROGRESS)}>
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-orange-600">{statusCounts[TicketStatus.IN_PROGRESS] || 0}</p>
        </Card>
        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === TicketStatus.COMPLETED ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setStatusFilter(TicketStatus.COMPLETED)}>
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">{statusCounts[TicketStatus.COMPLETED] || 0}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      </Card>

      {/* Tickets Table */}
      <Card className="overflow-hidden">
        {filteredTickets.length > 0 ? (
          <Table
            data={filteredTickets}
            columns={[
              {
                header: 'Title',
                accessor: 'title',
                render: (ticket) => (
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {ticket.title}
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
              { header: 'Category', accessor: 'category' },
              { header: 'Property', accessor: 'propertyId', render: (ticket) => (
                <span className="text-sm text-gray-600">{ticket.propertyId?.substring(0, 8) || 'N/A'}...</span>
              )},
              {
                header: 'Created',
                accessor: 'createdAt',
                render: (ticket) => (
                  <span className="text-sm text-gray-600">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500">No tickets match your filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}