# Property Management Platform

A full-stack multi-tenant property management platform with role-based access control for landlords, tenants, contractors, and operations teams.

## 🎯 New to This Project? Start Here!

📚 **Complete Documentation Suite Available:**
- 🌟 **[REPOSITORY_SUMMARY.md](./REPOSITORY_SUMMARY.md)** - Comprehensive 24-page analysis covering everything
- ⚡ **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Fast cheat sheet with TL;DR setup (5 min read)
- 🎨 **[VISUAL_OVERVIEW.md](./VISUAL_OVERVIEW.md)** - Architecture diagrams and flow charts
- 📖 **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Navigate all 31 docs by role/topic

**Project Status:** 70% Complete | Backend: Production Ready ✅ | Frontend: 60% 🚧

## 🏗️ Architecture

**Frontend:** Next.js 14 (App Router) + Vite/React 19 + TypeScript + Tailwind CSS + TanStack Query  
**Backend:** NestJS + Prisma + SQLite (dev) / PostgreSQL (prod)  
**Authentication:** JWT (access tokens 15min + httpOnly refresh cookies 7 days)  
**Security:** Helmet, rate limiting, CORS with credentials, tenant-scoped queries

## 📁 Project Structure

```
Property-Manager/
├── frontend/              # Next.js frontend application
│   ├── app/              # App Router pages and layouts
│   │   ├── (public)/     # Public pages (login, signup)
│   │   ├── (landlord)/   # Landlord portal
│   │   ├── (tenant)/     # Tenant portal
│   │   ├── (contractor)/ # Contractor portal
│   │   └── (ops)/        # Operations portal
│   ├── _components/      # Reusable UI components
│   ├── _lib/            # API client, auth helpers, schemas
│   ├── _hooks/          # Custom React hooks
│   ├── _types/          # TypeScript type definitions
│   └── _styles/         # Global styles
│
├── backend/              # NestJS backend application
│   ├── apps/api/src/    # API source code
│   │   ├── modules/     # Feature modules
│   │   │   ├── auth/    # Authentication
│   │   │   ├── users/   # User management
│   │   │   ├── properties/
│   │   │   ├── tenancies/
│   │   │   ├── tickets/
│   │   │   ├── documents/
│   │   │   └── notifications/
│   │   └── common/      # Guards, interceptors, filters
│   ├── prisma/          # Database schema and migrations
│   └── docker-compose.yml
│
├── setup.sh             # Automated setup script
├── start-backend.sh     # Start backend server
└── start-frontend.sh    # Start frontend server
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or later (v20+ recommended, `.nvmrc` file included)
  - If using [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root
- **Docker** and **Docker Compose** (optional - only needed for PostgreSQL/Redis, SQLite is default)
- **npm** or **yarn**

### Automated Setup

Run the setup script to install dependencies and configure the database:

```bash
./setup.sh
```

This will:
1. Install backend and frontend dependencies
2. Start PostgreSQL and Redis via Docker
3. Run database migrations
4. Generate Prisma client
5. Optionally seed the database

### Manual Setup

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Start PostgreSQL and Redis
docker compose up -d

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npm run seed

# Start backend server
npm run dev
```

Backend runs on: [http://localhost:4000](http://localhost:4000)  
API docs: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on: [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Backend Environment Variables

Located in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/property_management
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev-access-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
PORT=4000
NODE_ENV=development
```

### Frontend Environment Variables

Located in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:4000/api
MAX_UPLOAD_MB=10
```

## 🎯 Key Features

### Role-Based Access Control
- **Landlords:** Manage properties, tenancies, approve maintenance quotes
- **Tenants:** Report issues, track maintenance tickets
- **Contractors:** View assigned jobs, submit quotes
- **Ops Teams:** Manage ticket queues and assignments

### Authentication Flow
1. User logs in → Backend returns access token + sets httpOnly refresh token cookie
2. Access token stored in memory (not localStorage for security)
3. Refresh token stored in httpOnly, Secure, SameSite=strict cookie (protected from XSS)
4. Automatic token refresh on 401 responses using cookie
5. Role-based route protection via `RoleGate` component

### API Integration
- Centralized API client with automatic token management
- Zod schema validation for type safety
- React Query for server state management
- Automatic error handling and retry logic

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test         # Unit tests (Vitest)
npm run test:e2e # E2E tests (Playwright)
```

## 📚 API Documentation

Interactive API documentation is available at:
[http://localhost:4000/api/docs](http://localhost:4000/api/docs)

Key endpoints:
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/users/me` - Get current user
- `GET /api/properties` - List properties
- `POST /api/tickets` - Create maintenance ticket

## 🔄 Development Workflow

### Starting Both Servers

**Terminal 1 (Backend):**
```bash
./start-backend.sh
# or
cd backend && npm run dev
```

**Terminal 2 (Frontend):**
```bash
./start-frontend.sh
# or
cd frontend && npm run dev
```

### Database Management

```bash
cd backend

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## 🐳 Docker Services

PostgreSQL and Redis run in Docker containers:

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Reset volumes
docker compose down -v
```

## 🔐 Security Notes

- Change JWT secrets in production
- Use environment-specific configurations
- Enable CORS only for trusted domains
- Store sensitive credentials in secure vaults
- Implement rate limiting (already configured)
- Use HTTPS in production

## 📝 Common Tasks

### Adding a New Feature Module

1. **Backend:** Create module in `backend/apps/api/src/modules/`
2. **Frontend:** Add pages in `frontend/app/(role)/`
3. Update Prisma schema if needed
4. Create API client functions in `frontend/_lib/`
5. Add types to `frontend/_types/models.ts`

### Updating Database Schema

1. Modify `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name change_description`
3. Update TypeScript types in frontend
4. Regenerate Prisma client: `npx prisma generate`

## 🚢 Deployment

### Backend (Railway/Render/Heroku)
1. Set environment variables
2. Connect PostgreSQL and Redis
3. Run migrations: `npx prisma migrate deploy`
4. Start: `npm run build && npm start`

### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set environment variables:
   - `NEXT_PUBLIC_API_BASE=https://your-api.com/api`
4. Deploy

## 🐛 Troubleshooting

**Database connection failed:**
- Ensure Docker is running: `docker ps`
- Check DATABASE_URL in `.env`

**Frontend can't reach backend:**
- Verify backend is running on port 4000
- Check NEXT_PUBLIC_API_BASE in `.env.local`
- Ensure CORS is configured in backend

**Token refresh failing:**
- Clear localStorage: `localStorage.clear()`
- Check JWT secrets match in backend `.env`

## 📄 License

MIT
