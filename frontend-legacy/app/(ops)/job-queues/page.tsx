"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useQueues } from '@/hooks/useJobs';
import { Badge } from '@/components/Badge';
import { RefreshCw } from 'lucide-react';
import type { QueueStats } from '@/types/jobs';

export default function JobsPage() {
  const { data: queues, isLoading, error, refetch, isFetching } = useQueues();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading queues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error loading queues</h3>
        <p className="text-red-700 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Queues</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage background job processing
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues && queues.length > 0 ? (
          queues.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No queues found</p>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">About Job Queues</h3>
            <p className="text-sm text-blue-700 mt-1">
              Background jobs handle ticket notifications, automated workflows, and scheduled tasks.
              Click on a queue to view and manage individual jobs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueCard({ queue }: { queue: QueueStats }) {
  const total = queue.waiting + queue.active + queue.delayed;
  const hasIssues = queue.failed > 0;
  const isActive = queue.active > 0;

  return (
    <Link
      href={`/job-queues/${queue.name}`}
      className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {queue.name.replace('-', ' ')}
        </h3>
        {isActive && (
          <div className="flex items-center space-x-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatItem label="Waiting" value={queue.waiting} color="blue" />
        <StatItem label="Active" value={queue.active} color="yellow" />
        <StatItem label="Delayed" value={queue.delayed} color="purple" />
        <StatItem label="Failed" value={queue.failed} color="red" highlight={hasIssues} />
      </div>

      {/* Summary */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Completed</span>
          <span className="font-semibold text-gray-900">{queue.completed.toLocaleString()}</span>
        </div>
        {hasIssues && (
          <div className="mt-2 flex items-center space-x-2">
            <Badge color="danger">Action Required</Badge>
          </div>
        )}
      </div>
    </Link>
  );
}

function StatItem({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'purple' | 'red';
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    purple: 'text-purple-600 bg-purple-50',
    red: highlight ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-600 bg-gray-50',
  };

  return (
    <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
      <div className={`text-2xl font-bold ${highlight ? 'text-red-600' : ''}`}>
        {value}
      </div>
      <div className="text-xs mt-1 opacity-75">{label}</div>
    </div>
  );
}
