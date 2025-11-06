import { Test, TestingModule } from '@nestjs/testing';
import { TicketJobsProcessor } from './ticket-jobs.processor';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { Job } from 'bullmq';

describe('TicketJobsProcessor - Appointment Start', () => {
  let processor: TicketJobsProcessor;
  let prisma: PrismaService;
  let eventsService: EventsService;

  const mockAppointment = {
    id: 'appt-123',
    ticketId: 'ticket-123',
    status: 'CONFIRMED',
    startAt: new Date('2024-12-15T10:00:00Z'),
    ticket: {
      id: 'ticket-123',
      status: 'SCHEDULED',
      landlordId: 'landlord-org-456',
      tenancy: {
        tenantOrgId: 'tenant-org-999',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketJobsProcessor,
        {
          provide: PrismaService,
          useValue: {
            appointment: {
              findUnique: jest.fn(),
            },
            ticket: {
              update: jest.fn(),
            },
            ticketTimeline: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: EventsService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<TicketJobsProcessor>(TicketJobsProcessor);
    prisma = module.get<PrismaService>(PrismaService);
    eventsService = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('appointment.start', () => {
    it('should auto-transition ticket to IN_PROGRESS', async () => {
      const job = {
        id: 'job-123',
        name: 'appointment.start',
        data: {
          appointmentId: 'appt-123',
          ticketId: 'ticket-123',
          startAt: new Date('2024-12-15T10:00:00Z').toISOString(),
        },
      } as Job;

      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue(mockAppointment as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({
        ...mockAppointment.ticket,
        status: 'IN_PROGRESS',
        inProgressAt: new Date(),
      } as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await processor.process(job);

      expect(result).toEqual(
        expect.objectContaining({
          status: 'success',
          event: 'appointment.start',
        }),
      );
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          inProgressAt: expect.any(Date),
        }),
      });
      expect(prisma.ticketTimeline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'job_started',
          actorId: null, // System action
        }),
      });
      expect(eventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ticket.status_changed',
          actorRole: 'SYSTEM',
        }),
      );
    });

    it('should skip if appointment not found', async () => {
      const job = {
        id: 'job-123',
        name: 'appointment.start',
        data: {
          appointmentId: 'non-existent',
          ticketId: 'ticket-123',
          startAt: new Date().toISOString(),
        },
      } as Job;

      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue(null);

      const result = await processor.process(job);

      expect(result).toEqual(
        expect.objectContaining({
          status: 'skipped',
          reason: 'appointment not found',
        }),
      );
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('should skip if appointment not confirmed', async () => {
      const job = {
        id: 'job-123',
        name: 'appointment.start',
        data: {
          appointmentId: 'appt-123',
          ticketId: 'ticket-123',
          startAt: new Date().toISOString(),
        },
      } as Job;

      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue({
        ...mockAppointment,
        status: 'PROPOSED',
      } as any);

      const result = await processor.process(job);

      expect(result).toEqual(
        expect.objectContaining({
          status: 'skipped',
          reason: 'appointment not confirmed',
        }),
      );
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('should skip if ticket already transitioned (idempotency)', async () => {
      const job = {
        id: 'job-123',
        name: 'appointment.start',
        data: {
          appointmentId: 'appt-123',
          ticketId: 'ticket-123',
          startAt: new Date().toISOString(),
        },
      } as Job;

      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue({
        ...mockAppointment,
        ticket: {
          ...mockAppointment.ticket,
          status: 'IN_PROGRESS', // Already transitioned
        },
      } as any);

      const result = await processor.process(job);

      expect(result).toEqual(
        expect.objectContaining({
          status: 'skipped',
          reason: 'already transitioned',
        }),
      );
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });
  });
});
