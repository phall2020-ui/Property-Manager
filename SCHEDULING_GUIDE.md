# Ticketing & Scheduling System Guide

## Overview

The Property Management system includes a comprehensive ticketing and scheduling system that allows:
- **Landlords** to create maintenance tickets for their properties
- **Tenants** to report issues
- **Contractors** to propose appointment times
- **Automatic status transitions** when appointments start

## Features

### 1. Landlord Ticket Creation

Landlords can create maintenance tickets on behalf of tenants:

**API Endpoint:** `POST /landlord/tickets`

**Request:**
```json
{
  "propertyId": "prop-123",
  "tenancyId": "ten-456",  // Optional - auto-selects latest active if omitted
  "title": "Boiler not firing",
  "category": "Heating",
  "description": "Reported by tenant via phone. Please dispatch contractor.",
  "priority": "STANDARD"
}
```

**Features:**
- Property ownership validation
- Automatic tenancy selection (latest active)
- Ticket visible to tenant immediately
- Timeline event created with `createdByRole: LANDLORD`

### 2. Appointment Scheduling

#### Propose Appointment (Contractor)

After a ticket is approved, the contractor proposes appointment slots:

**API Endpoint:** `POST /tickets/:ticketId/appointments`

**Request:**
```json
{
  "startAt": "2024-12-15T10:00:00Z",
  "endAt": "2024-12-15T12:00:00Z",
  "notes": "Morning slot available"
}
```

**Requirements:**
- Ticket must be in `APPROVED` status
- Contractor must be assigned to the ticket

#### Confirm Appointment (Tenant/Landlord)

Tenant or landlord confirms the proposed appointment:

**API Endpoint:** `POST /appointments/:appointmentId/confirm`

**Side Effects:**
1. Ticket status → `SCHEDULED`
2. Appointment fields denormalized to ticket (`scheduledWindowStart`, `scheduledWindowEnd`)
3. Background job scheduled for auto-transition at start time
4. Notifications sent to all parties

### 3. Automatic Status Transitions

#### SCHEDULED → IN_PROGRESS

When an appointment is confirmed, a delayed background job is enqueued:

```typescript
// Job scheduled at: appointment.startAt
{
  jobName: 'appointment.start',
  data: {
    appointmentId: 'appt-123',
    ticketId: 'ticket-456',
    startAt: '2024-12-15T10:00:00Z'
  },
  delay: calculateDelay(startAt)
}
```

**Worker Logic:**
1. Fetch appointment and verify status is `CONFIRMED`
2. Fetch ticket and verify status is `SCHEDULED`
3. Check current time is within grace period (0-5 minutes after start)
4. Update ticket status to `IN_PROGRESS`, set `inProgressAt`
5. Create timeline event with `actor: SYSTEM`
6. Emit SSE event for real-time updates
7. Send notifications to tenant, contractor, landlord

**Idempotency:**
- Job key: `appointment-start-{appointmentId}`
- Skips if ticket already transitioned
- Handles manual status changes gracefully

#### No-Show Detection

If ticket remains `SCHEDULED` for 60+ minutes after start time:
- Flag as no-show candidate
- Timeline event: "No check-in detected"
- Notify landlord and tenant
- Offer quick reschedule action

**Configuration:**
```env
JOB_START_GRACE_MINUTES=5      # Grace period to start (default: 0-5)
NO_SHOW_TIMEOUT_MINUTES=60     # Time before marking no-show
```

### 4. State Machine

```
OPEN → TRIAGED → QUOTED → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED → AUDITED
  ↓                                      ↓             ↓
CANCELLED ←──────────────────────────────┴─────────────┘
```

**Transitions:**
- `APPROVED → SCHEDULED`: Manual (via appointment confirmation)
- `SCHEDULED → IN_PROGRESS`: **Automatic** (at appointment start time)
- All others: Manual (via API endpoints)

### 5. Frontend UI

#### Landlord Portal

**Create Ticket Button:**
- Displays on `/tickets` page
- Opens modal with property selector
- Auto-selects latest active tenancy
- Categories: Plumbing, Electrical, Heating, Appliances, Structural, Other
- Priorities: LOW, STANDARD, HIGH, URGENT

**Property Selector:**
```tsx
<CreateTicketModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

**Features:**
- Searchable property dropdown
- Shows full address (addressLine1, city, postcode)
- Tenancy auto-selection with override
- Form validation
- Toast notifications on success/error

#### Ticket Status Display

All portals show automatic transitions:
```tsx
<Badge color={getStatusColor(status)}>
  {status === 'IN_PROGRESS' && ticket.inProgressAt && (
    <span title="Started automatically">🤖</span>
  )}
  {status}
</Badge>
```

### 6. Database Schema

#### Ticket Model

```prisma
model Ticket {
  id                    String    @id @default(uuid())
  landlordId            String
  propertyId            String?
  tenancyId             String?
  title                 String
  category              String?
  description           String
  createdById           String
  createdByRole         String    @default("TENANT") // LANDLORD, TENANT, OPS
  assignedToId          String?
  priority              String
  status                String    @default("OPEN")
  
  // New fields
  inProgressAt          DateTime? // When auto-transitioned to IN_PROGRESS
  noShowAt              DateTime? // If job didn't start within grace
  scheduledWindowStart  DateTime? // Denormalized from Appointment
  scheduledWindowEnd    DateTime? // Denormalized from Appointment
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  appointments          Appointment[]
  
  @@index([status, propertyId])
  @@index([scheduledWindowStart])
}
```

#### Appointment Model

```prisma
model Appointment {
  id               String    @id @default(uuid())
  ticketId         String
  contractorId     String
  startAt          DateTime  // Proposed/confirmed start time
  endAt            DateTime?
  status           String    @default("PROPOSED") // PROPOSED, CONFIRMED, CANCELLED
  proposedBy       String
  confirmedBy      String?   // TENANT or OPS/LANDLORD
  confirmedAt      DateTime?
  cancelledBy      String?
  cancelledAt      DateTime?
  notes            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  ticket           Ticket    @relation(fields: [ticketId], references: [id])
  
  @@index([startAt])
  @@index([status, startAt])
}
```

### 7. Background Jobs

The system uses **BullMQ** with Redis for job processing:

**Queues:**
- `tickets` - Ticket lifecycle events
- `notifications` - Email/SMS notifications
- `dead-letter` - Failed jobs for manual inspection

**Job Types:**
```typescript
// Enqueued when appointment confirmed
{
  name: 'appointment.start',
  data: {
    appointmentId: string,
    ticketId: string,
    startAt: string (ISO 8601)
  },
  opts: {
    jobId: `appointment-start-${appointmentId}`,
    delay: milliseconds until startAt
  }
}
```

**Worker Processor:**
```typescript
// apps/api/src/modules/jobs/processors/ticket-jobs.processor.ts
case 'appointment.start':
  return await this.handleAppointmentStart(job);
```

**Graceful Degradation:**
If Redis is not available, jobs are logged but not processed:
```
⚠️  REDIS_URL not configured - Background jobs will be logged but not processed
⚠️  Set REDIS_URL environment variable to enable background job processing
```

### 8. Testing

#### Unit Tests

**Landlord Ticket Creation:**
```bash
npm test -- tickets.service.spec
```

Tests:
- ✅ Creates ticket with `createdByRole=LANDLORD`
- ✅ Auto-selects latest active tenancy
- ✅ Validates property ownership
- ✅ Rejects invalid tenancy

**Auto-Transition Logic:**
```bash
npm test -- ticket-jobs.processor.spec
```

Tests:
- ✅ Transitions ticket to IN_PROGRESS at start time
- ✅ Skips if appointment not found
- ✅ Skips if appointment not confirmed
- ✅ Idempotent (skips if already transitioned)

#### Integration Tests

Full flow test:
1. Landlord creates ticket → `OPEN`
2. Triage → `TRIAGED`
3. Assign contractor
4. Contractor submits quote → `QUOTED`
5. Landlord approves → `APPROVED`
6. Contractor proposes appointment
7. Tenant confirms → `SCHEDULED`
8. Fast-forward time → Auto-transition to `IN_PROGRESS`
9. Verify timeline event and notifications

### 9. Deployment

**Environment Variables:**
```env
# Required for background jobs
REDIS_URL=redis://localhost:6379

# Job configuration
JOB_START_GRACE_MINUTES=5
NO_SHOW_TIMEOUT_MINUTES=60
```

**Production Setup:**
1. Deploy Redis instance (e.g., AWS ElastiCache, Redis Cloud)
2. Set `REDIS_URL` in environment
3. Verify worker starts: `✅ Redis connected - Background jobs enabled`
4. Monitor job queues in BullMQ dashboard

### 10. Monitoring

**Logs:**
```
[JobsService] Enqueuing appointment.start job for appointment appt-123
[TicketJobsProcessor] Processing job appointment.start with ID job-456
[TicketJobsProcessor] Ticket ticket-789 auto-transitioned to IN_PROGRESS
```

**Metrics:**
- Job success/failure rate
- Average delay between schedule and execution
- No-show detection rate
- Manual vs automatic transitions

### 11. API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/landlord/tickets` | POST | LANDLORD | Create ticket for property |
| `/tickets/:id/appointments` | POST | CONTRACTOR | Propose appointment |
| `/appointments/:id/confirm` | POST | TENANT/LANDLORD | Confirm appointment |
| `/tickets/:id/appointments` | GET | ALL | List ticket appointments |
| `/appointments/:id` | GET | ALL | Get appointment details |

### 12. Error Handling

**Common Errors:**

```json
// Property not owned
{
  "statusCode": 403,
  "message": "You do not own this property"
}

// Contractor not assigned
{
  "statusCode": 403,
  "message": "Only assigned contractor can propose appointments"
}

// Ticket not in APPROVED state
{
  "statusCode": 403,
  "message": "Can only propose appointments for approved tickets"
}

// Appointment already confirmed
{
  "statusCode": 403,
  "message": "Can only confirm proposed appointments"
}
```

## Quick Start

1. **Create a ticket (Landlord):**
```bash
curl -X POST http://localhost:3001/api/landlord/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "prop-123",
    "title": "Boiler not firing",
    "category": "Heating",
    "description": "Tenant reported issue",
    "priority": "STANDARD"
  }'
```

2. **Propose appointment (Contractor):**
```bash
curl -X POST http://localhost:3001/api/tickets/$TICKET_ID/appointments \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startAt": "2024-12-15T10:00:00Z",
    "endAt": "2024-12-15T12:00:00Z"
  }'
```

3. **Confirm appointment (Tenant):**
```bash
curl -X POST http://localhost:3001/api/tickets/appointments/$APPOINTMENT_ID/confirm \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

4. **Wait for auto-transition:**
- At `startAt` time, ticket automatically moves to `IN_PROGRESS`
- No manual action required
- Timeline shows system actor

## Support

For issues or questions:
- Check logs: `[TicketJobsProcessor]` prefix
- Verify Redis connection: Look for `✅ Redis connected` message
- Check job queue status in BullMQ dashboard
- Review timeline events in ticket detail page
