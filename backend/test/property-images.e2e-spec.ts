import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

describe('Property Images (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
  let tenantToken: string;
  let propertyId: string;
  let imageId: string;

  // Create a test image buffer (1x1 transparent PNG)
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

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
    await prisma.propertyImage.deleteMany({});
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
        email: 'images-landlord@example.com',
        password: 'password123',
        name: 'Images Landlord',
      });
    landlordToken = landlordResponse.body.accessToken;

    // Create tenant user
    const tenantResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'images-tenant@example.com',
        password: 'password123',
        name: 'Images Tenant',
      });
    tenantToken = tenantResponse.body.accessToken;

    // Create a property for testing
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        addressLine1: '123 Image Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
      });
    propertyId = propertyResponse.body.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('/api/properties/:propertyId/images (POST)', () => {
    it('should upload an image to a property', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .attach('file', testImageBuffer, 'test-image.png')
        .field('name', 'Test Image 1')
        .field('sortOrder', '0')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('url');
      expect(response.body.name).toBe('Test Image 1');
      expect(response.body.sortOrder).toBe(0);
      expect(response.body.propertyId).toBe(propertyId);

      imageId = response.body.id;
    });

    it('should reject upload without auth', async () => {
      await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/images`)
        .attach('file', testImageBuffer, 'test-image.png')
        .expect(401);
    });

    it('should reject upload from non-owner', async () => {
      await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .attach('file', testImageBuffer, 'test-image.png')
        .expect(404);
    });

    it('should reject upload without file', async () => {
      await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .field('name', 'No File')
        .expect(400);
    });

    it('should reject invalid file type', async () => {
      const textBuffer = Buffer.from('This is not an image');
      await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .attach('file', textBuffer, { filename: 'test.txt', contentType: 'text/plain' })
        .expect(400);
    });
  });

  describe('/api/properties/:propertyId/images (GET)', () => {
    it('should list all images for a property', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('url');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should reject list from non-owner', async () => {
      await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(404);
    });
  });

  describe('/api/properties/:propertyId/images/:imageId (PATCH)', () => {
    it('should update image metadata', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}/images/${imageId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          name: 'Updated Image Name',
          sortOrder: 5,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Image Name');
      expect(response.body.sortOrder).toBe(5);
    });

    it('should reject update from non-owner', async () => {
      await request(app.getHttpServer())
        .patch(`/api/properties/${propertyId}/images/${imageId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });
  });

  describe('/api/properties/:propertyId/images/:imageId (DELETE)', () => {
    it('should delete an image', async () => {
      await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}/images/${imageId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // Verify image is deleted
      const response = await request(app.getHttpServer())
        .get(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      const deletedImage = response.body.find((img: any) => img.id === imageId);
      expect(deletedImage).toBeUndefined();
    });

    it('should reject delete from non-owner', async () => {
      // First create an image to delete
      const createResponse = await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .attach('file', testImageBuffer, 'test-image.png')
        .field('name', 'To Delete');

      await request(app.getHttpServer())
        .delete(`/api/properties/${propertyId}/images/${createResponse.body.id}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(404);
    });
  });

  describe('Image count limit', () => {
    it('should enforce maximum images per property', async () => {
      // Try to upload 11 images (max is 10)
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post(`/api/properties/${propertyId}/images`)
          .set('Authorization', `Bearer ${landlordToken}`)
          .attach('file', testImageBuffer, 'test-image.png')
          .field('name', `Image ${i}`)
          .expect(201);
      }

      // 11th image should fail
      await request(app.getHttpServer())
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .attach('file', testImageBuffer, 'test-image.png')
        .field('name', 'Too Many')
        .expect(400);
    });
  });
});
