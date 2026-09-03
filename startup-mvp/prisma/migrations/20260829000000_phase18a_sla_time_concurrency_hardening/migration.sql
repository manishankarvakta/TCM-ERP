-- Phase 18A: SLA Time Authority, Concurrency & Reopen-Cycle Final Hardening

-- 1. Add SLA calendar fields to SupportSLAPolicy
ALTER TABLE "SupportSLAPolicy" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "SupportSLAPolicy" ADD COLUMN IF NOT EXISTS "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5';
ALTER TABLE "SupportSLAPolicy" ADD COLUMN IF NOT EXISTS "businessStartHour" INTEGER NOT NULL DEFAULT 9;
ALTER TABLE "SupportSLAPolicy" ADD COLUMN IF NOT EXISTS "businessEndHour" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "SupportSLAPolicy" ADD COLUMN IF NOT EXISTS "observeHolidays" BOOLEAN NOT NULL DEFAULT true;

-- 2. Add SLA calendar snapshots to SupportTicketSLA
ALTER TABLE "SupportTicketSLA" ADD COLUMN IF NOT EXISTS "timezoneSnapshot" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "SupportTicketSLA" ADD COLUMN IF NOT EXISTS "workingDaysSnapshot" TEXT NOT NULL DEFAULT '1,2,3,4,5';
ALTER TABLE "SupportTicketSLA" ADD COLUMN IF NOT EXISTS "businessStartHourSnapshot" INTEGER NOT NULL DEFAULT 9;
ALTER TABLE "SupportTicketSLA" ADD COLUMN IF NOT EXISTS "businessEndHourSnapshot" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "SupportTicketSLA" ADD COLUMN IF NOT EXISTS "observeHolidaysSnapshot" BOOLEAN NOT NULL DEFAULT true;

-- 3. Create Holiday table if missing & add organizationId
CREATE TABLE IF NOT EXISTS "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "warehouseId" TEXT,
    "organizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 4. Create SupportTicketResolutionHistory table
CREATE TABLE IF NOT EXISTS "SupportTicketResolutionHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL,
    "resolvedById" TEXT NOT NULL,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketResolutionHistory_pkey" PRIMARY KEY ("id")
);

-- Foreign keys & indexes for SupportTicketResolutionHistory
ALTER TABLE "SupportTicketResolutionHistory" ADD CONSTRAINT "SupportTicketResolutionHistory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketResolutionHistory" ADD CONSTRAINT "SupportTicketResolutionHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicketResolutionHistory_ticketId_cycleNumber_key" ON "SupportTicketResolutionHistory"("ticketId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "SupportTicketResolutionHistory_organizationId_idx" ON "SupportTicketResolutionHistory"("organizationId");
CREATE INDEX IF NOT EXISTS "SupportTicketResolutionHistory_ticketId_idx" ON "SupportTicketResolutionHistory"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketResolutionHistory_cycleNumber_idx" ON "SupportTicketResolutionHistory"("cycleNumber");
