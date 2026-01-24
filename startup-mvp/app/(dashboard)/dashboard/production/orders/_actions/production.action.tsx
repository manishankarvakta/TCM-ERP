"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted, createUserLog, LogAction } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, ProductionOrderStatus, StockTransactionType, Prisma as PrismaClient, VoucherType } from "@prisma/client";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { findControlAccount } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/accounting-helpers";

/**
 * Generate unique Production Order code
 */
async function generateProductionCode(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `PROD-${year}-`;
  
  // Find last code with this pattern
  const lastOrder = await prisma.productionOrder.findFirst({
    where: { 
      code: { startsWith: pattern },
      isTrash: false,
    },
    orderBy: { code: "desc" },
  });
  
  let sequence = 1;
  if (lastOrder) {
    const parts = lastOrder.code.split("-");
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2] || "0");
      sequence = lastSeq + 1;
    }
  }
  
  return `PROD-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Calculate raw materials needed for production
 */
export async function calculateRawMaterialsNeeded(
  bomId: string,
  productionQuantity: number
) {
  try {
    // Get BOM by ID (not by itemId)
    const bom = await prisma.bOM.findUnique({
      where: { id: bomId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: {
                  select: {
                    symbol: true,
                  },
                },
                costPrice: true,
              },
            },
          },
        },
      },
    });

    if (!bom) {
      return {
        success: false,
        error: "BOM not found",
        materials: [],
      };
    }
    const materials = bom.items.map((bomItem) => {
      // Calculate: quantityRequired × productionQuantity / quantityPerUnit
      const quantityNeeded =
        (Number(bomItem.quantityRequired) * productionQuantity) /
        Number(bom.quantityPerUnit);

      return {
        itemId: bomItem.item.id,
        itemName: bomItem.item.name,
        itemCode: bomItem.item.code,
        unitSymbol: bomItem.item.unit.symbol,
        quantityRequired: Number(bomItem.quantityRequired),
        quantityNeeded: quantityNeeded,
        costPrice: bomItem.item.costPrice ? Number(bomItem.item.costPrice) : 0,
      };
    });

    return {
      success: true,
      materials,
    };
  } catch (error) {
    console.error("calculateRawMaterialsNeeded error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate materials",
      materials: [],
    };
  }
}

/**
 * Validate stock availability for raw materials
 */
export async function validateStockAvailability(
  materials: Array<{ itemId: string; quantityNeeded: number }>,
  warehouseId: string
) {
  try {
    const validationResults = [];
    let allAvailable = true;

    for (const material of materials) {
      const stock = await prisma.stock.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: material.itemId,
            warehouseId: warehouseId,
          },
        },
        include: {
          item: {
            select: {
              name: true,
              code: true,
              trackInventory: true,
            },
          },
        },
      });

      const availableQuantity = stock ? Number(stock.quantity) : 0;
      const isAvailable = availableQuantity >= material.quantityNeeded;

      if (!isAvailable) {
        allAvailable = false;
      }

      validationResults.push({
        itemId: material.itemId,
        itemName: stock?.item.name || "Unknown",
        itemCode: stock?.item.code || "Unknown",
        required: material.quantityNeeded,
        available: availableQuantity,
        isAvailable,
        trackInventory: stock?.item.trackInventory || false,
      });
    }

    return {
      success: true,
      allAvailable,
      results: validationResults,
    };
  } catch (error) {
    console.error("validateStockAvailability error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate stock",
      allAvailable: false,
      results: [],
    };
  }
}

/**
 * Get active BOMs for dropdown
 */
export async function getActiveBOMs() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", boms: [] };
    }

    const boms = await prisma.bOM.findMany({
      where: {
        status: "active",
        isTrash: false,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      boms: boms.map((bom) => ({
        id: bom.id,
        code: bom.code,
        name: bom.name,
        itemId: bom.itemId,
        itemName: bom.item.name,
        itemCode: bom.item.code,
        unitSymbol: bom.item.unit.symbol,
        quantityPerUnit: Number(bom.quantityPerUnit),
      })),
    };
  } catch (error) {
    console.error("getActiveBOMs error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch BOMs",
      boms: [],
    };
  }
}

/**
 * Get active warehouses for dropdown
 */
export async function getActiveWarehouses() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", warehouses: [] };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: {
        status: "active",
        isTrash: false,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    return {
      success: true,
      warehouses,
    };
  } catch (error) {
    console.error("getActiveWarehouses error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouses",
      warehouses: [],
    };
  }
}

/**
 * Get paginated list of production orders
 */
export async function getProductionOrders(
  page: number = 1,
  limit: number = 10,
  filters: {
    search?: string;
    status?: ProductionOrderStatus | "all";
    warehouseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        orders: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "production.orders", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view production orders",
        orders: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductionOrderWhereInput = {
      isTrash: false,
    };

    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: "insensitive" } },
        { item: { name: { contains: filters.search, mode: "insensitive" } } },
        { item: { code: { contains: filters.search, mode: "insensitive" } } },
        { bom: { name: { contains: filters.search, mode: "insensitive" } } },
        { warehouse: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Get total count
    const total = await prisma.productionOrder.count({ where });

    // Get orders
    const orders = await prisma.productionOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
        bom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            code: true,
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
    });

    const totalPages = Math.ceil(total / limit);

    // Convert Decimal to number
    const serializedOrders = orders.map((order) => ({
      ...order,
      quantity: Number(order.quantity),
    }));

    return {
      success: true,
      orders: serializedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getProductionOrders error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch production orders",
      orders: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get single production order by ID
 */
export async function getProductionOrderById(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        order: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "production.orders", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view production orders",
        order: null,
      };
    }

    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        bom: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: {
                  select: {
                    symbol: true,
                  },
                },
              },
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    unit: {
                      select: {
                        symbol: true,
                      },
                    },
                    costPrice: true,
                  },
                },
              },
            },
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            code: true,
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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Production order not found",
        order: null,
      };
    }

    // Convert Decimal to number
    const serializedOrder = {
      ...order,
      quantity: Number(order.quantity),
      bom: {
        ...order.bom,
        quantityPerUnit: Number(order.bom.quantityPerUnit),
        items: order.bom.items.map((item) => ({
          ...item,
          quantityRequired: Number(item.quantityRequired),
          item: {
            ...item.item,
            costPrice: item.item.costPrice ? Number(item.item.costPrice) : 0,
          },
        })),
      },
    };

    return {
      success: true,
      order: serializedOrder,
    };
  } catch (error) {
    console.error("getProductionOrderById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch production order",
      order: null,
    };
  }
}

/**
 * Create a new production order
 */
export async function createProductionOrder(input: {
  bomId: string;
  warehouseId: string;
  quantity: number;
  notes?: string | null;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        order: null,
      };
    }

    // Permission check
    const canCreate = await hasPermission(session.user.id, "production.orders", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create production orders",
        order: null,
      };
    }

    // Validate BOM exists and is active
    const bom = await prisma.bOM.findUnique({
      where: { id: input.bomId },
      include: {
        item: {
          select: {
            id: true,
            itemType: true,
            trackInventory: true,
          },
        },
      },
    });

    if (!bom) {
      return {
        success: false,
        error: "BOM not found",
        order: null,
      };
    }

    if (bom.status !== "active" || bom.isTrash) {
      return {
        success: false,
        error: "BOM is not active",
        order: null,
      };
    }

    // Validate warehouse exists and is active
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: input.warehouseId },
    });

    if (!warehouse) {
      return {
        success: false,
        error: "Warehouse not found",
        order: null,
      };
    }

    if (warehouse.status !== "active" || warehouse.isTrash) {
      return {
        success: false,
        error: "Warehouse is not active",
        order: null,
      };
    }

    // Validate quantity
    if (input.quantity <= 0) {
      return {
        success: false,
        error: "Quantity must be greater than 0",
        order: null,
      };
    }

    // Calculate raw materials needed (for warning, but allow creation)
    const materialsResult = await calculateRawMaterialsNeeded(input.bomId, input.quantity);
    const stockValidation = await validateStockAvailability(
      materialsResult.materials.map((m) => ({
        itemId: m.itemId,
        quantityNeeded: m.quantityNeeded,
      })),
      input.warehouseId
    );

    // Generate code
    const code = await generateProductionCode();

    // Create production order
    const order = await prisma.productionOrder.create({
      data: {
        code,
        bomId: input.bomId,
        itemId: bom.itemId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
        status: ProductionOrderStatus.PLANNED,
        notes: input.notes || null,
        createdBy: session.user.id,
      },
      include: {
        bom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            code: true,
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
    });

    // Log and notify
    await logItemCreated(
      session.user.id,
      "ProductionOrder",
      order.code,
      `Created production order ${order.code} for ${bom.item.name}`
    );
    await notifyItemCreated(session.user.id, "Production Order", order.code);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/orders");

    // Convert Decimal to number
    const serializedOrder = {
      ...order,
      quantity: Number(order.quantity),
    };

    return {
      success: true,
      order: serializedOrder,
      stockWarnings: stockValidation.allAvailable
        ? null
        : stockValidation.results.filter((r) => !r.isAvailable),
    };
  } catch (error) {
    console.error("createProductionOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create production order",
      order: null,
    };
  }
}

/**
 * Update production order (only if status is PLANNED)
 */
export async function updateProductionOrder(
  id: string,
  input: {
    bomId?: string;
    warehouseId?: string;
    quantity?: number;
    notes?: string | null;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        order: null,
      };
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "production.orders", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit production orders",
        order: null,
      };
    }

    // Check order exists
    const existingOrder = await prisma.productionOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return {
        success: false,
        error: "Production order not found",
        order: null,
      };
    }

    // Can only edit if status is PLANNED
    if (existingOrder.status !== ProductionOrderStatus.PLANNED) {
      return {
        success: false,
        error: "Can only edit production orders with PLANNED status",
        order: null,
      };
    }

    // Validate BOM if provided
    if (input.bomId && input.bomId !== existingOrder.bomId) {
      const bom = await prisma.bOM.findUnique({
        where: { id: input.bomId },
      });

      if (!bom || bom.status !== "active" || bom.isTrash) {
        return {
          success: false,
          error: "BOM is not active",
          order: null,
        };
      }
    }

    // Validate warehouse if provided
    if (input.warehouseId && input.warehouseId !== existingOrder.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: input.warehouseId },
      });

      if (!warehouse || warehouse.status !== "active" || warehouse.isTrash) {
        return {
          success: false,
          error: "Warehouse is not active",
          order: null,
        };
      }
    }

    // Validate quantity if provided
    if (input.quantity !== undefined && input.quantity <= 0) {
      return {
        success: false,
        error: "Quantity must be greater than 0",
        order: null,
      };
    }

    // Update order
    const updateData: Prisma.ProductionOrderUpdateInput = {};
    if (input.bomId) updateData.bomId = input.bomId;
    if (input.warehouseId) updateData.warehouseId = input.warehouseId;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // If BOM changed, update itemId
    if (input.bomId) {
      const bom = await prisma.bOM.findUnique({
        where: { id: input.bomId },
        select: { itemId: true },
      });
      if (bom) {
        updateData.itemId = bom.itemId;
      }
    }

    const order = await prisma.productionOrder.update({
      where: { id },
      data: updateData,
      include: {
        bom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            code: true,
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
    });

    // Log and notify
    await logItemUpdated(
      session.user.id,
      "ProductionOrder",
      order.code,
      `Updated production order ${order.code}`
    );
    await notifyItemUpdated(session.user.id, "Production Order", order.code);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/orders");

    // Convert Decimal to number
    const serializedOrder = {
      ...order,
      quantity: Number(order.quantity),
    };

    return {
      success: true,
      order: serializedOrder,
    };
  } catch (error) {
    console.error("updateProductionOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update production order",
      order: null,
    };
  }
}

/**
 * Start production order (PLANNED → IN_PROGRESS)
 */
export async function startProductionOrder(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canStart = await hasPermission(session.user.id, "production.orders", "start");
    if (!canStart) {
      return {
        success: false,
        error: "You do not have permission to start production orders",
      };
    }

    // Check order exists
    const order = await prisma.productionOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return {
        success: false,
        error: "Production order not found",
      };
    }

    // Can only start if status is PLANNED
    if (order.status !== ProductionOrderStatus.PLANNED) {
      return {
        success: false,
        error: "Can only start production orders with PLANNED status",
      };
    }

    // Update status
    await prisma.productionOrder.update({
      where: { id },
      data: {
        status: ProductionOrderStatus.IN_PROGRESS,
      },
    });

    // --- WIP ACCOUNTING INTEGRATION ---
    // Calculate total raw material cost using latest prices
    const materialsResult = await calculateRawMaterialsNeeded(order.bomId, Number(order.quantity));
    let totalRawMaterialCost = 0;
    if (materialsResult.success) {
      totalRawMaterialCost = materialsResult.materials.reduce((sum, m) => sum + (m.quantityNeeded * m.costPrice), 0);
    }

    if (totalRawMaterialCost > 0) {
      const rawMaterialInventoryId = await findControlAccount("Raw Material Inventory");
      const wipAccountId = await findControlAccount("Work In Progress (WIP)");

      if (!rawMaterialInventoryId || !wipAccountId) {
        console.error("Missing control accounts for production start:", { 
          rawMaterialInventoryId, 
          wipAccountId 
        });
        // We log the error but don't fail the status change, as stock is still tracked
      } else {
        const voucherLines = [
          {
            lineNumber: 1,
            debitAmount: totalRawMaterialCost,
            creditAmount: 0,
            description: `Work In Progress - ${order.code}`,
            chartOfAccountId: wipAccountId,
          },
          {
            lineNumber: 2,
            debitAmount: 0,
            creditAmount: totalRawMaterialCost,
            description: `Raw Material Issue - ${order.code}`,
            chartOfAccountId: rawMaterialInventoryId,
          },
        ];

        const voucherResult = await createVoucher({
          date: new Date(),
          type: VoucherType.JOURNAL,
          reference: order.code,
          description: `Production Start ${order.code} - Move raw material cost to WIP`,
          lines: voucherLines,
        });

        if (voucherResult.success && voucherResult.voucher) {
          await postVoucher(voucherResult.voucher.id);
          
          // Log accounting move
          await createUserLog(
            session.user.id,
            LogAction.CREATE,
            "Voucher",
            voucherResult.voucher.id,
            `WIP Move: ${order.code} - ৳${totalRawMaterialCost.toLocaleString()}`,
            {
              productionOrderId: order.id,
              totalCost: totalRawMaterialCost,
              voucherNumber: voucherResult.voucher.voucherNumber
            }
          );
        } else {
          console.error("Failed to create WIP voucher for production start:", voucherResult.error);
        }
      }
    }
    // --- END WIP ACCOUNTING INTEGRATION ---

    // Log and notify
    await logItemUpdated(
      session.user.id,
      "ProductionOrder",
      order.code,
      `Started production order ${order.code}`
    );
    await notifyItemUpdated(session.user.id, "Production Order", order.code);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/orders");

    return { success: true };
  } catch (error) {
    console.error("startProductionOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start production order",
    };
  }
}

/**
 * Complete production order (IN_PROGRESS → COMPLETED)
 * Deducts raw materials and adds finished goods to stock
 */
export async function completeProductionOrder(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canComplete = await hasPermission(session.user.id, "production.orders", "complete");
    if (!canComplete) {
      return {
        success: false,
        error: "You do not have permission to complete production orders",
      };
    }

    // Get order with BOM and item cost prices
    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        bom: {
          include: {
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    trackInventory: true,
                    costPrice: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        item: {
          select: {
            id: true,
            trackInventory: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Production order not found",
      };
    }

    // Can only complete if status is IN_PROGRESS
    if (order.status !== ProductionOrderStatus.IN_PROGRESS) {
      return {
        success: false,
        error: "Can only complete production orders with IN_PROGRESS status",
      };
    }

    // Calculate raw materials needed
    const productionQuantity = Number(order.quantity);
    const bomQuantityPerUnit = Number(order.bom.quantityPerUnit);
    // Finished good quantity = quantity per unit × production quantity
    const finishedGoodQuantity = bomQuantityPerUnit * productionQuantity;

    // Prepare raw materials for stock deduction
    const rawMaterials: Array<{ itemId: string; quantity: number; warehouseId: string }> = [];
    for (const bomItem of order.bom.items) {
      if (!bomItem.item.trackInventory) continue;

      const quantityNeeded =
        (Number(bomItem.quantityRequired) * productionQuantity) / bomQuantityPerUnit;

      rawMaterials.push({
        itemId: bomItem.itemId,
        quantity: quantityNeeded,
        warehouseId: order.warehouseId,
      });
    }

    // Validate stock availability before transaction
    const stockValidation = await validateStockAvailability(
      rawMaterials.map((m) => ({
        itemId: m.itemId,
        quantityNeeded: m.quantity,
      })),
      order.warehouseId
    );

    if (!stockValidation.allAvailable) {
      const insufficientItems = stockValidation.results
        .filter((r) => !r.isAvailable)
        .map((r) => `${r.itemName} (required: ${r.required.toFixed(2)}, available: ${r.available.toFixed(2)})`)
        .join(", ");

      return {
        success: false,
        error: `Insufficient stock for: ${insufficientItems}`,
        stockValidation: stockValidation.results,
      };
    }

    // Use transaction to update stock and order status
    await prisma.$transaction(async (tx) => {
      // Deduct raw materials (OUT)
      for (const material of rawMaterials) {
        const stockItem = await tx.item.findUnique({
          where: { id: material.itemId },
          select: { trackInventory: true },
        });

        if (!stockItem || !stockItem.trackInventory) continue;

        // Update Stock
        const existingStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: material.itemId,
              warehouseId: material.warehouseId,
            },
          },
        });

        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                decrement: material.quantity,
              },
              lastUpdated: new Date(),
            },
          });
        }

        // Create StockLedger entry
        await tx.stockLedger.create({
          data: {
            itemId: material.itemId,
            warehouseId: material.warehouseId,
            transactionType: StockTransactionType.OUT,
            quantity: -material.quantity, // Negative for OUT
            referenceType: "PRODUCTION",
            referenceId: id,
            notes: `Production material issue - ${order.code}`,
            createdBy: session.user.id,
          },
        });
      }

      // Add finished goods (IN)
      if (order.item.trackInventory) {
        const existingStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: order.itemId,
              warehouseId: order.warehouseId,
            },
          },
        });

        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                increment: finishedGoodQuantity,
              },
              lastUpdated: new Date(),
            },
          });
        } else {
          await tx.stock.create({
            data: {
              itemId: order.itemId,
              warehouseId: order.warehouseId,
              quantity: finishedGoodQuantity,
              reservedQuantity: 0,
            },
          });
        }

        // Create StockLedger entry
        await tx.stockLedger.create({
          data: {
            itemId: order.itemId,
            warehouseId: order.warehouseId,
            transactionType: StockTransactionType.IN,
            quantity: finishedGoodQuantity,
            referenceType: "PRODUCTION",
            referenceId: id,
            notes: `Production finished goods receipt - ${order.code}`,
            createdBy: session.user.id,
          },
        });
      }

      // --- ACCOUNTING INTEGRATION (Within Transaction) ---
      // Calculate total raw material cost
      let totalRawMaterialCost = 0;
      for (const bomItem of order.bom.items) {
        if (!bomItem.item.trackInventory || !bomItem.item.costPrice) continue;
        const quantityNeeded = (Number(bomItem.quantityRequired) * productionQuantity) / bomQuantityPerUnit;
        totalRawMaterialCost += quantityNeeded * Number(bomItem.item.costPrice);
      }

      if (totalRawMaterialCost > 0) {
        const wipAccountId = await findControlAccount("Work In Progress (WIP)");
        const finishedGoodsInventoryId = await findControlAccount("Finished Goods Inventory");

        if (wipAccountId && finishedGoodsInventoryId) {
          const voucherResult = await createVoucher({
            date: new Date(),
            type: VoucherType.JOURNAL,
            reference: order.code,
            description: `Production ${order.code} - Move raw material cost to finished goods`,
            lines: [
              {
                lineNumber: 1,
                debitAmount: totalRawMaterialCost,
                creditAmount: 0,
                description: `Finished Goods Inventory - ${order.code}`,
                chartOfAccountId: finishedGoodsInventoryId,
              },
              {
                lineNumber: 2,
                debitAmount: 0,
                creditAmount: totalRawMaterialCost,
                description: `WIP Completion - ${order.code}`,
                chartOfAccountId: wipAccountId,
              },
            ],
          });

          if (voucherResult.success && voucherResult.voucher) {
            await postVoucher(voucherResult.voucher.id);
            
            // Link voucher to production order
            await tx.productionOrder.update({
              where: { id },
              data: { 
                status: ProductionOrderStatus.COMPLETED,
                completedAt: new Date(),
                voucherId: voucherResult.voucher.id 
              },
            });

            // Log activity
            await createUserLog(
              session.user.id,
              LogAction.CREATE,
              "Voucher",
              voucherResult.voucher.id,
              `Production Completion Voucher: ${order.code} - ৳${totalRawMaterialCost.toLocaleString()}`,
              {
                productionOrderId: order.id,
                totalCost: totalRawMaterialCost,
                voucherNumber: voucherResult.voucher.voucherNumber
              }
            );
          } else {
            throw new Error(`Failed to create accounting voucher: ${voucherResult.error}`);
          }
        } else {
          throw new Error("Missing control accounts for production completion (WIP or Finished Goods Inventory)");
        }
      } else {
        // Update order status if no cost to move
        await tx.productionOrder.update({
          where: { id },
          data: {
            status: ProductionOrderStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }
    });

    // Log and notify (after transaction)
    await logItemUpdated(
      session.user.id,
      "ProductionOrder",
      order.code,
      `Completed production order ${order.code} - Produced ${finishedGoodQuantity.toFixed(2)} ${order.item.name}`
    );
    await notifyItemUpdated(session.user.id, "Production Order", order.code);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/orders");

    return { success: true };
  } catch (error) {
    console.error("completeProductionOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete production order",
    };
  }
}

/**
 * Cancel production order
 */
export async function cancelProductionOrder(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canCancel = await hasPermission(session.user.id, "production.orders", "cancel");
    if (!canCancel) {
      return {
        success: false,
        error: "You do not have permission to cancel production orders",
      };
    }

    // Check order exists
    const order = await prisma.productionOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return {
        success: false,
        error: "Production order not found",
      };
    }

    // Can only cancel if status is PLANNED or IN_PROGRESS
    if (
      order.status !== ProductionOrderStatus.PLANNED &&
      order.status !== ProductionOrderStatus.IN_PROGRESS
    ) {
      return {
        success: false,
        error: "Can only cancel production orders with PLANNED or IN_PROGRESS status",
      };
    }

    // Update status
    await prisma.productionOrder.update({
      where: { id },
      data: {
        status: ProductionOrderStatus.CANCELLED,
      },
    });

    // --- WIP ACCOUNTING REVERSAL ---
    if (order.status === ProductionOrderStatus.IN_PROGRESS) {
      // Calculate total raw material cost to reverse
      const materialsResult = await calculateRawMaterialsNeeded(order.bomId, Number(order.quantity));
      let totalRawMaterialCost = 0;
      if (materialsResult.success) {
        totalRawMaterialCost = materialsResult.materials.reduce((sum, m) => sum + (m.quantityNeeded * m.costPrice), 0);
      }

      if (totalRawMaterialCost > 0) {
        const rawMaterialInventoryId = await findControlAccount("Raw Material Inventory");
        const wipAccountId = await findControlAccount("Work In Progress (WIP)");

        if (!rawMaterialInventoryId || !wipAccountId) {
          console.error("Missing control accounts for production cancellation reversal:", {
            rawMaterialInventoryId,
            wipAccountId
          });
        } else {
          const voucherLines = [
            {
              lineNumber: 1,
              debitAmount: 0,
              creditAmount: totalRawMaterialCost,
              description: `WIP Reversal (Cancelled) - ${order.code}`,
              chartOfAccountId: wipAccountId,
            },
            {
              lineNumber: 2,
              debitAmount: totalRawMaterialCost,
              creditAmount: 0,
              description: `Raw Material Return (Cancelled) - ${order.code}`,
              chartOfAccountId: rawMaterialInventoryId,
            },
          ];

          const voucherResult = await createVoucher({
            date: new Date(),
            type: VoucherType.JOURNAL,
            reference: order.code,
            description: `Production Cancelled ${order.code} - Reverse WIP to RM`,
            lines: voucherLines,
          });

          if (voucherResult.success && voucherResult.voucher) {
            await postVoucher(voucherResult.voucher.id);
            
            // Log reversal
            await createUserLog(
              session.user.id,
              LogAction.DELETE,
              "Voucher",
              voucherResult.voucher.id,
              `WIP Reversal (Cancelled): ${order.code} - ৳${totalRawMaterialCost.toLocaleString()}`,
              {
                productionOrderId: order.id,
                totalCost: totalRawMaterialCost,
                voucherNumber: voucherResult.voucher.voucherNumber
              }
            );
          } else {
            console.error("Failed to create WIP reversal voucher for production cancellation:", voucherResult.error);
          }
        }
      }
    }
    // --- END WIP ACCOUNTING REVERSAL ---

    // Log and notify
    await logItemDeleted(
      session.user.id,
      "ProductionOrder",
      order.code,
      `Cancelled production order ${order.code}`
    );
    await notifyItemUpdated(session.user.id, "Production Order", order.code);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/orders");

    return { success: true };
  } catch (error) {
    console.error("cancelProductionOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel production order",
    };
  }
}
