# Test Environment Setup - Complete ✅

## 🎉 What Was Created

A complete test environment setup with all user types and comprehensive seed data has been created for you.

## 📦 Files Created

### 1. Setup Scripts
- ✅ `setup-test-environment.sh` - One-command environment setup
- ✅ `backend/scripts/reset-test-db.sh` - Quick database reset script

### 2. Documentation
- ✅ `TEST_ENVIRONMENT_GUIDE.md` - Complete guide with all details
- ✅ `TEST_CREDENTIALS.md` - Quick reference for test credentials

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
./setup-test-environment.sh
```

This will:
- ✅ Check prerequisites
- ✅ Install all dependencies
- ✅ Set up database
- ✅ Seed test data
- ✅ Display credentials

### Option 2: Manual Setup

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

## 👥 Test Users Available

All users have password: `password123`

| Role | Email | Password | Access |
|------|-------|----------|--------|
| 🏢 **Landlord** | `landlord@example.com` | `password123` | Properties, Tenancies, Quotes, Finance |
| 👤 **Tenant** | `tenant@example.com` | `password123` | Report Issues, View Tickets, Tenancy |
| 🔧 **Contractor** | `contractor@example.com` | `password123` | View Jobs, Submit Quotes, Update Status |
| ⚙️ **OPS** | `ops@example.com` | `password123` | Queue Management, Assign Tickets, Analytics |

## 📊 Seed Data Included

### Properties
- ✅ 1 Property: 123 Main Street, London SW1A 1AA

### Tenancies
- ✅ 1 Active Tenancy: £1,500/month

### Tickets
- ✅ 1 Open Ticket: "Leaking kitchen tap" (HIGH priority)

### Finance Data
- ✅ 3 Invoices (paid, part-paid, overdue)
- ✅ 2 Payments
- ✅ 1 Active Direct Debit Mandate
- ✅ 2 Bank Transactions (1 matched, 1 unmatched)
- ✅ Ledger entries

### Organizations
- ✅ Acme Properties Ltd (Landlord org)
- ✅ Smith Family (Tenant org)

## 🧪 Testing Scenarios Ready

### Scenario 1: Complete Ticket Workflow
1. Login as Tenant → Create/View ticket
2. Login as Contractor → Submit quote
3. Login as Landlord → Approve quote
4. Back to Contractor → Complete job

### Scenario 2: Financial Management
1. Login as Landlord → View invoices
2. Check payment history
3. Reconcile bank transactions
4. View outstanding balances

### Scenario 3: Property Management
1. Login as Landlord → View properties
2. Manage tenancies
3. View property details

### Scenario 4: Queue Management
1. Login as OPS → View ticket queue
2. Assign tickets to contractors
3. Update priorities
4. Track SLA compliance

## 🔄 Resetting Test Data

### Quick Reset
```bash
cd backend
npm run seed
```

### Full Reset (Clean Slate)
```bash
cd backend
npx prisma migrate reset --force
npm run seed
```

Or use the helper script:
```bash
./backend/scripts/reset-test-db.sh
```

## 🚀 Starting the Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
→ http://localhost:4000/api

### Terminal 2: Frontend
```bash
cd frontend-new
npm run dev
```
→ http://localhost:5173

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `TEST_ENVIRONMENT_GUIDE.md` | Complete guide with all details |
| `TEST_CREDENTIALS.md` | Quick reference for credentials |
| `setup-test-environment.sh` | Automated setup script |

## ✅ Verification Checklist

After running setup, verify:

- [ ] Backend starts: `curl http://localhost:4000/api/health`
- [ ] Frontend starts: Open http://localhost:5173
- [ ] Can login with all 4 user types
- [ ] Each user sees appropriate dashboard
- [ ] Test data is visible (properties, tickets, invoices)

## 🎯 Next Steps

1. **Run Setup:**
   ```bash
   ./setup-test-environment.sh
   ```

2. **Start Servers:**
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2
   cd frontend-new && npm run dev
   ```

3. **Test Login:**
   - Open http://localhost:5173
   - Login with any test user
   - Explore the application

4. **Run Tests:**
   ```bash
   ./run-tests.sh all
   ```

## 🔍 Quick Reference

| Command | Purpose |
|---------|---------|
| `./setup-test-environment.sh` | Full environment setup |
| `cd backend && npm run seed` | Reset and seed database |
| `cd backend && npm run dev` | Start backend |
| `cd frontend-new && npm run dev` | Start frontend |
| `cd backend && npx prisma studio` | Browse database |

## 🎉 Status

**✅ TEST ENVIRONMENT READY**

All user types are configured with seed data. You can now:
- Test all user roles
- Test complete workflows
- Test financial features
- Test ticket management
- Run automated tests

---

**Ready to start?** Run `./setup-test-environment.sh` and begin testing!

