"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { Prisma } from "@prisma/client";

export interface ScanResult {
  success: boolean;
  error?: string;
  entry?: any;
}

/**
 * Scan a barcode or item code and create or update a count entry
 */
export async function scanBarcode(barcode: string, warehouseId: string): Promise<ScanResult> {
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

    // 3. Create a separate entry for this scan (no grouping or incrementing quantity)
    const entry = await prisma.inventoryCountEntry.create({
      data: {
        itemId,
        variantId,
        barcode: finalBarcode,
        warehouseId,
        quantity: new Prisma.Decimal(1.00),
        createdBy: userId,
        status: "COUNTED"
      },
      include: {
        item: true,
        variant: true
      }
    });

    revalidateBothPaths("/dashboard/inventory/count");

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
    console.error("scanBarcode error:", error);
    return { success: false, error: "Failed to scan and process barcode" };
  }
}

/**
 * Get active user's draft counts for a selected warehouse
 */
export async function getDraftCounts(warehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const entries = await prisma.inventoryCountEntry.findMany({
      where: {
        warehouseId,
        createdBy: session.user.id,
        status: "COUNTED"
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

    const formatted = entries.map(e => {
      let name = e.item.name;
      let code = e.item.code;
      if (e.variant) {
        name = `${e.item.name} (${e.variant.color} / ${e.variant.size})`;
        code = e.variant.sku;
      }

      return {
        id: e.id,
        itemId: e.itemId,
        variantId: e.variantId,
        code,
        name,
        barcode: e.barcode,
        unit: e.item.unit?.symbol || "pcs",
        quantity: Number(e.quantity),
        updatedAt: e.updatedAt
      };
    });

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
    console.error("getDraftCounts error:", error);
    return { success: false, error: "Failed to load count entries" };
  }
}

/**
 * Update draft count entry quantity
 */
export async function updateDraftCountQty(id: string, quantity: number) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (quantity <= 0) {
      return deleteDraftCount(id);
    }

    const entry = await prisma.inventoryCountEntry.update({
      where: { id },
      data: {
        quantity: new Prisma.Decimal(quantity)
      }
    });

    revalidateBothPaths("/dashboard/inventory/count");
    return { success: true };
  } catch (error) {
    console.error("updateDraftCountQty error:", error);
    return { success: false, error: "Failed to update quantity" };
  }
}

/**
 * Delete a draft count entry
 */
export async function deleteDraftCount(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await prisma.inventoryCountEntry.delete({
      where: { id }
    });

    revalidateBothPaths("/dashboard/inventory/count");
    return { success: true };
  } catch (error) {
    console.error("deleteDraftCount error:", error);
    return { success: false, error: "Failed to delete entry" };
  }
}

/**
 * Get all count entries with filters for User & Warehouse
 */
export async function getAllCountEntries(filters: {
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

    // Normal users default warehouse logic
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
      prisma.inventoryCountEntry.findMany({
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
      prisma.inventoryCountEntry.count({ where })
    ]);

    // Fetch active users list for filters
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

    // Overall summary metrics
    const sumResult = await prisma.inventoryCountEntry.aggregate({
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

    const uniqueItemsGroup = await prisma.inventoryCountEntry.groupBy({
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
    console.error("getAllCountEntries error:", error);
    return { success: false, error: "Failed to load count entries" };
  }
}

/**
 * Load Stock Reconciliation report comparing System Stock vs Draft Scans
 */
export async function getReconciliationReport(warehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Get all items that track inventory
    const items = await prisma.item.findMany({
      where: {
        trackInventory: true,
        status: "active",
        isTrash: false
      },
      include: {
        unit: true,
        variants: true
      }
    });

    // Get current warehouse stock records
    const systemStock = await prisma.stock.findMany({
      where: { warehouseId }
    });

    // Get all COUNTED count entries for this warehouse
    const draftCounts = await prisma.inventoryCountEntry.groupBy({
      by: ["itemId", "variantId"],
      where: {
        warehouseId,
        status: "COUNTED"
      },
      _sum: {
        quantity: true
      }
    });

    // Create lookup maps
    const stockMap = new Map<string, number>(); // key: itemId_variantId (variantId null = "null")
    for (const s of systemStock) {
      const key = `${s.itemId || "null"}_${s.variantId || "null"}`;
      stockMap.set(key, Number(s.quantity));
    }

    const countMap = new Map<string, number>();
    for (const c of draftCounts) {
      const key = `${c.itemId || "null"}_${c.variantId || "null"}`;
      countMap.set(key, Number(c._sum.quantity || 0));
    }

    // Build the report lines
    const lines: any[] = [];

    for (const item of items) {
      const hasVariants = item.variants && item.variants.length > 0;

      if (hasVariants) {
        for (const variant of item.variants) {
          const key = `${item.id}_${variant.id}`;
          const systemQty = stockMap.get(key) || 0;
          const physicalQty = countMap.get(key) || 0;
          const discrepancy = physicalQty - systemQty;
          const rate = Number(variant.costPrice || item.costPrice || 0);

          if (systemQty > 0 || physicalQty > 0) {
            lines.push({
              itemId: item.id,
              variantId: variant.id,
              code: variant.sku,
              name: `${item.name} (${variant.color} / ${variant.size})`,
              barcode: variant.barcode || item.barcode || "-",
              unit: item.unit?.symbol || "pcs",
              systemStock: systemQty,
              physicalCount: physicalQty,
              discrepancy,
              unitRate: rate,
              amount: discrepancy * rate
            });
          }
        }
      } else {
        const key = `${item.id}_null`;
        const systemQty = stockMap.get(key) || 0;
        const physicalQty = countMap.get(key) || 0;
        const discrepancy = physicalQty - systemQty;
        const rate = Number(item.costPrice || 0);

        if (systemQty > 0 || physicalQty > 0) {
          lines.push({
            itemId: item.id,
            variantId: null,
            code: item.code,
            name: item.name,
            barcode: item.barcode || "-",
            unit: item.unit?.symbol || "pcs",
            systemStock: systemQty,
            physicalCount: physicalQty,
            discrepancy,
            unitRate: rate,
            amount: discrepancy * rate
          });
        }
      }
    }

    return {
      success: true,
      report: lines
    };
  } catch (error) {
    console.error("getReconciliationReport error:", error);
    return { success: false, error: "Failed to compile reconciliation report" };
  }
}

/**
 * Generate DRAFT Inventory Adjustment from Stock Reconciliation discrepancy
 */
export async function createAdjustmentFromReconciliation(warehouseId: string, notes?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canApprove = await hasPermission(session.user.id, "inventory.count.adjustment", "approve");
    if (!canApprove) return { success: false, error: "Permission denied" };

    // Get reconciliation discrepancies
    const repRes = await getReconciliationReport(warehouseId);
    if (!repRes.success || !repRes.report) {
      return { success: false, error: repRes.error || "Failed to load discrepancies" };
    }

    const discrepancyLines = repRes.report.filter((line: any) => line.discrepancy !== 0);

    if (discrepancyLines.length === 0) {
      return { success: false, error: "All physical counts match system stock. No adjustment needed." };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate Adjustment Number
      const count = await tx.inventoryAdjustment.count();
      const adjustmentNumber = `ADJ-CNT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      // 2. Create Draft Adjustment
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          adjustmentNumber,
          warehouseId,
          date: new Date(),
          notes: notes || `Auto Reconciliation Adjustment from Inventory Count`,
          status: "DRAFT",
          createdBy: session.user.id,
          items: {
            create: discrepancyLines.map((line: any) => ({
              itemId: line.itemId,
              variantId: line.variantId || null,
              quantity: new Prisma.Decimal(line.discrepancy),
              unitRate: new Prisma.Decimal(line.unitRate),
              amount: new Prisma.Decimal(Math.abs(line.discrepancy * line.unitRate))
            }))
          }
        }
      });

      // 3. Mark counted count entries in this warehouse as RECONCILED
      await tx.inventoryCountEntry.updateMany({
        where: {
          warehouseId,
          status: "COUNTED"
        },
        data: {
          status: "RECONCILED"
        }
      });

      return adjustment;
    });

    await logItemCreated(session.user.id, "InventoryAdjustment", result.id, `Created auto reconciliation adjustment ${result.adjustmentNumber}`);
    revalidateBothPaths("/dashboard/inventory/adjustments");
    revalidateBothPaths("/dashboard/inventory/count");

    return {
      success: true,
      adjustmentId: result.id,
      adjustmentNumber: result.adjustmentNumber
    };
  } catch (error) {
    console.error("createAdjustmentFromReconciliation error:", error);
    return { success: false, error: "Failed to generate auto-adjustment" };
  }
}
