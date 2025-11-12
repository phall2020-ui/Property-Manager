/**
 * Backend test data fixtures
 */

import { Role } from '../../apps/api/src/common/types/role.type';

export const testUsers = {
  landlord: {
    email: 'landlord@example.com',
    password: 'password123',
    name: 'Test Landlord',
    role: 'LANDLORD' as Role,
  },
  tenant: {
    email: 'tenant@example.com',
    password: 'password123',
    name: 'Test Tenant',
    role: 'TENANT' as Role,
  },
  contractor: {
    email: 'contractor@example.com',
    password: 'password123',
    name: 'Test Contractor',
    role: 'CONTRACTOR' as Role,
  },
  ops: {
    email: 'ops@example.com',
    password: 'password123',
    name: 'Test Ops',
    role: 'OPS' as Role,
  },
};

export const mockProperty = {
  address: '123 Test Street',
  city: 'London',
  postcode: 'SW1A 1AA',
  type: 'FLAT' as const,
  bedrooms: 2,
  bathrooms: 1,
};

export const mockTenancy = {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  monthlyRent: 1500,
  status: 'ACTIVE' as const,
};

export const mockTicket = {
  title: 'Leaking tap in kitchen',
  description: 'The tap in the kitchen is leaking continuously',
  priority: 'MEDIUM' as const,
  status: 'OPEN' as const,
};

export const mockQuote = {
  amount: 150.00,
  description: 'Replace tap and fix plumbing',
  status: 'PENDING' as const,
};

