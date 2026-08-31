import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmr99epwx0031nj01696dk54y';
  
  // Date range filters used by getAccountLedger when dateFrom="2026-08-27" and dateTo="2026-08-29"
  const dateFromStr = "2026-08-27";
  const dateToStr = "2026-08-29";

  const dateFrom = new Date(dateFromStr);
  const dateTo = new Date(dateToStr);
  dateTo.setHours(23, 59, 59, 999);

  console.log('Querying with getAccountLedger logic:');
  console.log('dateFrom parsed:', dateFrom.toISOString());
  console.log('dateTo parsed:', dateTo.toISOString());

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      chartOfAccountId: accountId,
      JournalEntry: {
        date: {
          gte: dateFrom,
          lte: dateTo,
        }
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

  console.log(`Found ${lines.length} lines:`);
  lines.forEach((l, idx) => {
    console.log(`[${idx+1}] JE: ${l.JournalEntry.entryNumber} | VCH: ${l.JournalEntry.Voucher?.voucherNumber} | DB Date: ${l.JournalEntry.date.toISOString()} | Debit: ${l.debitAmount} | Credit: ${l.creditAmount}`);
  });

  console.log('\nNow let us check ALL JournalEntries around VCH-2026-2250 regardless of date filter:');
  const vch2250 = await prisma.voucher.findFirst({
    where: { voucherNumber: 'VCH-2026-2250' },
    include: {
      JournalEntry: {
        include: {
          JournalEntryLine: true
        }
      }
    }
  });

  console.log('VCH-2026-2250 DB record:', JSON.stringify(vch2250, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
