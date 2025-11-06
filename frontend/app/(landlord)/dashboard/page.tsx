"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Property, Ticket, TicketStatus } from '@/types/models';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Home, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalProperties: number;
  activeTickets: number;
  completedTickets: number;
  pendingApprovals: number;
}

export default function LandlordDashboardPage() {
  const { user } = useAuth();

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => apiRequest<Property[]>('/properties'),
  });

  // Fetch tickets
  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => apiRequest<Ticket[]>('/tickets'),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Calculate stats
  const stats: DashboardStats = {
    totalProperties: properties.length,
    activeTickets: tickets.filter(t => 
      [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS].includes(t.status as TicketStatus)
    ).length,
    completedTickets: tickets.filter(t => t.status === TicketStatus.COMPLETED).length,
    pendingApprovals: tickets.filter(t => t.status === TicketStatus.NEEDS_APPROVAL).length,
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
          Welcome back{user ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your properties today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Properties */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Properties</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProperties}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <Link href="/properties" className="text-sm text-blue-600 hover:underline mt-4 block">
            View all properties →
          </Link>
        </Card>

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
          <Link href="/tickets" className="text-sm text-blue-600 hover:underline mt-4 block">
            Manage tickets →
          </Link>
        </Card>

        {/* Pending Approvals */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingApprovals}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          {stats.pendingApprovals > 0 && (
            <Link href="/tickets" className="text-sm text-blue-600 hover:underline mt-4 block">
              Review now →
            </Link>
          )}
        </Card>

        {/* Completed This Month */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Completed Tickets</p>
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
            href="/onboarding"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Home className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Add New Property</span>
          </Link>
          <Link
            href="/tickets"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">View All Tickets</span>
          </Link>
          <Link
            href="/finance/dashboard"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Finance Dashboard</span>
          </Link>
        </div>
      </Card>

      {/* Recent Tickets */}
      {recentTickets.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
            <Link href="/tickets" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {ticket.category} • Created {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {properties.length === 0 && (
        <Card className="p-12 text-center">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Properties Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first property to begin managing your portfolio.
          </p>
          <Link
            href="/onboarding"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Your First Property
          </Link>
        </Card>
      )}
    </div>
  );
}