/**
 * Test data fixtures for properties, tickets, tenancies, etc.
 */

export const mockProperty = {
  id: 'property-123',
  address: '123 Test Street',
  city: 'London',
  postcode: 'SW1A 1AA',
  type: 'FLAT' as const,
  bedrooms: 2,
  bathrooms: 1,
  orgId: 'org-123',
};

export const mockTenancy = {
  id: 'tenancy-123',
  propertyId: 'property-123',
  tenantId: 'tenant-123',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  monthlyRent: 1500,
  status: 'ACTIVE' as const,
};

export const mockTicket = {
  id: 'ticket-123',
  propertyId: 'property-123',
  tenancyId: 'tenancy-123',
  title: 'Leaking tap in kitchen',
  description: 'The tap in the kitchen is leaking continuously',
  priority: 'MEDIUM' as const,
  status: 'OPEN' as const,
  createdBy: 'tenant-123',
};

export const mockQuote = {
  id: 'quote-123',
  ticketId: 'ticket-123',
  contractorId: 'contractor-123',
  amount: 150.00,
  description: 'Replace tap and fix plumbing',
  status: 'PENDING' as const,
};

