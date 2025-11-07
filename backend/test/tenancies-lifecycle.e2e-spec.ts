import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../apps/api/src/app.module';
import { PrismaService } from '../apps/api/src/common/prisma/prisma.service';

describe('Tenancy Lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let landlordToken: string;
  let landlordToken2: string;
  let tenantToken: string;
  let propertyId: string;
  let tenantOrgId: string;
  let tenancyId: string;

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

    // Clean up test data in correct order
    await prisma.rentRevision.deleteMany({});
    await prisma.guarantor.deleteMany({});
    await prisma.breakClause.deleteMany({});
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
    const landlordResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'tenancy-landlord@example.com',
        password: 'password123',
        name: 'Tenancy Landlord',
      });
    landlordToken = landlordResponse.body.accessToken;

    // Create landlord 2 (for cross-tenant tests)
    const landlordResponse2 = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'tenancy-landlord2@example.com',
        password: 'password123',
        name: 'Tenancy Landlord 2',
      });
    landlordToken2 = landlordResponse2.body.accessToken;

    // Create tenant
    const tenantResponse = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'tenancy-tenant@example.com',
        password: 'password123',
        name: 'Tenancy Tenant',
      });
    tenantToken = tenantResponse.body.accessToken;

    // Get tenant org ID
    const tenantOrgs = await prisma.orgMember.findMany({
      where: {
        user: {
          email: 'tenancy-tenant@example.com',
        },
      },
      include: {
        org: true,
      },
    });
    tenantOrgId = tenantOrgs[0].orgId;

    // Create a property
    const propertyResponse = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        addressLine1: '123 Tenancy Test St',
        city: 'London',
        postcode: 'SW1A 1AA',
        bedrooms: 2,
      });
    propertyId = propertyResponse.body.id;

    // Create an initial tenancy
    const tenancyResponse = await request(app.getHttpServer())
      .post('/api/tenancies')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyId,
        tenantOrgId,
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        rentPcm: 1200,
        deposit: 1200,
      });
    tenancyId = tenancyResponse.body.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 10000);

  describe('Workflow A: Update rent → Renew → Verify statuses', () => {
    it('should update rent and create rent revision', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          rentPcm: 1300,
        })
        .expect(200);

      expect(response.body.rentPcm).toBe(1300);
      expect(response.body.rent).toBe(1300);

      // Verify rent revision was created
      const tenancy = await prisma.tenancy.findUnique({
        where: { id: tenancyId },
        include: { rentRevisions: true },
      });
      expect(tenancy.rentRevisions.length).toBeGreaterThan(0);
      expect(tenancy.rentRevisions[0].rentPcm).toBe(1300);
    });

    it('should renew tenancy and set old to ENDED', async () => {
      const renewResponse = await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/renew`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          startDate: '2026-01-02',
          endDate: '2027-01-01',
          rentPcm: 1350,
          deposit: 1350,
        })
        .expect(201);

      expect(renewResponse.body).toMatchObject({
        rentPcm: 1350,
        deposit: 1350,
        renewalOfId: tenancyId,
      });
      expect(renewResponse.body.id).not.toBe(tenancyId);
      expect(renewResponse.body.status).toMatch(/SCHEDULED|ACTIVE/);

      // Verify old tenancy may be updated to ENDED if past end date
      // (In our test, 2026-01-01 is in the future, so it won't be ENDED yet)
    });
  });

  describe('Workflow B: Break clause → Early terminate → After break terminate', () => {
    let breakClauseTenancyId: string;

    it('should create tenancy with break clause', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tenancies')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          tenantOrgId,
          startDate: '2025-03-01',
          endDate: '2027-03-01',
          rentPcm: 1400,
          deposit: 1400,
        })
        .expect(201);

      breakClauseTenancyId = response.body.id;

      // Add break clause
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/tenancies/${breakClauseTenancyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          breakClause: {
            earliestBreakDate: '2026-03-01',
            noticeMonths: 2,
            notes: 'Standard 2-month break clause',
          },
        })
        .expect(200);

      expect(updateResponse.body).toBeDefined();

      // Verify break clause was created
      const tenancy = await prisma.tenancy.findUnique({
        where: { id: breakClauseTenancyId },
        include: { breakClause: true },
      });
      expect(tenancy.breakClause).toBeDefined();
      expect(tenancy.breakClause.noticeMonths).toBe(2);
    });

    it('should reject early termination before break clause date', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenancies/${breakClauseTenancyId}/terminate`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          reason: 'Early termination attempt',
          terminatedAt: '2025-12-01', // Before earliest break date
        })
        .expect(409);
    });

    it('should allow termination after break clause date', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/tenancies/${breakClauseTenancyId}/terminate`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          reason: 'Tenant requested early termination',
          terminatedAt: '2026-04-01', // After earliest break date
        })
        .expect(200);

      expect(response.body.status).toBe('TERMINATED');
      expect(response.body.terminationReason).toBe('Tenant requested early termination');
      expect(response.body.terminatedAt).toBeDefined();
    });
  });

  describe('Workflow C: Upload tenancy agreement document', () => {
    it('should upload a document to tenancy', async () => {
      // Create a simple text file buffer
      const fileContent = Buffer.from('This is a test tenancy agreement');

      const response = await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/documents`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .attach('file', fileContent, 'tenancy-agreement.txt')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tenancyId).toBe(tenancyId);
      expect(response.body.filename).toBe('tenancy-agreement.txt');

      // Verify document appears in tenancy
      const tenancyWithDocs = await request(app.getHttpServer())
        .get(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(tenancyWithDocs.body.documents).toBeDefined();
      expect(tenancyWithDocs.body.documents.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow D: Guarantor management', () => {
    it('should add guarantor to tenancy', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/guarantors`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          name: 'John Guarantor',
          email: 'john.guarantor@example.com',
          phone: '07700900123',
          notes: 'Parent guarantor',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'John Guarantor',
        email: 'john.guarantor@example.com',
        phone: '07700900123',
      });
      expect(response.body).toHaveProperty('id');

      // Verify guarantor appears in tenancy
      const tenancyWithGuarantors = await request(app.getHttpServer())
        .get(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(tenancyWithGuarantors.body.guarantors).toBeDefined();
      expect(tenancyWithGuarantors.body.guarantors.length).toBeGreaterThan(0);
      expect(tenancyWithGuarantors.body.guarantors[0].name).toBe('John Guarantor');
    });

    it('should remove guarantor', async () => {
      // Get guarantor ID
      const tenancy = await prisma.tenancy.findUnique({
        where: { id: tenancyId },
        include: { guarantors: true },
      });
      const guarantorId = tenancy.guarantors[0].id;

      await request(app.getHttpServer())
        .delete(`/api/tenancies/guarantors/${guarantorId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      // Verify guarantor was removed
      const updatedTenancy = await prisma.tenancy.findUnique({
        where: { id: tenancyId },
        include: { guarantors: true },
      });
      expect(updatedTenancy.guarantors.length).toBe(0);
    });
  });

  describe('Workflow E: Rent increase tracking', () => {
    it('should apply rent increase with future effective date', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/rent-increase`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          effectiveFrom: '2025-07-01',
          newRentPcm: 1400,
          reason: 'Annual rent review',
        })
        .expect(201);

      expect(response.body).toBeDefined();

      // Verify rent revision was created
      const tenancy = await prisma.tenancy.findUnique({
        where: { id: tenancyId },
        include: {
          rentRevisions: {
            orderBy: { effectiveFrom: 'desc' },
          },
        },
      });

      const latestRevision = tenancy.rentRevisions[0];
      expect(latestRevision.rentPcm).toBe(1400);
      expect(latestRevision.reason).toBe('Annual rent review');
    });

    it('should show rent increase history on tenancy detail', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.rentRevisions).toBeDefined();
      expect(response.body.rentRevisions.length).toBeGreaterThanOrEqual(2); // One from update, one from rent increase
    });
  });

  describe('Workflow F: Payment tracking (read-only)', () => {
    it('should get tenancy payments', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tenancies/${tenancyId}/payments`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Mock data should be returned
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('amount');
        expect(response.body[0]).toHaveProperty('status');
      }
    });

    it('should allow tenant to view their own tenancy payments', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tenancies/${tenancyId}/payments`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Cross-tenant isolation', () => {
    it('should prevent landlord2 from accessing landlord1 tenancy', async () => {
      await request(app.getHttpServer())
        .get(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${landlordToken2}`)
        .expect(403);
    });

    it('should prevent landlord2 from updating landlord1 tenancy', async () => {
      await request(app.getHttpServer())
        .patch(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${landlordToken2}`)
        .send({
          rentPcm: 2000,
        })
        .expect(403);
    });

    it('should prevent landlord2 from terminating landlord1 tenancy', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/terminate`)
        .set('Authorization', `Bearer ${landlordToken2}`)
        .send({
          reason: 'Unauthorized termination attempt',
        })
        .expect(403);
    });
  });

  describe('RBAC enforcement', () => {
    it('should allow tenant to read their own tenancy', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(response.body.id).toBe(tenancyId);
    });

    it('should prevent tenant from updating tenancy', async () => {
      await request(app.getHttpServer())
        .patch(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          rentPcm: 1500,
        })
        .expect(403);
    });

    it('should prevent tenant from terminating tenancy', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/terminate`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          reason: 'Tenant termination attempt',
        })
        .expect(403);
    });

    it('should prevent tenant from renewing tenancy', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/renew`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          startDate: '2026-01-02',
          endDate: '2027-01-01',
          rentPcm: 1400,
        })
        .expect(403);
    });
  });

  describe('Validation tests', () => {
    it('should reject update with invalid date range', async () => {
      await request(app.getHttpServer())
        .patch(`/api/tenancies/${tenancyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          startDate: '2026-01-01',
          endDate: '2025-01-01', // End before start
        })
        .expect(400);
    });

    it('should reject renew with overlapping dates', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/renew`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          startDate: '2025-06-01', // Before old tenancy ends
          endDate: '2026-06-01',
          rentPcm: 1400,
        })
        .expect(400);
    });

    it('should reject rent increase with negative amount', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/rent-increase`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          effectiveFrom: '2026-01-01',
          newRentPcm: -100,
        })
        .expect(400);
    });

    it('should reject guarantor with invalid email', async () => {
      await request(app.getHttpServer())
        .post(`/api/tenancies/${tenancyId}/guarantors`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          name: 'Invalid Guarantor',
          email: 'not-an-email',
        })
        .expect(400);
    });

    it('should reject terminate without reason', async () => {
      const newTenancyResponse = await request(app.getHttpServer())
        .post('/api/tenancies')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          tenantOrgId,
          startDate: '2025-06-01',
          endDate: '2026-06-01',
          rentPcm: 1100,
          deposit: 1100,
        });

      await request(app.getHttpServer())
        .post(`/api/tenancies/${newTenancyResponse.body.id}/terminate`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          // Missing reason
        })
        .expect(400);
    });
  });
});
