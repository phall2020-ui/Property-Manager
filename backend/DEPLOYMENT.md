# Deployment Guide

This guide covers deployment options for the Property Manager backend API.

## Prerequisites

- Node.js 20+
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Domain name with SSL certificate

## Environment Variables

Required environment variables for production:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_ACCESS_SECRET=your-secure-random-string
JWT_REFRESH_SECRET=your-secure-random-string
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-frontend-domain.com
```

## Deployment Options

### Option 1: Fly.io (Recommended)

1. Install Fly CLI and login
2. Create app: `flyctl apps create property-manager-api`
3. Provision PostgreSQL: `flyctl postgres create`
4. Set secrets: `flyctl secrets set JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=...`
5. Deploy: `flyctl deploy`

### Option 2: Render.com

1. Create Web Service in dashboard
2. Connect GitHub repository
3. Set build/start commands and environment variables
4. Deploy automatically

### Option 3: Docker + Cloud Provider

1. Build: `docker build -t property-manager-api .`
2. Push to registry
3. Deploy to cloud provider

## Post-Deployment

Check health: `curl https://your-api-domain.com/health`

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "version": "commit-sha"
}
```

## CI/CD

GitHub Actions workflow runs lint, test, build, and deploy on push to main/develop.

## Security Checklist

- Use strong JWT secrets
- Enable HTTPS/SSL
- Set CORS to specific origins
- Enable rate limiting
- Monitor for vulnerabilities
