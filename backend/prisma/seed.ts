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
      addressLine1: '123 Main Street',
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
      start: new Date('2024-01-01'),
      startDate: new Date('2024-01-01'),
      end: new Date('2025-01-01'),
      endDate: new Date('2025-01-01'),
      rent: 1500,
      rentPcm: 1500,
      frequency: 'MONTHLY',
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

  // Add Tenant to Tenancy
  await prisma.tenancyTenant.create({
    data: {
      tenancyId: tenancy.id,
      fullName: tenantUser.name,
      email: tenantUser.email,
      phone: '+44 7700 900000',
      status: 'ACTIVE',
    },
  });

  // Create Finance Settings
  await prisma.financeSettings.create({
    data: {
      landlordId: landlordOrg.id,
      invoicePrefix: 'INV',
      defaultDueDays: 7,
      lateFeeEnabled: true,
      lateFeePercent: 0.1, // 0.1% per day
      lateFeeGraceDays: 3,
      lateFeeCap: 50,
      vatOnFeesEnabled: false,
      currency: 'GBP',
    },
  });

  // Create Ledger Account
  const rentAccount = await prisma.ledgerAccount.create({
    data: {
      landlordId: landlordOrg.id,
      type: 'RENT',
      name: 'Rent Receivable',
      currency: 'GBP',
    },
  });

  // Create Invoice 1 - Paid in full
  const paidDate = new Date('2024-11-01');
  const invoice1 = await prisma.invoice.create({
    data: {
      landlordId: landlordOrg.id,
      propertyId: property.id,
      tenancyId: tenancy.id,
      tenantUserId: tenantUser.id,
      number: 'INV-2024-000001',
      issueDate: new Date('2024-10-25'),
      dueDate: new Date('2024-11-01'),
      lineTotal: 1500,
      taxTotal: 0,
      grandTotal: 1500,
      status: 'PAID',
      lines: {
        create: [
          {
            description: 'Rent for November 2024',
            qty: 1,
            unitPrice: 1500,
            taxRate: 0,
            lineTotal: 1500,
            taxTotal: 0,
          },
        ],
      },
    },
  });

  // Payment for Invoice 1
  const payment1 = await prisma.payment.create({
    data: {
      landlordId: landlordOrg.id,
      propertyId: property.id,
      tenancyId: tenancy.id,
      tenantUserId: tenantUser.id,
      method: 'BANK_TRANSFER',
      amount: 1500,
      receivedAt: paidDate,
      status: 'SUCCEEDED',
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentId: payment1.id,
      invoiceId: invoice1.id,
      amount: 1500,
    },
  });

  // Invoice 2 - Partially paid
  const invoice2 = await prisma.invoice.create({
    data: {
      landlordId: landlordOrg.id,
      propertyId: property.id,
      tenancyId: tenancy.id,
      tenantUserId: tenantUser.id,
      number: 'INV-2024-000002',
      issueDate: new Date('2024-11-25'),
      dueDate: new Date('2024-12-01'),
      lineTotal: 1500,
      taxTotal: 0,
      grandTotal: 1500,
      status: 'PART_PAID',
      lines: {
        create: [
          {
            description: 'Rent for December 2024',
            qty: 1,
            unitPrice: 1500,
            taxRate: 0,
            lineTotal: 1500,
            taxTotal: 0,
          },
        ],
      },
    },
  });

  // Partial payment for Invoice 2
  const payment2 = await prisma.payment.create({
    data: {
      landlordId: landlordOrg.id,
      propertyId: property.id,
      tenancyId: tenancy.id,
      tenantUserId: tenantUser.id,
      method: 'BANK_TRANSFER',
      amount: 750,
      receivedAt: new Date('2024-12-01'),
      status: 'SUCCEEDED',
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      paymentId: payment2.id,
      invoiceId: invoice2.id,
      amount: 750,
    },
  });

  // Invoice 3 - Overdue (unpaid)
  const invoice3 = await prisma.invoice.create({
    data: {
      landlordId: landlordOrg.id,
      propertyId: property.id,
      tenancyId: tenancy.id,
      tenantUserId: tenantUser.id,
      number: 'INV-2024-000003',
      issueDate: new Date('2024-10-01'),
      dueDate: new Date('2024-10-07'),
      lineTotal: 1500,
      taxTotal: 0,
      grandTotal: 1500,
      status: 'ISSUED',
      lines: {
        create: [
          {
            description: 'Rent for October 2024',
            qty: 1,
            unitPrice: 1500,
            taxRate: 0,
            lineTotal: 1500,
            taxTotal: 0,
          },
        ],
      },
    },
  });

  // Create Mandate
  const mandate = await prisma.mandate.create({
    data: {
      landlordId: landlordOrg.id,
      tenantUserId: tenantUser.id,
      provider: 'GOCARDLESS',
      status: 'ACTIVE',
      reference: 'MD-MOCK-12345',
      activatedAt: new Date('2024-01-15'),
    },
  });

  // Create Bank Transactions (one matched, one unmatched)
  const matchedBankTx = await prisma.bankTransaction.create({
    data: {
      landlordId: landlordOrg.id,
      bankAccountId: 'acc-001',
      postedAt: new Date('2024-11-01'),
      description: 'TRANSFER FROM BOB TENANT REF: INV-2024-000001',
      amount: 1500,
      currency: 'GBP',
      hash: 'hash-matched-tx-001',
      rawJson: JSON.stringify({ id: 'tx001', amount: 1500 }),
    },
  });

  // Reconciliation for matched transaction
  await prisma.reconciliation.create({
    data: {
      landlordId: landlordOrg.id,
      bankTransactionId: matchedBankTx.id,
      matchType: 'AUTO',
      confidence: 95.0,
      matchedEntityType: 'payment',
      matchedEntityId: payment1.id,
    },
  });

  const unmatchedBankTx = await prisma.bankTransaction.create({
    data: {
      landlordId: landlordOrg.id,
      bankAccountId: 'acc-001',
      postedAt: new Date('2024-11-05'),
      description: 'TRANSFER FROM UNKNOWN',
      amount: 1500,
      currency: 'GBP',
      hash: 'hash-unmatched-tx-002',
      rawJson: JSON.stringify({ id: 'tx002', amount: 1500 }),
    },
  });

  // Ledger Entries
  await prisma.ledgerEntry.createMany({
    data: [
      {
        landlordId: landlordOrg.id,
        propertyId: property.id,
        tenancyId: tenancy.id,
        tenantUserId: tenantUser.id,
        accountId: rentAccount.id,
        direction: 'DEBIT',
        drCr: 'DR',
        amount: 1500,
        description: 'Invoice INV-2024-000001',
        memo: 'Invoice INV-2024-000001',
        refType: 'invoice',
        refId: invoice1.id,
        bookedAt: new Date('2024-10-25'),
        eventAt: new Date('2024-10-25'),
      },
      {
        landlordId: landlordOrg.id,
        propertyId: property.id,
        tenancyId: tenancy.id,
        tenantUserId: tenantUser.id,
        accountId: rentAccount.id,
        direction: 'CREDIT',
        drCr: 'CR',
        amount: 1500,
        description: 'Payment via BANK_TRANSFER',
        memo: 'Payment via BANK_TRANSFER',
        refType: 'payment',
        refId: payment1.id,
        bookedAt: paidDate,
        eventAt: paidDate,
      },
      {
        landlordId: landlordOrg.id,
        propertyId: property.id,
        tenancyId: tenancy.id,
        tenantUserId: tenantUser.id,
        accountId: rentAccount.id,
        direction: 'DEBIT',
        drCr: 'DR',
        amount: 1500,
        description: 'Invoice INV-2024-000002',
        memo: 'Invoice INV-2024-000002',
        refType: 'invoice',
        refId: invoice2.id,
        bookedAt: new Date('2024-11-25'),
        eventAt: new Date('2024-11-25'),
      },
      {
        landlordId: landlordOrg.id,
        propertyId: property.id,
        tenancyId: tenancy.id,
        tenantUserId: tenantUser.id,
        accountId: rentAccount.id,
        direction: 'CREDIT',
        drCr: 'CR',
        amount: 750,
        description: 'Payment via BANK_TRANSFER',
        memo: 'Payment via BANK_TRANSFER',
        refType: 'payment',
        refId: payment2.id,
        bookedAt: new Date('2024-12-01'),
        eventAt: new Date('2024-12-01'),
      },
      {
        landlordId: landlordOrg.id,
        propertyId: property.id,
        tenancyId: tenancy.id,
        tenantUserId: tenantUser.id,
        accountId: rentAccount.id,
        direction: 'DEBIT',
        drCr: 'DR',
        amount: 1500,
        description: 'Invoice INV-2024-000003',
        memo: 'Invoice INV-2024-000003',
        refType: 'invoice',
        refId: invoice3.id,
        bookedAt: new Date('2024-10-01'),
        eventAt: new Date('2024-10-01'),
      },
    ],
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
  console.log(`🏠 Property:  ${property.addressLine1}, ${property.city} ${property.postcode}`);
  console.log(`📝 Tenancy:   Active (${tenancy.rentPcm}/month)`);
  console.log(`🎫 Ticket:    "${ticket.title}" (${ticket.status})`);
  console.log(`\n💰 FINANCE DATA:`);
  console.log(`   • 3 Invoices: 1 paid (${invoice1.number}), 1 part-paid (${invoice2.number}), 1 overdue (${invoice3.number})`);
  console.log(`   • 2 Payments: £${payment1.amount} + £${payment2.amount}`);
  console.log(`   • 1 Active Mandate: ${mandate.provider} (${mandate.reference})`);
  console.log(`   • 2 Bank Transactions: 1 matched, 1 unmatched`);
  console.log(`   • Outstanding Balance: £${1500 - 750} (part-paid) + £${1500} (overdue) = £${2250}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
