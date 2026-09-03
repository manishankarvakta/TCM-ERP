-- AlterTable
ALTER TABLE "ChangeRequest" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "ChangeRequest" ADD COLUMN "idempotencyPayloadHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_idempotencyKey_key" ON "ChangeRequest"("idempotencyKey");
