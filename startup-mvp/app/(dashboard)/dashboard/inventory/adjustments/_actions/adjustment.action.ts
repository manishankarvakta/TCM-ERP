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
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canApprove = await hasPermission(session.user.id, "inventory.adjustments", "approve");
    if (!canApprove) return { success: false, error: "Permission denied" };

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: { items: { include: { item: true } }, warehouse: true }
    });

    if (!adjustment) return { success: false, error: "Adjustment not found" };
    if (adjustment.status !== "DRAFT") return { success: false, error: "Adjustment is not in draft status" };

    // Get Accounting Settings
    const settings = await getAccountingOperationSettings();
    const { 
      positiveFgInventoryId, positiveRmInventoryId, positiveAdjustmentGainId,
      negativeFgInventoryId, negativeRmInventoryId, negativeAdjustmentExpenseId 
    } = settings.inventoryAdjustment;

    // We will group Voucher Lines
    const voucherLines: any[] = [];
    let lineNumber = 1;

    // Transaction
    await prisma.$transaction(async (tx) => {
      for (const item of adjustment.items) {
        // 1. Update Stock
        const existingStock = item.variantId ? await tx.stock.findUnique({
          where: { variantId_warehouseId: { variantId: item.variantId, warehouseId: adjustment.warehouseId } }
        }) : await tx.stock.findUnique({
          where: { itemId_warehouseId: { itemId: item.itemId, warehouseId: adjustment.warehouseId } }
        });

        const newQty = existingStock ? Number(existingStock.quantity) + Number(item.quantity) : Number(item.quantity);

        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data: { quantity: newQty, lastUpdated: new Date() }
          });
        } else {
          await tx.stock.create({
            data: {
              itemId: item.variantId ? null : item.itemId,
              variantId: item.variantId || null,
              warehouseId: adjustment.warehouseId,
              quantity: newQty,
            }
          });
        }

        // 2. Create Stock Ledger
        await tx.stockLedger.create({
          data: {
            itemId: item.variantId ? null : item.itemId,
            variantId: item.variantId || null,
            warehouseId: adjustment.warehouseId,
            transactionType: StockTransactionType.ADJUSTMENT,
            quantity: item.quantity,
            referenceType: "ADJUSTMENT",
            referenceId: adjustment.id,
            notes: adjustment.notes || "Inventory Adjustment",
            createdBy: session.user.id,
            rate: item.unitRate
          }
        });

        // 3. Prepare Accounting Lines
        const amount = Number(item.amount);
        if (amount > 0) {
          const isGain = Number(item.quantity) > 0;
          const isRawMaterial = item.item.itemType === "RAW_MATERIAL";

          let inventoryAcctId = "";
          let adjustmentAcctId = "";

          if (isGain) {
             inventoryAcctId = isRawMaterial ? positiveRmInventoryId : positiveFgInventoryId;
             adjustmentAcctId = positiveAdjustmentGainId;
          } else {
             inventoryAcctId = isRawMaterial ? negativeRmInventoryId : negativeFgInventoryId;
             adjustmentAcctId = negativeAdjustmentExpenseId;
          }

          if (inventoryAcctId && adjustmentAcctId) {
             // For Gain: Dr Inventory, Cr Gain
             // For Loss: Dr Expense, Cr Inventory
             
             if (isGain) {
                voucherLines.push({
                   lineNumber: lineNumber++,
                   debitAmount: amount,
                   creditAmount: 0,
                   chartOfAccountId: inventoryAcctId,
                   description: `Stock Gain: ${item.item.code} - ${item.item.name}`
                });
                voucherLines.push({
                   lineNumber: lineNumber++,
                   debitAmount: 0,
                   creditAmount: amount,
                   chartOfAccountId: adjustmentAcctId,
                   description: `Adjustment Gain: ${item.item.code}`
                });
             } else {
                voucherLines.push({
                   lineNumber: lineNumber++,
                   debitAmount: amount,
                   creditAmount: 0,
                   chartOfAccountId: adjustmentAcctId,
                   description: `Adjustment Loss: ${item.item.code}`
                });
                voucherLines.push({
                   lineNumber: lineNumber++,
                   debitAmount: 0,
                   creditAmount: amount,
                   chartOfAccountId: inventoryAcctId,
                   description: `Stock Loss: ${item.item.code} - ${item.item.name}`
                });
             }
          }
        }
      }
      
      // Update Adjustment Status
      await tx.inventoryAdjustment.update({
        where: { id },
        data: { status: "COMPLETED", updatedBy: session.user.id }
      });
    });

    // 4. Create Voucher (outside transaction block or need to pass tx? createVoucher is separate action)
    // We will creating it after successful stock update for now, or we should integrate it. 
    // Ideally createVoucher should be part of transaction but it's a separate complex action. 
    // We will call it here. If it fails, we have a consistency issue (Stock updated, Voucher not).
    // For MVP, we proceed.
    
    if (voucherLines.length > 0) {
       const voucherResult = await createVoucher({
          date: adjustment.date,
          type: VoucherType.JOURNAL,
          reference: adjustment.adjustmentNumber,
          description: `Inventory Adjustment: ${adjustment.adjustmentNumber}`,
          isSystemAction: true,
          lines: voucherLines
       });

       if (voucherResult.success && voucherResult.voucher) {
          await postVoucher(voucherResult.voucher.id, undefined, true);
          // Link voucher
          await prisma.inventoryAdjustment.update({
             where: { id },
             data: { voucherId: voucherResult.voucher.id }
          });
       }
    }

    await logItemUpdated(session.user.id, "InventoryAdjustment", adjustment.id, ["Approved and Posted Adjustment"]);
    revalidateBothPaths("/dashboard/inventory/adjustments");
    
    return { success: true };

  } catch (error) {
    console.error("approveAdjustment error:", error);
    return { success: false, error: "Failed to approve adjustment" };
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

