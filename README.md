# Property Management Platform

[![CI Pipeline](https://github.com/phall2020-ui/Property-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/phall2020-ui/Property-Manager/actions/workflows/ci.yml)

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
**Authentication:** JWT (access tokens 15min + httpOnly refresh tokens 7 days)

## 📁 Project Structure

This is a **pnpm monorepo** with the following workspaces:

```
Property-Manager/
├── backend/              # NestJS backend application
│   ├── apps/api/src/    # API source code
│   │   ├── modules/     # Feature modules (auth, users, properties, etc.)
│   │   └── common/      # Guards, interceptors, filters
│   ├── prisma/          # Database schema and migrations
│   └── test/            # E2E tests
│
├── frontend/             # Next.js frontend application (PRIMARY)
│   ├── app/             # App Router pages and layouts
│   │   ├── (public)/    # Public pages (login, signup)
│   │   ├── (landlord)/  # Landlord portal
│   │   ├── (tenant)/    # Tenant portal
│   │   ├── (contractor)/# Contractor portal
│   │   └── (ops)/       # Operations portal
│   ├── _components/     # Reusable UI components
│   ├── _lib/           # API client, auth helpers, schemas
│   └── _hooks/         # Custom React hooks
│
├── packages/            # Shared workspace packages
│   ├── types/          # Shared TypeScript types and Zod schemas
│   ├── ui/             # Shared React UI components
│   └── utils/          # Shared utility functions
│
├── frontend-new/        # [ARCHIVED] Vite/React experimental frontend
├── pnpm-workspace.yaml  # Workspace configuration
├── package.json         # Root package with workspace scripts
└── CONTRIBUTING.md      # Contribution guidelines
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20 or later (`.nvmrc` file included)
  - If using [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root
- **pnpm** 8 or later
  - Install with: `npm install -g pnpm`
- **Docker** and **Docker Compose** (optional - only needed for PostgreSQL/Redis, SQLite is default)

### Setup

#### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

#### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Edit the `.env` files with your configuration.

#### 3. Database Setup

```bash
# Start PostgreSQL and Redis (if using Docker)
cd backend
docker compose up -d

# Generate Prisma client
cd ..
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# (Optional) Seed database
pnpm --filter backend seed
```

#### 4. Start Development Servers

```bash
# Start both backend and frontend
pnpm dev

# Or start individually
pnpm dev:backend  # Backend on http://localhost:4000
pnpm dev:frontend # Frontend on http://localhost:3000
```

- **Backend**: [http://localhost:4000](http://localhost:4000)
- **API Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Frontend**: [http://localhost:3000](http://localhost:3000)

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
1. User logs in → Backend returns access + refresh tokens
2. Access token stored in memory, refresh token in localStorage
3. Automatic token refresh on 401 responses
4. Role-based route protection via `RoleGate` component

### API Integration
- Centralized API client with automatic token management
- Zod schema validation for type safety
- React Query for server state management
- Automatic error handling and retry logic

## 🛠️ Workspace Commands

This project uses **pnpm workspaces** for monorepo management. Here are the most common commands:

### Development
```bash
pnpm dev              # Start all services (backend + frontend)
pnpm dev:backend      # Start backend only
pnpm dev:frontend     # Start frontend only
```

### Building
```bash
pnpm build            # Build all packages
pnpm build:backend    # Build backend only
pnpm build:frontend   # Build frontend only
```

### Testing
```bash
pnpm test             # Run all tests
pnpm test:backend     # Run backend tests
pnpm test:frontend    # Run frontend tests
pnpm test:e2e         # Run E2E tests
```

### Code Quality
```bash
pnpm lint             # Lint all packages
pnpm lint:fix         # Lint and fix issues
pnpm typecheck        # Type check all packages
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting
```

### Database
```bash
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run database migrations
pnpm prisma:studio    # Open Prisma Studio
```

### Package-Specific Commands
```bash
pnpm --filter backend <command>   # Run command in backend
pnpm --filter frontend <command>  # Run command in frontend
pnpm --filter @property-manager/types <command>  # Run command in types package
```

## 🧪 Testing

### Backend Tests
```bash
pnpm test:backend      # Run all backend tests
pnpm --filter backend test:watch  # Watch mode
pnpm --filter backend test:cov    # With coverage
```

### Frontend Tests
```bash
pnpm test:frontend     # Unit tests (Vitest)
pnpm test:e2e          # E2E tests (Playwright)
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

### Quick Start Development

```bash
# Start all services at once
pnpm dev

# Or start services individually in separate terminals
pnpm dev:backend   # Terminal 1
pnpm dev:frontend  # Terminal 2
```

### Database Management

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Create new migration
pnpm --filter backend exec prisma migrate dev --name migration_name

# Reset database
pnpm --filter backend exec prisma migrate reset

# Open Prisma Studio
pnpm prisma:studio
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
