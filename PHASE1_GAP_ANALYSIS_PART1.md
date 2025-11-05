# Phase 1 Requirements Gap Analysis - Part 1

## Executive Summary

This document provides a comprehensive analysis comparing the current codebase against Phase 1 requirements for a property management platform rebuild.

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

### Gap Analysis
❌ **MAJOR CHANGE REQUIRED**

**Backend Changes**:
1. Add RefreshToken model to Prisma schema
2. Modify auth.service.ts to store refresh tokens in DB
3. Implement token families and rotation logic
4. Modify auth.controller.ts to set httpOnly cookies
5. Update CORS to allow credentials
6. Add cookie parser middleware

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

### Gap Analysis
❌ **MAJOR SCHEMA CHANGES REQUIRED**

**Changes Needed**:
1. Add Org, OrgMember, Quote, RefreshToken models
2. Modify Property to reference orgId instead of landlordId
3. Update User model to remove landlordId (use OrgMember instead)
4. Migrate existing data
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

### Phase 1 Requirement: Org-based Multi-tenancy

**Approach**:
- Organizations as primary tenant boundary
- Users belong to orgs via OrgMember
- All resources scoped to orgId
- Org context in request lifecycle

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
