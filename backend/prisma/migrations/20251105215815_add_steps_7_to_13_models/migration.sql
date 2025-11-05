/*
  Warnings:

  - Added the required column `landlordId` to the `Invite` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenancyId` on table `Invite` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `landlordId` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "autoApproveThreshold" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iban" TEXT,
    "accountNumber" TEXT,
    "sortCode" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER,
    "requestBody" TEXT,
    "responseBody" TEXT,
    "userId" TEXT,
    "landlordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "variant" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExperimentAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "experimentKey" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UpsellOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "hash" TEXT NOT NULL,
    "matchedInvoiceId" TEXT,
    "confidence" INTEGER,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BankTransaction" ("amount", "bankAccountId", "createdAt", "currency", "description", "hash", "id", "landlordId", "postedAt", "rawJson") SELECT "amount", "bankAccountId", "createdAt", "currency", "description", "hash", "id", "landlordId", "postedAt", "rawJson" FROM "BankTransaction";
DROP TABLE "BankTransaction";
ALTER TABLE "new_BankTransaction" RENAME TO "BankTransaction";
CREATE UNIQUE INDEX "BankTransaction_hash_key" ON "BankTransaction"("hash");
CREATE INDEX "BankTransaction_landlordId_bankAccountId_idx" ON "BankTransaction"("landlordId", "bankAccountId");
CREATE INDEX "BankTransaction_postedAt_idx" ON "BankTransaction"("postedAt");
CREATE INDEX "BankTransaction_hash_idx" ON "BankTransaction"("hash");
CREATE INDEX "BankTransaction_matchedInvoiceId_idx" ON "BankTransaction"("matchedInvoiceId");
CREATE TABLE "new_Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "expiresAt" DATETIME NOT NULL,
    "inviterOrgId" TEXT NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_inviterOrgId_fkey" FOREIGN KEY ("inviterOrgId") REFERENCES "Org" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invite" ("acceptedAt", "createdAt", "email", "expiresAt", "id", "inviterOrgId", "tenancyId", "token") SELECT "acceptedAt", "createdAt", "email", "expiresAt", "id", "inviterOrgId", "tenancyId", "token" FROM "Invite";
DROP TABLE "Invite";
ALTER TABLE "new_Invite" RENAME TO "Invite";
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_landlordId_idx" ON "Invite"("landlordId");
CREATE INDEX "Invite_token_idx" ON "Invite"("token");
CREATE INDEX "Invite_email_idx" ON "Invite"("email");
CREATE INDEX "Invite_tenancyId_idx" ON "Invite"("tenancyId");
CREATE INDEX "Invite_status_idx" ON "Invite"("status");
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "vendorId" TEXT,
    "contractorId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "approvedAt" DATETIME,
    "completedAt" DATETIME,
    "completionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("amount", "approvedAt", "completedAt", "completionNotes", "contractorId", "createdAt", "id", "notes", "status", "ticketId", "updatedAt") SELECT "amount", "approvedAt", "completedAt", "completionNotes", "contractorId", "createdAt", "id", "notes", "status", "ticketId", "updatedAt" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE INDEX "Quote_ticketId_idx" ON "Quote"("ticketId");
CREATE INDEX "Quote_contractorId_idx" ON "Quote"("contractorId");
CREATE INDEX "Quote_vendorId_idx" ON "Quote"("vendorId");
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "landlordId" TEXT NOT NULL,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("assignedToId", "createdAt", "createdById", "description", "id", "priority", "propertyId", "status", "tenancyId", "title", "updatedAt") SELECT "assignedToId", "createdAt", "createdById", "description", "id", "priority", "propertyId", "status", "tenancyId", "title", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE INDEX "Ticket_landlordId_idx" ON "Ticket"("landlordId");
CREATE INDEX "Ticket_propertyId_idx" ON "Ticket"("propertyId");
CREATE INDEX "Ticket_tenancyId_idx" ON "Ticket"("tenancyId");
CREATE INDEX "Ticket_createdById_idx" ON "Ticket"("createdById");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Vendor_landlordId_idx" ON "Vendor"("landlordId");

-- CreateIndex
CREATE INDEX "ApprovalRule_landlordId_idx" ON "ApprovalRule"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRule_landlordId_key" ON "ApprovalRule"("landlordId");

-- CreateIndex
CREATE INDEX "BankConnection_landlordId_idx" ON "BankConnection"("landlordId");

-- CreateIndex
CREATE INDEX "BankConnection_status_idx" ON "BankConnection"("status");

-- CreateIndex
CREATE INDEX "BankAccount_landlordId_idx" ON "BankAccount"("landlordId");

-- CreateIndex
CREATE INDEX "BankAccount_connectionId_idx" ON "BankAccount"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestLog_idempotencyKey_key" ON "RequestLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RequestLog_idempotencyKey_idx" ON "RequestLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RequestLog_landlordId_idx" ON "RequestLog"("landlordId");

-- CreateIndex
CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "FeatureFlag_landlordId_idx" ON "FeatureFlag"("landlordId");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_landlordId_key_key" ON "FeatureFlag"("landlordId", "key");

-- CreateIndex
CREATE INDEX "ExperimentAssignment_landlordId_idx" ON "ExperimentAssignment"("landlordId");

-- CreateIndex
CREATE INDEX "ExperimentAssignment_experimentKey_idx" ON "ExperimentAssignment"("experimentKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentAssignment_landlordId_experimentKey_key" ON "ExperimentAssignment"("landlordId", "experimentKey");

-- CreateIndex
CREATE INDEX "UpsellOpportunity_landlordId_idx" ON "UpsellOpportunity"("landlordId");

-- CreateIndex
CREATE INDEX "UpsellOpportunity_status_idx" ON "UpsellOpportunity"("status");

-- CreateIndex
CREATE INDEX "UpsellOpportunity_type_idx" ON "UpsellOpportunity"("type");
