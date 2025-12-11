-- AlterTable: Remove name from ModuleGroup
-- This migration removes the name field from ModuleGroup.
-- The code field will be used as the primary identifier instead.

-- Drop the index on name first
DROP INDEX IF EXISTS "ModuleGroup_name_idx";

-- Drop the name column
ALTER TABLE "ModuleGroup" DROP COLUMN IF EXISTS "name";
