# Current State vs Phase 1 Requirements - Quick Reference

## Architecture Comparison

### Frontend Stack
| Component | Current | Required | Status |
|-----------|---------|----------|--------|
| Framework | Next.js 14 | Vite + React 18 | ❌ Rebuild |
| Routing | App Router (file-based) | React Router | ❌ Change |
| Build Tool | Webpack (Next.js) | Vite | ❌ Change |
| SSR/SSG | Yes (Server Components) | No (SPA only) | ❌ Remove |
| Env Prefix | NEXT_PUBLIC_* | VITE_* | ❌ Rename |

### Backend Stack
| Component | Current | Required | Status |
|-----------|---------|----------|--------|
| Framework | NestJS | NestJS or Express | ✅ OK |
| Database | SQLite | PostgreSQL | ⚠️ Migrate |
| ORM | Prisma | Prisma | ✅ OK |
| Auth | JWT + localStorage | JWT + httpOnly cookies | ❌ Change |
| Port | 4000 | 4000 | ✅ OK |

---

## Authentication Flow Comparison

### Current Flow (JWT + localStorage)
```
1. User logs in
   ↓
2. Backend returns { accessToken, refreshToken }
   ↓
3. Frontend stores:
   - accessToken in memory
   - refreshToken in localStorage
   ↓
4. Frontend sends: Authorization: Bearer {accessToken}
   ↓
5. On 401, frontend reads refreshToken from localStorage
   ↓
6. Frontend calls /auth/refresh with refreshToken in body
   ↓
7. Backend returns new tokens (no DB check)
```

### Required Flow (httpOnly Cookies + Rotation)
```
1. User logs in
   ↓
2. Backend:
   - Creates refresh token in DB
   - Sets httpOnly cookies (access + refresh)
   ↓
3. Frontend: No storage needed (browser handles cookies)
   ↓
4. Browser automatically sends cookies with requests
   ↓
5. On 401, browser automatically sends refresh cookie
   ↓
6. Backend:
   - Validates refresh token from DB
   - Checks token family for reuse
   - Rotates token (creates new, revokes old)
   - Sets new cookies
```

**Key Differences**:
- ❌ No localStorage usage
- ❌ No manual token management in frontend
- ❌ Refresh tokens stored in database
- ❌ Token rotation on every refresh
- ❌ Reuse detection for security

---

## Database Schema Comparison

### Current Models (10)
```
User
├── id, email, passwordHash, role
├── landlordId (direct reference)
└── contractorId

Landlord
├── id, userId, name
└── properties[]

Property
├── id, address, landlordId
└── tickets[]

Ticket
├── id, propertyId, status
├── quoteAmount (embedded)
└── No separate Quote model
```

### Required Models (14)
```
User
├── id, email, passwordHash
└── orgMembers[] (indirect via OrgMember)

Org
├── id, name, slug
├── members[] (OrgMember)
└── properties[]

OrgMember
├── id, orgId, userId, role
└── Links User ↔ Org

Property
├── id, address, orgId (not landlordId)
└── tickets[]

Ticket
├── id, propertyId, status
└── quotes[] (separate model)

Quote
├── id, ticketId, amount, status
└── Separate from Ticket

RefreshToken
├── id, userId, token, family
└── For auth rotation
```

**Key Differences**:
- ❌ Org replaces Landlord concept
- ❌ OrgMember for many-to-many User ↔ Org
- ❌ Property.orgId instead of Property.landlordId
- ❌ Quote as separate model
- ❌ RefreshToken for auth

---

## Multi-tenancy Comparison

### Current: Landlord-based
```typescript
// Service layer
async findProperties(user: User) {
  return prisma.property.findMany({
    where: { landlordId: user.landlordId }
  });
}

// Guard
if (property.landlordId !== user.landlordId) {
  throw new ForbiddenException();
}
```

**Limitations**:
- User can only belong to one landlord
- No concept of organizations
- No role within organization
- Hard to add team members

### Required: Org-based
```typescript
// Middleware extracts org context
req.orgContext = { orgId, userId };

// Service layer
async findProperties(orgId: string) {
  return prisma.property.findMany({
    where: { orgId }
  });
}

// Guard checks org membership
const member = await prisma.orgMember.findFirst({
  where: { orgId, userId }
});
if (!member) throw new ForbiddenException();
```

**Benefits**:
- User can belong to multiple orgs
- Role-based access within org
- Easy to add team members
- Proper multi-tenancy

---

## API Endpoints Comparison

### Current Endpoints (~30+)
```
Auth:
✅ POST /auth/signup
✅ POST /auth/login
✅ POST /auth/refresh (body-based)
✅ POST /auth/logout

Users:
✅ GET /users/me

Properties:
✅ POST /properties
✅ GET /properties
✅ GET /properties/:id

Tickets:
✅ POST /tickets
✅ GET /tickets
✅ GET /tickets/:id
✅ PATCH /tickets/:id/status
✅ POST /tickets/:id/quote (embedded)
✅ POST /tickets/:id/approve

Tenancies: (8 endpoints)
Documents: (6 endpoints)
Notifications: (4 endpoints)
Invites: (3 endpoints)
```

### Required Endpoints (~20)
```
Auth:
✅ POST /auth/signup
✅ POST /auth/login
❌ POST /auth/refresh (cookie-based, different)
✅ POST /auth/logout

Users:
✅ GET /users/me

Orgs: (NEW)
❌ POST /orgs
❌ GET /orgs
❌ GET /orgs/:id
❌ POST /orgs/:id/members
❌ DELETE /orgs/:id/members/:userId

Properties:
✅ POST /properties (org-scoped)
✅ GET /properties (org-scoped)
✅ GET /properties/:id (org-scoped)

Tickets:
✅ POST /tickets (org-scoped)
✅ GET /tickets (org-scoped)
✅ GET /tickets/:id (org-scoped)
✅ PATCH /tickets/:id/status

Quotes: (NEW - separate from tickets)
❌ POST /tickets/:id/quotes
❌ GET /tickets/:id/quotes
❌ PATCH /quotes/:id/approve

OUT OF SCOPE (Phase 2):
❌ Tenancies
❌ Documents
❌ Notifications
❌ Invites
```

---

## Testing Comparison

### Current Testing
```
Frontend:
✅ Vitest configured
✅ Playwright configured
✅ 1 unit test
✅ 1 e2e test
❌ No comprehensive coverage

Backend:
✅ Jest in package.json
❌ No jest.config.js
❌ No test files
❌ No coverage
```

### Required Testing
```
Frontend:
✅ Vitest for unit tests
✅ React Testing Library
✅ Playwright for e2e
✅ MSW for API mocking
✅ 70%+ coverage

Backend:
✅ Jest for unit tests
✅ Supertest for integration
✅ Test database setup
✅ Fixtures and factories
✅ 70%+ coverage

CI/CD:
✅ Run tests on PR
✅ Block merge on failure
✅ Coverage reports
```

---

## Monorepo Structure Comparison

### Current Structure
```
Property-Manager/
├── frontend/
│   ├── package.json (npm)
│   ├── package-lock.json
│   └── node_modules/
├── backend/
│   ├── package.json (npm)
│   ├── package-lock.json
│   └── node_modules/
└── (no root package.json)
```

**Issues**:
- ❌ No workspace configuration
- ❌ Duplicate dependencies
- ❌ Using npm (not pnpm)
- ❌ No shared packages

### Required Structure
```
property-manager/
├── package.json (root)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── apps/
│   ├── web/ (Vite)
│   │   └── package.json
│   └── api/ (NestJS)
│       └── package.json
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   └── package.json
│   └── config/
│       └── package.json
└── node_modules/ (hoisted)
```

**Benefits**:
- ✅ Single lockfile
- ✅ Shared dependencies
- ✅ Shared packages
- ✅ Faster installs

---

## Environment Variables Comparison

### Current
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_BASE=https://...gitpod.dev/api
MAX_UPLOAD_MB=10

# Backend (.env)
DATABASE_URL=file:./dev.db
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
PORT=4000
FRONTEND_URL=https://...gitpod.dev
```

### Required
```bash
# Frontend (.env)
VITE_API_BASE_URL=http://localhost:4000/api
VITE_APP_NAME=Property Manager

# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/propman
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
PORT=4000
FRONTEND_URL=http://localhost:3000
```

**Changes**:
- ❌ NEXT_PUBLIC_* → VITE_*
- ❌ Add cookie configuration
- ❌ SQLite → PostgreSQL URL

---

## Summary: What Needs to Change

### ❌ Complete Rebuild Required
1. **Frontend Framework**: Next.js → Vite
2. **Auth Mechanism**: localStorage → httpOnly cookies
3. **Multi-tenancy**: Landlord-based → Org-based
4. **Database Schema**: Add 4 models, change relationships

### ⚠️ Major Changes Required
5. **Monorepo**: Separate dirs → pnpm workspace
6. **Testing**: Minimal → Comprehensive
7. **API Scope**: 30+ endpoints → 20 focused endpoints

### ✅ Minor Changes Required
8. **Database Provider**: SQLite → PostgreSQL
9. **Environment Variables**: Rename prefixes
10. **Package Manager**: npm → pnpm

---

## Effort Estimation

| Category | Effort | Priority |
|----------|--------|----------|
| Frontend Rebuild | 5 days | HIGH |
| Auth System | 5 days | HIGH |
| Database Models | 6 days | HIGH |
| Multi-tenancy | 7 days | HIGH |
| Monorepo Setup | 3 days | MEDIUM |
| API Updates | 4 days | MEDIUM |
| Testing | 8 days | MEDIUM |
| Integration | 5 days | HIGH |

**Total**: 25-35 days (5-7 weeks)

---

## Recommendation

**Approach**: Incremental Migration
1. Start with backend (models, auth, org-based)
2. Keep current frontend working during backend changes
3. Rebuild frontend once backend is stable
4. Add testing throughout
5. Final integration and polish

**Rationale**: Lower risk, easier to test, can keep system running

---

**Status**: Analysis Complete  
**Next Step**: Validate requirements and choose migration approach
