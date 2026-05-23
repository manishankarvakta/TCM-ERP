-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('RAW_MATERIAL', 'READY_PRODUCT', 'RETAIL');

-- AlterTable: Add new columns to Item (nullable first, will be backfilled)
ALTER TABLE "Item" 
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "itemType" "ItemType",
  ADD COLUMN IF NOT EXISTS "salesPrice" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "trackInventory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isTrash" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Backfill: Set name from description or code, itemType to RETAIL (default), createdBy to first admin
UPDATE "Item" 
SET 
  "name" = COALESCE(NULLIF("description", ''), "code"),
  "itemType" = 'RETAIL',
  "createdBy" = (SELECT id FROM "User" WHERE role = 'admin' LIMIT 1)
WHERE "name" IS NULL OR "createdBy" IS NULL;

-- Make name and itemType NOT NULL (after backfill)
ALTER TABLE "Item" 
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "itemType" SET NOT NULL,
  ALTER COLUMN "createdBy" SET NOT NULL;

-- Make description nullable (if it was NOT NULL)
ALTER TABLE "Item" 
  ALTER COLUMN "description" DROP NOT NULL;

-- Update costPrice precision
ALTER TABLE "Item" 
  ALTER COLUMN "costPrice" TYPE DECIMAL(12,2);

-- Drop unitPrice column (if exists and not needed)
ALTER TABLE "Item" DROP COLUMN IF EXISTS "unitPrice";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Item_name_idx" ON "Item"("name");
CREATE INDEX IF NOT EXISTS "Item_itemType_idx" ON "Item"("itemType");
CREATE INDEX IF NOT EXISTS "Item_categoryId_idx" ON "Item"("categoryId");
CREATE INDEX IF NOT EXISTS "Item_isTrash_idx" ON "Item"("isTrash");
CREATE INDEX IF NOT EXISTS "Item_createdBy_idx" ON "Item"("createdBy");

-- AddForeignKey
ALTER TABLE "Item" 
  ADD CONSTRAINT "Item_categoryId_fkey" 
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Item" 
  ADD CONSTRAINT "Item_createdBy_fkey" 
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
