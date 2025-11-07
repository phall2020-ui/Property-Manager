import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

describe('Ticket Assignment (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
  let contractorToken: string;
  let landlordOrgId: string;
  let contractorUserId: string;
  let propertyId: string;
  let ticketId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Clean up test data
    await prisma.ticketAttachment.deleteMany({});
    await prisma.quote.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.tenancy.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.invite.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.orgMember.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.org.deleteMany({});

    // Create landlord
    const landlordResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'assign-landlord@example.com',
        password: 'password123',
        name: 'Assignment Landlord',
      })
      .expect(201);
    
    landlordToken = landlordResponse.body.accessToken;
    landlordOrgId = landlordResponse.body.user.organisations[0].orgId;

    // Create contractor user with landlord's org
    const contractorResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'assign-contractor@example.com',
        password: 'password123',
        name: 'Assignment Contractor',
      })
      .expect(201);
    
    contractorToken = contractorResponse.body.accessToken;
    const contractorOrgId = contractorResponse.body.user.organisations[0].orgId;
    contractorUserId = contractorResponse.body.user.id;

    // Update contractor's org membership to use landlord's org with CONTRACTOR role
    // This simulates the contractor being invited to work with the landlord
    await prisma.orgMember.updateMany({
      where: {
        userId: contractorUserId,
        orgId: contractorOrgId,
      },
      data: {
        orgId: landlordOrgId,
        role: 'CONTRACTOR',
      },
    });

    // Create property
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        address1: '789 Assignment Street',
        postcode: 'SW1A 2AA',
        bedrooms: 3,
      })
      .expect(201);
    
    propertyId = propertyResponse.body.id;

    // Create a ticket to test assignment
    const ticketResponse = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyId,
        title: 'Test Assignment Ticket',
        description: 'This ticket is used to test the assignment endpoint',
        priority: 'MEDIUM',
      })
      .expect(201);
    
    ticketId = ticketResponse.body.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('PATCH /tickets/:id/assign', () => {
    it('should allow landlord to assign ticket to contractor', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          contractorId: contractorUserId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('id', ticketId);
      expect(response.body).toHaveProperty('status');
      
      // Verify the ticket was assigned
      const ticketResponse = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(ticketResponse.body.assignedContractorId).toBe(contractorUserId);
    });

    it('should return 400 when contractorId is missing', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('contractorId');
    });

    it('should return 404 when ticket does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/api/tickets/non-existent-id/assign')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          contractorId: contractorUserId,
        })
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}/assign`)
        .send({
          contractorId: contractorUserId,
        })
        .expect(401);
    });

    it('should verify contractor can view assigned ticket', async () => {
      // Contractor should be able to view the ticket they're assigned to
      const response = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', ticketId);
      expect(response.body.assignedContractorId).toBe(contractorUserId);
    });
  });
});
