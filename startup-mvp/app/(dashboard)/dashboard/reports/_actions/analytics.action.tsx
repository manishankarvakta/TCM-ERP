"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma, ItemType } from "@prisma/client";

/**
 * Get Analytics Data
 */
export async function getAnalyticsData(filters: {
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  itemType?: ItemType | "all";
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        data: null,
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "reports.view", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view reports",
        data: null,
      };
    }

    const dateFrom = filters.dateFrom
      ? new Date(filters.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const dateTo = filters.dateTo
      ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
      : new Date();

    const where: Prisma.StockWhereInput = {
      item: {
        trackInventory: true,
        ...(filters.itemType && filters.itemType !== "all"
          ? { itemType: filters.itemType }
          : {}),
      },
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    };

    // Inventory Analytics
    const [stocks, stockMovements] = await Promise.all([
      prisma.stock.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              itemType: true,
              costPrice: true,
            },
          },
        },
      }),
      prisma.stockLedger.findMany({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
          ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    // Calculate stock value by item type
    const stockValueByType = stocks.reduce(
      (acc, stock) => {
        const value = Number(stock.quantity) * (stock.item?.costPrice ? Number(stock.item?.costPrice) : 0);
        const type = (stock.item?.itemType as ItemType) || "RAW_MATERIAL";
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type] += value;
        return acc;
      },
      {} as Record<ItemType, number>
    );

    // Top 10 items by value
    const itemsByValue = stocks
      .map((stock) => ({
        itemCode: stock.item?.code || "",
        itemName: stock.item?.name || "",
        value: Number(stock.quantity) * (stock.item?.costPrice ? Number(stock.item?.costPrice) : 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Low stock alerts (items with available quantity < 10)
    const lowStockItems = stocks
      .filter((stock) => {
        const available = Number(stock.quantity) - Number(stock.reservedQuantity);
        return available < 10;
      })
      .map((stock) => ({
        itemCode: stock.item?.code || "",
        itemName: stock.item?.name || "",
        availableQuantity: Number(stock.quantity) - Number(stock.reservedQuantity),
      }))
      .slice(0, 10);

    // Stock movement trends (last 30 days)
    const movementTrends = new Map<string, { date: string; in: number; out: number }>();
    for (const movement of stockMovements) {
      const dateKey = new Date(movement.createdAt).toISOString().split("T")[0];
      if (!movementTrends.has(dateKey)) {
        movementTrends.set(dateKey, { date: dateKey, in: 0, out: 0 });
      }
      const trend = movementTrends.get(dateKey)!;
      const qty = Math.abs(Number(movement.quantity));
      if (Number(movement.quantity) > 0) {
        trend.in += qty;
      } else {
        trend.out += qty;
      }
    }

    // Sales Analytics
    const salesWhere: Prisma.SaleWhereInput = {
      status: "COMPLETED",
      isTrash: false,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    };

    const [sales, saleItems] = await Promise.all([
      prisma.sale.findMany({
        where: salesWhere,
        include: {
          client: {
            select: {
              id: true,
            },
          },
          items: {
            include: {
              item: {
                select: {
                  itemType: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.saleItem.findMany({
        where: {
          sale: salesWhere,
          ...(filters.itemType && filters.itemType !== "all"
            ? {
                item: {
                  itemType: filters.itemType,
                },
              }
            : {}),
        },
        include: {
          item: {
            select: {
              itemType: true,
            },
          },
        },
      }),
    ]);

    // Revenue trend (last 12 months)
    const revenueTrend = new Map<string, number>();
    for (const sale of sales) {
      const monthKey = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, "0")}`;
      const current = revenueTrend.get(monthKey) || 0;
      revenueTrend.set(monthKey, current + Number(sale.grandTotal));
    }

    // Revenue by item type
    const revenueByItemType = saleItems.reduce(
      (acc, item) => {
        const type = item.item.itemType;
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type] += Number(item.amount);
        return acc;
      },
      {} as Record<ItemType, number>
    );

    // Top 10 clients by revenue
    const clientRevenue = new Map<string, { clientId: string; revenue: number }>();
    for (const sale of sales) {
      const current = clientRevenue.get(sale.clientId) || { clientId: sale.clientId, revenue: 0 };
      current.revenue += Number(sale.grandTotal);
      clientRevenue.set(sale.clientId, current);
    }
    const topClients = Array.from(clientRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get client names
    const clientIds = topClients.map((c) => c.clientId);
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });
    const clientMap = new Map(clients.map((c) => [c.id, c.name || ""]));
    const topClientsWithNames = topClients.map((c) => ({
      clientName: clientMap.get(c.clientId) || "Unknown",
      revenue: c.revenue,
    }));

    // Sales by warehouse
    const salesByWarehouse = new Map<string, number>();
    for (const sale of sales) {
      const current = salesByWarehouse.get(sale.warehouseId) || 0;
      salesByWarehouse.set(sale.warehouseId, current + Number(sale.grandTotal));
    }

    // Production Analytics
    const productionWhere: Prisma.ProductionOrderWhereInput = {
      isTrash: false,
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [productionOrders, completedProductions] = await Promise.all([
      prisma.productionOrder.findMany({
        where: productionWhere,
        select: {
          id: true,
          status: true,
        },
      }),
      prisma.productionOrder.findMany({
        where: {
          ...productionWhere,
          status: "COMPLETED",
          completedAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          voucher: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    // Production orders by status
    const ordersByStatus = productionOrders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Production volume trend
    const productionVolumeTrend = new Map<string, number>();
    for (const production of completedProductions) {
      if (production.completedAt) {
        const monthKey = `${production.completedAt.getFullYear()}-${String(production.completedAt.getMonth() + 1).padStart(2, "0")}`;
        const current = productionVolumeTrend.get(monthKey) || 0;
        const quantity = Number(production.quantity);
        if (!isNaN(quantity) && isFinite(quantity) && quantity >= 0) {
          productionVolumeTrend.set(monthKey, current + quantity);
        }
      }
    }

    // Cost per batch trend
    const costPerBatchTrend: Array<{ period: string; averageCost: number }> = [];
    const costByPeriod = new Map<string, Array<number>>();
    for (const production of completedProductions) {
      if (production.completedAt && production.voucherId) {
        const monthKey = `${production.completedAt.getFullYear()}-${String(production.completedAt.getMonth() + 1).padStart(2, "0")}`;
        const journalEntry = await prisma.journalEntry.findFirst({
          where: { voucherId: production.voucherId },
          include: {
            JournalEntryLine: {
              include: {
                ChartOfAccount: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (journalEntry) {
          const rawMaterialLines = journalEntry.JournalEntryLine.filter(
            (line) =>
              line.ChartOfAccount.name.includes("Raw Material Inventory") &&
              Number(line.creditAmount) > 0
          );
          const cost = rawMaterialLines.reduce(
            (sum, line) => {
              const amount = Number(line.creditAmount);
              return sum + (isNaN(amount) || !isFinite(amount) ? 0 : amount);
            },
            0
          );
          const quantity = Number(production.quantity);
          const costPerUnit =
            quantity > 0 && !isNaN(cost) && isFinite(cost)
              ? cost / quantity
              : 0;

          // Only add valid cost per unit values
          if (!isNaN(costPerUnit) && isFinite(costPerUnit) && costPerUnit >= 0) {
            if (!costByPeriod.has(monthKey)) {
              costByPeriod.set(monthKey, []);
            }
            costByPeriod.get(monthKey)!.push(costPerUnit);
          }
        }
      }
    }

    for (const [period, costs] of costByPeriod.entries()) {
      if (costs.length > 0) {
        const validCosts = costs.filter((c) => !isNaN(c) && isFinite(c));
        if (validCosts.length > 0) {
          const averageCost = validCosts.reduce((sum, c) => sum + c, 0) / validCosts.length;
          if (!isNaN(averageCost) && isFinite(averageCost)) {
            costPerBatchTrend.push({ period, averageCost });
          }
        }
      }
    }
    costPerBatchTrend.sort((a, b) => a.period.localeCompare(b.period));

    // Top 10 finished goods by production volume
    const fgProductionVolume = new Map<string, { itemCode: string; itemName: string; volume: number }>();
    for (const production of completedProductions) {
      const itemId = production.itemId;
      if (!fgProductionVolume.has(itemId)) {
        fgProductionVolume.set(itemId, {
          itemCode: production.item.code,
          itemName: production.item.name,
          volume: 0,
        });
      }
      const item = fgProductionVolume.get(itemId)!;
      item.volume += Number(production.quantity);
    }
    const topFinishedGoods = Array.from(fgProductionVolume.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    return {
      success: true,
      data: {
        inventory: {
          stockValueByType: Object.entries(stockValueByType).map(([type, value]) => ({
            type,
            value,
          })),
          topItemsByValue: itemsByValue,
          lowStockAlerts: lowStockItems,
          movementTrends: Array.from(movementTrends.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
          ),
        },
        sales: {
          revenueTrend: Array.from(revenueTrend.entries())
            .map(([period, revenue]) => ({ period, revenue }))
            .sort((a, b) => a.period.localeCompare(b.period)),
          revenueByItemType: Object.entries(revenueByItemType).map(([type, revenue]) => ({
            type,
            revenue,
          })),
          topClientsByRevenue: topClientsWithNames,
          salesByWarehouse: Array.from(salesByWarehouse.entries()).map(([warehouseId, revenue]) => ({
            warehouseId,
            revenue,
          })),
        },
        production: {
          ordersByStatus: Object.entries(ordersByStatus).map(([status, count]) => ({
            status,
            count,
          })),
          volumeTrend: Array.from(productionVolumeTrend.entries())
            .map(([period, volume]) => ({ period, volume }))
            .sort((a, b) => a.period.localeCompare(b.period)),
          costPerBatchTrend,
          topFinishedGoods,
        },
      },
    };
  } catch (error) {
    console.error("getAnalyticsData error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch analytics data",
      data: null,
    };
  }
}
