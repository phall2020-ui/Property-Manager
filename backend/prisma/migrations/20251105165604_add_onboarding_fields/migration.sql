-- AlterTable
ALTER TABLE "Property" ADD COLUMN "epcRating" TEXT;
ALTER TABLE "Property" ADD COLUMN "furnished" TEXT;
ALTER TABLE "Property" ADD COLUMN "propertyType" TEXT;

-- CreateTable
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "url" TEXT,
    "mimetype" TEXT,
    "size" INTEGER,
    "expiryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TenancyTenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenancyTenant_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PropertyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyNote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropertyNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "eventType" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tenancy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "tenantOrgId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "rentPcm" REAL NOT NULL,
    "rentAmount" REAL,
    "rentFrequency" TEXT NOT NULL DEFAULT 'Monthly',
    "rentDueDay" INTEGER,
    "deposit" REAL NOT NULL,
    "status" TEXT NOT NULL,
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
    CONSTRAINT "Tenancy_tenantOrgId_fkey" FOREIGN KEY ("tenantOrgId") REFERENCES "Org" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Tenancy" ("createdAt", "deposit", "endDate", "id", "propertyId", "rentPcm", "startDate", "status", "tenantOrgId", "updatedAt") SELECT "createdAt", "deposit", "endDate", "id", "propertyId", "rentPcm", "startDate", "status", "tenantOrgId", "updatedAt" FROM "Tenancy";
DROP TABLE "Tenancy";
ALTER TABLE "new_Tenancy" RENAME TO "Tenancy";
CREATE INDEX "Tenancy_propertyId_idx" ON "Tenancy"("propertyId");
CREATE INDEX "Tenancy_tenantOrgId_idx" ON "Tenancy"("tenantOrgId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "updatedAt") SELECT "createdAt", "email", "id", "name", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PropertyDocument_propertyId_idx" ON "PropertyDocument"("propertyId");

-- CreateIndex
CREATE INDEX "TenancyTenant_tenancyId_idx" ON "TenancyTenant"("tenancyId");

-- CreateIndex
CREATE INDEX "TenancyTenant_email_idx" ON "TenancyTenant"("email");

-- CreateIndex
CREATE INDEX "PropertyNote_propertyId_idx" ON "PropertyNote"("propertyId");

-- CreateIndex
CREATE INDEX "AuditLog_propertyId_idx" ON "AuditLog"("propertyId");

-- CreateIndex
CREATE INDEX "AuditLog_tenancyId_idx" ON "AuditLog"("tenancyId");
