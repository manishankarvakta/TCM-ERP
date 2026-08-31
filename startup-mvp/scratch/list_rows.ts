import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmr99epwx0031nj01696dk54y';
  const dateFrom = new Date("2026-08-27");
  const dateTo = new Date("2026-08-29");
  dateTo.setHours(23, 59, 59, 999);

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      chartOfAccountId: accountId,
      JournalEntry: {
        date: { gte: dateFrom, lte: dateTo }
      }
    },
    include: {
      JournalEntry: {
        include: { Voucher: true }
      }
    },
    orderBy: [
      { JournalEntry: { date: 'desc' } },
      { JournalEntry: { entryNumber: 'desc' } }
    ]
  });

  console.log(`Total rows returned for date range: ${lines.length}`);
  lines.forEach((l, i) => {
    console.log(`Row #${i + 1}: Entry: ${l.JournalEntry.entryNumber} | Voucher: ${l.JournalEntry.Voucher?.voucherNumber} | Amount: +${l.debitAmount}/-${l.creditAmount} | DB Date: ${l.JournalEntry.date.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
