# Backend Development Setup Guide

This guide provides step-by-step instructions for setting up the backend development environment.

## Prerequisites

- **Node.js** 18 or later (v20+ recommended)
  - Check version: `node --version`
  - If using [nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the project root (`.nvmrc` file provided)
- **npm** (comes with Node.js)
- **Git** for version control

### Optional Prerequisites

- **Docker** and **Docker Compose** - Only needed if you want to use PostgreSQL/Redis instead of SQLite
  - The default configuration uses SQLite, which requires no additional setup

## Quick Start

Follow these steps to get the backend running in development mode:

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cd backend
cp .env.example .env
```

The default `.env` file is pre-configured for local SQLite development with:
- `DATABASE_URL=file:./dev.db` (SQLite database, no Docker required)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (change these in production!)
- Optional services (S3, SendGrid, Twilio) - only needed if you use these features

### 2. Install Dependencies

Use `npm ci` for reproducible builds:

```bash
npm ci
```

This installs all dependencies from `package-lock.json`.

### 3. Generate Prisma Client

Generate the Prisma database client:

```bash
npx prisma generate --schema=prisma/schema.prisma
```

### 4. Run Database Migrations

Apply database migrations to create the schema:

```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
```

### 5. Start Development Server

Start the backend in development mode with hot reload:

```bash
npm run dev
```

The API will be available at:
- **API Base:** [http://localhost:4000/api](http://localhost:4000/api)
- **Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **API Docs:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs) (Swagger UI)

## Production Build

To build and run the backend in production mode:

### Build

```bash
npm run build
```

This creates optimized JavaScript files in the `dist/` directory.

### Start

```bash
npm start
```

This runs the compiled application from `dist/apps/api/src/main.js`.

## Workspace Structure

The backend uses a NestJS monorepo structure:

```
backend/
├── apps/
│   └── api/                    # Main API application
│       ├── src/
│       │   ├── main.ts        # Application entry point
│       │   ├── app.module.ts  # Root module
│       │   ├── modules/       # Feature modules
│       │   └── common/        # Shared code
│       └── tsconfig.json
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data script
├── dist/                      # Build output (git-ignored)
├── node_modules/              # Dependencies (git-ignored)
├── .env                       # Local environment config (git-ignored)
├── .env.example               # Example environment config
├── package.json               # Dependencies and scripts
└── nest-cli.json              # NestJS CLI configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server from build output |
| `npm run build` | Build the application for production |
| `npm run lint` | Lint TypeScript files with ESLint |
| `npm run format` | Format code with Prettier |
| `npm test` | Run unit tests with Jest |
| `npm run migrate` | Deploy database migrations |
| `npm run seed` | Seed database with initial data |

## Database Management

### View Database

Open Prisma Studio to view and edit database records:

```bash
npx prisma studio
```

### Create Migration

After modifying `prisma/schema.prisma`, create a new migration:

```bash
npx prisma migrate dev --name describe_your_changes
```

### Reset Database

To reset the database and reapply all migrations:

```bash
npx prisma migrate reset
```

**Warning:** This will delete all data!

## Troubleshooting

### Port Already in Use

If port 4000 is already in use, change the `PORT` in your `.env` file:

```env
PORT=4001
```

### Database Connection Issues

**For SQLite (default):**
- Ensure you have write permissions in the backend directory
- The database file `dev.db` will be created automatically

**For PostgreSQL (optional):**
- Ensure Docker is running: `docker ps`
- Start services: `docker compose up -d`
- Check `DATABASE_URL` in `.env`

### Prisma Client Not Generated

If you see errors about `@prisma/client`, regenerate it:

```bash
npx prisma generate --schema=prisma/schema.prisma
```

### Build Errors

Clean up and rebuild:

**Unix/Linux/macOS:**
```bash
rm -rf dist node_modules
npm ci
npm run build
```

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force dist, node_modules
npm ci
npm run build
```

**Cross-platform (using npm):**
```bash
npm run clean  # if available, or manually delete dist and node_modules
npm ci
npm run build
```

## Using PostgreSQL Instead of SQLite

If you prefer PostgreSQL for local development:

1. Start PostgreSQL and Redis with Docker:
   ```bash
   docker compose up -d
   ```

2. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/property_management
   REDIS_URL=redis://localhost:6379
   ```

3. Run migrations:
   ```bash
   npx prisma migrate deploy --schema=prisma/schema.prisma
   ```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` | Database connection string |
| `JWT_ACCESS_SECRET` | Yes | (example value) | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | (example value) | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token expiration |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiration |
| `PORT` | No | `4000` | API server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL for CORS |
| `REDIS_URL` | No | - | Redis connection (optional, for background jobs) |
| `S3_*` | No | - | AWS S3/R2 credentials (optional, for file storage) |
| `SENDGRID_API_KEY` | No | - | SendGrid API key (optional, for emails) |
| `TWILIO_*` | No | - | Twilio credentials (optional, for SMS) |

## Next Steps

- Read the [API documentation](http://localhost:4000/api/docs) to understand available endpoints
- Explore the codebase in `apps/api/src/modules/` to see feature implementations
- Check the [main README](../README.md) for information about the full-stack setup
- Set up the frontend application to work with the backend

## Getting Help

- Check the [troubleshooting section](#troubleshooting) above
- Review NestJS documentation: https://docs.nestjs.com/
- Review Prisma documentation: https://www.prisma.io/docs
