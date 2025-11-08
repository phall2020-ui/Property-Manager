# Migration Guide: Using Validated API

This guide shows how to migrate from the unvalidated API to the validated API with contract testing.

## Before and After Examples

### Example 1: User Signup

#### Before (Unvalidated)
```typescript
// src/pages/SignupPage.tsx
import { authApi } from '../lib/api';

const handleSignup = async (email: string, password: string, name: string) => {
  try {
    const response = await authApi.signup({ email, password, name });
    // ❌ No validation - could receive unexpected data
    // ❌ No type safety - typos in response.data.accessToken won't be caught
    console.log(response.accessToken);
  } catch (error) {
    // ❌ Error could be from validation, network, or server
    console.error(error);
  }
};
```

#### After (Validated)
```typescript
// src/pages/SignupPage.tsx
import { validatedAuthApi } from '../lib/validated-api';

const handleSignup = async (email: string, password: string, name: string) => {
  try {
    // ✅ Request validated before sending
    // ✅ Response validated after receiving
    // ✅ Full TypeScript type safety
    const response = await validatedAuthApi.signup({ email, password, name });
    
    // TypeScript knows response is AuthResponse type
    console.log(response.accessToken);  // ✅ Type-safe
    console.log(response.user.name);    // ✅ Autocomplete works
    
  } catch (error) {
    // ✅ Clear error messages distinguish validation from other errors
    if (error.message.includes('Invalid request data')) {
      console.error('Form validation failed:', error);
    } else if (error.message.includes('Invalid response data')) {
      console.error('API returned unexpected data:', error);
    } else {
      console.error('Network or server error:', error);
    }
  }
};
```

### Example 2: Creating a Property

#### Before (Unvalidated)
```typescript
// src/pages/PropertyCreatePage.tsx
import { propertiesApi } from '../lib/api';

const createProperty = async () => {
  const data = {
    address1: formData.address,  // ❌ Wrong field name (should be addressLine1)
    city: formData.city,
    postcode: formData.postcode,
    bedrooms: formData.bedrooms,
  };

  try {
    // ❌ Wrong field name sent to server
    // ❌ Server returns 400, unclear what's wrong
    const property = await propertiesApi.create(data);
    console.log(property);
  } catch (error) {
    // ❌ Generic error message
    console.error('Failed to create property');
  }
};
```

#### After (Validated)
```typescript
// src/pages/PropertyCreatePage.tsx
import { validatedPropertiesApi } from '../lib/validated-api';
import type { CreatePropertyRequest } from '../schemas/api-schemas';

const createProperty = async () => {
  // ✅ TypeScript enforces correct field names
  const data: CreatePropertyRequest = {
    addressLine1: formData.address,  // ✅ Correct field name
    city: formData.city,
    postcode: formData.postcode,
    bedrooms: formData.bedrooms,
  };

  try {
    // ✅ Validated before sending
    const property = await validatedPropertiesApi.create(data);
    
    // ✅ TypeScript knows property.id, property.createdAt, etc. exist
    console.log(`Property created with ID: ${property.id}`);
    console.log(`Created at: ${property.createdAt}`);
    
  } catch (error) {
    // ✅ Clear error messages
    if (error.message.includes('Invalid request data')) {
      // Form has invalid data
      console.error('Please check your form data:', error);
    } else {
      console.error('Failed to create property:', error);
    }
  }
};
```

### Example 3: Listing Properties

#### Before (Unvalidated)
```typescript
// src/pages/PropertiesListPage.tsx
import { propertiesApi } from '../lib/api';

const [properties, setProperties] = useState<any[]>([]);

const loadProperties = async () => {
  try {
    const data = await propertiesApi.list();
    // ❌ No validation - could be any shape
    // ❌ Type is 'any' - no autocomplete
    setProperties(data);
  } catch (error) {
    console.error('Failed to load properties');
  }
};

// Later in component:
properties.map(property => (
  <div key={property.id}>
    {/* ❌ No autocomplete */}
    {/* ❌ Runtime error if API structure changes */}
    <h3>{property.addressLine1}</h3>
    <p>{property.city}</p>
  </div>
));
```

#### After (Validated)
```typescript
// src/pages/PropertiesListPage.tsx
import { validatedPropertiesApi } from '../lib/validated-api';
import type { Property } from '../schemas/api-schemas';

const [properties, setProperties] = useState<Property[]>([]);

const loadProperties = async () => {
  try {
    // ✅ Response validated - guaranteed to match Property[] type
    const data = await validatedPropertiesApi.list();
    
    // ✅ TypeScript knows this is Property[]
    setProperties(data);
  } catch (error) {
    if (error.message.includes('Invalid response data')) {
      // API returned unexpected structure
      console.error('API contract violation detected:', error);
    } else {
      console.error('Failed to load properties:', error);
    }
  }
};

// Later in component:
properties.map(property => (
  <div key={property.id}>
    {/* ✅ Full autocomplete */}
    {/* ✅ TypeScript error if fields don't exist */}
    <h3>{property.addressLine1}</h3>
    <p>{property.city}, {property.postcode}</p>
    <p>{property.bedrooms} bedrooms</p>
  </div>
));
```

### Example 4: Creating a Ticket

#### Before (Unvalidated)
```typescript
// src/pages/TicketCreatePage.tsx
import { ticketsApi } from '../lib/api';

const createTicket = async () => {
  const ticketData = {
    title: title,
    description: description,
    priority: priority,  // ❌ Could be any string
    propertyId: propertyId,
  };

  try {
    const ticket = await ticketsApi.create(ticketData);
    navigate(`/tickets/${ticket.id}`);
  } catch (error) {
    console.error('Failed to create ticket');
  }
};
```

#### After (Validated)
```typescript
// src/pages/TicketCreatePage.tsx
import { validatedTicketsApi } from '../lib/validated-api';
import type { CreateTicketRequest } from '../schemas/api-schemas';

const createTicket = async () => {
  // ✅ TypeScript enforces priority is valid enum value
  const ticketData: CreateTicketRequest = {
    title: title,
    description: description,
    priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',  // ✅ Type-safe
    propertyId: propertyId,
  };

  try {
    // ✅ Validated before sending and after receiving
    const ticket = await validatedTicketsApi.create(ticketData);
    
    // ✅ TypeScript knows ticket structure
    navigate(`/tickets/${ticket.id}`);
  } catch (error) {
    if (error.message.includes('Invalid enum value')) {
      // Priority is invalid
      console.error('Please select a valid priority');
    } else if (error.message.includes('Invalid request data')) {
      console.error('Form validation failed:', error);
    } else {
      console.error('Failed to create ticket:', error);
    }
  }
};
```

## Migration Steps

### 1. Add Type Imports
```typescript
// Add at the top of your file
import type { 
  Property, 
  CreatePropertyRequest,
  Ticket,
  CreateTicketRequest,
} from '../schemas/api-schemas';
```

### 2. Replace API Import
```typescript
// Before
import { propertiesApi, ticketsApi } from '../lib/api';

// After
import { validatedPropertiesApi, validatedTicketsApi } from '../lib/validated-api';
```

### 3. Add Type Annotations
```typescript
// Before
const [properties, setProperties] = useState([]);

// After
const [properties, setProperties] = useState<Property[]>([]);
```

### 4. Update Error Handling
```typescript
// Before
catch (error) {
  console.error('Error:', error);
}

// After
catch (error) {
  if (error.message.includes('Invalid request data')) {
    // Client-side validation error
    showFormError(error.message);
  } else if (error.message.includes('Invalid response data')) {
    // Server returned unexpected data
    showAlert('API error detected. Please contact support.');
  } else {
    // Network or other error
    showAlert('Request failed. Please try again.');
  }
}
```

## Benefits of Migration

### Type Safety
```typescript
// Before: No autocomplete, no type checking
const address = property.addressLine1;  // ❌ Could typo as 'address1'

// After: Full autocomplete and type checking
const address = property.addressLine1;  // ✅ Autocomplete suggests correct field
const wrong = property.address1;        // ✅ TypeScript error
```

### Validation
```typescript
// Before: Invalid data sent to server
await propertiesApi.create({ bedrooms: -5 });  // ❌ Server returns 400

// After: Caught immediately
await validatedPropertiesApi.create({ bedrooms: -5 });
// ✅ Throws: Invalid request data: bedrooms: Number must be greater than or equal to 0
```

### Debugging
```typescript
// Before: Unclear errors
Error: Request failed with status code 400

// After: Clear, specific errors
Error: Invalid request data: 
  - addressLine1: String must contain at least 1 character(s)
  - postcode: Required
```

### API Contract Changes
```typescript
// Scenario: Backend adds required field 'landlordId' to Property

// Before: Runtime error when accessing property.landlordId
properties.map(p => p.landlordId)  // ❌ undefined, breaks app

// After: Caught immediately
await validatedPropertiesApi.list()
// ✅ Throws: Invalid response data: landlordId: Required
// Developer knows to update frontend immediately
```

## Gradual Migration Strategy

You don't need to migrate everything at once:

1. **Start with new features** - Use validated API for all new code
2. **Migrate high-risk areas** - Forms with complex validation
3. **Migrate frequently-changed areas** - APIs that change often
4. **Keep old API available** - Both apis can coexist during migration

```typescript
// Both APIs available during migration
import { api } from '../lib/api';                    // Old, unvalidated
import { validatedPropertiesApi } from '../lib/validated-api';  // New, validated

// Use whichever is appropriate for your use case
```

## Testing Migration

After migration, test that:

1. ✅ Form validation works correctly
2. ✅ Error messages are clear and helpful
3. ✅ TypeScript autocomplete works in your IDE
4. ✅ All API calls still succeed with valid data
5. ✅ Invalid data is caught early with clear messages

## Common Issues

### Issue: TypeScript errors after migration
**Solution:** Update your types to match the schema types
```typescript
// Before
interface FormData {
  address: string;  // Wrong field name
}

// After
interface FormData {
  addressLine1: string;  // Matches schema
}
```

### Issue: "Invalid response data" errors in production
**Solution:** This means the API changed without updating the schema. Update the schema to match the new API response, or ask backend to revert the breaking change.

### Issue: Validation is too strict
**Solution:** Adjust the schema to match your actual requirements
```typescript
// If empty strings should be allowed:
z.string()  // Instead of z.string().min(1)

// If negative numbers should be allowed:
z.number()  // Instead of z.number().min(0)
```

## Questions?

See the full documentation:
- [Contract Testing Guide](../CONTRACT_TESTING_GUIDE.md)
- [Backend Test README](../backend/test/README.md)
- [Zod Documentation](https://zod.dev)
