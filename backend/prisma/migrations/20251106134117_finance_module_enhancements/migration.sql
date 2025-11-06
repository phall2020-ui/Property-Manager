/*
  Warnings:

  - Added the required column `amountGBP` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dueAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodEnd` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStart` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Made the column `propertyId` on table `Invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenancyId` on table `Invoice` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `amountGBP` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paidAt` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `invoiceId` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `method` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `propertyId` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `providerRef` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenancyId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "tenantUserId" TEXT,
    "number" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "issueDate" DATETIME,
    "dueAt" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "amountGBP" REAL NOT NULL,
    "amount" REAL,
    "lineTotal" REAL,
    "taxTotal" REAL,
    "grandTotal" REAL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "createdAt", "dueDate", "grandTotal", "id", "issueDate", "landlordId", "lineTotal", "number", "propertyId", "status", "taxTotal", "tenancyId", "tenantUserId", "updatedAt") SELECT "amount", "createdAt", "dueDate", "grandTotal", "id", "issueDate", "landlordId", "lineTotal", "number", "propertyId", "status", "taxTotal", "tenancyId", "tenantUserId", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_landlordId_propertyId_tenancyId_dueAt_idx" ON "Invoice"("landlordId", "propertyId", "tenancyId", "dueAt");
CREATE INDEX "Invoice_landlordId_status_idx" ON "Invoice"("landlordId", "status");
CREATE INDEX "Invoice_propertyId_idx" ON "Invoice"("propertyId");
CREATE INDEX "Invoice_tenancyId_idx" ON "Invoice"("tenancyId");
CREATE INDEX "Invoice_tenantUserId_idx" ON "Invoice"("tenantUserId");
CREATE UNIQUE INDEX "Invoice_landlordId_number_key" ON "Invoice"("landlordId", "number");
CREATE UNIQUE INDEX "Invoice_tenancyId_periodStart_periodEnd_key" ON "Invoice"("tenancyId", "periodStart", "periodEnd");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantUserId" TEXT,
    "amountGBP" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "feeGBP" REAL,
    "vatGBP" REAL,
    "paidAt" DATETIME NOT NULL,
    "amount" REAL,
    "receivedAt" DATETIME,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "externalId", "id", "invoiceId", "landlordId", "method", "propertyId", "provider", "providerRef", "receivedAt", "status", "tenancyId", "tenantUserId", "updatedAt") SELECT "amount", "createdAt", "externalId", "id", "invoiceId", "landlordId", "method", "propertyId", "provider", "providerRef", "receivedAt", "status", "tenancyId", "tenantUserId", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");
CREATE INDEX "Payment_landlordId_tenancyId_paidAt_idx" ON "Payment"("landlordId", "tenancyId", "paidAt");
CREATE INDEX "Payment_landlordId_status_idx" ON "Payment"("landlordId", "status");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Payment_propertyId_idx" ON "Payment"("propertyId");
CREATE INDEX "Payment_tenancyId_idx" ON "Payment"("tenancyId");
CREATE INDEX "Payment_tenantUserId_idx" ON "Payment"("tenantUserId");
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
