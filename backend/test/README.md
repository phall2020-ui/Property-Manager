# Contract Testing with Zod Schemas

This directory contains contract tests that validate API requests and responses against Zod schemas.

## What are Contract Tests?

Contract tests ensure that:
1. **Frontend** sends valid requests that match the API contract
2. **Backend** returns valid responses that match the API contract
3. **Both sides** agree on the data structure (the "contract")

## File Structure

```
backend/
├── apps/api/src/schemas/        # Zod schema definitions
│   ├── auth.schemas.ts          # Auth endpoint schemas
│   ├── properties.schemas.ts    # Properties endpoint schemas
│   ├── tenancies.schemas.ts     # Tenancies endpoint schemas
│   ├── tickets.schemas.ts       # Tickets endpoint schemas
│   └── index.ts                 # Export all schemas
├── test/                        # E2E contract tests
│   ├── auth-contract.e2e-spec.ts
│   ├── properties-contract.e2e-spec.ts
│   └── tickets-contract.e2e-spec.ts
└── scripts/
    └── extract-openapi-schema.ts # Export OpenAPI spec

frontend-new/
├── src/schemas/
│   └── api-schemas.ts           # Mirror of backend schemas
├── src/lib/
│   └── validated-api.ts         # API wrapper with validation
└── src/__tests__/
    ├── contract-schemas.test.ts       # Schema validation tests
    └── contract-demonstration.test.ts # Examples & demos
```

## Running Tests

### Backend Contract Tests

```bash
cd backend

# Run all contract tests
npm test -- contract

# Run specific test file
npm test -- auth-contract.e2e-spec.ts
npm test -- properties-contract.e2e-spec.ts
npm test -- tickets-contract.e2e-spec.ts
```

### Frontend Schema Tests

```bash
cd frontend-new

# Run all tests
npm test

# Run contract tests only
npm test -- contract-schemas.test.ts
npm test -- contract-demonstration.test.ts

# Run with verbose output
npm test -- contract-demonstration.test.ts --reporter=verbose
```

## Using Validated API in Frontend

### Before (Unvalidated)
```typescript
import { api } from '../lib/api';

// No validation - runtime errors possible
const property = await api.post('/properties', {
  addressLine1: '',  // Invalid but not caught!
  city: 'London',
  postcode: 'SW1A 1AA',
});
```

### After (Validated)
```typescript
import { validatedPropertiesApi } from '../lib/validated-api';

try {
  // Request is validated before sending
  // Response is validated after receiving
  const property = await validatedPropertiesApi.create({
    addressLine1: '',  // ❌ Caught immediately!
    city: 'London',
    postcode: 'SW1A 1AA',
  });
} catch (error) {
  console.error('Validation failed:', error.message);
  // Error: Invalid request data: addressLine1: String must contain at least 1 character(s)
}
```

## Schema Definition Example

```typescript
import { z } from 'zod';

// Define request schema
export const CreatePropertyRequestSchema = z.object({
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  postcode: z.string().min(1),
  bedrooms: z.number().int().min(0).optional(),
});

// Define response schema
export const PropertySchema = z.object({
  id: z.string(),
  addressLine1: z.string(),
  city: z.string(),
  postcode: z.string(),
  bedrooms: z.number().int().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Generate TypeScript types
export type CreatePropertyRequest = z.infer<typeof CreatePropertyRequestSchema>;
export type Property = z.infer<typeof PropertySchema>;
```

## Writing Contract Tests

### 1. Test Request Validation
```typescript
it('should validate request schema', () => {
  const validRequest = {
    addressLine1: '123 Test Street',
    city: 'London',
    postcode: 'SW1A 1AA',
  };

  // Should pass
  expect(() => CreatePropertyRequestSchema.parse(validRequest)).not.toThrow();

  // Should fail
  const invalidRequest = { addressLine1: '' };
  expect(() => CreatePropertyRequestSchema.parse(invalidRequest)).toThrow();
});
```

### 2. Test Response Validation
```typescript
it('should return response matching schema', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/properties')
    .set('Authorization', `Bearer ${token}`)
    .send(validData)
    .expect(201);

  // Validate against schema
  const validationResult = PropertySchema.safeParse(response.body);
  expect(validationResult.success).toBe(true);
});
```

### 3. Test Failing Cases
```typescript
it('should demonstrate failing validation', () => {
  const invalidCases = [
    {
      name: 'Empty string',
      data: { addressLine1: '', city: 'London', postcode: 'SW1A 1AA' },
      expectedError: 'String must contain at least 1 character(s)',
    },
    {
      name: 'Negative number',
      data: { addressLine1: '123 St', city: 'London', postcode: 'SW1A 1AA', bedrooms: -1 },
      expectedError: 'Number must be greater than or equal to 0',
    },
  ];

  invalidCases.forEach(({ data, expectedError }) => {
    const result = CreatePropertyRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain(expectedError);
    }
  });
});
```

## Exporting OpenAPI Schema

To generate an OpenAPI specification from the NestJS Swagger setup:

```bash
cd backend
ts-node scripts/extract-openapi-schema.ts
```

This creates `openapi-schema.json` that can be used with:
- API documentation tools (Swagger UI, Redoc)
- Code generators
- API testing tools (Postman, Insomnia)
- Contract testing frameworks

## Benefits

✅ **Type Safety** - TypeScript types generated from schemas  
✅ **Runtime Validation** - Catch errors before they reach the server  
✅ **Clear Error Messages** - Know exactly what's wrong and where  
✅ **Documentation** - Schemas serve as living documentation  
✅ **Contract Testing** - Ensure frontend/backend compatibility  
✅ **Fail Fast** - Invalid data caught immediately  
✅ **Refactoring Safety** - Schema changes caught by tests  

## Common Patterns

### Optional Fields
```typescript
z.string().optional()  // Field can be undefined
z.string().nullable()  // Field can be null
z.string().nullable().optional()  // Field can be null or undefined
```

### Constraints
```typescript
z.string().min(1)  // Non-empty string
z.string().email()  // Valid email format
z.number().int()  // Integer only
z.number().min(0)  // Non-negative
z.enum(['LOW', 'MEDIUM', 'HIGH'])  // One of these values
z.string().datetime()  // ISO datetime string
```

### Complex Types
```typescript
z.array(PropertySchema)  // Array of properties
z.record(z.string())  // Object with string values
z.union([TypeA, TypeB])  // One of multiple types
```

## Troubleshooting

### Test fails with "Cannot find module"
Make sure dependencies are installed:
```bash
npm install
```

### Schema validation fails unexpectedly
Check the error details:
```typescript
const result = Schema.safeParse(data);
if (!result.success) {
  console.log(result.error.errors);  // Detailed error information
}
```

### OpenAPI export fails
Ensure the backend can start and all modules load correctly:
```bash
npm run build
npm run start
```

## Resources

- [Zod Documentation](https://zod.dev)
- [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
- [Contract Testing Guide](https://martinfowler.com/bliki/ContractTest.html)
- [Project Documentation](../CONTRACT_TESTING_GUIDE.md)
