const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const report = {};

  // 1. Fetch VCH-2026-2196 and VCH-2026-2197
  const vouchers = await prisma.voucher.findMany({
    where: {
      voucherNumber: {
        in: ['VCH-2026-2196', 'VCH-2026-2197']
      }
    },
    include: {
      VoucherLine: {
        include: {
          ChartOfAccount: true,
          Client: true,
          Supplier: true,
          User: true,
        }
      },
      Client: true,
      Supplier: true,
      User_Voucher_createdByToUser: {
        select: { id: true, name: true, email: true }
      },
      User_Voucher_postedByIdToUser: {
        select: { id: true, name: true, email: true }
      },
      JournalEntry: {
        include: {
          JournalEntryLine: {
            include: {
              ChartOfAccount: true,
              Client: true,
              Supplier: true
            }
          }
        }
      },
      sales: {
        include: {
          items: {
            include: {
              item: true,
              variant: true
            }
          },
          client: true,
        }
      },
      purchases: true,
    }
  });

  report.vouchers = vouchers;

  // 2. Fetch SAL-2026-0788
  const sales = await prisma.sale.findMany({
    where: {
      saleNumber: 'SAL-2026-0788'
    },
    include: {
      items: {
        include: {
          item: true,
          variant: true
        }
      },
      client: true,
      createdByUser: {
        select: { id: true, name: true, email: true }
      },
      updatedByUser: {
        select: { id: true, name: true, email: true }
      },
      voucher: {
        include: {
          VoucherLine: {
            include: {
              ChartOfAccount: true
            }
          },
          JournalEntry: {
            include: {
              JournalEntryLine: {
                include: {
                  ChartOfAccount: true
                }
              }
            }
          }
        }
      },
      warehouse: true,
      salesAssistant: true
    }
  });

  report.sales = sales;

  const sale = sales[0];
  const saleId = sale?.id;
  const clientId = sale?.clientId;
  const voucherId = sale?.voucherId;
  const voucherIds = vouchers.map(v => v.id);

  // 3. Stock Ledgers
  const stockLedgers = await prisma.stockLedger.findMany({
    where: {
      OR: [
        { referenceId: 'SAL-2026-0788' },
        { referenceId: 'VCH-2026-2196' },
        { referenceId: 'VCH-2026-2197' },
        ...(saleId ? [{ referenceId: saleId }] : []),
        ...(voucherIds.length ? [{ referenceId: { in: voucherIds } }] : [])
      ]
    },
    include: {
      item: true,
      variant: true,
      warehouse: true
    }
  });

  report.stockLedgers = stockLedgers;

  // 4. All Vouchers referencing this client or sale
  const relatedVouchers = await prisma.voucher.findMany({
    where: {
      OR: [
        { reference: 'SAL-2026-0788' },
        { description: { contains: 'SAL-2026-0788' } },
        { voucherNumber: { in: ['VCH-2026-2196', 'VCH-2026-2197'] } },
        ...(voucherId ? [{ id: voucherId }] : []),
        ...(clientId ? [{ clientId }] : [])
      ]
    },
    include: {
      VoucherLine: {
        include: { ChartOfAccount: true, Client: true }
      },
      User_Voucher_createdByToUser: {
        select: { id: true, name: true, email: true }
      },
      JournalEntry: {
        include: {
          JournalEntryLine: {
            include: { ChartOfAccount: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  report.relatedVouchers = relatedVouchers;

  // 5. Client ledger / client details
  if (clientId) {
    report.client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    report.clientSales = await prisma.sale.findMany({
      where: { clientId },
      include: {
        voucher: {
          include: {
            VoucherLine: {
              include: { ChartOfAccount: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  fs.writeFileSync('scratch/output.json', JSON.stringify(report, null, 2));
  console.log("Analysis complete. Output written to scratch/output.json");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
