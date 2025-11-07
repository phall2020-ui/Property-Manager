# Bank Feed Integration Guide

This guide explains how to integrate Open Banking providers (TrueLayer and Yapily) for automatic bank feed synchronization.

## Overview

The platform supports bank feed integration through Open Banking providers:
- **TrueLayer**: UK and EU bank connections
- **Yapily**: Global bank connections (200+ institutions)

Features:
- OAuth-based bank authorization
- Automatic transaction sync
- Balance monitoring
- Account reconciliation
- Multiple bank account support per landlord

## Provider Setup

### TrueLayer Setup

1. **Create Account**
   - Sign up at https://console.truelayer.com
   - Create a new application

2. **Get API Credentials**
   - Navigate to Settings → API Credentials
   - Note your Client ID and Client Secret
   - Add redirect URI: `https://your-domain.com/api/banking/callback`

3. **Configure Environment Variables**
   ```bash
   TRUELAYER_CLIENT_ID=your_client_id
   TRUELAYER_CLIENT_SECRET=your_client_secret
   ```

4. **Enable Permissions**
   - In TrueLayer Console, enable:
     - Account Information (read account details)
     - Transactions (read transaction history)
     - Balance (read account balance)
   - Set data retention period (default: 90 days)

### Yapily Setup

1. **Create Account**
   - Sign up at https://dashboard.yapily.com
   - Choose between Sandbox and Live environments

2. **Create Application**
   - Navigate to Applications → Create New
   - Select required permissions:
     - Read Accounts
     - Read Account Details
     - Read Transactions
     - Read Balances

3. **Get API Credentials**
   - Copy Application ID
   - Copy Application Secret (show once - save securely)

4. **Configure Environment Variables**
   ```bash
   YAPILY_ENVIRONMENT=sandbox  # or 'live'
   YAPILY_APPLICATION_ID=your_application_id
   YAPILY_APPLICATION_SECRET=your_application_secret
   ```

5. **Set Up Callback URL**
   - Add callback URL: `https://your-domain.com/api/banking/callback`

## Bank Connection Flow

### Step 1: Initialize Authorization

```typescript
POST /api/banking/connections
{
  "provider": "TRUELAYER",  // or "YAPILY"
  "redirectUri": "https://your-domain.com/banking/callback"
}

Response:
{
  "authorizationUrl": "https://auth.truelayer.com/?...",
  "state": "random-state-string"
}
```

Redirect the user to `authorizationUrl` to select their bank and authorize access.

### Step 2: Handle Callback

After user authorizes, they're redirected to your callback URL with code:
```
https://your-domain.com/banking/callback?code=AUTH_CODE&state=STATE
```

Exchange the code for access token:

```typescript
POST /api/banking/connections/callback
{
  "provider": "TRUELAYER",
  "code": "AUTH_CODE",
  "state": "STATE",
  "redirectUri": "https://your-domain.com/banking/callback"
}

Response:
{
  "connectionId": "conn-uuid",
  "status": "ACTIVE"
}
```

### Step 3: Fetch Accounts

```typescript
GET /api/banking/connections/{connectionId}/accounts

Response:
{
  "accounts": [
    {
      "id": "acc-uuid",
      "name": "Business Current Account",
      "accountNumber": "12345678",
      "sortCode": "12-34-56",
      "currency": "GBP",
      "balance": 15000.50
    }
  ]
}
```

### Step 4: Sync Transactions

```typescript
POST /api/banking/accounts/{accountId}/sync
{
  "startDate": "2025-01-01",
  "endDate": "2025-11-07"
}

Response:
{
  "synced": 45,
  "new": 12,
  "updated": 3
}
```

Transactions are automatically deduplicated using hash of transaction details.

## Automatic Reconciliation

Once transactions are synced, the system can automatically match them to invoices:

```typescript
POST /api/banking/reconcile/auto
{
  "startDate": "2025-01-01",
  "endDate": "2025-11-07",
  "bankAccountId": "acc-uuid"  // optional
}

Response:
{
  "matched": 8,
  "unmatched": 4,
  "confidence": {
    "high": 6,    // 90%+ confidence
    "medium": 2,  // 70-89% confidence
    "low": 0      // <70% confidence
  }
}
```

### Matching Algorithm

Transactions are matched to invoices based on:
1. **Amount matching** (within tolerance)
2. **Date proximity** (±5 days)
3. **Reference matching** (invoice number in description)
4. **Tenant matching** (if reference found)

Confidence scores:
- **90-100%**: Exact amount + reference match
- **70-89%**: Amount match + date proximity
- **<70%**: Amount match only

### Manual Reconciliation

For unmatched transactions:

```typescript
POST /api/banking/reconcile/manual
{
  "bankTransactionId": "tx-uuid",
  "invoiceId": "inv-uuid"
}
```

## Transaction Deduplication

The system prevents duplicate transactions using:
1. Hash of transaction details (date, amount, description)
2. Provider transaction ID
3. Date + amount + account combination

If duplicate detected, existing transaction is returned.

## Refresh Access Tokens

Bank connections expire after 90 days (TrueLayer) or when consent is revoked.

To refresh:

```typescript
POST /api/banking/connections/{connectionId}/refresh
```

This uses the stored refresh token to obtain new access token automatically.

## Webhook Support (Future)

Some providers support webhooks for transaction notifications:

### TrueLayer Webhooks

1. Configure webhook URL in TrueLayer Console
2. Subscribe to `transaction.new` events
3. Receive instant notification when new transaction occurs

### Yapily Webhooks

Currently limited webhook support. Polling recommended for transaction sync.

## Scheduled Sync

Configure automatic daily sync using cron:

```typescript
// In your cron configuration
@Cron('0 2 * * *')  // 2 AM daily
async syncAllBankAccounts() {
  const accounts = await this.bankingService.getAllActiveAccounts();
  
  for (const account of accounts) {
    await this.bankingService.syncTransactions(
      account.id,
      last7Days,
      today
    );
  }
}
```

## Security Best Practices

1. **Secure Token Storage**
   - Store access tokens encrypted
   - Never log sensitive token data
   - Rotate tokens before expiry

2. **Data Retention**
   - Only store necessary transaction data
   - Comply with GDPR and data retention policies
   - Allow users to disconnect and delete data

3. **Audit Logging**
   - Log all bank connection events
   - Track who accessed bank data
   - Monitor for unusual sync patterns

4. **User Consent**
   - Clear explanation of data access
   - Allow users to disconnect anytime
   - Display last sync time

## Testing

### TrueLayer Sandbox

Test bank credentials:
- Username: `test`
- Password: `test`
- OTP: `123456`

Mock bank provides test transactions for development.

### Yapily Sandbox

Use Yapily's mock institutions:
- `modelo-sandbox` - Full feature support
- `teste-sandbox` - Error simulation

## Error Handling

### Connection Errors

```typescript
{
  "error": "CONNECTION_EXPIRED",
  "message": "Bank connection expired. Please reconnect.",
  "reconnectUrl": "https://..."
}
```

Actions:
1. Notify user connection expired
2. Provide reconnect link
3. Mark connection as expired in database

### Sync Errors

```typescript
{
  "error": "SYNC_FAILED",
  "message": "Failed to fetch transactions",
  "reason": "Rate limit exceeded",
  "retryAfter": 3600
}
```

Actions:
1. Log error with context
2. Schedule retry if transient
3. Alert if persistent failure

### Insufficient Permissions

```typescript
{
  "error": "PERMISSION_DENIED",
  "message": "Missing permission: read_transactions"
}
```

Actions:
1. Request user to reconnect with full permissions
2. Display clear error message

## Rate Limits

### TrueLayer
- 300 requests per minute per client
- 10,000 requests per day

### Yapily
- 10 requests per second per application
- Burst: 20 requests

**Best Practice**: Implement exponential backoff for rate limit errors.

## Provider Comparison

| Feature | TrueLayer | Yapily |
|---------|-----------|---------|
| UK Banks | ✅ Full support | ✅ Full support |
| EU Banks | ✅ SEPA | ✅ Global |
| Real-time | ✅ Yes | ⚠️ Limited |
| Webhooks | ✅ Yes | ⚠️ Limited |
| Token Lifetime | 90 days | 90 days |
| Transaction History | 24 months | 24 months |
| Pricing | Per API call | Per connection |

## Troubleshooting

### Bank Connection Failed

1. Check provider credentials are correct
2. Verify callback URL matches configuration
3. Ensure bank is supported by provider
4. Check provider status page for outages

### Transactions Not Syncing

1. Verify connection is active
2. Check token expiry
3. Review sync logs for errors
4. Confirm date range is valid

### Reconciliation Not Matching

1. Check amount tolerance setting
2. Verify invoice references in descriptions
3. Review confidence threshold
4. Use manual reconciliation as fallback

## Support

- TrueLayer Support: support@truelayer.com
- Yapily Support: support@yapily.com
- Documentation: Check provider API docs
- Platform Issues: Review application logs and `BankTransaction` table
