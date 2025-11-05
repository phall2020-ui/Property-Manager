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

1. **Node.js** 20 or later
2. **Docker** and **Docker Compose** for running PostgreSQL and Redis locally
3. **Yarn** or **npm** (the examples below use npm)

### Environment Variables

Copy `.env.example` to `.env` and fill in the appropriate values for your environment:

```bash
cp .env.example .env
```

The most important variables are:

- `DATABASE_URL` – PostgreSQL connection string
- `REDIS_URL` – Redis connection string
- `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` – secrets for signing JWTs
- `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/`S3_BUCKET` – credentials for object storage
- `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, etc. – credentials for email/SMS providers

### Installation

Install dependencies and generate the Prisma client:

```bash
npm install
npx prisma generate
```

Start the supporting services with Docker Compose:

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

## API Documentation

### Interactive API Docs

The API includes OpenAPI/Swagger documentation available at `http://localhost:4000/api/docs` when running in development mode.

### Authentication Flow

All endpoints (except those marked `@Public()`) require a Bearer token in the Authorization header.

#### Sign Up
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "landlord@example.com",
  "password": "password123",
  "name": "John Landlord"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "landlord@example.com",
    "name": "John Landlord",
    "organisations": [
      {
        "orgId": "uuid",
        "orgName": "John Landlord's Organisation",
        "role": "LANDLORD"
      }
    ]
  }
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "landlord@example.com",
  "password": "password123"
}

Response: Same as signup
```

#### Refresh Token
```bash
POST /api/auth/refresh
Cookie: refresh_token=...

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout
```bash
POST /api/auth/logout
Cookie: refresh_token=...

Response:
{
  "message": "Logged out successfully"
}
```

### Core API Endpoints

All protected endpoints require: `Authorization: Bearer {accessToken}`

#### Users

**Get Current User**
```bash
GET /api/users/me
Authorization: Bearer {accessToken}

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "orgMemberships": [...]
}
```

#### Properties (Landlord Only)

**Create Property**
```bash
POST /api/properties
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "address1": "123 Main Street",
  "address2": "Apt 4B",
  "city": "London",
  "postcode": "SW1A 1AA",
  "bedrooms": 2
}

Response:
{
  "id": "uuid",
  "address1": "123 Main Street",
  "address2": "Apt 4B",
  "city": "London",
  "postcode": "SW1A 1AA",
  "bedrooms": 2,
  "ownerOrgId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**List Properties**
```bash
GET /api/properties?page=1&limit=20
Authorization: Bearer {accessToken}

Response: Array of properties
```

**Get Property by ID**
```bash
GET /api/properties/{id}
Authorization: Bearer {accessToken}

Response: Single property object
```

#### Tenancies (Landlord Only)

**Create Tenancy**
```bash
POST /api/tenancies
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "propertyId": "uuid",
  "tenantOrgId": "uuid",
  "startDate": "2024-01-01",
  "endDate": "2025-01-01",
  "rentPcm": 1500,
  "deposit": 3000,
  "status": "ACTIVE"
}
```

**List Tenancies**
```bash
GET /api/tenancies
Authorization: Bearer {accessToken}
```

**Get Tenancy by ID**
```bash
GET /api/tenancies/{id}
Authorization: Bearer {accessToken}
```

**Upload Tenancy Document**
```bash
POST /api/tenancies/{id}/documents
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: [binary file data]
```

#### Tickets (All Roles)

**Create Ticket (Tenant)**
```bash
POST /api/tickets
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "propertyId": "uuid",
  "tenancyId": "uuid",
  "title": "Leaking kitchen tap",
  "description": "The tap has been dripping for a week",
  "priority": "HIGH"
}

Response:
{
  "id": "uuid",
  "title": "Leaking kitchen tap",
  "description": "The tap has been dripping for a week",
  "priority": "HIGH",
  "status": "OPEN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  ...
}
```

**List Tickets**
```bash
GET /api/tickets
Authorization: Bearer {accessToken}

Response: Array of tickets (filtered by user role and org)
```

**Get Ticket by ID**
```bash
GET /api/tickets/{id}
Authorization: Bearer {accessToken}
```

**Submit Quote (Contractor)**
```bash
POST /api/tickets/{id}/quote
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "amount": 250.00,
  "notes": "Replace tap and fix pipe connection"
}

Response: Quote object with status "PENDING"
```

**Approve Quote (Landlord)**
```bash
POST /api/tickets/quotes/{quoteId}/approve
Authorization: Bearer {accessToken}

Response: Updated quote with status "APPROVED"
```

**Complete Ticket (Contractor)**
```bash
POST /api/tickets/{id}/complete
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "completionNotes": "Tap replaced, tested for 30 minutes"
}
```

**Upload Ticket Attachment**
```bash
POST /api/tickets/{id}/attachments
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: [binary file data]
```

### Role-Based Access Control

The API implements role-based access control with the following roles:
- **LANDLORD**: Can create properties, tenancies, and approve quotes
- **TENANT**: Can create tickets and view their tenancies
- **CONTRACTOR**: Can submit quotes and mark tickets as complete
- **ADMIN**: Has administrative privileges within an organization

### Error Responses

All endpoints return consistent error responses:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

Common status codes:
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (e.g., duplicate email)
- `500`: Internal Server Error

### Testing with curl

Example workflow testing the API:

```bash
# 1. Sign up as landlord
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Save the accessToken from response

# 2. Create a property
curl -X POST http://localhost:4000/api/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {accessToken}" \
  -d '{
    "address1": "123 Test St",
    "postcode": "SW1A 1AA"
  }'

# 3. List properties
curl -X GET http://localhost:4000/api/properties \
  -H "Authorization: Bearer {accessToken}"
```

## License

This project is provided as a reference implementation and does not include any license. Adapt it to your needs.