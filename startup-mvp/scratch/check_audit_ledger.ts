import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmr99epwx0031nj01696dk54y';
  
  // Check draft or unposted vouchers containing this account
  const unpostedVouchers = await prisma.voucher.findMany({
    where: {
      status: { not: 'posted' },
      VoucherLine: {
        some: { chartOfAccountId: accountId }
      }
    },
    include: { VoucherLine: true }
  });

  console.log(`Unposted/Draft vouchers for account: ${unpostedVouchers.length}`);
  if (unpostedVouchers.length > 0) {
    console.log(JSON.stringify(unpostedVouchers, null, 2));
  }

  // Check recent 10 transactions for account
  const recentJELines = await prisma.journalEntryLine.findMany({
    where: { chartOfAccountId: accountId },
    include: {
      JournalEntry: {
        include: { Voucher: true }
      }
    },
    orderBy: { JournalEntry: { createdAt: 'desc' } },
    take: 10
  });

  console.log('\n--- 10 Most Recent Journal Entries for Cash (Rangpur) ---');
  recentJELines.forEach(l => {
    console.log(`JE: ${l.JournalEntry.entryNumber} | VCH: ${l.JournalEntry.Voucher?.voucherNumber} | Date: ${l.JournalEntry.date.toISOString().split('T')[0]} | CreatedAt: ${l.JournalEntry.createdAt.toISOString()} | Debit: ${l.debitAmount} | Credit: ${l.creditAmount} | Desc: ${l.description || l.JournalEntry.description}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
