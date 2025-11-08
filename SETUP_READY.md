# ✅ Setup Ready - Run These Commands

The test environment is configured. Since Node.js isn't available in this shell, please run these commands in **your terminal** where Node.js is available.

## 🚀 Complete Setup (Copy & Paste)

```bash
# Navigate to project
cd /Users/peterhall/Desktop/Programmes/Property-Manager

# Backend setup
cd backend
npm install
npx prisma generate
npx prisma migrate reset --force
npm run seed

# Frontend setup
cd ../frontend-new
npm install
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env.local
```

## ✅ Verification

After running the commands above, verify:

```bash
# Check backend health
curl http://localhost:4000/api/health

# Should return: {"status":"ok",...}
```

## 🎯 Test Credentials

All users have password: `password123`

| Role | Email | Password |
|------|-------|----------|
| 🏢 **Landlord** | `landlord@example.com` | `password123` |
| 👤 **Tenant** | `tenant@example.com` | `password123` |
| 🔧 **Contractor** | `contractor@example.com` | `password123` |
| ⚙️ **OPS** | `ops@example.com` | `password123` |

## 🚀 Start Application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend-new
npm run dev
```

Then open: **http://localhost:5173**

## 📊 What Gets Created

- ✅ Database with all migrations
- ✅ 4 test users (all roles)
- ✅ 1 property
- ✅ 1 active tenancy
- ✅ 1 open ticket
- ✅ 3 invoices (paid, part-paid, overdue)
- ✅ 2 payments
- ✅ 1 active mandate
- ✅ 2 bank transactions

## 🔄 Reset Database (if needed)

```bash
cd backend
npm run seed
```

---

**Ready to go!** Run the setup commands above in your terminal.

