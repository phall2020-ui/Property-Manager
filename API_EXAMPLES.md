# API Examples

This document provides curl examples for testing the key API endpoints.

## Prerequisites

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Obtain an access token by logging in or signing up.

## Authentication

### Sign Up
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "landlord@example.com",
    "password": "password123",
    "name": "John Landlord"
  }'
```

Response includes `accessToken` - save this for subsequent requests.

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "landlord@example.com",
    "password": "password123"
  }'
```

## Properties

### Create Property
```bash
export TOKEN="your_access_token_here"

curl -X POST http://localhost:3001/api/properties \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addressLine1": "123 Main Street",
    "address2": "Apt 4B",
    "city": "London",
    "postcode": "SW1A 1AA",
    "bedrooms": 2,
    "councilTaxBand": "D"
  }'
```

### List Properties
```bash
curl -X GET http://localhost:3001/api/properties \
  -H "Authorization: Bearer $TOKEN"
```

### Get Property by ID
```bash
export PROPERTY_ID="property_id_here"

curl -X GET http://localhost:3001/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Property (PATCH)
```bash
curl -X PATCH http://localhost:3001/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addressLine1": "456 Updated Street",
    "city": "Manchester",
    "postcode": "M1 1AA",
    "bedrooms": 3,
    "attributes": {
      "propertyType": "Flat",
      "furnished": "Full",
      "epcRating": "B"
    }
  }'
```

Expected: 200 OK with updated property object

#### Partial Update Example
```bash
curl -X PATCH http://localhost:3001/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bedrooms": 4
  }'
```

Expected: 200 OK with only bedrooms updated, other fields unchanged

#### Invalid Postcode Example (Error)
```bash
curl -X PATCH http://localhost:3001/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "postcode": "INVALID"
  }'
```

Expected: 400 Bad Request with validation error

## Tickets

### Create Ticket (Tenant)
```bash
export TENANT_TOKEN="tenant_access_token_here"

curl -X POST http://localhost:3001/api/tickets \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop_x",
    "tenancyId": "ten_y",
    "title": "Leaking tap",
    "category": "Plumbing",
    "description": "Kitchen tap leaking under sink",
    "priority": "STANDARD"
  }'
```

Expected: 201 Created with ticket object containing `id`

### List Tickets
```bash
# List all tickets (role-based filtering applied)
curl -X GET http://localhost:3001/api/tickets \
  -H "Authorization: Bearer $TOKEN"

# Filter by property
curl -X GET "http://localhost:3001/api/tickets?propertyId=$PROPERTY_ID" \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "http://localhost:3001/api/tickets?status=OPEN" \
  -H "Authorization: Bearer $TOKEN"

# Combine filters
curl -X GET "http://localhost:3001/api/tickets?propertyId=$PROPERTY_ID&status=OPEN" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Ticket by ID
```bash
export TICKET_ID="ticket_id_here"

curl -X GET http://localhost:3001/api/tickets/$TICKET_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Priority Values

Tickets support the following priority values:
- `LOW` - Can wait
- `STANDARD` - Normal timeframe (default)
- `MEDIUM` - Needs attention soon
- `HIGH` - Urgent

## Error Responses

All endpoints return structured error responses following RFC 7807 problem details:

```json
{
  "title": "Not Found",
  "status": 404,
  "detail": "Property not found",
  "instance": "/api/properties/non-existent-id"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Unprocessable Entity (validation failed)

## Real-time Updates

Landlords viewing the ticket list will see new tickets created by tenants within 5 seconds due to automatic polling (`refetchInterval: 5000`).

For production, consider implementing Server-Sent Events (SSE) for real-time notifications.

## Testing the Complete Flow

### 1. Tenant Creates Ticket
```bash
# Tenant creates a ticket
curl -X POST http://localhost:3001/api/tickets \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "'$PROPERTY_ID'",
    "title": "Broken heating",
    "category": "Heating",
    "description": "Central heating not working properly",
    "priority": "HIGH"
  }'
```

### 2. Landlord Views Tickets
```bash
# Landlord queries tickets for their property
curl -X GET "http://localhost:3001/api/tickets?propertyId=$PROPERTY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: The newly created ticket appears in the response (within 5 seconds if using the UI)

### 3. Landlord Edits Property
```bash
# Landlord updates property details
curl -X PATCH http://localhost:3001/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Birmingham",
    "postcode": "B1 1AA"
  }'

# Verify changes persisted
curl -X GET http://localhost:3001/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected: GET returns updated city and postcode
