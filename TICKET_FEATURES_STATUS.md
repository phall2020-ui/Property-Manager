# Ticket System Features Status

## Overview

The backend has a comprehensive ticket system with many features, but not all are exposed in the frontend UI yet.

## ✅ Features Currently in Frontend

### Ticket List Page
- ✅ View all tickets
- ✅ Filter by status
- ✅ Filter by category
- ✅ Search tickets
- ✅ Pagination
- ✅ Status badges
- ✅ Priority indicators

### Ticket Detail Page
- ✅ View ticket title and description
- ✅ View ticket status
- ✅ View category and priority
- ✅ View created/updated dates
- ✅ View timeline of events
- ✅ Approve/decline quotes (landlord)
- ✅ Mark as complete (contractor)
- ✅ Quote amount display

### Ticket Creation
- ✅ Create new ticket
- ✅ Select property
- ✅ Select tenancy
- ✅ Set title and description
- ✅ Set category
- ✅ Set priority

## ❌ Features Missing from Frontend (But Available in Backend)

### 1. **Appointment Scheduling** 🔴 HIGH PRIORITY
**Backend Endpoints:**
- `POST /api/tickets/:id/appointment/propose` - Contractor proposes time
- `POST /api/tickets/:id/appointment/confirm` - Landlord/tenant confirms

**What's Missing:**
- UI for contractors to propose appointment times
- UI for landlords/tenants to confirm appointments
- Display of scheduled appointment windows
- Calendar integration

**Impact:** Contractors and landlords can't coordinate work schedules

---

### 2. **File Attachments** 🔴 HIGH PRIORITY
**Backend Endpoint:**
- `POST /api/tickets/:id/attachments` - Upload files

**What's Missing:**
- Upload button for photos/documents
- Display of attached files
- Download/view attachments
- Image gallery for before/after photos

**Impact:** Can't share photos of issues or completed work

---

### 3. **Quote Details** 🟡 MEDIUM PRIORITY
**Backend Data:**
- Quote notes/description
- Quote status (PENDING, APPROVED, REJECTED)
- Contractor who submitted quote
- Quote submission date

**What's Missing:**
- Display of quote notes
- Quote history (if multiple quotes submitted)
- Contractor information on quote
- Quote submission timestamp

**Impact:** Limited context for quote approval decisions

---

### 4. **Contractor Assignment** 🟡 MEDIUM PRIORITY
**Backend Endpoint:**
- `PATCH /api/tickets/:id/status` - Can assign contractor

**What's Missing:**
- UI for ops team to assign contractors
- List of available contractors
- Contractor assignment history
- Assigned contractor display

**Impact:** Manual coordination needed outside the system

---

### 5. **Enhanced Status Updates** 🟡 MEDIUM PRIORITY
**Backend Capability:**
- Flexible status transitions
- Status update with notes
- Role-based status changes

**What's Missing:**
- Status change dropdown
- Notes when changing status
- Status change history with reasons
- Validation of allowed transitions

**Impact:** Limited workflow flexibility

---

### 6. **Property Information** 🟢 LOW PRIORITY
**Backend Data:**
- Full property address
- Property details
- Property images

**What's Missing:**
- Display full address instead of just ID
- Link to property details
- Property image thumbnail

**Impact:** Less context about ticket location

---

### 7. **Tenancy Information** 🟢 LOW PRIORITY
**Backend Data:**
- Tenancy details
- Tenant information
- Lease dates

**What's Missing:**
- Display tenancy information
- Link to tenancy details
- Tenant contact information

**Impact:** Less context about who reported the issue

---

### 8. **Created By Information** 🟢 LOW PRIORITY
**Backend Data:**
- User who created ticket
- User role
- User contact info

**What's Missing:**
- Display creator name and role
- Creator contact information
- Avatar/profile picture

**Impact:** Less context about ticket origin

---

### 9. **Comments/Discussion** 🟡 MEDIUM PRIORITY
**Backend Capability:**
- Timeline tracks events
- Can be extended for comments

**What's Missing:**
- Comment thread on tickets
- @mentions for notifications
- Comment attachments
- Comment editing/deletion

**Impact:** Communication happens outside the system

---

### 10. **Bulk Actions** 🟢 LOW PRIORITY
**Backend Capability:**
- Individual ticket operations

**What's Missing:**
- Select multiple tickets
- Bulk status updates
- Bulk assignment
- Bulk export

**Impact:** Inefficient for managing many tickets

---

## 📊 Priority Breakdown

### 🔴 High Priority (Implement First)
1. **Appointment Scheduling** - Critical for workflow
2. **File Attachments** - Essential for documentation

### 🟡 Medium Priority (Implement Next)
3. **Quote Details** - Improves decision making
4. **Contractor Assignment** - Streamlines workflow
5. **Enhanced Status Updates** - More flexibility
6. **Comments/Discussion** - Better communication

### 🟢 Low Priority (Nice to Have)
7. **Property Information** - Better context
8. **Tenancy Information** - Better context
9. **Created By Information** - Better context
10. **Bulk Actions** - Efficiency improvement

---

## 🚀 Recommended Implementation Order

### Phase 1: Critical Features (Week 1-2)
1. **File Attachments**
   - Upload component
   - File list display
   - Image preview
   - Download functionality

2. **Appointment Scheduling**
   - Propose appointment form
   - Confirm appointment button
   - Display scheduled times
   - Calendar view

### Phase 2: Enhanced Details (Week 3-4)
3. **Quote Details Enhancement**
   - Show quote notes
   - Display contractor info
   - Quote history
   - Better approval UI

4. **Property/Tenancy Context**
   - Display full addresses
   - Show tenant information
   - Link to related records
   - Context cards

### Phase 3: Workflow Improvements (Week 5-6)
5. **Contractor Assignment**
   - Assignment dropdown
   - Contractor list
   - Assignment notifications
   - Assignment history

6. **Comments System**
   - Comment form
   - Comment list
   - Real-time updates
   - Notifications

### Phase 4: Polish (Week 7-8)
7. **Enhanced Status Management**
   - Status dropdown
   - Status notes
   - Transition validation
   - Status history

8. **Bulk Actions**
   - Multi-select
   - Bulk operations
   - Progress indicators
   - Confirmation dialogs

---

## 📝 Implementation Notes

### File Attachments
```typescript
// Component structure
<FileUpload
  ticketId={ticket.id}
  onUpload={handleUpload}
  maxSize={10MB}
  acceptedTypes={['image/*', 'application/pdf']}
/>

<FileList
  files={ticket.attachments}
  onDownload={handleDownload}
  onDelete={handleDelete}
/>
```

### Appointment Scheduling
```typescript
// Propose appointment (contractor)
<AppointmentProposal
  ticketId={ticket.id}
  onPropose={handlePropose}
/>

// Confirm appointment (landlord/tenant)
<AppointmentConfirmation
  appointment={ticket.scheduledAppointment}
  onConfirm={handleConfirm}
  onReject={handleReject}
/>
```

### Quote Details
```typescript
// Enhanced quote display
<QuoteCard
  quote={ticket.quote}
  showNotes={true}
  showContractor={true}
  showHistory={true}
  onApprove={handleApprove}
  onDecline={handleDecline}
/>
```

---

## 🔗 Related Documentation

- **Backend API:** See `backend/apps/api/src/modules/tickets/summary.md`
- **API Examples:** See `API_EXAMPLES.md`
- **Frontend Components:** See `frontend/_components/`

---

## 🆘 Quick Wins

If you want to see improvements quickly, implement these first:

1. **Show Full Property Address** (30 minutes)
   - Already have property data
   - Just need to display it properly

2. **Display Quote Notes** (30 minutes)
   - Backend already returns it
   - Add to quote display

3. **Show Created By** (30 minutes)
   - Backend already returns it
   - Add to ticket header

4. **Better Timeline Display** (1 hour)
   - Format event types nicely
   - Add icons for different events
   - Better metadata display

These can be done in ~2-3 hours and will significantly improve the UX!

---

**Last Updated:** 2025-11-07
