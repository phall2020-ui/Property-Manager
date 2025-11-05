import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create Landlord Organisation
  const landlordOrg = await prisma.org.create({
    data: {
      name: 'Acme Properties Ltd',
      type: 'LANDLORD',
    },
  });

  // Create Tenant Organisation
  const tenantOrg = await prisma.org.create({
    data: {
      name: 'Smith Family',
      type: 'TENANT',
    },
  });

  // Create Landlord User
  const landlordUser = await prisma.user.create({
    data: {
      email: 'landlord@example.com',
      name: 'Alice Landlord',
      passwordHash: await bcrypt.hash('password123', 10),
      orgMemberships: {
        create: {
          orgId: landlordOrg.id,
          role: 'LANDLORD',
        },
      },
    },
  });

  // Create Tenant User
  const tenantUser = await prisma.user.create({
    data: {
      email: 'tenant@example.com',
      name: 'Bob Tenant',
      passwordHash: await bcrypt.hash('password123', 10),
      orgMemberships: {
        create: {
          orgId: tenantOrg.id,
          role: 'TENANT',
        },
      },
    },
  });

  // Create Contractor User (no org, standalone)
  const contractorUser = await prisma.user.create({
    data: {
      email: 'contractor@example.com',
      name: 'Charlie Contractor',
      passwordHash: await bcrypt.hash('password123', 10),
      orgMemberships: {
        create: {
          orgId: landlordOrg.id, // Contractors work with landlord org
          role: 'CONTRACTOR',
        },
      },
    },
  });

  // Create Property
  const property = await prisma.property.create({
    data: {
      address1: '123 Main Street',
      address2: 'Apt 4B',
      city: 'London',
      postcode: 'SW1A 1AA',
      bedrooms: 2,
      ownerOrgId: landlordOrg.id,
    },
  });

  // Create Tenancy
  const tenancy = await prisma.tenancy.create({
    data: {
      propertyId: property.id,
      tenantOrgId: tenantOrg.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      rentPcm: 1500,
      deposit: 3000,
      status: 'ACTIVE',
    },
  });

  // Create Open Ticket
  const ticket = await prisma.ticket.create({
    data: {
      propertyId: property.id,
      tenancyId: tenancy.id,
      title: 'Leaking kitchen tap',
      description: 'The kitchen tap has been dripping constantly for the past week. Needs urgent repair.',
      createdById: tenantUser.id,
      priority: 'HIGH',
      status: 'OPEN',
    },
  });

  console.log('✅ Seed data created successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 TEST CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🏢 LANDLORD:');
  console.log('   Email:    landlord@example.com');
  console.log('   Password: password123');
  console.log(`   Org:      ${landlordOrg.name} (${landlordOrg.id})\n`);
  console.log('👤 TENANT:');
  console.log('   Email:    tenant@example.com');
  console.log('   Password: password123');
  console.log(`   Org:      ${tenantOrg.name} (${tenantOrg.id})\n`);
  console.log('🔧 CONTRACTOR:');
  console.log('   Email:    contractor@example.com');
  console.log('   Password: password123\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 SAMPLE DATA');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`🏠 Property:  ${property.address1}, ${property.city} ${property.postcode}`);
  console.log(`📝 Tenancy:   Active (${tenancy.rentPcm}/month)`);
  console.log(`🎫 Ticket:    "${ticket.title}" (${ticket.status})\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
