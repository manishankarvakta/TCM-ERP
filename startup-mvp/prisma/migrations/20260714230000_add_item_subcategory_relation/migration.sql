-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "subCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "Item_subCategoryId_idx" ON "Item"("subCategoryId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
