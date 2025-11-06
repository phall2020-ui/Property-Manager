# Implementation Plan - Fix Broken Features

**Date:** 2025-11-06  
**Status:** Action Required  
**Priority:** HIGH

---

## 🔴 Broken Features Identified

1. **Edit Property** - No UPDATE endpoint exists
2. **Add Tenancy** - Schema mismatch (old vs new field names)
3. **Create Ticket** - Works via API but may have frontend issues

---

## 📋 Detailed Analysis

### 1. Edit Property ❌

**Issue:** No PATCH/PUT endpoint in properties controller

**Current State:**
- ✅ GET /api/properties (list)
- ✅ GET /api/properties/:id (single)
- ✅ POST /api/properties (create)
- ❌ PATCH /api/properties/:id (update) - **MISSING**
- ❌ DELETE /api/properties/:id (delete) - **MISSING**

**Root Cause:**
- Properties controller only has GET and POST methods
- No update or delete functionality implemented

**Impact:** Users cannot edit property details after creation

---

### 2. Add Tenancy ⚠️

**Issue:** Schema field name mismatch between DTO and database

**Current State:**
- DTO expects: `startDate`, `endDate`, `rentPcm`
- Schema requires: `start`, `end`, `rent`
- Controller converts `startDate` → `new Date()` but doesn't map to `start`

**Root Cause:**
- Database schema was updated (Step 2 migration) with new field names
- DTO and controller still use old field names
- Service layer expects new field names

**Impact:** Tenancy creation fails with validation errors

---

### 3. Create Ticket ✅ (Backend) / ⚠️ (Frontend)

**Issue:** Backend works but frontend may have issues

**Current State:**
- ✅ Backend API endpoint works (tested successfully)
- ✅ DTO validation correct
- ⚠️ Frontend form may not match backend expectations
- ⚠️ Requires `landlordId` which frontend may not provide

**Root Cause:**
- Recent merge added `landlordId` requirement
- Frontend forms may not be updated to match new schema

**Impact:** Ticket creation may fail from frontend UI

---

## 🛠️ Implementation Steps

### STEP 1: Fix Edit Property Feature

**Priority:** HIGH  
**Estimated Time:** 30 minutes

#### 1.1 Create Update Property DTO
**File:** `backend/apps/api/src/modules/properties/dto/update-property.dto.ts`

```typescript
import { IsOptional, IsString, IsNumber, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePropertyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  councilTaxBand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsIn(['House', 'Flat', 'HMO', 'Maisonette', 'Bungalow', 'Other'])
  propertyType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsIn(['Unfurnished', 'Part', 'Full'])
  furnished?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  epcRating?: string;
}
```

#### 1.2 Add Update Method to Service
**File:** `backend/apps/api/src/modules/properties/properties.service.ts`

Add method:
```typescript
async update(id: string, landlordOrgId: string, data: UpdatePropertyDto) {
  // Verify property belongs to landlord
  const property = await this.prisma.property.findFirst({
    where: { id, ownerOrgId: landlordOrgId },
  });

  if (!property) {
    throw new NotFoundException('Property not found');
  }

  return this.prisma.property.update({
    where: { id },
    data,
  });
}
```

#### 1.3 Add PATCH Endpoint to Controller
**File:** `backend/apps/api/src/modules/properties/properties.controller.ts`

Add import:
```typescript
import { Patch } from '@nestjs/common';
import { UpdatePropertyDto } from './dto/update-property.dto';
```

Add method:
```typescript
@Roles('LANDLORD')
@Patch(':id')
@ApiOperation({ summary: 'Update property' })
@ApiBearerAuth()
async update(
  @Param('id') id: string,
  @Body() dto: UpdatePropertyDto,
  @CurrentUser() user: any,
) {
  const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
  if (!landlordOrg) {
    throw new Error('User is not a landlord');
  }
  return this.propertiesService.update(id, landlordOrg.orgId, dto);
}
```

#### 1.4 Rebuild Backend
```bash
cd backend
npm run build
# Restart backend process
```

---

### STEP 2: Fix Add Tenancy Feature

**Priority:** HIGH  
**Estimated Time:** 20 minutes

#### 2.1 Update Create Tenancy DTO
**File:** `backend/apps/api/src/modules/tenancies/dto/create-tenancy.dto.ts`

Replace with:
```typescript
import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenancyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantOrgId: string;

  @ApiProperty({ description: 'Start date in ISO format' })
  @IsDateString()
  start: string;  // Changed from startDate

  @ApiProperty({ description: 'End date in ISO format', required: false })
  @IsOptional()
  @IsDateString()
  end?: string;  // Changed from endDate

  @ApiProperty({ description: 'Monthly rent amount' })
  @IsNumber()
  @Min(0)
  rent: number;  // Changed from rentPcm

  @ApiProperty({ description: 'Deposit amount' })
  @IsNumber()
  @Min(0)
  deposit: number;

  @ApiProperty({ description: 'Rent frequency', required: false, default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  frequency?: string;
}
```

#### 2.2 Update Controller
**File:** `backend/apps/api/src/modules/tenancies/tenancies.controller.ts`

Update create method:
```typescript
@Roles('LANDLORD')
@Post()
@ApiOperation({ summary: 'Create a new tenancy' })
@ApiBearerAuth()
async create(@Body() dto: CreateTenancyDto, @CurrentUser() user: any) {
  const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
  if (!landlordOrg) {
    throw new Error('User is not a landlord');
  }

  return this.tenanciesService.create({
    ...dto,
    start: new Date(dto.start),
    end: dto.end ? new Date(dto.end) : undefined,
    frequency: dto.frequency || 'MONTHLY',
    landlordId: landlordOrg.orgId,
  });
}
```

#### 2.3 Update Service
**File:** `backend/apps/api/src/modules/tenancies/tenancies.service.ts`

Ensure create method uses new field names:
```typescript
async create(data: {
  propertyId: string;
  tenantOrgId: string;
  start: Date;
  end?: Date;
  rent: number;
  deposit: number;
  frequency?: string;
  landlordId: string;
}) {
  return this.prisma.tenancy.create({
    data: {
      ...data,
      status: 'PENDING',
    },
    include: {
      property: true,
      tenantOrg: true,
    },
  });
}
```

#### 2.4 Rebuild Backend
```bash
cd backend
npm run build
# Restart backend process
```

---

### STEP 3: Verify Create Ticket Feature

**Priority:** MEDIUM  
**Estimated Time:** 15 minutes

#### 3.1 Test Backend Endpoint
```bash
TOKEN="your_token_here"
PROPERTY_ID="property_id_here"
TENANCY_ID="tenancy_id_here"

curl -X POST http://localhost:4000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "'$PROPERTY_ID'",
    "tenancyId": "'$TENANCY_ID'",
    "title": "Test Issue",
    "description": "Testing ticket creation",
    "priority": "MEDIUM"
  }'
```

#### 3.2 Check Frontend Form
**File:** `frontend/app/(tenant)/report-issue/page.tsx`

Verify form sends correct fields:
- ✅ propertyId or tenancyId
- ✅ title
- ✅ description
- ✅ priority (LOW, MEDIUM, HIGH)

#### 3.3 Update Frontend if Needed
If frontend form doesn't match backend expectations, update the form to include all required fields.

---

### STEP 4: Add Delete Property Feature (Optional)

**Priority:** LOW  
**Estimated Time:** 15 minutes

#### 4.1 Add Delete Method to Service
```typescript
async delete(id: string, landlordOrgId: string) {
  const property = await this.prisma.property.findFirst({
    where: { id, ownerOrgId: landlordOrgId },
  });

  if (!property) {
    throw new NotFoundException('Property not found');
  }

  // Check if property has active tenancies
  const activeTenancies = await this.prisma.tenancy.count({
    where: { propertyId: id, status: 'ACTIVE' },
  });

  if (activeTenancies > 0) {
    throw new BadRequestException('Cannot delete property with active tenancies');
  }

  return this.prisma.property.delete({ where: { id } });
}
```

#### 4.2 Add DELETE Endpoint
```typescript
@Roles('LANDLORD')
@Delete(':id')
@ApiOperation({ summary: 'Delete property' })
@ApiBearerAuth()
async delete(@Param('id') id: string, @CurrentUser() user: any) {
  const landlordOrg = user.orgs?.find((o: any) => o.role === 'LANDLORD');
  if (!landlordOrg) {
    throw new Error('User is not a landlord');
  }
  return this.propertiesService.delete(id, landlordOrg.orgId);
}
```

---

## 🧪 Testing Checklist

### After Implementing Step 1 (Edit Property):
- [ ] Can update property address
- [ ] Can update number of bedrooms
- [ ] Can update property type
- [ ] Can update furnishing status
- [ ] Cannot update property owned by another landlord
- [ ] Returns 404 for non-existent property

### After Implementing Step 2 (Add Tenancy):
- [ ] Can create tenancy with start date
- [ ] Can create tenancy with end date
- [ ] Can create tenancy with rent amount
- [ ] Tenancy status defaults to PENDING
- [ ] Returns validation error for invalid dates
- [ ] Returns error for non-existent property

### After Implementing Step 3 (Create Ticket):
- [ ] Can create ticket from tenant account
- [ ] Ticket includes property and tenancy info
- [ ] Ticket has correct priority
- [ ] Ticket status defaults to OPEN
- [ ] Returns error if property/tenancy not found

---

## 📦 Deployment Steps

### 1. Backend Changes
```bash
cd /workspaces/Property-Manager/backend

# Make code changes as per steps above

# Rebuild
npm run build

# Restart backend
pkill -f "node dist"
node dist/apps/api/src/main.js > /tmp/backend.log 2>&1 &
```

### 2. Frontend Changes (if needed)
```bash
cd /workspaces/Property-Manager/frontend

# Make any necessary form updates

# Frontend will hot-reload automatically
```

### 3. Test All Features
```bash
# Run test script
./test_all_features.sh
```

---

## 🎯 Success Criteria

### Edit Property ✅
- Landlord can update any property field
- Changes persist in database
- Frontend form shows updated values
- Validation errors display correctly

### Add Tenancy ✅
- Landlord can create tenancy for any property
- Start/end dates accept ISO format
- Rent amount validates correctly
- Tenancy appears in list immediately

### Create Ticket ✅
- Tenant can report issues
- Ticket links to correct property/tenancy
- Priority levels work correctly
- Landlord sees ticket in queue

---

## 📝 Notes

### Schema Compatibility
The database schema has both old and new field names for backward compatibility:
- `startDate` / `start`
- `endDate` / `end`
- `rentPcm` / `rent`

**Recommendation:** Use new field names (`start`, `end`, `rent`) going forward.

### Frontend Considerations
- Forms may need updating to match new field names
- Error messages should be user-friendly
- Loading states should be implemented
- Success messages should confirm actions

### API Documentation
After implementing changes, update Swagger documentation:
```bash
# API docs available at:
http://localhost:4000/api/docs
```

---

## 🚀 Quick Start

To implement all fixes:

```bash
# 1. Create update property DTO
# 2. Add update method to properties service
# 3. Add PATCH endpoint to properties controller
# 4. Update tenancy DTO field names
# 5. Update tenancy controller mapping
# 6. Update tenancy service
# 7. Rebuild backend
# 8. Test all endpoints
```

**Estimated Total Time:** 1-2 hours

---

**Created:** 2025-11-06  
**Last Updated:** 2025-11-06  
**Status:** Ready for Implementation
