-- CreateTable
CREATE TABLE "backup_progress" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentTable" TEXT,
    "currentRecord" TEXT,
    "totalTables" INTEGER NOT NULL DEFAULT 0,
    "completedTables" INTEGER NOT NULL DEFAULT 0,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "completedRecords" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "backup_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backup_progress_status_completedAt_idx" ON "backup_progress"("status", "completedAt");
