import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Test fixtures for database models
 * These fixtures can be used in tests to create consistent test data
 */

export const DbFixtures = {
  /**
   * Create a test organization
   */
  async createOrg(data?: Partial<{ name: string; type: string }>) {
    return prisma.org.create({
      data: {
        name: data?.name || 'Test Organization',
        type: data?.type || 'LANDLORD',
      },
    });
  },

  /**
   * Create a test user with organization membership
   */
  async createUser(data?: Partial<{
    email: string;
    name: string;
    password: string;
    orgId: string;
    role: string;
  }>) {
    const org = data?.orgId
      ? await prisma.org.findUnique({ where: { id: data.orgId } })
      : await DbFixtures.createOrg();

    const passwordHash = await bcrypt.hash(data?.password || 'password123', 10);

    return prisma.user.create({
      data: {
        email: data?.email || `test-${Date.now()}@example.com`,
        name: data?.name || 'Test User',
        passwordHash,
        orgMemberships: {
          create: {
            orgId: org!.id,
            role: data?.role || 'LANDLORD',
          },
        },
      },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });
  },

  /**
   * Create a test property
   */
  async createProperty(data?: Partial<{
    address1: string;
    address2: string;
    city: string;
    postcode: string;
    bedrooms: number;
    ownerOrgId: string;
  }>) {
    const orgId = data?.ownerOrgId || (await DbFixtures.createOrg()).id;

    return prisma.property.create({
      data: {
        address1: data?.address1 || '123 Test Street',
        address2: data?.address2 || null,
        city: data?.city || 'London',
        postcode: data?.postcode || 'SW1A 1AA',
        bedrooms: data?.bedrooms || 2,
        ownerOrgId: orgId,
      },
    });
  },

  /**
   * Create a test tenancy
   */
  async createTenancy(data?: Partial<{
    propertyId: string;
    tenantOrgId: string;
    startDate: Date;
    endDate: Date;
    rentPcm: number;
    deposit: number;
    status: string;
  }>) {
    const propertyId = data?.propertyId || (await DbFixtures.createProperty()).id;
    const tenantOrgId = data?.tenantOrgId || (await DbFixtures.createOrg({ type: 'TENANT' })).id;

    return prisma.tenancy.create({
      data: {
        propertyId,
        tenantOrgId,
        startDate: data?.startDate || new Date(),
        endDate: data?.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        rentPcm: data?.rentPcm || 1500,
        deposit: data?.deposit || 3000,
        status: data?.status || 'ACTIVE',
      },
    });
  },

  /**
   * Create a test ticket
   */
  async createTicket(data?: Partial<{
    propertyId: string;
    tenancyId: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    createdById: string;
  }>) {
    const propertyId = data?.propertyId || (await DbFixtures.createProperty()).id;
    const createdById = data?.createdById || (await DbFixtures.createUser()).id;

    return prisma.ticket.create({
      data: {
        propertyId,
        tenancyId: data?.tenancyId || null,
        title: data?.title || 'Test Ticket',
        description: data?.description || 'Test ticket description',
        priority: data?.priority || 'MEDIUM',
        status: data?.status || 'OPEN',
        createdById,
      },
      include: {
        property: true,
        createdBy: true,
      },
    });
  },

  /**
   * Create a test quote
   */
  async createQuote(data?: Partial<{
    ticketId: string;
    contractorId: string;
    amount: number;
    notes: string;
    status: string;
  }>) {
    const ticketId = data?.ticketId || (await DbFixtures.createTicket()).id;
    const contractorId = data?.contractorId || (await DbFixtures.createUser({ role: 'CONTRACTOR' })).id;

    return prisma.quote.create({
      data: {
        ticketId,
        contractorId,
        amount: data?.amount || 250.0,
        notes: data?.notes || 'Test quote notes',
        status: data?.status || 'PENDING',
      },
    });
  },

  /**
   * Create a complete test scenario with landlord, tenant, property, tenancy, and ticket
   */
  async createCompleteScenario() {
    // Create landlord org and user
    const landlordOrg = await DbFixtures.createOrg({ name: 'Test Landlord Org', type: 'LANDLORD' });
    const landlordUser = await DbFixtures.createUser({
      email: 'landlord@test.com',
      name: 'Test Landlord',
      orgId: landlordOrg.id,
      role: 'LANDLORD',
    });

    // Create tenant org and user
    const tenantOrg = await DbFixtures.createOrg({ name: 'Test Tenant Org', type: 'TENANT' });
    const tenantUser = await DbFixtures.createUser({
      email: 'tenant@test.com',
      name: 'Test Tenant',
      orgId: tenantOrg.id,
      role: 'TENANT',
    });

    // Create property
    const property = await DbFixtures.createProperty({
      address1: '456 Test Avenue',
      ownerOrgId: landlordOrg.id,
    });

    // Create tenancy
    const tenancy = await DbFixtures.createTenancy({
      propertyId: property.id,
      tenantOrgId: tenantOrg.id,
    });

    // Create ticket
    const ticket = await DbFixtures.createTicket({
      propertyId: property.id,
      tenancyId: tenancy.id,
      createdById: tenantUser.id,
      title: 'Leaking tap',
    });

    return {
      landlordOrg,
      landlordUser,
      tenantOrg,
      tenantUser,
      property,
      tenancy,
      ticket,
    };
  },

  /**
   * Clean up all test data
   */
  async cleanup() {
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
  },

  /**
   * Disconnect from database
   */
  async disconnect() {
    await prisma.$disconnect();
  },
};
