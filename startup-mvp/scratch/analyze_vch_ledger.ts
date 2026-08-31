import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('1. VOUCHER ANALYSIS: VCH-2026-2250');
  console.log('====================================================');

  const voucher = await prisma.voucher.findFirst({
    where: { voucherNumber: 'VCH-2026-2250' },
    include: {
      VoucherLine: {
        include: {
          ChartOfAccount: true,
          Client: true,
          Supplier: true,
          User: true,
          Organization: true,
        }
      },
      JournalEntry: {
        include: {
          JournalEntryLine: {
            include: {
              ChartOfAccount: true,
              Client: true,
              Supplier: true,
              User: true,
              Organization: true,
            }
          }
        }
      },
      User_Voucher_createdByToUser: {
        select: { id: true, name: true, email: true }
      },
      User_Voucher_postedByIdToUser: {
        select: { id: true, name: true, email: true }
      },
      Client: true,
      Supplier: true,
      User_Voucher_userIdToUser: true,
      Organization: true,
      warehouse: true,
      sales: true,
      purchases: true,
      inventoryAdjustment: true,
      inventoryDamage: true,
      payrollPayment: true,
      payrollAccrual: true,
      productionOrders: true,
      returnToVendors: true,
      grns: true,
    }
  });

  if (!voucher) {
    console.log('❌ Voucher VCH-2026-2250 NOT FOUND by exact voucherNumber.');
    // Try searching by contains or reference
    const partialVouchers = await prisma.voucher.findMany({
      where: {
        OR: [
          { voucherNumber: { contains: '2250' } },
          { reference: { contains: '2250' } },
          { description: { contains: '2250' } }
        ]
      },
      select: { id: true, voucherNumber: true, type: true, date: true, status: true, reference: true, description: true }
    });
    console.log('Partial search matches for "2250":', JSON.stringify(partialVouchers, null, 2));
  } else {
    console.log('✅ Voucher Found:');
    console.log(JSON.stringify({
      id: voucher.id,
      voucherNumber: voucher.voucherNumber,
      date: voucher.date,
      type: voucher.type,
      reference: voucher.reference,
      description: voucher.description,
      status: voucher.status,
      isLocked: voucher.isLocked,
      createdBy: voucher.User_Voucher_createdByToUser,
      postedBy: voucher.User_Voucher_postedByIdToUser,
      postedAt: voucher.postedAt,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
      client: voucher.Client,
      supplier: voucher.Supplier,
      user: voucher.User_Voucher_userIdToUser,
      warehouse: voucher.warehouse,
      salesCount: voucher.sales.length,
      purchasesCount: voucher.purchases.length,
    }, null, 2));

    console.log('\n--- Voucher Lines ---');
    voucher.VoucherLine.forEach((line, i) => {
      console.log(`Line ${i + 1}: Account [${line.ChartOfAccount.code}] ${line.ChartOfAccount.name} (${line.ChartOfAccount.type}) | Debit: ${line.debitAmount} | Credit: ${line.creditAmount} | Desc: ${line.description || 'N/A'}`);
      if (line.clientId) console.log(`   Client: ${line.Client?.name}`);
      if (line.supplierId) console.log(`   Supplier: ${line.Supplier?.name}`);
    });

    console.log('\n--- Linked Journal Entries ---');
    voucher.JournalEntry.forEach((je, i) => {
      console.log(`JE ${i + 1}: Entry# ${je.entryNumber} | Date: ${je.date} | Status: ${je.status}`);
      je.JournalEntryLine.forEach((jel, j) => {
        console.log(`   JELine ${j + 1}: Account [${jel.ChartOfAccount.code}] ${jel.ChartOfAccount.name} | Debit: ${jel.debitAmount} | Credit: ${jel.creditAmount} | Desc: ${jel.description || 'N/A'}`);
      });
    });
  }

  console.log('\n====================================================');
  console.log('2. ACCOUNT ANALYSIS: cmr99epwx0031nj01696dk54y');
  console.log('====================================================');

  const accountId = 'cmr99epwx0031nj01696dk54y';
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: accountId },
    include: {
      ChartOfAccount: true, // Parent
      User: { select: { id: true, name: true, email: true } },
      CashBankAccount: true,
      Client: true,
      Supplier: true,
    }
  });

  if (!account) {
    console.log(`❌ Account ${accountId} NOT FOUND.`);
  } else {
    console.log('✅ Account Info:');
    console.log(JSON.stringify({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId,
      parentName: account.ChartOfAccount?.name,
      description: account.description,
      status: account.status,
      isControl: account.isControl,
      createdAt: account.createdAt,
      CashBankAccount: account.CashBankAccount,
      Client: account.Client,
      Supplier: account.Supplier,
    }, null, 2));

    // Ledger query via JournalEntryLine up to 2026-08-28 23:59:59
    const dateToFilter = new Date('2026-08-28T23:59:59.999Z');

    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: accountId,
        JournalEntry: {
          date: { lte: dateToFilter }
        }
      },
      include: {
        JournalEntry: {
          include: {
            Voucher: true
          }
        },
        Client: true,
        Supplier: true,
        User: true,
      },
      orderBy: [
        { JournalEntry: { date: 'asc' } },
        { lineNumber: 'asc' }
      ]
    });

    console.log(`\n--- Journal Entry Lines up to 2026-08-28 (Total: ${journalLines.length}) ---`);
    let cumulativeDebit = 0;
    let cumulativeCredit = 0;

    journalLines.forEach((line, idx) => {
      const debit = Number(line.debitAmount);
      const credit = Number(line.creditAmount);
      cumulativeDebit += debit;
      cumulativeCredit += credit;
      const runningBalance = cumulativeDebit - cumulativeCredit;

      console.log(`[${idx + 1}] Date: ${line.JournalEntry.date.toISOString().split('T')[0]} | JE: ${line.JournalEntry.entryNumber} | VCH: ${line.JournalEntry.Voucher?.voucherNumber || 'N/A'} | Debit: ${debit} | Credit: ${credit} | Running Bal: ${runningBalance} | Desc: ${line.description || line.JournalEntry.description || 'N/A'}`);
    });

    console.log(`\n=== SUMMARY FOR ACCOUNT [${account.code}] ${account.name} UP TO 2026-08-28 ===`);
    console.log(`Total Debit : ৳ ${cumulativeDebit.toLocaleString()}`);
    console.log(`Total Credit: ৳ ${cumulativeCredit.toLocaleString()}`);
    console.log(`Net Balance : ৳ ${(cumulativeDebit - cumulativeCredit).toLocaleString()} (${account.type} account)`);

    // Check directly in VoucherLine table as well to see if there are voucher lines not converted to JournalEntryLine
    const voucherLines = await prisma.voucherLine.findMany({
      where: {
        chartOfAccountId: accountId,
        Voucher: {
          date: { lte: dateToFilter }
        }
      },
      include: {
        Voucher: true
      },
      orderBy: { Voucher: { date: 'asc' } }
    });

    console.log(`\n--- Direct Voucher Lines for Account up to 2026-08-28 (Total: ${voucherLines.length}) ---`);
    let vchDebit = 0;
    let vchCredit = 0;
    voucherLines.forEach((vl, idx) => {
      const debit = Number(vl.debitAmount);
      const credit = Number(vl.creditAmount);
      vchDebit += debit;
      vchCredit += credit;
      console.log(`[${idx + 1}] VCH: ${vl.Voucher.voucherNumber} | Date: ${vl.Voucher.date.toISOString().split('T')[0]} | Type: ${vl.Voucher.type} | Status: ${vl.Voucher.status} | Debit: ${debit} | Credit: ${credit} | Desc: ${vl.description || vl.Voucher.description || 'N/A'}`);
    });
    console.log(`Direct VoucherLines Total - Debit: ৳ ${vchDebit.toLocaleString()}, Credit: ৳ ${vchCredit.toLocaleString()}, Net: ৳ ${(vchDebit - vchCredit).toLocaleString()}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
