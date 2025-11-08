import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

/**
 * E2E tests for tenant isolation using LandlordResourceGuard
 * 
 * These tests verify that:
 * 1. Landlords can access their own properties
 * 2. Landlords receive 404 (not 403) when accessing another landlord's property
 * 3. The guard prevents information disclosure about resource existence
 */
describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlord1Token: string;
  let landlord2Token: string;
  let landlord1PropertyId: string;
  let landlord2PropertyId: string;
  let landlord1OrgId: string;
  let landlord2OrgId: string;

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

    // Create landlord 1
    const landlord1Response = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'landlord1@example.com',
        password: 'password123',
        name: 'Landlord One',
      });
    landlord1Token = landlord1Response.body.accessToken;

    // Create landlord 2
    const landlord2Response = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'landlord2@example.com',
        password: 'password123',
        name: 'Landlord Two',
      });
    landlord2Token = landlord2Response.body.accessToken;

    // Get landlord 1 org ID
    const landlord1User = await prisma.user.findUnique({
      where: { email: 'landlord1@example.com' },
      include: { orgMemberships: true },
    });
    landlord1OrgId = landlord1User.orgMemberships[0].orgId;

    // Get landlord 2 org ID
    const landlord2User = await prisma.user.findUnique({
      where: { email: 'landlord2@example.com' },
      include: { orgMemberships: true },
    });
    landlord2OrgId = landlord2User.orgMemberships[0].orgId;

    // Create property for landlord 1
    const property1Response = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlord1Token}`)
      .send({
        addressLine1: '123 Landlord One Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        propertyType: 'APARTMENT',
        bedrooms: 2,
        bathrooms: 1,
      });
    landlord1PropertyId = property1Response.body.id;

    // Create property for landlord 2
    const property2Response = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlord2Token}`)
      .send({
        addressLine1: '456 Landlord Two Street',
        city: 'Manchester',
        postcode: 'M1 1AA',
        propertyType: 'HOUSE',
        bedrooms: 3,
        bathrooms: 2,
      });
    landlord2PropertyId = property2Response.body.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('GET /api/properties/:id (Tenant Isolation)', () => {
    it('should allow landlord 1 to access their own property', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${landlord1PropertyId}`)
        .set('Authorization', `Bearer ${landlord1Token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: landlord1PropertyId,
        addressLine1: '123 Landlord One Street',
        ownerOrgId: landlord1OrgId,
      });
    });

    it('should allow landlord 2 to access their own property', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${landlord2PropertyId}`)
        .set('Authorization', `Bearer ${landlord2Token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: landlord2PropertyId,
        addressLine1: '456 Landlord Two Street',
        ownerOrgId: landlord2OrgId,
      });
    });

    it('should return 404 when landlord 1 tries to access landlord 2 property (resource hiding)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${landlord2PropertyId}`)
        .set('Authorization', `Bearer ${landlord1Token}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Property not found',
      });
    });

    it('should return 404 when landlord 2 tries to access landlord 1 property (resource hiding)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${landlord1PropertyId}`)
        .set('Authorization', `Bearer ${landlord2Token}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Property not found',
      });
    });

    it('should return 404 for non-existent property', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${landlord1Token}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Property not found',
      });
    });
  });

  describe('PATCH /api/properties/:id (Tenant Isolation)', () => {
    it('should allow landlord 1 to update their own property', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${landlord1PropertyId}`)
        .set('Authorization', `Bearer ${landlord1Token}`)
        .send({
          addressLine2: 'Updated Apt 5',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: landlord1PropertyId,
        addressLine2: 'Updated Apt 5',
      });
    });

    it('should return 404 when landlord 1 tries to update landlord 2 property', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${landlord2PropertyId}`)
        .set('Authorization', `Bearer ${landlord1Token}`)
        .send({
          addressLine2: 'Malicious Update',
        })
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Property not found',
      });

      // Verify property was not updated
      const property = await prisma.property.findUnique({
        where: { id: landlord2PropertyId },
      });
      expect(property.address2).not.toBe('Malicious Update');
    });
  });

  describe('DELETE /api/properties/:id (Tenant Isolation)', () => {
    it('should return 404 when landlord 1 tries to delete landlord 2 property', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/properties/${landlord2PropertyId}`)
        .set('Authorization', `Bearer ${landlord1Token}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Property not found',
      });

      // Verify property was not deleted
      const property = await prisma.property.findUnique({
        where: { id: landlord2PropertyId },
      });
      expect(property).toBeDefined();
      expect(property.deletedAt).toBeNull();
    });

    it('should allow landlord 2 to delete their own property', async () => {
      await request(app.getHttpServer())
        .delete(`/api/properties/${landlord2PropertyId}`)
        .set('Authorization', `Bearer ${landlord2Token}`)
        .expect(200);

      // Verify property was soft deleted
      const property = await prisma.property.findUnique({
        where: { id: landlord2PropertyId },
      });
      expect(property.deletedAt).not.toBeNull();
    });
  });

  describe('POST /api/properties/:id/restore (Tenant Isolation)', () => {
    it('should return 404 when landlord 1 tries to restore landlord 2 property', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${landlord2PropertyId}/restore`)
        .set('Authorization', `Bearer ${landlord1Token}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Property not found',
      });
    });

    it('should allow landlord 2 to restore their own property', async () => {
      await request(app.getHttpServer())
        .post(`/api/properties/${landlord2PropertyId}/restore`)
        .set('Authorization', `Bearer ${landlord2Token}`)
        .expect(200);

      // Verify property was restored
      const property = await prisma.property.findUnique({
        where: { id: landlord2PropertyId },
      });
      expect(property.deletedAt).toBeNull();
    });
  });
});
