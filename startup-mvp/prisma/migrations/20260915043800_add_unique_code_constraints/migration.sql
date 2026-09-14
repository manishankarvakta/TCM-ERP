-- 1. Deduplicate Employee.employeeCode if any duplicates exist
WITH ranked AS (
  SELECT id, "employeeCode",
         ROW_NUMBER() OVER (PARTITION BY "employeeCode" ORDER BY "createdAt" ASC) as rn
  FROM "Employee"
  WHERE "employeeCode" IS NOT NULL AND "employeeCode" != ''
)
UPDATE "Employee" e
SET "employeeCode" = e."employeeCode" || '-DUP' || (r.rn - 1)
FROM ranked r
WHERE e.id = r.id AND r.rn > 1;

-- 2. Deduplicate Item.code if any duplicates exist
WITH ranked AS (
  SELECT id, "code",
         ROW_NUMBER() OVER (PARTITION BY "code" ORDER BY "createdAt" ASC) as rn
  FROM "Item"
  WHERE "code" IS NOT NULL AND "code" != ''
)
UPDATE "Item" i
SET "code" = i."code" || '-DUP' || (r.rn - 1)
FROM ranked r
WHERE i.id = r.id AND r.rn > 1;

-- 3. Deduplicate Supplier.supplierCode if any duplicates exist
WITH ranked AS (
  SELECT id, "supplierCode",
         ROW_NUMBER() OVER (PARTITION BY "supplierCode" ORDER BY "createdAt" ASC) as rn
  FROM "Supplier"
  WHERE "supplierCode" IS NOT NULL AND "supplierCode" != ''
)
UPDATE "Supplier" s
SET "supplierCode" = s."supplierCode" || '-DUP' || (r.rn - 1)
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

-- 4. Clean orphan defaultWarehouseId values in User table
UPDATE "User"
SET "defaultWarehouseId" = NULL
WHERE id IN (
  SELECT u.id
  FROM "User" u
  LEFT JOIN "Warehouse" w ON u."defaultWarehouseId" = w.id
  WHERE u."defaultWarehouseId" IS NOT NULL 
    AND u."defaultWarehouseId" != '' 
    AND w.id IS NULL
);

-- 5. Create Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Item_code_key" ON "Item"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_supplierCode_key" ON "Supplier"("supplierCode");

-- 6. Add Foreign Key for User.defaultWarehouseId safely if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_defaultWarehouseId_fkey'
  ) THEN
    ALTER TABLE "User" 
      ADD CONSTRAINT "User_defaultWarehouseId_fkey" 
      FOREIGN KEY ("defaultWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
