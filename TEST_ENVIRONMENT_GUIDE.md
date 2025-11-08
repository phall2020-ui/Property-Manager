# Test Environment Guide

Complete guide for setting up and using the test environment with all user types.

## 🚀 Quick Setup

### One-Command Setup

```bash
./setup-test-environment.sh
```

This script will:
- ✅ Check prerequisites (Node.js, npm)
- ✅ Install backend dependencies
- ✅ Generate Prisma client
- ✅ Reset and migrate database
- ✅ Seed database with test data
- ✅ Install frontend dependencies
- ✅ Create environment files
- ✅ Display test credentials

### Manual Setup

If you prefer to set up manually:

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate reset --force
npm run seed

# Frontend
cd frontend-new
npm install
```

## 👥 Test Users

All users have the password: `password123`

### 🏢 Landlord
- **Email:** `landlord@example.com`
- **Password:** `password123`
- **Organization:** Acme Properties Ltd
- **Access:**
  - View and manage properties
  - Manage tenancies
  - Approve/decline maintenance quotes
  - View financial reports
  - Track rent payments
  - Manage invoices

### 👤 Tenant
- **Email:** `tenant@example.com`
- **Password:** `password123`
- **Organization:** Smith Family
- **Access:**
  - Report maintenance issues
  - View own tickets
  - Track ticket status
  - View tenancy details
  - See payment history

### 🔧 Contractor
- **Email:** `contractor@example.com`
- **Password:** `password123`
- **Organization:** Acme Properties Ltd (member)
- **Access:**
  - View assigned jobs
  - Submit quotes for work
  - Update job status
  - Mark jobs as complete
  - Upload completion photos

### ⚙️ Operations (OPS)
- **Email:** `ops@example.com`
- **Password:** `password123`
- **Organization:** Acme Properties Ltd (member)
- **Access:**
  - View all tickets in queue
  - Assign contractors to jobs
  - Manage ticket priorities
  - Track SLA compliance
  - View system analytics

## 📊 Seed Data Overview

### Properties
- **1 Property:** 123 Main Street, Apt 4B, London SW1A 1AA
  - 2 bedrooms
  - Owned by Acme Properties Ltd

### Tenancies
- **1 Active Tenancy:**
  - Property: 123 Main Street
  - Tenant: Smith Family
  - Monthly Rent: £1,500
  - Status: ACTIVE
  - Start: 2024-01-01
  - End: 2025-01-01

### Tickets
- **1 Open Ticket:**
  - Title: "Leaking kitchen tap"
  - Description: "The kitchen tap has been dripping constantly for the past week. Needs urgent repair."
  - Priority: HIGH
  - Status: OPEN
  - Created by: Tenant

### Finance Data
- **3 Invoices:**
  1. INV-2024-000001 - Paid in full (£1,500)
  2. INV-2024-000002 - Partially paid (£750 paid, £750 outstanding)
  3. INV-2024-000003 - Overdue (£1,500)

- **2 Payments:**
  - Payment 1: £1,500 (for invoice 1)
  - Payment 2: £750 (partial for invoice 2)

- **1 Active Mandate:**
  - Provider: GoCardless
  - Reference: MD-MOCK-12345
  - Status: ACTIVE

- **2 Bank Transactions:**
  - 1 matched transaction (£1,500)
  - 1 unmatched transaction (£1,500)

- **Outstanding Balance:** £2,250
  - £750 (part-paid invoice)
  - £1,500 (overdue invoice)

## 🧪 Testing Scenarios

### Scenario 1: Complete Ticket Workflow

1. **Login as Tenant**
   - Email: `tenant@example.com`
   - Password: `password123`
   - Action: View existing ticket or create new ticket

2. **Login as Contractor**
   - Email: `contractor@example.com`
   - Password: `password123`
   - Action: View ticket, submit quote

3. **Login as Landlord**
   - Email: `landlord@example.com`
   - Password: `password123`
   - Action: Approve quote

4. **Back to Contractor**
   - Action: Mark job as complete

### Scenario 2: Financial Management

1. **Login as Landlord**
   - View invoices (3 total)
   - See payment history
   - Check outstanding balance
   - View bank transactions
   - Reconcile unmatched transaction

### Scenario 3: Property Management

1. **Login as Landlord**
   - View property details
   - View tenancy information
   - Manage property notes

### Scenario 4: Queue Management

1. **Login as OPS**
   - View ticket queue
   - Assign tickets to contractors
   - Update ticket priorities
   - Track SLA compliance

## 🔄 Resetting Test Data

### Quick Reset

```bash
cd backend
npm run seed
```

This will:
- Reset the database
- Re-run migrations
- Re-seed all test data

### Full Reset (Clean Slate)

```bash
cd backend
npx prisma migrate reset --force
npm run seed
```

This will:
- Drop all data
- Re-run all migrations
- Re-seed test data

## 🚀 Starting the Application

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

Backend will start on: `http://localhost:4000`
- API: `http://localhost:4000/api`
- Docs: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/health`

### Terminal 2: Frontend

```bash
cd frontend-new
npm run dev
```

Frontend will start on: `http://localhost:5173`

## 🧪 Running Tests

### Unit Tests

```bash
# Frontend
cd frontend-new
npm test

# Backend
cd backend
npm test
```

### E2E Tests

```bash
cd frontend-new
npm run test:e2e
```

**Note:** E2E tests will automatically start the backend and frontend servers.

### All Tests

```bash
./run-tests.sh all
```

## 📝 Test Data Details

### Organizations

1. **Acme Properties Ltd** (LANDLORD)
   - Members: Landlord, Contractor, OPS
   - Properties: 1
   - Tenancies: 1

2. **Smith Family** (TENANT)
   - Members: Tenant
   - Tenancies: 1

### User Relationships

```
Acme Properties Ltd (Landlord Org)
├── Alice Landlord (LANDLORD role)
├── Charlie Contractor (CONTRACTOR role)
└── Diana Operations (OPS role)

Smith Family (Tenant Org)
└── Bob Tenant (TENANT role)
```

### Data Relationships

```
Property (123 Main Street)
└── Tenancy (Active, £1,500/month)
    ├── Tenant: Bob Tenant
    ├── Ticket: "Leaking kitchen tap" (OPEN, HIGH)
    ├── Invoice 1: Paid (£1,500)
    ├── Invoice 2: Part-paid (£750 paid, £750 due)
    └── Invoice 3: Overdue (£1,500)
```

## 🔍 Verifying Setup

### Check Backend

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### Check Database

```bash
cd backend
npx prisma studio
```

This opens Prisma Studio where you can browse all data.

### Check Login

1. Open `http://localhost:5173`
2. Login with any test user
3. Verify you see the appropriate dashboard

## 🐛 Troubleshooting

### Database Issues

**Problem:** Database not found or corrupted

**Solution:**
```bash
cd backend
npx prisma migrate reset --force
npm run seed
```

### Port Already in Use

**Problem:** Port 4000 or 5173 already in use

**Solution:**
```bash
# Find process using port
lsof -i :4000
lsof -i :5173

# Kill process or change port in .env
```

### Seed Data Not Appearing

**Problem:** Login works but no data visible

**Solution:**
1. Verify database is seeded: `cd backend && npm run seed`
2. Check user is in correct organization
3. Verify org memberships in Prisma Studio

### Prisma Client Not Generated

**Problem:** "PrismaClient is not generated" error

**Solution:**
```bash
cd backend
npx prisma generate
```

## 📚 Additional Resources

- **API Documentation:** http://localhost:4000/api/docs
- **Prisma Studio:** `cd backend && npx prisma studio`
- **Test Credentials:** See above
- **Seed Script:** `backend/prisma/seed.ts`

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `./setup-test-environment.sh` | Full environment setup |
| `cd backend && npm run seed` | Reset and seed database |
| `cd backend && npm run dev` | Start backend server |
| `cd frontend-new && npm run dev` | Start frontend server |
| `./run-tests.sh all` | Run all tests |
| `cd backend && npx prisma studio` | Browse database |

---

**Ready to test?** Run `./setup-test-environment.sh` and start exploring!

