"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { SubmitQuoteSchema, SubmitQuoteDTO } from '@/lib/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: job,
    isLoading,
    error,
  } = useQuery<Ticket>({
    queryKey: ['ticket', jobId],
    queryFn: () => apiRequest<Ticket>(`/tickets/${jobId}`),
    enabled: typeof jobId === 'string',
  });
  const quoteForm = useForm<SubmitQuoteDTO>({ resolver: zodResolver(SubmitQuoteSchema) });
  const [actionError, setActionError] = useState<string | null>(null);
  const submitQuote = useMutation<unknown, any, SubmitQuoteDTO>({
    mutationFn: async (data: SubmitQuoteDTO) => {
      return apiRequest(`/tickets/${jobId}/quote`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', jobId] });
    },
    onError: (err: any) => {
      setActionError(err.detail || 'Failed to submit quote');
    },
  });
  const updateStatus = useMutation<unknown, any, TicketStatus>({
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
  if (isLoading) return <p>Loading…</p>;
  if (error || !job) return <p className="text-red-600">Unable to load job</p>;
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Job {job.id}</h2>
      <p>
        <strong>Status:</strong>{' '}
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
      </p>
      <p>
        <strong>Category:</strong> {job.category}
      </p>
      <p>
        <strong>Description:</strong> {job.description}
      </p>
      {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
      {/* Quote submission */}
      {job.status === TicketStatus.OPEN || job.status === TicketStatus.ASSIGNED ? (
        <form
          onSubmit={quoteForm.handleSubmit((data) => submitQuote.mutate(data))}
          className="space-y-4 border-t pt-4"
        >
          <h3 className="text-lg font-semibold">Submit Quote</h3>
          <div>
            <label className="block text-sm font-medium" htmlFor="amount">
              Amount (£)
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              {...quoteForm.register('amount', { valueAsNumber: true })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
            {quoteForm.formState.errors.amount && (
              <p className="text-xs text-red-600">{quoteForm.formState.errors.amount.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="eta">
              ETA (date)
            </label>
            <input
              id="eta"
              type="date"
              {...quoteForm.register('eta')}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
            {quoteForm.formState.errors.eta && (
              <p className="text-xs text-red-600">{quoteForm.formState.errors.eta.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              {...quoteForm.register('notes')}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            ></textarea>
            {quoteForm.formState.errors.notes && (
              <p className="text-xs text-red-600">{quoteForm.formState.errors.notes.message}</p>
            )}
          </div>
          <Button type="submit" variant="primary" disabled={submitQuote.isPending}>
            {submitQuote.isPending ? 'Submitting…' : 'Submit Quote'}
          </Button>
        </form>
      ) : null}
      {/* Status actions */}
      {job.status === TicketStatus.QUOTED && (
        <div className="flex space-x-4 border-t pt-4">
          <Button
            variant="primary"
            onClick={() => updateStatus.mutate(TicketStatus.IN_PROGRESS)}
            disabled={updateStatus.isPending}
          >
            Mark On Site
          </Button>
          <Button
            variant="primary"
            onClick={() => updateStatus.mutate(TicketStatus.COMPLETED)}
            disabled={updateStatus.isPending}
          >
            Mark Complete
          </Button>
        </div>
      )}
    </div>
  );
}