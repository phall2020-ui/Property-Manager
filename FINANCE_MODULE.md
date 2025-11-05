# Finance Module Documentation

## Overview

The Finance module provides comprehensive financial management capabilities for the Property Management platform, including:

- **Invoicing** - Generate and manage rental invoices
- **Payments** - Record and allocate payments to invoices
- **Arrears Management** - Track and report on overdue payments with aging buckets
- **Rent Roll** - Expected vs received rent reporting
- **Mandates** - Direct Debit and recurring payment setup (mock mode)
- **Bank Reconciliation** - Match bank transactions to invoices and payments
- **Ledger** - Double-entry bookkeeping for audit trail
- **Financial Reporting** - KPIs, dashboards, and metrics

## Architecture

### Backend (NestJS)

**Location:** `backend/apps/api/src/modules/finance/`

**Structure:**
```
finance/
├── finance.module.ts           # Module definition
├── finance.controller.ts       # HTTP endpoints
├── finance.service.ts          # Core finance service
├── dto/                        # Data transfer objects
│   ├── create-invoice.dto.ts
│   ├── record-payment.dto.ts
│   ├── allocate-payment.dto.ts
│   └── create-mandate.dto.ts
└── services/                   # Domain services
    ├── invoice.service.ts      # Invoice management
    ├── payment.service.ts      # Payment processing & allocation
    ├── mandate.service.ts      # Direct Debit mandates
    ├── reconciliation.service.ts # Bank transaction matching
    ├── payout.service.ts       # Landlord payouts
    └── finance-metrics.service.ts # Reporting & KPIs
```

### Frontend (Next.js)

**Location:** `frontend/app/(landlord)/finance/`

**Pages:**
- `/finance/dashboard` - Financial KPIs and overview
- `/finance/invoices` - Invoice list and management
- `/finance/payments` - Payment history and recording
- `/finance/arrears` - Overdue payments with aging buckets
- `/finance/rent-roll` - Monthly rent expected vs received
- `/finance/mandates` - Direct Debit mandate management
- `/finance/reconciliation` - Bank transaction matching
- `/finance/settings` - Finance configuration

**API Client:** `frontend/_lib/financeClient.ts`

### Database Schema

**Core Tables:**

- `LedgerAccount` - Chart of accounts
- `LedgerEntry` - Double-entry transactions
- `Invoice` - Rental invoices
- `InvoiceLine` - Invoice line items
- `Payment` - Payments received
- `PaymentAllocation` - Payment-to-invoice allocations
- `Mandate` - Direct Debit mandates
- `BankTransaction` - Bank feed transactions
- `Reconciliation` - Matched transactions
- `Payout` - Landlord payouts
- `FinanceSettings` - Per-landlord configuration
- `CreditNote` - Invoice adjustments
- `ChargeRule` - Automated charge rules
- `BalanceSnapshot` - Periodic balance caching
- `IdempotencyKey` - Prevent duplicate operations

## API Endpoints

### Dashboard & Metrics

**GET /api/finance/dashboard**
- Returns KPIs: rent received MTD, outstanding invoices, arrears, mandate coverage
- Response: `DashboardMetricsSchema`

**GET /api/finance/rent-roll?month=YYYY-MM**
- Returns expected vs received rent by property
- Response: Array of `RentRollItemSchema`

**GET /api/finance/arrears?bucket=0-30|31-60|61-90|90+**
- Returns overdue invoices grouped by age
- Response: Array of `ArrearsItemSchema`

**GET /api/finance/arrears/aging**
- Returns arrears totals by age bucket
- Response: `{ "0-30": number, "31-60": number, "61-90": number, "90+": number }`

### Invoices

**POST /api/finance/invoices**
- Create a new invoice
- Body: `CreateInvoiceDto`
- Response: `InvoiceSchema`

**GET /api/finance/invoices?propertyId=&tenancyId=&status=&page=&limit=**
- List invoices with filters
- Response: Paginated list of invoices

**GET /api/finance/invoices/:id**
- Get invoice details with allocations
- Response: `InvoiceSchema` with paid/balance amounts

**POST /api/finance/invoices/:id/void**
- Void an invoice (only if no payments)
- Response: Updated invoice

### Payments

**POST /api/finance/payments/record**
- Record a payment (auto-allocates to oldest invoices)
- Body: `RecordPaymentDto`
- Response: `PaymentSchema` with allocations

**GET /api/finance/payments?propertyId=&tenancyId=&status=&page=&limit=**
- List payments with filters
- Response: Paginated list of payments

**GET /api/finance/payments/:id**
- Get payment details with allocations
- Response: `PaymentSchema`

**POST /api/finance/payments/:id/allocate**
- Manually allocate payment to specific invoices
- Body: `AllocatePaymentDto`
- Response: Updated payment

### Mandates

**POST /api/finance/mandates**
- Create a Direct Debit mandate (mock mode)
- Body: `CreateMandateDto`
- Response: `{ mandate, authorizationUrl, message }`

**GET /api/finance/mandates?tenantUserId=&status=&page=&limit=**
- List mandates
- Response: Paginated list of mandates

**GET /api/finance/mandates/:id**
- Get mandate details
- Response: `MandateSchema`

### Reconciliation

**GET /api/finance/bank-feeds/transactions?page=&limit=**
- List unmatched bank transactions
- Response: Paginated list of bank transactions

**POST /api/finance/reconciliation/suggest/:bankTransactionId**
- Get suggested matches for a bank transaction
- Response: Array of candidates with confidence scores

### Payouts

**GET /api/finance/payouts?page=&limit=**
- List payouts to landlord
- Response: Paginated list of payouts

**GET /api/finance/payouts/:id**
- Get payout details
- Response: Payout record

### Settings

**GET /api/finance/settings**
- Get finance settings for current landlord
- Response: `FinanceSettings`

**PATCH /api/finance/settings**
- Update finance settings
- Body: Partial finance settings
- Response: Updated settings

### Tenancy Balance

**GET /api/finance/tenancies/:tenancyId/balance**
- Get open balance and arrears for a tenancy
- Response: `TenancyBalanceSchema`

## Business Logic

### Invoice Numbering

Format: `INV-YYYY-NNNNNN`
- Auto-incremented per landlord per year
- Example: `INV-2024-000001`

### Payment Allocation

**Default Strategy: Oldest Invoice First**
1. Find all unpaid/partially paid invoices for the tenancy
2. Sort by due date (ascending)
3. Allocate payment amount to invoices in order
4. Update invoice status: ISSUED → PART_PAID → PAID

### Arrears Calculation

**Aging Buckets:**
- 0-30 days: 0-30 days overdue
- 31-60 days: 31-60 days overdue
- 61-90 days: 61-90 days overdue
- 90+ days: >90 days overdue

**Calculation:**
```
Arrears = Sum of (Invoice Grand Total - Payment Allocations)
  WHERE Invoice Due Date < Today
  AND Invoice Status IN ('ISSUED', 'PART_PAID')
```

### Reconciliation Matching

**Confidence Score Calculation:**
- Amount match (0-60 points)
  - Exact: 60 points
  - Within £1: 50 points
  - Within £5: 30 points
- Date proximity (0-20 points)
  - Same day: 20 points
  - ±1 day: 15 points
  - ±3 days: 10 points
- Description match (0-20 points)
  - Contains invoice number: 20 points

**Match Candidates:**
- For credit transactions (money in): match against unpaid invoices
- For debit transactions (money out): match against payouts
- Date window: ±3 days
- Amount tolerance: ±£1

### Ledger Entries

**Double-Entry Bookkeeping:**

Invoice Created:
```
DEBIT  Rent Receivable  £1500  (Increase AR)
```

Payment Received:
```
CREDIT Rent Receivable  £1500  (Decrease AR)
```

All entries include:
- landlordId, propertyId, tenancyId, tenantUserId
- refType (invoice, payment, payout)
- refId (related entity ID)
- eventAt (transaction date)

## Frontend Usage

### Querying Dashboard

```typescript
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '@/_lib/financeClient';

function FinanceDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: getDashboardMetrics,
  });

  return (
    <div>
      <h1>Rent Received: £{data?.rentReceivedMTD}</h1>
      <h2>Arrears: £{data?.arrearsTotal}</h2>
    </div>
  );
}
```

### Creating an Invoice

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvoice } from '@/_lib/financeClient';

function InvoiceForm() {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] });
    },
  });

  const handleSubmit = (data) => {
    mutate({
      tenancyId: 'tenancy-123',
      issueDate: '2024-11-01',
      dueDate: '2024-11-07',
      lines: [
        {
          description: 'Rent for November 2024',
          qty: 1,
          unitPrice: 1500,
          taxRate: 0,
        },
      ],
    });
  };
}
```

### Recording a Payment

```typescript
import { useMutation } from '@tanstack/react-query';
import { recordPayment } from '@/_lib/financeClient';

function PaymentForm() {
  const { mutate } = useMutation({
    mutationFn: recordPayment,
  });

  const handleSubmit = (data) => {
    mutate({
      tenancyId: 'tenancy-123',
      method: 'BANK_TRANSFER',
      amount: 1500,
      receivedAt: '2024-11-01',
    });
  };
}
```

## Testing

### Seed Data

Run `npm run seed` in backend to create test data:
- 1 landlord, 1 property, 1 active tenancy
- 3 invoices: 1 paid, 1 part-paid, 1 overdue
- 2 payments
- 1 active mandate
- 2 bank transactions (1 matched, 1 unmatched)

### Test Credentials

```
Landlord:
  Email: landlord@example.com
  Password: password123

Tenant:
  Email: tenant@example.com
  Password: password123
```

### Manual Testing via curl

**Get Dashboard:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/finance/dashboard
```

**List Invoices:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/finance/invoices
```

**Create Invoice:**
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenancyId": "...",
    "issueDate": "2024-11-01",
    "dueDate": "2024-11-07",
    "lines": [
      {
        "description": "Rent for November 2024",
        "qty": 1,
        "unitPrice": 1500,
        "taxRate": 0
      }
    ]
  }' \
  http://localhost:4000/api/finance/invoices
```

**Record Payment:**
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenancyId": "...",
    "method": "BANK_TRANSFER",
    "amount": 1500,
    "receivedAt": "2024-11-01"
  }' \
  http://localhost:4000/api/finance/payments/record
```

## Security

### Ownership Guards

All Finance endpoints enforce landlord ownership:
```typescript
const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
if (!landlordOrg) {
  throw new BadRequestException('User is not a landlord');
}
```

Queries are scoped to `landlordId` to prevent cross-tenant data access.

### Audit Trail

All finance operations create `LedgerEntry` records:
- Immutable once created
- Include full context (landlord, property, tenancy, tenant, ref)
- Timestamp of business event (eventAt) vs creation time

### Data Masking

- Bank account numbers: store last 4 digits only
- Card details: never stored (use tokenization)
- Sensitive fields: marked in schema, masked in logs

## Currency

All amounts stored as Float (SQLite limitation). In production:
- Use Decimal(14,2) type (PostgreSQL)
- Store amounts in pence/cents (multiply by 100)
- Display with proper formatting

Current implementation: GBP, UK date format (DD/MM/YYYY)

## Future Enhancements

### Phase 1 (Complete)
- ✅ Invoice creation and management
- ✅ Payment recording and auto-allocation
- ✅ Arrears aging and reporting
- ✅ Rent roll calculation
- ✅ Mock mandate management
- ✅ Basic reconciliation matching

### Phase 2 (Planned)
- [ ] Real payment provider integration (GoCardless, Stripe)
- [ ] Bank feed integration (TrueLayer, Yapily)
- [ ] Webhook handlers with signature verification
- [ ] Idempotency middleware for API calls
- [ ] Late fee automation
- [ ] Recurring invoice generation
- [ ] Email notifications (invoice sent, payment received, arrears reminder)

### Phase 3 (Future)
- [ ] Advanced reconciliation (partial matching, splits)
- [ ] Automated payouts
- [ ] Multi-currency support
- [ ] VAT/tax handling
- [ ] Financial reports (P&L, balance sheet, cashflow)
- [ ] Export to accounting software (Xero, QuickBooks)
- [ ] Statement generation (PDF)
- [ ] Budgeting and forecasting

## Troubleshooting

### Invoice not updating to PAID status
- Check payment allocations: `PaymentAllocation.amount` should sum to `Invoice.grandTotal`
- Verify `updateInvoiceStatus` is called after allocation
- Check invoice status is not VOID

### Payment auto-allocation not working
- Ensure tenancy has unpaid invoices
- Check invoice `dueDate` sorting (oldest first)
- Verify invoice status is ISSUED or PART_PAID

### Arrears calculation incorrect
- Confirm invoice `dueDate` is in the past
- Check invoice status (VOID invoices excluded)
- Verify payment allocations are correct
- Review ledger entries for data consistency

### Reconciliation not suggesting matches
- Check bank transaction amount tolerance (±£1)
- Verify date window (±3 days)
- Ensure invoices exist in correct date range
- Check if invoices are already fully paid

## Support

For issues or questions:
1. Check this documentation
2. Review seed data for examples
3. Check API logs for errors
4. Verify database state with Prisma Studio

## License

Proprietary - Property Management Platform
