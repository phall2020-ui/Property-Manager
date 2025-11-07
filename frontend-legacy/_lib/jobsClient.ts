import { apiRequest } from './apiClient';
import type { 
  QueueStats, 
  QueueDetail, 
  JobDetail, 
  JobStatus,
  JobAuditResponse 
} from '@/types/jobs';

/**
 * Jobs API Client - provides methods for interacting with job queues
 */

export const jobsApi = {
  /**
   * Get all queues with their counts
   */
  getQueues: async (): Promise<QueueStats[]> => {
    return apiRequest<QueueStats[]>('/jobs/queues', { method: 'GET' });
  },

  /**
   * Get detailed stats for a specific queue
   */
  getQueue: async (
    queueName: string,
    status?: JobStatus,
    page?: number,
    pageSize?: number
  ): Promise<QueueDetail> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('pageSize', pageSize.toString());
    
    const queryString = params.toString();
    const url = `/jobs/queues/${queueName}${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<QueueDetail>(url, { method: 'GET' });
  },

  /**
   * Get details for a specific job
   */
  getJob: async (queueName: string, jobId: string): Promise<JobDetail> => {
    return apiRequest<JobDetail>(`/jobs/queues/${queueName}/${jobId}`, { 
      method: 'GET' 
    });
  },

  /**
   * Retry a failed job
   */
  retryJob: async (queueName: string, jobId: string, reason?: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/jobs/queues/${queueName}/${jobId}/retry`, {
      method: 'POST',
      data: { reason },
    });
  },

  /**
   * Remove a job from the queue
   */
  removeJob: async (queueName: string, jobId: string, reason?: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/jobs/queues/${queueName}/${jobId}/remove`, {
      method: 'POST',
      data: { reason },
    });
  },

  /**
   * Cancel a job (move to failed state)
   */
  cancelJob: async (queueName: string, jobId: string, reason?: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/jobs/queues/${queueName}/${jobId}/cancel`, {
      method: 'POST',
      data: { reason },
    });
  },

  /**
   * Get audit logs for job actions
   */
  getAuditLogs: async (
    queue?: string,
    jobId?: string,
    page?: number,
    pageSize?: number
  ): Promise<JobAuditResponse> => {
    const params = new URLSearchParams();
    if (queue) params.append('queue', queue);
    if (jobId) params.append('jobId', jobId);
    if (page) params.append('page', page.toString());
    if (pageSize) params.append('pageSize', pageSize.toString());
    
    const queryString = params.toString();
    const url = `/jobs/audit${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<JobAuditResponse>(url, { method: 'GET' });
  },
};
