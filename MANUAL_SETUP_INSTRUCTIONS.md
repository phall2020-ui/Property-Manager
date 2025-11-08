# Manual Setup Instructions

Since Node.js is not available in the current shell PATH, please run these commands in your terminal where Node.js is available.

## 🚀 Quick Setup (Copy & Paste)

### Step 1: Navigate to Project Root

```bash
cd /Users/peterhall/Desktop/Programmes/Property-Manager
```

### Step 2: Run Automated Setup

```bash
./setup-test-environment.sh
```

**OR** if that doesn't work, run manually:

### Step 2 (Manual): Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies (if not already installed)
npm install

# Generate Prisma client
npx prisma generate

# Reset and migrate database
npx prisma migrate reset --force

# Seed database with test data
npm run seed
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend
cd ../frontend-new

# Install dependencies (if not already installed)
npm install

# Create .env.local if it doesn't exist
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:4000/api
EOF
```

## ✅ Verification

After setup, verify everything works:

### 1. Check Backend

```bash
cd backend
npm run dev
```

In another terminal:
```bash
curl http://localhost:4000/api/health
```

Should return: `{"status":"ok",...}`

### 2. Check Frontend

```bash
cd frontend-new
npm run dev
```

Open: http://localhost:5173

### 3. Test Login

Use any of these credentials:
- **Landlord:** `landlord@example.com` / `password123`
- **Tenant:** `tenant@example.com` / `password123`
- **Contractor:** `contractor@example.com` / `password123`
- **OPS:** `ops@example.com` / `password123`

## 📋 Test Credentials Summary

All users have password: `password123`

| Role | Email |
|------|-------|
| 🏢 Landlord | `landlord@example.com` |
| 👤 Tenant | `tenant@example.com` |
| 🔧 Contractor | `contractor@example.com` |
| ⚙️ OPS | `ops@example.com` |

## 🔄 Resetting Database

If you need to reset the test data:

```bash
cd backend
npm run seed
```

Or for a complete reset:

```bash
cd backend
npx prisma migrate reset --force
npm run seed
```

## 🐛 Troubleshooting

### Node.js Not Found

If you get "node: command not found":
1. Make sure Node.js is installed: `node --version`
2. If using nvm: `nvm use` (check for `.nvmrc` file)
3. Add Node.js to PATH in your shell profile

### Database Issues

If database errors occur:
```bash
cd backend
rm -f dev.db test.db
npx prisma migrate reset --force
npm run seed
```

### Port Already in Use

If port 4000 or 5173 is in use:
```bash
# Find process
lsof -i :4000
lsof -i :5173

# Kill process or change port in .env
```

## 📚 Next Steps

Once setup is complete:
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend-new && npm run dev`
3. Open http://localhost:5173
4. Login with test credentials
5. Explore the application!

For more details, see: `TEST_ENVIRONMENT_GUIDE.md`

