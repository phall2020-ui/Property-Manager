# Appointments & Attachments Features

## Overview

This document describes the newly implemented Appointments and Attachments features in the Property Manager frontend.

## Features Implemented

### 1. Appointment Scheduling

Allows contractors to propose appointment times and landlords/tenants to confirm them.

#### Components

**AppointmentProposeForm** (`src/components/appointments/AppointmentProposeForm.tsx`)
- Form for contractors to propose appointment time windows
- Date and time pickers with Europe/London timezone
- Validation: minimum 30-minute duration, end time after start time
- Business hours hint (Mon-Fri, 9 AM - 6 PM)
- Optional notes field
- Loading and error states

**AppointmentConfirmBanner** (`src/components/appointments/AppointmentConfirmBanner.tsx`)
- Banner for landlords/tenants to confirm proposed appointments
- Displays proposed time window with timezone
- Confirm button with loading state
- Request change option (UI only)

**AppointmentCard** (`src/components/appointments/AppointmentCard.tsx`)
- Display appointment details (time, status, proposer)
- Status badges: Proposed, Confirmed, Cancelled
- iCal download button for confirmed appointments
- Timezone information (GMT/BST)

**MiniCalendar** (`src/components/appointments/MiniCalendar.tsx`)
- Read-only calendar view of upcoming confirmed appointments
- Sorted by date
- Empty state when no appointments

#### User Flows

1. **Contractor proposes appointment:**
   - Navigate to ticket detail page
   - Ticket must be in APPROVED status
   - Fill in start date/time and optional end time
   - Add optional notes
   - Click "Propose Appointment"

2. **Landlord/Tenant confirms appointment:**
   - View ticket detail page
   - See proposed appointment in banner
   - Click "Confirm Appointment"
   - Appointment status changes to CONFIRMED
   - iCal download becomes available

3. **Download to calendar:**
   - View confirmed appointment card
   - Click "Download iCal"
   - Import into calendar app (Outlook, Google Calendar, etc.)

#### API Integration

```typescript
// Propose appointment (Contractor only)
POST /api/tickets/:id/appointments
Body: { startAt: string, endAt?: string, notes?: string }

// Get appointments for ticket
GET /api/tickets/:id/appointments

// Confirm appointment (Landlord/Tenant)
POST /api/appointments/:appointmentId/confirm

// Get appointment details
GET /api/appointments/:appointmentId
```

### 2. File Attachments

Upload, view, and manage files attached to tickets.

#### Components

**AttachmentUploader** (`src/components/attachments/AttachmentUploader.tsx`)
- Drag-and-drop file upload interface
- Category selection: Before, After, Other
- Client-side validation:
  - Allowed types: PNG, JPG, WebP, GIF, PDF
  - Max file size: 10MB
  - Max total size: 50MB
- Upload progress tracking
- Queue display with status indicators
- Error handling with friendly messages

**AttachmentList** (`src/components/attachments/AttachmentList.tsx`)
- Tabbed view: All, Before, After
- Grid layout for images with thumbnails
- List layout for documents
- Actions: View, Download, Delete
- Hover overlay for image actions
- Confirm-to-delete pattern

**ImageLightbox** (`src/components/attachments/ImageLightbox.tsx`)
- Full-screen image viewer
- Features:
  - Zoom in/out (50% - 300%)
  - Rotate (90° increments)
  - Navigate between images
  - Download current image
- Keyboard shortcuts:
  - Escape: Close
  - Arrow Left/Right: Navigate
- Image counter and filename display

#### User Flows

1. **Upload files:**
   - Navigate to ticket detail page
   - Select category (Before/After/Other)
   - Drag files or click "Select Files"
   - Monitor upload progress
   - View uploaded files in list

2. **View images:**
   - Click on image thumbnail
   - Lightbox opens
   - Use toolbar to zoom/rotate
   - Navigate with arrows or keyboard
   - Download or close

3. **Manage attachments:**
   - Switch between tabs to filter by category
   - Download files by clicking download icon
   - Delete files (if permitted) with confirm pattern

#### API Integration

```typescript
// Upload attachment
POST /api/tickets/:id/attachments
Body: FormData { file: File, category?: 'before'|'after'|'other' }

// Get attachments
GET /api/tickets/:id/attachments

// Delete attachment
DELETE /api/tickets/:id/attachments/:attachmentId
```

## Utilities

### Date Utilities (`src/lib/date-utils.ts`)

- `validateAppointmentTimes()` - Validate appointment time constraints
- `isBusinessHours()` - Check if date falls within business hours
- `formatDateRange()` - Format date range for display
- `generateICalContent()` - Generate iCal file content
- `downloadICalFile()` - Trigger iCal file download
- `getTimezoneAbbr()` - Get timezone abbreviation (GMT/BST)

### File Utilities (`src/lib/file-utils.ts`)

- `validateFile()` - Validate individual file
- `validateTotalSize()` - Validate total upload size
- `formatFileSize()` - Format bytes to human-readable size
- `isImageFile()` - Check if file is an image
- `isFileTypeAllowed()` - Check if file type is allowed
- `readFileAsDataURL()` - Read file as data URL for preview

## Types

### Appointments (`src/types/appointments.ts`)

```typescript
interface Appointment {
  id: string;
  ticketId: string;
  proposedBy: string;
  proposedByRole: string;
  startAt: string;
  endAt?: string;
  notes?: string;
  status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Attachments (`src/types/attachments.ts`)

```typescript
interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  category?: 'before' | 'after' | 'other';
  uploadedBy: string;
  uploadedByRole: string;
  createdAt: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  attachment?: Attachment;
}
```

## Testing

### Unit Tests

- `date-utils.test.ts` - 13 tests covering date validation and formatting
- `file-utils.test.ts` - 17 tests covering file validation and utilities

### E2E Tests

- `appointments-attachments.spec.ts` - Tests for appointment and attachment features
  - Ticket detail page display
  - Appointment form visibility
  - Attachment uploader
  - Existing attachments display

Run tests with:
```bash
npm run test -- --run  # Unit tests
npm run test:e2e       # E2E tests
```

## Accessibility

All components implement accessibility best practices:

- ARIA labels for interactive elements
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly status messages
- Semantic HTML structure

## Role-Based Permissions

- **Contractor**: Can propose appointments (for APPROVED tickets)
- **Landlord/Tenant**: Can confirm appointments
- **All authenticated users**: Can upload and view attachments
- **File owners**: Can delete their own attachments

## Browser Support

Tested and working on:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

## Security

- Client-side file type validation
- File size limits enforced
- JWT token authentication required for all API calls
- CodeQL security scan: 0 vulnerabilities found

## Future Enhancements

Potential improvements for future releases:

1. Appointment rescheduling flow
2. Multiple appointment slots proposal
3. Email notifications for confirmations
4. Attachment preview for documents
5. Thumbnail generation service
6. Video file support
7. Bulk attachment upload
8. Attachment search/filter
