const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCRMTables() {
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (
      table_name ILIKE '%lead%' OR table_name ILIKE '%opp%' OR table_name ILIKE '%deal%' OR table_name ILIKE '%quotation%'
    );
  `;
  console.log('CRM table names in DB:', tables.map(t => t.table_name));
}

checkCRMTables().finally(() => prisma.$disconnect());
