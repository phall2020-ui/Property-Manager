# 🔧 Fixes Required - Quick Reference

## 🔴 Broken Features

| Feature | Status | Priority | Time | Root Cause |
|---------|--------|----------|------|------------|
| **Edit Property** | ❌ Not Working | HIGH | 30 min | No PATCH endpoint exists |
| **Add Tenancy** | ❌ Not Working | HIGH | 20 min | Schema field name mismatch |
| **Create Ticket** | ⚠️ Partial | MEDIUM | 15 min | Frontend may not match backend |

---

## 📋 Quick Fix Steps

### 1. Edit Property (30 minutes)

**What's Missing:**
- No PATCH /api/properties/:id endpoint
- No UpdatePropertyDto
- No update method in service

**Files to Create/Modify:**
1. Create: `backend/apps/api/src/modules/properties/dto/update-property.dto.ts`
2. Modify: `backend/apps/api/src/modules/properties/properties.service.ts` (add update method)
3. Modify: `backend/apps/api/src/modules/properties/properties.controller.ts` (add PATCH endpoint)

**Quick Implementation:**
```typescript
// 1. Create DTO with all optional fields
// 2. Add service method to update property
// 3. Add @Patch(':id') endpoint to controller
// 4. Rebuild: npm run build
```

---

### 2. Add Tenancy (20 minutes)

**What's Wrong:**
- DTO uses old field names: `startDate`, `endDate`, `rentPcm`
- Schema expects new names: `start`, `end`, `rent`
- Controller doesn't map fields correctly

**Files to Modify:**
1. `backend/apps/api/src/modules/tenancies/dto/create-tenancy.dto.ts`
2. `backend/apps/api/src/modules/tenancies/tenancies.controller.ts`
3. `backend/apps/api/src/modules/tenancies/tenancies.service.ts`

**Quick Fix:**
```typescript
// 1. Change DTO fields: startDate → start, endDate → end, rentPcm → rent
// 2. Update controller to map: start: new Date(dto.start)
// 3. Update service to use new field names
// 4. Rebuild: npm run build
```

---

### 3. Create Ticket (15 minutes)

**What to Check:**
- Backend works ✅
- Frontend form may not match backend expectations ⚠️

**Files to Check:**
1. `frontend/app/(tenant)/report-issue/page.tsx`
2. Verify form sends: propertyId, tenancyId, title, description, priority

**Quick Test:**
```bash
# Test backend directly
curl -X POST http://localhost:4000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"propertyId":"xxx","title":"Test","description":"Test","priority":"MEDIUM"}'
```

---

## 🎯 Implementation Order

1. **Fix Add Tenancy** (20 min) - Highest impact, users need this
2. **Fix Edit Property** (30 min) - Important for data management
3. **Verify Create Ticket** (15 min) - May already work

**Total Time:** ~65 minutes (1 hour)

---

## 🧪 Testing Commands

### Test Edit Property
```bash
TOKEN="your_token"
PROPERTY_ID="property_id"

curl -X PATCH http://localhost:4000/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bedrooms": 4, "furnished": "Full"}'
```

### Test Add Tenancy
```bash
curl -X POST http://localhost:4000/api/tenancies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "xxx",
    "tenantOrgId": "xxx",
    "start": "2025-01-01",
    "end": "2026-01-01",
    "rent": 1500,
    "deposit": 3000
  }'
```

### Test Create Ticket
```bash
curl -X POST http://localhost:4000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "xxx",
    "tenancyId": "xxx",
    "title": "Test Issue",
    "description": "Testing",
    "priority": "MEDIUM"
  }'
```

---

## 📚 Full Documentation

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for:
- Detailed code examples
- Complete implementation steps
- Testing checklist
- Deployment instructions

---

**Quick Start:** Follow steps 1-2 above, rebuild backend, test endpoints.

**Estimated Time:** 1 hour to fix all features

**Status:** Ready to implement
