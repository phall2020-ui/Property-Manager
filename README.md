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

### Test Setup

The project includes comprehensive testing infrastructure:

- **Frontend Unit Tests:** Vitest + Testing Library
- **Backend Unit Tests:** Jest + Supertest
- **E2E Tests:** Playwright (Chromium, Firefox, WebKit)
- **Coverage:** 80% threshold for lines, branches, functions, statements
- **Accessibility:** axe-core integration in E2E tests

### Running Tests Locally

#### Frontend Tests (frontend-new/)

```bash
cd frontend-new

# Run all unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI (headed browser)
npm run test:ui

# Run E2E tests with interactive UI
npm run test:e2e:ui
```

**Test Output:**
- Coverage reports: `./coverage/`
- JUnit XML: `./test-results/junit.xml`
- E2E reports: `./playwright-report/`
- E2E artifacts: `./test-results/` (screenshots, videos, traces)

#### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (if configured)
npm run test:e2e
```

**Test Output:**
- Coverage reports: `./coverage/`
- JUnit XML: `./test-results/junit.xml`

### Test Configuration

#### Frontend Test Environment

Create `frontend-new/.env.test` (see `.env.test.example`):
```env
VITE_API_BASE_URL=http://localhost:4000/api
BASE_URL=http://localhost:5173
API_URL=http://localhost:4000
```

#### Backend Test Environment

Create `backend/.env.test` (see `.env.test.example`):
```env
DATABASE_URL=file:./test.db
NODE_ENV=test
JWT_ACCESS_SECRET=test-access-secret
JWT_REFRESH_SECRET=test-refresh-secret
```

### Test Coverage

Coverage thresholds are set to **80%** for:
- Lines
- Branches
- Functions
- Statements

View coverage reports:
- **Frontend:** Open `frontend-new/coverage/index.html` in browser
- **Backend:** Open `backend/coverage/index.html` in browser

### E2E Test Scenarios

The E2E test suite covers:

1. **Authentication Flow** (`tests/e2e/auth-flow.spec.ts`)
   - Login/logout
   - Signup
   - Token refresh
   - Role-based redirects
   - Invalid credentials handling

2. **Ticket CRUD** (`tests/e2e/ticket-crud.spec.ts`)
   - Create ticket
   - View ticket list
   - View ticket details
   - Filter/search tickets
   - Form validation

3. **Role-Based Access Control** (`tests/e2e/rbac-access.spec.ts`)
   - Landlord routes
   - Tenant routes
   - Contractor routes
   - Ops routes
   - Unauthorized access prevention

4. **Accessibility** (integrated in all E2E tests)
   - WCAG 2.0 AA compliance
   - axe-core automated checks

### Test Data & Fixtures

Test fixtures are available in:
- **Frontend:** `frontend-new/tests/fixtures/`
- **Backend:** `backend/test/fixtures/`

Test users (from seed data):
- **Landlord:** `landlord@example.com` / `password123`
- **Tenant:** `tenant@example.com` / `password123`
- **Contractor:** `contractor@example.com` / `password123`
- **Ops:** `ops@example.com` / `password123`

### CI/CD Testing

The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) runs:

1. **Frontend Check Job:**
   - Lint
   - TypeScript type checking
   - Unit tests with coverage
   - Build verification

2. **Backend Test Job:**
   - Unit tests with coverage
   - Integration tests
   - Uses PostgreSQL and Redis services

3. **E2E Test Job:**
   - Playwright tests across Chrome, Firefox, Safari
   - Accessibility checks
   - Screenshots/videos on failure

4. **Lighthouse CI Job:**
   - Performance audits
   - SEO checks
   - Best practices

**Artifacts Uploaded:**
- Coverage reports (HTML + LCOV)
- JUnit XML test results
- Playwright HTML reports
- Screenshots, videos, traces (on failure)

### Viewing Test Reports

#### Local Development

1. **Coverage Reports:**
   ```bash
   # Frontend
   open frontend-new/coverage/index.html
   
   # Backend
   open backend/coverage/index.html
   ```

2. **Playwright Reports:**
   ```bash
   cd frontend-new
   npx playwright show-report
   ```

#### CI/CD

Download artifacts from GitHub Actions:
1. Go to the workflow run
2. Scroll to "Artifacts" section
3. Download:
   - `frontend-coverage` - Frontend coverage HTML
   - `backend-coverage` - Backend coverage HTML
   - `playwright-report` - E2E test HTML report
   - `playwright-test-results` - Screenshots/videos

### Writing Tests

#### Frontend Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginPage } from '@/pages/LoginPage';

describe('LoginPage', () => {
  it('should render login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
```

#### Backend Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, /* mocks */],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should login successfully', async () => {
    const result = await service.login('user@example.com', 'password');
    expect(result).toHaveProperty('accessToken');
  });
});
```

#### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from 'axe-playwright';

test('should login and access dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/email/i).fill('landlord@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  
  // Accessibility check
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Troubleshooting Tests

**Tests failing locally:**
1. Ensure backend is running: `cd backend && npm run dev`
2. Check database is seeded: `cd backend && npm run seed`
3. Verify environment variables in `.env.test`

**E2E tests timing out:**
- Increase timeout in `playwright.config.ts`
- Check if backend is accessible at `http://localhost:4000`
- Verify frontend is built: `npm run build`

**Coverage below threshold:**
- Review coverage report to identify untested code
- Add tests for uncovered branches/lines
- Adjust threshold if needed (not recommended)

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
