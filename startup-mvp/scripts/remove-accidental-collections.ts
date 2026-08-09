import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function removeAccidentalCollections() {
  const collIds = ["COLL_1786299721670", "COLL_1786300044193"];
  const voucherNumbers = ["VCH-2026-1015", "VCH-2026-1016"];

  console.log("=== REMOVING ACCIDENTAL COLLECTIONS ===");
  console.log("Collection IDs:", collIds);
  console.log("Voucher Numbers:", voucherNumbers);

  // 1. Find Vouchers
  const vouchers = await prisma.voucher.findMany({
    where: {
      OR: [
        { voucherNumber: { in: voucherNumbers } },
        { reference: { in: collIds } },
      ],
    },
  });

  console.log(`Found ${vouchers.length} vouchers to remove.`);

  for (const voucher of vouchers) {
    console.log(`Processing Voucher: ${voucher.voucherNumber} (${voucher.id})`);

    // Delete related JournalEntries and JournalEntryLines
    const jEntries = await prisma.journalEntry.findMany({
      where: { voucherId: voucher.id },
    });

    for (const je of jEntries) {
      await prisma.journalEntryLine.deleteMany({
        where: { journalEntryId: je.id },
      });
      await prisma.journalEntry.delete({
        where: { id: je.id },
      });
      console.log(`Deleted JournalEntry ${je.id}`);
    }

    // Delete VoucherLines and Voucher
    await prisma.voucherLine.deleteMany({
      where: { voucherId: voucher.id },
    });
    await prisma.voucher.delete({
      where: { id: voucher.id },
    });
    console.log(`Deleted Voucher ${voucher.voucherNumber}`);
  }

  // 2. Remove dueCollections from Sale.paymentDetails
  const sales = await prisma.sale.findMany({
    where: { isTrash: false },
  });

  let updatedSalesCount = 0;
  for (const s of sales) {
    const details = s.paymentDetails as any;
    if (details && Array.isArray(details.dueCollections)) {
      const originalLength = details.dueCollections.length;
      const filtered = details.dueCollections.filter(
        (c: any) => !collIds.includes(c.id)
      );

      if (filtered.length !== originalLength) {
        const newDetails = {
          ...details,
          dueCollections: filtered,
        };

        await prisma.sale.update({
          where: { id: s.id },
          data: {
            paymentDetails: newDetails,
          },
        });

        console.log(
          `Updated Sale ${s.saleNumber}: removed ${
            originalLength - filtered.length
          } collection entry/entries.`
        );
        updatedSalesCount++;
      }
    }
  }

  console.log(`Done! Updated ${updatedSalesCount} sale(s).`);
}

removeAccidentalCollections()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
