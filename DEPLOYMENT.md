# Production Deployment Guide

This guide covers deploying the Property Management Platform to production using Vercel (frontend) and Railway (backend).

## Overview

- **Frontend**: Vite + React 19 (frontend-new) deployed to Vercel
- **Backend**: NestJS deployed to Railway with PostgreSQL and Redis
- **Database**: PostgreSQL (managed by Railway) - required for production
- **Cache/Queue**: Redis (managed by Railway) - optional but recommended for background jobs

**Note:** While the development environment uses SQLite by default, **production deployments require PostgreSQL** for better performance, scalability, and reliability.

## Prerequisites

- Vercel account (https://vercel.com)
- Railway account (https://railway.app)
- GitHub repository access
- Domain name (optional but recommended)

---

## Backend Deployment (Railway)

### 1. Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose the `phall2020-ui/Property-Manager` repository
5. Select the `backend` directory as root

### 2. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a database and set `DATABASE_URL` environment variable

### 3. Add Redis

1. In your Railway project, click "+ New"
2. Select "Database" → "Redis"
3. Railway will automatically create Redis and set `REDIS_URL` environment variable

### 4. Configure Environment Variables

Add the following environment variables in Railway:

```bash
# Database (automatically set by Railway)
DATABASE_URL=postgresql://...

# Redis (automatically set by Railway)
REDIS_URL=redis://...

# JWT Secrets (generate strong random strings)
JWT_ACCESS_SECRET=your-secure-access-secret-here
JWT_REFRESH_SECRET=your-secure-refresh-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=4000

# Frontend URL (will be set after deploying frontend)
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGIN=https://your-app.vercel.app

# Cookie Configuration
REFRESH_COOKIE_NAME=refresh_token
REFRESH_COOKIE_SECURE=true

# Multi-tenancy (optional)
ENABLE_STRICT_TENANT_SCOPING=false

# AWS S3 (optional - for file uploads)
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name

# Email/SMS (optional)
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_NUMBER=+1234567890
```

### 5. Deploy

1. Railway will automatically deploy on push to main branch
2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
3. (Optional) Seed database:
   ```bash
   npm run seed
   ```

### 6. Get Backend URL

After deployment, Railway provides a URL like:
```
https://your-app.railway.app
```

Your API will be available at:
```
https://your-app.railway.app/api
```

---

## Frontend Deployment (Vercel)

### 1. Create Vercel Project

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Important:** Select the `frontend-new` directory as root (not `frontend`)
5. Framework preset should auto-detect "Vite"

### 2. Configure Environment Variables

Add the following in Vercel project settings:

```bash
# API Base URL (use your Railway backend URL)
VITE_API_BASE_URL=https://your-app.railway.app/api
```

### 3. Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Root Directory**: `frontend-new`

### 4. Deploy

1. Click "Deploy"
2. Vercel will build and deploy your frontend
3. Your app will be available at:
   ```
   https://your-app.vercel.app
   ```

### 5. Update Backend CORS

After deployment, update Railway environment variables:

```bash
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGIN=https://your-app.vercel.app
```

Then redeploy the backend service in Railway.

---

## Custom Domain Setup (Optional)

### Backend (Railway)

1. Go to your Railway service settings
2. Click "Settings" → "Domains"
3. Click "Generate Domain" or add custom domain
4. Follow DNS configuration instructions

### Frontend (Vercel)

1. Go to project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions (usually add CNAME record)

---

## Database Migrations

### Initial Setup

After first deployment, run migrations:

```bash
# Connect to Railway
railway link

# Run migrations
railway run npx prisma migrate deploy

# Optional: Seed data
railway run npm run seed
```

### Future Migrations

When you add new migrations:

1. Create migration locally:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. Commit and push to GitHub

3. Railway will auto-deploy, then run:
   ```bash
   railway run npx prisma migrate deploy
   ```

---

## Monitoring & Logs

### Railway Logs

View backend logs in Railway dashboard:
- Click on your service
- Go to "Deployments" tab
- Click on a deployment to see logs

### Vercel Logs

View frontend logs in Vercel dashboard:
- Go to your project
- Click "Deployments"
- Click on a deployment
- View "Build Logs" and "Function Logs"

---

## Health Checks

### Backend Health

Test your backend is running:
```bash
curl https://your-app.railway.app/health
```

### API Documentation

Swagger docs available at:
```
https://your-app.railway.app/api/docs
```

---

## Security Checklist

Before going live:

- [ ] Change all JWT secrets from defaults
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Set `REFRESH_COOKIE_SECURE=true`
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set up proper DNS with SSL certificates
- [ ] Review and update rate limiting settings
- [ ] Enable database backups in Railway
- [ ] Set up monitoring/alerting
- [ ] Review all environment variables
- [ ] Test authentication flow end-to-end
- [ ] Test file uploads work (if using S3)
- [ ] Verify email notifications (if configured)

---

## Troubleshooting

### "Cannot connect to database"

- Check `DATABASE_URL` is set correctly in Railway
- Verify database service is running
- Check network/firewall settings

### "CORS error in browser"

- Verify `CORS_ORIGIN` includes your Vercel domain
- Check `FRONTEND_URL` is set correctly
- Ensure no trailing slashes in URLs

### "Refresh token not working"

- Verify `REFRESH_COOKIE_SECURE=true` in production
- Check cookie domain settings
- Ensure frontend uses `credentials: 'include'`

### "Build fails in Vercel"

- Check Node.js version compatibility
- Try `npm install --legacy-peer-deps`
- Review build logs for specific errors

### "Migration fails"

- Ensure `DATABASE_URL` uses PostgreSQL (not SQLite)
- Check migration files are committed to git
- Run `npx prisma generate` before migrating

---

## Scaling

### Backend Scaling (Railway)

Railway auto-scales based on usage. To customize:
1. Go to service settings
2. Adjust "Replicas" and "Resources"
3. Consider adding Redis for session storage

### Frontend Scaling (Vercel)

Vercel automatically handles scaling and CDN distribution.

### Database Scaling (Railway)

1. Monitor database performance in Railway dashboard
2. Upgrade plan if needed for more resources
3. Consider read replicas for heavy read workloads
4. Implement database indexes for slow queries

---

## Backup & Disaster Recovery

### Database Backups

Railway provides automatic backups:
- Daily backups retained for 7 days (Pro plan)
- Manual backups available on demand

### Manual Backup

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Restore database
railway run psql $DATABASE_URL < backup.sql
```

### Code Rollback

Both Vercel and Railway support instant rollback:
- Go to "Deployments" in dashboard
- Find previous working deployment
- Click "Redeploy"

---

## Cost Estimates

### Development/Staging

- **Vercel**: Free tier (Hobby)
- **Railway**: ~$5-10/month (Starter plan)
  - Backend service: $5
  - PostgreSQL: Free (500MB)
  - Redis: Free (100MB)

### Production (Small Scale)

- **Vercel**: ~$20/month (Pro)
- **Railway**: ~$25-50/month
  - Backend service: $10-20
  - PostgreSQL: $10-20 (depending on size)
  - Redis: $5-10

### Production (Medium Scale)

- **Vercel**: ~$20/month (Pro)
- **Railway**: ~$100-200/month
  - Multiple backend replicas
  - Larger database
  - Dedicated Redis
  - Add-ons for monitoring

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **NestJS Docs**: https://docs.nestjs.com

---

## Post-Deployment Testing

Test all features after deployment:

1. **Authentication**
   - Sign up new user
   - Login
   - Refresh token
   - Logout

2. **Landlord Portal**
   - Create property
   - View properties
   - Approve ticket quotes

3. **Tenant Portal**
   - Report issue
   - View tickets
   - Track status

4. **Contractor Portal**
   - View assigned jobs
   - Submit quotes

5. **Ops Portal**
   - View ticket queue
   - Assign contractors

6. **Cross-Portal Sync**
   - Create ticket as tenant
   - Verify appears in landlord dashboard
   - Submit quote as contractor
   - Verify landlord can approve
   - Verify tenant sees updates

---

## Maintenance Windows

Schedule regular maintenance:

- **Weekly**: Review logs for errors
- **Monthly**: Check database performance
- **Quarterly**: Update dependencies
- **Annually**: Review and rotate secrets

---

**Deployment Status**: Ready for production ✅

Last Updated: November 2025
