"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { InventoryAdjustmentStatus, StockTransactionType, VoucherType } from "@prisma/client";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { getAccountingOperationSettings } from "@/lib/accounting-settings";

// --- Types ---

export interface AdjustmentItemInput {
  itemId: string;
  variantId?: string | null;
  quantity: number; // Positive for Gain, Negative for Loss (user enters absolute, logic handles sign based on toggle?) 
                    // Let's assume input is signed: +5 or -5.
  unitRate: number; // Cost Price
}

export interface CreateAdjustmentInput {
  warehouseId: string;
  date: Date;
  notes?: string;
  items: AdjustmentItemInput[];
}

// --- Actions ---

export async function getAdjustments(
  page: number = 1,
  limit: number = 10,
  filters: {
    warehouseId?: string;
    search?: string;
    status?: InventoryAdjustmentStatus;
    startDate?: string;
    endDate?: string;
  } = {}
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canView = await hasPermission(session.user.id, "inventory.adjustments", "view");
    if (!canView) return { success: false, error: "Permission denied" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const where: any = {};
    if (filters.warehouseId && filters.warehouseId !== "all") {
      where.warehouseId = filters.warehouseId;
    } else if (isNormalUser && user?.defaultWarehouseId) {
      where.warehouseId = user.defaultWarehouseId;
    }
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.date = {
        ...(filters.startDate ? { gte: new Date(new Date(filters.startDate).setHours(0, 0, 0, 0)) } : {}),
        ...(filters.endDate ? { lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)) } : {}),
      };
    }
    if (filters.search) {
      where.OR = [
        { adjustmentNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [adjustments, total] = await Promise.all([
      prisma.inventoryAdjustment.findMany({
        where,
        include: {
          warehouse: { select: { name: true } },
          createdByUser: { select: { name: true } },
          _count: { select: { items: true } },
          items: { select: { amount: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryAdjustment.count({ where }),
    ]);

    const formattedAdjustments = adjustments.map(adj => {
      const grandTotal = adj.items.reduce((sum, item) => sum + Number(item.amount), 0);
      const serialized = serialize(adj);
      return {
        ...serialized,
        grandTotal,
      };
    });

    return {
      success: true,
      adjustments: formattedAdjustments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getAdjustments error:", error);
    return { success: false, error: "Failed to fetch adjustments" };
  }
}

export async function getAdjustment(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canView = await hasPermission(session.user.id, "inventory.adjustments", "view");
    if (!canView) return { success: false, error: "Permission denied" };

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: {
        warehouse: true,
        items: {
          include: {
            item: {
              select: { code: true, name: true, unit: { select: { symbol: true } }, itemType: true }
            },
            variant: {
              select: { sku: true, size: true, color: true }
            }
          }
        },
        createdByUser: { select: { name: true } },
        voucher: { select: { voucherNumber: true } }
      }
    });

    if (!adjustment) return { success: false, error: "Adjustment not found" };

    return { success: true, adjustment: serialize(adjustment) };
  } catch (error) {
    console.error("getAdjustment error:", error);
    return { success: false, error: "Failed to fetch adjustment" };
  }
}

// Helper to serialize separate decimal types for client components
function serialize(obj: any): any {
  if (obj === null || obj === undefined) {
      return obj;
  }
  
  if (obj instanceof Date) {
      return obj.toISOString();
  }

  if (typeof obj === 'object') {
      if (obj.toString().includes('Decimal')) { // Rudimentary check for Decimal-like objects
          return Number(obj);
      }
      // Check for Decimal.js or Prisma Decimal
      if (typeof obj.toNumber === 'function') {
          return obj.toNumber();
      }
      
      if (Array.isArray(obj)) {
          return obj.map(serialize);
      }
      
      const newObj: any = {};
      for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
              newObj[key] = serialize(obj[key]);
          }
      }
      return newObj;
  }
  return obj;
}

export async function createAdjustment(input: CreateAdjustmentInput) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canCreate = await hasPermission(session.user.id, "inventory.adjustments", "create");
    if (!canCreate) return { success: false, error: "Permission denied" };

    // Generate Number
    const count = await prisma.inventoryAdjustment.count();
    const adjustmentNumber = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        adjustmentNumber,
        warehouseId: input.warehouseId,
        date: input.date,
        notes: input.notes,
        status: InventoryAdjustmentStatus.DRAFT,
        createdBy: session.user.id,
        items: {
          create: input.items.map(item => ({
            itemId: item.itemId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitRate: item.unitRate,
            amount: Math.abs(item.quantity * item.unitRate),
          }))
        }
      }
    });

    await logItemCreated(session.user.id, "InventoryAdjustment", adjustment.id, `Created draft adjustment ${adjustmentNumber}`);
    revalidateBothPaths("/dashboard/inventory/adjustments");

    return { success: true, adjustmentId: adjustment.id };
  } catch (error) {
    console.error("createAdjustment error:", error);
    return { success: false, error: "Failed to create adjustment" };
  }
}

export async function approveAdjustment(id: string) {
  const startTime = Date.now();
  console.log(`\n================== [APPROVE ADJUSTMENT START] ==================`);
  console.log(`[ApproveAdjustment] Starting approval for Adjustment ID: ${id} at ${new Date().toISOString()}`);

  try {
    const session = await auth();
    if (!session?.user) {
      console.warn(`[ApproveAdjustment] FAILED: Unauthorized user`);
      return { success: false, error: "Unauthorized" };
    }
    console.log(`[ApproveAdjustment] User authenticated: ${session.user.id} (${session.user.name || "Unknown"})`);

    const canApprove = await hasPermission(session.user.id, "inventory.adjustments", "approve");
    if (!canApprove) {
      console.warn(`[ApproveAdjustment] FAILED: Permission denied for user ${session.user.id}`);
      return { success: false, error: "Permission denied" };
    }
    console.log(`[ApproveAdjustment] Permission granted for user ${session.user.id}`);

    const tFetchStart = Date.now();
    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: { items: { include: { item: true } }, warehouse: true }
    });
    console.log(`[ApproveAdjustment] Fetched adjustment in ${Date.now() - tFetchStart}ms. Adjustment Number: ${adjustment?.adjustmentNumber}, Items count: ${adjustment?.items.length}, Status: ${adjustment?.status}, Warehouse: ${adjustment?.warehouse?.name}`);

    if (!adjustment) {
      console.warn(`[ApproveAdjustment] FAILED: Adjustment not found for ID ${id}`);
      return { success: false, error: "Adjustment not found" };
    }
    if (adjustment.status !== "DRAFT") {
      console.warn(`[ApproveAdjustment] FAILED: Adjustment status is ${adjustment.status} (expected DRAFT)`);
      return { success: false, error: "Adjustment is not in draft status" };
    }

    // Get Accounting Settings
    const tSettingsStart = Date.now();
    const settings = await getAccountingOperationSettings();
    console.log(`[ApproveAdjustment] Fetched accounting settings in ${Date.now() - tSettingsStart}ms`);
    const { 
      positiveFgInventoryId, positiveRmInventoryId, positiveAdjustmentGainId,
      negativeFgInventoryId, negativeRmInventoryId, negativeAdjustmentExpenseId 
    } = settings.inventoryAdjustment;

    // Group / consolidate financial amounts by Chart of Account ID
    const accountDebits = new Map<string, { amount: number; description: string }>();
    const accountCredits = new Map<string, { amount: number; description: string }>();

    // 1. Identify all variant and item IDs
    const variantIds = adjustment.items.map((i) => i.variantId).filter(Boolean) as string[];
    const itemIds = adjustment.items.filter((i) => !i.variantId).map((i) => i.itemId);
    console.log(`[ApproveAdjustment] Items breakdown: ${variantIds.length} variants, ${itemIds.length} standalone items`);

    // 2. Perform Stock updates, Ledger entries, and status update inside transaction with extended timeout
    const tTxStart = Date.now();
    console.log(`[ApproveAdjustment] Starting Prisma transaction (timeout: 90000ms)...`);
    
    await prisma.$transaction(async (tx) => {
      // Bulk fetch current stocks for target warehouse in 1 single query
      const tStockFetchStart = Date.now();
      const existingStocks = await tx.stock.findMany({
        where: {
          warehouseId: adjustment.warehouseId,
          OR: [
            ...(variantIds.length > 0 ? [{ variantId: { in: variantIds } }] : []),
            ...(itemIds.length > 0 ? [{ itemId: { in: itemIds } }] : []),
          ],
        },
      });
      console.log(`[ApproveAdjustment][Tx] Fetched ${existingStocks.length} existing stocks in ${Date.now() - tStockFetchStart}ms`);

      // Map stocks for O(1) instant access
      const stockMap = new Map<string, (typeof existingStocks)[0]>();
      for (const s of existingStocks) {
        const key = s.variantId ? `variant:${s.variantId}` : `item:${s.itemId}`;
        stockMap.set(key, s);
      }

      const stocksToCreate: Array<{
        itemId: string | null;
        variantId: string | null;
        warehouseId: string;
        quantity: number;
      }> = [];

      const stocksToUpdate: Array<{
        id: string;
        newQty: number;
      }> = [];

      const stockLedgerRows: Array<{
        itemId: string | null;
        variantId: string | null;
        warehouseId: string;
        transactionType: StockTransactionType;
        quantity: any;
        referenceType: string;
        referenceId: string;
        notes: string;
        createdBy: string;
        rate: any;
      }> = [];

      for (const item of adjustment.items) {
        const key = item.variantId ? `variant:${item.variantId}` : `item:${item.itemId}`;
        const existingStock = stockMap.get(key);
        const itemQty = Number(item.quantity);
        const newQty = existingStock ? Number(existingStock.quantity) + itemQty : itemQty;

        if (existingStock) {
          stocksToUpdate.push({
            id: existingStock.id,
            newQty,
          });
          // Update local map in case duplicates exist in items
          existingStock.quantity = newQty as any;
        } else {
          stocksToCreate.push({
            itemId: item.variantId ? null : item.itemId,
            variantId: item.variantId || null,
            warehouseId: adjustment.warehouseId,
            quantity: newQty,
          });
          // Track in map for any duplicate lines
          stockMap.set(key, {
            id: `temp-${key}`,
            itemId: item.variantId ? null : item.itemId,
            variantId: item.variantId || null,
            warehouseId: adjustment.warehouseId,
            quantity: newQty as any,
          } as any);
        }

        // Prepare Stock Ledger Row
        stockLedgerRows.push({
          itemId: item.variantId ? null : item.itemId,
          variantId: item.variantId || null,
          warehouseId: adjustment.warehouseId,
          transactionType: StockTransactionType.ADJUSTMENT,
          quantity: item.quantity,
          referenceType: "ADJUSTMENT",
          referenceId: adjustment.id,
          notes: adjustment.notes || "Inventory Adjustment",
          createdBy: session.user.id,
          rate: item.unitRate,
        });

        // 3. Consolidate Financial Amounts by Account
        const amount = Number(item.amount);
        if (amount > 0) {
          const isGain = itemQty > 0;
          const isRawMaterial = item.item.itemType === "RAW_MATERIAL";

          let inventoryAcctId = "";
          let adjustmentAcctId = "";

          if (isGain) {
            inventoryAcctId = isRawMaterial ? positiveRmInventoryId : positiveFgInventoryId;
            adjustmentAcctId = positiveAdjustmentGainId;
            if (inventoryAcctId && adjustmentAcctId) {
              const curDr = accountDebits.get(inventoryAcctId)?.amount || 0;
              accountDebits.set(inventoryAcctId, {
                amount: curDr + amount,
                description: `Stock Gain: ${adjustment.warehouse.name} (${adjustment.adjustmentNumber})`,
              });

              const curCr = accountCredits.get(adjustmentAcctId)?.amount || 0;
              accountCredits.set(adjustmentAcctId, {
                amount: curCr + amount,
                description: `Adjustment Gain (${adjustment.adjustmentNumber})`,
              });
            }
          } else {
            inventoryAcctId = isRawMaterial ? negativeRmInventoryId : negativeFgInventoryId;
            adjustmentAcctId = negativeAdjustmentExpenseId;
            if (inventoryAcctId && adjustmentAcctId) {
              const curDr = accountDebits.get(adjustmentAcctId)?.amount || 0;
              accountDebits.set(adjustmentAcctId, {
                amount: curDr + amount,
                description: `Adjustment Loss (${adjustment.adjustmentNumber})`,
              });

              const curCr = accountCredits.get(inventoryAcctId)?.amount || 0;
              accountCredits.set(inventoryAcctId, {
                amount: curCr + amount,
                description: `Stock Loss: ${adjustment.warehouse.name} (${adjustment.adjustmentNumber})`,
              });
            }
          }
        }
      }

      console.log(`[ApproveAdjustment][Tx] Plan: ${stocksToCreate.length} stocks to create, ${stocksToUpdate.length} stocks to update, ${stockLedgerRows.length} ledger rows to create`);

      // Execute Bulk Inserts for New Stocks
      if (stocksToCreate.length > 0) {
        const tCreateStockStart = Date.now();
        await tx.stock.createMany({
          data: stocksToCreate,
        });
        console.log(`[ApproveAdjustment][Tx] Created ${stocksToCreate.length} new stock rows in ${Date.now() - tCreateStockStart}ms`);
      }

      // Execute Batch Updates for Existing Stocks in parallel chunks of 50
      if (stocksToUpdate.length > 0) {
        const tUpdateStockStart = Date.now();
        const CHUNK_SIZE = 50;
        const totalChunks = Math.ceil(stocksToUpdate.length / CHUNK_SIZE);
        console.log(`[ApproveAdjustment][Tx] Updating ${stocksToUpdate.length} stock rows in ${totalChunks} chunks of ${CHUNK_SIZE}...`);
        
        for (let i = 0; i < stocksToUpdate.length; i += CHUNK_SIZE) {
          const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
          const chunk = stocksToUpdate.slice(i, i + CHUNK_SIZE);
          const tChunkStart = Date.now();
          await Promise.all(
            chunk.map((u) =>
              tx.stock.update({
                where: { id: u.id },
                data: { quantity: u.newQty, lastUpdated: new Date() },
              })
            )
          );
          console.log(`[ApproveAdjustment][Tx] Finished chunk ${chunkIndex}/${totalChunks} (${chunk.length} rows) in ${Date.now() - tChunkStart}ms`);
        }
        console.log(`[ApproveAdjustment][Tx] All ${stocksToUpdate.length} stock updates completed in ${Date.now() - tUpdateStockStart}ms`);
      }

      // Execute 1 Bulk Insert for all Stock Ledgers
      if (stockLedgerRows.length > 0) {
        const tLedgerStart = Date.now();
        await tx.stockLedger.createMany({
          data: stockLedgerRows,
        });
        console.log(`[ApproveAdjustment][Tx] Inserted ${stockLedgerRows.length} ledger rows in ${Date.now() - tLedgerStart}ms`);
      }

      // Update Adjustment Status
      const tStatusStart = Date.now();
      await tx.inventoryAdjustment.update({
        where: { id },
        data: { status: "COMPLETED", updatedBy: session.user.id },
      });
      console.log(`[ApproveAdjustment][Tx] Updated adjustment status to COMPLETED in ${Date.now() - tStatusStart}ms`);
    }, {
      maxWait: 15000, // 15s connection acquisition budget
      timeout: 90000, // 90s transaction execution budget
    });

    console.log(`[ApproveAdjustment] Database transaction completed successfully in ${Date.now() - tTxStart}ms`);

    // 4. Construct Balanced Consolidated Voucher Lines
    const voucherLines: any[] = [];
    let lineNumber = 1;

    accountDebits.forEach(({ amount, description }, chartOfAccountId) => {
      if (amount > 0) {
        voucherLines.push({
          lineNumber: lineNumber++,
          debitAmount: Number(amount.toFixed(2)),
          creditAmount: 0,
          chartOfAccountId,
          description,
        });
      }
    });

    accountCredits.forEach(({ amount, description }, chartOfAccountId) => {
      if (amount > 0) {
        voucherLines.push({
          lineNumber: lineNumber++,
          debitAmount: 0,
          creditAmount: Number(amount.toFixed(2)),
          chartOfAccountId,
          description,
        });
      }
    });

    console.log(`[ApproveAdjustment] Consolidated voucher lines count: ${voucherLines.length}`);

    if (voucherLines.length > 0) {
      const tVoucherStart = Date.now();
      console.log(`[ApproveAdjustment] Creating accounting voucher...`);
      const voucherResult = await createVoucher({
        date: adjustment.date,
        type: VoucherType.JOURNAL,
        reference: adjustment.adjustmentNumber,
        description: `Inventory Adjustment: ${adjustment.adjustmentNumber}`,
        isSystemAction: true,
        lines: voucherLines,
      });

      console.log(`[ApproveAdjustment] createVoucher result:`, voucherResult);

      if (voucherResult.success && voucherResult.voucher) {
        console.log(`[ApproveAdjustment] Posting voucher ID: ${voucherResult.voucher.id}...`);
        const postResult = await postVoucher(voucherResult.voucher.id, undefined, true);
        console.log(`[ApproveAdjustment] postVoucher result:`, postResult);

        // Link voucher
        await prisma.inventoryAdjustment.update({
          where: { id },
          data: { voucherId: voucherResult.voucher.id },
        });
        console.log(`[ApproveAdjustment] Linked voucher ${voucherResult.voucher.id} to adjustment in ${Date.now() - tVoucherStart}ms`);
      } else {
        console.warn(`[ApproveAdjustment] createVoucher failed or did not return voucher:`, voucherResult);
      }
    } else {
      console.log(`[ApproveAdjustment] No voucher lines to post (total amounts were 0 or missing account IDs)`);
    }

    const tAuditStart = Date.now();
    await logItemUpdated(session.user.id, "InventoryAdjustment", adjustment.id, ["Approved and Posted Adjustment"]);
    revalidateBothPaths("/dashboard/inventory/adjustments");
    console.log(`[ApproveAdjustment] Audit log and revalidate completed in ${Date.now() - tAuditStart}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`[ApproveAdjustment] SUCCESS: Adjustment ${adjustment.adjustmentNumber} approved in ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`================== [APPROVE ADJUSTMENT END] ==================\n`);

    return { success: true };
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`\n[ApproveAdjustment] CRITICAL ERROR after ${totalDuration}ms:`, {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      meta: error?.meta,
      raw: error,
    });
    console.log(`================== [APPROVE ADJUSTMENT FAILED] ==================\n`);
    return { success: false, error: error instanceof Error ? error.message : "Failed to approve adjustment" };
  }
}

export async function deleteAdjustment(id: string) {
   // Only delete if DRAFT
   try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) return { success: false, error: "Not found" };
    if (adjustment.status !== "DRAFT") return { success: false, error: "Cannot delete non-draft adjustment" };
    
    await prisma.inventoryAdjustment.delete({ where: { id } });
    revalidateBothPaths("/dashboard/inventory/adjustments");
    return { success: true };
   } catch (error) {
      return { success: false, error: "Failed to delete" };
   }
}

/**
 * Get all adjustments matching filters for export (no pagination limit)
 */
export async function getAllAdjustmentsForExport(filters: {
  warehouseId?: string;
  search?: string;
  status?: InventoryAdjustmentStatus;
  startDate?: string;
  endDate?: string;
} = {}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", adjustments: [] };

    const canView = await hasPermission(session.user.id, "inventory.adjustments", "view");
    if (!canView) return { success: false, error: "Permission denied", adjustments: [] };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const where: any = {};
    if (filters.warehouseId && filters.warehouseId !== "all") {
      where.warehouseId = filters.warehouseId;
    } else if (isNormalUser && user?.defaultWarehouseId) {
      where.warehouseId = user.defaultWarehouseId;
    }
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.date = {
        ...(filters.startDate ? { gte: new Date(new Date(filters.startDate).setHours(0, 0, 0, 0)) } : {}),
        ...(filters.endDate ? { lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)) } : {}),
      };
    }
    if (filters.search) {
      where.OR = [
        { adjustmentNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where,
      include: {
        warehouse: { select: { name: true, code: true } },
        createdByUser: { select: { name: true } },
        items: {
          include: {
            item: { select: { name: true, code: true, unit: { select: { symbol: true } } } },
            variant: { select: { sku: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const serializedAdjustments = adjustments.map((adj) => {
      let inQty = 0;
      let outQty = 0;
      let inValue = 0;
      let outValue = 0;

      for (const it of adj.items) {
        const qty = Number(it.quantity || 0);
        const rate = Number(it.unitRate || 0);
        const itemVal = it.amount !== undefined && it.amount !== null ? Math.abs(Number(it.amount)) : Math.abs(qty * rate);

        if (qty > 0) {
          inQty += qty;
          inValue += itemVal;
        } else if (qty < 0) {
          outQty += Math.abs(qty);
          outValue += itemVal;
        }
      }

      const netDiffValue = inValue - outValue;

      return {
        ...adj,
        inQty,
        outQty,
        inValue,
        outValue,
        netDiffValue,
        totalAmount: netDiffValue,
        items: adj.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity || 0),
          unitRate: Number(it.unitRate || 0),
          amount: Number(it.amount || 0),
        })),
      };
    });

    return { success: true, adjustments: serializedAdjustments };
  } catch (error) {
    console.error("getAllAdjustmentsForExport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch adjustments for export",
      adjustments: [],
    };
  }
}

