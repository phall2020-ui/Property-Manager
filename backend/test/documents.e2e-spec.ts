import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

describe('Documents API (e2e)', () => {
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
    await prisma.ticketAttachment.deleteMany({});
    await prisma.propertyDocument.deleteMany({});
    await prisma.tenancyDocument.deleteMany({});
    await prisma.quote.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.tenancy.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.orgMember.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.org.deleteMany({});

    // Create landlord user
    const landlordResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'docs-landlord@example.com',
        password: 'password123',
        name: 'Docs Landlord',
      });
    landlordToken = landlordResponse.body.accessToken;

    // Create a property
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        address: '123 Test St',
        postcode: 'TE1 5ST',
        monthlyRent: 1500,
        bedrooms: 2,
      });
    propertyId = propertyResponse.body.id;

    // Create a ticket
    const ticketResponse = await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyId,
        title: 'Test Ticket',
        description: 'Test ticket for document upload',
        priority: 'MEDIUM',
        category: 'MAINTENANCE',
      });
    ticketId = ticketResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/attachments/sign', () => {
    it('should generate a presigned URL for valid content type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/attachments/sign')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          contentType: 'application/pdf',
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('expiresIn', 300);
      expect(response.body).toHaveProperty('maxSize');
      expect(response.body.key).toMatch(/^uploads\//);
    });

    it('should reject invalid content type with 422', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/attachments/sign')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          contentType: 'application/exe',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('contentType');
    });

    it('should reject oversized file with 422', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/attachments/sign')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          contentType: 'application/pdf',
          maxSize: 100000000, // 100MB
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/attachments/sign')
        .send({
          contentType: 'application/pdf',
        })
        .expect(401);
    });

    it('should accept custom max size within limits', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/attachments/sign')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          contentType: 'image/jpeg',
          maxSize: 5242880, // 5MB
        })
        .expect(200);

      expect(response.body.maxSize).toBe(5242880);
    });
  });

  describe('POST /api/documents', () => {
    it('should create a property document', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test-123.pdf',
          contentType: 'application/pdf',
          size: 524288,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('propertyId', propertyId);
      expect(response.body).toHaveProperty('filename', 'certificate.pdf');
      expect(response.body).toHaveProperty('docType', 'EPC');
    });

    it('should create a ticket attachment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          ticketId,
          docType: 'Photo',
          filename: 'issue-photo.jpg',
          storageKey: 'uploads/ticket-456.jpg',
          contentType: 'image/jpeg',
          size: 102400,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('ticketId', ticketId);
      expect(response.body).toHaveProperty('filename', 'issue-photo.jpg');
    });

    it('should reject when no resource type is specified', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('resource');
    });

    it('should reject when multiple resource types are specified', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          ticketId,
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/documents')
        .send({
          propertyId,
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        })
        .expect(401);
    });

    it('should reject non-existent property', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId: '00000000-0000-0000-0000-000000000000',
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should support legacy ownerType/ownerId format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          ownerType: 'property',
          ownerId: propertyId,
          docType: 'Insurance',
          filename: 'insurance.pdf',
          storageKey: 'uploads/insurance-789.pdf',
          contentType: 'application/pdf',
          size: 256000,
          url: 'https://example.com/insurance.pdf',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('propertyId', propertyId);
    });
  });

  describe('Double-slash route normalization', () => {
    it('should redirect /api//attachments/sign to /api/attachments/sign', async () => {
      const response = await request(app.getHttpServer())
        .post('/api//attachments/sign')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          contentType: 'application/pdf',
        });

      // Should either redirect (301) or work directly
      expect([200, 301]).toContain(response.status);
    });

    it('should redirect /api//documents to /api/documents', async () => {
      const response = await request(app.getHttpServer())
        .post('/api//documents')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        });

      // Should either redirect (301) or work directly
      expect([200, 201, 301]).toContain(response.status);
    });
  });
});
