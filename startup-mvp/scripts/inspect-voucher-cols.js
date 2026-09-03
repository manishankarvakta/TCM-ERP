const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Voucher'
    ORDER BY ordinal_position;
  `);
  console.log('Voucher Columns:', cols);
}

main().finally(() => prisma.$disconnect());
