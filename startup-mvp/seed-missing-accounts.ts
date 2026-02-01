
import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

async function seedMissingAccounts() {
  console.log("--- SEEDING MISSING ACCOUNTS ---\n");

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("Admin user not found");

  const accountsToSeed = [
    { name: "Cash", code: "1010", type: "ASSET" },
    { name: "Bank", code: "1020", type: "ASSET" },
    { name: "Inventory Adjustment Gain/Loss", code: "5100", type: "EXPENSE" },
    { name: "Work In Progress", code: "1250", type: "ASSET" },
    { name: "Production Variance", code: "5200", type: "EXPENSE" }
  ];

  for (const acc of accountsToSeed) {
    const existing = await prisma.chartOfAccount.findFirst({
      where: { 
        OR: [
          { name: acc.name },
          { code: acc.code }
        ]
      }
    });

    if (existing) {
      console.log(`Skipping ${acc.name} (Already exists as ${existing.name})`);
    } else {
      console.log(`Creating ${acc.name}...`);
      await prisma.chartOfAccount.create({
        data: {
          name: acc.name,
          code: acc.code,
          type: acc.type as AccountType,
          status: "active",
          createdBy: admin.id,
          id: `ACC-${acc.code}`,
          // updatedAt is now auto-handled by @updatedAt, but good to check if implicit is active 
          // or if we need to pass it. Based on recent schema update, it's @updatedAt. 
          // But Prisma create inputs might still expect it if types aren't fully regened or if optional?
          // Actually, @updatedAt makes it optional in create usually. 
          // However, in verify-accounting-cycle we had to add it. 
          // Let's add it to be safe.
          updatedAt: new Date() 
        }
      });
      console.log(`✅ Created ${acc.name}`);
    }
  }
}

seedMissingAccounts()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
