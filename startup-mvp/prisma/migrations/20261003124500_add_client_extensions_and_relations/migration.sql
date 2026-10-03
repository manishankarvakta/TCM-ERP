-- 1. Create MembershipTier Table if not exists
CREATE TABLE IF NOT EXISTS "MembershipTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPurchaseValue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipTier_pkey" PRIMARY KEY ("id")
);

-- Unique index on MembershipTier.name
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipTier_name_key" ON "MembershipTier"("name");

-- Foreign key for MembershipTier.createdBy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MembershipTier_createdBy_fkey'
  ) THEN
    ALTER TABLE "MembershipTier" 
      ADD CONSTRAINT "MembershipTier_createdBy_fkey" 
      FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Add extended columns to Client table
ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "clientType" TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS "membershipNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "membershipTier" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "membership_tier_id" TEXT,
  ADD COLUMN IF NOT EXISTS "membershipStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
  ADD COLUMN IF NOT EXISTS "membershipPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "membershipExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "isLoginEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT,
  ADD COLUMN IF NOT EXISTS "resetPasswordExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "documents" JSONB,
  ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;

-- Deduplicate membershipNumber if duplicates exist before creating unique index
WITH ranked AS (
  SELECT id, "membershipNumber",
         ROW_NUMBER() OVER (PARTITION BY "membershipNumber" ORDER BY "createdAt" ASC) as rn
  FROM "Client"
  WHERE "membershipNumber" IS NOT NULL AND "membershipNumber" != ''
)
UPDATE "Client" c
SET "membershipNumber" = c."membershipNumber" || '-DUP' || (r.rn - 1)
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Indices on Client
CREATE UNIQUE INDEX IF NOT EXISTS "Client_membershipNumber_key" ON "Client"("membershipNumber");
CREATE INDEX IF NOT EXISTS "Client_warehouseId_idx" ON "Client"("warehouseId");

-- Foreign keys on Client for warehouseId and membership_tier_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Client_warehouseId_fkey'
  ) THEN
    ALTER TABLE "Client" 
      ADD CONSTRAINT "Client_warehouseId_fkey" 
      FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Client_membership_tier_id_fkey'
  ) THEN
    ALTER TABLE "Client" 
      ADD CONSTRAINT "Client_membership_tier_id_fkey" 
      FOREIGN KEY ("membership_tier_id") REFERENCES "MembershipTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Create ClientAddress Table
CREATE TABLE IF NOT EXISTS "ClientAddress" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "area" TEXT,
    "city" TEXT,
    "district" TEXT,
    "division" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClientAddress_clientId_idx" ON "ClientAddress"("clientId");
CREATE INDEX IF NOT EXISTS "ClientAddress_isDefault_idx" ON "ClientAddress"("isDefault");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientAddress_clientId_fkey'
  ) THEN
    ALTER TABLE "ClientAddress" 
      ADD CONSTRAINT "ClientAddress_clientId_fkey" 
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Create ClientItemDiscount Table
CREATE TABLE IF NOT EXISTS "ClientItemDiscount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "itemId" TEXT,
    "variantId" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientItemDiscount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClientItemDiscount_clientId_idx" ON "ClientItemDiscount"("clientId");
CREATE INDEX IF NOT EXISTS "ClientItemDiscount_itemId_idx" ON "ClientItemDiscount"("itemId");
CREATE INDEX IF NOT EXISTS "ClientItemDiscount_variantId_idx" ON "ClientItemDiscount"("variantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientItemDiscount_clientId_fkey'
  ) THEN
    ALTER TABLE "ClientItemDiscount" 
      ADD CONSTRAINT "ClientItemDiscount_clientId_fkey" 
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientItemDiscount_itemId_fkey'
  ) THEN
    ALTER TABLE "ClientItemDiscount" 
      ADD CONSTRAINT "ClientItemDiscount_itemId_fkey" 
      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientItemDiscount_variantId_fkey'
  ) THEN
    ALTER TABLE "ClientItemDiscount" 
      ADD CONSTRAINT "ClientItemDiscount_variantId_fkey" 
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
