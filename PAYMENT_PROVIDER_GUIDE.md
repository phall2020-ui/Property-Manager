# Payment Provider Integration Guide

This guide explains how to integrate real payment providers (GoCardless and Stripe) with the Property Management platform.

## Overview

The platform supports multiple payment providers through a unified abstraction layer:
- **GoCardless**: Direct Debit payments (UK and EU)
- **Stripe**: Card payments and SEPA Direct Debit

All providers support:
- Customer management
- Mandate (Direct Debit authorization) creation
- Payment collection
- Refunds
- Webhook notifications with signature verification
- Idempotency for safe retries

## Provider Setup

### GoCardless Setup

1. **Create Account**
   - Sign up at https://gocardless.com
   - Choose between Sandbox (testing) and Live environments

2. **Get API Credentials**
   - Navigate to Developers → API
   - Copy your Access Token
   - Generate a Webhook Secret

3. **Configure Environment Variables**
   ```bash
   GOCARDLESS_ENVIRONMENT=sandbox  # or 'live'
   GOCARDLESS_ACCESS_TOKEN=your_access_token
   GOCARDLESS_WEBHOOK_SECRET=your_webhook_secret
   ```

4. **Set Up Webhook Endpoint**
   - In GoCardless Dashboard, go to Developers → Webhooks
   - Add webhook URL: `https://your-domain.com/api/webhooks/gocardless`
   - GoCardless will send test webhook to verify

### Stripe Setup

1. **Create Account**
   - Sign up at https://stripe.com
   - Access both Test and Live modes

2. **Get API Credentials**
   - Navigate to Developers → API keys
   - Copy your Secret Key (starts with `sk_test_` or `sk_live_`)

3. **Configure Environment Variables**
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

4. **Set Up Webhook Endpoint**
   - In Stripe Dashboard, go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `setup_intent.succeeded`
     - `setup_intent.setup_failed`
   - Copy the Webhook Signing Secret

## API Usage

### Creating a Customer

```typescript
// The provider abstracts customer creation
POST /api/finance/mandates
{
  "provider": "GOCARDLESS",  // or "STRIPE"
  "tenantUserId": "user-uuid",
  "tenancyId": "tenancy-uuid"
}
```

### Creating a Mandate (Direct Debit Authorization)

```typescript
POST /api/finance/mandates
{
  "provider": "GOCARDLESS",
  "tenantUserId": "user-uuid",
  "tenancyId": "tenancy-uuid",
  "scheme": "bacs"  // or "sepa_core" for SEPA
}

Response:
{
  "mandate": {
    "id": "md_xxx",
    "status": "pending_customer_approval",
    "reference": "REF-xxx"
  },
  "authorizationUrl": "https://pay.gocardless.com/flow/xxx"
}
```

The tenant needs to visit the `authorizationUrl` to authorize the Direct Debit.

### Creating a Payment

```typescript
POST /api/finance/payments
{
  "invoiceId": "invoice-uuid",
  "amountGBP": 1200.50,
  "method": "DD",
  "provider": "GOCARDLESS",
  "providerRef": "unique-reference-for-idempotency",
  "paidAt": "2025-11-07T10:00:00Z"
}
```

**Important**: Always include a unique `providerRef` for idempotency. If the request is retried with the same `providerRef`, the existing payment will be returned instead of creating a duplicate.

### Webhook Handling

Webhooks are automatically processed and verified:

1. **GoCardless Webhook**: `POST /api/webhooks/gocardless`
   - Signature verified using HMAC-SHA256
   - Events processed: payment confirmed, mandate activated, etc.

2. **Stripe Webhook**: `POST /api/webhooks/stripe`
   - Signature verified using Stripe's signature scheme
   - Events processed: payment succeeded, setup intent succeeded, etc.

All webhook events are logged to the `WebhookLog` table for debugging and replay.

## Idempotency

### Using Idempotency Keys

For critical operations (creating payments, mandates, invoices), include an `Idempotency-Key` header:

```bash
curl -X POST https://api.example.com/finance/payments \
  -H "Authorization: Bearer your-token" \
  -H "Idempotency-Key: unique-key-12345" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Key Requirements**:
- Must be a UUID or 16-64 character alphanumeric string
- Same key with same request body returns cached response
- Same key with different request body returns 409 Conflict
- Keys expire after 24 hours

### How It Works

1. First request with key creates resource and caches response
2. Duplicate requests with same key return cached response
3. Prevents accidental duplicate payments/invoices
4. Safe for network failures and retries

## Testing

### GoCardless Test Credentials

Use the Sandbox environment:
```
GOCARDLESS_ENVIRONMENT=sandbox
```

Test bank account numbers:
- `55779911` (will succeed)
- `00000000` (will fail)

### Stripe Test Cards

Common test card numbers:
- `4242 4242 4242 4242` - Succeeds
- `4000 0000 0000 0002` - Card declined
- `4000 0025 0000 3155` - Requires authentication (3D Secure)

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all secrets
3. **Rotate webhook secrets** regularly
4. **Monitor webhook logs** for suspicious activity
5. **Validate amounts** before processing payments
6. **Use HTTPS** in production
7. **Set up rate limiting** for webhook endpoints
8. **Verify signatures** on all webhook requests

## Troubleshooting

### Webhook Not Received

1. Check webhook endpoint is publicly accessible
2. Verify webhook secret matches configuration
3. Check webhook logs in provider dashboard
4. Review `WebhookLog` table for errors

### Payment Failed

1. Check payment status in provider dashboard
2. Verify mandate is active
3. Ensure sufficient balance (for Direct Debit)
4. Check customer bank details are correct

### Signature Verification Failed

1. Verify webhook secret is correct
2. Ensure request body is not modified
3. Check webhook endpoint receives raw body
4. Review signature verification logs

## Provider-Specific Notes

### GoCardless

- Payment collection takes 3-5 business days
- Direct Debit mandate needs customer authorization
- Supports BACS (UK) and SEPA (EU) schemes
- Automatic retry for failed payments

### Stripe

- Card payments are immediate
- SEPA Direct Debit takes 5-7 business days
- Strong Customer Authentication (SCA) required for EU
- Supports recurring payments with SetupIntents

## Migration Guide

To migrate from test to production:

1. Switch environment variables to production keys
2. Update webhook URLs in provider dashboards
3. Test with small amounts first
4. Monitor webhook logs closely
5. Set up alerting for failed payments

## Support

- GoCardless Support: https://support.gocardless.com
- Stripe Support: https://support.stripe.com
- Platform Issues: Check `WebhookLog` table and application logs
