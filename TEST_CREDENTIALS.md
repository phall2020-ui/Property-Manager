# Test Credentials - Quick Reference

## 🔐 All Users

**Default Password:** `password123` (for all users)

---

## 🏢 Landlord

```
Email:    landlord@example.com
Password: password123
Org:      Acme Properties Ltd
```

**Access:**
- Properties management
- Tenancies management
- Approve maintenance quotes
- Financial reports
- Invoice management
- Payment tracking

---

## 👤 Tenant

```
Email:    tenant@example.com
Password: password123
Org:      Smith Family
```

**Access:**
- Report maintenance issues
- View own tickets
- Track ticket status
- View tenancy details
- Payment history

---

## 🔧 Contractor

```
Email:    contractor@example.com
Password: password123
Org:      Acme Properties Ltd (member)
```

**Access:**
- View assigned jobs
- Submit quotes
- Update job status
- Mark jobs complete
- Upload photos

---

## ⚙️ Operations (OPS)

```
Email:    ops@example.com
Password: password123
Org:      Acme Properties Ltd (member)
```

**Access:**
- View ticket queue
- Assign contractors
- Manage priorities
- Track SLA compliance
- System analytics

---

## 📊 Test Data Summary

### Properties
- 1 Property: 123 Main Street, London SW1A 1AA

### Tenancies
- 1 Active Tenancy: £1,500/month

### Tickets
- 1 Open Ticket: "Leaking kitchen tap" (HIGH priority)

### Finance
- 3 Invoices (1 paid, 1 part-paid, 1 overdue)
- 2 Payments
- 1 Active Mandate
- 2 Bank Transactions

---

## 🚀 Quick Setup

```bash
# One-command setup
./setup-test-environment.sh

# Or manually
cd backend && npm run seed
```

---

## 🔗 Application URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000/api
- **API Docs:** http://localhost:4000/api/docs
- **Health Check:** http://localhost:4000/api/health

---

**For detailed guide, see:** `TEST_ENVIRONMENT_GUIDE.md`

