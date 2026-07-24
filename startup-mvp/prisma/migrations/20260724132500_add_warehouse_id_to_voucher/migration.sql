-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN "warehouseId" TEXT;

-- CreateIndex
CREATE INDEX "Voucher_warehouseId_idx" ON "Voucher"("warehouseId");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
