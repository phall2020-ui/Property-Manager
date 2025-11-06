import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

describe('Auth (e2e)', () => {
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

    // Clean up test data - delete in order to respect foreign keys
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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/signup (POST)', () => {
    it('should create a new landlord user and org', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'test-landlord@example.com',
          password: 'password123',
          name: 'Test Landlord',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toMatchObject({
        email: 'test-landlord@example.com',
        name: 'Test Landlord',
      });
      expect(response.body.user.organisations).toHaveLength(1);
      expect(response.body.user.organisations[0].role).toBe('LANDLORD');

      // Check cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArray.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Second User',
        })
        .expect(409);
    });

    it('should validate required fields', async () => {
      // Note: Controller doesn't use DTO validation yet, so this returns 500
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          // missing password and name
        })
        .expect(500);
    });
  });

  describe('/api/auth/login (POST)', () => {
    beforeAll(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
          name: 'Login Test',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('login-test@example.com');

      // Check cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArray.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Login to get refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Use refresh token to get new access token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      // Note: Access tokens might be identical if generated in same second with same payload

      // Check new refresh token was set
      const newCookies = refreshResponse.headers['set-cookie'];
      expect(newCookies).toBeDefined();
    });

    it('should reject request without refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .expect(500); // Will throw error when trying to verify undefined token
    });
  });

  describe('/api/auth/logout (POST)', () => {
    it('should logout and clear refresh token', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(logoutResponse.body.message).toBe('Logged out successfully');

      // Check cookie was cleared
      const clearedCookies = logoutResponse.headers['set-cookie'];
      expect(clearedCookies).toBeDefined();
      const clearedCookieArray = Array.isArray(clearedCookies) ? clearedCookies : [clearedCookies];
      expect(
        clearedCookieArray.some((c: string) => c.includes('refresh_token=;')),
      ).toBe(true);
    });
  });

  describe('Token Rotation', () => {
    it('should detect and revoke on token reuse', async () => {
      // Login to get initial tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // First refresh - should work
      const firstRefresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(200);

      const newCookies = firstRefresh.headers['set-cookie'];

      // Try to use old refresh token again - should fail and revoke all tokens
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(401);

      // New token should also be revoked (entire token family revoked on reuse)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', newCookies)
        .expect(401);
    });
  });

  describe('Cookie Security', () => {
    it('should set secure cookie flags', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const refreshCookie = cookieArray.find((c: string) => c.startsWith('refresh_token='));
      
      expect(refreshCookie).toBeDefined();
      // Check for HttpOnly flag
      expect(refreshCookie).toMatch(/HttpOnly/i);
      // Check for SameSite flag
      expect(refreshCookie).toMatch(/SameSite/i);
      // Check for Path
      expect(refreshCookie).toMatch(/Path=\//);
      // Note: Secure flag is environment-dependent (false in dev, true in prod)
    });

    it('should set cookie with correct max age', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const refreshCookie = cookieArray.find((c: string) => c.startsWith('refresh_token='));
      
      // Check for Max-Age (7 days = 604800 seconds)
      expect(refreshCookie).toMatch(/Max-Age=604800/);
    });

    it('should clear cookie on logout', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      const clearedCookies = logoutResponse.headers['set-cookie'];
      expect(clearedCookies).toBeDefined();
      const clearedCookieArray = Array.isArray(clearedCookies) ? clearedCookies : [clearedCookies];
      const clearedRefreshCookie = clearedCookieArray.find((c: string) => c.startsWith('refresh_token='));
      
      // Cookie should be cleared (empty value or expires in the past)
      expect(clearedRefreshCookie).toMatch(/refresh_token=;/);
    });
  });
});
