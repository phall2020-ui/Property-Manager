import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

describe('Properties (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
  let tenantToken: string;
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

    // Create landlord user
    const landlordResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'property-landlord@example.com',
        password: 'password123',
        name: 'Property Landlord',
      });
    landlordToken = landlordResponse.body.accessToken;

    // Create tenant user
    const tenantResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'property-tenant@example.com',
        password: 'password123',
        name: 'Property Tenant',
      });
    tenantToken = tenantResponse.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('/api/properties (POST)', () => {
    it('should create a property as landlord', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          address1: '123 Test Street',
          address2: 'Apt 4B',
          city: 'London',
          postcode: 'SW1A 1AA',
          bedrooms: 2,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        address1: '123 Test Street',
        address2: 'Apt 4B',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('ownerOrgId');

      propertyId = response.body.id;
    });

    it('should reject property creation without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/properties')
        .send({
          address1: '456 Test Street',
          postcode: 'SW1A 1AA',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          address1: '789 Test Street',
          // missing postcode
        })
        .expect(400);
    });
  });

  describe('/api/properties (GET)', () => {
    it('should list properties for landlord', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('address1');
      expect(response.body[0]).toHaveProperty('ownerOrgId');
    });

    it('should return empty array for tenant (no properties)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/properties')
        .expect(401);
    });
  });

  describe('/api/properties/:id (GET)', () => {
    it('should get property by id for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.id).toBe(propertyId);
      expect(response.body.address1).toBe('123 Test Street');
    });

    it('should reject access to property from different org', async () => {
      await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent property', async () => {
      await request(app.getHttpServer())
        .get('/api/properties/non-existent-id')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);
    });
  });

  describe('Org-based isolation', () => {
    it('should only show properties from user org', async () => {
      // Create another landlord
      const landlord2Response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: 'landlord2@example.com',
          password: 'password123',
          name: 'Landlord Two',
        });
      const landlord2Token = landlord2Response.body.accessToken;

      // Create property for landlord2
      await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlord2Token}`)
        .send({
          address1: '999 Other Street',
          postcode: 'W1A 1AA',
        });

      // Landlord 1 should not see landlord 2's property
      const landlord1Properties = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      const hasOtherProperty = landlord1Properties.body.some(
        (p: any) => p.address1 === '999 Other Street',
      );
      expect(hasOtherProperty).toBe(false);

      // Landlord 2 should see their own property
      const landlord2Properties = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlord2Token}`)
        .expect(200);

      const hasOwnProperty = landlord2Properties.body.some(
        (p: any) => p.address1 === '999 Other Street',
      );
      expect(hasOwnProperty).toBe(true);
    });
  });
});
