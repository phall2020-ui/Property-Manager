# Ticket Creation Permission Fix

## Issue
Getting "insufficient permissions" error when creating tickets.

## Root Cause
The JWT token might have been issued before the user's organization memberships were created, or the token doesn't include the `orgs` array with roles.

## Solution

### Option 1: Logout and Login Again (Recommended)
1. Logout from the application
2. Login again with your test credentials
3. This will generate a fresh JWT token with your organization memberships

**Test Credentials:**
- **Tenant:** `tenant@example.com` / `password123`
- **Landlord:** `landlord@example.com` / `password123`
- **Contractor:** `contractor@example.com` / `password123`
- **OPS:** `ops@example.com` / `password123`

### Option 2: Reset Database and Reseed
If the database wasn't seeded properly:

```bash
cd backend
npx prisma migrate reset --force
npm run seed
```

Then logout and login again.

### Option 3: Check Backend Logs
Check the backend console for detailed role information:
- The RolesGuard logs what roles are required vs what the user has
- Look for: `Role check failed - Required: TENANT, CONTRACTOR, LANDLORD, User has: ...`

## What Was Fixed

1. **Case-insensitive role matching** - Roles are now compared case-insensitively
2. **Better error messages** - More detailed logging of role mismatches
3. **Robust orgs checking** - Handles missing or malformed orgs arrays

## Verification

After logging in again, you should be able to:
- **Tenant:** Create tickets for your tenancy
- **Landlord:** Create tickets for your properties
- **Contractor:** Create tickets for properties you work with

## Still Having Issues?

1. Check browser console for the exact error message
2. Check backend logs for role information
3. Verify you're logged in with the correct user
4. Try clearing browser localStorage: `localStorage.clear()` then login again

