/**
 * Types for Jobs/Queue Management
 */

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
}

export interface QueueDetail extends QueueStats {
  jobs?: JobSummary[];
  pagination?: {
    page: number;
    pageSize: number;
  };
}

export interface JobSummary {
  id: string;
  name: string;
  data: any;
  status: JobStatus;
  progress: number;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface JobDetail extends JobSummary {
  stacktrace?: string[];
  returnvalue?: any;
  opts?: any;
}

export type JobStatus = 'waiting' | 'active' | 'delayed' | 'completed' | 'failed';

export interface JobAudit {
  id: string;
  queue: string;
  jobId: string;
  action: 'retry' | 'remove' | 'cancel';
  actorUserId: string;
  reason?: string;
  createdAt: string;
}

export interface JobAuditResponse {
  data: JobAudit[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
