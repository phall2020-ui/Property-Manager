# Contract Testing Implementation

This document demonstrates the contract testing implementation with OpenAPI/Zod schemas for all endpoints.

## Overview

We've implemented contract tests using Zod schemas to validate:
1. **Request payloads** - Ensure clients send valid data
2. **Response payloads** - Ensure API returns data matching the schema
3. **Type safety** - Generate TypeScript types from schemas for compile-time checks

## Architecture

### Backend
- **Schemas Location**: `/backend/apps/api/src/schemas/`
- **Contract Tests**: `/backend/test/*-contract.e2e-spec.ts`
- **DTOs**: Existing class-validator DTOs remain unchanged

### Frontend
- **Schemas Location**: `/frontend-new/src/schemas/`
- **Validated API**: `/frontend-new/src/lib/validated-api.ts`
- **Type Generation**: Types are inferred from Zod schemas using `z.infer<>`

## Examples

### 1. Backend Contract Test Examples

#### Passing Test Case
```typescript
describe('POST /api/properties', () => {
  it('should return response matching schema', async () => {
    const propertyData = {
      addressLine1: '456 Test Avenue',
      city: 'Manchester',
      postcode: 'M1 1AA',
      bedrooms: 3,
    };

    const response = await request(app.getHttpServer())
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send(propertyData)
      .expect(201);

    // Validate response against schema
    const validationResult = PropertySchema.safeParse(response.body);
    expect(validationResult.success).toBe(true);
  });
});
```

#### Failing Test Case - Invalid Request
```typescript
it('should fail validation with invalid data', async () => {
  const invalidData = {
    addressLine1: '', // empty - FAILS validation
    city: 'London',
    postcode: 'SW1A 1AA',
  };

  await request(app.getHttpServer())
    .post('/api/properties')
    .set('Authorization', `Bearer ${landlordToken}`)
    .send(invalidData)
    .expect(400); // Bad Request due to validation failure
});
```

#### Failing Test Case - Schema Mismatch
```typescript
it('should demonstrate failing property request validation', () => {
  const invalidCases = [
    {
      name: 'Empty address line',
      data: { addressLine1: '', city: 'London', postcode: 'SW1A 1AA' },
      expectedError: 'String must contain at least 1 character(s)',
    },
    {
      name: 'Negative bedrooms',
      data: { addressLine1: '123 Test St', city: 'London', postcode: 'SW1A 1AA', bedrooms: -1 },
      expectedError: 'Number must be greater than or equal to 0',
    },
    {
      name: 'Missing required fields',
      data: { addressLine1: '123 Test St' },
      expectedError: 'Required',
    },
  ];

  invalidCases.forEach(({ name, data, expectedError }) => {
    const result = CreatePropertyRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain(expectedError);
    }
  });
});
```

### 2. Frontend Validated API Examples

#### Passing Case - Valid Request
```typescript
import { validatedPropertiesApi } from '../lib/validated-api';

// This will validate the request AND response
const property = await validatedPropertiesApi.create({
  addressLine1: '123 Main Street',
  city: 'London',
  postcode: 'SW1A 1AA',
  bedrooms: 2,
});
// ✅ Returns typed Property object
// ✅ Request validated before sending
// ✅ Response validated before returning
```

#### Failing Case - Invalid Request
```typescript
try {
  const property = await validatedPropertiesApi.create({
    addressLine1: '', // ❌ Empty string fails validation
    city: 'London',
    postcode: 'SW1A 1AA',
    bedrooms: -1, // ❌ Negative number fails validation
  });
} catch (error) {
  // Error: Invalid request data: addressLine1: String must contain at least 1 character(s), bedrooms: Number must be greater than or equal to 0
  console.error(error);
}
```

#### Failing Case - Invalid Response
```typescript
// If the API returns data that doesn't match the schema:
try {
  const property = await validatedPropertiesApi.getById('some-id');
} catch (error) {
  // Error: Invalid response data: createdAt: Invalid datetime, ...
  // This catches issues where the API response doesn't match the contract
  console.error(error);
}
```

### 3. Schema Definition Example

```typescript
// From /backend/apps/api/src/schemas/properties.schemas.ts

export const CreatePropertyRequestSchema = z.object({
  addressLine1: z.string().min(1),           // Required, non-empty string
  address2: z.string().optional(),            // Optional string
  city: z.string().min(1),                   // Required, non-empty string
  postcode: z.string().min(1),               // Required, non-empty string
  bedrooms: z.number().int().min(0).optional(), // Optional, non-negative integer
  councilTaxBand: z.string().optional(),      // Optional string
});

export const PropertySchema = z.object({
  id: z.string(),
  addressLine1: z.string(),
  address2: z.string().nullable().optional(),
  city: z.string(),
  postcode: z.string(),
  bedrooms: z.number().int().nullable().optional(),
  councilTaxBand: z.string().nullable().optional(),
  ownerOrgId: z.string(),
  createdAt: z.string().datetime(),          // ISO datetime string
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

// Generate TypeScript types from schemas
export type CreatePropertyRequest = z.infer<typeof CreatePropertyRequestSchema>;
export type Property = z.infer<typeof PropertySchema>;
```

## Running Contract Tests

### Backend Tests
```bash
cd backend
npm test -- auth-contract.e2e-spec.ts
npm test -- properties-contract.e2e-spec.ts
npm test -- tickets-contract.e2e-spec.ts
```

### Test Coverage
- ✅ Auth API (signup, login, refresh)
- ✅ Properties API (create, list, get, update)
- ✅ Tickets API (create, list, get, update status)
- ✅ Tenancies API schemas defined

## Benefits

1. **Type Safety**: TypeScript types are automatically generated from schemas
2. **Runtime Validation**: All requests and responses are validated at runtime
3. **Documentation**: Schemas serve as living documentation
4. **Fail Fast**: Invalid data is caught early with clear error messages
5. **Contract Testing**: Ensures frontend and backend always agree on data structures

## Failure Examples

### Example 1: Empty String in Required Field
```typescript
// Request
CreatePropertyRequestSchema.parse({
  addressLine1: '',  // ❌ FAILS
  city: 'London',
  postcode: 'SW1A 1AA',
});

// Error
ZodError: [
  {
    "code": "too_small",
    "minimum": 1,
    "type": "string",
    "inclusive": true,
    "message": "String must contain at least 1 character(s)",
    "path": ["addressLine1"]
  }
]
```

### Example 2: Invalid Email Format
```typescript
// Request
SignupRequestSchema.parse({
  email: 'not-an-email',  // ❌ FAILS
  password: 'password123',
  name: 'Test User',
});

// Error
ZodError: [
  {
    "validation": "email",
    "code": "invalid_string",
    "message": "Invalid email",
    "path": ["email"]
  }
]
```

### Example 3: Negative Number
```typescript
// Request
CreatePropertyRequestSchema.parse({
  addressLine1: '123 Test St',
  city: 'London',
  postcode: 'SW1A 1AA',
  bedrooms: -1,  // ❌ FAILS
});

// Error
ZodError: [
  {
    "code": "too_small",
    "minimum": 0,
    "type": "number",
    "inclusive": true,
    "message": "Number must be greater than or equal to 0",
    "path": ["bedrooms"]
  }
]
```

### Example 4: Missing Required Field
```typescript
// Request
LoginRequestSchema.parse({
  email: 'test@example.com',
  // password missing  // ❌ FAILS
});

// Error
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["password"],
    "message": "Required"
  }
]
```

## Implementation Details

### How It Works

1. **Schema Definition**: Zod schemas are defined for all DTOs
2. **Type Generation**: TypeScript types are inferred using `z.infer<>`
3. **Request Validation**: Frontend validates data before sending
4. **Response Validation**: Frontend validates data after receiving
5. **Contract Tests**: Backend tests ensure responses match schemas

### Validated API Wrapper

The `validatedRequest` helper function:
1. Validates request data against schema (if provided)
2. Makes the HTTP request
3. Validates response data against schema
4. Returns typed data or throws descriptive error

```typescript
async function validatedRequest<TRequest, TResponse>(
  requestPromise: Promise<AxiosResponse>,
  requestSchema: z.ZodSchema<TRequest> | null,
  responseSchema: z.ZodSchema<TResponse>,
  requestData?: TRequest
): Promise<TResponse> {
  // Validate request
  if (requestSchema && requestData) {
    requestSchema.parse(requestData); // Throws if invalid
  }
  
  // Make request
  const response = await requestPromise;
  
  // Validate response
  return responseSchema.parse(response.data); // Throws if invalid
}
```

## Next Steps

1. Add contract tests for remaining endpoints (Finance, Documents, etc.)
2. Generate OpenAPI spec from Zod schemas using tools like `zod-to-openapi`
3. Set up CI pipeline to run contract tests
4. Add integration with API mocking tools for frontend development
5. Consider using `@anatine/zod-nestjs` to replace class-validator DTOs

## Resources

- Zod Documentation: https://zod.dev
- NestJS Swagger: https://docs.nestjs.com/openapi/introduction
- Contract Testing: https://martinfowler.com/bliki/ContractTest.html
