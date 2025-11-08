import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';
import {
  CreatePropertyRequestSchema,
  UpdatePropertyRequestSchema,
  PropertySchema,
  PropertyListResponseSchema,
} from '../apps/api/src/schemas/properties.schemas';

describe('Properties Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
  let propertyId: string;

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
    await prisma.property.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.orgMembership.deleteMany({});
    await prisma.organisation.deleteMany({});
    await prisma.user.deleteMany({});

    // Create landlord user
    const landlordSignup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'landlord@example.com',
        password: 'password123',
        name: 'Test Landlord',
      });

    landlordToken = landlordSignup.body.accessToken;

    // Update user to be landlord
    const user = await prisma.user.findUnique({
      where: { email: 'landlord@example.com' },
    });

    const org = await prisma.organisation.create({
      data: {
        name: 'Test Landlord Org',
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/properties', () => {
    it('should validate request schema', () => {
      const validRequest = {
        addressLine1: '123 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
      };

      // Should not throw for valid request
      expect(() => CreatePropertyRequestSchema.parse(validRequest)).not.toThrow();

      // Should throw for invalid request
      const invalidRequest = {
        addressLine1: '', // empty string
        city: 'London',
        postcode: '', // empty
        bedrooms: -1, // negative
      };
      expect(() => CreatePropertyRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should return response matching schema', async () => {
      const propertyData = {
        addressLine1: '456 Test Avenue',
        city: 'Manchester',
        postcode: 'M1 1AA',
        bedrooms: 3,
      };

      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(propertyData)
        .expect(201);

      // Validate response against schema
      const validationResult = PropertySchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match PropertySchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.addressLine1).toBe(propertyData.addressLine1);
      propertyId = response.body.id;
    });

    it('should fail validation with invalid data', async () => {
      const invalidData = {
        addressLine1: '', // empty
        city: 'London',
        postcode: 'SW1A 1AA',
      };

      await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/properties', () => {
    it('should return response matching schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // Validate response against schema
      const validationResult = PropertyListResponseSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match PropertyListResponseSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return response matching schema', async () => {
      // First create a property
      const propertyData = {
        addressLine1: '789 Schema Test Road',
        city: 'Birmingham',
        postcode: 'B1 1AA',
        bedrooms: 2,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(propertyData);

      const createdPropertyId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/api/properties/${createdPropertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // Validate response against schema
      const validationResult = PropertySchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match PropertySchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.id).toBe(createdPropertyId);
    });
  });

  describe('PATCH /api/properties/:id', () => {
    it('should validate request schema', () => {
      const validRequest = {
        bedrooms: 4,
        city: 'Updated City',
      };

      // Should not throw for valid request
      expect(() => UpdatePropertyRequestSchema.parse(validRequest)).not.toThrow();

      // Should throw for invalid request
      const invalidRequest = {
        bedrooms: -5, // negative
      };
      expect(() => UpdatePropertyRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should return response matching schema', async () => {
      const updateData = {
        bedrooms: 4,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(updateData)
        .expect(200);

      // Validate response against schema
      const validationResult = PropertySchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match PropertySchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.bedrooms).toBe(4);
    });
  });

  describe('Schema Validation Examples - Failing Cases', () => {
    it('should demonstrate failing property request validation', () => {
      const invalidCases = [
        {
          name: 'Empty address line',
          data: { addressLine1: '', city: 'London', postcode: 'SW1A 1AA' },
          expectedError: 'String must contain at least 1 character(s)',
        },
        {
          name: 'Negative bedrooms',
          data: { addressLine1: '123 Test St', city: 'London', postcode: 'SW1A 1AA', bedrooms: -1 },
          expectedError: 'Number must be greater than or equal to 0',
        },
        {
          name: 'Missing required fields',
          data: { addressLine1: '123 Test St' },
          expectedError: 'Required',
        },
      ];

      invalidCases.forEach(({ name, data, expectedError }) => {
        const result = CreatePropertyRequestSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain(expectedError);
        }
      });
    });
  });
});
