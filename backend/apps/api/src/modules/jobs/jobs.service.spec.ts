import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

describe('JobsService', () => {
  let service: JobsService;
  let ticketsQueue: jest.Mocked<Queue>;
  let notificationsQueue: jest.Mocked<Queue>;
  let deadLetterQueue: jest.Mocked<Queue>;

  // Mock Redis client
  const mockRedisClient = {
    ping: jest.fn().mockResolvedValue('PONG'),
  };

  // Mock Queue methods
  const createMockQueue = () => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getWaitingCount: jest.fn().mockResolvedValue(5),
    getActiveCount: jest.fn().mockResolvedValue(2),
    getDelayedCount: jest.fn().mockResolvedValue(1),
    getCompletedCount: jest.fn().mockResolvedValue(100),
    getFailedCount: jest.fn().mockResolvedValue(3),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getDelayed: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getJob: jest.fn().mockResolvedValue(null),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 5,
      active: 2,
      delayed: 1,
      completed: 100,
      failed: 3,
    }),
    getMetrics: jest.fn().mockResolvedValue({
      processed: 100,
      failed: 3,
      avgProcessingTime: 1250,
    }),
    get client() {
      return Promise.resolve(mockRedisClient);
    },
  });

  beforeEach(async () => {
    const mockTicketsQueue = createMockQueue();
    const mockNotificationsQueue = createMockQueue();
    const mockDeadLetterQueue = createMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getQueueToken('tickets'),
          useValue: mockTicketsQueue,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockNotificationsQueue,
        },
        {
          provide: getQueueToken('dead-letter'),
          useValue: mockDeadLetterQueue,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    ticketsQueue = module.get(getQueueToken('tickets'));
    notificationsQueue = module.get(getQueueToken('notifications'));
    deadLetterQueue = module.get(getQueueToken('dead-letter'));

    // Trigger Redis connection check
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should check Redis connection on init', async () => {
      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(service.isRedisAvailable()).toBe(true);
    });
  });

  describe('enqueueTicketCreated', () => {
    it('should enqueue ticket.created job', async () => {
      const data = {
        ticketId: 'ticket-123',
        propertyId: 'prop-456',
        createdById: 'user-789',
        landlordId: 'landlord-999',
      };

      await service.enqueueTicketCreated(data);

      expect(ticketsQueue.add).toHaveBeenCalledWith('ticket.created', data, {
        jobId: `ticket-created-${data.ticketId}`,
      });
    });
  });

  describe('enqueueTicketQuoted', () => {
    it('should enqueue ticket.quoted job', async () => {
      const data = {
        ticketId: 'ticket-123',
        quoteId: 'quote-456',
        contractorId: 'contractor-789',
        amount: 250.0,
        landlordId: 'landlord-999',
      };

      await service.enqueueTicketQuoted(data);

      expect(ticketsQueue.add).toHaveBeenCalledWith('ticket.quoted', data, {
        jobId: `ticket-quoted-${data.ticketId}-${data.quoteId}`,
      });
    });
  });

  describe('enqueueTicketApproved', () => {
    it('should enqueue ticket.approved job', async () => {
      const data = {
        ticketId: 'ticket-123',
        quoteId: 'quote-456',
        approvedBy: 'user-789',
        landlordId: 'landlord-999',
      };

      await service.enqueueTicketApproved(data);

      expect(ticketsQueue.add).toHaveBeenCalledWith('ticket.approved', data, {
        jobId: `ticket-approved-${data.ticketId}-${data.quoteId}`,
      });
    });
  });

  describe('enqueueTicketAssigned', () => {
    it('should enqueue ticket.assigned job', async () => {
      const data = {
        ticketId: 'ticket-123',
        assignedToId: 'contractor-456',
        assignedBy: 'user-789',
        landlordId: 'landlord-999',
      };

      await service.enqueueTicketAssigned(data);

      expect(ticketsQueue.add).toHaveBeenCalledWith('ticket.assigned', data, {
        jobId: `ticket-assigned-${data.ticketId}-${data.assignedToId}`,
      });
    });
  });

  describe('enqueueNotification', () => {
    it('should enqueue email notification', async () => {
      const data = {
        type: 'email' as const,
        recipientId: 'user-123',
        subject: 'Test notification',
        message: 'This is a test',
        metadata: { foo: 'bar' },
      };

      await service.enqueueNotification(data);

      expect(notificationsQueue.add).toHaveBeenCalledWith('send-notification', data, undefined);
    });
  });

  describe('enqueueAppointmentStart', () => {
    it('should enqueue appointment.start with calculated delay', async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const data = {
        appointmentId: 'appt-123',
        ticketId: 'ticket-456',
        startAt: futureTime.toISOString(),
      };

      await service.enqueueAppointmentStart(data);

      expect(ticketsQueue.add).toHaveBeenCalledWith('appointment.start', data, {
        jobId: `appointment-start-${data.appointmentId}`,
        delay: expect.any(Number),
      });

      const callArgs = ticketsQueue.add.mock.calls[0][2];
      expect(callArgs.delay).toBeGreaterThan(0);
    });

    it('should enqueue appointment.start with zero delay for past time', async () => {
      const pastTime = new Date(Date.now() - 3600000); // 1 hour ago
      const data = {
        appointmentId: 'appt-123',
        ticketId: 'ticket-456',
        startAt: pastTime.toISOString(),
      };

      await service.enqueueAppointmentStart(data);

      expect(ticketsQueue.add).toHaveBeenCalledWith('appointment.start', data, {
        jobId: `appointment-start-${data.appointmentId}`,
        delay: 0,
      });
    });
  });

  describe('getQueues', () => {
    it('should return stats for all queues', async () => {
      const result = await service.getQueues();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'tickets',
        waiting: 5,
        active: 2,
        delayed: 1,
        completed: 100,
        failed: 3,
      });
      expect(result[1]).toEqual({
        name: 'notifications',
        waiting: 5,
        active: 2,
        delayed: 1,
        completed: 100,
        failed: 3,
      });
      expect(result[2]).toEqual({
        name: 'dead-letter',
        waiting: 5,
        active: 2,
        delayed: 1,
        completed: 100,
        failed: 3,
      });
    });

    it('should throw error when Redis not available', async () => {
      // Create a service with no Redis
      const noRedisModule = await Test.createTestingModule({
        providers: [
          JobsService,
          {
            provide: getQueueToken('tickets'),
            useValue: {
              ...createMockQueue(),
              get client() {
                return Promise.resolve({
                  ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
                });
              },
            },
          },
          {
            provide: getQueueToken('notifications'),
            useValue: createMockQueue(),
          },
          {
            provide: getQueueToken('dead-letter'),
            useValue: createMockQueue(),
          },
        ],
      }).compile();

      const noRedisService = noRedisModule.get<JobsService>(JobsService);
      await noRedisService.onModuleInit();

      await expect(noRedisService.getQueues()).rejects.toThrow('Redis not available');
    });
  });

  describe('getQueue', () => {
    it('should return stats for specific queue', async () => {
      const result = await service.getQueue('tickets');

      expect(result).toEqual({
        name: 'tickets',
        waiting: 5,
        active: 2,
        delayed: 1,
        completed: 100,
        failed: 3,
      });
    });

    it('should throw error for unknown queue', async () => {
      await expect(service.getQueue('unknown')).rejects.toThrow('Queue unknown not found');
    });
  });

  describe('listJobs', () => {
    it('should list waiting jobs with pagination', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          name: 'test-job',
          data: { foo: 'bar' },
          progress: 0,
          attemptsMade: 0,
          timestamp: Date.now(),
          processedOn: null,
          finishedOn: null,
          failedReason: null,
          getState: jest.fn().mockResolvedValue('waiting'),
        },
      ];

      ticketsQueue.getWaiting.mockResolvedValue(mockJobs as any);

      const result = await service.listJobs('tickets', 'waiting', 1, 25);

      expect(ticketsQueue.getWaiting).toHaveBeenCalledWith(0, 24);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'job-1',
        name: 'test-job',
        status: 'waiting',
      });
    });

    it('should handle pagination correctly', async () => {
      await service.listJobs('tickets', 'completed', 2, 10);
      expect(ticketsQueue.getCompleted).toHaveBeenCalledWith(10, 19);
    });

    it('should throw error for invalid status', async () => {
      await expect(
        service.listJobs('tickets', 'invalid' as any, 1, 25)
      ).rejects.toThrow('Invalid status: invalid');
    });
  });

  describe('getJob', () => {
    it('should return job details', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'test-job',
        data: { foo: 'bar' },
        progress: 50,
        attemptsMade: 1,
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: null,
        failedReason: null,
        stacktrace: [],
        returnvalue: null,
        opts: {},
        getState: jest.fn().mockResolvedValue('active'),
      };

      ticketsQueue.getJob.mockResolvedValue(mockJob as any);

      const result = await service.getJob('tickets', 'job-123');

      expect(result).toMatchObject({
        id: 'job-123',
        name: 'test-job',
        status: 'active',
        progress: 50,
      });
    });

    it('should return null for non-existent job', async () => {
      ticketsQueue.getJob.mockResolvedValue(null);
      const result = await service.getJob('tickets', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('retryJob', () => {
    it('should retry a failed job', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('failed'),
        retry: jest.fn().mockResolvedValue(undefined),
      };

      ticketsQueue.getJob.mockResolvedValue(mockJob as any);

      const result = await service.retryJob('tickets', 'job-123');

      expect(mockJob.retry).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw error if job not found', async () => {
      ticketsQueue.getJob.mockResolvedValue(null);

      await expect(service.retryJob('tickets', 'non-existent')).rejects.toThrow(
        'Job non-existent not found in queue tickets'
      );
    });

    it('should throw error if job is not failed', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
      };

      ticketsQueue.getJob.mockResolvedValue(mockJob as any);

      await expect(service.retryJob('tickets', 'job-123')).rejects.toThrow(
        'Job job-123 is not in failed state (current: completed)'
      );
    });
  });

  describe('removeJob', () => {
    it('should remove a job', async () => {
      const mockJob = {
        id: 'job-123',
        remove: jest.fn().mockResolvedValue(undefined),
      };

      ticketsQueue.getJob.mockResolvedValue(mockJob as any);

      const result = await service.removeJob('tickets', 'job-123');

      expect(mockJob.remove).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw error if job not found', async () => {
      ticketsQueue.getJob.mockResolvedValue(null);

      await expect(service.removeJob('tickets', 'non-existent')).rejects.toThrow(
        'Job non-existent not found in queue tickets'
      );
    });
  });

  describe('failJob', () => {
    it('should fail a job with reason', async () => {
      const mockJob = {
        id: 'job-123',
        moveToFailed: jest.fn().mockResolvedValue(undefined),
      };

      ticketsQueue.getJob.mockResolvedValue(mockJob as any);

      const result = await service.failJob('tickets', 'job-123', 'Test reason');

      expect(mockJob.moveToFailed).toHaveBeenCalledWith(
        expect.any(Error),
        '',
        true
      );
      expect(result).toEqual({ success: true });
    });

    it('should use default reason if not provided', async () => {
      const mockJob = {
        id: 'job-123',
        moveToFailed: jest.fn().mockResolvedValue(undefined),
      };

      ticketsQueue.getJob.mockResolvedValue(mockJob as any);

      await service.failJob('tickets', 'job-123');

      const callArgs = mockJob.moveToFailed.mock.calls[0][0];
      expect(callArgs.message).toBe('Manually cancelled');
    });
  });

  describe('stats', () => {
    it('should return queue statistics', async () => {
      const result = await service.stats('tickets');

      expect(result).toEqual({
        counts: {
          waiting: 5,
          active: 2,
          delayed: 1,
          completed: 100,
          failed: 3,
        },
        metrics: {
          processed: 100,
          failed: 3,
          avgProcessingTime: 1250,
        },
      });
    });
  });

  describe('moveToDeadLetter', () => {
    it('should move failed job to dead letter queue', async () => {
      const jobData = { foo: 'bar' };
      const error = 'Failed to process';

      await service.moveToDeadLetter(jobData, error);

      expect(deadLetterQueue.add).toHaveBeenCalledWith(
        'failed-job',
        {
          originalData: jobData,
          error,
          timestamp: expect.any(String),
        },
        undefined
      );
    });
  });
});
