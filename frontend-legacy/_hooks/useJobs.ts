import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/lib/jobsClient';
import type { JobStatus } from '@/types/jobs';

/**
 * React hooks for job queue management
 */

/**
 * Hook to fetch all queues
 */
export function useQueues() {
  return useQuery({
    queryKey: ['jobs', 'queues'],
    queryFn: () => jobsApi.getQueues(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

/**
 * Hook to fetch a specific queue with optional job list
 */
export function useQueue(
  queueName: string,
  status?: JobStatus,
  page: number = 1,
  pageSize: number = 25
) {
  return useQuery({
    queryKey: ['jobs', 'queue', queueName, status, page, pageSize],
    queryFn: () => jobsApi.getQueue(queueName, status, page, pageSize),
    enabled: !!queueName,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

/**
 * Hook to fetch a specific job
 */
export function useJob(queueName: string, jobId: string) {
  return useQuery({
    queryKey: ['jobs', 'job', queueName, jobId],
    queryFn: () => jobsApi.getJob(queueName, jobId),
    enabled: !!queueName && !!jobId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });
}

/**
 * Hook to fetch audit logs
 */
export function useJobAudit(
  queue?: string,
  jobId?: string,
  page: number = 1,
  pageSize: number = 25
) {
  return useQuery({
    queryKey: ['jobs', 'audit', queue, jobId, page, pageSize],
    queryFn: () => jobsApi.getAuditLogs(queue, jobId, page, pageSize),
  });
}

/**
 * Hook for job actions (retry, remove, cancel)
 */
export function useJobActions() {
  const queryClient = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: ({ queueName, jobId, reason }: { queueName: string; jobId: string; reason?: string }) =>
      jobsApi.retryJob(queueName, jobId, reason),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ queueName, jobId, reason }: { queueName: string; jobId: string; reason?: string }) =>
      jobsApi.removeJob(queueName, jobId, reason),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ queueName, jobId, reason }: { queueName: string; jobId: string; reason?: string }) =>
      jobsApi.cancelJob(queueName, jobId, reason),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  return {
    retry: retryMutation.mutate,
    remove: removeMutation.mutate,
    cancel: cancelMutation.mutate,
    isRetrying: retryMutation.isPending,
    isRemoving: removeMutation.isPending,
    isCancelling: cancelMutation.isPending,
    retryError: retryMutation.error,
    removeError: removeMutation.error,
    cancelError: cancelMutation.error,
  };
}
