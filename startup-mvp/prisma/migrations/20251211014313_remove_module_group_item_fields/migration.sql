-- AlterTable: Remove unused fields from ModuleGroupItem
-- This migration removes the following fields that are no longer needed:
-- - itemId (foreign key to Item)
-- - unitShutter
-- - totalShutter  
-- - note
-- The quantity field is kept as optional for backward compatibility but will be removed in a future migration.

-- Drop the foreign key constraint and column for itemId
ALTER TABLE "ModuleGroupItem" DROP CONSTRAINT IF EXISTS "ModuleGroupItem_itemId_fkey";
ALTER TABLE "ModuleGroupItem" DROP COLUMN IF EXISTS "itemId";

-- Drop unused columns
ALTER TABLE "ModuleGroupItem" DROP COLUMN IF EXISTS "unitShutter";
ALTER TABLE "ModuleGroupItem" DROP COLUMN IF EXISTS "totalShutter";
ALTER TABLE "ModuleGroupItem" DROP COLUMN IF EXISTS "note";

-- Note: quantity column is kept as optional for backward compatibility
-- It will be removed in a future migration after data migration is complete
