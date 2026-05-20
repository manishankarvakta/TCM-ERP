import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log("🔍 Running raw database scan for case-insensitive duplicate emails...\n");

  const tables = [
    { name: "Client", tableName: "Client", hasName: true },
    { name: "Contact", tableName: "Contact", hasName: false },
    { name: "Lead", tableName: "Lead", hasName: true },
    { name: "Supplier", tableName: "Supplier", hasName: true },
    { name: "User", tableName: "User", hasName: true },
  ];

  let totalDuplicates = 0;

  for (const table of tables) {
    console.log(`Scanning "${table.tableName}"...`);
    try {
      // Find emails that occur more than once (ignoring case and whitespace)
      const duplicates: any[] = await prisma.$queryRawUnsafe(`
        SELECT LOWER(TRIM(email)) as email, COUNT(*) as cnt
        FROM "${table.tableName}"
        WHERE email IS NOT NULL AND TRIM(email) != ''
        GROUP BY LOWER(TRIM(email))
        HAVING COUNT(*) > 1
      `);

      if (duplicates.length > 0) {
        for (const dup of duplicates) {
          totalDuplicates++;
          console.log(`❌ Duplicate email detected: "${dup.email}" occurs ${dup.cnt} times.`);
          
          // Fetch the details of the duplicate records
          const details: any[] = await prisma.$queryRawUnsafe(`
            SELECT id, email, ${table.hasName ? 'name' : '"firstName", "lastName"'}
            FROM "${table.tableName}"
            WHERE LOWER(TRIM(email)) = $1
          `, dup.email);

          details.forEach((row: any) => {
            const displayName = table.hasName 
              ? row.name 
              : `${row.firstName || ""} ${row.lastName || ""}`.trim();
            console.log(`   - ID: ${row.id} | Name: ${displayName || "N/A"} | Original Email: "${row.email}"`);
          });
        }
      } else {
        console.log(`✅ No duplicate emails in "${table.tableName}".`);
      }
    } catch (err: any) {
      console.log(`⚠️ Note: Couldn't scan "${table.tableName}" table:`, err.message);
    }
  }

  console.log("\n==================================================");
  if (totalDuplicates > 0) {
    console.log(`🚨 Scan Complete: Found duplicates in your database.`);
    console.log(`💡 To fix this, you must delete or modify the duplicate records listed above so that each email is unique.`);
  } else {
    console.log(`🎉 Scan Complete: No duplicate email records found in any of the checked tables.`);
  }
}

checkDuplicates()
  .catch((e) => {
    console.error("Fatal error during duplicate check:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
