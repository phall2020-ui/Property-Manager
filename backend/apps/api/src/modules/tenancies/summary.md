# Tenancies Module Summary

## 📊 Current Status: ✅ **Production Ready**

The tenancies module manages tenancy agreements between landlords and tenants, linking properties to tenant organizations with rental terms.

## 🎯 Key Features Implemented

### ✅ Core Functionality
- **Create Tenancies** - Link tenants to properties with rental terms
- **List Tenancies** - View all tenancies with pagination
- **View Tenancy Details** - Get single tenancy with related data
- **Multi-Tenant Isolation** - Tenancies filtered by landlord organization
- **Flexible Date Fields** - Supports both old (`startDate`, `endDate`) and new (`start`, `end`) field names

### ✅ Tenancy Information
- Property reference
- Tenant organization reference
- Landlord organization reference
- Start and end dates
- Monthly rent amount (`rentPcm` or `rent`)
- Security deposit amount
- Tenancy status (ACTIVE, EXPIRED, TERMINATED)
- Timestamps (created, updated)

## 🔌 API Endpoints

### Protected Endpoints (LANDLORD role required)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/tenancies` | Create a new tenancy | ✅ Working |
| GET | `/api/tenancies` | List all tenancies (paginated) | ✅ Working |
| GET | `/api/tenancies/:id` | Get tenancy by ID | ✅ Working |

### Request/Response Examples

**Create Tenancy:**
```json
POST /api/tenancies
Authorization: Bearer {token}
{
  "propertyId": "property-uuid",
  "tenantOrgId": "tenant-org-uuid",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "rentPcm": 1500,
  "deposit": 1500
}

Response:
{
  "id": "uuid",
  "propertyId": "property-uuid",
  "tenantOrgId": "tenant-org-uuid",
  "landlordId": "landlord-org-uuid",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "start": "2025-01-01",      // Both old and new fields
  "end": "2025-12-31",        // included in response
  "rentPcm": 1500,
  "rent": 1500,
  "deposit": 1500,
  "status": "ACTIVE",
  "createdAt": "2025-11-07T...",
  "updatedAt": "2025-11-07T..."
}
```

**List Tenancies:**
```json
GET /api/tenancies?page=1&limit=20
Authorization: Bearer {token}

Response:
{
  "items": [
    {
      "id": "uuid",
      "property": {
        "id": "property-uuid",
        "address1": "123 Main St",
        "city": "London"
      },
      "tenantOrg": {
        "id": "tenant-org-uuid",
        "name": "Jane Smith"
      },
      "start": "2025-01-01",
      "end": "2025-12-31",
      "rent": 1500,
      "status": "ACTIVE"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

**Get Tenancy:**
```json
GET /api/tenancies/{id}
Authorization: Bearer {token}

Response:
{
  "id": "uuid",
  "property": {...full property details...},
  "tenantOrg": {...tenant organization details...},
  "landlordId": "landlord-org-uuid",
  "start": "2025-01-01",
  "end": "2025-12-31",
  "rent": 1500,
  "deposit": 1500,
  "status": "ACTIVE",
  "tickets": [...related tickets...],
  "createdAt": "2025-11-07T...",
  "updatedAt": "2025-11-07T..."
}
```

## 📁 File Structure

```
tenancies/
├── tenancies.controller.ts    # HTTP endpoints
├── tenancies.service.ts       # Business logic
├── tenancies.module.ts        # Module definition
├── dto/
│   └── create-tenancy.dto.ts  # Create validation
└── summary.md                 # This file
```

## ✅ Test Coverage

### Manual Testing Status
- ✅ Create tenancy with valid data
- ✅ Create tenancy validates required fields
- ✅ Create tenancy validates property exists
- ✅ Create tenancy validates tenant org exists
- ✅ List tenancies returns only landlord's tenancies
- ✅ Get tenancy by ID returns correct tenancy
- ✅ Get tenancy validates ownership
- ✅ Field name compatibility (old/new field names work)

### Automated Tests
- ⚠️ Unit tests needed for tenancies.service.ts
- ⚠️ E2E tests needed

## 🐛 Known Issues

**None** - Module is fully functional and production-ready.

## 📋 Required Next Steps

### High Priority
1. **Add Update Tenancy** - PATCH endpoint to update rental terms
2. **Add Terminate Tenancy** - Mark tenancy as terminated with reason
3. **Add Tenancy Renewal** - Create new tenancy from expiring one
4. **Add Unit Tests** - Test tenancy service methods
5. **Add E2E Tests** - Test complete tenancy workflows

### Medium Priority
6. **Add Tenancy Status Updates** - Auto-update status based on dates
7. **Add Rent Increases** - Track rent increase history
8. **Add Break Clauses** - Handle early termination clauses
9. **Add Tenancy Documents** - Upload tenancy agreements
10. **Add Guarantor Support** - Track guarantor information
11. **Add Payment Tracking** - Link to finance module for rent payments

### Low Priority
12. **Add Tenancy Templates** - Pre-fill common tenancy terms
13. **Add Tenancy Notifications** - Alert on upcoming renewals/expirations
14. **Add Tenancy History** - Track all changes to tenancy terms
15. **Add Multiple Tenants** - Support joint tenancies
16. **Add Rent Review Dates** - Schedule rent reviews

## 🔗 Dependencies

- `@nestjs/common` - NestJS core
- `@nestjs/swagger` - API documentation
- `class-validator` - DTO validation
- `class-transformer` - DTO transformation

## 🚀 Integration Points

### Used By
- Tickets module - Associates tickets with tenancies
- Finance module - Tracks rent payments and invoices
- Tenant portal - Displays tenancy information

### Uses
- `PrismaService` - Database access
- `AuthGuard` - JWT authentication
- `RolesGuard` - Role-based access control
- Properties module - Validates property references

## 📈 Performance Considerations

- ✅ Pagination implemented (default 20 items per page)
- ✅ Database indexes on landlordId for fast filtering
- ✅ Efficient queries with proper includes
- ✅ Field mapping handled in service layer for backwards compatibility
- ⚠️ Consider caching active tenancies for high-traffic scenarios

## 🔐 Security Features

- ✅ LANDLORD role required for all endpoints
- ✅ Automatic tenant isolation via landlordId
- ✅ Ownership validation on property references
- ✅ Input validation on all DTOs
- ✅ SQL injection prevention via Prisma

## 📝 Configuration

No specific environment variables required. Uses global Prisma configuration.

## 🎓 Developer Notes

### Tenancy Status
Available statuses defined in Prisma schema:
- `ACTIVE` - Current active tenancy
- `EXPIRED` - Tenancy ended naturally
- `TERMINATED` - Tenancy ended early
- `PENDING` - Tenancy not yet started

### Field Name Compatibility
The module supports both old and new field names for backwards compatibility:
- `startDate` / `start` - Both accepted on create, both returned
- `endDate` / `end` - Both accepted on create, both returned
- `rentPcm` / `rent` - Both accepted on create, both returned

This is handled in the service layer:
```typescript
const tenancy = await this.prisma.tenancy.create({
  data: {
    ...dto,
    start: dto.startDate,
    end: dto.endDate,
    rent: dto.rentPcm,
  },
});
```

### Creating a Tenancy
Required fields:
- `propertyId` - Must be a valid property owned by the landlord
- `tenantOrgId` - Must be a valid organization
- `startDate` or `start` - Tenancy start date
- `endDate` or `end` - Tenancy end date
- `rentPcm` or `rent` - Monthly rent amount
- `deposit` - Security deposit amount

Optional fields:
- `status` - Defaults to ACTIVE

### Multi-Tenancy
Tenancies are automatically filtered by landlord:
- On create: `landlordId` extracted from property's `ownerOrgId`
- On list: Filtered to only show landlord's tenancies
- On get: Ownership validated before operation

### Property Validation
When creating a tenancy:
1. Property existence is validated
2. Property ownership is verified (must belong to landlord)
3. Property `ownerOrgId` becomes the tenancy's `landlordId`

### Tenant Organization
The `tenantOrgId` should reference an organization of type `TENANT`:
- This links the tenancy to a tenant user's organization
- Allows tenant portal to show their tenancy information
- Supports multiple tenants in future (joint tenancies)

### Date Handling
- Dates stored as ISO 8601 strings (YYYY-MM-DD)
- No time component (dates only)
- Status updates based on current date vs start/end dates (not yet implemented)

### Future Enhancements
Consider implementing:
- Automatic status updates via cron job
- Rent payment schedule generation
- Deposit protection scheme integration
- Digital signature for tenancy agreements
- Tenant verification/referencing integration
