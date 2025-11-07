'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Briefcase, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ContractorDashboardStats {
  newJobs: number;
  quotedJobs: number;
  approvedJobs: number;
  completedJobs: number;
}

export default function ContractorDashboardPage() {
  const { user } = useAuth();

  // Fetch assigned jobs (tickets assigned to this contractor)
  const { data: jobs = [] } = useQuery<Ticket[]>({
    queryKey: ['contractor-jobs'],
    queryFn: () => apiRequest<Ticket[]>('/tickets'), // TODO: Filter by contractor
    refetchInterval: 10000,
  });

  // Calculate stats
  const stats: ContractorDashboardStats = {
    newJobs: jobs.filter(j => j.status === TicketStatus.ASSIGNED).length,
    quotedJobs: jobs.filter(j => j.status === TicketStatus.NEEDS_APPROVAL).length,
    approvedJobs: jobs.filter(j => j.status === TicketStatus.APPROVED || j.status === TicketStatus.IN_PROGRESS).length,
    completedJobs: jobs.filter(j => j.status === TicketStatus.COMPLETED).length,
  };

  // Get recent jobs
  const recentJobs = jobs
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
          Manage your assigned jobs and submit quotes.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* New Jobs */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">New Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.newJobs}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <Link href="/jobs?status=ASSIGNED" className="text-sm text-blue-600 hover:underline mt-4 block">
            View new jobs →
          </Link>
        </Card>

        {/* Quoted Jobs */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Awaiting Approval</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.quotedJobs}</p>
            </div>
            <div className="rounded-full bg-amber-100 p-3">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Quotes submitted</p>
        </Card>

        {/* Approved Jobs */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Approved Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.approvedJobs}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <Link href="/jobs?status=APPROVED" className="text-sm text-blue-600 hover:underline mt-4 block">
            Start work →
          </Link>
        </Card>

        {/* Completed */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedJobs}</p>
            </div>
            <div className="rounded-full bg-gray-100 p-3">
              <CheckCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">All time</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/jobs"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Briefcase className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">View All Jobs</span>
          </Link>
          <Link
            href="/jobs?status=ASSIGNED"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Submit Quotes</span>
          </Link>
        </div>
      </Card>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{job.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {job.category} • Assigned {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {jobs.length === 0 && (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Jobs Yet
          </h3>
          <p className="text-gray-600 mb-6">
            You haven&apos;t been assigned any jobs yet. Check back later.
          </p>
        </Card>
      )}
    </div>
  );
}
