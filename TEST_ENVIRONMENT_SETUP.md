# Test Environment Setup Guide

## Environment Variables for Testing

### Frontend Test Environment

Create `frontend-new/.env.test` (optional - defaults are provided):

```env
# API Base URL for testing
VITE_API_BASE_URL=http://localhost:4000/api

# Base URL for E2E tests
BASE_URL=http://localhost:5173

# API URL for E2E tests
API_URL=http://localhost:4000
```

### Backend Test Environment

Create `backend/.env.test` (optional - defaults are provided):

```env
# Database (SQLite for local testing, PostgreSQL for CI)
DATABASE_URL=file:./test.db
# For CI with PostgreSQL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pm_test

# Redis (optional, will gracefully degrade if not available)
REDIS_URL=redis://localhost:6379

# JWT Secrets (use different values in production!)
JWT_ACCESS_SECRET=test-access-secret-change-in-production
JWT_REFRESH_SECRET=test-refresh-secret-change-in-production

# Environment
NODE_ENV=test
PORT=4000

# Frontend URL
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# AWS S3 (optional, for file uploads)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Email (optional, for notifications)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Stripe (optional, for payments)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

## Quick Setup

### 1. Install Dependencies

```bash
# Frontend
cd frontend-new
npm install --save-dev @vitest/coverage-v8

# Backend
cd backend
npm install --save-dev jest-junit
```

### 2. Install Playwright Browsers (for E2E tests)

```bash
cd frontend-new
npx playwright install --with-deps
```

### 3. Setup Test Database (Backend)

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations (creates test.db if using SQLite)
npx prisma migrate deploy

# Seed test data (optional, but recommended)
npm run seed
```

### 4. Run Tests

Use the provided script:

```bash
# Run all tests
./run-tests.sh all

# Run with coverage
./run-tests.sh coverage

# Run E2E tests
./run-tests.sh e2e
```

Or run manually:

```bash
# Frontend
cd frontend-new
npm test
npm run test:coverage
npm run test:e2e

# Backend
cd backend
npm test
npm run test:coverage
```

## Test Data

The seed script (`backend/prisma/seed.ts`) creates test users:

- **Landlord:** `landlord@example.com` / `password123`
- **Tenant:** `tenant@example.com` / `password123`
- **Contractor:** `contractor@example.com` / `password123`
- **Ops:** `ops@example.com` / `password123`

These credentials are used in E2E tests.

## CI/CD Environment

In GitHub Actions, the following environment variables are set automatically:

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pm_ci`
- `REDIS_URL=redis://localhost:6379`
- `NODE_ENV=test`
- `JWT_ACCESS_SECRET=test-access-secret`
- `JWT_REFRESH_SECRET=test-refresh-secret`

No manual setup required for CI.

