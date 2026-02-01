
import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

async function seedMissingAccounts() {
  console.log("--- SEEDING MISSING ACCOUNTS ---\n");

  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("Admin user not found");

  const accountsToSeed = [
    { name: "Cash", code: "1010", type: "ASSET", isControl: false },
    { name: "Bank", code: "1020", type: "ASSET", isControl: false },
    { name: "Inventory Adjustment Gain/Loss", code: "5100", type: "EXPENSE", isControl: false },
    { name: "Work In Progress", code: "1250", type: "ASSET", isControl: false },
    { name: "Production Variance", code: "5200", type: "EXPENSE", isControl: false },
    // Control Accounts - ensure they are marked
    { name: "Inventory Asset", code: "1200", type: "ASSET", isControl: true },
    { name: "Accounts Receivable", code: "1100", type: "ASSET", isControl: true },
    { name: "Accounts Payable", code: "2100", type: "LIABILITY", isControl: true },
    { name: "Undeposited Funds", code: "1050", type: "ASSET", isControl: true },
    { name: "Sales Tax Payable", code: "2200", type: "LIABILITY", isControl: true }
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
      // Update isControl flag if needed
      if (acc.isControl !== undefined && existing.isControl !== acc.isControl) {
         console.log(`Updating ${acc.name} control flag to ${acc.isControl}`);
         await prisma.chartOfAccount.update({
             where: { id: existing.id },
             data: { isControl: acc.isControl, updatedAt: new Date() }
         });
      } else {
         console.log(`Skipping ${acc.name} (Already exists)`);
      }
    } else {
      console.log(`Creating ${acc.name}...`);
      await prisma.chartOfAccount.create({
        data: {
          name: acc.name,
          code: acc.code,
          type: acc.type as AccountType,
          status: "active",
          isControl: acc.isControl || false,
          createdBy: admin.id,
          id: `ACC-${acc.code}`,
          updatedAt: new Date() 
        }
      });
      console.log(`✅ Created ${acc.name}`);
    }


    // Link Cash/Bank Accounts if needed
    if (acc.name === "Cash" || acc.name === "Bank") {
        const linkedAccount = await prisma.chartOfAccount.findUnique({ where: { code: acc.code } });
        if (linkedAccount) {
            const existingLink = await prisma.cashBankAccount.findUnique({ where: { chartOfAccountId: linkedAccount.id } });
            if (!existingLink) {
                console.log(`Linking ${acc.name} to CashBankAccount...`);
                await prisma.cashBankAccount.create({
                    data: {
                        id: `CBA-${acc.code}`,
                        type: acc.name === "Cash" ? "CASH" : "BANK",
                        ChartOfAccount: { connect: { id: linkedAccount.id } },
                        User: { connect: { id: admin.id } },
                        updatedAt: new Date()
                    }
                });
            }
        }
    }
  }
}

seedMissingAccounts()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
