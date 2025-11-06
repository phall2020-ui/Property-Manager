import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobsService } from '../jobs/jobs.service';

describe('TicketsService - Landlord & Scheduling', () => {
  let service: TicketsService;
  let prisma: PrismaService;
  let eventsService: EventsService;
  let jobsService: JobsService;

  const mockProperty = {
    id: 'prop-123',
    ownerOrgId: 'landlord-org-456',
    tenancies: [
      {
        id: 'tenancy-789',
        propertyId: 'prop-123',
        status: 'ACTIVE',
        start: new Date('2024-01-01'),
      },
    ],
  };

  const mockTicket = {
    id: 'ticket-123',
    landlordId: 'landlord-org-456',
    propertyId: 'prop-123',
    tenancyId: 'tenancy-789',
    title: 'Boiler not firing',
    description: 'Reported by tenant via phone',
    priority: 'STANDARD',
    category: 'Heating',
    status: 'OPEN',
    createdById: 'user-123',
    createdByRole: 'LANDLORD',
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    tenancy: {
      id: 'tenancy-789',
      tenantOrgId: 'tenant-org-999',
    },
    createdBy: {
      id: 'user-123',
      name: 'Landlord User',
      email: 'landlord@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findUnique: jest.fn(),
            },
            tenancy: {
              findUnique: jest.fn(),
            },
            ticket: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            ticketTimeline: {
              create: jest.fn(),
            },
            appointment: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: EventsService,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {},
        },
        {
          provide: JobsService,
          useValue: {
            enqueueTicketCreated: jest.fn(),
            enqueueAppointmentStart: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prisma = module.get<PrismaService>(PrismaService);
    eventsService = module.get<EventsService>(EventsService);
    jobsService = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createByLandlord', () => {
    it('should create ticket with createdByRole=LANDLORD', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue({
        id: 'tenancy-789',
        propertyId: 'prop-123',
      } as any);
      jest.spyOn(prisma.ticket, 'create').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.createByLandlord({
        landlordId: 'landlord-org-456',
        propertyId: 'prop-123',
        tenancyId: 'tenancy-789',
        title: 'Boiler not firing',
        description: 'Reported by tenant via phone',
        priority: 'STANDARD',
        category: 'Heating',
        createdById: 'user-123',
      });

      expect(result).toEqual(mockTicket);
      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdByRole: 'LANDLORD',
          status: 'OPEN',
        }),
        include: expect.anything(),
      });
      expect(eventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ticket.created',
          actorRole: 'LANDLORD',
        }),
      );
      expect(jobsService.enqueueTicketCreated).toHaveBeenCalled();
    });

    it('should auto-select latest active tenancy if not provided', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue({
        id: 'tenancy-789',
        propertyId: 'prop-123',
      } as any);
      jest.spyOn(prisma.ticket, 'create').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      await service.createByLandlord({
        landlordId: 'landlord-org-456',
        propertyId: 'prop-123',
        title: 'Boiler not firing',
        description: 'Reported by tenant via phone',
        priority: 'STANDARD',
        createdById: 'user-123',
      });

      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenancyId: 'tenancy-789',
          }),
        }),
      );
    });

    it('should throw NotFoundException if property does not exist', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createByLandlord({
          landlordId: 'landlord-org-456',
          propertyId: 'non-existent',
          title: 'Boiler not firing',
          description: 'Test',
          priority: 'STANDARD',
          createdById: 'user-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if landlord does not own property', async () => {
      const wrongProperty = { ...mockProperty, ownerOrgId: 'different-org' };
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(wrongProperty as any);

      await expect(
        service.createByLandlord({
          landlordId: 'landlord-org-456',
          propertyId: 'prop-123',
          title: 'Boiler not firing',
          description: 'Test',
          priority: 'STANDARD',
          createdById: 'user-123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if tenancyId does not match property', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue({
        id: 'tenancy-wrong',
        propertyId: 'different-property',
      } as any);

      await expect(
        service.createByLandlord({
          landlordId: 'landlord-org-456',
          propertyId: 'prop-123',
          tenancyId: 'tenancy-wrong',
          title: 'Boiler not firing',
          description: 'Test',
          priority: 'STANDARD',
          createdById: 'user-123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('proposeAppointment', () => {
    const mockAppointment = {
      id: 'appt-123',
      ticketId: 'ticket-123',
      contractorId: 'contractor-456',
      startAt: new Date('2024-12-15T10:00:00Z'),
      endAt: new Date('2024-12-15T12:00:00Z'),
      status: 'PROPOSED',
      proposedBy: 'contractor-456',
      ticket: {
        ...mockTicket,
        status: 'APPROVED',
        assignedToId: 'contractor-456',
      },
      contractor: {
        id: 'contractor-456',
        name: 'Contractor Name',
        email: 'contractor@example.com',
      },
    };

    it('should create appointment for approved ticket', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        status: 'APPROVED',
        assignedToId: 'contractor-456',
      } as any);
      jest.spyOn(prisma.appointment, 'create').mockResolvedValue(mockAppointment as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.proposeAppointment(
        'ticket-123',
        'contractor-456',
        new Date('2024-12-15T10:00:00Z'),
        new Date('2024-12-15T12:00:00Z'),
        'Morning slot',
      );

      expect(result).toEqual(mockAppointment);
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PROPOSED',
            proposedBy: 'contractor-456',
          }),
        }),
      );
      expect(eventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'appointment.proposed',
          actorRole: 'CONTRACTOR',
        }),
      );
    });

    it('should throw ForbiddenException if contractor is not assigned', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        status: 'APPROVED',
        assignedToId: 'different-contractor',
      } as any);

      await expect(
        service.proposeAppointment(
          'ticket-123',
          'contractor-456',
          new Date('2024-12-15T10:00:00Z'),
          null,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if ticket is not APPROVED', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        status: 'QUOTED',
        assignedToId: 'contractor-456',
      } as any);

      await expect(
        service.proposeAppointment(
          'ticket-123',
          'contractor-456',
          new Date('2024-12-15T10:00:00Z'),
          null,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmAppointment', () => {
    const mockAppointment = {
      id: 'appt-123',
      ticketId: 'ticket-123',
      status: 'PROPOSED',
      startAt: new Date('2024-12-15T10:00:00Z'),
      endAt: new Date('2024-12-15T12:00:00Z'),
      ticket: {
        ...mockTicket,
        status: 'APPROVED',
      },
    };

    it('should confirm appointment and update ticket to SCHEDULED', async () => {
      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue(mockAppointment as any);
      jest.spyOn(prisma.appointment, 'update').mockResolvedValue({
        ...mockAppointment,
        status: 'CONFIRMED',
        confirmedBy: 'tenant-user',
        confirmedAt: new Date(),
        ticket: {
          ...mockTicket,
          status: 'SCHEDULED',
        },
      } as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.confirmAppointment('appt-123', 'tenant-user', 'TENANT');

      expect(result.status).toBe('CONFIRMED');
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SCHEDULED',
          }),
        }),
      );
      expect(jobsService.enqueueAppointmentStart).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if appointment is not PROPOSED', async () => {
      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue({
        ...mockAppointment,
        status: 'CONFIRMED',
      } as any);

      await expect(
        service.confirmAppointment('appt-123', 'tenant-user', 'TENANT'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is contractor', async () => {
      jest.spyOn(prisma.appointment, 'findUnique').mockResolvedValue(mockAppointment as any);

      await expect(
        service.confirmAppointment('appt-123', 'contractor-user', 'CONTRACTOR'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
