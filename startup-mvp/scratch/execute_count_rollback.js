const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function executeRollback() {
  console.log('========================================================================');
  console.log('STARTING OPTION A: PRE-BACKUP & ATOMIC ROLLBACK OF POST-20 COUNT RECONCILIATIONS');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // STEP 1: FETCH TARGET DATA & CREATE BACKUP SNAPSHOT
    // -------------------------------------------------------------------------
    console.log('[STEP 1] Fetching all target data for pre-rollback snapshot...');

    const targetAdjustments = await prisma.inventoryAdjustment.findMany({
      where: {
        adjustmentNumber: { startsWith: 'ADJ-CNT-' },
        createdAt: { gte: new Date('2026-09-21T00:00:00.000Z') }
      },
      include: {
        items: { include: { item: true, variant: true } },
        voucher: {
          include: {
            VoucherLine: { include: { ChartOfAccount: true } },
            JournalEntry: { include: { JournalEntryLine: true } }
          }
        },
        warehouse: true,
        createdByUser: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${targetAdjustments.length} target adjustments.`);

    const targetCountEntries = await prisma.inventoryCountEntry.findMany({
      where: {
        createdAt: { gte: new Date('2026-09-21T00:00:00.000Z') }
      },
      include: { item: true, warehouse: true, creator: true }
    });

    console.log(`Found ${targetCountEntries.length} post-20 count entries.`);

    // Collect affected item IDs
    const affectedItemIds = new Set();
    targetAdjustments.forEach(adj => {
      adj.items.forEach(it => {
        if (it.itemId) affectedItemIds.add(it.itemId);
      });
    });

    const currentStocks = await prisma.stock.findMany({
      where: {
        itemId: { in: Array.from(affectedItemIds) }
      }
    });

    const backupData = {
      timestamp: new Date().toISOString(),
      targetAdjustmentCount: targetAdjustments.length,
      targetCountEntriesCount: targetCountEntries.length,
      affectedItemsCount: affectedItemIds.size,
      adjustments: targetAdjustments,
      countEntries: targetCountEntries,
      preRollbackStocks: currentStocks
    };

    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFilePath = path.join(
      backupDir,
      `pre_count_rollback_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✅ Snapshot saved safely to: ${backupFilePath} (${(fs.statSync(backupFilePath).size / 1024).toFixed(1)} KB)\n`);

    // -------------------------------------------------------------------------
    // STEP 2: EXECUTE ATOMIC TRANSACTION ROLLBACK
    // -------------------------------------------------------------------------
    console.log('[STEP 2] Executing atomic database transaction...');

    const systemUser = await prisma.user.findFirst({
      where: { role: { in: ['admin', 'superadmin'] } }
    });
    const systemUserId = systemUser?.id || targetAdjustments[0].createdBy;

    const rollbackResult = await prisma.$transaction(async (tx) => {
      let totalStockReversed = 0;
      let totalLedgerEntriesCreated = 0;
      let totalVouchersReversed = 0;

      for (const adj of targetAdjustments) {
        console.log(`  Processing ${adj.adjustmentNumber} (${adj.items.length} items)...`);

        for (const it of adj.items) {
          const adjQty = Number(it.quantity); // e.g. +5 or -2
          const reverseQty = -adjQty; // e.g. -5 or +2

          // 1. Update Stock Table
          if (it.variantId) {
            const stockRecord = await tx.stock.findUnique({
              where: {
                variantId_warehouseId: {
                  variantId: it.variantId,
                  warehouseId: adj.warehouseId
                }
              }
            });
            if (stockRecord) {
              const newQty = Number(stockRecord.quantity) + reverseQty;
              await tx.stock.update({
                where: { id: stockRecord.id },
                data: {
                  quantity: newQty,
                  lastUpdated: new Date()
                }
              });
            }
          } else if (it.itemId) {
            const stockRecord = await tx.stock.findUnique({
              where: {
                itemId_warehouseId: {
                  itemId: it.itemId,
                  warehouseId: adj.warehouseId
                }
              }
            });
            if (stockRecord) {
              const newQty = Number(stockRecord.quantity) + reverseQty;
              await tx.stock.update({
                where: { id: stockRecord.id },
                data: {
                  quantity: newQty,
                  lastUpdated: new Date()
                }
              });
            }
          }

          // 2. Add counter-balancing StockLedger entry
          await tx.stockLedger.create({
            data: {
              itemId: it.itemId,
              variantId: it.variantId || null,
              warehouseId: adj.warehouseId,
              transactionType: 'ADJUSTMENT',
              quantity: reverseQty,
              rate: it.unitRate,
              referenceType: 'INVENTORY_ADJUSTMENT_REVERSAL',
              referenceId: adj.id,
              notes: `System Reversal of accidental count reconcile [${adj.adjustmentNumber}]`,
              createdBy: systemUserId
            }
          });

          totalStockReversed += reverseQty;
          totalLedgerEntriesCreated++;
        }

        // 3. Reverse Voucher & Journal Entry
        if (adj.voucher) {
          // Update Voucher Status to cancelled and note
          await tx.voucher.update({
            where: { id: adj.voucher.id },
            data: {
              status: 'cancelled',
              description: `[CANCELLED - REVERSED] ${adj.voucher.description || ''} (Reversed accidental count reconcile ${adj.adjustmentNumber})`
            }
          });

          // Zero-out or reverse VoucherLine amounts so Trial Balance excludes them
          await tx.voucherLine.updateMany({
            where: { voucherId: adj.voucher.id },
            data: {
              debitAmount: 0,
              creditAmount: 0,
              description: `[REVERSED] Line from ${adj.adjustmentNumber}`
            }
          });

          // Zero-out Journal Entry and Lines
          const journal = await tx.journalEntry.findFirst({
            where: { voucherId: adj.voucher.id }
          });
          if (journal) {
            await tx.journalEntry.update({
              where: { id: journal.id },
              data: {
                status: 'cancelled',
                description: `[CANCELLED - REVERSED] ${journal.description || ''}`
              }
            });
            await tx.journalEntryLine.updateMany({
              where: { journalEntryId: journal.id },
              data: {
                debitAmount: 0,
                creditAmount: 0,
                description: `[REVERSED] Journal line from ${adj.adjustmentNumber}`
              }
            });
          }

          totalVouchersReversed++;
        }

        // 4. Mark Adjustment Status as CANCELLED
        await tx.inventoryAdjustment.update({
          where: { id: adj.id },
          data: {
            status: 'CANCELLED',
            notes: `[REVERSED] ${adj.notes || ''} - Rolled back on ${new Date().toISOString()}`
          }
        });
      }

      // 5. Update 224 Count Entries to ARCHIVED
      const countUpdate = await tx.inventoryCountEntry.updateMany({
        where: {
          createdAt: { gte: new Date('2026-09-21T00:00:00.000Z') }
        },
        data: {
          status: 'ARCHIVED'
        }
      });

      return {
        adjustmentsReversed: targetAdjustments.length,
        ledgerEntriesCreated: totalLedgerEntriesCreated,
        vouchersReversed: totalVouchersReversed,
        countEntriesArchived: countUpdate.count,
        netStockQuantityRestored: totalStockReversed
      };
    }, {
      timeout: 60000 // 60s transaction timeout
    });

    console.log('\n========================================================================');
    console.log('ROLLBACK TRANSACTION COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.table(rollbackResult);

  } catch (err) {
    console.error('❌ Rollback failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

executeRollback();
