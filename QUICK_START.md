# Quick Start Guide

Get the Property Management Platform running in 5 minutes.

## ⚡ Prerequisites

- Node.js 20+
- Docker Desktop running
- Terminal/Command Prompt

## 🚀 Setup (First Time Only)

### Option 1: Automated Setup (Recommended)
```bash
./setup.sh
```

### Option 2: Manual Setup
```bash
# 1. Backend
cd backend
npm install
docker compose up -d
npx prisma generate
npx prisma migrate deploy
npm run seed  # Optional: adds sample data

# 2. Frontend
cd ../frontend
npm install
```

## ▶️ Running the Application

### Start Backend (Terminal 1)
```bash
./start-backend.sh
# or
cd backend && npm run dev
```

✅ Backend running at: http://localhost:4000  
📚 API docs at: http://localhost:4000/api/docs

### Start Frontend (Terminal 2)
```bash
./start-frontend.sh
# or
cd frontend && npm run dev
```

✅ Frontend running at: http://localhost:3000

## 🧪 Test the Integration

1. Open http://localhost:3000
2. Click "Sign up"
3. Create account:
   - Email: `landlord@test.com`
   - Password: `password123`
   - Name: `Test Landlord`
4. You should be redirected to the landlord dashboard
5. ✅ Integration working!

## 🎭 Test Users (if you ran seed)

| Email | Password | Role |
|-------|----------|------|
| landlord@example.com | password123 | Landlord |
| tenant@example.com | password123 | Tenant |
| contractor@example.com | password123 | Contractor |
| ops@example.com | password123 | Ops |

## 🛠️ Common Commands

### Backend
```bash
cd backend

# Start dev server
npm run dev

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# View database
npx prisma studio

# Run tests
npm test
```

### Frontend
```bash
cd frontend

# Start dev server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

### Docker
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Reset everything
docker compose down -v
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if PostgreSQL is running
docker ps

# If not, start it
cd backend && docker compose up -d

# Check logs
docker compose logs postgres
```

### Frontend can't connect to backend
```bash
# 1. Verify backend is running
curl http://localhost:4000/api/docs

# 2. Check frontend .env.local
cat frontend/.env.local
# Should have: NEXT_PUBLIC_API_BASE=http://localhost:4000/api

# 3. Restart frontend
cd frontend && npm run dev
```

### Database errors
```bash
cd backend

# Reset and recreate database
npx prisma migrate reset

# Or just run migrations
npx prisma migrate deploy
```

### Port already in use
```bash
# Find process using port 4000 (backend)
lsof -i :4000
kill -9 <PID>

# Find process using port 3000 (frontend)
lsof -i :3000
kill -9 <PID>
```

### Clear everything and start fresh
```bash
# Stop all services
cd backend && docker compose down -v

# Remove node_modules
rm -rf backend/node_modules frontend/node_modules

# Reinstall
cd backend && npm install
cd ../frontend && npm install

# Restart setup
./setup.sh
```

## 📁 Project Structure

```
Property-Manager/
├── backend/          # NestJS API (port 4000)
├── frontend/         # Next.js app (port 3000)
├── setup.sh          # One-time setup
├── start-backend.sh  # Start API server
└── start-frontend.sh # Start web app
```

## 🔗 Important URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api
- **API Docs:** http://localhost:4000/api/docs
- **Prisma Studio:** Run `npx prisma studio` in backend/

## 📚 Next Steps

1. ✅ Get both servers running
2. ✅ Create a test account
3. 📖 Read [INTEGRATION.md](./INTEGRATION.md) for architecture details
4. 📖 Read [README.md](./README.md) for full documentation
5. 🔨 Start building features!

## 💡 Tips

- Keep both terminals open (backend + frontend)
- Use Prisma Studio to view/edit database
- Check API docs for available endpoints
- Use browser DevTools to debug API calls
- Check backend logs for errors

## 🆘 Need Help?

1. Check [INTEGRATION.md](./INTEGRATION.md) for integration details
2. Check [README.md](./README.md) for full documentation
3. Review backend logs: `cd backend && npm run dev`
4. Review frontend console in browser DevTools
5. Check Docker logs: `docker compose logs -f`

---

**Ready to code?** Start both servers and open http://localhost:3000 🚀
