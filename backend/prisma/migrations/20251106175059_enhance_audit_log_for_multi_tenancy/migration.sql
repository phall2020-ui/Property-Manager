/*
  Warnings:

  - Added the required column `action` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "eventType" TEXT,
    "meta" TEXT,
    "details" TEXT,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Migrate existing records with backward compatible defaults
INSERT INTO "new_AuditLog" (
    "id", "createdAt", "details", "eventType", "propertyId", "tenancyId",
    "action", "entity", "entityId", "meta", "ts"
) SELECT 
    "id", 
    "createdAt", 
    "details", 
    "eventType", 
    "propertyId", 
    "tenancyId",
    COALESCE("eventType", 'UNKNOWN') as "action",
    CASE 
        WHEN "propertyId" IS NOT NULL THEN 'property'
        WHEN "tenancyId" IS NOT NULL THEN 'tenancy'
        ELSE 'unknown'
    END as "entity",
    COALESCE("propertyId", "tenancyId", 'unknown') as "entityId",
    "details" as "meta",
    "createdAt" as "ts"
FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_tenantId_ts_idx" ON "AuditLog"("tenantId", "ts");
CREATE INDEX "AuditLog_propertyId_idx" ON "AuditLog"("propertyId");
CREATE INDEX "AuditLog_tenancyId_idx" ON "AuditLog"("tenancyId");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
