-- AlterTable
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "clientCode" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "supplierCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Client_clientCode_key" ON "Client"("clientCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_supplierCode_key" ON "Supplier"("supplierCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_clientCode_idx" ON "Client"("clientCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Supplier_supplierCode_idx" ON "Supplier"("supplierCode");

