const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectPostgresqlConstraints() {
  console.log('=== REAL POSTGRESQL DATABASE CONSTRAINT INSPECTION ===');

  const models = [
    { model: 'Employee', table: 'Employee', col: 'organizationId' },
    { model: 'Lead', table: 'Lead', col: 'organizationId' },
    { model: 'Client', table: 'Client', col: 'organizationId' },
    { model: 'Contact', table: 'Contact', col: 'organizationId' },
    { model: 'Opportunity', table: 'Opportunity', col: 'organizationId' },
    { model: 'Project', table: 'Project', col: 'organizationId' },
    { model: 'Task', table: 'Task', col: 'organizationId' },
    { model: 'Issue', table: 'Issue', col: 'organizationId' },
    { model: 'Timesheet', table: 'Timesheet', col: 'organizationId' },
    { model: 'Invoice', table: 'Invoice', col: 'organizationId' },
    { model: 'Order', table: 'Order', col: 'organizationId' },
    { model: 'Payroll', table: 'Payroll', col: 'organizationId' },
    { model: 'File', table: 'File', col: 'organizationId' },
    { model: 'Quotation', table: 'Quotation', col: 'organizationId' },
    { model: 'Voucher', table: 'Voucher', col: 'organizationId' },
  ];

  for (const m of models) {
    try {
      // 1. Inspect Column Nullability
      const colInfo = await prisma.$queryRawUnsafe(`
        SELECT column_name, is_nullable, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${m.table}' AND column_name = '${m.col}'
      `);

      // 2. Inspect Indexes
      const indexInfo = await prisma.$queryRawUnsafe(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = '${m.table}' AND indexdef LIKE '%${m.col}%'
      `);

      // 3. Inspect NULL count
      const nullCount = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${m.table}" WHERE "${m.col}" IS NULL
      `);

      if (colInfo.length > 0) {
        console.log(`Model: ${m.model} (${m.table}.${m.col})`);
        console.log(`  Data Type: ${colInfo[0].data_type} | Nullable: ${colInfo[0].is_nullable}`);
        console.log(`  Index Exists: ${indexInfo.length > 0} (${indexInfo.map(i => i.indexname).join(', ') || 'No index'})`);
        console.log(`  NULL Count: ${nullCount[0].count}`);
      } else {
        console.log(`Model: ${m.model} (${m.table}.${m.col}): Column or Table not present in DB schema`);
      }
    } catch (e) {
      console.log(`Model: ${m.model}: ${e.message}`);
    }
  }
}

inspectPostgresqlConstraints()
  .catch((e) => {
    console.error('Inspection error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
