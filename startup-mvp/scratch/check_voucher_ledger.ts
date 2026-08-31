import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEARCHING FOR VOUCHER VCH-2026-2250 ===');
  
  // 1. Search Voucher table
  const voucher = await prisma.voucher.findFirst({
    where: { voucherNo: 'VCH-2026-2250' },
    include: {
      entries: {
        include: {
          account: true
        }
      },
      creator: true,
      branch: true
    }
  }).catch(e => {
    console.log('Voucher table error:', e.message);
    return null;
  });

  console.log('Voucher record:', JSON.stringify(voucher, null, 2));

  // 2. Also check if there are other tables like AccountTransaction, JournalEntry, Sale, Purchase, etc. referencing this voucher number or id
  if (voucher) {
    const transactions = await prisma.accountTransaction.findMany({
      where: {
        OR: [
          { voucherId: voucher.id },
          { reference: { contains: 'VCH-2026-2250' } }
        ]
      },
      include: {
        account: true
      }
    }).catch(e => console.log('AccountTransaction search error:', e.message));

    console.log('AccountTransactions linked to voucher:', JSON.stringify(transactions, null, 2));
  } else {
    // Search general references
    const trxs = await prisma.accountTransaction.findMany({
      where: {
        reference: { contains: 'VCH-2026-2250' }
      },
      include: { account: true }
    });
    console.log('AccountTransactions by reference:', JSON.stringify(trxs, null, 2));
  }

  console.log('\n=== SEARCHING FOR ACCOUNT cmr99epwx0031nj01696dk54y ===');
  const account = await prisma.account.findUnique({
    where: { id: 'cmr99epwx0031nj01696dk54y' }
  });
  console.log('Account info:', JSON.stringify(account, null, 2));

  if (account) {
    // Get all voucher entries for this account
    const entries = await prisma.voucherEntry.findMany({
      where: { accountId: account.id },
      include: {
        voucher: true
      },
      orderBy: { createdAt: 'asc' }
    });
    console.log(`Voucher entries count for account: ${entries.length}`);
    console.log('Voucher entries sample/all:', JSON.stringify(entries, null, 2));

    // Get all account transactions for this account
    const accTrxs = await prisma.accountTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { date: 'asc' }
    });
    console.log(`AccountTransactions count for account: ${accTrxs.length}`);
    console.log('AccountTransactions sample/all:', JSON.stringify(accTrxs, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
