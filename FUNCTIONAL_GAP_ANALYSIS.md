# Functional Gap Analysis Report

**Generated:** 2025-11-08T15:45:29.417Z

**Repository:** Property Manager Platform

## 📊 Summary

- **Backend Endpoints:** 141
- **Frontend Pages:** 11
- **Frontend API Calls:** 22
- **Frontend Gaps Found:** 6
- **Backend Gaps Found:** 17
- **Integration Gaps Found:** 121
- **Total Issues:** 144

## 🎨 Frontend Gaps

| Area | Description | Impact | Suggested Fix (high-level, no code) |
|------|-------------|--------|--------------------------------------|
| Frontend - Mock Data | Page "ComplianceCentrePage" contains TODO comments, mock data, or placeholders<br>**File:** `frontend-new/src/pages/compliance/ComplianceCentrePage.tsx` | Medium | Replace mock data with actual API integration |
| Frontend - Mock Data | Page "JobsListPage" contains TODO comments, mock data, or placeholders<br>**File:** `frontend-new/src/pages/jobs/JobsListPage.tsx` | Medium | Replace mock data with actual API integration |
| Frontend - Mock Data | Page "PropertyCreatePage" contains TODO comments, mock data, or placeholders<br>**File:** `frontend-new/src/pages/properties/PropertyCreatePage.tsx` | Medium | Replace mock data with actual API integration |
| Frontend - Mock Data | Page "QueueListPage" contains TODO comments, mock data, or placeholders<br>**File:** `frontend-new/src/pages/queue/QueueListPage.tsx` | Medium | Replace mock data with actual API integration |
| Frontend - Mock Data | Page "TicketCreatePage" contains TODO comments, mock data, or placeholders<br>**File:** `frontend-new/src/pages/tickets/TicketCreatePage.tsx` | Medium | Replace mock data with actual API integration |
| Frontend - Mock Data | Page "TicketsListPage" contains TODO comments, mock data, or placeholders<br>**File:** `frontend-new/src/pages/tickets/TicketsListPage.tsx` | Medium | Replace mock data with actual API integration |

## ⚙️ Backend Gaps

| Area | Description | Impact | Suggested Fix (high-level, no code) |
|------|-------------|--------|--------------------------------------|
| Backend - Authentication | Controller "src" may be missing authentication<br>**File:** `backend/apps/api/src/app.controller.ts` | Medium | Add @ApiBearerAuth() and @UseGuards(JwtAuthGuard) to protected routes |
| Backend - Validation | Controller "src" may be missing request validation<br>**File:** `backend/apps/api/src/app.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Authentication | Controller "auth" may be missing authentication<br>**File:** `backend/apps/api/src/modules/auth/auth.controller.ts` | Medium | Add @ApiBearerAuth() and @UseGuards(JwtAuthGuard) to protected routes |
| Backend - Validation | Controller "auth" may be missing request validation<br>**File:** `backend/apps/api/src/modules/auth/auth.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Authentication | Controller "compliance" may be missing authentication<br>**File:** `backend/apps/api/src/modules/compliance/compliance.controller.ts` | Medium | Add @ApiBearerAuth() and @UseGuards(JwtAuthGuard) to protected routes |
| Backend - Validation | Controller "compliance" may be missing request validation<br>**File:** `backend/apps/api/src/modules/compliance/compliance.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Validation | Controller "events" may be missing request validation<br>**File:** `backend/apps/api/src/modules/events/events.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Validation | Controller "finance" may be missing request validation<br>**File:** `backend/apps/api/src/modules/finance/tenant-finance.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Authentication | Controller "finance" may be missing authentication<br>**File:** `backend/apps/api/src/modules/finance/webhook.controller.ts` | Medium | Add @ApiBearerAuth() and @UseGuards(JwtAuthGuard) to protected routes |
| Backend - Validation | Controller "finance" may be missing request validation<br>**File:** `backend/apps/api/src/modules/finance/webhook.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Validation | Controller "jobs" may be missing request validation<br>**File:** `backend/apps/api/src/modules/jobs/jobs.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Validation | Controller "notifications.disabled" may be missing request validation<br>**File:** `backend/apps/api/src/modules/notifications.disabled/notifications.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Validation | Controller "queue" may be missing request validation<br>**File:** `backend/apps/api/src/modules/queue/queue.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Validation | Controller "users" may be missing request validation<br>**File:** `backend/apps/api/src/modules/users/users.controller.ts` | Medium | Add DTOs with class-validator decorators for request validation |
| Backend - Disabled Module | Module "landlord-resource.guard.ts" is disabled but may have frontend dependencies<br>**File:** `backend/apps/api/src/common/guards/landlord-resource.guard.ts.disabled` | High | Re-enable module or remove frontend references to this feature |
| Backend - Disabled Module | Module "roles.guard.ts" is disabled but may have frontend dependencies<br>**File:** `backend/apps/api/src/common/guards/roles.guard.ts.disabled` | High | Re-enable module or remove frontend references to this feature |
| Backend - Disabled Module | Module "notifications.processor.ts" is disabled but may have frontend dependencies<br>**File:** `backend/apps/api/src/modules/notifications.disabled/notifications.processor.ts.disabled` | High | Re-enable module or remove frontend references to this feature |

## 🔗 UI/Integration Gaps

| Area | Description | Impact | Suggested Fix (high-level, no code) |
|------|-------------|--------|--------------------------------------|
| Integration - Missing Backend | Frontend makes API call "POST /attachments/sign" but no matching backend endpoint found | High | Implement the backend endpoint or remove/update the frontend call |
| Integration - Missing Backend | Frontend makes API call "POST /documents" but no matching backend endpoint found | High | Implement the backend endpoint or remove/update the frontend call |
| Integration - Unused Backend | Backend endpoint "GET /api//" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api//health" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/banking/connections" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/banking/connections" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/banking/accounts" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/banking/sync" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/banking/reconcile/auto" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/banking/reconcile/manual" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/banking/reconcile/unmatch" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/compliance/property/:propertyId" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api//attachments/sign" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api//documents" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/dashboard" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/rent-roll" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/arrears" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/arrears/aging" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/invoices" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/invoices/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/invoices/:id/void" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/payments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/payments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/payments/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/payments/:id/allocate" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/mandates" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/mandates" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/mandates/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/payouts" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/payouts/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/bank-feeds/transactions" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/reconciliation/suggest/:bankTransactionId" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/settings" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PATCH /api/finance/settings" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/tenancies/:tenancyId/balance" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/properties/:id/rent/summary" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/exports/rent-roll" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/exports/payments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/invoices/:id/pdf/regenerate" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/finance/invoices/:id/pdf" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/finance/payments/webhook" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tenant/payments/invoices" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tenant/payments/invoices/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tenant/payments/receipts/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/webhooks/gocardless" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/webhooks/stripe" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/flags" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/flags/:key" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/flags" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PUT /api/flags/:key" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/flags/:key/toggle" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/flags/assign" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/flags/:experimentKey" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PUT /api/flags/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/invites/tenant" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/invites/tenant/accept" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/jobs/queues" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/jobs/queues/:queueName" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/jobs/queues/:queueName/:jobId" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/jobs/queues/:queueName/:jobId/retry" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/jobs/queues/:queueName/:jobId/remove" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/jobs/queues/:queueName/:jobId/cancel" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/jobs/audit" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/jobs/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/landlord/tickets" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/notifications/preferences" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PUT /api/notifications/preferences" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/notifications/email" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/properties/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PATCH /api/properties/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "DELETE /api/properties/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/properties/:id/restore" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/properties/:propertyId/images" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/properties/:propertyId/images" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PATCH /api/properties/:propertyId/images/:imageId" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "DELETE /api/properties/:propertyId/images/:imageId" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tenancies/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PATCH /api/tenancies/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tenancies/:id/terminate" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tenancies/:id/renew" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tenancies/:id/rent-increase" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tenancies/:id/guarantors" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "DELETE /api/tenancies/guarantors/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tenancies/:id/payments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tenancies/:id/documents" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/:id" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/:id/quote" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PATCH /api/tickets/:id/status" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/:id/timeline" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/:id/approve" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/quotes/:quoteId/approve" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/:id/complete" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/:id/attachments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/:id/appointments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/:id/appointments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/appointments/:appointmentId/confirm" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/appointments/:appointmentId" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/bulk/status" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/bulk/assign" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/bulk/close" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/bulk/reassign" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/bulk/tag" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/bulk/category" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PATCH /api/tickets/:id/assign" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/quotes/:quoteId/reject" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/appointments/:appointmentId/cancel" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/:id/quotes/compare" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/contractors/:contractorId/availability" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/:id/reopen" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/quotes/bulk/approve" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/templates" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/templates" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/templates/:templateId/create-ticket" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/:id/comments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/:id/comments" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/contractors/:contractorId/metrics" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "POST /api/tickets/category-routing" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/category-routing" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "PATCH /api/tickets/quotes/:quoteId/actual-cost" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/export/csv" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |
| Integration - Unused Backend | Backend endpoint "GET /api/tickets/reports/summary" exists but is not called by frontend | Low | Add frontend UI to use this endpoint or remove if no longer needed |

## 📋 Detailed Findings

### Backend Endpoints

- `DELETE /api/properties/:id`
- `DELETE /api/properties/:propertyId/images/:imageId`
- `DELETE /api/tenancies/guarantors/:id`
- `GET /api//`
- `GET /api//health`
- `GET /api/banking/accounts`
- `GET /api/banking/connections`
- `GET /api/compliance/portfolio`
- `GET /api/compliance/portfolio/stats`
- `GET /api/compliance/property/:propertyId`
- `GET /api/events`
- `GET /api/finance/arrears`
- `GET /api/finance/arrears/aging`
- `GET /api/finance/bank-feeds/transactions`
- `GET /api/finance/dashboard`
- `GET /api/finance/exports/payments`
- `GET /api/finance/exports/rent-roll`
- `GET /api/finance/invoices`
- `GET /api/finance/invoices/:id`
- `GET /api/finance/invoices/:id/pdf`
- `GET /api/finance/mandates`
- `GET /api/finance/mandates/:id`
- `GET /api/finance/payments`
- `GET /api/finance/payments/:id`
- `GET /api/finance/payouts`
- `GET /api/finance/payouts/:id`
- `GET /api/finance/properties/:id/rent/summary`
- `GET /api/finance/rent-roll`
- `GET /api/finance/settings`
- `GET /api/finance/tenancies/:tenancyId/balance`
- `GET /api/flags`
- `GET /api/flags/:experimentKey`
- `GET /api/flags/:key`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/jobs/audit`
- `GET /api/jobs/queues`
- `GET /api/jobs/queues/:queueName`
- `GET /api/jobs/queues/:queueName/:jobId`
- `GET /api/notifications`
- `GET /api/notifications/preferences`
- `GET /api/notifications/unread-count`
- `GET /api/properties`
- `GET /api/properties/:id`
- `GET /api/properties/:propertyId/images`
- `GET /api/queue`
- `GET /api/queue/stats`
- `GET /api/tenancies`
- `GET /api/tenancies/:id`
- `GET /api/tenancies/:id/payments`
- `GET /api/tenant/payments/invoices`
- `GET /api/tenant/payments/invoices/:id`
- `GET /api/tenant/payments/receipts/:id`
- `GET /api/tickets`
- `GET /api/tickets/:id`
- `GET /api/tickets/:id/appointments`
- `GET /api/tickets/:id/comments`
- `GET /api/tickets/:id/quotes/compare`
- `GET /api/tickets/:id/timeline`
- `GET /api/tickets/appointments/:appointmentId`
- `GET /api/tickets/category-routing`
- `GET /api/tickets/contractors/:contractorId/availability`
- `GET /api/tickets/contractors/:contractorId/metrics`
- `GET /api/tickets/export/csv`
- `GET /api/tickets/reports/summary`
- `GET /api/tickets/templates`
- `GET /api/users/me`
- `PATCH /api/finance/settings`
- `PATCH /api/properties/:id`
- `PATCH /api/properties/:propertyId/images/:imageId`
- `PATCH /api/tenancies/:id`
- `PATCH /api/tickets/:id/assign`
- `PATCH /api/tickets/:id/status`
- `PATCH /api/tickets/quotes/:quoteId/actual-cost`
- `POST /api//attachments/sign`
- `POST /api//documents`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/signup`
- `POST /api/banking/connections`
- `POST /api/banking/reconcile/auto`
- `POST /api/banking/reconcile/manual`
- `POST /api/banking/reconcile/unmatch`
- `POST /api/banking/sync`
- `POST /api/finance/invoices`
- `POST /api/finance/invoices/:id/pdf/regenerate`
- `POST /api/finance/invoices/:id/void`
- `POST /api/finance/mandates`
- `POST /api/finance/payments`
- `POST /api/finance/payments/:id/allocate`
- `POST /api/finance/payments/webhook`
- `POST /api/finance/reconciliation/suggest/:bankTransactionId`
- `POST /api/flags`
- `POST /api/flags/:key/toggle`
- `POST /api/flags/assign`
- `POST /api/invites/tenant`
- `POST /api/invites/tenant/accept`
- `POST /api/jobs/queues/:queueName/:jobId/cancel`
- `POST /api/jobs/queues/:queueName/:jobId/remove`
- `POST /api/jobs/queues/:queueName/:jobId/retry`
- `POST /api/landlord/tickets`
- `POST /api/notifications/email`
- `POST /api/notifications/read`
- `POST /api/notifications/read-all`
- `POST /api/properties`
- `POST /api/properties/:id/restore`
- `POST /api/properties/:propertyId/images`
- `POST /api/tenancies`
- `POST /api/tenancies/:id/documents`
- `POST /api/tenancies/:id/guarantors`
- `POST /api/tenancies/:id/renew`
- `POST /api/tenancies/:id/rent-increase`
- `POST /api/tenancies/:id/terminate`
- `POST /api/tickets`
- `POST /api/tickets/:id/appointments`
- `POST /api/tickets/:id/approve`
- `POST /api/tickets/:id/attachments`
- `POST /api/tickets/:id/comments`
- `POST /api/tickets/:id/complete`
- `POST /api/tickets/:id/quote`
- `POST /api/tickets/:id/reopen`
- `POST /api/tickets/appointments/:appointmentId/cancel`
- `POST /api/tickets/appointments/:appointmentId/confirm`
- `POST /api/tickets/bulk/assign`
- `POST /api/tickets/bulk/category`
- `POST /api/tickets/bulk/close`
- `POST /api/tickets/bulk/reassign`
- `POST /api/tickets/bulk/status`
- `POST /api/tickets/bulk/tag`
- `POST /api/tickets/category-routing`
- `POST /api/tickets/quotes/:quoteId/approve`
- `POST /api/tickets/quotes/:quoteId/reject`
- `POST /api/tickets/quotes/bulk/approve`
- `POST /api/tickets/templates`
- `POST /api/tickets/templates/:templateId/create-ticket`
- `POST /api/webhooks/gocardless`
- `POST /api/webhooks/stripe`
- `PUT /api/flags/:id`
- `PUT /api/flags/:key`
- `PUT /api/notifications/preferences`

### Frontend Pages

- **DashboardPage** (`frontend-new/src/pages/DashboardPage.tsx`)
- **LoginPage** (`frontend-new/src/pages/LoginPage.tsx`)
- **ComplianceCentrePage** (`frontend-new/src/pages/compliance/ComplianceCentrePage.tsx`)
- **JobsListPage** (`frontend-new/src/pages/jobs/JobsListPage.tsx`)
- **PropertiesListPage** (`frontend-new/src/pages/properties/PropertiesListPage.tsx`)
- **PropertyCreatePage** (`frontend-new/src/pages/properties/PropertyCreatePage.tsx`)
- **PropertyDetailPage** (`frontend-new/src/pages/properties/PropertyDetailPage.tsx`)
- **QueueListPage** (`frontend-new/src/pages/queue/QueueListPage.tsx`)
- **TicketCreatePage** (`frontend-new/src/pages/tickets/TicketCreatePage.tsx`)
- **TicketDetailPage** (`frontend-new/src/pages/tickets/TicketDetailPage.tsx`)
- **TicketsListPage** (`frontend-new/src/pages/tickets/TicketsListPage.tsx`)

## 🎯 Priority Summary

### 🔴 High Priority Issues (5)

1. **Backend - Disabled Module**: Module "landlord-resource.guard.ts" is disabled but may have frontend dependencies
2. **Backend - Disabled Module**: Module "roles.guard.ts" is disabled but may have frontend dependencies
3. **Backend - Disabled Module**: Module "notifications.processor.ts" is disabled but may have frontend dependencies
4. **Integration - Missing Backend**: Frontend makes API call "POST /attachments/sign" but no matching backend endpoint found
5. **Integration - Missing Backend**: Frontend makes API call "POST /documents" but no matching backend endpoint found

### 🟡 Medium Priority Issues (20)

1. **Frontend - Mock Data**: Page "ComplianceCentrePage" contains TODO comments, mock data, or placeholders
2. **Frontend - Mock Data**: Page "JobsListPage" contains TODO comments, mock data, or placeholders
3. **Frontend - Mock Data**: Page "PropertyCreatePage" contains TODO comments, mock data, or placeholders
4. **Frontend - Mock Data**: Page "QueueListPage" contains TODO comments, mock data, or placeholders
5. **Frontend - Mock Data**: Page "TicketCreatePage" contains TODO comments, mock data, or placeholders

_...and 15 more_

## 📌 Overall Assessment

### Major Pain Points:

- **Disabled Backend Modules (3)**: Several backend modules are disabled but may have frontend dependencies. This could cause runtime errors.
- **Frontend Ahead of Backend (2)**: Frontend is making API calls to endpoints that don't exist in the backend.
- **Backend Unused (119)**: Backend endpoints exist but are not being used by the frontend, indicating incomplete UI implementation.

### Areas to Prioritize:

1. **Re-enable or Remove Disabled Modules**: Resolve the status of disabled backend modules to prevent frontend errors.
2. **Complete Missing Backend Endpoints**: Implement backend endpoints that the frontend is trying to call.
3. **Add Error Handling**: Improve user experience by adding proper error handling in frontend pages.
4. **Enhance Form Validation**: Add client-side and server-side validation for better data quality.
5. **Complete UI Features**: Build frontend interfaces for unused backend capabilities.

---

**Note:** This analysis is automated and may have false positives. Manual review is recommended.
