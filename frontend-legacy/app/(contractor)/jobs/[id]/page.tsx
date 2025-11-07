"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { SubmitQuoteDTO } from '@/lib/schemas';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { SubmitQuoteModal } from '@/components/SubmitQuoteModal';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const {
    data: job,
    isLoading,
    error,
  } = useQuery<Ticket>({
    queryKey: ['ticket', jobId],
    queryFn: () => apiRequest<Ticket>(`/tickets/${jobId}`),
    enabled: typeof jobId === 'string',
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const submitQuote = useMutation({
    mutationFn: async (data: SubmitQuoteDTO) => {
      return apiRequest(`/tickets/${jobId}/quote`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['ticket', jobId] });

      // Snapshot the previous value
      const previousTicket = queryClient.getQueryData<Ticket>(['ticket', jobId]);

      // Optimistically update to the new value
      queryClient.setQueryData<Ticket>(['ticket', jobId], (old) => ({
        ...(old as Ticket),
        status: TicketStatus.NEEDS_APPROVAL,
        quote: {
          amount: data.amount,
          eta: data.eta,
          notes: data.notes,
        },
      }));

      // Return a context object with the snapshotted value
      return { previousTicket };
    },
    onError: (err: any, _newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context && typeof context === 'object' && 'previousTicket' in context) {
        queryClient.setQueryData<Ticket>(['ticket', jobId], context.previousTicket as Ticket);
      }
      setActionError(err.detail || 'Failed to submit quote');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', jobId] });
      setIsQuoteModalOpen(false);
      setActionError(null);
    },
  });
  const updateStatus = useMutation({
    mutationFn: async (status: TicketStatus) => {
      return apiRequest(`/tickets/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', jobId] });
    },
    onError: (err: any) => {
      setActionError(err.detail || 'Failed to update job status');
    },
  });
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading job details...</p>
      </div>
    );
  }
  
  if (error || !job) {
    return (
      <div className="p-6">
        <p className="text-red-600">Unable to load job</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          ← Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="flex items-center space-x-2">
          <span>← Back</span>
        </Button>
      </div>

      {/* Job Details Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Job #{job.id.substring(0, 8)}</p>
          </div>
          <Badge
            color={
              job.status === TicketStatus.COMPLETED
                ? 'success'
                : job.status === TicketStatus.IN_PROGRESS
                ? 'warning'
                : 'info'
            }
          >
            {job.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{job.category}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Property</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{job.propertyId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>
          {job.quoteAmount && (
            <div>
              <p className="text-sm text-gray-600">Your Quote</p>
              <p className="text-sm font-medium text-gray-900 mt-1">£{job.quoteAmount.toFixed(2)}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {actionError}
        </div>
      )}
      {/* Quote submission */}
      {job.status === TicketStatus.OPEN || job.status === TicketStatus.ASSIGNED ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Submit Your Quote</h3>
          <p className="text-gray-600 mb-4">
            Review the job details and submit your quote for approval.
          </p>
          <Button 
            variant="primary" 
            onClick={() => setIsQuoteModalOpen(true)}
            className="w-full"
          >
            Submit Quote
          </Button>
        </div>
      ) : null}
      {/* Status actions */}
      {job.status === TicketStatus.QUOTED && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Update Job Status</h3>
          <div className="flex space-x-4">
            <Button
              variant="primary"
              onClick={() => updateStatus.mutate(TicketStatus.IN_PROGRESS)}
              disabled={updateStatus.isPending}
              className="flex-1"
            >
              {updateStatus.isPending ? 'Updating...' : 'Mark On Site'}
            </Button>
            <Button
              variant="primary"
              onClick={() => updateStatus.mutate(TicketStatus.COMPLETED)}
              disabled={updateStatus.isPending}
              className="flex-1"
            >
              {updateStatus.isPending ? 'Updating...' : 'Mark Complete'}
            </Button>
          </div>
        </div>
      )}

      {job.status === TicketStatus.IN_PROGRESS && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Mark Job Complete</h3>
          <p className="text-gray-600 mb-4">
            Once you&apos;ve finished the work, mark this job as complete.
          </p>
          <Button
            variant="primary"
            onClick={() => updateStatus.mutate(TicketStatus.COMPLETED)}
            disabled={updateStatus.isPending}
            className="w-full"
          >
            {updateStatus.isPending ? 'Updating...' : 'Mark as Complete'}
          </Button>
        </div>
      )}

      {job.status === TicketStatus.COMPLETED && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-green-800 font-medium">✓ This job has been completed</p>
        </div>
      )}

      {/* Submit Quote Modal */}
      <SubmitQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        onSubmit={(data) => submitQuote.mutate(data)}
        isSubmitting={submitQuote.isPending}
        ticketTitle={job.title}
      />
    </div>
  );
}