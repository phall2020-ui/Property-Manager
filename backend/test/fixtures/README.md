# Test Fixtures

This directory contains test fixtures for database models that can be used in integration and e2e tests.

## Usage

### Basic Usage

```typescript
import { DbFixtures } from './fixtures/db-models.fixture';

// Create a test organization
const org = await DbFixtures.createOrg({ name: 'My Test Org', type: 'LANDLORD' });

// Create a test user with org membership
const user = await DbFixtures.createUser({
  email: 'test@example.com',
  name: 'Test User',
  orgId: org.id,
  role: 'LANDLORD',
});

// Create a test property
const property = await DbFixtures.createProperty({
  address1: '123 Test St',
  ownerOrgId: org.id,
});
```

### Complete Scenario

Create a complete test scenario with all related entities:

```typescript
import { DbFixtures } from './fixtures/db-models.fixture';

const scenario = await DbFixtures.createCompleteScenario();

// scenario includes:
// - landlordOrg
// - landlordUser
// - tenantOrg
// - tenantUser
// - property
// - tenancy
// - ticket
```

### Cleanup

Always clean up test data after tests:

```typescript
import { DbFixtures } from './fixtures/db-models.fixture';

afterAll(async () => {
  await DbFixtures.cleanup();
  await DbFixtures.disconnect();
});
```

## Available Fixtures

### `createOrg(data?)`
Creates a test organization.

**Options:**
- `name` (string): Organization name (default: 'Test Organization')
- `type` (string): Organization type (default: 'LANDLORD')

### `createUser(data?)`
Creates a test user with organization membership.

**Options:**
- `email` (string): User email (default: auto-generated)
- `name` (string): User name (default: 'Test User')
- `password` (string): User password (default: 'password123')
- `orgId` (string): Organization ID (default: creates new org)
- `role` (string): User role in org (default: 'LANDLORD')

### `createProperty(data?)`
Creates a test property.

**Options:**
- `address1` (string): Primary address (default: '123 Test Street')
- `address2` (string): Secondary address (default: null)
- `city` (string): City (default: 'London')
- `postcode` (string): Postcode (default: 'SW1A 1AA')
- `bedrooms` (number): Number of bedrooms (default: 2)
- `ownerOrgId` (string): Owner organization ID (default: creates new org)

### `createTenancy(data?)`
Creates a test tenancy.

**Options:**
- `propertyId` (string): Property ID (default: creates new property)
- `tenantOrgId` (string): Tenant organization ID (default: creates new org)
- `startDate` (Date): Tenancy start date (default: now)
- `endDate` (Date): Tenancy end date (default: 1 year from now)
- `rentPcm` (number): Monthly rent (default: 1500)
- `deposit` (number): Security deposit (default: 3000)
- `status` (string): Tenancy status (default: 'ACTIVE')

### `createTicket(data?)`
Creates a test maintenance ticket.

**Options:**
- `propertyId` (string): Property ID (default: creates new property)
- `tenancyId` (string): Tenancy ID (default: null)
- `title` (string): Ticket title (default: 'Test Ticket')
- `description` (string): Ticket description (default: 'Test ticket description')
- `priority` (string): Priority level (default: 'MEDIUM')
- `status` (string): Ticket status (default: 'OPEN')
- `createdById` (string): Creator user ID (default: creates new user)

### `createQuote(data?)`
Creates a test quote for a ticket.

**Options:**
- `ticketId` (string): Ticket ID (default: creates new ticket)
- `contractorId` (string): Contractor user ID (default: creates new contractor)
- `amount` (number): Quote amount (default: 250.0)
- `notes` (string): Quote notes (default: 'Test quote notes')
- `status` (string): Quote status (default: 'PENDING')

### `createCompleteScenario()`
Creates a complete test scenario with landlord, tenant, property, tenancy, and ticket.

Returns an object with:
- `landlordOrg`
- `landlordUser`
- `tenantOrg`
- `tenantUser`
- `property`
- `tenancy`
- `ticket`

### `cleanup()`
Deletes all test data from the database in the correct order to respect foreign key constraints.

### `disconnect()`
Disconnects from the database. Should be called after cleanup.

## Example Test

```typescript
import { DbFixtures } from './fixtures/db-models.fixture';

describe('Property Management', () => {
  afterAll(async () => {
    await DbFixtures.cleanup();
    await DbFixtures.disconnect();
  });

  it('should create a property with tenancy', async () => {
    const landlordOrg = await DbFixtures.createOrg({ type: 'LANDLORD' });
    const tenantOrg = await DbFixtures.createOrg({ type: 'TENANT' });
    
    const property = await DbFixtures.createProperty({
      ownerOrgId: landlordOrg.id,
    });
    
    const tenancy = await DbFixtures.createTenancy({
      propertyId: property.id,
      tenantOrgId: tenantOrg.id,
    });
    
    expect(tenancy.propertyId).toBe(property.id);
    expect(tenancy.tenantOrgId).toBe(tenantOrg.id);
  });
});
```
