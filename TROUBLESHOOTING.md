# Troubleshooting Common Issues

This guide covers common issues you might encounter when developing or deploying the Property Management Platform, along with their solutions.

## Table of Contents
- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [API Issues](#api-issues)
- [Frontend Issues](#frontend-issues)
- [File Upload Issues](#file-upload-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)
- [Development Environment Issues](#development-environment-issues)

## Authentication Issues

### Issue: "Invalid token" or "Token expired"
**Symptoms**: 401 Unauthorized errors, frequent redirects to login

**Causes**:
- Access token has expired (expires after 15 minutes)
- Refresh token has expired (expires after 7 days)
- JWT secrets mismatch between requests

**Solutions**:
```bash
# Clear browser storage and cookies
localStorage.clear()
document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));

# Verify JWT secrets in backend/.env
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Restart backend server
cd backend && npm run dev
```

### Issue: CORS errors when calling API
**Symptoms**: "Access to fetch blocked by CORS policy"

**Solutions**:
```bash
# 1. Check backend CORS configuration (backend/apps/api/src/main.ts)
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

# 2. Ensure frontend API base URL is correct
# For Vite frontend (frontend-new/.env.local or .env)
VITE_API_BASE_URL=http://localhost:4000/api

# For Next.js frontend (frontend/.env.local) - DEPRECATED
NEXT_PUBLIC_API_BASE=http://localhost:4000/api

# 3. Verify cookies are being sent
# In frontend API client (src/lib/api.ts), ensure:
withCredentials: true
```

### Issue: "Cannot set cookie" in production
**Symptoms**: Login succeeds but immediately logs out, refresh token not working

**Causes**:
- Cookie domain mismatch
- Missing HTTPS in production
- SameSite cookie policy

**Solutions**:
```typescript
// Backend cookie settings for production (backend/apps/api/src/modules/auth/auth.service.ts)
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: process.env.COOKIE_DOMAIN, // e.g., '.yourdomain.com'
});
```

## Database Issues

### Issue: "Connection refused" or "Cannot connect to database"
**Symptoms**: Backend fails to start, database connection errors

**Solutions for SQLite (Development)**:
```bash
# 1. Check if database file exists
ls -la backend/dev.db

# 2. If missing, run migrations
cd backend && npx prisma migrate deploy

# 3. Generate Prisma client if needed
npx prisma generate

# 4. Verify DATABASE_URL in backend/.env
DATABASE_URL=file:./dev.db
```

**Solutions for PostgreSQL (Production or optional dev)**:
```bash
# 1. Check if PostgreSQL is running
docker ps | grep postgres

# 2. Start database if not running
cd backend && docker compose up -d postgres

# 3. Verify DATABASE_URL in backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/property_management

# 4. Test connection
npx prisma db push
```

### Issue: "Table does not exist"
**Symptoms**: Database queries fail with table not found errors

**Solutions**:
```bash
# Run migrations
cd backend
npx prisma migrate deploy

# Or reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Issue: Slow database queries
**Symptoms**: API endpoints taking >1 second to respond

**Solutions**:
```bash
# 1. Enable query logging (backend/.env)
DATABASE_LOG_QUERIES=true

# 2. Add database indexes (in prisma/schema.prisma)
model Ticket {
  id String @id @default(uuid())
  
  @@index([status])
  @@index([createdAt])
  @@index([landlordId])
}

# 3. Run migration to add indexes
npx prisma migrate dev --name add-indexes
```

### Issue: "Unique constraint violation"
**Symptoms**: Creating records fails with duplicate key error

**Solutions**:
```bash
# Check if record already exists before creating
const existing = await prisma.ticket.findUnique({
  where: { id: ticketId }
});

if (existing) {
  throw new ConflictException('Ticket already exists');
}

# Use upsert for create-or-update operations
await prisma.ticket.upsert({
  where: { id: ticketId },
  create: { ...data },
  update: { ...data },
});
```

## API Issues

### Issue: Rate limit exceeded
**Symptoms**: "Too Many Requests" (429) errors

**Solutions**:
```bash
# 1. Check rate limit configuration (backend/apps/api/src/main.ts)
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
  })
);

# 2. Implement exponential backoff in frontend
const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

# 3. Increase rate limit for specific endpoints (backend)
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
@Post()
createTicket() { ... }
```

### Issue: Request timeout
**Symptoms**: API requests hang and eventually timeout

**Solutions**:
```bash
# 1. Increase timeout in axios client
# For Vite frontend (frontend-new/src/lib/api.ts)
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

# For Next.js frontend (frontend/_lib/apiClient.ts) - DEPRECATED
// Similar configuration

# 2. Check for long-running queries
# Enable query logging and identify slow queries

# 3. Use pagination for large datasets
curl "http://localhost:4000/api/tickets?page=1&page_size=25"
```

### Issue: "Internal Server Error" (500)
**Symptoms**: Generic 500 errors with no details

**Solutions**:
```bash
# 1. Check backend logs
cd backend && npm run dev
# Look for error stack traces

# 2. Enable detailed error responses in development (backend/.env)
NODE_ENV=development

# 3. Add error logging (backend/apps/api/src/common/filters/http-exception.filter.ts)
console.error('Error:', exception);
```

## Frontend Issues

### Issue: "Cannot read property of undefined"
**Symptoms**: App crashes with undefined errors

**Solutions**:
```typescript
// Use optional chaining and default values
const userName = user?.name ?? 'Guest';
const userRole = user?.organisations?.[0]?.role ?? 'TENANT';
const propertyAddress = property?.address1 || 'Unknown';

// Check data exists before rendering
if (!user) {
  return <div>Loading...</div>;
}

return <div>Welcome, {user.name}</div>;
```

### Issue: React Query not refetching after mutation
**Symptoms**: UI shows stale data after updates

**Solutions**:
```typescript
// Ensure query invalidation in mutation hooks
const mutation = useMutation({
  mutationFn: updateTicket,
  onSuccess: () => {
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
  },
});

// Or use refetch directly
const { refetch } = useQuery({
  queryKey: ['tickets'],
  queryFn: fetchTickets,
});

await updateTicket();
refetch();
```

### Issue: Toast notifications not showing
**Symptoms**: No visual feedback after actions

**Solutions**:
```typescript
// 1. Ensure ToastProvider wraps app (src/main.tsx)
<ToastProvider>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</ToastProvider>

// 2. Use toast in components
import { useToast } from '../contexts/ToastContext';

const toast = useToast();
toast.success('Action completed!');

// 3. Check ToastContainer is rendered (src/components/Layout.tsx)
import ToastContainer from './ToastContainer';
import { useToast } from '../contexts/ToastContext';

const { toasts, removeToast } = useToast();
return (
  <>
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    {children}
  </>
);
```

### Issue: Routes not working in production
**Symptoms**: 404 errors on page refresh, routing fails after deployment

**Solutions**:
```json
// Add redirect rules for Vercel (vercel.json)
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}

// Or for Netlify (_redirects file)
/*    /index.html   200

// Ensure React Router is configured correctly (src/main.tsx)
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter>
  <App />
</BrowserRouter>
```

## File Upload Issues

### Issue: "File too large" error
**Symptoms**: Upload fails with 413 Payload Too Large

**Solutions**:
```typescript
// 1. Check file size before upload (frontend)
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_SIZE) {
  toast.error('File too large. Maximum size is 10MB.');
  return;
}

// 2. Increase backend limit (backend/apps/api/src/modules/tickets/tickets.controller.ts)
@UseInterceptors(
  FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  })
)

// 3. Configure nginx if using reverse proxy
client_max_body_size 10M;
```

### Issue: "Invalid file type" error
**Symptoms**: Certain file types rejected

**Solutions**:
```typescript
// 1. Check allowed MIME types (backend/apps/api/src/modules/tickets/tickets.controller.ts)
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
];

// 2. Validate in frontend before upload
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

if (!allowedTypes.includes(file.type)) {
  toast.error('Invalid file type. Allowed: JPG, PNG, GIF, PDF');
  return;
}
```

### Issue: File upload progress not showing
**Symptoms**: No feedback during upload

**Solutions**:
```typescript
// Add upload progress tracking
const [uploadProgress, setUploadProgress] = useState(0);

await api.post(`/tickets/${ticketId}/attachments`, formData, {
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    setUploadProgress(percentCompleted);
  },
});
```

## Performance Issues

### Issue: Slow page load times
**Symptoms**: Pages take >3 seconds to load

**Solutions**:
```bash
# 1. Run Lighthouse audit
cd frontend-new
npm run lhci

# 2. Enable code splitting (vite.config.ts)
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});

# 3. Lazy load routes
const TicketDetailPage = lazy(() => import('./pages/tickets/TicketDetailPage'));

<Suspense fallback={<Loading />}>
  <TicketDetailPage />
</Suspense>

# 4. Optimize images
# Use WebP format, compress images, add loading="lazy"
<img src="image.webp" loading="lazy" alt="..." />
```

### Issue: Large bundle size
**Symptoms**: Bundle >500KB, slow initial load

**Solutions**:
```bash
# 1. Analyze bundle
cd frontend-new
npm run analyze:bundle

# 2. Remove unused dependencies
npm prune
npm dedupe

# 3. Use dynamic imports
const HeavyComponent = lazy(() => import('./HeavyComponent'));

# 4. Tree-shake unused code
# Ensure imports are specific
import { useQuery } from '@tanstack/react-query'; // Good
import * as ReactQuery from '@tanstack/react-query'; // Bad
```

### Issue: Too many API calls
**Symptoms**: Network tab shows hundreds of requests

**Solutions**:
```typescript
// 1. Increase staleTime to reduce refetches
useQuery({
  queryKey: ['tickets'],
  queryFn: fetchTickets,
  staleTime: 60000, // 1 minute
});

// 2. Disable automatic refetches
refetchOnWindowFocus: false,
refetchOnReconnect: false,

// 3. Batch requests where possible
const [tickets, properties, tenancies] = await Promise.all([
  ticketsApi.list(),
  propertiesApi.list(),
  tenanciesApi.list(),
]);

// 4. Implement pagination instead of loading all data
```

## Deployment Issues

### Issue: Environment variables not working
**Symptoms**: Features work locally but fail in production

**Solutions**:
```bash
# 1. Ensure variables are prefixed with VITE_ (frontend)
VITE_API_BASE_URL=https://api.example.com

# 2. Set in deployment platform (Vercel/Netlify)
# Go to Project Settings > Environment Variables

# 3. Restart deployment after adding variables
vercel --prod

# 4. Check variables are loaded
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
```

### Issue: Backend crashes on startup
**Symptoms**: Railway/Heroku deployment fails

**Solutions**:
```bash
# 1. Check logs
railway logs
# or
heroku logs --tail

# 2. Ensure database migrations run
"scripts": {
  "start": "npx prisma migrate deploy && node dist/apps/api/src/main.js"
}

# 3. Set required environment variables
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=production

# 4. Increase memory if needed (Railway)
# Settings > Resources > Memory: 1GB
```

### Issue: Static files not served correctly
**Symptoms**: CSS/JS not loading, 404 errors for assets

**Solutions**:
```json
// Ensure build output is correct (vite.config.ts)
export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});

// Check deployment settings
// Vercel: Output Directory = dist
// Netlify: Publish directory = dist
```

## Development Environment Issues

### Issue: "Module not found" errors
**Symptoms**: Import errors, TypeScript cannot find modules

**Solutions**:
```bash
# 1. Install dependencies
npm install

# 2. Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Update TypeScript paths (tsconfig.json)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}

# 4. Restart VS Code / IDE
```

### Issue: Linting errors
**Symptoms**: ESLint shows errors that should be ignored

**Solutions**:
```bash
# 1. Update eslint config (.eslintrc.json or eslint.config.js)
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "off"
  }
}

# 2. Ignore specific files (.eslintignore)
dist
node_modules
*.config.js

# 3. Run lint fix
npm run lint -- --fix
```

### Issue: "Port already in use"
**Symptoms**: Cannot start dev server

**Solutions**:
```bash
# 1. Find process using port
lsof -i :5173  # Frontend
lsof -i :4000  # Backend

# 2. Kill process
kill -9 <PID>

# 3. Or use different port (frontend-new/.env.local)
PORT=5174

# 4. Or change in vite.config.ts
server: {
  port: 5174,
}
```

### Issue: Hot reload not working
**Symptoms**: Changes don't reflect without manual refresh

**Solutions**:
```typescript
// 1. Check Vite config (vite.config.ts)
server: {
  watch: {
    usePolling: true, // For Docker or network drives
  },
}

// 2. Ensure WSL users have proper setup
# In Windows, enable file watching
export CHOKIDAR_USEPOLLING=true

// 3. Restart dev server
npm run dev
```

## Getting Help

If you're still experiencing issues:

1. **Check logs**: 
   - Backend: `cd backend && npm run dev` (console output)
   - Frontend: Browser DevTools Console (F12)
   - Database: `docker compose logs postgres`

2. **Enable debug mode**:
   ```bash
   # Backend (.env)
   NODE_ENV=development
   LOG_LEVEL=debug
   
   # Frontend (vite.config.ts)
   build: {
     sourcemap: true,
   }
   ```

3. **Search existing issues**:
   - Check GitHub Issues
   - Search Discord/Slack for similar problems

4. **Create detailed bug report**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and stack traces
   - Environment details (OS, Node version, etc.)

5. **Common fixes that solve 90% of issues**:
   ```bash
   # Clear everything and start fresh
   rm -rf node_modules package-lock.json
   npm install
   
   # Reset database
   cd backend
   npx prisma migrate reset
   
   # Clear browser data
   # DevTools > Application > Clear storage
   
   # Restart everything
   docker compose restart
   npm run dev
   ```

## Useful Commands Reference

```bash
# Check system status
docker ps                    # Running containers
netstat -an | grep LISTEN    # Open ports
npm list                     # Installed packages

# Database operations
npx prisma studio           # Visual database browser
npx prisma db push          # Push schema changes
npx prisma migrate reset    # Reset database

# Testing
npm test                    # Run tests
npm run test:e2e           # E2E tests
npm run lhci               # Performance audit

# Building
npm run build              # Production build
npm run preview            # Preview production build

# Debugging
DEBUG=* npm run dev        # Enable debug logs
NODE_ENV=development       # Development mode
```

Remember: Most issues can be resolved by:
1. Reading error messages carefully
2. Checking logs
3. Verifying environment variables
4. Clearing cache and reinstalling dependencies
5. Restarting services
