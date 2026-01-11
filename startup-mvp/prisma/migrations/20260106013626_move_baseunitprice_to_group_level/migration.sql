-- AlterTable
ALTER TABLE "ModuleGroup" ADD COLUMN "baseUnit" TEXT,
ADD COLUMN "baseUnitPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ModuleGroupItem" DROP COLUMN "baseUnit",
DROP COLUMN "baseUnitPrice";

