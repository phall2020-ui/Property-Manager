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
          addressLine1: '123 Test Street',
          address2: 'Apt 4B',
          city: 'London',
          postcode: 'SW1A 1AA',
          bedrooms: 2,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        addressLine1: '123 Test Street',
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
          addressLine1: '456 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          addressLine1: '789 Test Street',
          city: 'London',
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

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('addressLine1');
      expect(response.body.data[0]).toHaveProperty('ownerOrgId');
    });

    it('should return empty array for tenant (no properties)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
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
      expect(response.body.addressLine1).toBe('123 Test Street');
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

  describe('/api/properties/:id (PATCH)', () => {
    it('should update property as owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          addressLine1: '456 Updated Street',
          city: 'Manchester',
          postcode: 'M1 1AA',
          bedrooms: 3,
          attributes: {
            propertyType: 'Flat',
            furnished: 'Full',
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: propertyId,
        addressLine1: '456 Updated Street',
        city: 'Manchester',
        postcode: 'M1 1AA',
        bedrooms: 3,
        propertyType: 'Flat',
        furnished: 'Full',
      });
    });

    it('should reject update from non-owner', async () => {
      await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          addressLine1: 'Hacked Street',
        })
        .expect(404);
    });

    it('should validate postcode format', async () => {
      await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          postcode: 'INVALID',
        })
        .expect(400);
    });

    it('should return 404 for non-existent property', async () => {
      await request(app.getHttpServer())
        .patch('/api/properties/non-existent-id')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          city: 'London',
        })
        .expect(404);
    });

    it('should allow partial updates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          bedrooms: 4,
        })
        .expect(200);

      expect(response.body.bedrooms).toBe(4);
      // Other fields should remain unchanged
      expect(response.body.city).toBe('Manchester');
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
          addressLine1: '999 Other Street',
          postcode: 'W1A 1AA',
          city: 'London',
        });

      // Landlord 1 should not see landlord 2's property
      const landlord1Properties = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      const hasOtherProperty = landlord1Properties.body.data.some(
        (p: any) => p.addressLine1 === '999 Other Street',
      );
      expect(hasOtherProperty).toBe(false);

      // Landlord 2 should see their own property
      const landlord2Properties = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlord2Token}`)
        .expect(200);

      const hasOwnProperty = landlord2Properties.body.data.some(
        (p: any) => p.addressLine1 === '999 Other Street',
      );
      expect(hasOwnProperty).toBe(true);
    });
  });

  describe('/api/properties?search (GET)', () => {
    it('should search properties by address', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties?search=Updated')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].addressLine1).toContain('Updated');
    });

    it('should search properties by city', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties?search=Manchester')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].city).toBe('Manchester');
    });

    it('should filter properties by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties?type=Flat')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].propertyType).toBe('Flat');
      }
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties?page=1&pageSize=1')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should sort properties by address', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/properties?sort=addressLine1&order=asc')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 1) {
        expect(response.body.data[0].addressLine1.localeCompare(response.body.data[1].addressLine1)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('/api/properties/:id (DELETE)', () => {
    let deletePropertyId: string;

    beforeEach(async () => {
      // Create a property to delete
      const response = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          addressLine1: 'Delete Test Street',
          city: 'London',
          postcode: 'SW1A 2AA',
        });
      deletePropertyId = response.body.id;
    });

    it('should soft delete a property', async () => {
      await request(app.getHttpServer())
        .delete(`/api/properties/${deletePropertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // Property should not be in list
      const listResponse = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      const deleted = listResponse.body.data.find(
        (p: any) => p.id === deletePropertyId,
      );
      expect(deleted).toBeUndefined();

      // Property should return 404 on GET
      await request(app.getHttpServer())
        .get(`/api/properties/${deletePropertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);
    });

    it('should reject delete from non-owner', async () => {
      await request(app.getHttpServer())
        .delete(`/api/properties/${deletePropertyId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent property', async () => {
      await request(app.getHttpServer())
        .delete('/api/properties/non-existent-id')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);
    });
  });

  describe('/api/properties/:id/restore (POST)', () => {
    let restorePropertyId: string;

    beforeEach(async () => {
      // Create and delete a property
      const createResponse = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          addressLine1: 'Restore Test Street',
          city: 'London',
          postcode: 'SW1A 3AA',
        });
      restorePropertyId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/properties/${restorePropertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);
    });

    it('should restore a soft-deleted property', async () => {
      await request(app.getHttpServer())
        .post(`/api/properties/${restorePropertyId}/restore`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(201);

      // Property should be in list again
      const listResponse = await request(app.getHttpServer())
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      const restored = listResponse.body.data.find(
        (p: any) => p.id === restorePropertyId,
      );
      expect(restored).toBeDefined();
      expect(restored.addressLine1).toBe('Restore Test Street');
    });

    it('should reject restore from non-owner', async () => {
      await request(app.getHttpServer())
        .post(`/api/properties/${restorePropertyId}/restore`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(404);
    });
  });
});
