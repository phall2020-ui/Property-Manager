"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueue, useJobActions } from '@/hooks/useJobs';
import { Badge } from '@/components/Badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Pause } from 'lucide-react';
import type { JobStatus, JobSummary } from '@/types/jobs';

const STATUS_OPTIONS: JobStatus[] = ['waiting', 'active', 'delayed', 'completed', 'failed'];

export default function QueueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queueName = params.id as string;
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>('waiting');
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const pageSize = 25;

  const { data, isLoading, error, refetch, isFetching } = useQueue(
    queueName,
    selectedStatus,
    page,
    pageSize
  );

  const jobs = data?.jobs || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error loading queue</h3>
        <p className="text-red-700 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 mr-2"
        >
          Go Back
        </button>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center"
          >
            ← Back to queues
          </button>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            {queueName.replace('-', ' ')} Queue
          </h1>
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

      {/* Stats Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Waiting" value={data.waiting} icon={Clock} color="blue" />
          <StatCard label="Active" value={data.active} icon={RefreshCw} color="yellow" />
          <StatCard label="Delayed" value={data.delayed} icon={Pause} color="purple" />
          <StatCard label="Completed" value={data.completed} icon={CheckCircle} color="green" />
          <StatCard label="Failed" value={data.failed} icon={XCircle} color="red" />
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {STATUS_OPTIONS.map((status) => {
            const count = data?.[status as keyof typeof data] || 0;
            const isSelected = selectedStatus === status;
            
            return (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                  setPage(1);
                }}
                className={`${
                  isSelected
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
              >
                {status}
                {typeof count === 'number' && (
                  <span className={`ml-2 ${isSelected ? 'bg-primary-light' : 'bg-gray-100'} px-2 py-0.5 rounded-full text-xs`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    queueName={queueName}
                    onViewDetails={() => setSelectedJob(job)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No {selectedStatus} jobs found</p>
          </div>
        )}
      </div>

      {/* Job Detail Drawer */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          queueName={queueName}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    purple: 'text-purple-600 bg-purple-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
  }[color];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <Icon className={`w-5 h-5 ${colorClasses}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

function JobRow({
  job,
  queueName,
  onViewDetails,
}: {
  job: JobSummary;
  queueName: string;
  onViewDetails: () => void;
}) {
  const { retry, remove, isRetrying, isRemoving } = useJobActions();
  const [showActions, setShowActions] = useState(false);

  const handleRetry = () => {
    if (confirm('Are you sure you want to retry this job?')) {
      retry({ queueName, jobId: job.id });
    }
  };

  const handleRemove = () => {
    if (confirm('Are you sure you want to remove this job?')) {
      remove({ queueName, jobId: job.id });
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
        {job.id.slice(0, 8)}...
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {job.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <JobStatusBadge status={job.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {job.progress || 0}%
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {job.attemptsMade}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {new Date(job.timestamp).toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={onViewDetails}
            className="text-primary hover:text-primary-dark"
          >
            View
          </button>
          {job.status === 'failed' && (
            <>
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-green-600 hover:text-green-700 disabled:opacity-50"
              >
                Retry
              </button>
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = {
    waiting: { color: 'info' as const, label: 'Waiting' },
    active: { color: 'warning' as const, label: 'Active' },
    delayed: { color: 'info' as const, label: 'Delayed' },
    completed: { color: 'success' as const, label: 'Completed' },
    failed: { color: 'danger' as const, label: 'Failed' },
  }[status];

  return <Badge color={config.color}>{config.label}</Badge>;
}

function JobDetailDrawer({
  job,
  queueName,
  onClose,
}: {
  job: JobSummary;
  queueName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Job ID</h3>
            <p className="font-mono text-sm text-gray-900 bg-gray-50 p-3 rounded">{job.id}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Name</h3>
            <p className="text-sm text-gray-900">{job.name}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
            <JobStatusBadge status={job.status} />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Data</h3>
            <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(job.data, null, 2)}
            </pre>
          </div>

          {job.failedReason && (
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-2">Error</h3>
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <p className="text-sm text-red-900">{job.failedReason}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
