import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const voucherId = "cms51t7jb0001cktwo9w8fjs9";
  const clientId = "cmrx7f32105drlc01rqwta5qg";

  console.log("=== CLIENT DETAILS ===");
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { ChartOfAccount: true }
  });
  console.log(JSON.stringify(client, null, 2));

  console.log("\n=== VOUCHER DETAILS ===");
  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
    include: {
      VoucherLine: {
        include: { ChartOfAccount: true }
      },
      JournalEntry: {
        include: {
          JournalEntryLine: {
            include: { ChartOfAccount: true }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(voucher, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
