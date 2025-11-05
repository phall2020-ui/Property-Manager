# Testing Guide - Property Manager MVP

## Quick Start

### 1. Start Backend Server
```bash
cd backend
npm run dev
```

Backend runs on: http://localhost:4000

### 2. Start Frontend Server
```bash
cd frontend-new
npm run dev
```

Frontend runs on: http://localhost:5173

## API Testing

### Test Authentication
```bash
# Login as landlord
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"landlord@example.com","password":"password123"}' \
  -c cookies.txt

# This returns:
# - accessToken (JWT, valid for 15 minutes)
# - user object with organisations
# - Sets httpOnly refresh_token cookie (valid for 7 days)
```

### Test Properties API
```bash
# Get access token from login response
TOKEN="your_access_token_here"

# List properties
curl http://localhost:4000/api/properties \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt

# Create property
curl -X POST http://localhost:4000/api/properties \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "address1": "456 Oak Avenue",
    "city": "Manchester",
    "postcode": "M1 2AB",
    "bedrooms": 3
  }'
```

### Test Tickets API
```bash
# List tickets (role-filtered)
curl http://localhost:4000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt

# Create ticket (as tenant)
curl -X POST http://localhost:4000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "propertyId": "property-id-here",
    "title": "Broken boiler",
    "description": "Heating not working",
    "priority": "URGENT"
  }'
```

## Test Credentials

### Landlord Account
- **Email**: landlord@example.com
- **Password**: password123
- **Organisation**: Acme Properties Ltd
- **Role**: LANDLORD
- **Access**: Can view/create properties, approve quotes, view all tickets

### Tenant Account
- **Email**: tenant@example.com
- **Password**: password123
- **Organisation**: Smith Family
- **Role**: TENANT
- **Access**: Can create tickets, view own tickets

### Contractor Account
- **Email**: contractor@example.com
- **Password**: password123
- **Role**: CONTRACTOR
- **Access**: Can view assigned tickets, submit quotes, complete work

## Frontend Pages Built

### Public Pages
- `/login` - Login form with test credentials displayed

### Authenticated Pages (with navigation bar)
- `/dashboard` - Role-based dashboard with quick actions
- `/properties` - Properties list (landlord only)
- `/properties/new` - Create new property form
- `/properties/:id` - Property detail view
- `/tickets` - Tickets list (role-filtered)
- `/tickets/new` - Create maintenance ticket (tenant)

## Features Implemented

### Authentication
- ✅ Login with email/password
- ✅ httpOnly cookies for refresh tokens
- ✅ Automatic token refresh on 401
- ✅ Protected routes
- ✅ Role-based access control
- ✅ Logout functionality

### Properties Module
- ✅ List properties with table view
- ✅ Create property with form validation
- ✅ View property details
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling

### Tickets Module
- ✅ List tickets with role-based filtering
- ✅ Create ticket form
- ✅ Priority badges (Urgent, High, Medium, Low)
- ✅ Status badges (Open, Assigned, Quoted, etc.)
- ✅ Property selection dropdown
- ✅ Responsive table layout

### UI/UX
- ✅ Tailwind CSS styling
- ✅ Role-based navigation menu
- ✅ Responsive layout
- ✅ Loading spinners
- ✅ Error messages
- ✅ Form validation

## API Endpoints Available

### Authentication
- `POST /api/auth/signup` - Register new landlord
- `POST /api/auth/login` - Login (sets httpOnly cookie)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (clears cookie)

### Users
- `GET /api/users/me` - Get current user profile

### Properties
- `POST /api/properties` - Create property
- `GET /api/properties` - List properties (org-scoped)
- `GET /api/properties/:id` - Get property details

### Tenancies
- `POST /api/tenancies` - Create tenancy
- `GET /api/tenancies` - List tenancies (org-scoped)
- `GET /api/tenancies/:id` - Get tenancy details
- `POST /api/tenancies/:id/documents` - Upload document

### Tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - List tickets (role-filtered)
- `GET /api/tickets/:id` - Get ticket details
- `POST /api/tickets/:id/quote` - Submit quote (contractor)
- `POST /api/tickets/quotes/:quoteId/approve` - Approve quote (landlord)
- `POST /api/tickets/:id/complete` - Mark complete (contractor)
- `POST /api/tickets/:id/attachments` - Upload attachment

## Database

### Location
- SQLite database at `backend/dev.db`
- No Docker required

### Seed Data
- 1 Landlord (Alice Landlord)
- 1 Tenant (Bob Tenant)
- 1 Contractor (Charlie Contractor)
- 1 Property (123 Main Street, London)
- 1 Active Tenancy
- 1 Open Ticket (Leaking kitchen tap)

### Reset Database
```bash
cd backend
npx prisma migrate reset
npm run seed
```

## Known Issues

1. **Login Form Not Submitting in Browser**
   - API endpoints work via curl/Postman
   - Form validation is working
   - May need to check form submission handler
   - Workaround: Test APIs directly with curl

## Next Steps

1. Debug login form submission
2. Build Tenancy CRUD pages
3. Build Ticket Detail page with quote workflow
4. Add file upload components
5. Add form validation schemas
6. Add loading skeletons
7. Add E2E tests with Playwright
8. Add unit tests with Vitest

## Architecture

### Backend
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: SQLite (dev)
- **Auth**: JWT + httpOnly cookies
- **Port**: 4000

### Frontend
- **Framework**: Vite + React 18
- **Routing**: React Router v7
- **State Management**: TanStack Query v5
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS v4
- **Port**: 5173

### Security
- httpOnly cookies for refresh tokens
- JWT with 15-minute access token expiry
- 7-day refresh token expiry
- Token rotation on refresh
- CORS configured for localhost:5173
- Bcrypt password hashing

## Documentation

- `FRONTEND_MIGRATION_DECISION.md` - Full migration strategy and plan
- `README.md` - Project overview and setup
- `FINAL_STATUS.md` - Current implementation status
- `ARCHITECTURE.md` - System architecture details
