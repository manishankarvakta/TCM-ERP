"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { InventoryDamageStatus, StockTransactionType, VoucherType } from "@prisma/client";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { getAccountingOperationSettings } from "@/lib/accounting-settings";

// --- Types ---

export interface DamageItemInput {
  itemId: string;
  variantId?: string | null;
  quantity: number; // Will always be treated as positive input, but logic will deduct
  unitRate: number; // Cost Price
}

export interface CreateDamageInput {
  warehouseId: string;
  date: Date;
  notes?: string;
  items: DamageItemInput[];
}

// --- Actions ---

export async function getDamages(
  page: number = 1,
  limit: number = 10,
  filters: {
    warehouseId?: string;
    search?: string;
    status?: InventoryDamageStatus;
    isTrash?: boolean;
    startDate?: string;
    endDate?: string;
  } = {}
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canView = await hasPermission(session.user.id, "inventory.damage", "view");
    if (!canView) return { success: false, error: "Permission denied" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const where: any = { isTrash: filters.isTrash ?? false };
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
        { damageNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [damages, total] = await Promise.all([
      prisma.inventoryDamage.findMany({
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
      prisma.inventoryDamage.count({ where }),
    ]);

    const formattedDamages = damages.map(dmg => {
      const grandTotal = dmg.items.reduce((sum, item) => sum + Number(item.amount), 0);
      const serialized = serialize(dmg);
      return {
        ...serialized,
        grandTotal,
      };
    });

    return {
      success: true,
      damages: formattedDamages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getDamages error:", error);
    return { success: false, error: "Failed to fetch damages" };
  }
}

export async function getDamage(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canView = await hasPermission(session.user.id, "inventory.damage", "view");
    if (!canView) return { success: false, error: "Permission denied" };

    const damage = await prisma.inventoryDamage.findUnique({
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

    if (!damage) return { success: false, error: "Damage not found" };

    return { success: true, damage: serialize(damage) };
  } catch (error) {
    console.error("getDamage error:", error);
    return { success: false, error: "Failed to fetch damage" };
  }
}

function serialize(obj: any): any {
  if (obj === null || obj === undefined) {
      return obj;
  }
  
  if (obj instanceof Date) {
      return obj.toISOString();
  }

  if (typeof obj === 'object') {
      if (obj.toString().includes('Decimal')) {
          return Number(obj);
      }
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

export async function createDamage(input: CreateDamageInput) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canCreate = await hasPermission(session.user.id, "inventory.damage", "create");
    if (!canCreate) return { success: false, error: "Permission denied" };

    const count = await prisma.inventoryDamage.count();
    const damageNumber = `DMG-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const damage = await prisma.inventoryDamage.create({
      data: {
        damageNumber,
        warehouseId: input.warehouseId,
        date: input.date,
        notes: input.notes,
        status: InventoryDamageStatus.DRAFT,
        createdById: session.user.id,
        items: {
          create: input.items.map(item => ({
            itemId: item.itemId,
            variantId: item.variantId || null,
            quantity: Math.abs(item.quantity), // Store as absolute positive in DB
            unitRate: item.unitRate,
            amount: Math.abs(item.quantity * item.unitRate),
          }))
        }
      }
    });

    await logItemCreated(session.user.id, "InventoryDamage", damage.id, `Created draft damage ${damageNumber}`);
    revalidateBothPaths("/dashboard/inventory/damage");

    return { success: true, damageId: damage.id };
  } catch (error) {
    console.error("createDamage error:", error);
    return { success: false, error: "Failed to create damage" };
  }
}

export async function updateDamage(id: string, input: CreateDamageInput) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "inventory.damage", "edit");
    if (!canEdit) return { success: false, error: "Permission denied" };

    const damage = await prisma.inventoryDamage.findUnique({
      where: { id },
    });

    if (!damage) return { success: false, error: "Not found" };
    if (damage.status !== "DRAFT") return { success: false, error: "Cannot edit non-draft damage" };

    await prisma.$transaction(async (tx) => {
      // 1. Delete old items
      await tx.inventoryDamageItem.deleteMany({ where: { inventoryDamageId: id } });
      
      // 2. Update parent and create new items
      await tx.inventoryDamage.update({
        where: { id },
        data: {
          warehouseId: input.warehouseId,
          date: input.date,
          notes: input.notes,
          items: {
            create: input.items.map(item => ({
              itemId: item.itemId,
              variantId: item.variantId || null,
              quantity: Math.abs(item.quantity),
              unitRate: item.unitRate,
              amount: Math.abs(item.quantity * item.unitRate),
            }))
          }
        }
      });
    });

    await logItemUpdated(session.user.id, "InventoryDamage", id, ["Updated draft damage"]);
    revalidateBothPaths("/dashboard/inventory/damage");

    return { success: true };
  } catch (error) {
    console.error("updateDamage error:", error);
    return { success: false, error: "Failed to update damage" };
  }
}

export async function approveDamage(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canApprove = await hasPermission(session.user.id, "inventory.damage", "approve");
    if (!canApprove) return { success: false, error: "Permission denied" };

    const damage = await prisma.inventoryDamage.findUnique({
      where: { id },
      include: { items: { include: { item: true } }, warehouse: true }
    });

    if (!damage) return { success: false, error: "Damage not found" };
    if (damage.status !== "DRAFT") return { success: false, error: "Damage is not in draft status" };

    const settings = await getAccountingOperationSettings();
    const { 
      negativeFgInventoryId, negativeRmInventoryId, negativeAdjustmentExpenseId 
    } = settings.inventoryAdjustment;

    const voucherLines: any[] = [];
    let lineNumber = 1;

    await prisma.$transaction(async (tx) => {
      for (const item of damage.items) {
        // 1. Update Stock
        const existingStock = item.variantId ? await tx.stock.findUnique({
          where: { variantId_warehouseId: { variantId: item.variantId, warehouseId: damage.warehouseId } }
        }) : await tx.stock.findUnique({
          where: { itemId_warehouseId: { itemId: item.itemId, warehouseId: damage.warehouseId } }
        });

        // Damage is a loss, so we subtract
        const newQty = existingStock ? Number(existingStock.quantity) - Number(item.quantity) : -Number(item.quantity);

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
              warehouseId: damage.warehouseId,
              quantity: newQty,
            }
          });
        }

        // 2. Create Stock Ledger (negative quantity for ledger)
        await tx.stockLedger.create({
          data: {
            itemId: item.variantId ? null : item.itemId,
            variantId: item.variantId || null,
            warehouseId: damage.warehouseId,
            transactionType: StockTransactionType.DAMAGE,
            quantity: -Number(item.quantity),
            referenceType: "DAMAGE",
            referenceId: damage.id,
            notes: damage.notes || "Inventory Damage",
            createdBy: session.user.id,
            rate: item.unitRate
          }
        });

        // 3. Prepare Accounting Lines
        const amount = Number(item.amount);
        if (amount > 0) {
          const isRawMaterial = item.item.itemType === "RAW_MATERIAL";
          const inventoryAcctId = isRawMaterial ? negativeRmInventoryId : negativeFgInventoryId;
          const expenseAcctId = negativeAdjustmentExpenseId; // using negative adjustment expense for damage

          if (inventoryAcctId && expenseAcctId) {
             voucherLines.push({
                lineNumber: lineNumber++,
                debitAmount: amount,
                creditAmount: 0,
                chartOfAccountId: expenseAcctId,
                description: `Damage Expense: ${item.item.code}`
             });
             voucherLines.push({
                lineNumber: lineNumber++,
                debitAmount: 0,
                creditAmount: amount,
                chartOfAccountId: inventoryAcctId,
                description: `Inventory Loss (Damage): ${item.item.code} - ${item.item.name}`
             });
          }
        }
      }
      
      // Update Damage Status
      await tx.inventoryDamage.update({
        where: { id },
        data: { status: "COMPLETED" }
      });
    });

    if (voucherLines.length > 0) {
       const voucherResult = await createVoucher({
          date: damage.date,
          type: VoucherType.DAMAGE,
          reference: damage.damageNumber,
          description: `Inventory Damage: ${damage.damageNumber}`,
          isSystemAction: true,
          lines: voucherLines
       });

       if (voucherResult.success && voucherResult.voucher) {
          await postVoucher(voucherResult.voucher.id, undefined, true);
          await prisma.inventoryDamage.update({
             where: { id },
             data: { voucherId: voucherResult.voucher.id }
          });
       }
    }

    await logItemUpdated(session.user.id, "InventoryDamage", damage.id, ["Approved and Posted Damage"]);
    revalidateBothPaths("/dashboard/inventory/damage");
    
    return { success: true };

  } catch (error) {
    console.error("approveDamage error:", error);
    return { success: false, error: "Failed to approve damage" };
  }
}

export async function trashDamage(id: string) {
   try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canTrash = await hasPermission(session.user.id, "inventory.damage", "move-to-trash");
    if (!canTrash) return { success: false, error: "Permission denied" };

    const damage = await prisma.inventoryDamage.findUnique({ where: { id } });
    if (!damage) return { success: false, error: "Not found" };
    if (damage.status !== "DRAFT") return { success: false, error: "Cannot trash non-draft damage" };
    
    await prisma.inventoryDamage.update({ where: { id }, data: { isTrash: true } });
    await logItemUpdated(session.user.id, "InventoryDamage", damage.id, ["Moved to trash"]);
    revalidateBothPaths("/dashboard/inventory/damage");
    return { success: true };
   } catch (error) {
      return { success: false, error: "Failed to move to trash" };
   }
}

export async function restoreDamage(id: string) {
   try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canTrash = await hasPermission(session.user.id, "inventory.damage", "move-to-trash");
    if (!canTrash) return { success: false, error: "Permission denied" };

    const damage = await prisma.inventoryDamage.findUnique({ where: { id } });
    if (!damage) return { success: false, error: "Not found" };
    
    await prisma.inventoryDamage.update({ where: { id }, data: { isTrash: false } });
    await logItemUpdated(session.user.id, "InventoryDamage", damage.id, ["Restored from trash"]);
    revalidateBothPaths("/dashboard/inventory/damage");
    return { success: true };
   } catch (error) {
      return { success: false, error: "Failed to restore" };
   }
}

export async function deleteDamage(id: string) {
   try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canDelete = await hasPermission(session.user.id, "inventory.damage", "delete-permanently");
    if (!canDelete) return { success: false, error: "Permission denied" };

    const damage = await prisma.inventoryDamage.findUnique({
      where: { id },
    });

    if (!damage) return { success: false, error: "Not found" };
    if (damage.status !== "DRAFT") return { success: false, error: "Cannot delete non-draft damage" };
    
    await prisma.$transaction([
      prisma.inventoryDamageItem.deleteMany({ where: { inventoryDamageId: id } }),
      prisma.inventoryDamage.delete({ where: { id } })
    ]);
    await logItemUpdated(session.user.id, "InventoryDamage", damage.id, ["Permanently deleted damage"]);
    revalidateBothPaths("/dashboard/inventory/damage");
    return { success: true };
   } catch (error) {
      return { success: false, error: "Failed to delete" };
   }
}

/**
 * Get all damages matching filters for export (no pagination limit)
 */
export async function getAllDamagesForExport(filters: {
  warehouseId?: string;
  search?: string;
  isTrash?: boolean;
  startDate?: string;
  endDate?: string;
} = {}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", damages: [] };

    const canView = await hasPermission(session.user.id, "inventory.damage", "view");
    if (!canView) return { success: false, error: "Permission denied", damages: [] };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const where: any = {};
    if (filters.isTrash !== undefined) {
      where.isTrash = filters.isTrash;
    }

    if (filters.warehouseId && filters.warehouseId !== "all") {
      where.warehouseId = filters.warehouseId;
    } else if (isNormalUser && user?.defaultWarehouseId) {
      where.warehouseId = user.defaultWarehouseId;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {
        ...(filters.startDate ? { gte: new Date(new Date(filters.startDate).setHours(0, 0, 0, 0)) } : {}),
        ...(filters.endDate ? { lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)) } : {}),
      };
    }

    if (filters.search) {
      where.OR = [
        { damageNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const damages = await prisma.inventoryDamage.findMany({
      where,
      include: {
        warehouse: { select: { name: true, code: true } },
        createdByUser: { select: { name: true } },
        items: {
          include: {
            item: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const serializedDamages = damages.map((d) => {
      const totalAmount = d.items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
      return {
        ...d,
        totalAmount,
        items: d.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity || 0),
          unitRate: Number(it.unitRate || 0),
          amount: Number(it.amount || 0),
        })),
      };
    });

    return { success: true, damages: serializedDamages };
  } catch (error) {
    console.error("getAllDamagesForExport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch damages for export",
      damages: [],
    };
  }
}

