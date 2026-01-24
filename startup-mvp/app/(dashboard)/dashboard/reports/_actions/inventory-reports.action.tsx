"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma, ItemType, StockTransactionType } from "@prisma/client";

/**
 * Get Stock Summary Report
 */
export async function getStockSummary(filters: {
  warehouseId?: string;
  itemType?: ItemType | "all";
  itemId?: string;
  lowStockThreshold?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        data: [],
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "reports.view", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view reports",
        data: [],
      };
    }

    const where: Prisma.StockWhereInput = {
      item: {
        trackInventory: true,
        ...(filters.itemType && filters.itemType !== "all"
          ? { itemType: filters.itemType }
          : {}),
        ...(filters.itemId ? { id: filters.itemId } : {}),
      },
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    };

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            itemType: true,
            costPrice: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { warehouse: { name: "asc" } },
        { item: { code: "asc" } },
      ],
    });

    // Process data
    const reportData = stocks.map((stock) => {
      const quantity = Number(stock.quantity);
      const reservedQuantity = Number(stock.reservedQuantity);
      const availableQuantity = quantity - reservedQuantity;
      const costPrice = stock.item.costPrice ? Number(stock.item.costPrice) : 0;
      const totalValue = quantity * costPrice;

      return {
        itemCode: stock.item.code,
        itemName: stock.item.name,
        itemType: stock.item.itemType,
        warehouse: stock.warehouse.name,
        warehouseCode: stock.warehouse.code,
        currentQuantity: quantity,
        reservedQuantity: reservedQuantity,
        availableQuantity: availableQuantity,
        unit: stock.item.unit?.symbol || "",
        unitCost: costPrice,
        totalValue: totalValue,
        lastUpdated: stock.lastUpdated,
      };
    });

    // Filter by low stock threshold if provided
    let filteredData = reportData;
    if (filters.lowStockThreshold !== undefined) {
      filteredData = reportData.filter(
        (item) => item.availableQuantity < filters.lowStockThreshold!
      );
    }

    return {
      success: true,
      data: filteredData,
    };
  } catch (error) {
    console.error("getStockSummary error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock summary",
      data: [],
    };
  }
}

/**
 * Get Stock Ledger Report
 */
export async function getStockLedger(
  filters: {
    itemId?: string;
    warehouseId?: string;
    transactionType?: StockTransactionType | "all";
    dateFrom?: string;
    dateTo?: string;
    referenceType?: string;
    referenceId?: string;
  },
  pagination: {
    page: number;
    limit: number;
  } = { page: 1, limit: 50 }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "reports.view", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view reports",
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const where: Prisma.StockLedgerWhereInput = {
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.transactionType && filters.transactionType !== "all"
        ? { transactionType: filters.transactionType }
        : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo
                ? { lte: new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999)) }
                : {}),
            },
          }
        : {}),
      ...(filters.referenceType ? { referenceType: filters.referenceType } : {}),
      ...(filters.referenceId ? { referenceId: filters.referenceId } : {}),
    };

    const skip = (pagination.page - 1) * pagination.limit;

    const [entries, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pagination.limit,
      }),
      prisma.stockLedger.count({ where }),
    ]);

    // Process data
    const reportData = entries.map((entry) => {
      const quantity = Number(entry.quantity);
      const rate = entry.rate ? Number(entry.rate) : 0;
      const amount = Math.abs(quantity) * rate;

      return {
        date: entry.createdAt,
        itemCode: entry.item.code,
        itemName: entry.item.name,
        warehouse: entry.warehouse.name,
        warehouseCode: entry.warehouse.code,
        transactionType: entry.transactionType,
        quantity: quantity,
        rate: rate,
        amount: amount,
        referenceType: entry.referenceType || "",
        referenceId: entry.referenceId || "",
        notes: entry.notes || "",
        createdBy: entry.creator.name || entry.creator.email,
      };
    });

    return {
      success: true,
      data: reportData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  } catch (error) {
    console.error("getStockLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock ledger",
      data: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get Raw Material Consumption Report
 */
export async function getRawMaterialConsumption(filters: {
  itemId?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  productionOrderId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        data: [],
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "reports.view", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view reports",
        data: [],
      };
    }

    const where: Prisma.StockLedgerWhereInput = {
      item: {
        itemType: ItemType.RAW_MATERIAL,
        ...(filters.itemId ? { id: filters.itemId } : {}),
      },
      transactionType: StockTransactionType.OUT,
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo
                ? { lte: new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999)) }
                : {}),
            },
          }
        : {}),
      ...(filters.productionOrderId
        ? { referenceId: filters.productionOrderId, referenceType: "PRODUCTION" }
        : {}),
    };

    const entries = await prisma.stockLedger.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by item and warehouse
    const grouped = new Map<
      string,
      {
        itemId: string;
        itemCode: string;
        itemName: string;
        warehouseId: string;
        warehouse: string;
        warehouseCode: string;
        unit: string;
        totalConsumed: number;
        totalCost: number;
        averageCost: number;
        productionOrders: Set<string>;
        lastConsumptionDate: Date;
      }
    >();

    for (const entry of entries) {
      const key = `${entry.itemId}_${entry.warehouseId}`;
      const quantity = Math.abs(Number(entry.quantity));
      const rate = entry.rate ? Number(entry.rate) : 0;
      const cost = quantity * rate;

      if (!grouped.has(key)) {
        grouped.set(key, {
          itemId: entry.itemId,
          itemCode: entry.item.code,
          itemName: entry.item.name,
          warehouseId: entry.warehouseId,
          warehouse: entry.warehouse.name,
          warehouseCode: entry.warehouse.code,
          unit: entry.item.unit?.symbol || "",
          totalConsumed: 0,
          totalCost: 0,
          averageCost: 0,
          productionOrders: new Set(),
          lastConsumptionDate: entry.createdAt,
        });
      }

      const group = grouped.get(key)!;
      group.totalConsumed += quantity;
      group.totalCost += cost;
      if (entry.referenceId && entry.referenceType === "PRODUCTION") {
        group.productionOrders.add(entry.referenceId);
      }
      if (entry.createdAt > group.lastConsumptionDate) {
        group.lastConsumptionDate = entry.createdAt;
      }
    }

    // Calculate averages and format
    const reportData = Array.from(grouped.values()).map((group) => ({
      itemCode: group.itemCode,
      itemName: group.itemName,
      warehouse: group.warehouse,
      warehouseCode: group.warehouseCode,
      totalConsumed: group.totalConsumed,
      unit: group.unit,
      averageCost: group.totalConsumed > 0 ? group.totalCost / group.totalConsumed : 0,
      totalCost: group.totalCost,
      productionOrdersCount: group.productionOrders.size,
      lastConsumptionDate: group.lastConsumptionDate,
    }));

    return {
      success: true,
      data: reportData,
    };
  } catch (error) {
    console.error("getRawMaterialConsumption error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch raw material consumption",
      data: [],
    };
  }
}
