# Property Management Backend

This repository contains a multi‑tenant property management backend focused on onboarding (landlord → property → tenancy → tenant invite) and maintenance ticketing (tenant submit → contractor quote → landlord approve → complete). It is implemented using **TypeScript**, **NestJS**, **Prisma**, and **PostgreSQL** and is designed for speed, security, and flexibility.

## Features

- Modular NestJS architecture with feature modules for authentication, users, properties, tenancies, tickets, documents, and notifications.
- Prisma ORM with a PostgreSQL database configured for future row‑level security; commented RLS policies are included in `prisma/RLS.sql` for reference.
- JWT authentication (access + refresh tokens) with role‑based access control and resource ownership guards.
- Background jobs via BullMQ backed by Redis for asynchronous tasks like sending emails and extracting document text.
- S3/R2 storage integration using signed URLs for secure uploads.
- OpenAPI documentation exposed at `/api/docs` with example payloads and authentication flows.
- Comprehensive setup scripts, seed data, Docker Compose for local development, and GitHub Actions for CI.

## Setup

### Prerequisites

1. **Node.js** 18 or later (v20+ recommended, see root `.nvmrc` file)
2. **Docker** and **Docker Compose** (optional - only needed for PostgreSQL and Redis, SQLite is default)
3. **npm** (examples use npm ci for reproducible installs)

### Environment Variables

Copy `.env.example` to `.env` and fill in the appropriate values for your environment:

```bash
cp .env.example .env
```

The most important variables are:

- `DATABASE_URL` – Database connection string (defaults to SQLite: `file:./dev.db`, no Docker required)
- `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` – secrets for signing JWTs (change from defaults for production)
- `REDIS_URL` – Redis connection string (optional, only needed for background jobs)
- `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/`S3_BUCKET` – credentials for object storage (optional)
- `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, etc. – credentials for email/SMS providers (optional)

### Installation

Install dependencies (using `npm ci` for reproducible builds):

```bash
npm ci
```

Generate the Prisma client:

```bash
npx prisma generate --schema=prisma/schema.prisma
```

(Optional) Start the supporting services with Docker Compose if using PostgreSQL/Redis:

```bash
docker compose up -d
```

Run database migrations and seed initial data:

```bash
npm run migrate
npm run seed
```

Start the API in development mode:

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api` and the interactive documentation at `http://localhost:3000/api/docs`.

### Testing

Run unit and e2e tests:

```bash
npm test
```

### Running with Docker only

You can also run the application entirely in Docker by building the image and using the provided `docker-compose.yml` file.

## Quick Start

Here is an example workflow for onboarding a landlord, creating a property and tenancy, inviting a tenant, and managing a maintenance ticket:

1. **Sign up** a landlord via `POST /api/auth/signup`.
2. **Create a property** under the landlord via `POST /api/properties`.
3. **Create a tenancy** for that property via `POST /api/tenancies`.
4. **Invite a tenant** via `POST /api/invites/tenant` and have them accept via the magic link.
5. **Tenant logs in** and submits a ticket via `POST /api/tickets` with a photo uploaded using a signed URL from `POST /api/attachments/sign`.
6. **Contractor** quotes the job via `POST /api/tickets/:id/quote`.
7. **Landlord approves** the quote via `POST /api/tickets/:id/approve`.
8. The system emits timeline events for each stage and sends relevant notifications through BullMQ.

## Code Structure

- **`apps/api/`** – NestJS application
  - **`src/modules/`** – feature modules
    - **auth** – authentication & authorization
    - **users** – user management
    - **properties** – landlords and properties
    - **tenancies** – tenancies and tenant invites
    - **tickets** – maintenance tickets and timeline
    - **documents** – document uploads and metadata
    - **notifications** – email and SMS
  - **`src/common/`** – guards, interceptors, pipes, and exceptions
  - **`src/lib/`** – provider abstractions for external services (email, SMS, storage, etc.)
- **`prisma/`** – Prisma schema, migrations, seed data, and row‑level security examples
- **`scripts/`** – convenience scripts for resetting the database and seeding data
- **`docker-compose.yml`** – brings up PostgreSQL and Redis

## Migrations & RLS

The Prisma schema is defined in `prisma/schema.prisma`. After modifying the schema, run:

```bash
npx prisma migrate dev
```

For future enforcement of row‑level security, see `prisma/RLS.sql` which contains SQL policy examples scoped by `landlordId`. These policies are currently commented out because the application layer enforces scoping, but they can be enabled once you set up RLS in PostgreSQL.

## License

This project is provided as a reference implementation and does not include any license. Adapt it to your needs.