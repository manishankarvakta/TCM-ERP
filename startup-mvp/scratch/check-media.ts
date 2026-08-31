import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking Media / Files in database for 'API Dev'...");

  // Search file model or media records if present
  try {
    const files = await prisma.$queryRawUnsafe(`SELECT * FROM "File" WHERE name ILIKE '%API%' OR name ILIKE '%Dev%' LIMIT 10;`);
    console.log("Matching files in DB:", files);
  } catch (e) {
    console.log("File table query error:", (e as any).message);
  }
}

main().finally(() => prisma.$disconnect());
