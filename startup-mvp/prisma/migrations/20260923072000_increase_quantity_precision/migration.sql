-- AlterTable
ALTER TABLE "Stock" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);
ALTER TABLE "Stock" ALTER COLUMN "reservedQuantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "StockLedger" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "ProductionOrder" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "PurchaseItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);
ALTER TABLE "PurchaseItem" ALTER COLUMN "receivedQuantity" TYPE DECIMAL(14,3);
ALTER TABLE "PurchaseItem" ALTER COLUMN "returnedQuantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "InventoryAdjustmentItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "InventoryDamageItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "InventoryCountEntry" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "InventoryAddStockEntry" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "ReturnToVendorItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "TransferPurchaseNoteItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,3);

-- AlterTable
ALTER TABLE "GRNItem" ALTER COLUMN "receivedQuantity" TYPE DECIMAL(14,3);
