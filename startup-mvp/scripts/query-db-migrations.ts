import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const migrations: any[] = await prisma.$queryRaw`SELECT id, checksum, migration_name, started_at, finished_at FROM _prisma_migrations ORDER BY id ASC;`;
  console.log("=== DB MIGRATIONS ===");
  for (const m of migrations) {
    if (m.migration_name.includes("phase")) {
      console.log(`Migration: ${m.migration_name}`);
      console.log(`Checksum:  ${m.checksum}`);
      console.log(`Started:   ${m.started_at}`);
      console.log(`Finished:  ${m.finished_at}`);
      console.log("------------------------");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
