import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const voucher = await prisma.voucher.findFirst({
    where: { voucherNumber: 'VCH-2026-2250' },
    select: {
      id: true,
      voucherNumber: true,
      date: true,
      createdAt: true,
      updatedAt: true,
      postedAt: true,
    }
  });

  if (!voucher) return;

  console.log('--- DB Timestamps for VCH-2026-2250 ---');
  console.log('voucher.date (UTC):      ', voucher.date.toISOString());
  console.log('voucher.createdAt (UTC): ', voucher.createdAt.toISOString());
  console.log('voucher.postedAt (UTC):  ', voucher.postedAt?.toISOString());

  console.log('\n--- Converted to Bangladesh Time (UTC+6 / Asia/Dhaka) ---');
  console.log('voucher.date (BD):      ', voucher.date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  console.log('voucher.createdAt (BD): ', voucher.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  console.log('voucher.postedAt (BD):  ', voucher.postedAt?.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
}

main().catch(console.error).finally(() => prisma.$disconnect());
