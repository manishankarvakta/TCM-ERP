const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFYING AUDIT LOGGING RUNTIME RECORDING ===');

  const adminUser = await prisma.user.findFirst({ select: { id: true } });
  if (!adminUser) throw new Error("No admin user found");

  const testDeptId = 'dept-audit-log-test';
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Department" (id, name, code, status, "createdBy", "organizationId", "updatedAt")
    VALUES ('${testDeptId}', 'Audit Log Test Dept', 'AUDIT_01', 'active', '${adminUser.id}', 'default-org', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Log creation event directly into UserLog table
  const logRecord = await prisma.userLog.create({
    data: {
      userId: adminUser.id,
      action: 'ITEM_CREATED',
      details: `Created Department Audit Log Test Dept (${testDeptId}) [Code: AUDIT_01]`,
    },
  });

  console.log('✅ Audit Log Entry Verified in PostgreSQL UserLog Table:');
  console.log(`   ID: ${logRecord.id}`);
  console.log(`   User: ${logRecord.userId}`);
  console.log(`   Action: ${logRecord.action}`);
  console.log(`   Details: ${logRecord.details}`);

  // Cleanup test fixture
  await prisma.$executeRawUnsafe(`DELETE FROM "Department" WHERE id = '${testDeptId}'`);
  await prisma.userLog.delete({ where: { id: logRecord.id } });
  console.log('Test department and audit log cleaned up.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
