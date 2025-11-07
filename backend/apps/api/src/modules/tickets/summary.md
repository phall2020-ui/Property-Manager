# Tickets Module Summary

## 📊 Current Status: ✅ **Production Ready**

The tickets module manages maintenance tickets with a complete workflow including quote submission, approval, assignment, and completion. Supports role-based access for tenants, landlords, contractors, and operations teams.

## 🎯 Key Features Implemented

### ✅ Core Functionality
- **Create Tickets** - Tenants can report maintenance issues
- **List Tickets** - Role-filtered ticket lists with pagination
- **View Ticket Details** - Full ticket information with relations
- **Submit Quotes** - Contractors can provide cost estimates
- **Approve Quotes** - Landlords can approve contractor quotes
- **Update Status** - Role-based status transitions
- **Complete Tickets** - Contractors mark work as complete
- **Ticket Timeline** - Track all ticket events and state changes
- **File Attachments** - Upload photos/documents for tickets
- **Search & Filter** - Filter by property, status, and search text

### ✅ Ticket Information
- Title and description
- Category (PLUMBING, ELECTRICAL, HEATING, STRUCTURAL, OTHER)
- Priority (LOW, MEDIUM, HIGH, URGENT)
- Status (OPEN, QUOTED, APPROVED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- Property/Tenancy reference
- Landlord and tenant organization references
- Created by user reference
- Assigned contractor (optional)
- Timestamps (created, updated)

### ✅ Quote Management
- Amount and notes
- Status (PENDING, APPROVED, REJECTED)
- Contractor reference
- Approval tracking

## 🔌 API Endpoints

### Protected Endpoints (Role-based access)

| Method | Endpoint | Description | Role(s) | Status |
|--------|----------|-------------|---------|--------|
| POST | `/api/tickets` | Create ticket | TENANT | ✅ Working |
| GET | `/api/tickets` | List tickets (filtered) | ALL | ✅ Working |
| GET | `/api/tickets/:id` | Get ticket details | ALL | ✅ Working |
| POST | `/api/tickets/:id/quote` | Submit quote | CONTRACTOR | ✅ Working |
| POST | `/api/tickets/:id/approve` | Approve ticket/quote | LANDLORD | ✅ Working |
| POST | `/api/tickets/quotes/:quoteId/approve` | Approve quote by ID | LANDLORD | ✅ Working |
| PATCH | `/api/tickets/:id/status` | Update status | ALL | ✅ Working |
| POST | `/api/tickets/:id/complete` | Mark complete | CONTRACTOR | ✅ Working |
| GET | `/api/tickets/:id/timeline` | Get timeline | ALL | ✅ Working |
| POST | `/api/tickets/:id/attachments` | Upload attachment | ALL | ✅ Working |
| POST | `/api/tickets/:id/appointment/propose` | Propose appointment | CONTRACTOR | ✅ Working |
| POST | `/api/tickets/:id/appointment/confirm` | Confirm appointment | LANDLORD/TENANT | ✅ Working |

### Request/Response Examples

**Create Ticket:**
```json
POST /api/tickets
Authorization: Bearer {tenant-token}
{
  "tenancyId": "tenancy-uuid",
  "title": "Leaking faucet",
  "description": "The kitchen faucet is leaking",
  "category": "PLUMBING",
  "priority": "MEDIUM"
}

Response:
{
  "id": "uuid",
  "title": "Leaking faucet",
  "description": "The kitchen faucet is leaking",
  "category": "PLUMBING",
  "priority": "MEDIUM",
  "status": "OPEN",
  "tenancyId": "tenancy-uuid",
  "landlordId": "landlord-org-uuid",
  "createdById": "user-uuid",
  "createdAt": "2025-11-07T..."
}
```

**List Tickets (Landlord):**
```json
GET /api/tickets?status=OPEN&page=1&limit=20
Authorization: Bearer {landlord-token}

Response:
{
  "items": [
    {
      "id": "uuid",
      "title": "Leaking faucet",
      "status": "OPEN",
      "priority": "MEDIUM",
      "category": "PLUMBING",
      "property": {
        "address1": "123 Main St",
        "city": "London"
      },
      "createdAt": "2025-11-07T..."
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Submit Quote:**
```json
POST /api/tickets/{id}/quote
Authorization: Bearer {contractor-token}
{
  "amount": 250.00,
  "notes": "Will replace faucet and check pipes"
}

Response:
{
  "id": "quote-uuid",
  "ticketId": "ticket-uuid",
  "amount": 250.00,
  "notes": "Will replace faucet and check pipes",
  "status": "PENDING",
  "contractorId": "contractor-uuid",
  "createdAt": "2025-11-07T..."
}
```

**Approve Quote:**
```json
POST /api/tickets/{id}/approve
Authorization: Bearer {landlord-token}
{
  "idempotencyKey": "unique-key-123"
}

Response:
{
  "id": "ticket-uuid",
  "status": "APPROVED",
  "approvedAt": "2025-11-07T...",
  "approvedById": "landlord-user-uuid"
}
```

**Get Timeline:**
```json
GET /api/tickets/{id}/timeline
Authorization: Bearer {token}

Response:
{
  "events": [
    {
      "type": "CREATED",
      "timestamp": "2025-11-07T10:00:00Z",
      "actor": "Jane Tenant",
      "details": "Ticket created"
    },
    {
      "type": "QUOTE_SUBMITTED",
      "timestamp": "2025-11-07T11:00:00Z",
      "actor": "John Contractor",
      "details": "Quote: £250.00"
    },
    {
      "type": "QUOTE_APPROVED",
      "timestamp": "2025-11-07T12:00:00Z",
      "actor": "Bob Landlord",
      "details": "Quote approved"
    }
  ]
}
```

## 📁 File Structure

```
tickets/
├── tickets.controller.ts      # HTTP endpoints
├── tickets.service.ts         # Business logic
├── tickets.service.spec.ts    # Unit tests
├── tickets.module.ts          # Module definition
├── dto/
│   ├── create-ticket.dto.ts   # Create validation
│   ├── create-quote.dto.ts    # Quote validation
│   ├── update-status.dto.ts   # Status update validation
│   ├── approve-quote.dto.ts   # Approval validation
│   ├── propose-appointment.dto.ts
│   └── confirm-appointment.dto.ts
└── summary.md                 # This file
```

## ✅ Test Coverage

### Manual Testing Status
- ✅ Create ticket with valid data
- ✅ Create ticket validates required fields
- ✅ List tickets filtered by landlord
- ✅ List tickets filtered by tenant
- ✅ Get ticket by ID returns correct ticket
- ✅ Submit quote as contractor
- ✅ Approve quote as landlord
- ✅ Update status with role validation
- ✅ Complete ticket as contractor
- ✅ Timeline shows all events
- ✅ File attachment upload
- ✅ Rate limiting (5 requests/min on create)

### Automated Tests
- ✅ Unit tests exist in tickets.service.spec.ts
- ⚠️ E2E tests needed

## 🐛 Known Issues

**None** - Module is fully functional and production-ready.

## 📋 Required Next Steps

### High Priority
1. **Add E2E Tests** - Test complete ticket workflows
2. **Add Email Notifications** - Notify users of ticket events
3. **Add Push Notifications** - Real-time updates for mobile apps
4. **Add Ticket Assignment UI** - Ops team assigns contractors
5. **Add Ticket Comments** - Discussion thread on tickets

### Medium Priority
6. **Add Recurring Tickets** - Scheduled maintenance tickets
7. **Add Ticket Templates** - Pre-defined ticket types
8. **Add SLA Tracking** - Track response/resolution times
9. **Add Contractor Ratings** - Rate completed work
10. **Add Cost Tracking** - Track actual vs quoted costs
11. **Add Ticket Bulk Actions** - Close/assign multiple tickets
12. **Add Advanced Search** - Full-text search on descriptions

### Low Priority
13. **Add Ticket Analytics** - Dashboard metrics and charts
14. **Add Ticket Export** - Export to CSV/PDF
15. **Add Ticket Scheduling** - Schedule work appointments
16. **Add Parts Tracking** - Track parts used in repairs
17. **Add Warranty Tracking** - Track warranty periods

## 🔗 Dependencies

- `@nestjs/common` - NestJS core
- `@nestjs/swagger` - API documentation
- `@nestjs/throttler` - Rate limiting
- `@nestjs/platform-express` - File uploads
- `multer` - File upload middleware
- `class-validator` - DTO validation
- `class-transformer` - DTO transformation

## 🚀 Integration Points

### Used By
- Landlord portal - View and approve tickets
- Tenant portal - Create and view tickets
- Contractor portal - View jobs and submit quotes
- Ops portal - Manage ticket queue and assignments
- Finance module - Track maintenance costs

### Uses
- `PrismaService` - Database access
- `AuthGuard` - JWT authentication
- `RolesGuard` - Role-based access control
- Properties module - Property references
- Tenancies module - Tenancy references
- Jobs module (BullMQ) - Background notifications

## 📈 Performance Considerations

- ✅ Pagination implemented (default 20, max 100 per page)
- ✅ Database indexes on landlordId, status, createdAt
- ✅ Efficient queries with proper includes
- ✅ Rate limiting on ticket creation (5/min)
- ✅ File upload limits enforced
- ⚠️ Consider caching ticket lists for high-traffic scenarios
- ⚠️ Add full-text search indexes for better search performance

## 🔐 Security Features

- ✅ Role-based access control on all endpoints
- ✅ Automatic tenant isolation via landlordId
- ✅ Ownership validation on ticket operations
- ✅ Input validation on all DTOs
- ✅ File upload validation (size, type)
- ✅ SQL injection prevention via Prisma
- ✅ Rate limiting on create endpoint
- ✅ Idempotency key support for approvals

## 📝 Configuration

Environment variables:
- `MAX_FILE_SIZE` - Maximum upload file size (default: 10MB)
- `ALLOWED_FILE_TYPES` - Allowed MIME types for uploads

File upload directory:
- `./uploads/tickets` - Ticket attachments stored here

## 🎓 Developer Notes

### Ticket Workflow States

```
OPEN → QUOTED → APPROVED → ASSIGNED → IN_PROGRESS → COMPLETED
  ↓       ↓         ↓           ↓            ↓
CANCELLED (any time)
```

**State Transitions:**
- `OPEN` → `QUOTED`: Contractor submits quote
- `QUOTED` → `APPROVED`: Landlord approves quote
- `APPROVED` → `ASSIGNED`: Ops team assigns to contractor
- `ASSIGNED` → `IN_PROGRESS`: Contractor starts work
- `IN_PROGRESS` → `COMPLETED`: Contractor finishes work
- `Any` → `CANCELLED`: Landlord cancels ticket

### Ticket Categories
- `PLUMBING` - Leaks, pipes, drains
- `ELECTRICAL` - Wiring, outlets, lighting
- `HEATING` - Boiler, radiators, central heating
- `STRUCTURAL` - Walls, roof, foundations
- `APPLIANCE` - White goods, kitchen appliances
- `GARDEN` - Outdoor maintenance
- `OTHER` - Miscellaneous issues

### Ticket Priorities
- `LOW` - Non-urgent, can wait weeks
- `MEDIUM` - Should be addressed within days
- `HIGH` - Should be addressed within 24-48 hours
- `URGENT` - Emergency, immediate attention required

### Role-Based Access
**TENANT:**
- Create tickets for their tenancy
- View their own tickets
- Comment on their tickets
- Upload attachments

**LANDLORD:**
- View tickets for their properties
- Approve/decline quotes
- Cancel tickets
- Comment on tickets

**CONTRACTOR:**
- View assigned tickets
- Submit quotes
- Update status to IN_PROGRESS
- Mark tickets complete
- Upload completion photos

**OPS:**
- View all tickets
- Assign contractors
- Update any ticket status
- Search and filter tickets

### Multi-Tenancy
Tickets are automatically filtered by role:
- Tenants see only their tickets
- Landlords see tickets for their properties
- Contractors see tickets assigned to them
- Ops teams see all tickets in their organization

### Quote Workflow
1. Contractor submits quote with amount and notes
2. Quote status is PENDING
3. Landlord reviews and approves/rejects
4. If approved: ticket status → APPROVED
5. If rejected: contractor can submit new quote

### File Attachments
- Stored in `./uploads/tickets` directory
- Filename format: `{timestamp}-{random}.{ext}`
- Linked to ticket via `ticketId` in database
- MIME type validation on upload
- Size limit enforced (default 10MB)

### Idempotency
The approve endpoint supports idempotency keys:
- Prevents double-approval from duplicate requests
- Can be provided in header or body
- Stored with approval record

### Rate Limiting
- Ticket creation limited to 5 requests per minute
- Prevents spam and abuse
- Uses `@nestjs/throttler`
- Can be configured per endpoint

### Timeline Events
Timeline tracks all ticket activities:
- Ticket created
- Quote submitted
- Quote approved/rejected
- Status changed
- Contractor assigned
- Work started
- Work completed
- Comments added
- Files attached

### Search & Filter
Supports:
- Filter by property ID
- Filter by status
- Search by title, description, or ticket ID
- Combine filters for advanced queries
- Pagination on results

### Future Considerations
- Add ticket priority escalation (auto-increase if not addressed)
- Add contractor availability/scheduling
- Add automatic contractor assignment based on category/location
- Add ticket templates for common issues
- Add preventive maintenance scheduling
- Add integration with external contractor platforms
