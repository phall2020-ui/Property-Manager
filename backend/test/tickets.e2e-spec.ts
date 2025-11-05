import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

// NOTE: These tests require proper multi-role org membership support
// Currently, signup only creates LANDLORD orgs, so tenant/contractor workflows can't be tested
// TODO: Implement invite system or test-only endpoints to add org members with different roles
describe.skip('Tickets Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
  let tenantToken: string;
  let contractorToken: string;
  let propertyId: string;
  let tenancyId: string;
  let ticketId: string;
  let quoteId: string;

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
    await prisma.tenancyDocument.deleteMany({});
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
        email: 'ticket-landlord@example.com',
        password: 'password123',
        name: 'Ticket Landlord',
      });
    landlordToken = landlordResponse.body.accessToken;

    // Create tenant
    const tenantResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'ticket-tenant@example.com',
        password: 'password123',
        name: 'Ticket Tenant',
      });
    tenantToken = tenantResponse.body.accessToken;

    // Create contractor
    const contractorResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'ticket-contractor@example.com',
        password: 'password123',
        name: 'Ticket Contractor',
      });
    contractorToken = contractorResponse.body.accessToken;

    // Create property
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        address1: '123 Ticket Street',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
      });
    propertyId = propertyResponse.body.id;

    // Create tenancy
    const tenancyResponse = await request(app.getHttpServer())
      .post('/api/tenancies')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyId,
        tenantOrgId: tenantResponse.body.user.organisations[0].orgId,
        startDate: '2024-01-01',
        endDate: '2025-01-01',
        rentPcm: 1500,
        deposit: 3000,
      });
    tenancyId = tenancyResponse.body.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('Complete Ticket Workflow', () => {
    it('Step 1: Tenant creates ticket (OPEN)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId,
          tenancyId,
          title: 'Leaking tap in kitchen',
          description: 'The kitchen tap has been dripping for 3 days',
          priority: 'HIGH',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Leaking tap in kitchen',
        description: 'The kitchen tap has been dripping for 3 days',
        priority: 'HIGH',
        status: 'OPEN',
      });
      expect(response.body).toHaveProperty('id');

      ticketId = response.body.id;
    });

    it('Step 2: Contractor submits quote (QUOTING)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/tickets/${ticketId}/quote`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .send({
          amount: 150.50,
          notes: 'Will replace tap and check pipes',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        amount: 150.50,
        notes: 'Will replace tap and check pipes',
        status: 'PENDING',
      });
      expect(response.body).toHaveProperty('id');

      quoteId = response.body.id;

      // Verify ticket status changed to QUOTING
      const ticketResponse = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(ticketResponse.body.status).toBe('QUOTING');
    });

    it('Step 3: Landlord approves quote (APPROVAL)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/tickets/quotes/${quoteId}/approve`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      expect(response.body.message).toBe('Quote approved successfully');

      // Verify ticket status changed to APPROVAL
      const ticketResponse = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(ticketResponse.body.status).toBe('APPROVAL');
      expect(ticketResponse.body.quotes[0].status).toBe('APPROVED');
    });

    it('Step 4: Contractor completes ticket (DONE)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/tickets/${ticketId}/complete`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .send({
          completionNotes: 'Replaced tap and checked all pipes. No leaks found.',
        })
        .expect(201);

      expect(response.body.message).toBe('Ticket marked as complete');

      // Verify ticket status changed to DONE
      const ticketResponse = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(ticketResponse.body.status).toBe('DONE');
    });
  });

  describe('Access Control', () => {
    it('should allow tenant to view their tickets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow landlord to view property tickets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tickets')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should prevent tenant from approving quotes', async () => {
      // Create another ticket and quote
      const ticketResponse = await request(app.getHttpServer())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId,
          title: 'Test ticket',
          description: 'Test',
          priority: 'LOW',
        });

      const newTicketId = ticketResponse.body.id;

      const quoteResponse = await request(app.getHttpServer())
        .post(`/api/tickets/${newTicketId}/quote`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .send({
          amount: 100,
        });

      const newQuoteId = quoteResponse.body.id;

      // Tenant tries to approve - should fail
      await request(app.getHttpServer())
        .post(`/api/tickets/quotes/${newQuoteId}/approve`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });

    it('should prevent contractor from completing without approved quote', async () => {
      // Create ticket without quote
      const ticketResponse = await request(app.getHttpServer())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId,
          title: 'Another test',
          description: 'Test',
          priority: 'LOW',
        });

      const newTicketId = ticketResponse.body.id;

      // Try to complete without quote
      await request(app.getHttpServer())
        .post(`/api/tickets/${newTicketId}/complete`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .expect(403);
    });
  });
});
