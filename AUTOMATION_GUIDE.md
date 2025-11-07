# Automation Features Guide

This guide covers the automated financial operations: late fee automation, recurring invoice generation, and email notifications.

## Late Fee Automation

Automatically calculate and apply late fees to overdue invoices based on landlord settings.

### Configuration

Set up late fee rules per landlord:

```typescript
POST /api/finance/settings
{
  "lateFeeEnabled": true,
  "lateFeePercent": 0.05,      // 5% daily (optional)
  "lateFeeFixed": 5.00,        // £5 per day (optional)
  "lateFeeGraceDays": 7,       // 7 days before fees start
  "lateFeeCap": 100.00,        // Maximum £100 fee per invoice
  "defaultDueDays": 7          // Payment due 7 days after issue
}
```

**Note**: Use either `lateFeePercent` OR `lateFeeFixed`, not both.

### How It Works

1. **Daily Cron Job** (2 AM daily)
   - Scans all overdue invoices
   - Applies late fees where applicable
   - Sends arrears reminder emails

2. **Grace Period**
   - No fees applied during grace period
   - Example: 7-day grace means fees start on day 8

3. **Calculation**
   
   **Percentage Method**:
   ```
   Late Fee = Outstanding Amount × Daily Rate × Days Overdue
   Example: £1,000 × 0.05% × 10 days = £5.00
   ```

   **Fixed Method**:
   ```
   Late Fee = Fixed Daily Fee × Days Overdue
   Example: £5.00 × 10 days = £50.00
   ```

4. **Fee Cap**
   - Prevents excessive fees
   - Once cap reached, no additional fees
   - Example: £100 cap, even if calculation is £150

5. **Invoice Update**
   - Late fee added as invoice line item
   - Invoice status changed to 'LATE'
   - Total amount updated

### Manual Late Fee Processing

Process late fee for a specific invoice:

```typescript
POST /api/finance/invoices/{invoiceId}/late-fee
```

### Disabling Late Fees

To disable for a landlord:

```typescript
PATCH /api/finance/settings
{
  "lateFeeEnabled": false
}
```

### Email Notifications

When late fee is applied, tenant receives:
- Outstanding amount
- Days overdue
- Late fee amount
- Payment urgency notice
- Instructions to avoid further fees

## Recurring Invoice Generation

Automatically generate rental invoices based on tenancy schedules.

### Setting Up Rent Schedules

When creating a tenancy, rent schedules are automatically created:

```typescript
POST /api/tenancies
{
  "propertyId": "prop-uuid",
  "tenantOrgId": "org-uuid",
  "start": "2025-01-01",
  "end": "2026-01-01",
  "rent": 1200.00,
  "frequency": "MONTHLY",  // or "WEEKLY"
  "rentDueDay": 1          // Day of month rent is due
}
```

This creates rent schedules for the entire tenancy period.

### How It Works

1. **Daily Cron Job** (1 AM daily)
   - Scans `RentSchedule` table for pending invoices
   - Generates invoices for schedules due today or earlier
   - Marks schedules as 'INVOICED'

2. **Invoice Generation**
   ```
   For each pending schedule:
   - Check tenancy is still active
   - Calculate billing period (month/week)
   - Calculate due date (based on settings)
   - Create invoice
   - Send email to tenant
   - Mark schedule as INVOICED
   ```

3. **Period Calculation**
   
   **Monthly**:
   ```
   Period Start: 1st of month
   Period End: Last day of month
   Example: 2025-11-01 to 2025-11-30
   ```

   **Weekly**:
   ```
   Period Start: Start date
   Period End: 6 days later
   Example: 2025-11-01 to 2025-11-07
   ```

4. **Duplicate Prevention**
   - Checks for existing invoice with same period
   - Skips generation if invoice already exists
   - Ensures no duplicate invoices

### Manual Invoice Generation

Generate invoice manually from schedule:

```typescript
POST /api/finance/schedules/{scheduleId}/generate-invoice
```

### Viewing Schedules

List all rent schedules for a tenancy:

```typescript
GET /api/tenancies/{tenancyId}/schedules?status=PENDING
```

### Modifying Schedules

Update future schedules if rent changes:

```typescript
PATCH /api/tenancies/{tenancyId}/rent
{
  "newRent": 1250.00,
  "effectiveFrom": "2025-12-01"
}
```

This updates all pending schedules from the effective date.

## Email Notifications

Automated email notifications for financial events.

### Configuration

Set up SMTP credentials:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@propertymanager.com
```

### Invoice Sent Email

**Triggered**: When invoice is created
**Recipient**: Primary tenant
**Content**:
- Invoice number and reference
- Amount due
- Due date
- Property address
- Payment instructions

**Example**:
```
Subject: New Invoice INV-2025-000123 - Payment Due

Dear John Smith,

A new invoice has been generated for your property at 
123 Main Street, London, SW1A 1AA.

Invoice Number: INV-2025-000123
Amount Due: £1,200.00
Due Date: 8th November 2025

Please ensure payment is made by the due date to avoid late fees.
```

### Payment Received Email

**Triggered**: When payment is recorded and settled
**Recipient**: Primary tenant
**Content**:
- Amount received
- Payment date
- Invoice reference
- Confirmation number

**Example**:
```
Subject: Payment Received - Thank You

Dear John Smith,

We have received your payment for 123 Main Street. Thank you!

Amount Paid: £1,200.00
Payment Date: 7th November 2025
Invoice: INV-2025-000123

Your payment has been successfully allocated to your account.
```

### Arrears Reminder Email

**Triggered**: 
- When late fee is applied
- Manual trigger for arrears follow-up

**Recipient**: Primary tenant
**Content**:
- Total amount overdue
- Days overdue
- List of overdue invoices
- Warning about consequences
- Contact information

**Example**:
```
Subject: ⚠️ Payment Overdue - Urgent Action Required

Dear John Smith,

This is a reminder that your payment for 123 Main Street is overdue.

Amount Overdue: £1,200.00
Days Overdue: 10 days
Overdue Invoices: INV-2025-000123

Important: Please arrange payment as soon as possible to avoid:
- Late payment fees (£5.00 per day applied)
- Impact on your tenancy
- Potential legal action

If you are experiencing financial difficulties, please contact us 
immediately to discuss payment arrangements.
```

### Email Customization

Create custom templates by modifying `email.service.ts`:

```typescript
// In EmailService
async sendInvoiceEmail(
  recipientEmail: string,
  recipientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: Date,
  propertyAddress: string,
): Promise<boolean> {
  // Custom HTML template here
}
```

### Email Testing

Test emails without sending:

```bash
# Disable SMTP to simulate
SMTP_HOST=  # Leave empty

# Logs will show: [SIMULATED EMAIL] To: ... Subject: ...
```

### Email Delivery Monitoring

Monitor email delivery status:

```typescript
GET /api/notifications/email-log?recipientEmail=tenant@example.com
```

## Monitoring and Logs

### Webhook Logs

View all webhook events:

```typescript
GET /api/webhooks/logs?provider=GOCARDLESS&processed=false
```

Shows:
- Provider
- Event ID
- Action
- Payload
- Processing status
- Errors (if any)

### Late Fee Logs

Check late fee application history:

```typescript
GET /api/invoices/{invoiceId}/lines?description=Late%20Fee
```

### Schedule Processing Logs

Monitor invoice generation:

```typescript
GET /api/finance/schedules/logs?date=2025-11-07
```

## Troubleshooting

### Late Fees Not Applied

**Check**:
1. `lateFeeEnabled` is `true` in settings
2. Grace period has passed
3. Invoice status is overdue
4. Cron job is running (check logs at 2 AM)

**Solution**:
```typescript
// Manually trigger late fee processing
POST /api/finance/late-fees/process-all
```

### Invoices Not Generated

**Check**:
1. Rent schedules exist for tenancy
2. Schedules have `PENDING` status
3. `invoiceDate` is today or earlier
4. Tenancy status is `ACTIVE`
5. Cron job is running (check logs at 1 AM)

**Solution**:
```typescript
// Manually trigger invoice generation
POST /api/finance/invoices/generate-recurring
```

### Emails Not Sending

**Check**:
1. SMTP credentials configured
2. SMTP host/port accessible
3. Email service initialized
4. Recipient email is valid

**Solution**:
```typescript
// Test email configuration
POST /api/notifications/test-email
{
  "to": "test@example.com"
}
```

## Best Practices

### Late Fees
1. Set reasonable grace periods (7-14 days)
2. Cap fees to prevent excessive charges
3. Use percentage for larger invoices, fixed for smaller
4. Communicate policy clearly to tenants
5. Allow manual waiver for exceptional cases

### Recurring Invoices
1. Create schedules when tenancy starts
2. Review schedules before major holidays
3. Handle pro-rata periods for mid-month starts
4. Update schedules when rent changes
5. Archive old schedules for audit trail

### Email Notifications
1. Use professional, friendly tone
2. Include all necessary information
3. Provide clear payment instructions
4. Test email templates before going live
5. Monitor delivery rates
6. Respect unsubscribe requests

## Performance Optimization

### Batch Processing

For large portfolios:

```typescript
// Process in batches to avoid timeouts
const BATCH_SIZE = 100;
for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
  const batch = schedules.slice(i, i + BATCH_SIZE);
  await Promise.all(
    batch.map(schedule => this.processSchedule(schedule))
  );
}
```

### Database Indexing

Ensure indexes exist:
```sql
CREATE INDEX idx_rent_schedule_status_date 
  ON RentSchedule(status, invoiceDate);

CREATE INDEX idx_invoice_status_due 
  ON Invoice(status, dueAt);
```

### Cron Job Timing

Stagger cron jobs:
- Invoice generation: 1 AM
- Late fees: 2 AM
- Email reminders: 3 AM

Prevents resource contention.

## Compliance

### GDPR
- Store only necessary email data
- Provide unsubscribe mechanism
- Delete tenant data on request
- Secure email content in transit

### Financial Regulations
- Keep audit trail of fee applications
- Document fee policy clearly
- Allow dispute resolution
- Maintain records for 7 years

## Support

For issues with automation:
1. Check cron job logs
2. Review error messages
3. Verify configuration
4. Test manually first
5. Contact support if persistent
