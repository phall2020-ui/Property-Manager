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

### Create Ticket (Landlord)
```bash
export LANDLORD_TOKEN="landlord_access_token_here"

curl -X POST http://localhost:3001/api/landlord/tickets \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop_x",
    "title": "Boiler not firing",
    "category": "Heating",
    "description": "Reported by tenant via phone. Please dispatch contractor.",
    "priority": "STANDARD"
  }'
```

Expected: 201 Created with ticket object. Ticket will be visible to the tenant immediately.

Note:
- `tenancyId` is optional. If not provided, the latest active tenancy for the property is automatically selected.
- Ticket will have `createdByRole: "LANDLORD"`

### Propose Appointment (Contractor)
```bash
export CONTRACTOR_TOKEN="contractor_access_token_here"
export TICKET_ID="ticket_id_here"

curl -X POST http://localhost:3001/api/tickets/$TICKET_ID/appointments \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startAt": "2024-12-15T10:00:00Z",
    "endAt": "2024-12-15T12:00:00Z",
    "notes": "Morning slot available"
  }'
```

Expected: 201 Created with appointment object
Note: Ticket must be in APPROVED status and contractor must be assigned

### Confirm Appointment (Tenant or Landlord)
```bash
export APPOINTMENT_ID="appointment_id_here"

curl -X POST http://localhost:3001/api/tickets/appointments/$APPOINTMENT_ID/confirm \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 200 OK with confirmed appointment
Side effects:
- Ticket status changes to SCHEDULED
- Auto-transition job scheduled to move ticket to IN_PROGRESS at appointment start time
- Tenant and contractor receive notifications

### Get Ticket Appointments
```bash
curl -X GET http://localhost:3001/api/tickets/$TICKET_ID/appointments \
  -H "Authorization: Bearer $TOKEN"
```

Expected: List of appointments for the ticket

### Get Appointment Details
```bash
curl -X GET http://localhost:3001/api/tickets/appointments/$APPOINTMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Appointment object with ticket and contractor details

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
- `HIGH` - Needs attention soon
- `URGENT` - Critical issue requiring immediate attention

## Ticket Status Flow

Tickets follow this state machine:

1. **OPEN** - Initial state when ticket is created
2. **TRIAGED** - Ticket has been reviewed and prioritized
3. **QUOTED** - Contractor has submitted a quote
4. **APPROVED** - Landlord has approved the quote
5. **SCHEDULED** - Appointment has been confirmed (via appointment.confirm)
6. **IN_PROGRESS** - Work has started (automatic transition at appointment start time)
7. **COMPLETED** - Work is finished
8. **AUDITED** - Landlord has reviewed completion

### Automatic Status Transitions

**SCHEDULED → IN_PROGRESS**
- When an appointment is confirmed, a background job is scheduled
- At the appointment start time (within grace period), the ticket automatically transitions to IN_PROGRESS
- Timeline event "job.started" is created with actor=SYSTEM
- Notifications sent to tenant, contractor, and landlord

**No-Show Handling**
- If ticket remains SCHEDULED for 60+ minutes after start time, it's flagged as a no-show candidate
- Notifications sent to landlord and tenant
- Manual intervention required to reschedule

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

## Ticket Operations

### Assign Ticket to Contractor
```bash
export TICKET_ID="ticket_id_here"
export CONTRACTOR_ID="contractor_user_id_here"

# Landlord or OPS assigns ticket to contractor
curl -X PATCH http://localhost:4000/api/tickets/$TICKET_ID/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorId": "'$CONTRACTOR_ID'"
  }'
```

Expected: 200 OK with updated ticket including assigned contractor details
Note: Only landlords and OPS users can assign tickets

### Update Ticket Status
```bash
# Update ticket status
curl -X PATCH http://localhost:4000/api/tickets/$TICKET_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "TRIAGED"
  }'
```

Expected: 200 OK with updated ticket status
Available statuses: OPEN, TRIAGED, QUOTED, APPROVED, SCHEDULED, IN_PROGRESS, COMPLETED, AUDITED, CANCELLED

### Submit Quote (Contractor)
```bash
export CONTRACTOR_TOKEN="contractor_access_token_here"

curl -X POST http://localhost:4000/api/tickets/$TICKET_ID/quote \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "notes": "Parts and labor included. Will take approximately 2 hours."
  }'
```

Expected: 201 Created with quote object
Note: Ticket status will automatically update to QUOTED

### Approve Ticket/Quote (Landlord)
```bash
export LANDLORD_TOKEN="landlord_access_token_here"

# With idempotency key for safety
curl -X POST http://localhost:4000/api/tickets/$TICKET_ID/approve \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{}'
```

Expected: 200 OK with approved ticket
Note: Ticket status will automatically update to APPROVED

### Complete Ticket (Contractor)
```bash
curl -X POST http://localhost:4000/api/tickets/$TICKET_ID/complete \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "completionNotes": "Replaced faulty valve and tested system. All working correctly."
  }'
```

Expected: 200 OK with completed ticket
Note: Ticket status will automatically update to COMPLETED

### Upload Ticket Attachment
```bash
# Upload a file to a ticket
curl -X POST http://localhost:4000/api/tickets/$TICKET_ID/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/photo.jpg"
```

Expected: 201 Created with attachment object
Supported formats: Images (jpg, png, gif, webp), Documents (pdf, doc, docx, txt), Spreadsheets (xls, xlsx, csv)
Max file size: 10MB

### Get Ticket Timeline
```bash
# Get all timeline events for a ticket
curl -X GET http://localhost:4000/api/tickets/$TICKET_ID/timeline \
  -H "Authorization: Bearer $TOKEN"
```

Expected: List of timeline events showing ticket history (creation, status changes, quotes, approvals, etc.)

## Bulk Operations (OPS Only)

### Bulk Assign Tickets
```bash
export OPS_TOKEN="ops_user_access_token_here"

curl -X POST http://localhost:4000/api/tickets/bulk/assign \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds": ["ticket1", "ticket2", "ticket3"],
    "contractorId": "'$CONTRACTOR_ID'"
  }'
```

Expected: 200 OK or 207 Multi-Status with results for each ticket

### Bulk Update Status
```bash
curl -X POST http://localhost:4000/api/tickets/bulk/status \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds": ["ticket1", "ticket2"],
    "status": "TRIAGED"
  }'
```

Expected: 200 OK with bulk update results

### Bulk Close Tickets
```bash
curl -X POST http://localhost:4000/api/tickets/bulk/close \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: bulk-close-123" \
  -d '{
    "ticket_ids": ["ticket1", "ticket2", "ticket3"],
    "resolution_note": "Issue resolved - no further action required"
  }'
```

Expected: 200 OK (all closed) or 207 Multi-Status (partial success)

### Bulk Reassign Tickets
```bash
curl -X POST http://localhost:4000/api/tickets/bulk/reassign \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: bulk-reassign-456" \
  -d '{
    "ticket_ids": ["ticket1", "ticket2"],
    "contractor_id": "new-contractor-id"
  }'
```

Expected: 200 OK (all reassigned) or 207 Multi-Status (partial success)

### Bulk Tag Tickets
```bash
curl -X POST http://localhost:4000/api/tickets/bulk/tag \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_ids": ["ticket1", "ticket2"],
    "add": ["urgent", "plumbing"],
    "remove": ["routine"]
  }'
```

Expected: 200 OK (all tagged) or 207 Multi-Status (partial success)

### Bulk Update Category
```bash
curl -X POST http://localhost:4000/api/tickets/bulk/category \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_ids": ["ticket1", "ticket2"],
    "category": "PLUMBING"
  }'
```

Expected: 200 OK (all updated) or 207 Multi-Status (partial success)

## Advanced Filtering

### Search Tickets with Filters
```bash
# Search by text query (searches title and description)
curl -X GET "http://localhost:4000/api/tickets?q=leak" \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl -X GET "http://localhost:4000/api/tickets?date_from=2024-01-01&date_to=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"

# Filter by category and priority
curl -X GET "http://localhost:4000/api/tickets?category=plumbing&priority=HIGH" \
  -H "Authorization: Bearer $TOKEN"

# Filter by assigned contractor
curl -X GET "http://localhost:4000/api/tickets?contractor_id=$CONTRACTOR_ID" \
  -H "Authorization: Bearer $TOKEN"

# Pagination and sorting
curl -X GET "http://localhost:4000/api/tickets?page=1&page_size=25&sort_by=created_at&sort_dir=desc" \
  -H "Authorization: Bearer $TOKEN"

# Combined filters
curl -X GET "http://localhost:4000/api/tickets?status=OPEN&priority=URGENT&sort_by=created_at&sort_dir=asc&page=1&page_size=50" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Paginated list of tickets matching filters with metadata:
```json
{
  "items": [...],
  "page": 1,
  "page_size": 25,
  "total": 145,
  "has_next": true
}
```

## Authentication Examples

### Refresh Access Token
```bash
# Refresh token using httpOnly cookie
curl -X POST http://localhost:4000/api/auth/refresh \
  --cookie "refreshToken=your_refresh_token" \
  -H "Content-Type: application/json"
```

Expected: 200 OK with new access token

### Logout
```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  --cookie "refreshToken=your_refresh_token"
```

Expected: 200 OK, refresh token cookie cleared

### Get Current User
```bash
curl -X GET http://localhost:4000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

Expected: User object with profile information and organization roles

## Rate Limiting

Most endpoints have rate limiting applied:
- Ticket creation: 5 requests per minute
- Global default: 100 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Idempotency

Some endpoints support idempotency keys to prevent duplicate operations:
- Ticket approval
- Bulk operations

Include the `Idempotency-Key` header with a unique identifier:
```bash
-H "Idempotency-Key: unique-operation-id-123"
```

Repeated requests with the same key will return the cached result instead of creating duplicates.
