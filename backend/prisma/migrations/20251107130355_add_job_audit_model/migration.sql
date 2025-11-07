-- CreateTable
CREATE TABLE "JobAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queue" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "JobAudit_queue_jobId_idx" ON "JobAudit"("queue", "jobId");

-- CreateIndex
CREATE INDEX "JobAudit_actorUserId_idx" ON "JobAudit"("actorUserId");

-- CreateIndex
CREATE INDEX "JobAudit_createdAt_idx" ON "JobAudit"("createdAt");
