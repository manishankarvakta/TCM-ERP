"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { logItemCreated } from "@/lib/user-log";
import { Prisma } from "@prisma/client";

export interface AddStockScanResult {
  success: boolean;
  error?: string;
  entry?: any;
}

async function generatePurchaseNumber(tx: Prisma.TransactionClient): Promise<string> {
  const prefix = "PUR";
  const lastPurchase = await tx.purchase.findFirst({
    where: {
      purchaseNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      purchaseNumber: "desc",
    },
    select: {
      purchaseNumber: true,
    },
  });

  let nextNumber = 1000001;
  if (lastPurchase?.purchaseNumber) {
    const codeWithoutPrefix = lastPurchase.purchaseNumber.replace(prefix, "");
    const lastNumber = parseInt(codeWithoutPrefix, 10);
    if (!isNaN(lastNumber) && lastNumber >= 1000001) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(7, "0")}`;
}

/**
 * Scan a barcode or item code for Add Stock and log a draft entry
 */
export async function scanAddStockBarcode(barcode: string, warehouseId: string): Promise<AddStockScanResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const cleanCode = barcode.trim();

    if (!cleanCode) {
      return { success: false, error: "Barcode cannot be empty" };
    }

    // 1. Search for ProductVariant by barcode or SKU
    let variant = await prisma.productVariant.findFirst({
      where: {
        OR: [
          { barcode: cleanCode },
          { sku: { equals: cleanCode, mode: "insensitive" } }
        ]
      },
      include: {
        item: {
          include: {
            unit: true
          }
        }
      }
    });

    let itemId: string;
    let variantId: string | null = null;
    let finalBarcode: string | null = null;
    let itemName = "";
    let itemCode = "";
    let unitSymbol = "pcs";

    if (variant) {
      if (!variant.item.trackInventory) {
        return { success: false, error: `Item ${variant.item.name} does not track inventory` };
      }
      itemId = variant.itemId;
      variantId = variant.id;
      finalBarcode = variant.barcode || cleanCode;
      itemName = `${variant.item.name} (${variant.color} / ${variant.size})`;
      itemCode = variant.sku;
      unitSymbol = variant.item.unit?.symbol || "pcs";
    } else {
      // 2. Search for Item by barcode or code
      const item = await prisma.item.findFirst({
        where: {
          OR: [
            { barcode: cleanCode },
            { code: { equals: cleanCode, mode: "insensitive" } }
          ]
        },
        include: {
          unit: true
        }
      });

      if (!item) {
        return { success: false, error: `No item or variant found for code: ${cleanCode}` };
      }

      if (!item.trackInventory) {
        return { success: false, error: `Item ${item.name} does not track inventory` };
      }

      itemId = item.id;
      finalBarcode = item.barcode || cleanCode;
      itemName = item.name;
      itemCode = item.code;
      unitSymbol = item.unit?.symbol || "pcs";
    }

    // 3. Create a separate ledger entry for this scan (quantity = 1.00)
    const entry = await prisma.inventoryAddStockEntry.create({
      data: {
        itemId,
        variantId,
        barcode: finalBarcode,
        warehouseId,
        quantity: new Prisma.Decimal(1.00),
        createdBy: userId,
        status: "DRAFT"
      },
      include: {
        item: true,
        variant: true
      }
    });

    revalidateBothPaths("/dashboard/inventory/add-stock");

    return {
      success: true,
      entry: {
        id: entry.id,
        code: itemCode,
        name: itemName,
        barcode: finalBarcode,
        unit: unitSymbol,
        quantity: Number(entry.quantity),
        warehouseId
      }
    };
  } catch (error) {
    console.error("scanAddStockBarcode error:", error);
    return { success: false, error: "Failed to scan and process barcode" };
  }
}

/**
 * Get user's draft Add Stock scans for selected warehouse
 */
export async function getAddStockDrafts(warehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const entries = await prisma.inventoryAddStockEntry.findMany({
      where: {
        warehouseId,
        createdBy: session.user.id,
        status: "DRAFT"
      },
      include: {
        item: {
          include: {
            unit: true
          }
        },
        variant: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    const consolidatedMap = new Map<string, any>();
    for (const e of entries) {
      const key = `${e.itemId}_${e.variantId || "null"}`;
      const existing = consolidatedMap.get(key);

      let name = e.item.name;
      let code = e.item.code;
      if (e.variant) {
        name = `${e.item.name} (${e.variant.color} / ${e.variant.size})`;
        code = e.variant.sku;
      }

      if (existing) {
        existing.quantity += Number(e.quantity);
      } else {
        consolidatedMap.set(key, {
          id: e.id,
          itemId: e.itemId,
          variantId: e.variantId,
          code,
          name,
          barcode: e.barcode,
          unit: e.item.unit?.symbol || "pcs",
          quantity: Number(e.quantity),
          costPrice: Number(e.variant?.costPrice || e.item.costPrice || 0),
          updatedAt: e.updatedAt
        });
      }
    }

    const formatted = Array.from(consolidatedMap.values());
    const totalQty = formatted.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueKeys = new Set(formatted.map(item => item.barcode || `${item.itemId}_${item.variantId || "null"}`));
    const totalItems = uniqueKeys.size;

    return {
      success: true,
      entries: formatted,
      summary: {
        totalQty,
        totalItems
      }
    };
  } catch (error) {
    console.error("getAddStockDrafts error:", error);
    return { success: false, error: "Failed to load Add Stock entries" };
  }
}

/**
 * Update draft Add Stock quantity
 */
export async function updateAddStockDraftQty(id: string, quantity: number) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (quantity <= 0) {
      return deleteAddStockDraft(id);
    }

    await prisma.inventoryAddStockEntry.update({
      where: { id },
      data: {
        quantity: new Prisma.Decimal(quantity)
      }
    });

    revalidateBothPaths("/dashboard/inventory/add-stock");
    return { success: true };
  } catch (error) {
    console.error("updateAddStockDraftQty error:", error);
    return { success: false, error: "Failed to update quantity" };
  }
}

/**
 * Delete a draft Add Stock entry
 */
export async function deleteAddStockDraft(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await prisma.inventoryAddStockEntry.delete({
      where: { id }
    });

    revalidateBothPaths("/dashboard/inventory/add-stock");
    return { success: true };
  } catch (error) {
    console.error("deleteAddStockDraft error:", error);
    return { success: false, error: "Failed to delete entry" };
  }
}

/**
 * Finish Complete: convert active draft scans into a DRAFT Purchase without supplier
 */
export async function finishAddStockToDraftPurchase(warehouseId: string, notes?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!warehouseId) {
      return { success: false, error: "Warehouse ID is required" };
    }

    // Fetch user's active DRAFT scans for this warehouse
    const draftEntries = await prisma.inventoryAddStockEntry.findMany({
      where: {
        warehouseId,
        createdBy: session.user.id,
        status: "DRAFT"
      },
      include: {
        item: true,
        variant: true
      }
    });

    if (draftEntries.length === 0) {
      return { success: false, error: "No draft scanned items found to create purchase" };
    }

    // Group items by itemId and variantId to consolidate quantities
    const itemsMap = new Map<string, {
      itemId: string;
      variantId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
    }>();

    for (const entry of draftEntries) {
      const key = `${entry.itemId}_${entry.variantId || "null"}`;
      const existing = itemsMap.get(key);
      const qty = Number(entry.quantity);
      const unitPrice = Number(entry.variant?.costPrice || entry.item.costPrice || 0);

      let description = entry.item.name;
      if (entry.variant) {
        description = `${entry.item.name} (${entry.variant.color} / ${entry.variant.size})`;
      }

      if (existing) {
        existing.quantity += qty;
      } else {
        itemsMap.set(key, {
          itemId: entry.itemId,
          variantId: entry.variantId || null,
          description,
          quantity: qty,
          unitPrice
        });
      }
    }

    const consolidatedItems = Array.from(itemsMap.values());
    const subTotal = consolidatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const grandTotal = subTotal;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate Purchase Number
      const purchaseNumber = await generatePurchaseNumber(tx);

      // 2. Create DRAFT Purchase without supplier
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: null, // No supplier assigned yet
          warehouseId,
          date: new Date(),
          status: "DRAFT",
          notes: notes || "Auto-generated draft purchase from Add Stock scan",
          subTotal: new Prisma.Decimal(subTotal),
          discount: null,
          tax: null,
          grandTotal: new Prisma.Decimal(grandTotal),
          createdBy: session.user.id,
          items: {
            create: consolidatedItems.map(item => ({
              itemId: item.itemId,
              variantId: item.variantId,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.quantity * item.unitPrice)
            }))
          }
        }
      });

      // 3. Mark draft scan entries as COMPLETED
      await tx.inventoryAddStockEntry.updateMany({
        where: {
          id: {
            in: draftEntries.map(e => e.id)
          }
        },
        data: {
          status: "COMPLETED"
        }
      });

      return purchase;
    });

    await logItemCreated(session.user.id, "Purchase", result.id, `Created draft purchase ${result.purchaseNumber} from Add Stock`);
    revalidateBothPaths("/dashboard/procurements/purchases");
    revalidateBothPaths("/dashboard/inventory/add-stock");

    return {
      success: true,
      purchaseId: result.id,
      purchaseNumber: result.purchaseNumber
    };
  } catch (error) {
    console.error("finishAddStockToDraftPurchase error:", error);
    return { success: false, error: "Failed to generate draft purchase" };
  }
}

/**
 * Get all Add Stock entries for audit logs page
 */
export async function getAllAddStockEntries(filters: {
  warehouseId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const isNormalUser = dbUser?.role !== "admin" && dbUser?.role !== "superadmin";
    const where: any = {};

    if (isNormalUser) {
      where.warehouseId = dbUser?.defaultWarehouseId || "none";
    } else if (filters.warehouseId && filters.warehouseId !== "all") {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.userId && filters.userId !== "all") {
      where.createdBy = filters.userId;
    }

    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: new Date(`${filters.startDate}T00:00:00.000Z`),
        lte: new Date(`${filters.endDate}T23:59:59.999Z`),
      };
    }

    const [entries, total] = await Promise.all([
      prisma.inventoryAddStockEntry.findMany({
        where,
        include: {
          item: {
            include: {
              unit: true
            }
          },
          variant: true,
          warehouse: true,
          creator: true
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.inventoryAddStockEntry.count({ where })
    ]);

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    });

    const formatted = entries.map(e => {
      let name = e.item.name;
      let code = e.item.code;
      if (e.variant) {
        name = `${e.item.name} (${e.variant.color} / ${e.variant.size})`;
        code = e.variant.sku;
      }

      return {
        id: e.id,
        code,
        name,
        barcode: e.barcode || "-",
        unit: e.item.unit?.symbol || "pcs",
        quantity: Number(e.quantity),
        warehouseName: e.warehouse.name,
        warehouseCode: e.warehouse.code,
        userName: e.creator.name || e.creator.email,
        status: e.status,
        createdAt: e.createdAt
      };
    });

    const sumResult = await prisma.inventoryAddStockEntry.aggregate({
      where,
      _sum: {
        quantity: true
      },
      _count: {
        id: true
      }
    });

    const totalQuantity = Number(sumResult._sum.quantity || 0);
    const totalLines = sumResult._count.id;

    const uniqueItemsGroup = await prisma.inventoryAddStockEntry.groupBy({
      by: ['itemId', 'variantId'],
      where
    });
    const uniqueItems = uniqueItemsGroup.length;

    return {
      success: true,
      entries: formatted,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        totalQuantity,
        totalLines,
        uniqueItems
      }
    };
  } catch (error) {
    console.error("getAllAddStockEntries error:", error);
    return { success: false, error: "Failed to load Add Stock log entries" };
  }
}
