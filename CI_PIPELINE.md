# CI/CD Pipeline Documentation

## Overview

This repository uses a single, deterministic CI/CD pipeline that enforces code quality and runs comprehensive tests on every push and pull request.

## Canonical Frontend

**frontend-new/** (Vite + React 19) is the canonical frontend directory used in CI/CD.

- `frontend/` (Next.js) is deprecated and not used in CI
- See [FRONTEND_MIGRATION_DECISION.md](./FRONTEND_MIGRATION_DECISION.md) for details

## CI Pipeline

The CI pipeline is defined in [.github/workflows/ci.yml](./.github/workflows/ci.yml).

### Jobs

1. **frontend-check** - Runs all frontend quality checks
   - Lint (ESLint)
   - Type checking (TypeScript)
   - Unit tests (Vitest)
   - Build (Vite)
   - Working directory: `frontend-new/`
   - Runs: `npm run check:ci`

2. **backend-lint** - Lints backend code
   - ESLint on backend TypeScript
   - Working directory: `backend/`

3. **backend-test** - Backend unit and integration tests
   - Jest tests
   - PostgreSQL and Redis services
   - Database migrations
   - Working directory: `backend/`

4. **frontend-build** - Production build
   - Dependencies: `frontend-check`
   - Uploads build artifacts
   - Working directory: `frontend-new/`

5. **backend-build** - Backend production build
   - Dependencies: `backend-lint`, `backend-test`
   - NestJS build
   - Prisma migration validation
   - Uploads build artifacts

6. **e2e-tests** - End-to-end tests
   - Dependencies: `frontend-build`, `backend-build`
   - Playwright tests (Chrome, Firefox, Safari)
   - Accessibility checks (axe-core)
   - Uploads test reports
   - Working directory: `frontend-new/`

7. **lighthouse** - Performance and accessibility audits
   - Dependencies: `frontend-build`
   - Lighthouse CI audits
   - Performance: min 75%
   - Accessibility: min 90% (enforced)
   - Best practices: min 90%
   - SEO: min 85%
   - Working directory: `frontend-new/`

8. **docker** - Docker image build (main/develop only)
   - Dependencies: `backend-build`, `frontend-build`
   - Backend Docker image

9. **deploy-staging** - Deploy to staging (develop branch only)
   - Dependencies: `docker`
   - TODO: Configure deployment

10. **deploy-production** - Deploy to production (main branch only)
    - Dependencies: `docker`
    - Requires manual approval
    - TODO: Configure deployment

## Running Locally

### Frontend

```bash
cd frontend-new

# Install dependencies (deterministic)
npm ci

# Run all CI checks
npm run check:ci

# Individual checks
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test        # Vitest unit tests
npm run build       # Vite build

# E2E and performance
npm run test:e2e    # Playwright tests
npm run test:e2e:ui # Interactive Playwright UI
npm run lhci        # Lighthouse CI

# Development
npm run dev         # Dev server on http://localhost:5173
```

### Backend

```bash
cd backend

# Install dependencies
npm ci

# Start services (PostgreSQL, Redis)
docker compose up -d

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Run checks
npm run lint        # ESLint
npm run test        # Jest tests
npm run build       # NestJS build

# Development
npm run dev         # Dev server on http://localhost:4000
```

## Acceptance Criteria

All of these commands must pass for CI to be green:

```bash
# Frontend
cd frontend-new
npm ci && npm run check:ci  # ✅ Lint, typecheck, test, build
npm run test:e2e            # ✅ E2E tests pass
npm run lhci                # ✅ Performance meets thresholds

# Backend
cd backend
npm ci
npm run lint                # ✅ Lint passes
npm run test                # ✅ Tests pass
npm run build               # ✅ Build succeeds
```

## Key Features

### Deterministic Builds
- Uses `npm ci` (not `npm install`)
- Locks exact dependency versions
- Fresh install every time
- No cached state issues

### Fail Fast
- Lint errors fail the build immediately
- Type errors fail the build immediately
- Test failures fail the build immediately
- Parallel jobs for speed

### Caching
- `node_modules` cached per package-lock.json
- Docker build cache (GitHub Actions cache)
- Faster subsequent runs

### Artifacts
- Build artifacts uploaded (7 day retention)
- Test reports uploaded (7 day retention)
- Playwright videos/screenshots on failure

## Troubleshooting

### CI failing on lint
```bash
cd frontend-new
npm run lint
# Fix errors, then commit
```

### CI failing on typecheck
```bash
cd frontend-new
npm run typecheck
# Fix type errors, then commit
```

### CI failing on tests
```bash
cd frontend-new
npm run test
# Fix failing tests, then commit
```

### CI failing on build
```bash
cd frontend-new
npm run build
# Fix build errors, then commit
```

### E2E tests failing
```bash
cd frontend-new
npm run test:e2e:ui  # Interactive debugging
# Check screenshots/videos in test-results/
```

## Environment Variables

### Frontend (CI)
- `VITE_API_BASE_URL`: Set to `http://localhost:4000/api` in CI

### Backend (CI)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_ACCESS_SECRET`: Test secret
- `JWT_REFRESH_SECRET`: Test secret
- `NODE_ENV`: `test`

## Future Improvements

- [ ] Add security scanning (npm audit, Snyk)
- [ ] Add container scanning (Trivy)
- [ ] Add code coverage reporting
- [ ] Configure actual deployment targets
- [ ] Add smoke tests post-deployment
- [ ] Add performance regression detection
