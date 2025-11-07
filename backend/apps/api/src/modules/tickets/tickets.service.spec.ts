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
              findMany: jest.fn(),
              count: jest.fn(),
            },
            ticketTimeline: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            appointment: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            quote: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findFirst: jest.fn(),
            },
            ticketAttachment: {
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
        {
          provide: NotificationsService,
          useValue: {},
        },
        {
          provide: JobsService,
          useValue: {
            enqueueTicketCreated: jest.fn(),
            enqueueAppointmentStart: jest.fn(),
            enqueueTicketQuoted: jest.fn(),
            enqueueTicketApproved: jest.fn(),
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
      jest.spyOn(prisma.appointment, 'findMany').mockResolvedValue([]);
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
      jest.spyOn(prisma.appointment, 'findMany').mockResolvedValue([]);

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
      jest.spyOn(prisma.appointment, 'findMany').mockResolvedValue([]);

      await expect(
        service.proposeAppointment(
          'ticket-123',
          'contractor-456',
          new Date('2024-12-15T10:00:00Z'),
          null,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if existing appointment already proposed', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        status: 'APPROVED',
        assignedToId: 'contractor-456',
      } as any);
      jest.spyOn(prisma.appointment, 'findMany').mockResolvedValue([
        {
          id: 'existing-appt',
          ticketId: 'ticket-123',
          status: 'PROPOSED',
          contractorId: 'contractor-456',
        },
      ] as any);

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

  describe('createQuote', () => {
    it('should create quote and update ticket status to QUOTED', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.quote, 'create').mockResolvedValue({
        id: 'quote-123',
        ticketId: 'ticket-123',
        contractorId: 'contractor-456',
        amount: 250.0,
        notes: 'Parts and labor included',
        status: 'PROPOSED',
      } as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.createQuote(
        'ticket-123',
        'contractor-456',
        250.0,
        'Parts and labor included',
      );

      expect(result).toHaveProperty('id', 'quote-123');
      expect(result).toHaveProperty('amount', 250.0);
      expect(prisma.quote.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-123',
          contractorId: 'contractor-456',
          amount: 250.0,
          notes: 'Parts and labor included',
          status: 'PROPOSED',
        },
      });
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: { status: 'QUOTED' },
      });
      expect(eventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ticket.quote_submitted',
        }),
      );
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null);

      await expect(
        service.createQuote('non-existent', 'contractor-456', 250.0),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveQuote', () => {
    const mockQuote = {
      id: 'quote-123',
      ticketId: 'ticket-123',
      contractorId: 'contractor-456',
      amount: 250.0,
      status: 'PROPOSED',
      ticket: {
        ...mockTicket,
        property: mockProperty,
      },
    };

    it('should approve quote and update ticket status', async () => {
      jest.spyOn(prisma.quote, 'findUnique').mockResolvedValue(mockQuote as any);
      jest.spyOn(prisma.quote, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.approveQuote('quote-123', ['landlord-org-456']);

      expect(result).toHaveProperty('message', 'Quote approved successfully');
      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-123' },
        data: {
          status: 'APPROVED',
          approvedAt: expect.any(Date),
        },
      });
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: { status: 'APPROVED' },
      });
    });

    it('should throw NotFoundException if quote does not exist', async () => {
      jest.spyOn(prisma.quote, 'findUnique').mockResolvedValue(null);

      await expect(
        service.approveQuote('non-existent', ['landlord-org-456']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not property owner', async () => {
      jest.spyOn(prisma.quote, 'findUnique').mockResolvedValue(mockQuote as any);

      await expect(
        service.approveQuote('quote-123', ['different-org']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeTicket', () => {
    it('should mark ticket as completed', async () => {
      const mockTicketWithQuote = {
        ...mockTicket,
        quotes: [
          {
            id: 'quote-123',
            contractorId: 'contractor-456',
            status: 'APPROVED',
          },
        ],
      };

      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicketWithQuote as any);
      jest.spyOn(prisma.quote, 'updateMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.completeTicket(
        'ticket-123',
        'contractor-456',
        'Work completed successfully',
      );

      expect(result).toHaveProperty('message', 'Ticket marked as complete');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: { status: 'COMPLETED' },
      });
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null);

      await expect(
        service.completeTicket('non-existent', 'contractor-456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if no approved quote for contractor', async () => {
      const mockTicketNoQuote = {
        ...mockTicket,
        quotes: [],
      };

      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicketNoQuote as any);

      await expect(
        service.completeTicket('ticket-123', 'contractor-456'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({
        ...mockTicket,
        status: 'TRIAGED',
      } as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.updateStatus(
        'ticket-123',
        'TRIAGED',
        'user-123',
        ['landlord-org-456'],
      );

      expect(result.status).toBe('TRIAGED');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-123' },
        data: { status: 'TRIAGED' },
      });

      findOneSpy.mockRestore();
    });

    it('should throw ForbiddenException for invalid transition', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockTicket as any);

      await expect(
        service.updateStatus('ticket-123', 'COMPLETED', 'user-123', ['landlord-org-456']),
      ).rejects.toThrow(ForbiddenException);

      findOneSpy.mockRestore();
    });
  });

  describe('uploadAttachment', () => {
    it('should upload attachment after verifying access', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.ticketAttachment, 'create').mockResolvedValue({
        id: 'attachment-123',
        ticketId: 'ticket-123',
        filename: 'photo.jpg',
        filepath: '/uploads/photo.jpg',
        mimetype: 'image/jpeg',
        size: 102400,
      } as any);

      const result = await service.uploadAttachment(
        'ticket-123',
        'photo.jpg',
        '/uploads/photo.jpg',
        'image/jpeg',
        102400,
        ['landlord-org-456'],
      );

      expect(result).toHaveProperty('filename', 'photo.jpg');
      expect(prisma.ticketAttachment.create).toHaveBeenCalled();

      findOneSpy.mockRestore();
    });
  });

  describe('getTimeline', () => {
    it('should return ticket timeline events', async () => {
      const mockTimeline = [
        {
          id: 'timeline-1',
          ticketId: 'ticket-123',
          eventType: 'created',
          actorId: 'user-123',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'timeline-2',
          ticketId: 'ticket-123',
          eventType: 'status_changed',
          actorId: 'user-123',
          createdAt: new Date('2024-01-02'),
        },
      ];

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.ticketTimeline, 'findMany').mockResolvedValue(mockTimeline as any);

      const result = await service.getTimeline('ticket-123', ['landlord-org-456']);

      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe('created');

      findOneSpy.mockRestore();
    });
  });

  describe('findMany', () => {
    it('should filter tickets by landlord role', async () => {
      const mockTickets = [mockTicket];
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue(mockTickets as any);
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

      const result = await service.findMany(['landlord-org-456'], 'LANDLORD');

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            property: {
              ownerOrgId: { in: ['landlord-org-456'] },
            },
          }),
        }),
      );
    });

    it('should filter tickets by tenant role', async () => {
      const mockTickets = [mockTicket];
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue(mockTickets as any);
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

      const result = await service.findMany(['tenant-org-999'], 'TENANT');

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenancy: {
              tenantOrgId: { in: ['tenant-org-999'] },
            },
          }),
        }),
      );
    });

    it('should apply status filter', async () => {
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(0);

      const result = await service.findMany(['landlord-org-456'], 'LANDLORD', { status: 'OPEN' });

      expect(result.data).toHaveLength(0);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
          }),
        }),
      );
    });
  });

  describe('getTicketAppointments', () => {
    it('should return appointments for a ticket', async () => {
      const mockAppointments = [
        {
          id: 'appt-1',
          ticketId: 'ticket-123',
          contractorId: 'contractor-456',
          status: 'PROPOSED',
          contractor: {
            id: 'contractor-456',
            name: 'Contractor Name',
            email: 'contractor@example.com',
          },
        },
      ];

      jest.spyOn(prisma.appointment, 'findMany').mockResolvedValue(mockAppointments as any);

      const result = await service.getTicketAppointments('ticket-123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PROPOSED');
    });
  });

  describe('pagination and search', () => {
    it('should apply pagination with default values', async () => {
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue([mockTicket] as any);
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(1);

      const result = await service.findMany(['landlord-org-456'], 'LANDLORD', {});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should apply custom pagination', async () => {
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(50);

      const result = await service.findMany(['landlord-org-456'], 'LANDLORD', {
        page: 2,
        limit: 10,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(5);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should apply search filter', async () => {
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(0);

      await service.findMany(['landlord-org-456'], 'LANDLORD', {
        search: 'boiler',
      });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'boiler', mode: 'insensitive' } },
              { description: { contains: 'boiler', mode: 'insensitive' } },
              { id: { contains: 'boiler', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should limit pagination to max 100 items', async () => {
      jest.spyOn(prisma.ticket, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.ticket, 'count').mockResolvedValue(0);

      await service.findMany(['landlord-org-456'], 'LANDLORD', {
        limit: 200, // Request more than max
      });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        }),
      );
    });
  });

  describe('quote amount validation', () => {
    it('should reject quote below minimum amount', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);

      await expect(
        service.createQuote('ticket-123', 'contractor-456', 5, 'Too low'),
      ).rejects.toThrow('Quote amount must be at least $10');
    });

    it('should reject quote above maximum amount', async () => {
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);

      await expect(
        service.createQuote('ticket-123', 'contractor-456', 60000, 'Too high'),
      ).rejects.toThrow('Quote amount cannot exceed $50000');
    });

    it('should accept quote within valid range', async () => {
      const mockQuote = {
        id: 'quote-1',
        ticketId: 'ticket-123',
        contractorId: 'contractor-456',
        amount: 150,
        status: 'PROPOSED',
      };

      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.quote, 'create').mockResolvedValue(mockQuote as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue(mockTicket as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.createQuote('ticket-123', 'contractor-456', 150, 'Valid quote');

      expect(result.amount).toBe(150);
      expect(prisma.quote.create).toHaveBeenCalled();
    });
  });

  describe('role-based status transitions', () => {
    it('should allow OPS role to perform any valid transition', async () => {
      const ticket = { ...mockTicket, status: 'OPEN' };
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(ticket as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({ ...ticket, status: 'TRIAGED' } as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.updateStatus('ticket-123', 'TRIAGED', 'user-123', ['landlord-org-456'], 'OPS');

      expect(result.status).toBe('TRIAGED');
    });

    it('should restrict TENANT role to limited transitions', async () => {
      const ticket = { ...mockTicket, status: 'TRIAGED' };
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(ticket as any);

      await expect(
        service.updateStatus('ticket-123', 'QUOTED', 'user-123', ['tenant-org-999'], 'TENANT'),
      ).rejects.toThrow('Role TENANT cannot transition ticket from TRIAGED to QUOTED');
    });

    it('should allow CONTRACTOR to submit quotes', async () => {
      const ticket = { ...mockTicket, status: 'TRIAGED' };
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(ticket as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({ ...ticket, status: 'QUOTED' } as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      // Include landlord org in userOrgIds for access control
      const result = await service.updateStatus('ticket-123', 'QUOTED', 'contractor-456', ['landlord-org-456'], 'CONTRACTOR');

      expect(result.status).toBe('QUOTED');
    });

    it('should allow LANDLORD to approve quotes', async () => {
      const ticket = { ...mockTicket, status: 'QUOTED' };
      jest.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(ticket as any);
      jest.spyOn(prisma.ticket, 'update').mockResolvedValue({ ...ticket, status: 'APPROVED' } as any);
      jest.spyOn(prisma.ticketTimeline, 'create').mockResolvedValue({} as any);

      const result = await service.updateStatus('ticket-123', 'APPROVED', 'user-123', ['landlord-org-456'], 'LANDLORD');

      expect(result.status).toBe('APPROVED');
    });
  });
});
