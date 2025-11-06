# Finance API Guide - Production Grade Implementation

## Overview

This guide provides comprehensive documentation for the Finance module API endpoints, designed for UK residential property platforms with rent invoicing, payments, and reconciliation.

## Table of Contents

- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Invoice Management](#invoice-management)
  - [Payment Processing](#payment-processing)
  - [Property Rent Summary](#property-rent-summary)
  - [CSV Exports](#csv-exports)
  - [Tenant Views](#tenant-views)
  - [Test Webhook](#test-webhook)
- [Data Models](#data-models)
- [Business Logic](#business-logic)
- [Error Handling](#error-handling)
- [Testing Examples](#testing-examples)

## Authentication

All endpoints require JWT authentication via Bearer token.

```bash
# Login to get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "landlord@example.com",
    "password": "password123"
  }'

# Use token in subsequent requests
export TOKEN="<your-jwt-token>"
```

## API Endpoints

### Invoice Management

#### Create Invoice (LANDLORD)

Creates a new rent invoice for a tenancy period. Prevents overlapping periods.

```bash
curl -X POST http://localhost:4000/api/finance/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: invoice-2025-01-tenant-123" \
  -d '{
    "tenancyId": "<tenancy-id>",
    "periodStart": "2025-01-01",
    "periodEnd": "2025-01-31",
    "dueAt": "2025-01-05",
    "amountGBP": 1200.00,
    "reference": "2025-01 Rent",
    "notes": "January rent payment"
  }'
```

**Response:** `201 Created`
```json
{
  "id": "inv-123",
  "landlordId": "ll-1",
  "propertyId": "prop-1",
  "tenancyId": "ten-1",
  "number": "INV-2025-000001",
  "reference": "2025-01 Rent",
  "periodStart": "2025-01-01T00:00:00.000Z",
  "periodEnd": "2025-01-31T00:00:00.000Z",
  "dueAt": "2025-01-05T00:00:00.000Z",
  "amountGBP": 1200.00,
  "status": "DUE",
  "notes": "January rent payment",
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z"
}
```

#### List Invoices (LANDLORD)

```bash
curl -X GET "http://localhost:4000/api/finance/invoices?tenancyId=<tenancy-id>&status=DUE&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Query Parameters:**
- `tenancyId` (optional): Filter by tenancy
- `propertyId` (optional): Filter by property
- `status` (optional): DRAFT, DUE, PART_PAID, PAID, LATE, VOID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

#### Get Invoice Detail (LANDLORD)

```bash
curl -X GET http://localhost:4000/api/finance/invoices/<invoice-id> \
  -H "Authorization: Bearer $TOKEN"
```

#### Void Invoice (LANDLORD)

Voids an unpaid invoice. Only allowed if no payments recorded.

```bash
curl -X POST http://localhost:4000/api/finance/invoices/<invoice-id>/void \
  -H "Authorization: Bearer $TOKEN"
```

### Payment Processing

#### Record Manual Payment (LANDLORD)

Records a payment against an invoice. Idempotent by `providerRef`.

```bash
curl -X POST http://localhost:4000/api/finance/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: payment-manual-123" \
  -d '{
    "invoiceId": "<invoice-id>",
    "amountGBP": 1200.00,
    "paidAt": "2025-01-03T14:30:00.000Z",
    "method": "BANK_TRANSFER",
    "provider": "OTHER",
    "providerRef": "manual_payment_20250103_1430",
    "feeGBP": 0.00,
    "vatGBP": 0.00
  }'
```

**Payment Methods:**
- `BANK_TRANSFER`
- `DD` (Direct Debit)
- `CARD`
- `CASH`
- `OTHER`

**Payment Providers:**
- `TEST`
- `GOCARDLESS`
- `STRIPE`
- `OPEN_BANKING`
- `OTHER`

**Response:** `201 Created`
```json
{
  "id": "pay-123",
  "landlordId": "ll-1",
  "propertyId": "prop-1",
  "tenancyId": "ten-1",
  "invoiceId": "inv-123",
  "amountGBP": 1200.00,
  "method": "BANK_TRANSFER",
  "provider": "OTHER",
  "providerRef": "manual_payment_20250103_1430",
  "status": "SETTLED",
  "paidAt": "2025-01-03T14:30:00.000Z",
  "allocatedAmount": 1200.00,
  "unallocatedAmount": 0.00,
  "createdAt": "2025-01-03T14:35:00.000Z"
}
```

#### List Payments (LANDLORD)

```bash
curl -X GET "http://localhost:4000/api/finance/payments?tenancyId=<tenancy-id>&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Property Rent Summary

Get comprehensive rent management data for a property.

```bash
curl -X GET http://localhost:4000/api/finance/properties/<property-id>/rent/summary \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "nextDueAt": "2025-02-01T00:00:00.000Z",
  "arrearsAmount": 0.00,
  "collectedThisMonth": 1200.00,
  "expectedThisMonth": 1200.00,
  "collectionRate": 100.00,
  "invoices": [
    {
      "id": "inv-123",
      "reference": "2025-01 Rent",
      "periodStart": "2025-01-01T00:00:00.000Z",
      "periodEnd": "2025-01-31T00:00:00.000Z",
      "dueAt": "2025-01-05T00:00:00.000Z",
      "amount": 1200.00,
      "paidAmount": 1200.00,
      "balance": 0.00,
      "status": "PAID"
    }
  ],
  "payments": [
    {
      "id": "pay-123",
      "amount": 1200.00,
      "paidAt": "2025-01-03T14:30:00.000Z",
      "method": "BANK_TRANSFER",
      "invoiceReference": "2025-01 Rent"
    }
  ]
}
```

### CSV Exports

#### Export Rent Roll (LANDLORD)

```bash
curl -X GET "http://localhost:4000/api/finance/exports/rent-roll?month=2025-01" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "filename": "rent-roll-2025-01.csv",
  "content": "Property,Tenancy,Period,Expected Rent,Received Rent,Variance,Has Mandate\n...",
  "contentType": "text/csv"
}
```

#### Export Payments Ledger (LANDLORD)

```bash
curl -X GET "http://localhost:4000/api/finance/exports/payments?from=2025-01-01&to=2025-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "filename": "payments-2025-01-01-to-2025-01-31.csv",
  "content": "Date,Property,Tenant,Invoice Reference,Amount,Method,Provider,Status\n...",
  "contentType": "text/csv"
}
```

### Tenant Views

#### List Tenant Invoices (TENANT)

Tenant can only see invoices for their own tenancy.

```bash
# Login as tenant first
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@example.com",
    "password": "password123"
  }'

export TENANT_TOKEN="<tenant-jwt-token>"

curl -X GET "http://localhost:4000/api/tenant/payments/invoices?status=DUE" \
  -H "Authorization: Bearer $TENANT_TOKEN"
```

#### Get Tenant Invoice Detail (TENANT)

```bash
curl -X GET http://localhost:4000/api/tenant/payments/invoices/<invoice-id> \
  -H "Authorization: Bearer $TENANT_TOKEN"
```

#### Get Payment Receipt (TENANT)

```bash
curl -X GET http://localhost:4000/api/tenant/payments/receipts/<invoice-id> \
  -H "Authorization: Bearer $TENANT_TOKEN"
```

**Response:**
```json
{
  "invoice": {
    "id": "inv-123",
    "number": "INV-2025-000001",
    "reference": "2025-01 Rent",
    "periodStart": "2025-01-01T00:00:00.000Z",
    "periodEnd": "2025-01-31T00:00:00.000Z",
    "dueAt": "2025-01-05T00:00:00.000Z",
    "amount": 1200.00,
    "status": "PAID"
  },
  "property": {
    "address": "123 Main Street, London, SW1A 1AA"
  },
  "payments": [
    {
      "id": "pay-123",
      "amount": 1200.00,
      "paidAt": "2025-01-03T14:30:00.000Z",
      "method": "BANK_TRANSFER"
    }
  ],
  "paidAmount": 1200.00,
  "balance": 0.00
}
```

### Test Webhook

Simulate payment provider callback (TEST/DEV only).

```bash
curl -X POST http://localhost:4000/api/finance/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "<invoice-id>",
    "amountGBP": 1200.00,
    "paidAt": "2025-01-03T14:30:00.000Z",
    "providerRef": "test_payment_20250103_1430",
    "method": "CARD",
    "provider": "TEST"
  }'
```

**Note:** No authentication required for webhooks. Production webhooks should verify signatures.

## Data Models

### Invoice

```typescript
interface Invoice {
  id: string;
  landlordId: string;
  propertyId: string;
  tenancyId: string;
  number: string;              // Auto-generated: INV-YYYY-NNNNNN
  reference: string;           // Human-readable: "2025-01 Rent"
  periodStart: Date;           // Billing period start
  periodEnd: Date;             // Billing period end
  dueAt: Date;                 // Payment due date
  amountGBP: number;           // Decimal(12,2) in Postgres
  status: InvoiceStatus;       // DRAFT | DUE | PART_PAID | PAID | LATE | VOID
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment

```typescript
interface Payment {
  id: string;
  landlordId: string;
  propertyId: string;
  tenancyId: string;
  invoiceId: string;
  amountGBP: number;
  method: PaymentMethod;       // BANK_TRANSFER | DD | CARD | CASH | OTHER
  provider: Provider;          // TEST | GOCARDLESS | STRIPE | OPEN_BANKING
  providerRef: string;         // Unique - used for idempotency
  status: PaymentStatus;       // PENDING | SETTLED | FAILED
  feeGBP?: number;            // Payment processing fee
  vatGBP?: number;            // VAT on fee
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Business Logic

### Invoice Status Flow

```
DRAFT → DUE → PART_PAID → PAID
         ↓
       LATE (if past dueAt and balance > 0)
         ↓
     PART_PAID or PAID (when payment received)
```

### Status Calculation Logic

- **DUE**: No payments, not overdue
- **PART_PAID**: Some payment received but balance > 0, not overdue
- **PAID**: Full amount received (paidAmount >= amountGBP)
- **LATE**: Overdue (now > dueAt) and balance > 0
- **VOID**: Manually voided (only if no payments)

### Period Overlap Prevention

The system prevents creating multiple invoices for overlapping periods on the same tenancy:
- Unique constraint: `[tenancyId, periodStart, periodEnd]`
- API validation checks for period overlap before creation
- Returns 400 Bad Request if overlap detected

### Idempotency

Payments are idempotent by `providerRef`:
- First request creates payment
- Duplicate `providerRef` returns existing payment (200 OK)
- Prevents duplicate charges
- Essential for webhook retry handling

## Error Handling

### Problem Details Format (RFC 7807)

```json
{
  "type": "https://api.example.com/errors/invoice-overlap",
  "title": "Invoice Period Overlap",
  "status": 400,
  "detail": "An invoice already exists for this period",
  "traceId": "req-123"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid input, overlap detected
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Idempotency key conflict (same key, different data)
- `422 Unprocessable Entity`: Validation errors

## Testing Examples

### End-to-End Workflow

```bash
# 1. Create invoice as landlord
INVOICE_ID=$(curl -s -X POST http://localhost:4000/api/finance/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenancyId": "'$TENANCY_ID'",
    "periodStart": "2025-01-01",
    "periodEnd": "2025-01-31",
    "dueAt": "2025-01-05",
    "amountGBP": 1200.00,
    "reference": "2025-01 Rent"
  }' | jq -r '.id')

echo "Created invoice: $INVOICE_ID"

# 2. Tenant views invoice
curl -X GET http://localhost:4000/api/tenant/payments/invoices \
  -H "Authorization: Bearer $TENANT_TOKEN"

# 3. Simulate payment webhook
curl -X POST http://localhost:4000/api/finance/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "'$INVOICE_ID'",
    "amountGBP": 1200.00,
    "paidAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "providerRef": "test_'$(date +%s)'",
    "method": "BANK_TRANSFER",
    "provider": "TEST"
  }'

# 4. Verify invoice status updated to PAID
curl -X GET http://localhost:4000/api/finance/invoices/$INVOICE_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.status'

# 5. Tenant downloads receipt
curl -X GET http://localhost:4000/api/tenant/payments/receipts/$INVOICE_ID \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  > receipt.json
```

### Testing Overlap Prevention

```bash
# Create first invoice
curl -X POST http://localhost:4000/api/finance/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenancyId": "'$TENANCY_ID'",
    "periodStart": "2025-01-01",
    "periodEnd": "2025-01-31",
    "dueAt": "2025-01-05",
    "amountGBP": 1200.00
  }'

# Try to create overlapping invoice (should fail)
curl -X POST http://localhost:4000/api/finance/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenancyId": "'$TENANCY_ID'",
    "periodStart": "2025-01-15",
    "periodEnd": "2025-02-14",
    "dueAt": "2025-01-20",
    "amountGBP": 1200.00
  }'
# Expected: 400 Bad Request - "Overlapping invoice period exists"
```

### Testing Idempotency

```bash
# First payment
curl -X POST http://localhost:4000/api/finance/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "'$INVOICE_ID'",
    "amountGBP": 600.00,
    "paidAt": "2025-01-03T10:00:00.000Z",
    "method": "BANK_TRANSFER",
    "providerRef": "payment_abc_123"
  }'

# Retry with same providerRef (should return existing payment)
curl -X POST http://localhost:4000/api/finance/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "'$INVOICE_ID'",
    "amountGBP": 600.00,
    "paidAt": "2025-01-03T10:00:00.000Z",
    "method": "BANK_TRANSFER",
    "providerRef": "payment_abc_123"
  }'
# Expected: 200 OK - Returns existing payment (idempotent)
```

## Production Considerations

### Security
- [ ] Enable HTTPS in production
- [ ] Implement webhook signature verification
- [ ] Add rate limiting on public endpoints
- [ ] Mask PII in logs
- [ ] Regular security audits

### Performance
- [ ] Add caching for property summaries
- [ ] Database query optimization with proper indexes
- [ ] Consider read replicas for reporting queries

### Monitoring
- [ ] Track payment success rates
- [ ] Monitor invoice creation patterns
- [ ] Alert on failed payments
- [ ] Dashboard for financial KPIs

### Compliance
- [ ] GDPR data retention policies
- [ ] Audit trail for all financial operations
- [ ] PCI DSS compliance for card payments
- [ ] Client money regulations (FCA in UK)

### Future Enhancements
- [ ] Automated recurring invoice generation
- [ ] Late fee automation
- [ ] Multi-currency support
- [ ] Bank feed integration (TrueLayer, Yapily)
- [ ] Real payment provider integration (GoCardless, Stripe)
- [ ] Email notification queue with retries
- [ ] PDF receipt generation
- [ ] Statement generation
- [ ] Financial reporting (P&L, balance sheet)

## Support

For issues or questions:
1. Check this documentation
2. Review seed data examples
3. Check API logs for errors
4. Verify database state with Prisma Studio
5. Contact support team

## License

Proprietary - Property Management Platform
