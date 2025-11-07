-- AlterTable
ALTER TABLE "Property" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "ownerOrgId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyImage_ownerOrgId_propertyId_idx" ON "PropertyImage"("ownerOrgId", "propertyId");

-- CreateIndex
CREATE INDEX "Property_ownerOrgId_deletedAt_idx" ON "Property"("ownerOrgId", "deletedAt");
