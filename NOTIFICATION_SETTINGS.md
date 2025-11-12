# Email Notification System

## Overview
This document describes the email notification system implemented for the Property Manager application.

## Features

### 1. Welcome Email on User Creation
When a new user signs up, they automatically receive a welcome email containing:
- Their login credentials (email and password)
- A link to the login page
- Security reminder to change their password after first login

**Implementation:**
- Located in: `backend/apps/api/src/modules/notifications/email.service.ts`
- Method: `sendWelcomeEmail()`
- Called from: `backend/apps/api/src/modules/auth/auth.service.ts` during signup

### 2. User Notification Preferences
Users can control their notification settings through a dedicated settings page.

**Configurable Options:**
- **Email Notifications**: Toggle email notifications on/off globally
- **In-App Notifications**: Toggle in-app notifications on/off
- **Event-Specific Controls**:
  - Ticket Created
  - Ticket Assigned
  - Quote Submitted
  - Quote Approved
  - Ticket Completed

**Implementation:**
- Frontend page: `frontend-new/src/pages/NotificationSettingsPage.tsx`
- API endpoints: `/notifications/preferences` (GET/PUT)
- Database model: `NotificationPreference` in Prisma schema

### 3. Graceful Email Handling
- Email failures during user signup don't block account creation
- Errors are logged but the signup process continues
- This ensures users can still access the system even if email service is unavailable

## Configuration

### SMTP Settings
Configure the following environment variables in `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@propertymanager.com
FRONTEND_URL=http://localhost:5173
```

If SMTP is not configured, emails will be simulated (logged to console).

## Usage

### Accessing Notification Settings
1. Log in to the application
2. Click the Settings icon (gear) in the top-right header
3. Update your preferences
4. Click "Save Preferences"

### Testing Email Functionality
1. Configure SMTP settings in `.env`
2. Create a new user account via signup
3. Check the email inbox for the welcome email
4. Update notification preferences in the settings page
5. Trigger events (create tickets, etc.) to test email delivery based on preferences

## Database Schema

The `NotificationPreference` model includes:
```prisma
model NotificationPreference {
  id                    String   @id @default(uuid())
  userId                String   @unique
  emailEnabled          Boolean  @default(true)
  webhookEnabled        Boolean  @default(false)
  inAppEnabled          Boolean  @default(true)
  webhookUrl            String?
  webhookSecret         String?
  notifyTicketCreated   Boolean  @default(true)
  notifyTicketAssigned  Boolean  @default(true)
  notifyQuoteSubmitted  Boolean  @default(true)
  notifyQuoteApproved   Boolean  @default(true)
  notifyTicketCompleted Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## Email Templates

### Welcome Email
The welcome email uses a clean HTML template with:
- Branded header with Property Manager branding
- Clear credential display
- Security warning
- Login button/link
- Professional footer

Template location: `email.service.ts` - `sendWelcomeEmail()` method

### Event Notification Emails
Generic notification emails include:
- Event title
- Personalized greeting
- Event details
- Clean, responsive HTML design

Template location: `notifications.service.ts` - `sendEmail()` method

## Future Enhancements
Potential improvements for the notification system:
1. Email template customization
2. SMS notifications
3. Webhook notifications (partially implemented)
4. Digest emails (daily/weekly summaries)
5. Rich HTML templates with better branding
6. Email verification flow
7. Unsubscribe links
8. Notification history page
