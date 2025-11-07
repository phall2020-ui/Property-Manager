-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "tags" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_category_idx" ON "Ticket"("category");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

-- CreateIndex
CREATE INDEX "Ticket_landlordId_createdAt_idx" ON "Ticket"("landlordId", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_landlordId_category_idx" ON "Ticket"("landlordId", "category");

-- CreateIndex
CREATE INDEX "Ticket_landlordId_assignedToId_idx" ON "Ticket"("landlordId", "assignedToId");
