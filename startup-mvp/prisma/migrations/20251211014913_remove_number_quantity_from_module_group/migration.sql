-- AlterTable: Remove number and quantity from ModuleGroup
-- This migration removes the following fields from ModuleGroup:
-- - number (Int?)
-- - quantity (Decimal?)

ALTER TABLE "ModuleGroup" DROP COLUMN IF EXISTS "number";
ALTER TABLE "ModuleGroup" DROP COLUMN IF EXISTS "quantity";
