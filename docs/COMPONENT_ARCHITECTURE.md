# Component Architecture: Appointments & Attachments

## Overview

This document describes the component architecture for the appointments and attachments features.

## Component Hierarchy

```
TicketDetailPage
│
├── Appointments Section
│   ├── AppointmentConfirmBanner (Landlord/Tenant only, when PROPOSED)
│   │   └── Uses: confirmAppointment mutation
│   │
│   ├── AppointmentCard[] (All appointments)
│   │   ├── Status badges
│   │   ├── Date/time display
│   │   ├── Proposer info
│   │   └── iCal download (CONFIRMED only)
│   │
│   ├── MiniCalendar (When confirmed appointments exist)
│   │   └── Displays upcoming confirmed appointments
│   │
│   └── AppointmentProposeForm (Contractor only, APPROVED tickets)
│       ├── Date picker
│       ├── Time inputs
│       ├── Notes textarea
│       └── Submit button
│
└── Attachments Section
    ├── AttachmentUploader
    │   ├── Category selector (Before/After/Other)
    │   ├── Drag-drop zone
    │   ├── File picker button
    │   └── Upload queue
    │       ├── Progress bars
    │       ├── Success indicators
    │       └── Error messages
    │
    └── AttachmentList
        ├── Tab bar (All/Before/After)
        ├── Image grid
        │   ├── Thumbnails
        │   └── Hover actions
        │       ├── View → ImageLightbox
        │       ├── Download
        │       └── Delete
        │
        ├── Document list
        │   ├── File info
        │   └── Actions
        │       ├── Download
        │       └── Delete
        │
        └── ImageLightbox (Modal)
            ├── Navigation (prev/next)
            ├── Zoom controls
            ├── Rotate button
            ├── Download button
            └── Close button
```

## Data Flow

### Appointments Flow

```
User Action (Propose)
    ↓
AppointmentProposeForm
    ↓ (validate)
date-utils.validateAppointmentTimes()
    ↓ (valid)
useMutation → ticketsApi.proposeAppointment()
    ↓ (POST /api/tickets/:id/appointments)
Backend API
    ↓ (success)
React Query invalidates cache
    ↓
TicketDetailPage re-fetches
    ↓
AppointmentCard displays new appointment
```

```
User Action (Confirm)
    ↓
AppointmentConfirmBanner → Confirm button
    ↓
useMutation → ticketsApi.confirmAppointment()
    ↓ (POST /api/appointments/:id/confirm)
Backend API
    ↓ (success)
React Query invalidates cache
    ↓
TicketDetailPage re-fetches
    ↓
AppointmentCard shows CONFIRMED status
MiniCalendar shows appointment
iCal download available
```

### Attachments Flow

```
User Action (Upload)
    ↓
AttachmentUploader
    ↓ (validate)
file-utils.validateFile()
file-utils.validateTotalSize()
    ↓ (valid)
Add to upload queue (pending state)
    ↓
useMutation → ticketsApi.uploadAttachment()
    ↓ (FormData multipart)
Backend API
    ↓ (progress)
Update queue (uploading state, progress: 50%)
    ↓ (success)
Update queue (success state, progress: 100%)
React Query invalidates cache
    ↓
TicketDetailPage re-fetches
    ↓
AttachmentList displays new attachment
```

```
User Action (View Image)
    ↓
AttachmentList → Image thumbnail click
    ↓
handleViewImage(index)
    ↓
setLightboxOpen(true)
setLightboxIndex(index)
    ↓
ImageLightbox renders
    ├── Displays image
    ├── Enables keyboard navigation
    ├── Prevents body scroll
    └── Focus management
```

## State Management

### Local State

**AppointmentProposeForm:**
- `startDate`, `startTime`, `endTime`, `notes` - Form fields
- `formError` - Validation errors
- `proposeMutation.isPending` - Loading state

**AppointmentConfirmBanner:**
- `confirmMutation.isPending` - Loading state
- `confirmMutation.isError` - Error state

**AttachmentUploader:**
- `uploads: UploadProgress[]` - Upload queue
- `isDragging` - Drag-over state
- `category` - Selected category

**AttachmentList:**
- `lightboxOpen` - Lightbox visibility
- `lightboxIndex` - Current image index
- `deleteConfirm` - ID of attachment pending delete
- `activeTab` - Selected category tab

**ImageLightbox:**
- `currentIndex` - Current image
- `zoom` - Zoom level (0.5 - 3)
- `rotation` - Rotation angle (0/90/180/270)

### Server State (React Query)

**Queries:**
```typescript
['tickets', id] - Ticket details
['appointments', id] - Ticket appointments
['attachments', id] - Ticket attachments
```

**Mutations:**
```typescript
proposeAppointment - POST /api/tickets/:id/appointments
confirmAppointment - POST /api/appointments/:id/confirm
uploadAttachment - POST /api/tickets/:id/attachments
deleteAttachment - DELETE /api/tickets/:id/attachments/:attachmentId
```

**Cache Invalidation:**
- After propose: `['appointments', id]`, `['tickets', id]`
- After confirm: `['appointments', id]`, `['tickets', id]`
- After upload: `['attachments', id]`
- After delete: `['attachments', id]`

## Props Interface

### AppointmentProposeForm
```typescript
interface AppointmentProposeFormProps {
  ticketId: string;
  onSuccess?: () => void;
}
```

### AppointmentConfirmBanner
```typescript
interface AppointmentConfirmBannerProps {
  appointment: Appointment;
  ticketId: string;
}
```

### AppointmentCard
```typescript
interface AppointmentCardProps {
  appointment: Appointment;
  ticketTitle: string;
  ticketDescription: string;
  propertyAddress?: string;
}
```

### MiniCalendar
```typescript
interface MiniCalendarProps {
  appointments: Appointment[];
}
```

### AttachmentUploader
```typescript
interface AttachmentUploaderProps {
  ticketId: string;
  onUploadComplete?: () => void;
}
```

### AttachmentList
```typescript
interface AttachmentListProps {
  ticketId: string;
  attachments: Attachment[];
  canDelete?: boolean;
}
```

### ImageLightbox
```typescript
interface ImageLightboxProps {
  images: Attachment[];
  initialIndex: number;
  onClose: () => void;
}
```

## Conditional Rendering

### Role-Based

```typescript
// TicketDetailPage.tsx
const userRole = user?.organisations?.[0]?.role || 'TENANT';
const isContractor = userRole === 'CONTRACTOR';
const isLandlordOrTenant = userRole === 'LANDLORD' || userRole === 'TENANT';

{isLandlordOrTenant && (
  // Show confirmation banner for PROPOSED appointments
)}

{isContractor && ticket?.status === 'APPROVED' && (
  // Show appointment propose form
)}
```

### Status-Based

```typescript
// AppointmentConfirmBanner.tsx
if (appointment.status !== 'PROPOSED') {
  return null; // Only show for proposed appointments
}

// AppointmentCard.tsx
{appointment.status === 'CONFIRMED' && (
  // Show iCal download button
)}

// MiniCalendar.tsx
const confirmedAppointments = appointments.filter(
  apt => apt.status === 'CONFIRMED'
);
const upcomingAppointments = confirmedAppointments.filter(
  apt => new Date(apt.startAt) >= now
);
```

### Data-Based

```typescript
// TicketDetailPage.tsx
{appointments.length === 0 && (
  // Empty state
)}

{appointments.some(apt => apt.status === 'CONFIRMED') && (
  // Show calendar
)}

// AttachmentList.tsx
{images.length > 0 && (
  // Show image grid
)}

{documents.length > 0 && (
  // Show document list
)}
```

## Event Handling

### User Interactions

**Form Submission:**
```typescript
handleSubmit(e: FormEvent) → validate → mutate → invalidate cache
```

**File Upload:**
```typescript
handleDrop/handleFileInput → validateFile → add to queue → mutate → progress updates
```

**Image View:**
```typescript
handleViewImage(index) → open lightbox → keyboard listeners → focus management
```

**Delete:**
```typescript
handleDelete(id) → confirm pattern → mutate → invalidate cache
```

### Keyboard Shortcuts

**ImageLightbox:**
- Escape → Close
- Arrow Left → Previous
- Arrow Right → Next

**Form Fields:**
- Tab → Navigate
- Enter → Submit

## Error Handling

### Validation Errors
```typescript
// Inline display
{formError && (
  <div role="alert">{formError}</div>
)}
```

### API Errors
```typescript
onError: (error) => {
  const message = error.response?.data?.message || 'Operation failed';
  toast.error(message);
}
```

### File Validation
```typescript
const validation = validateFile(file);
if (!validation.valid) {
  setUploads(prev => [...prev, {
    file,
    status: 'error',
    error: validation.error
  }]);
}
```

## Performance Optimizations

### React.memo
- Not used (components re-render on data changes anyway)

### useCallback
```typescript
// ImageLightbox.tsx
const handlePrevious = useCallback(() => { ... }, [images.length, resetTransforms]);
const handleNext = useCallback(() => { ... }, [images.length, resetTransforms]);
```

### useMemo
```typescript
// AttachmentList.tsx
const filteredAttachments = useMemo(() => 
  attachments.filter(att => activeTab === 'all' || att.category === activeTab),
  [attachments, activeTab]
);
```

### React Query
- Automatic caching
- Deduplication
- Background refetching
- Stale-while-revalidate

## Accessibility Features

### Semantic HTML
- `<form>` for forms
- `<button>` for actions
- `<dialog>` role for modals
- `<img>` with alt text

### ARIA Attributes
- `aria-label` on icon buttons
- `aria-required` on required fields
- `aria-modal="true"` on lightbox
- `role="alert"` on errors

### Keyboard Navigation
- Tab order maintained
- Focus visible
- Escape closes modals
- Arrow keys navigate

### Screen Readers
- Meaningful labels
- Status announcements
- Progress indicators
- Error descriptions

## Styling Strategy

### Tailwind CSS
- Utility-first approach
- Responsive classes (sm:, md:, lg:)
- Dark mode ready (not implemented)
- Custom color palette

### Component Styling
- Inline classes (no CSS modules)
- Conditional classes with template literals
- Consistent spacing (p-4, mb-2, etc.)
- Color scheme:
  - Blue: Primary actions
  - Green: Success/confirmed
  - Yellow: Warnings/proposed
  - Red: Errors/danger
  - Gray: Neutral/disabled

## Testing Strategy

### Unit Tests
- Utility functions (date-utils, file-utils)
- Validation logic
- Format functions
- Pure functions

### Integration Tests
- Component + hooks
- API mutations
- Cache invalidation

### E2E Tests
- Full user flows
- Role-based scenarios
- Error conditions
- Edge cases

## Future Considerations

### Component Splitting
- Create shared Button component
- Create shared Modal component
- Extract form validation logic

### Performance
- Add React.memo for expensive components
- Implement virtual scrolling for large lists
- Add image lazy loading

### Features
- Add appointment rescheduling
- Add bulk file upload
- Add drag-and-drop reordering
- Add file preview for documents
