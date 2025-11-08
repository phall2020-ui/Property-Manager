import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';
import {
  SignupRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
  RefreshResponseSchema,
} from '../apps/api/src/schemas/auth.schemas';

describe('Auth Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await prisma.refreshToken.deleteMany({});
    await prisma.orgMembership.deleteMany({});
    await prisma.organisation.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should validate request schema', () => {
      const validRequest = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // Should not throw for valid request
      expect(() => SignupRequestSchema.parse(validRequest)).not.toThrow();

      // Should throw for invalid request
      const invalidRequest = {
        email: 'invalid-email',
        password: '12345', // too short
        name: '',
      };
      expect(() => SignupRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should return response matching schema', async () => {
      const signupData = {
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      // Validate response against schema
      const validationResult = AuthResponseSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match AuthResponseSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe(signupData.email);
    });

    it('should fail validation with missing required fields', async () => {
      const invalidData = {
        email: 'test@example.com',
        // missing password and name
      };

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Ensure we have a user to login with
      const signupData = {
        email: 'logintest@example.com',
        password: 'password123',
        name: 'Login Test User',
      };

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData);
    });

    it('should validate request schema', () => {
      const validRequest = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Should not throw for valid request
      expect(() => LoginRequestSchema.parse(validRequest)).not.toThrow();

      // Should throw for invalid request
      const invalidRequest = {
        email: 'invalid-email',
        password: '123', // too short
      };
      expect(() => LoginRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should return response matching schema', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Validate response against schema
      const validationResult = AuthResponseSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match AuthResponseSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return response matching schema', async () => {
      // First signup to get a refresh token
      const signupData = {
        email: 'refreshtest@example.com',
        password: 'password123',
        name: 'Refresh Test User',
      };

      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      // Extract cookies from signup response
      const cookies = signupResponse.headers['set-cookie'];

      // Call refresh with the refresh token cookie
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      // Validate response against schema
      const validationResult = RefreshResponseSchema.safeParse(response.body);
      
      if (!validationResult.success) {
        console.error('Schema validation failed:', validationResult.error);
        fail('Response does not match RefreshResponseSchema');
      }

      expect(validationResult.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
    });
  });

  describe('Schema Validation Examples - Failing Cases', () => {
    it('should demonstrate failing signup request validation', () => {
      const invalidCases = [
        {
          name: 'Invalid email format',
          data: { email: 'not-an-email', password: 'password123', name: 'Test' },
          expectedError: 'Invalid email',
        },
        {
          name: 'Password too short',
          data: { email: 'test@example.com', password: '12345', name: 'Test' },
          expectedError: 'String must contain at least 6 character(s)',
        },
        {
          name: 'Missing required field',
          data: { email: 'test@example.com', password: 'password123' },
          expectedError: 'Required',
        },
      ];

      invalidCases.forEach(({ name, data, expectedError }) => {
        const result = SignupRequestSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain(expectedError);
        }
      });
    });
  });
});
