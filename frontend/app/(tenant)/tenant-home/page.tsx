"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface TenantDashboardStats {
  activeTickets: number;
  completedTickets: number;
  pendingTickets: number;
}

export default function TenantDashboardPage() {
  const { user } = useAuth();

  // Fetch tickets
  const { data: ticketsResponse } = useQuery<{ data: Ticket[] }>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<{ data: Ticket[] }>('/tickets'),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  const tickets = ticketsResponse?.data || [];

  // Calculate stats
  const stats: TenantDashboardStats = {
    activeTickets: tickets.filter(t => 
      [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS].includes(t.status as TicketStatus)
    ).length,
    completedTickets: tickets.filter(t => t.status === TicketStatus.COMPLETED).length,
    pendingTickets: tickets.filter(t => t.status === TicketStatus.OPEN).length,
  };

  // Get recent tickets
  const recentTickets = tickets
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome{user ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-gray-600 mt-2">
          Track your maintenance tickets and payments.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Tickets */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Active Tickets</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeTickets}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <Link href="/my-tickets" className="text-sm text-blue-600 hover:underline mt-4 block">
            View tickets →
          </Link>
        </Card>

        {/* Pending Review */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending Review</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingTickets}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Awaiting landlord response</p>
        </Card>

        {/* Completed */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedTickets}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">All time</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/report-issue"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Report New Issue</span>
          </Link>
          <Link
            href="/my-tickets"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">View My Tickets</span>
          </Link>
          <Link
            href="/payments"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">View Payments</span>
          </Link>
        </div>
      </Card>

      {/* Recent Tickets */}
      {recentTickets.length > 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Recent Tickets</h2>
            <Link href="/my-tickets" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/my-tickets/${ticket.id}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {ticket.category} • Reported {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Tickets Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Report any maintenance issues or problems with your property.
          </p>
          <Link
            href="/report-issue"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Report an Issue
          </Link>
        </Card>
      )}
    </div>
  );
}
