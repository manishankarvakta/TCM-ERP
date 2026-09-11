import { prisma } from "../lib/prisma";
import { CashBankAccountType } from "@prisma/client";

async function testCreate() {
  const user = await prisma.user.findFirst({ where: { status: "active" } });
  if (!user) {
    console.error("No active user found");
    return;
  }

  console.log("Found user:", user.id, user.name);

  // Test creating a cash account
  const testCode = `1010-TEST-${Date.now()}`;
  const newCoa = await prisma.chartOfAccount.create({
    data: {
      code: testCode,
      name: "Test Cash Account",
      type: "ASSET",
      status: "active",
      createdBy: user.id,
    },
  });

  console.log("Created test COA:", newCoa.id, newCoa.code);

  const newCashBank = await prisma.cashBankAccount.create({
    data: {
      chartOfAccountId: newCoa.id,
      type: CashBankAccountType.CASH,
      status: "active",
      createdBy: user.id,
    },
  });

  console.log("Created CashBankAccount successfully:", newCashBank.id);

  // Cleanup test data
  await prisma.cashBankAccount.delete({ where: { id: newCashBank.id } });
  await prisma.chartOfAccount.delete({ where: { id: newCoa.id } });
  console.log("Test cleanup completed successfully!");
}

testCreate().catch(console.error);
