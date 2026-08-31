import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Checking for missing physical files in DB...");

  const files = await prisma.file.findMany({
    select: { id: true, name: true, storageKey: true },
  });

  const uploadsDir = path.join(process.cwd(), "uploads");

  let missingCount = 0;
  for (const f of files) {
    const fullPath = path.join(uploadsDir, f.storageKey);
    if (!fs.existsSync(fullPath)) {
      console.log(`Missing file on disk: ${f.storageKey} (DB ID: ${f.id}, Name: ${f.name})`);
      missingCount++;
      // Create parent directory and a 1x1 transparent/placeholder image if it's an image
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Create dummy file so 404 server errors don't break frontend previews
      fs.writeFileSync(fullPath, Buffer.from(""));
      console.log(`Created placeholder file for: ${f.storageKey}`);
    }
  }

  console.log(`Found and created placeholders for ${missingCount} missing files.`);
}

main().finally(() => prisma.$disconnect());
