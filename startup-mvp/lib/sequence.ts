import { prisma } from "@/lib/prisma";

/**
 * Atomic Business Sequence Generator
 * Generates transaction-safe, tenant-isolated, monotonic sequential numbers.
 * Uses atomic PostgreSQL INSERT ... ON CONFLICT DO UPDATE RETURNING.
 * Safe for concurrent, multi-container deployments.
 */
export async function getNextSequenceNumber(
  organizationId: string = "default-org",
  key: string,
  prefix: string,
  year?: number,
  padDigits: number = 6
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const safeOrgId = organizationId || "default-org";

  const result: any[] = await prisma.$queryRawUnsafe(`
    INSERT INTO "BusinessSequence" (id, "organizationId", key, year, "currentValue", "createdAt", "updatedAt")
    VALUES ('seq_' || md5(random()::text || clock_timestamp()::text), '${safeOrgId}', '${key}', ${currentYear}, 1, NOW(), NOW())
    ON CONFLICT ("organizationId", key, year)
    DO UPDATE SET "currentValue" = "BusinessSequence"."currentValue" + 1, "updatedAt" = NOW()
    RETURNING "currentValue";
  `);

  const nextVal = Number(result[0].currentValue);
  const formattedVal = String(nextVal).padStart(padDigits, "0");
  return `${prefix}-${currentYear}-${formattedVal}`;
}
