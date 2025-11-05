# Phase 1 Requirements Gap Analysis

## Executive Summary

This document provides a comprehensive analysis comparing the current codebase against Phase 1 requirements for a property management platform rebuild. The analysis covers architecture, authentication, database models, multi-tenancy, API endpoints, testing, monorepo structure, and environment variables.

---

## 1. Frontend Architecture

### Current State: Next.js 14
- **Framework**: Next.js 14 with App Router
- **Build Tool**: Next.js built-in (Webpack-based)
- **Dev Server**: Next.js dev server on port 3000
- **Environment Variables**: `NEXT_PUBLIC_API_BASE`
- **Package Manager**: npm (package-lock.json present)
- **Location**: `/frontend` directory

### Phase 1 Requirement: Vite + React
- **Framework**: Vite + React 18
- **Build Tool**: Vite (faster, modern)
- **Environment Variables**: `VITE_API_BASE_URL`
- **Package Manager**: pnpm (workspace)

### Gap Analysis
❌ **MAJOR CHANGE REQUIRED**
- Complete frontend rebuild needed
- Next.js → Vite migration required
- App Router structure → standard React Router
- All `NEXT_PUBLIC_*` env vars → `VITE_*` format
- Server components → client-side only
- File-based routing → React Router configuration

### Migration Impact: HIGH
- Estimated effort: 3-5 days
- All pages need conversion
- Routing logic complete rewrite
- Build configuration from scratch

---

## 2. Authentication Implementation

### Current State: JWT with localStorage
**Token Storage**:
- Access token: In-memory (variable)
- Refresh token: localStorage
- No httpOnly cookies

**Token Flow**:
```typescript
// Current: apiClient.ts
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (refresh) {
    localStorage.setItem('refreshToken', refresh);
  }
}
```

**Backend Auth**:
- JWT signed with secrets from env
- Bearer token in Authorization header
- No cookie handling
- No token rotation/versioning
- No refresh token storage in DB

### Phase 1 Requirement: httpOnly Cookies + Rotation
**Token Storage**:
- Access token: httpOnly cookie
- Refresh token: httpOnly cookie
- No localStorage usage

**Token Rotation**:
- Refresh tokens stored in database
- Token family/versioning for security
- Automatic rotation on refresh
- Revocation support

**Required Database Model**:
```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  family    String   // For rotation detection
  expiresAt DateTime
  createdAt DateTime @default(now())
  revokedAt DateTime?
  
  user User @relation(fields: [userId], references: [id])
}
```

### Gap Analysis
❌ **MAJOR CHANGE REQUIRED**

**Backend Changes**:
1. Add RefreshToken model to Prisma schema
2. Modify auth.service.ts to:
   - Store refresh tokens in DB
   - Implement token families
   - Handle rotation logic
   - Detect token reuse attacks
3. Modify auth.controller.ts to:
   - Set httpOnly cookies instead of JSON response
   - Handle cookie-based refresh
4. Update CORS to allow credentials
5. Add cookie parser middleware

**Frontend Changes**:
1. Remove all localStorage token logic
2. Remove manual Authorization header setting
3. Rely on browser automatic cookie sending
4. Update apiClient to use credentials: 'include'
5. Remove token refresh logic (handled by cookies)

### Migration Impact: HIGH
- Estimated effort: 2-3 days
- Security model completely different
- Breaking change for all API calls
- Database migration required

---

## 3. Database Models

### Current State: SQLite with Landlord-based Multi-tenancy

**Existing Models** (10 total):
1. ✅ User - Has role, landlordId, contractorId
2. ✅ Landlord - Linked to User
3. ✅ Contractor - Independent entity
4. ✅ Property - Belongs to Landlord
5. ✅ Tenancy - Belongs to Property
6. ✅ Ticket - Maintenance tickets
7. ✅ Document - File storage metadata
8. ✅ TimelineEvent - Ticket history
9. ✅ Notification - User notifications
10. ✅ TenantInvite - Invitation system

**Missing Models**:
- ❌ RefreshToken (for auth)
- ❌ Org (organization)
- ❌ OrgMember (org membership)
- ❌ Quote (separate from Ticket)

### Phase 1 Requirement: Org-based Multi-tenancy

**Required Models**:
```prisma
model Org {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  
  members     OrgMember[]
  properties  Property[]
}

model OrgMember {
  id        String   @id @default(uuid())
  orgId     String
  userId    String
  role      String   // OWNER, ADMIN, MEMBER
  createdAt DateTime @default(now())
  
  org  Org  @relation(fields: [orgId], references: [id])
  user User @relation(fields: [userId], references: [id])
  
  @@unique([orgId, userId])
}

model Quote {
  id          String   @id @default(uuid())
  ticketId    String
  amount      Float
  description String?
  status      String   // PENDING, APPROVED, REJECTED
  createdById String
  createdAt   DateTime @default(now())
  
  ticket    Ticket @relation(fields: [ticketId], references: [id])
  createdBy User   @relation(fields: [createdById], references: [id])
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique
  family    String
  expiresAt DateTime
  createdAt DateTime  @default(now())
  revokedAt DateTime?
  
  user User @relation(fields: [userId], references: [id])
}
```

### Gap Analysis
❌ **MAJOR SCHEMA CHANGES REQUIRED**

**Changes Needed**:
1. Add Org, OrgMember, Quote, RefreshToken models
2. Modify Property to reference orgId instead of landlordId
3. Update User model to remove landlordId (use OrgMember instead)
4. Migrate existing data:
   - Create Org for each Landlord
   - Create OrgMember entries
   - Update Property references
5. Extract quote logic from Ticket to Quote model
6. Update all services to use org-based filtering

### Migration Impact: VERY HIGH
- Estimated effort: 4-6 days
- Breaking change to entire data model
- Complex data migration required
- All queries need updating
- Multi-tenancy logic complete rewrite

---

## 4. Multi-tenancy Implementation

### Current State: Landlord-based Isolation

**Approach**:
- Each landlord has unique landlordId
- Properties filtered by landlordId
- Service-layer enforcement
- No RLS (Row Level Security)

**Example**:
```typescript
// properties.service.ts
async findMany(landlordId: string, page = 1, limit = 20) {
  return this.prisma.property.findMany({
    where: { landlordId },
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

**Guards**:
- LandlordResourceGuard checks landlordId match
- Role-based access control (RBAC)

### Phase 1 Requirement: Org-based Multi-tenancy

**Approach**:
- Organizations as primary tenant boundary
- Users belong to orgs via OrgMember
- All resources scoped to orgId
- Org context in request lifecycle

**Required Pattern**:
```typescript
// Middleware to extract org context
@Injectable()
export class OrgContextMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    const orgId = req.headers['x-org-id'] || user.defaultOrgId;
    req.orgContext = { orgId, userId: user.id };
    next();
  }
}

// Service with org filtering
async findMany(orgId: string, page = 1, limit = 20) {
  return this.prisma.property.findMany({
    where: { orgId },
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

### Gap Analysis
❌ **COMPLETE REDESIGN REQUIRED**

**Changes Needed**:
1. Add org context middleware
2. Update all services to accept orgId
3. Replace landlordId checks with orgId checks
4. Update guards to check org membership
5. Add org switching capability
6. Update frontend to send org context

### Migration Impact: VERY HIGH
- Estimated effort: 5-7 days
- Affects every API endpoint
- All authorization logic changes
- Frontend needs org selector

---

## 5. API Endpoints

### Current State: Full-featured NestJS API

**Modules** (8 total):
1. ✅ auth - signup, login, refresh, logout
2. ✅ users - getMe
3. ✅ properties - CRUD operations
4. ✅ tenancies - CRUD operations
5. ✅ tickets - CRUD, quote, approve
6. ✅ documents - Upload/download
7. ✅ notifications - Queue/send
8. ✅ invites - Tenant invitations

**Endpoints Count**: ~30+ endpoints

### Phase 1 Requirement: Minimal MVP Scope

**Required Endpoints**:
```
Auth:
- POST /auth/signup
- POST /auth/login
- POST /auth/refresh (cookie-based)
- POST /auth/logout

Users:
- GET /users/me

Orgs:
- POST /orgs (create org)
- GET /orgs (list user's orgs)
- GET /orgs/:id (get org details)

Properties:
- POST /properties (create)
- GET /properties (list for org)
- GET /properties/:id (get one)

Tickets:
- POST /tickets (create)
- GET /tickets (list for org)
- GET /tickets/:id (get one)
- PATCH /tickets/:id/status (update status)

Quotes:
- POST /tickets/:id/quotes (submit quote)
- GET /tickets/:id/quotes (list quotes)
- PATCH /quotes/:id/approve (approve quote)
```

### Gap Analysis
⚠️ **SCOPE REDUCTION + NEW ENDPOINTS**

**Remove** (out of Phase 1 scope):
- ❌ Tenancies module (Phase 2)
- ❌ Documents module (Phase 2)
- ❌ Notifications module (Phase 2)
- ❌ Invites module (Phase 2)

**Add** (missing from current):
- ❌ Orgs module (complete CRUD)
- ❌ OrgMembers endpoints
- ❌ Quotes as separate resource

**Modify**:
- ✅ Auth endpoints (cookie-based)
- ✅ All endpoints (org-scoped)

### Migration Impact: MEDIUM
- Estimated effort: 3-4 days
- Remove unused modules
- Add org management
- Separate quotes from tickets

---

## 6. Testing Setup

### Current State: Partial Testing

**Frontend**:
- ✅ Vitest configured (vitest.config.ts)
- ✅ Playwright configured (playwright.config.ts)
- ✅ 1 unit test (button.test.tsx)
- ✅ 1 e2e test (onboarding.spec.ts)
- ❌ No comprehensive test coverage

**Backend**:
- ✅ Jest in package.json
- ❌ No jest.config.js found
- ❌ No test files (*.spec.ts) in src/
- ❌ No e2e tests
- ❌ No integration tests

### Phase 1 Requirement: Comprehensive Testing

**Required**:
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for critical flows
- Minimum 70% code coverage
- CI/CD pipeline with tests

**Test Structure**:
```
backend/
  src/
    modules/
      auth/
        auth.service.spec.ts
        auth.controller.spec.ts
        auth.e2e-spec.ts
      orgs/
        orgs.service.spec.ts
        orgs.controller.spec.ts
        orgs.e2e-spec.ts

frontend/
  src/
    components/
      __tests__/
        Button.test.tsx
    pages/
      __tests__/
        Login.test.tsx
  e2e/
    auth.spec.ts
    properties.spec.ts
    tickets.spec.ts
```

### Gap Analysis
❌ **MAJOR TESTING INFRASTRUCTURE NEEDED**

**Backend**:
1. Create jest.config.js
2. Add test database setup
3. Write unit tests for all services
4. Write integration tests for all endpoints
5. Add test fixtures and factories
6. Configure CI/CD

**Frontend**:
7. Expand Vitest tests
8. Add React Testing Library tests
9. Expand Playwright e2e tests
10. Add MSW for API mocking

### Migration Impact: HIGH
- Estimated effort: 6-8 days
- Test infrastructure from scratch
- Tests for all existing code
- CI/CD pipeline setup

---

## 7. Monorepo Structure

### Current State: Separate Directories

**Structure**:
```
Property-Manager/
├── frontend/          # Next.js app
│   ├── package.json   # npm
│   └── node_modules/
├── backend/           # NestJS app
│   ├── package.json   # npm
│   └── node_modules/
├── setup.sh
├── start-backend.sh
└── start-frontend.sh
```

**Issues**:
- ❌ No root package.json
- ❌ No workspace configuration
- ❌ Separate node_modules (duplication)
- ❌ No shared packages
- ❌ Using npm (not pnpm)

### Phase 1 Requirement: pnpm Workspace

**Required Structure**:
```
property-manager/
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Workspace definition
├── pnpm-lock.yaml            # Single lockfile
├── apps/
│   ├── web/                  # Vite frontend
│   │   └── package.json
│   └── api/                  # NestJS backend
│       └── package.json
├── packages/
│   ├── shared/               # Shared types
│   │   └── package.json
│   └── config/               # Shared configs
│       └── package.json
└── node_modules/             # Hoisted dependencies
```

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json**:
```json
{
  "name": "property-manager",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Gap Analysis
❌ **COMPLETE RESTRUCTURE REQUIRED**

**Changes Needed**:
1. Install pnpm globally
2. Create pnpm-workspace.yaml
3. Create root package.json
4. Move frontend to apps/web/
5. Move backend to apps/api/
6. Create packages/shared/ for types
7. Update all import paths
8. Remove npm lock files
9. Generate pnpm-lock.yaml
10. Update CI/CD for pnpm

### Migration Impact: VERY HIGH
- Estimated effort: 2-3 days
- Complete directory restructure
- All paths need updating
- Build scripts rewrite
- CI/CD updates

---

## 8. Environment Variables

### Current State: Framework-specific

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_API_BASE=https://...gitpod.dev/api
MAX_UPLOAD_MB=10
```

**Backend (.env)**:
```env
DATABASE_URL=file:./dev.db
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
FRONTEND_URL=https://...gitpod.dev
```

### Phase 1 Requirement: Vite + Cookie Auth

**Frontend (.env)**:
```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_APP_NAME=Property Manager
```

**Backend (.env)**:
```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Gap Analysis
⚠️ **MODERATE CHANGES REQUIRED**

**Frontend**:
- Change NEXT_PUBLIC_* → VITE_*
- Remove upload config (Phase 2)
- Add app-level configs

**Backend**:
- Add cookie configuration
- Change SQLite → PostgreSQL
- Add cookie security settings
- Update CORS for credentials

### Migration Impact: LOW
- Estimated effort: 1 day
- Simple find/replace
- Update configuration files
- Test environment loading

---

## 9. Database Provider

### Current State: SQLite

**Configuration**:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**File**: `backend/dev.db`

**Pros**:
- ✅ No Docker required
- ✅ Easy local development
- ✅ Fast for small datasets

**Cons**:
- ❌ Not production-ready
- ❌ No concurrent writes
- ❌ Limited data types
- ❌ No enums (using strings)

### Phase 1 Requirement: PostgreSQL

**Configuration**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Benefits**:
- ✅ Production-ready
- ✅ Full SQL features
- ✅ Native enums
- ✅ Better performance
- ✅ Concurrent access

### Gap Analysis
⚠️ **DATABASE MIGRATION REQUIRED**

**Changes Needed**:
1. Update Prisma schema provider
2. Convert string enums to native enums
3. Update DATABASE_URL
4. Set up PostgreSQL (Docker or cloud)
5. Run migrations
6. Update seed script
7. Test all queries

### Migration Impact: MEDIUM
- Estimated effort: 1-2 days
- Schema updates needed
- Local dev setup (Docker)
- Data migration if needed

---

## 10. Summary Matrix

| Component | Current | Required | Gap | Impact | Effort |
|-----------|---------|----------|-----|--------|--------|
| Frontend Framework | Next.js 14 | Vite + React | ❌ Complete rebuild | VERY HIGH | 3-5 days |
| Auth Method | JWT + localStorage | httpOnly cookies | ❌ Major change | HIGH | 2-3 days |
| Token Storage | In-memory/localStorage | Database + cookies | ❌ New model | HIGH | 2-3 days |
| Multi-tenancy | Landlord-based | Org-based | ❌ Complete redesign | VERY HIGH | 5-7 days |
| Database Models | 10 models | +4 models (Org, OrgMember, Quote, RefreshToken) | ❌ Schema changes | VERY HIGH | 4-6 days |
| Database Provider | SQLite | PostgreSQL | ⚠️ Migration | MEDIUM | 1-2 days |
| API Scope | 30+ endpoints | ~20 endpoints | ⚠️ Reduce + add | MEDIUM | 3-4 days |
| Testing | Minimal | Comprehensive | ❌ Infrastructure | HIGH | 6-8 days |
| Monorepo | Separate dirs | pnpm workspace | ❌ Restructure | VERY HIGH | 2-3 days |
| Env Variables | NEXT_PUBLIC_* | VITE_* | ⚠️ Rename | LOW | 1 day |
| Package Manager | npm | pnpm | ⚠️ Switch | LOW | 1 day |

**Legend**:
- ✅ Matches requirement
- ⚠️ Partial match, changes needed
- ❌ Does not match, major work required

---

## 11. Recommended Approach

### Option A: Incremental Migration (Lower Risk)
**Duration**: 6-8 weeks

1. **Week 1-2**: Backend Foundation
   - Add Org/OrgMember/Quote/RefreshToken models
   - Implement cookie-based auth
   - Update multi-tenancy to org-based
   - Keep existing frontend working

2. **Week 3-4**: API Refinement
   - Add org management endpoints
   - Remove out-of-scope modules
   - Separate quotes from tickets
   - Add comprehensive tests

3. **Week 5-6**: Frontend Rebuild
   - Create new Vite project
   - Migrate pages one by one
   - Update to cookie-based auth
   - Implement org context

4. **Week 7-8**: Integration & Testing
   - E2E testing
   - Bug fixes
   - Performance optimization
   - Documentation

### Option B: Clean Rebuild (Higher Risk, Faster)
**Duration**: 4-5 weeks

1. **Week 1**: Setup
   - Create pnpm workspace
   - Setup Vite frontend skeleton
   - Setup PostgreSQL
   - Define all models

2. **Week 2**: Backend Core
   - Implement auth with cookies
   - Implement org management
   - Implement properties
   - Implement tickets & quotes

3. **Week 3**: Frontend Core
   - Auth pages
   - Org management
   - Properties CRUD
   - Tickets CRUD

4. **Week 4-5**: Testing & Polish
   - Unit tests
   - Integration tests
   - E2E tests
   - Bug fixes

### Recommendation: **Option A (Incremental)**

**Rationale**:
- Lower risk of breaking existing functionality
- Easier to test incrementally
- Can keep current system running
- Better for learning/understanding codebase
- Allows for course correction

---

## 12. Critical Blockers

### Must Fix Before Phase 1:
1. ❌ **Frontend framework** - Next.js incompatible with requirements
2. ❌ **Auth mechanism** - localStorage incompatible with security requirements
3. ❌ **Multi-tenancy model** - Landlord-based incompatible with org requirements
4. ❌ **Database schema** - Missing 4 critical models
5. ❌ **Monorepo structure** - Not using pnpm workspace

### Can Defer to Later:
- ⚠️ Comprehensive testing (can add incrementally)
- ⚠️ SQLite → PostgreSQL (can work with SQLite initially)
- ⚠️ Removing extra modules (can keep for now)

---

## 13. Estimated Total Effort

**Full Phase 1 Rebuild**: 25-35 days (5-7 weeks)

**Breakdown**:
- Frontend rebuild: 5 days
- Auth system: 5 days
- Database models: 6 days
- Multi-tenancy: 7 days
- API updates: 4 days
- Testing: 8 days
- Monorepo setup: 3 days
- Integration/bugs: 5 days

**Team Size**: 1-2 developers
**Timeline**: 2-3 months with testing and refinement

---

## 14. Next Steps

1. **Validate Requirements**: Confirm Phase 1 scope with stakeholders
2. **Choose Approach**: Incremental vs Clean rebuild
3. **Setup Environment**: pnpm, PostgreSQL, Vite
4. **Create Roadmap**: Detailed sprint planning
5. **Begin Migration**: Start with backend models
6. **Continuous Testing**: Test each component as built
7. **Documentation**: Keep docs updated throughout

---

**Document Version**: 1.0  
**Date**: 2024  
**Status**: Analysis Complete - Awaiting Decision
