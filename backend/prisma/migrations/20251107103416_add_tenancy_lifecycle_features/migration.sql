-- CreateTable
CREATE TABLE "BreakClause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT NOT NULL,
    "earliestBreakDate" DATETIME NOT NULL,
    "noticeMonths" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BreakClause_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guarantor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guarantor_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RentRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "rentPcm" REAL NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RentRevision_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tenancy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "landlordId" TEXT,
    "tenantOrgId" TEXT NOT NULL,
    "primaryTenant" TEXT,
    "start" DATETIME NOT NULL,
    "startDate" DATETIME,
    "end" DATETIME,
    "endDate" DATETIME,
    "rent" REAL NOT NULL,
    "rentPcm" REAL,
    "rentAmount" REAL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "rentFrequency" TEXT,
    "rentDueDay" INTEGER,
    "deposit" REAL NOT NULL,
    "externalRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "terminatedAt" DATETIME,
    "terminationReason" TEXT,
    "renewalOfId" TEXT,
    "depositScheme" TEXT,
    "depositProtectedAt" DATETIME,
    "prescribedInfoServedAt" DATETIME,
    "howToRentServedAt" DATETIME,
    "rightToRentCheckedAt" DATETIME,
    "gasSafetyDueAt" DATETIME,
    "eicrDueAt" DATETIME,
    "epcExpiresAt" DATETIME,
    "boilerServiceDueAt" DATETIME,
    "smokeAlarmsCheckedAt" DATETIME,
    "coAlarmsCheckedAt" DATETIME,
    "legionellaAssessmentAt" DATETIME,
    "hmo" BOOLEAN NOT NULL DEFAULT false,
    "hmoLicenceNumber" TEXT,
    "hmoLicenceExpiresAt" DATETIME,
    "selectiveLicence" BOOLEAN NOT NULL DEFAULT false,
    "selectiveLicenceExpiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenancy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tenancy_tenantOrgId_fkey" FOREIGN KEY ("tenantOrgId") REFERENCES "Org" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tenancy_renewalOfId_fkey" FOREIGN KEY ("renewalOfId") REFERENCES "Tenancy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tenancy" ("boilerServiceDueAt", "coAlarmsCheckedAt", "createdAt", "deposit", "depositProtectedAt", "depositScheme", "eicrDueAt", "end", "endDate", "epcExpiresAt", "externalRef", "frequency", "gasSafetyDueAt", "hmo", "hmoLicenceExpiresAt", "hmoLicenceNumber", "howToRentServedAt", "id", "landlordId", "legionellaAssessmentAt", "notes", "prescribedInfoServedAt", "propertyId", "rent", "rentAmount", "rentDueDay", "rentFrequency", "rentPcm", "rightToRentCheckedAt", "selectiveLicence", "selectiveLicenceExpiresAt", "smokeAlarmsCheckedAt", "start", "startDate", "status", "tenantOrgId", "updatedAt") SELECT "boilerServiceDueAt", "coAlarmsCheckedAt", "createdAt", "deposit", "depositProtectedAt", "depositScheme", "eicrDueAt", "end", "endDate", "epcExpiresAt", "externalRef", "frequency", "gasSafetyDueAt", "hmo", "hmoLicenceExpiresAt", "hmoLicenceNumber", "howToRentServedAt", "id", "landlordId", "legionellaAssessmentAt", "notes", "prescribedInfoServedAt", "propertyId", "rent", "rentAmount", "rentDueDay", "rentFrequency", "rentPcm", "rightToRentCheckedAt", "selectiveLicence", "selectiveLicenceExpiresAt", "smokeAlarmsCheckedAt", "start", "startDate", "status", "tenantOrgId", "updatedAt" FROM "Tenancy";
DROP TABLE "Tenancy";
ALTER TABLE "new_Tenancy" RENAME TO "Tenancy";
CREATE UNIQUE INDEX "Tenancy_externalRef_key" ON "Tenancy"("externalRef");
CREATE INDEX "Tenancy_propertyId_idx" ON "Tenancy"("propertyId");
CREATE INDEX "Tenancy_tenantOrgId_idx" ON "Tenancy"("tenantOrgId");
CREATE INDEX "Tenancy_landlordId_idx" ON "Tenancy"("landlordId");
CREATE INDEX "Tenancy_externalRef_idx" ON "Tenancy"("externalRef");
CREATE INDEX "Tenancy_status_idx" ON "Tenancy"("status");
CREATE INDEX "Tenancy_status_end_idx" ON "Tenancy"("status", "end");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BreakClause_tenancyId_key" ON "BreakClause"("tenancyId");

-- CreateIndex
CREATE INDEX "Guarantor_tenancyId_idx" ON "Guarantor"("tenancyId");

-- CreateIndex
CREATE INDEX "RentRevision_tenancyId_idx" ON "RentRevision"("tenancyId");

-- CreateIndex
CREATE INDEX "RentRevision_effectiveFrom_idx" ON "RentRevision"("effectiveFrom");

-- CreateIndex
CREATE INDEX "WebhookLog_provider_eventId_idx" ON "WebhookLog"("provider", "eventId");

-- CreateIndex
CREATE INDEX "WebhookLog_processed_idx" ON "WebhookLog"("processed");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");
