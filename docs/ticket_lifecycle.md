# Ticket Lifecycle State Machine

This document describes the complete lifecycle of maintenance tickets in the property management system, including state transitions and role-based access controls.

## State Diagram

```mermaid
stateDiagram-v2
  [*] --> OPEN
  OPEN --> TRIAGED: ops.triage
  OPEN --> ASSIGNED: ops.assign_contractor
  OPEN --> CANCELLED: ops.cancel / landlord.cancel / tenant.cancel
  
  TRIAGED --> QUOTED: contractor.submit_quote
  TRIAGED --> CANCELLED: ops.cancel / landlord.cancel
  
  QUOTED --> APPROVED: landlord.approve_quote
  QUOTED --> REJECTED: landlord.reject_quote
  QUOTED --> CANCELLED: ops.cancel / landlord.cancel
  
  REJECTED --> TRIAGED: ops.reassign
  REJECTED --> CANCELLED: ops.cancel / landlord.cancel
  
  APPROVED --> SCHEDULED: contractor.propose_time + tenant.confirm / landlord.confirm
  APPROVED --> IN_PROGRESS: ops.start_work / contractor.start_work
  APPROVED --> CANCELLED: ops.cancel / landlord.cancel
  
  SCHEDULED --> IN_PROGRESS: time_confirmed / auto_transition
  SCHEDULED --> CANCELLED: ops.cancel / landlord.cancel
  
  IN_PROGRESS --> COMPLETED: contractor.close_with_report
  IN_PROGRESS --> CANCELLED: ops.cancel
  
  COMPLETED --> AUDITED: ops.audit
  
  CANCELLED --> [*]
  AUDITED --> [*]

  state OPEN {
    note right of OPEN
      Initial state when ticket created
      Visible to: Landlord, Tenant, OPS
    end note
  }
  
  state TRIAGED {
    note right of TRIAGED
      Ticket assessed and categorized
      Ready for contractor assignment
    end note
  }
  
  state QUOTED {
    note right of QUOTED
      Contractor has submitted quote
      Awaiting landlord approval
    end note
  }
  
  state APPROVED {
    note right of APPROVED
      Quote approved by landlord
      Ready for scheduling
    end note
  }
  
  state SCHEDULED {
    note right of SCHEDULED
      Appointment confirmed
      Work scheduled for specific time
    end note
  }
  
  state IN_PROGRESS {
    note right of IN_PROGRESS
      Work is actively being performed
      Contractor on-site or working
    end note
  }
  
  state COMPLETED {
    note right of COMPLETED
      Work completed by contractor
      Awaiting final audit
    end note
  }
  
  state AUDITED {
    note right of AUDITED
      Final state - work verified
      Ticket closed permanently
    end note
  }
```

## Role-Based Transition Guards

The following table shows which roles can trigger which state transitions:

| From State | To State | Allowed Roles | Action | Notes |
|------------|----------|---------------|--------|-------|
| OPEN | TRIAGED | OPS | Triage ticket | Initial assessment complete |
| OPEN | ASSIGNED | OPS | Assign contractor | Direct assignment without triage |
| OPEN | CANCELLED | TENANT, LANDLORD, OPS | Cancel ticket | Tenant can only cancel their own tickets |
| TRIAGED | QUOTED | CONTRACTOR | Submit quote | Must be assigned contractor |
| TRIAGED | CANCELLED | LANDLORD, OPS | Cancel ticket | - |
| QUOTED | APPROVED | LANDLORD | Approve quote | Must be property owner |
| QUOTED | REJECTED | LANDLORD | Reject quote | Quote amount or details unacceptable |
| QUOTED | CANCELLED | LANDLORD, OPS | Cancel ticket | - |
| REJECTED | TRIAGED | OPS | Reassign ticket | Return to triage for new contractor |
| REJECTED | CANCELLED | LANDLORD, OPS | Cancel ticket | - |
| APPROVED | SCHEDULED | CONTRACTOR + (TENANT \|\| LANDLORD) | Propose + confirm appointment | Two-step process |
| APPROVED | IN_PROGRESS | OPS, CONTRACTOR | Start work immediately | Skip scheduling |
| APPROVED | CANCELLED | LANDLORD, OPS | Cancel ticket | - |
| SCHEDULED | IN_PROGRESS | AUTO, OPS, CONTRACTOR | Begin scheduled work | Can auto-transition at appointment time |
| SCHEDULED | CANCELLED | LANDLORD, OPS | Cancel ticket | - |
| IN_PROGRESS | COMPLETED | CONTRACTOR | Complete work | Submit completion report |
| IN_PROGRESS | CANCELLED | OPS | Cancel ticket | Emergency cancellation only |
| COMPLETED | AUDITED | OPS | Audit completion | Final verification |

## Business Rules

### Ticket Creation
- **TENANT**: Can create tickets for properties they rent
- **LANDLORD**: Can create tickets for properties they own
- **OPS**: Can create tickets for any property
- Initial status is always `OPEN`

### Quote Submission
- Only **CONTRACTOR** assigned to ticket can submit quotes
- Multiple quotes can be submitted, latest one is used
- Quote must include amount and optional notes
- Quote amount must be between $10 and $50,000

### Quote Approval
- Only **LANDLORD** who owns the property can approve quotes
- Approving a quote transitions ticket to `APPROVED` state
- Auto-approval may apply if quote is below landlord's threshold

### Appointment Scheduling
- Only **CONTRACTOR** can propose appointment times
- **TENANT** or **LANDLORD** can confirm appointments
- Confirming appointment transitions ticket to `SCHEDULED`
- System auto-transitions to `IN_PROGRESS` at appointment start time

### Work Completion
- Only **CONTRACTOR** can mark work as complete
- Completion requires optional notes/report
- Ticket transitions to `COMPLETED` state
- **OPS** performs final audit to transition to `AUDITED`

### Cancellation
- **TENANT** can only cancel their own tickets when in `OPEN` state
- **LANDLORD** can cancel tickets for their properties at any stage (except `COMPLETED`, `AUDITED`)
- **OPS** can cancel any ticket at any stage

## Notification Matrix

Events trigger notifications to relevant parties:

| Event | Recipients | Channels |
|-------|-----------|----------|
| `ticket.created` | Landlord, OPS | In-app + Email |
| `ticket.assigned` | Contractor | Email + In-app |
| `ticket.assigned` | Tenant | In-app |
| `quote.submitted` | Landlord, OPS | In-app + Email |
| `quote.approved` | Contractor | Email + In-app |
| `quote.approved` | Tenant | In-app |
| `appointment.proposed` | Tenant, Landlord | In-app + Email |
| `appointment.confirmed` | Contractor | Email + In-app |
| `ticket.in_progress` | Tenant, Landlord | In-app |
| `ticket.completed` | Tenant, Landlord, OPS | In-app + Email |
| `ticket.closed` | Tenant, Landlord, OPS | In-app |
| `ticket.cancelled` | All parties | In-app + Email |

## API Error Codes

### State Transition Errors

- **403**: Invalid role for transition
  ```json
  {
    "code": "FORBIDDEN",
    "message": "Role TENANT cannot transition ticket from OPEN to TRIAGED",
    "details": {
      "currentState": "OPEN",
      "targetState": "TRIAGED",
      "userRole": "TENANT"
    }
  }
  ```

- **409**: Invalid state transition
  ```json
  {
    "code": "INVALID_TRANSITION",
    "message": "Invalid transition from COMPLETED to OPEN",
    "details": {
      "currentState": "COMPLETED",
      "targetState": "OPEN",
      "allowedTransitions": ["AUDITED"]
    }
  }
  ```

- **404**: Ticket not found
  ```json
  {
    "code": "NOT_FOUND",
    "message": "Ticket not found",
    "details": {
      "ticketId": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
  ```

## Concurrency Controls

To prevent race conditions during state transitions:

1. **Optimistic Locking**: Use `updatedAt` field for version checking
2. **Idempotency Keys**: Support `Idempotency-Key` header for all state-changing operations
3. **Transaction Isolation**: Each state transition is wrapped in a database transaction
4. **Audit Trail**: All transitions are logged in `TicketTimeline` table

### Example: Concurrent Quote Approvals

If two landlords try to approve the same quote simultaneously:
- First request succeeds and transitions ticket to `APPROVED`
- Second request fails with 409 Conflict if ticket is no longer in `QUOTED` state
- Idempotency key prevents duplicate approvals from same client

## Performance Considerations

### Database Indexes

The following indexes optimize ticket queries:

```sql
-- Single column indexes
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
CREATE INDEX "Ticket_category_idx" ON "Ticket"("category");
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

-- Composite indexes for common queries
CREATE INDEX "Ticket_landlordId_createdAt_idx" ON "Ticket"("landlordId", "createdAt");
CREATE INDEX "Ticket_landlordId_category_idx" ON "Ticket"("landlordId", "category");
CREATE INDEX "Ticket_landlordId_status_idx" ON "Ticket"("landlordId", "status");
CREATE INDEX "Ticket_landlordId_assignedToId_idx" ON "Ticket"("landlordId", "assignedToId");
```

### Caching Strategy

- Ticket lists are cached for 30 seconds for landlords with many tickets
- Individual ticket details are cached for 1 minute
- Cache invalidation occurs on any state transition
- Search results are not cached due to dynamic filters

### Query Optimization

- Full-text search on title and description uses case-insensitive `LIKE` (SQLite) or `ILIKE` (PostgreSQL)
- Minimum 2 characters required for search queries to prevent wildcard abuse
- Maximum page size of 100 items to prevent large result sets
- Default page size of 25 items for optimal performance

## Testing Scenarios

### Unit Tests
- State transition validation
- Role-based permission checks
- Idempotency key handling
- Concurrent update detection

### Integration Tests
- Complete ticket lifecycle flows
- Notification delivery
- Search and filtering
- Bulk operations

### Load Tests
- 1000+ tickets per landlord
- 10 concurrent landlords
- Burst ticket creation
- Bulk operations during search queries
- Target: p95 < 300ms (cached), < 600ms (cold)
