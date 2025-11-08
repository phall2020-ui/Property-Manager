import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';
import {
  CreateTicketRequestSchema,
  UpdateTicketStatusRequestSchema,
  TicketSchema,
  TicketListResponseSchema,
} from '../apps/api/src/schemas/tickets.schemas';

describe('Tickets Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
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
    await prisma.ticket.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.orgMembership.deleteMany({});
    await prisma.organisation.deleteMany({});
    await prisma.user.deleteMany({});

    // Create landlord user
    const landlordSignup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'landlord-ticket@example.com',
        password: 'password123',
        name: 'Ticket Test Landlord',
      });

    landlordToken = landlordSignup.body.accessToken;

    // Set up landlord org
    const user = await prisma.user.findUnique({
      where: { email: 'landlord-ticket@example.com' },
    });

    const org = await prisma.organisation.create({
      data: {
        name: 'Ticket Test Landlord Org',
        type: 'LANDLORD',
      },
    });

    await prisma.orgMembership.create({
      data: {
        userId: user!.id,
        orgId: org.id,
        role: 'LANDLORD',
      },
    });

    // Create a property for tickets
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        addressLine1: 'Test Property for Tickets',
        city: 'London',
        postcode: 'SW1A 1AA',
      });

    propertyId = propertyResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/tickets', () => {
    it('should validate request schema', () => {
      const validRequest = {
        title: 'Leaking Tap',
        description: 'The kitchen tap is leaking',
        priority: 'MEDIUM' as const,
        propertyId: 'some-property-id',
      };

      // Should not throw for valid request
      expect(() => CreateTicketRequestSchema.parse(validRequest)).not.toThrow();

      // Should throw for invalid request
      const invalidRequest = {
        title: '', // empty
        description: '',
        priority: 'INVALID_PRIORITY', // invalid enum
      };
      expect(() => CreateTicketRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should return response matching schema', async () => {
      const ticketData = {
        title: 'Broken Window',
        description: 'Window in bedroom is broken',
        priority: 'HIGH',
        propertyId: propertyId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(ticketData)
        .expect(201);

      // Validate response against schema
      const validationResult = TicketSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match TicketSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.title).toBe(ticketData.title);
      ticketId = response.body.id;
    });

    it('should fail validation with missing required fields', async () => {
      const invalidData = {
        // missing title
        description: 'Test description',
        priority: 'LOW',
      };

      await request(app.getHttpServer())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/tickets', () => {
    it('should return response matching schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tickets')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // Validate response against schema
      const validationResult = TicketListResponseSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match TicketListResponseSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/tickets/:id', () => {
    it('should return response matching schema', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // Validate response against schema
      const validationResult = TicketSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match TicketSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.id).toBe(ticketId);
    });
  });

  describe('PATCH /api/tickets/:id/status', () => {
    it('should validate request schema', () => {
      const validRequest = {
        to: 'IN_PROGRESS',
      };

      // Should not throw for valid request
      expect(() => UpdateTicketStatusRequestSchema.parse(validRequest)).not.toThrow();

      // Should throw for invalid request (missing 'to')
      const invalidRequest = {};
      expect(() => UpdateTicketStatusRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should return response matching schema', async () => {
      const statusData = {
        to: 'IN_PROGRESS',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(statusData)
        .expect(200);

      // Validate response against schema
      const validationResult = TicketSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match TicketSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.status).toBe(statusData.to);
    });
  });

  describe('Schema Validation Examples - Failing Cases', () => {
    it('should demonstrate failing ticket request validation', () => {
      const invalidCases = [
        {
          name: 'Empty title',
          data: { title: '', description: 'Test', priority: 'LOW' },
          expectedError: 'String must contain at least 1 character(s)',
        },
        {
          name: 'Invalid priority',
          data: { title: 'Test', description: 'Test', priority: 'INVALID' },
          expectedError: 'Invalid enum value',
        },
        {
          name: 'Missing description',
          data: { title: 'Test', priority: 'LOW' },
          expectedError: 'Required',
        },
      ];

      invalidCases.forEach(({ name, data, expectedError }) => {
        const result = CreateTicketRequestSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain(expectedError);
        }
      });
    });
  });
});
