/**
 * Test user credentials and data fixtures
 */

export const testUsers = {
  landlord: {
    email: 'landlord@example.com',
    password: 'password123',
    name: 'Test Landlord',
    role: 'LANDLORD' as const,
  },
  tenant: {
    email: 'tenant@example.com',
    password: 'password123',
    name: 'Test Tenant',
    role: 'TENANT' as const,
  },
  contractor: {
    email: 'contractor@example.com',
    password: 'password123',
    name: 'Test Contractor',
    role: 'CONTRACTOR' as const,
  },
  ops: {
    email: 'ops@example.com',
    password: 'password123',
    name: 'Test Ops',
    role: 'OPS' as const,
  },
};

export const mockAuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

export const mockUser = {
  id: 'user-123',
  email: testUsers.landlord.email,
  name: testUsers.landlord.name,
  role: testUsers.landlord.role,
  organisations: [
    {
      id: 'org-123',
      name: "Test Landlord's Organisation",
      role: 'LANDLORD' as const,
    },
  ],
};

