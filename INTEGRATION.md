# Frontend-Backend Integration Guide

This document explains how the frontend and backend are integrated and the key changes made to ensure compatibility.

## 🔗 Integration Overview

The frontend (Next.js) communicates with the backend (NestJS) via REST API calls. Authentication is handled using JWT tokens with automatic refresh logic.

## 🔄 Authentication Flow

### 1. Login/Signup
```
User submits credentials
    ↓
Frontend calls /api/auth/login or /api/auth/signup
    ↓
Backend validates and returns { accessToken, refreshToken }
    ↓
Frontend stores:
  - accessToken in memory
  - refreshToken in localStorage
    ↓
Frontend fetches user data from /api/users/me
    ↓
User is redirected to role-specific portal
```

### 2. Authenticated Requests
```
Frontend makes API request
    ↓
apiClient attaches Bearer token to Authorization header
    ↓
Backend validates token via AuthGuard
    ↓
If 401 (token expired):
  - Frontend calls /api/auth/refresh with refreshToken
  - Backend returns new tokens
  - Frontend retries original request
    ↓
Response returned to frontend
```

## 🔧 Key Integration Changes

### Frontend Changes

#### 1. API Client (`frontend/_lib/apiClient.ts`)
**Changed:** Token storage mechanism
- **Before:** Expected httpOnly cookies for refresh token
- **After:** Stores refresh token in localStorage
- **Reason:** Backend returns tokens in response body, not cookies

```typescript
// New token management
export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (refresh) {
    localStorage.setItem('refreshToken', refresh);
  } else {
    localStorage.removeItem('refreshToken');
  }
}
```

#### 2. Auth Functions (`frontend/_lib/auth.ts`)
**Changed:** Response handling and user data fetching
- **Before:** Expected user object in auth response
- **After:** Fetches user separately from `/api/users/me`

```typescript
// Login now returns only tokens
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

// User data fetched separately
export async function getMe() {
  const data = await apiRequest<any>(`/users/me`);
  return data;
}
```

#### 3. Type Definitions (`frontend/_types/models.ts`)
**Changed:** User interface to match backend schema
- **Before:** `fullName: string`
- **After:** `displayName: string`
- **Added:** `landlordId`, `contractorId`, `createdAt`

```typescript
export interface User {
  id: string;
  displayName: string;  // Changed from fullName
  email: string;
  role: Role;
  landlordId?: string;
  contractorId?: string;
  createdAt?: string;
}
```

#### 4. Login/Signup Pages
**Changed:** Flow to fetch user data after authentication
```typescript
// Before
const resp = await login(data);
router.push(getRoleRoute(resp.user.role));

// After
await login(data);
const user = await getMe();
router.push(getRoleRoute(user.role));
```

#### 5. Signup Schema
**Changed:** Field name to match backend
- **Before:** `fullName`
- **After:** `displayName`
- **Added:** `role: 'LANDLORD'` automatically in signup request

### Backend Configuration

#### 1. Port Configuration (`backend/.env`)
**Changed:** Backend port to avoid conflict
- **Port:** 4000 (frontend uses 3000)
- **Reason:** Allows both servers to run simultaneously

#### 2. CORS Configuration
**Required:** Backend must allow frontend origin
```typescript
// In main.ts
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true
});
```

## 📡 API Endpoints Mapping

### Authentication
| Frontend Call | Backend Endpoint | Method | Auth Required |
|--------------|------------------|--------|---------------|
| `login()` | `/api/auth/login` | POST | No |
| `signup()` | `/api/auth/signup` | POST | No |
| Token refresh | `/api/auth/refresh` | POST | No |
| `logout()` | `/api/auth/logout` | POST | Yes |

### User Management
| Frontend Call | Backend Endpoint | Method | Auth Required |
|--------------|------------------|--------|---------------|
| `getMe()` | `/api/users/me` | GET | Yes |

### Properties (Example)
| Frontend Call | Backend Endpoint | Method | Auth Required |
|--------------|------------------|--------|---------------|
| Get properties | `/api/properties` | GET | Yes |
| Create property | `/api/properties` | POST | Yes |
| Get property | `/api/properties/:id` | GET | Yes |

## 🔐 Security Considerations

### Token Storage
- **Access Token:** Stored in memory (lost on page refresh)
- **Refresh Token:** Stored in localStorage (persists across sessions)
- **Trade-off:** localStorage is vulnerable to XSS, but provides better UX

### Token Refresh Strategy
1. Access token expires after 15 minutes
2. On 401 response, frontend automatically refreshes
3. Refresh token valid for 7 days
4. After refresh token expires, user must log in again

### CORS Configuration
Backend must explicitly allow frontend origin:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

## 🧪 Testing the Integration

### 1. Start Both Servers
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### 2. Test Authentication Flow
1. Navigate to http://localhost:3000
2. Click "Sign up"
3. Fill in form with:
   - Email: test@example.com
   - Password: password123
   - Display Name: Test User
4. Submit form
5. Should redirect to landlord dashboard
6. Check browser console for API calls
7. Check localStorage for refreshToken

### 3. Test Token Refresh
1. Log in
2. Wait 15+ minutes (or manually expire token)
3. Make an API request
4. Should automatically refresh and retry
5. Check Network tab for refresh call

### 4. Test Role-Based Access
1. Log in as landlord
2. Try accessing tenant routes
3. Should redirect to login
4. Verify RoleGate is working

## 🐛 Common Integration Issues

### Issue: "Failed to fetch user data"
**Cause:** Backend endpoint mismatch  
**Solution:** Verify endpoint is `/api/users/me` not `/api/me`

### Issue: CORS errors
**Cause:** Backend not allowing frontend origin  
**Solution:** Add CORS configuration in `backend/apps/api/src/main.ts`

### Issue: Token refresh loop
**Cause:** Refresh token invalid or expired  
**Solution:** Clear localStorage and log in again

### Issue: 401 on all requests
**Cause:** Access token not being attached  
**Solution:** Check `setTokens()` is called after login

### Issue: User data structure mismatch
**Cause:** Frontend expects different field names  
**Solution:** Update frontend types to match backend schema

## 📝 Environment Variables Checklist

### Backend (`.env`)
- ✅ `DATABASE_URL` - PostgreSQL connection
- ✅ `REDIS_URL` - Redis connection
- ✅ `JWT_ACCESS_SECRET` - Access token secret
- ✅ `JWT_REFRESH_SECRET` - Refresh token secret
- ✅ `PORT=4000` - Backend port

### Frontend (`.env.local`)
- ✅ `NEXT_PUBLIC_API_BASE=http://localhost:4000/api` - Backend URL
- ✅ `MAX_UPLOAD_MB=10` - Upload limit

## 🚀 Next Steps

1. **Add CORS configuration** to backend `main.ts`
2. **Test all role portals** (landlord, tenant, contractor, ops)
3. **Implement remaining API endpoints** (properties, tickets, etc.)
4. **Add error boundaries** for better error handling
5. **Set up production environment variables**
6. **Configure S3/R2** for file uploads
7. **Add email/SMS notifications** via BullMQ

## 📚 Additional Resources

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
