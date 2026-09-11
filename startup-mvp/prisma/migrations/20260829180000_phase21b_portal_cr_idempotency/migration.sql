-- AlterTable
ALTER TABLE "ChangeRequest" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "ChangeRequest" ADD COLUMN IF NOT EXISTS "idempotencyPayloadHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChangeRequest_idempotencyKey_key" ON "ChangeRequest"("idempotencyKey");

