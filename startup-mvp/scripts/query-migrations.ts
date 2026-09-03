import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const migrations: any[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations;`;
  console.log(JSON.stringify(migrations, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
