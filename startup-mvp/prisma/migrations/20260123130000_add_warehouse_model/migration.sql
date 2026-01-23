-- Add Warehouse model columns (if table exists, add as nullable first)
DO $$
DECLARE
  rec RECORD;
  seq_num INTEGER := 1;
  year_text TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
BEGIN
  -- Add new columns as nullable if they don't exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Warehouse') THEN
    -- Add code column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Warehouse' AND column_name = 'code') THEN
      ALTER TABLE "Warehouse" ADD COLUMN "code" TEXT;
    END IF;
    
    -- Add createdBy column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Warehouse' AND column_name = 'createdBy') THEN
      ALTER TABLE "Warehouse" ADD COLUMN "createdBy" TEXT;
    END IF;
    
    -- Add isTrash column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Warehouse' AND column_name = 'isTrash') THEN
      ALTER TABLE "Warehouse" ADD COLUMN "isTrash" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Warehouse' AND column_name = 'status') THEN
      ALTER TABLE "Warehouse" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
    END IF;
    
    -- Backfill code: Generate WH-{YEAR}-{SEQUENCE} for existing rows
    FOR rec IN SELECT id FROM "Warehouse" WHERE "code" IS NULL ORDER BY COALESCE("createdAt", CURRENT_TIMESTAMP)
    LOOP
      UPDATE "Warehouse" 
      SET "code" = 'WH-' || year_text || '-' || LPAD(seq_num::TEXT, 4, '0')
      WHERE id = rec.id;
      seq_num := seq_num + 1;
    END LOOP;
    
    -- Backfill createdBy: Set to first admin user
    UPDATE "Warehouse" 
    SET "createdBy" = (SELECT id FROM "User" WHERE role = 'admin' LIMIT 1)
    WHERE "createdBy" IS NULL;
    
    -- Make code and createdBy NOT NULL after backfill
    ALTER TABLE "Warehouse" ALTER COLUMN "code" SET NOT NULL;
    ALTER TABLE "Warehouse" ALTER COLUMN "createdBy" SET NOT NULL;
    
    -- Add unique constraint on code if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM pg_constraint WHERE conname = 'Warehouse_code_key'
    ) THEN
      ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_code_key" UNIQUE ("code");
    END IF;
  END IF;
END $$;

-- Create Warehouse table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Warehouse" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "country" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "isTrash" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Warehouse_code_idx" ON "Warehouse"("code");
CREATE INDEX IF NOT EXISTS "Warehouse_name_idx" ON "Warehouse"("name");
CREATE INDEX IF NOT EXISTS "Warehouse_status_idx" ON "Warehouse"("status");
CREATE INDEX IF NOT EXISTS "Warehouse_isTrash_idx" ON "Warehouse"("isTrash");
CREATE INDEX IF NOT EXISTS "Warehouse_createdBy_idx" ON "Warehouse"("createdBy");

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_constraint WHERE conname = 'Warehouse_createdBy_fkey'
  ) THEN
    ALTER TABLE "Warehouse" 
    ADD CONSTRAINT "Warehouse_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
