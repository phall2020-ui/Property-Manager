# Property Management Platform

A full-stack multi-tenant property management platform with role-based access control for landlords, tenants, contractors, and operations teams.

## 🎯 New to This Project? Start Here!

📚 **Complete Documentation Suite Available:**
- 🌟 **[INTEGRATION_COMPLETE_SUMMARY.md](./INTEGRATION_COMPLETE_SUMMARY.md)** - Complete integration status & features ✨ NEW
- 🚀 **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide (Vercel + Railway)
- 📊 **[REPOSITORY_SUMMARY.md](./REPOSITORY_SUMMARY.md)** - Comprehensive 24-page analysis
- ⚡ **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Fast cheat sheet with TL;DR setup
- 🎨 **[VISUAL_OVERVIEW.md](./VISUAL_OVERVIEW.md)** - Architecture diagrams and flow charts
- 📖 **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Navigate all docs by role/topic

**Project Status:** ✅ **85% Complete** | Backend: Production Ready ✅ | Frontend: 85% 🚧 | Deployment: Ready ✅

> **⚠️ Important:** This repository contains two frontend implementations:
> - `frontend-new/` (Vite + React 19) - **CANONICAL** - Used in CI/CD
> - `frontend/` (Next.js 14) - Legacy implementation, being migrated
> 
> See [FRONTEND_MIGRATION_DECISION.md](./FRONTEND_MIGRATION_DECISION.md) for details.

## 🏗️ Architecture

**Frontend:** Vite + React 19 + TypeScript + Tailwind CSS + TanStack Query v5  
**Backend:** NestJS + Prisma + SQLite (development) / PostgreSQL (production)  
**Authentication:** JWT (access tokens 15min + httpOnly refresh cookies 7 days)  
**Security:** Helmet, rate limiting, CORS with credentials, org-based isolation (with optional strict tenant scoping)  
**Background Jobs:** Optional BullMQ with Redis (gracefully falls back without Redis in development)

## 📁 Project Structure

```
Property-Manager/
├── frontend-new/          # ⭐ CANONICAL Vite/React frontend (CI/CD)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/          # API client, utilities
│   │   ├── contexts/     # React contexts (Auth, etc.)
│   │   └── main.tsx      # Application entry point
│   ├── tests/            # Unit and E2E tests
│   └── package.json      # Dependencies and scripts
│
├── frontend/              # Legacy Next.js frontend (being migrated)
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

### Gitpod (Automatic Setup) ⚡

**Everything starts automatically!** When you open this project in Gitpod:

1. ✅ Dependencies are installed
2. ✅ Database is set up and seeded
3. ✅ Backend and frontend start automatically
4. ✅ URLs are configured for Gitpod

Just wait ~2 minutes and you'll see:
- 🌐 Frontend URL
- 🔧 Backend API URL
- 📚 API Documentation URL
- 👤 Test credentials

**See:** [.devcontainer/README.md](.devcontainer/README.md) for details.

### Local Development

#### Prerequisites

- **Node.js** 18 or later (v20+ recommended, `.nvmrc` file included)
  - If using [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root
- **npm** or **yarn**
- **Optional:** Docker and Docker Compose (only needed if using PostgreSQL/Redis instead of SQLite)

#### Automated Setup

Run the setup script for quick installation (uses SQLite by default):

```bash
./setup.sh
```

This will:
1. Install backend and frontend dependencies
2. Generate Prisma client
3. Run database migrations (SQLite)
4. Optionally seed the database with test data

**Note:** For production deployments with PostgreSQL/Redis, see the [Manual Setup](#manual-setup) section below.

### Manual Setup

#### 1. Backend Setup (Development with SQLite)

```bash
cd backend

# Install dependencies
npm install

# Copy environment example
cp .env.example .env

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

#### 1a. Backend Setup (Production with PostgreSQL)

If you need PostgreSQL for production-like environment:

```bash
cd backend

# Install dependencies
npm install

# Start PostgreSQL and Redis (optional)
docker compose up -d

# Update .env to use PostgreSQL
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/property_management
# REDIS_URL=redis://localhost:6379

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npm run seed

# Start backend server
npm run dev
```

#### 2. Frontend Setup

```bash
cd frontend-new

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on: [http://localhost:5173](http://localhost:5173)

## 🔧 Configuration

### Backend Environment Variables

Located in `backend/.env`:

**Development (SQLite - Default):**
```env
DATABASE_URL=file:./dev.db
JWT_ACCESS_SECRET=dev-access-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

**Production (PostgreSQL):**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/property_management
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-secure-access-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend Environment Variables

Located in `frontend-new/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## ✅ How to Run Locally and in CI

### Running Locally

The canonical frontend (`frontend-new/`) includes a comprehensive CI check script that runs all quality checks:

```bash
cd frontend-new

# Install dependencies
npm ci

# Run all CI checks (lint, typecheck, test, build)
npm run check:ci
```

Or run individual checks:

```bash
npm run lint        # ESLint checks
npm run typecheck   # TypeScript type checking
npm run test        # Unit tests with Vitest
npm run build       # Production build
npm run dev         # Development server
```

E2E and performance testing:

```bash
npm run test:e2e    # Playwright E2E tests
npm run test:e2e:ui # Interactive Playwright UI
npm run lhci        # Lighthouse CI performance audit
```

### CI Pipeline

The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) runs on every push and PR:

1. **Frontend Check** - Runs `check:ci` script (lint, typecheck, test, build)
2. **Backend Lint** - ESLint on backend code
3. **Backend Tests** - Jest tests with PostgreSQL and Redis
4. **Backend Build** - NestJS production build
5. **E2E Tests** - Playwright tests across Chrome, Firefox, Safari
6. **Lighthouse** - Performance and accessibility audits

**Key features:**
- Fail-fast on lint or type errors
- Caches `node_modules` for speed
- Deterministic builds with `npm ci`
- Parallel job execution
- Artifact uploads for debugging

**Acceptance Criteria:**
```bash
# All these commands must pass:
cd frontend-new
npm ci && npm run check:ci  # ✅ Should complete successfully
npm run test:e2e            # ✅ E2E tests pass
npm run lhci                # ✅ Performance meets thresholds
```

## 🎯 Key Features

### ✅ Production-Ready Backend

- **Authentication:** JWT with httpOnly refresh cookies, token rotation, Argon2 hashing
- **Multi-Tenancy:** Automatic tenant isolation via Prisma middleware
- **Background Jobs:** Optional BullMQ with Redis (gracefully falls back in development)
- **Real-Time:** Server-Sent Events (SSE) for cross-portal synchronization
- **API:** Complete REST API with Swagger docs at `/api/docs`
- **Security:** 0 vulnerabilities (CodeQL verified), Helmet headers, rate limiting
- **Database:** SQLite for development, PostgreSQL for production

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

### Background Jobs (BullMQ)
- **Job Types:** ticket.created, ticket.quoted, ticket.approved, ticket.assigned
- **Retry Logic:** Exponential backoff (2s → 4s → 8s)
- **Dead Letter Queue:** Failed jobs captured for inspection
- **Development Mode:** Gracefully falls back without Redis (logs to console)
- **Production Mode:** Full BullMQ integration with Redis for background job processing

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
npm test             # Unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
npm run test:e2e:ui  # Interactive E2E test UI
npm run lhci         # Lighthouse CI audit
```

### Automated UI Operability Testing

On every pull request, the CI/CD pipeline automatically:
- Deploys a Vercel preview build
- Runs Playwright E2E tests across Chrome, Firefox, and Safari
- Performs accessibility audits using axe-core (WCAG 2.0 AA)
- Runs Lighthouse CI for performance, SEO, and best practices

**Required GitHub Secrets** (Repository → Settings → Secrets and variables → Actions):
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

Test artifacts (reports, screenshots, videos) are uploaded for debugging failed runs.

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

## 🐳 Docker Services (Optional)

PostgreSQL and Redis can be run in Docker containers for production-like environments:

```bash
cd backend

# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Reset volumes
docker compose down -v
```

**Note:** Docker services are optional. The default development setup uses SQLite and works without Docker.

## 🔐 Security Notes

### Authentication & Tokens
- **Refresh tokens** stored in httpOnly, Secure, SameSite=strict cookies (protected from XSS)
- **Access tokens** kept in memory only (never in localStorage)
- JWT secrets must be changed in production
- Short access token lifetime (15 minutes) for security
- Automatic token rotation on refresh

### Multi-Tenancy & Isolation
- **Org-based isolation** ensures users only see data from their organization
- **Optional strict tenant scoping** available via `ENABLE_STRICT_TENANT_SCOPING=true`
- Tenant context tracked per-request using AsyncLocalStorage
- Prisma middleware can enforce automatic tenant filtering

### Production Hardening
- Helmet for security headers (CSP, HSTS, etc.)
- Rate limiting (100 requests/minute globally)
- CORS restricted to trusted domains only
- Global validation pipeline with whitelisting
- Structured error responses (no stack traces in production)
- Request tracing with unique IDs

### Best Practices
- Use environment-specific configurations
- Store sensitive credentials in secure vaults (not in .env)
- Enable HTTPS in production (required for Secure cookies)
- Regular security audits and dependency updates
- Monitor and log security events

## 📝 Common Tasks

### Running Functional Gap Analysis

Identify functional gaps between frontend, backend, and UI:

```bash
./run-gap-analysis.sh
# or
node analyze-functional-gaps.js
```

This generates a comprehensive report (`FUNCTIONAL_GAP_ANALYSIS.md`) that identifies:
- Frontend features lacking backend support
- Backend endpoints not used by frontend
- Missing error handling, validation, and loading states

See [GAP_ANALYSIS_README.md](./GAP_ANALYSIS_README.md) for detailed documentation.

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

### Production Ready ✅

The platform is ready for production deployment with complete configurations for:

- **Frontend:** Vercel (see `frontend/vercel.json`)
- **Backend:** Railway (see `backend/railway.json`)
- **Database:** PostgreSQL (managed by Railway)
- **Cache/Jobs:** Redis (managed by Railway)

**Complete deployment guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Deployment Steps

**Backend (Railway):**
1. Connect GitHub repository
2. Add PostgreSQL and Redis services
3. Configure environment variables
4. Deploy automatically on push
5. Run migrations: `railway run npx prisma migrate deploy`

**Frontend (Vercel):**
1. Import GitHub repository
2. Set `NEXT_PUBLIC_API_BASE` to Railway URL
3. Deploy (automatic on push)

**Full guide with troubleshooting:** [DEPLOYMENT.md](./DEPLOYMENT.md) (9KB)

---

## 🏗️ Original Deployment Section

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
- **SQLite:** Ensure `DATABASE_URL=file:./dev.db` in `.env` and `dev.db` file exists
- **PostgreSQL:** Ensure Docker is running with `docker ps`, check `DATABASE_URL` in `.env`

**Frontend can't reach backend:**
- Verify backend is running on port 4000
- Check `VITE_API_BASE_URL` in `frontend-new/.env.local`
- Ensure CORS is configured in backend

**Token refresh failing:**
- Clear localStorage: `localStorage.clear()`
- Check JWT secrets match in backend `.env`
- Ensure cookies are enabled in browser

**Which frontend to use?**
- Use `frontend-new/` (Vite + React 19) - this is the canonical, actively maintained version
- `frontend/` (Next.js 14) is legacy and being phased out

## 📄 License

MIT
