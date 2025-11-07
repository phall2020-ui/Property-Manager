# Dev Container Configuration

This directory contains the configuration for automatically setting up and starting the Property Manager application in Gitpod.

## What Happens Automatically

### On First Workspace Creation (`postCreateCommand`)

The `setup.sh` script runs once when the workspace is first created:

1. **Backend Setup:**
   - Installs npm dependencies
   - Creates `.env` file from `.env.example`
   - Configures CORS for Gitpod URLs
   - Generates Prisma client
   - Runs database migrations
   - Seeds the database with test data
   - Builds the backend

2. **Frontend Setup:**
   - Installs npm dependencies
   - Creates `.env.local` with correct API URL
   - Configures for Gitpod environment

### On Every Workspace Start (`postStartCommand`)

The `start-services.sh` script runs every time you open the workspace:

1. **Updates Configuration:**
   - Updates CORS URLs in backend `.env`
   - Updates API URL in frontend `.env.local`
   - (Handles cases where Gitpod workspace URL changes)

2. **Starts Services:**
   - Starts backend server on port 4000
   - Waits for backend to be ready
   - Starts frontend server on port 3000
   - Waits for frontend to be ready
   - Displays access URLs and credentials

## Manual Control

If you need to manually control the services:

### Stop Services
```bash
# Stop backend
pkill -f "nest start"

# Stop frontend
pkill -f "next dev"

# Stop both
pkill -f "nest start" && pkill -f "next dev"
```

### Start Services Manually
```bash
# Start backend
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

### Restart Services
```bash
# Run the start script again
bash .devcontainer/start-services.sh
```

## View Logs

```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log

# Both logs
tail -f /tmp/backend.log /tmp/frontend.log
```

## Test Credentials

After setup, you can log in with these test accounts:

- **Landlord:** `landlord@example.com` / `password123`
- **Tenant:** `tenant@example.com` / `password123`
- **Contractor:** `contractor@example.com` / `password123`

## Access URLs

In Gitpod, the URLs will be displayed when services start:

- **Frontend:** `https://3000-<workspace-url>`
- **Backend API:** `https://4000-<workspace-url>`
- **API Documentation:** `https://4000-<workspace-url>/api/docs`

## Troubleshooting

### Services didn't start automatically

Run the start script manually:
```bash
bash .devcontainer/start-services.sh
```

### Backend won't start

Check the logs:
```bash
tail -f /tmp/backend.log
```

Common issues:
- Database migration failed: Run `cd backend && npx prisma migrate deploy`
- Port already in use: Kill existing process with `pkill -f "nest start"`

### Frontend won't start

Check the logs:
```bash
tail -f /tmp/frontend.log
```

Common issues:
- Dependencies not installed: Run `cd frontend && npm install`
- Port already in use: Kill existing process with `pkill -f "next dev"`

### Environment variables not updating

If you change workspace URLs, manually update:

```bash
# Backend
cd backend
# Edit .env and update FRONTEND_URL and CORS_ORIGIN

# Frontend
cd frontend
# Edit .env.local and update NEXT_PUBLIC_API_BASE
```

Then restart services:
```bash
bash .devcontainer/start-services.sh
```

## Files

- `devcontainer.json` - Main configuration file
- `setup.sh` - Runs once on workspace creation
- `start-services.sh` - Runs on every workspace start
- `Dockerfile` - Container image definition

## Customization

To modify the auto-start behavior:

1. Edit `start-services.sh` for startup changes
2. Edit `setup.sh` for initial setup changes
3. Edit `devcontainer.json` to change lifecycle hooks

After making changes, test them:
```bash
# Test setup script
bash .devcontainer/setup.sh

# Test start script
bash .devcontainer/start-services.sh
```
