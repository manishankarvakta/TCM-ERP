"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma, ItemType, SaleStatus } from "@prisma/client";

/**
 * Get Revenue by Client Report
 */
export async function getRevenueByClient(filters: {
  clientId?: string;
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

    const where: Prisma.SaleWhereInput = {
      status: SaleStatus.COMPLETED,
      isTrash: false,
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            date: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo
                ? {
                    lte: new Date(
                      new Date(filters.dateTo).setHours(23, 59, 59, 999)
                    ),
                  }
                : {}),
            },
          }
        : {}),
      ...(filters.itemType && filters.itemType !== "all"
        ? {
            items: {
              some: {
                item: {
                  itemType: filters.itemType,
                },
              },
            },
          }
        : {}),
    };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            clientCode: true,
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
        date: "desc",
      },
    });

    // Group by client
    const grouped = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        clientCode: string | null;
        sales: Array<{
          saleNumber: string;
          date: Date;
          grandTotal: number;
          itemCount: number;
          orderType: string;
        }>;
      }
    >();

    for (const sale of sales) {
      const clientId = sale.clientId;
      if (!grouped.has(clientId)) {
        grouped.set(clientId, {
          clientId,
          clientName: sale.client.name || "",
          clientCode: sale.client.clientCode,
          sales: [],
        });
      }

      const group = grouped.get(clientId)!;
      const itemCount = sale.items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      );

      group.sales.push({
        saleNumber: sale.saleNumber,
        date: sale.date,
        grandTotal: Number(sale.grandTotal),
        itemCount,
        orderType: sale.orderType || "RETAIL",
      });
    }

    // Calculate totals per client
    const reportData = Array.from(grouped.values()).map((group) => {
      const totalRevenue = group.sales.reduce(
        (sum, sale) => sum + sale.grandTotal,
        0
      );
      const totalItemsSold = group.sales.reduce(
        (sum, sale) => sum + sale.itemCount,
        0
      );
      // Filter out returns to get the true sales transaction count
      const salesCount = group.sales.filter(s => s.orderType !== "RETURN").length;
      const averageOrderValue = salesCount > 0 ? totalRevenue / salesCount : 0;
      const firstSaleDate = group.sales[group.sales.length - 1]?.date;
      const lastSaleDate = group.sales[0]?.date;

      return {
        clientName: group.clientName,
        clientCode: group.clientCode || "",
        totalSalesCount: salesCount,
        totalRevenue: totalRevenue,
        totalItemsSold: totalItemsSold,
        averageOrderValue: averageOrderValue,
        firstSaleDate: firstSaleDate || null,
        lastSaleDate: lastSaleDate || null,
      };
    });

    // Sort by total revenue descending
    reportData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      success: true,
      data: reportData,
    };
  } catch (error) {
    console.error("getRevenueByClient error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch revenue by client",
      data: [],
    };
  }
}

/**
 * Get Revenue by Item Report
 */
export async function getRevenueByItem(filters: {
  itemId?: string;
  itemType?: ItemType | "all";
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
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

    const where: Prisma.SaleItemWhereInput = {
      sale: {
        status: SaleStatus.COMPLETED,
        isTrash: false,
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters.dateFrom || filters.dateTo
          ? {
              date: {
                ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
                ...(filters.dateTo
                  ? {
                      lte: new Date(
                        new Date(filters.dateTo).setHours(23, 59, 59, 999)
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      },
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      ...(filters.itemType && filters.itemType !== "all"
        ? {
            item: {
              itemType: filters.itemType,
            },
          }
        : {}),
    };

    const saleItems = await prisma.saleItem.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            itemType: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            date: true,
          },
        },
      },
    });

    // Group by item
    const grouped = new Map<
      string,
      {
        itemId: string;
        itemCode: string;
        itemName: string;
        itemType: ItemType;
        unit: string;
        sales: Array<{
          quantity: number;
          amount: number;
          saleNumber: string;
        }>;
      }
    >();

    for (const saleItem of saleItems) {
      const itemId = saleItem.itemId;
      if (!grouped.has(itemId)) {
        grouped.set(itemId, {
          itemId,
          itemCode: saleItem.item.code,
          itemName: saleItem.item.name,
          itemType: saleItem.item.itemType,
          unit: saleItem.item.unit?.symbol || "",
          sales: [],
        });
      }

      const group = grouped.get(itemId)!;
      group.sales.push({
        quantity: Number(saleItem.quantity),
        amount: Number(saleItem.amount),
        saleNumber: saleItem.sale.saleNumber,
      });
    }

    // Calculate totals and get COGS from accounting
    const reportData = await Promise.all(
      Array.from(grouped.values()).map(async (group) => {
        const totalQuantitySold = group.sales.reduce(
          (sum, sale) => sum + sale.quantity,
          0
        );
        const totalRevenue = group.sales.reduce(
          (sum, sale) => sum + sale.amount,
          0
        );
        const salesCount = group.sales.length;
        const averageUnitPrice =
          totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : 0;

        // Get COGS from accounting entries (for finished goods)
        let totalCOGS = 0;
        if (group.itemType === ItemType.READY_PRODUCT) {
          // Find all sales for this item and get their vouchers
          const sales = await prisma.sale.findMany({
            where: {
              status: SaleStatus.COMPLETED,
              items: {
                some: {
                  itemId: group.itemId,
                },
              },
            },
            select: {
              id: true,
              voucherId: true,
            },
          });

          for (const sale of sales) {
            if (sale.voucherId) {
              const journalEntry = await prisma.journalEntry.findFirst({
                where: { voucherId: sale.voucherId },
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
                // Sum COGS debit amounts (additions) and subtract credit amounts (reversals)
                const cogsDebitLines = journalEntry.JournalEntryLine.filter(
                  (line) =>
                    line.ChartOfAccount.name.includes("Cost of Goods Sold") &&
                    Number(line.debitAmount) > 0
                );
                const cogsCreditLines = journalEntry.JournalEntryLine.filter(
                  (line) =>
                    line.ChartOfAccount.name.includes("Cost of Goods Sold") &&
                    Number(line.creditAmount) > 0
                );
                const saleCOGS = cogsDebitLines.reduce(
                  (sum, line) => sum + Number(line.debitAmount),
                  0
                ) - cogsCreditLines.reduce(
                  (sum, line) => sum + Number(line.creditAmount),
                  0
                );
                totalCOGS += saleCOGS;
              }
            }
          }
        }

        const grossProfit = totalRevenue - totalCOGS;
        const grossProfitMargin =
          totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
          itemCode: group.itemCode,
          itemName: group.itemName,
          itemType: group.itemType,
          totalQuantitySold: totalQuantitySold,
          unit: group.unit,
          totalRevenue: totalRevenue,
          averageUnitPrice: averageUnitPrice,
          numberOfSales: salesCount,
          cogs: totalCOGS,
          grossProfit: grossProfit,
          grossProfitMargin: grossProfitMargin,
        };
      })
    );

    // Sort by total revenue descending
    reportData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      success: true,
      data: reportData,
    };
  } catch (error) {
    console.error("getRevenueByItem error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch revenue by item",
      data: [],
    };
  }
}

/**
 * Get Sales Trends Report
 */
export async function getSalesTrends(filters: {
  dateFrom: string;
  dateTo: string;
  groupingPeriod: "daily" | "weekly" | "monthly";
  clientId?: string;
  warehouseId?: string;
  itemType?: ItemType | "all";
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

    const where: Prisma.SaleWhereInput = {
      status: SaleStatus.COMPLETED,
      isTrash: false,
      date: {
        gte: new Date(filters.dateFrom),
        lte: new Date(
          new Date(filters.dateTo).setHours(23, 59, 59, 999)
        ),
      },
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.itemType && filters.itemType !== "all"
        ? {
            items: {
              some: {
                item: {
                  itemType: filters.itemType,
                },
              },
            },
          }
        : {}),
    };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: true,
        client: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Group by period
    const grouped = new Map<string, {
      period: string;
      sales: Array<{
        grandTotal: number;
        itemCount: number;
        clientId: string;
        orderType: string;
      }>;
    }>();

    for (const sale of sales) {
      let periodKey: string;
      const saleDate = new Date(sale.date);

      if (filters.groupingPeriod === "daily") {
        periodKey = saleDate.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (filters.groupingPeriod === "weekly") {
        const weekStart = new Date(saleDate);
        weekStart.setDate(saleDate.getDate() - saleDate.getDay()); // Start of week (Sunday)
        periodKey = `Week of ${weekStart.toISOString().split("T")[0]}`;
      } else {
        // Monthly
        periodKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, {
          period: periodKey,
          sales: [],
        });
      }

      const group = grouped.get(periodKey)!;
      const itemCount = sale.items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      );

      group.sales.push({
        grandTotal: Number(sale.grandTotal),
        itemCount,
        clientId: sale.clientId,
        orderType: sale.orderType || "RETAIL",
      });
    }

    // Calculate metrics per period
    const reportData = Array.from(grouped.values())
      .map((group) => {
        // Filter out return sales when calculating transaction count
        const numberOfSales = group.sales.filter(s => s.orderType !== "RETURN").length;
        const totalRevenue = group.sales.reduce(
          (sum, sale) => sum + sale.grandTotal,
          0
        );
        const averageOrderValue =
          numberOfSales > 0 ? totalRevenue / numberOfSales : 0;
        const numberOfItemsSold = group.sales.reduce(
          (sum, sale) => sum + sale.itemCount,
          0
        );
        const uniqueClients = new Set(
          group.sales.map((sale) => sale.clientId)
        ).size;

        return {
          period: group.period,
          numberOfSales,
          totalRevenue,
          averageOrderValue,
          numberOfItemsSold,
          numberOfClients: uniqueClients,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    // Calculate trend indicators (compare with previous period)
    const dataWithTrends = reportData.map((item, index) => {
      if (index === 0) {
        return {
          ...item,
          revenueTrend: null as number | null,
        };
      }

      const previousRevenue = reportData[index - 1].totalRevenue;
      const revenueTrend =
        previousRevenue > 0
          ? ((item.totalRevenue - previousRevenue) / previousRevenue) * 100
          : 0;

      return {
        ...item,
        revenueTrend,
      };
    });

    return {
      success: true,
      data: dataWithTrends,
    };
  } catch (error) {
    console.error("getSalesTrends error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch sales trends",
      data: [],
    };
  }
}
