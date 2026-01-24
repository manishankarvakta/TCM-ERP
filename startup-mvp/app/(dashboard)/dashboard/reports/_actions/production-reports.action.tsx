"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma, ProductionOrderStatus } from "@prisma/client";

/**
 * Get Production Order Summary Report
 */
export async function getProductionOrderSummary(
  filters: {
    status?: ProductionOrderStatus | "all";
    warehouseId?: string;
    itemId?: string;
    bomId?: string;
    dateFrom?: string;
    dateTo?: string;
    dateRangeType?: "created" | "completed";
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

    const where: Prisma.ProductionOrderWhereInput = {
      isTrash: false,
      ...(filters.status && filters.status !== "all"
        ? { status: filters.status }
        : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      ...(filters.bomId ? { bomId: filters.bomId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            ...(filters.dateRangeType === "completed"
              ? {
                  completedAt: {
                    ...(filters.dateFrom
                      ? { gte: new Date(filters.dateFrom) }
                      : {}),
                    ...(filters.dateTo
                      ? {
                          lte: new Date(
                            new Date(filters.dateTo).setHours(23, 59, 59, 999)
                          ),
                        }
                      : {}),
                  },
                }
              : {
                  createdAt: {
                    ...(filters.dateFrom
                      ? { gte: new Date(filters.dateFrom) }
                      : {}),
                    ...(filters.dateTo
                      ? {
                          lte: new Date(
                            new Date(filters.dateTo).setHours(23, 59, 59, 999)
                          ),
                        }
                      : {}),
                  },
                }),
          }
        : {}),
    };

    const skip = (pagination.page - 1) * pagination.limit;

    const [orders, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        include: {
          bom: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
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
          voucher: {
            select: {
              id: true,
              voucherNumber: true,
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
      prisma.productionOrder.count({ where }),
    ]);

    // Get raw material costs from vouchers
    const reportData = await Promise.all(
      orders.map(async (order) => {
        let rawMaterialCost = 0;

        if (order.voucherId && order.voucher) {
          // Get journal entries for this voucher
          const journalEntry = await prisma.journalEntry.findFirst({
            where: { voucherId: order.voucherId },
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
            // Sum Raw Material Inventory credit amounts
            const rawMaterialLines = journalEntry.JournalEntryLine.filter(
              (line) =>
                line.ChartOfAccount.name.includes("Raw Material Inventory") &&
                Number(line.creditAmount) > 0
            );
            rawMaterialCost = rawMaterialLines.reduce(
              (sum, line) => sum + Number(line.creditAmount),
              0
            );
          }
        }

        return {
          productionOrderCode: order.code,
          bomName: order.bom.name,
          bomCode: order.bom.code,
          finishedGoodItem: order.item.name,
          finishedGoodItemCode: order.item.code,
          warehouse: order.warehouse.name,
          warehouseCode: order.warehouse.code,
          quantity: Number(order.quantity),
          status: order.status,
          createdDate: order.createdAt,
          completedDate: order.completedAt,
          rawMaterialCost: rawMaterialCost,
          createdBy: order.creator.name || order.creator.email,
        };
      })
    );

    // Get status breakdown
    const statusBreakdown = await prisma.productionOrder.groupBy({
      by: ["status"],
      where: {
        isTrash: false,
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters.dateFrom || filters.dateTo
          ? {
              createdAt: {
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
      _count: {
        id: true,
      },
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
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  } catch (error) {
    console.error("getProductionOrderSummary error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch production order summary",
      data: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      },
      statusBreakdown: [],
    };
  }
}

/**
 * Get Cost Per Batch Report
 */
export async function getCostPerBatch(filters: {
  itemId?: string;
  bomId?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
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

    const where: Prisma.ProductionOrderWhereInput = {
      isTrash: false,
      status: ProductionOrderStatus.COMPLETED,
      voucherId: { not: null }, // Only orders with accounting vouchers
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      ...(filters.bomId ? { bomId: filters.bomId } : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            completedAt: {
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
    };

    const orders = await prisma.productionOrder.findMany({
      where,
      include: {
        bom: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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
        voucher: {
          select: {
            id: true,
            voucherNumber: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    // Calculate cost per batch
    const reportData = await Promise.all(
      orders.map(async (order) => {
        let rawMaterialCost = 0;

        if (order.voucherId && order.voucher) {
          const journalEntry = await prisma.journalEntry.findFirst({
            where: { voucherId: order.voucherId },
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
            rawMaterialCost = rawMaterialLines.reduce(
              (sum, line) => sum + Number(line.creditAmount),
              0
            );
          }
        }

        const quantity = Number(order.quantity);
        const costPerUnit = quantity > 0 ? rawMaterialCost / quantity : 0;

        return {
          productionOrderCode: order.code,
          finishedGoodItem: order.item.name,
          finishedGoodItemCode: order.item.code,
          bomName: order.bom.name,
          bomCode: order.bom.code,
          batchQuantity: quantity,
          rawMaterialCost: rawMaterialCost,
          costPerUnit: costPerUnit,
          completionDate: order.completedAt,
          warehouse: order.warehouse.name,
          warehouseCode: order.warehouse.code,
        };
      })
    );

    return {
      success: true,
      data: reportData,
    };
  } catch (error) {
    console.error("getCostPerBatch error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch cost per batch",
      data: [],
    };
  }
}
