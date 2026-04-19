# Read-only Bank API Setup

This integration is intentionally read-only and only imports transactions.

## 1) Environment variables

Add these to your `.env.local` (or `.env`):

```env
BANK_TOKEN_ENCRYPTION_KEY="set-a-long-random-secret-at-least-32-characters"
BANK_API_BASE_URL="https://api.your-bank-provider.com"
BANK_API_TRANSACTIONS_PATH="/transactions"

# Optional local bank mock/testing
BANK_MOCK_PORT="4010"
BANK_SAMPLE_ACCESS_TOKEN="sample-read-token"
```

Generate a strong encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Validate required bank env vars:

```bash
npm run bank:env:check
```

## 2) Database pre-check

Make sure Prisma client and schema are up to date:

```bash
npm run prisma:generate
npm run prisma:migrate
```

## 3) Local sample smoke test

1. Start the local mock bank provider in one terminal:

```bash
npm run bank:mock-provider
```

2. In another terminal, point `BANK_API_BASE_URL` to the mock and run the smoke test:

```bash
export BANK_API_BASE_URL="http://127.0.0.1:4010"
npm run bank:test:sample
```

By default, the smoke test creates temporary sample data, runs sync twice to verify import + dedupe behavior, and then cleans up the sample records. Set `BANK_SAMPLE_KEEP_DATA=1` if you want to keep the sample connection/transactions.

## 4) Scope requirements

When creating a bank connection, the token scope must:

- include transaction/account read scope (example: `transactions:read`)
- not include write/payment/admin scope keywords
- target credit-card accounts only (for example: `Visa Credit`, `Mastercard Credit`, `Amex Credit`)

## 5) API endpoints

### 1) Save or update connection

`POST /api/bank/connections`

Body:

```json
{
  "provider": "GENERIC",
  "providerAccountId": "optional-credit-card-id",
  "accountLabel": "Visa Credit",
  "accessToken": "provider-access-token",
  "refreshToken": "optional-refresh-token",
  "tokenScope": "transactions:read accounts:read",
  "tokenExpiresAt": "2026-12-01T00:00:00.000Z"
}
```

### 2) List user connections

`GET /api/bank/connections`

### 3) Run transaction sync

`POST /api/bank/sync`

Body options:

```json
{
  "connectionId": "optional-connection-id",
  "provider": "GENERIC",
  "startDate": "2026-01-01",
  "endDate": "2026-04-19"
}
```

You can pass either `connectionId` or `provider`. If both are omitted, the first connection for the user is used.

## 6) Generic provider response shape

The configured endpoint should return:

```json
{
  "transactions": [
    {
      "id": "bank-transaction-id",
      "amount": -149.25,
      "currency": "PHP",
      "description": "Coffee Shop",
      "date": "2026-04-19T09:00:00.000Z",
      "direction": "debit",
      "category": "Food",
      "accountName": "UnionBank Savings"
    }
  ],
  "nextCursor": "optional-pagination-cursor"
}
```

Imported entries are deduplicated by `(connectionId, externalTransactionId)`.
