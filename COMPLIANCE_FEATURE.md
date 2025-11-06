# Compliance Centre Feature

## Overview

The Compliance Centre is a comprehensive module for tracking and managing regulatory compliance across a property portfolio. It provides both portfolio-level and property-level views of compliance items.

## Features

### Portfolio-Level Compliance Centre

- **Location**: Main navigation → "Compliance" 
- **Features**:
  - KPI Dashboard showing overdue, due soon, OK, and missing items
  - Searchable and filterable table of all compliance items
  - Filter by status, type, and property address
  - Click-through to property details

### Property-Level Compliance Tab

- **Location**: Property Details → "Compliance" tab
- **Features**:
  - Visual compliance checklist with status indicators
  - Card-based layout showing each compliance item
  - Upload evidence functionality (placeholder)
  - Mark done functionality (placeholder)
  - Summary of overdue and due soon items

## Compliance Types Tracked

1. **Gas Safety Certificate** - Annual requirement
2. **EICR (Electrical Installation Condition Report)** - 5-year requirement
3. **EPC (Energy Performance Certificate)** - 10-year validity
4. **Boiler Service** - Annual requirement
5. **Smoke Alarms** - Annual check
6. **CO Alarms** - Annual check
7. **HMO Licence** - For properties requiring HMO licensing
8. **Deposit Protection** - Required for all tenancy deposits
9. **How to Rent Guide** - Must be provided to tenants
10. **Right to Rent** - Immigration status verification
11. **Legionella Risk Assessment** - Required for rental properties

## Status Indicators

- **OK (Green)**: Compliance item is valid and up to date
- **Due Soon (Amber)**: Expires within 30 days
- **Overdue (Red)**: Past expiry date
- **Missing (Gray)**: No date set or evidence missing

## Design System

### Colors
- Primary: `#1E3A8A` (Navy Blue)
- Accent: `#0EA5E9` (Teal Blue)
- Success: `#16A34A` (Green)
- Warning: `#F59E0B` (Amber)
- Danger: `#DC2626` (Red)

### Components
- `ComplianceStatusChip` - Status indicator badge
- `ComplianceCard` - Property-level compliance item card
- `KPIStatCard` - Dashboard KPI metric card
- `EmptyState` - Success state when all items are compliant

## API Endpoints

### Backend Routes

- `GET /api/compliance/portfolio` - Get all compliance items for landlord
- `GET /api/compliance/portfolio/stats` - Get compliance statistics
- `GET /api/compliance/property/:propertyId` - Get compliance items for specific property

## Data Model

Compliance data is derived from the `Tenancy` model fields:
- `gasSafetyDueAt`
- `eicrDueAt`
- `epcExpiresAt`
- `boilerServiceDueAt`
- `smokeAlarmsCheckedAt`
- `coAlarmsCheckedAt`
- `legionellaAssessmentAt`
- `depositProtectedAt`
- `howToRentServedAt`
- `rightToRentCheckedAt`
- `hmoLicenceExpiresAt`

Evidence documents are stored in the `PropertyDocument` table with corresponding `docType` values.

## Future Enhancements

1. **Evidence Upload Modal** - File upload with drag-and-drop
2. **Reminder System** - Email/SMS notifications for upcoming compliance deadlines
3. **Document Management** - View and manage compliance evidence
4. **Bulk Actions** - Mark multiple items as done
5. **Export Functionality** - CSV export of compliance data
6. **Compliance Timeline** - Historical view of compliance status changes
7. **Automated Reminders** - Schedule reminders for contractors
8. **Integration with Document Storage** - S3/Azure Blob storage for evidence files

## Technical Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: NestJS + Prisma
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **State Management**: React Query for server state

## Implementation Notes

- The compliance service calculates status dynamically based on due dates
- Only active tenancies are considered for compliance tracking
- Properties without active tenancies show no compliance items
- All dates are stored in ISO format in the database
