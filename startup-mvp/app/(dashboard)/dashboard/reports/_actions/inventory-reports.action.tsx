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
    const reportData = stocks.map((stock: any) => {
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
        (item: any) => item.availableQuantity < filters.lowStockThreshold!
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
        itemCode: entry.item?.code || "",
        itemName: entry.item?.name || "",
        warehouse: entry.warehouse?.name || "",
        warehouseCode: entry.warehouse?.code || "",
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
  page?: number;
  limit?: number;
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
      const key = `${entry.item?.id}_${entry.warehouse?.id}`;
      const quantity = Math.abs(Number(entry.quantity));
      const rate = entry.rate ? Number(entry.rate) : 0;
      const cost = quantity * rate;

      if (!grouped.has(key)) {
        grouped.set(key, {
          itemId: entry.item?.id || "",
          itemCode: entry.item?.code || "",
          itemName: entry.item?.name || "",
          warehouseId: entry.warehouse?.id || "",
          warehouse: entry.warehouse?.name || "",
          warehouseCode: entry.warehouse?.code || "",
          unit: entry.item?.unit?.symbol || "",
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

    const total = reportData.length;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const paginatedData = reportData.slice(skip, skip + limit);

    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

/**
 * Get Stock Movements Report (Opening, Inward, Outward, Closing)
 */
export async function getStockMovements(
  filters: {
    warehouseId?: string;
    search?: string;
    date?: string; // Target day fallback (e.g. YYYY-MM-DD)
    startDate?: string;
    endDate?: string;
    itemType?: string;
  },
  pagination: {
    page: number;
    limit: number;
  } = { page: 1, limit: 20 }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "inventory.stock-movements", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view reports",
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }

    const targetStartDateStr = filters.startDate || filters.date || new Date().toISOString().split("T")[0];
    const targetEndDateStr = filters.endDate || filters.date || new Date().toISOString().split("T")[0];

    const startDate = new Date(targetStartDateStr);
    const endDate = new Date(targetEndDateStr);
    
    // Set boundaries in local server time
    const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    const itemWhere: Prisma.ItemWhereInput = {
      trackInventory: true,
      isTrash: false,
      status: "active",
      ...(filters.itemType && filters.itemType !== "all"
        ? { itemType: filters.itemType as ItemType }
        : {}),
      ...(filters.warehouseId && filters.warehouseId !== "all"
        ? {
            OR: [
              // Direct item stocks/ledgers in target warehouse
              { stocks: { some: { warehouseId: filters.warehouseId } } },
              { stockLedgers: { some: { warehouseId: filters.warehouseId } } },
              // Nested variant stocks/ledgers in target warehouse
              { variants: { some: { stocks: { some: { warehouseId: filters.warehouseId } } } } },
              { variants: { some: { stockLedgers: { some: { warehouseId: filters.warehouseId } } } } },
            ],
          }
        : {}),
      ...(filters.search
        ? (() => {
            const trimmed = filters.search.trim();
            const words = trimmed.split(/\s+/).filter(Boolean);
            const conditions: Prisma.ItemWhereInput[] = [
              { name: { contains: trimmed, mode: "insensitive" as const } },
              { code: { contains: trimmed, mode: "insensitive" as const } },
              { barcode: { contains: trimmed, mode: "insensitive" as const } },
              { variants: { some: { sku: { contains: trimmed, mode: "insensitive" as const } } } },
              { variants: { some: { barcode: { contains: trimmed, mode: "insensitive" as const } } } },
            ];
            if (words.length > 1) {
              conditions.push({
                AND: words.map((w) => ({
                  OR: [
                    { name: { contains: w, mode: "insensitive" as const } },
                    { code: { contains: w, mode: "insensitive" as const } },
                    { barcode: { contains: w, mode: "insensitive" as const } },
                    { variants: { some: { sku: { contains: w, mode: "insensitive" as const } } } },
                    { variants: { some: { barcode: { contains: w, mode: "insensitive" as const } } } },
                  ],
                })),
              });
            }
            return { OR: conditions };
          })()
        : {}),
    };

    const items = await prisma.item.findMany({
      where: itemWhere,
      include: {
        unit: { select: { symbol: true } },
        variants: {
          select: { id: true, sku: true, barcode: true, color: true, size: true, costPrice: true },
        },
      },
      orderBy: { code: "asc" },
    });

    const itemIds = items.map((i) => i.id);
    const variantIds = items
      .flatMap((i) => i.variants.map((v) => v.id))
      .filter(Boolean) as string[];

    const warehouses =
      filters.warehouseId && filters.warehouseId !== "all"
        ? await prisma.warehouse.findMany({
            where: { id: filters.warehouseId, isTrash: false },
            select: { id: true, name: true, code: true },
          })
        : await prisma.warehouse.findMany({
            where: { status: "active", isTrash: false },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" },
          });

    // Query ledger entries up to end of selected day for items/variants and warehouses
    const ledgerEntries = await prisma.stockLedger.findMany({
      where: {
        warehouseId: { in: warehouses.map((w) => w.id) },
        OR: [
          { itemId: { in: itemIds } },
          { variantId: { in: variantIds } },
        ],
        createdAt: { lte: endOfDay },
      },
      select: {
        itemId: true,
        variantId: true,
        warehouseId: true,
        quantity: true,
        createdAt: true,
        referenceType: true,
      },
    });

    const reportData: any[] = [];
    const summaryTotals = {
      opening: 0,
      inward: 0,
      outward: 0,
      closing: 0,
      value: 0,
      itemsCount: 0,
      inwardValue: 0,
      outwardValue: 0,
    };

    for (const warehouse of warehouses) {
      for (const item of items) {
        const hasVariants = item.variants && item.variants.length > 0;

        if (hasVariants) {
          const searchLower = (filters.search || "").trim().toLowerCase();
          const searchWords = searchLower.split(/\s+/).filter(Boolean);

          const normName = (item.name || "").toLowerCase();
          const normCode = (item.code || "").toLowerCase();
          const normBarcode = (item.barcode || "").toLowerCase();

          const parentMatchesFull = searchLower
            ? normName.includes(searchLower) || normCode.includes(searchLower) || normBarcode.includes(searchLower)
            : true;
          const parentMatchesWords = searchWords.length > 1
            ? searchWords.every((w) => normName.includes(w) || normCode.includes(w) || normBarcode.includes(w))
            : parentMatchesFull;
          const parentMatches = parentMatchesFull || parentMatchesWords;

          for (const variant of item.variants) {
            if (searchLower && !parentMatches) {
              const vSku = (variant.sku || "").toLowerCase();
              const vBarcode = (variant.barcode || "").toLowerCase();
              const vColor = (variant.color || "").toLowerCase();
              const vSize = (variant.size || "").toLowerCase();

              const vMatchFull = vSku.includes(searchLower) || vBarcode.includes(searchLower) || `${normName} ${vColor} ${vSize}`.includes(searchLower);
              const vMatchWords = searchWords.length > 1 && searchWords.every((w) => vSku.includes(w) || vBarcode.includes(w) || normName.includes(w) || vColor.includes(w) || vSize.includes(w));

              if (!vMatchFull && !vMatchWords) {
                continue;
              }
            }
            const variantLedger = ledgerEntries.filter(
              (le) => le.variantId === variant.id && le.warehouseId === warehouse.id
            );

            let opening = 0;
            let inward = 0;
            let outward = 0;
            let grnIn = 0;
            let salesReturnIn = 0;
            let tpnIn = 0;
            let adjIn = 0;
            let otherIn = 0;

            let salesOut = 0;
            let rtvOut = 0;
            let tpnOut = 0;
            let damageOut = 0;
            let adjOut = 0;
            let otherOut = 0;

            for (const entry of variantLedger) {
              const qty = Number(entry.quantity);
              if (entry.createdAt < startOfDay) {
                opening += qty;
              } else {
                const refType = (entry.referenceType || "").toUpperCase();
                if (qty > 0) {
                  inward += qty;
                  if (refType === "GRN" || refType === "PURCHASE") {
                    grnIn += qty;
                  } else if (refType === "SALE_RETURN") {
                    salesReturnIn += qty;
                  } else if (refType === "TPN") {
                    tpnIn += qty;
                  } else if (refType === "ADJUSTMENT") {
                    adjIn += qty;
                  } else {
                    otherIn += qty;
                  }
                } else {
                  const absQty = Math.abs(qty);
                  outward += absQty;
                  if (refType === "SALE" || refType === "SALE_VOID") {
                    salesOut += absQty;
                  } else if (refType === "PURCHASE_RETURN") {
                    rtvOut += absQty;
                  } else if (refType === "TPN") {
                    tpnOut += absQty;
                  } else if (refType === "DAMAGE") {
                    damageOut += absQty;
                  } else if (refType === "ADJUSTMENT") {
                    adjOut += absQty;
                  } else {
                    otherOut += absQty;
                  }
                }
              }
            }

            const closing = opening + inward - outward;

            // Only show item variant at warehouse if it has history or movements
            if (opening !== 0 || inward !== 0 || outward !== 0 || closing !== 0) {
              const cost = Number(variant.costPrice || item.costPrice || 0);
              const totalValue = closing * cost;
              const inwardValue = inward * cost;
              const outwardValue = outward * cost;

              summaryTotals.opening += opening;
              summaryTotals.inward += inward;
              summaryTotals.outward += outward;
              summaryTotals.closing += closing;
              summaryTotals.value += totalValue;
              summaryTotals.inwardValue += inwardValue;
              summaryTotals.outwardValue += outwardValue;
              summaryTotals.itemsCount += 1;

              reportData.push({
                id: `${variant.id}_${warehouse.id}`,
                itemCode: variant.sku,
                itemName: `${item.name} (${variant.color} / ${variant.size})`,
                warehouse: warehouse.name,
                warehouseCode: warehouse.code,
                openingQuantity: opening,
                inwardQuantity: inward,
                grnIn,
                salesReturnIn,
                tpnIn,
                adjIn,
                otherIn,
                outwardQuantity: outward,
                salesOut,
                rtvOut,
                tpnOut,
                damageOut,
                adjOut,
                otherOut,
                closingQuantity: closing,
                unit: item.unit?.symbol || "pcs",
                unitCost: cost,
                totalValue: totalValue,
              });
            }
          }
        } else {
          const itemLedger = ledgerEntries.filter(
            (le) => le.itemId === item.id && !le.variantId && le.warehouseId === warehouse.id
          );

          let opening = 0;
          let inward = 0;
          let outward = 0;
          let grnIn = 0;
          let salesReturnIn = 0;
          let tpnIn = 0;
          let adjIn = 0;
          let otherIn = 0;

          let salesOut = 0;
          let rtvOut = 0;
          let tpnOut = 0;
          let damageOut = 0;
          let adjOut = 0;
          let otherOut = 0;

          for (const entry of itemLedger) {
            const qty = Number(entry.quantity);
            if (entry.createdAt < startOfDay) {
              opening += qty;
            } else {
              const refType = (entry.referenceType || "").toUpperCase();
              if (qty > 0) {
                inward += qty;
                if (refType === "GRN" || refType === "PURCHASE") {
                  grnIn += qty;
                } else if (refType === "SALE_RETURN") {
                  salesReturnIn += qty;
                } else if (refType === "TPN") {
                  tpnIn += qty;
                } else if (refType === "ADJUSTMENT") {
                  adjIn += qty;
                } else {
                  otherIn += qty;
                }
              } else {
                const absQty = Math.abs(qty);
                outward += absQty;
                if (refType === "SALE" || refType === "SALE_VOID") {
                  salesOut += absQty;
                } else if (refType === "PURCHASE_RETURN") {
                  rtvOut += absQty;
                } else if (refType === "TPN") {
                  tpnOut += absQty;
                } else if (refType === "DAMAGE") {
                  damageOut += absQty;
                } else if (refType === "ADJUSTMENT") {
                  adjOut += absQty;
                } else {
                  otherOut += absQty;
                }
              }
            }
          }

          const closing = opening + inward - outward;

          if (opening !== 0 || inward !== 0 || outward !== 0 || closing !== 0) {
            const cost = Number(item.costPrice || 0);
            const totalValue = closing * cost;
            const inwardValue = inward * cost;
            const outwardValue = outward * cost;

            summaryTotals.opening += opening;
            summaryTotals.inward += inward;
            summaryTotals.outward += outward;
            summaryTotals.closing += closing;
            summaryTotals.value += totalValue;
            summaryTotals.inwardValue += inwardValue;
            summaryTotals.outwardValue += outwardValue;
            summaryTotals.itemsCount += 1;

            reportData.push({
              id: `${item.id}_${warehouse.id}`,
              itemCode: item.code,
              itemName: item.name,
              warehouse: warehouse.name,
              warehouseCode: warehouse.code,
              openingQuantity: opening,
              inwardQuantity: inward,
              grnIn,
              salesReturnIn,
              tpnIn,
              adjIn,
              otherIn,
              outwardQuantity: outward,
              salesOut,
              rtvOut,
              tpnOut,
              damageOut,
              adjOut,
              otherOut,
              closingQuantity: closing,
              unit: item.unit?.symbol || "pcs",
              unitCost: cost,
              totalValue: totalValue,
            });
          }
        }
      }
    }

    const totalRows = reportData.length;
    const isPaginated = pagination.limit > 0;
    const skip = isPaginated ? (pagination.page - 1) * pagination.limit : 0;
    const paginatedData = isPaginated
      ? reportData.slice(skip, skip + pagination.limit)
      : reportData;

    return {
      success: true,
      data: paginatedData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalRows,
        totalPages: pagination.limit > 0 ? Math.ceil(totalRows / pagination.limit) : 1,
      },
      summaryTotals,
    };
  } catch (error) {
    console.error("getStockMovements error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock movements",
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

