import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== VOUCHER VCH-2026-2250 DETAILED BREAKDOWN ===');
  
  const vch = await prisma.voucher.findFirst({
    where: { voucherNumber: 'VCH-2026-2250' },
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
      },
      User_Voucher_createdByToUser: true,
      User_Voucher_postedByIdToUser: true,
      warehouse: true,
    }
  });

  console.log(JSON.stringify(vch, null, 2));

  console.log('\n=== ACCOUNT cmr99epwx0031nj01696dk54y DETAILED BREAKDOWN ===');
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: 'cmr99epwx0031nj01696dk54y' },
    include: {
      CashBankAccount: true,
      ChartOfAccount: true
    }
  });
  console.log(JSON.stringify(account, null, 2));

  console.log('\n=== ALL JOURNAL ENTRY LINES FOR ACCOUNT cmr99epwx0031nj01696dk54y ===');
  const jeLines = await prisma.journalEntryLine.findMany({
    where: { chartOfAccountId: 'cmr99epwx0031nj01696dk54y' },
    include: {
      JournalEntry: {
        include: { Voucher: true }
      }
    },
    orderBy: [
      { JournalEntry: { date: 'asc' } },
      { lineNumber: 'asc' }
    ]
  });

  console.log(`Total JournalEntryLines for account: ${jeLines.length}`);
  let totalDebit = 0;
  let totalCredit = 0;
  jeLines.forEach(l => {
    totalDebit += Number(l.debitAmount);
    totalCredit += Number(l.creditAmount);
  });
  console.log(`Summary of JournalEntryLines: Total Debit = ${totalDebit}, Total Credit = ${totalCredit}, Net = ${totalDebit - totalCredit}`);

  // Let's also check if VCH-2026-2250 has journal entries or lines
  const vchJeLines = jeLines.filter(l => l.JournalEntry?.Voucher?.voucherNumber === 'VCH-2026-2250');
  console.log('\nJournal Entry Lines for VCH-2026-2250 under account cmr99epwx0031nj01696dk54y:');
  console.log(JSON.stringify(vchJeLines, null, 2));

  // Let's check all VoucherLines for VCH-2026-2250
  const vchLines = await prisma.voucherLine.findMany({
    where: { voucherId: vch?.id },
    include: { ChartOfAccount: true }
  });
  console.log('\nAll Voucher Lines for VCH-2026-2250:');
  console.log(JSON.stringify(vchLines, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
