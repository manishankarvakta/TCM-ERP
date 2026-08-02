"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, StockTransactionType, Prisma as PrismaClient, VoucherType } from "@prisma/client";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";


/**
 * Update stock when GRN is confirmed
 */
export async function updateStockOnGRN(
  grnId: string,
  tx?: Prisma.TransactionClient
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const client = tx || prisma;

    // Get GRN with items
    const grn = await client.gRN.findUnique({
      where: { id: grnId },
      include: {
        items: {
          where: { itemId: { not: null } },
        },
      },
    });

    if (!grn) {
      return { success: false, error: "GRN not found" };
    }

    const targetWarehouseId = grn.warehouseId;

    const performUpdate = async (transaction: Prisma.TransactionClient) => {
      for (const grnItem of grn.items) {
        if (!grnItem.itemId) continue;

        const item = await transaction.item.findUnique({
          where: { id: grnItem.itemId },
          select: { trackInventory: true },
        });

        // Only update stock if item tracks inventory
        if (!item || !item.trackInventory) continue;

        const quantity = Number(grnItem.receivedQuantity);

        // Update or create Stock record
        const existingStock = grnItem.variantId ? await transaction.stock.findUnique({
          where: {
            variantId_warehouseId: {
              variantId: grnItem.variantId,
              warehouseId: targetWarehouseId,
            },
          },
        }) : await transaction.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: grnItem.itemId,
              warehouseId: targetWarehouseId,
            },
          },
        });

        if (existingStock) {
          await transaction.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                increment: quantity,
              },
              lastUpdated: new Date(),
            },
          });
        } else {
          await transaction.stock.create({
            data: {
              itemId: grnItem.variantId ? null : grnItem.itemId,
              variantId: grnItem.variantId || null,
              warehouseId: targetWarehouseId,
              quantity: quantity,
              reservedQuantity: 0,
            },
          });
        }

        // Create StockLedger entry
        await transaction.stockLedger.create({
          data: {
            itemId: grnItem.variantId ? null : grnItem.itemId,
            variantId: grnItem.variantId || null,
            warehouseId: targetWarehouseId,
            transactionType: StockTransactionType.IN,
            quantity: quantity,
            referenceType: "GRN",
            referenceId: grnId,
            notes: `GRN ${grn.grnNumber}`,
            createdBy: session.user.id,
          },
        });
      }
    };

    if (tx) {
      await performUpdate(tx);
    } else {
      await prisma.$transaction(async (t) => await performUpdate(t));
    }

    return { success: true };
  } catch (error) {
    console.error("updateStockOnGRN error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update stock",
    };
  }
}

/**
 * Update stock on Production (for future Production module integration)
 */
export async function updateStockOnProduction(
  productionOrderId: string,
  type: "OUT" | "IN",
  items: Array<{ itemId: string; quantity: number; warehouseId: string }>
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const stockItem = await tx.item.findUnique({
          where: { id: item.itemId },
          select: { trackInventory: true },
        });

        if (!stockItem || !stockItem.trackInventory) continue;

        const quantity = type === "OUT" ? -item.quantity : item.quantity;

        // Update Stock
        const existingStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: item.warehouseId,
            },
          },
        });

        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                increment: quantity,
              },
              lastUpdated: new Date(),
            },
          });
        } else if (type === "IN") {
          await tx.stock.create({
            data: {
              itemId: item.itemId,
              warehouseId: item.warehouseId,
              quantity: item.quantity,
              reservedQuantity: 0,
            },
          });
        }

        // Create StockLedger entry
        await tx.stockLedger.create({
          data: {
            itemId: item.itemId,
            warehouseId: item.warehouseId,
            transactionType: StockTransactionType.PRODUCTION,
            quantity: quantity,
            referenceType: "PRODUCTION",
            referenceId: productionOrderId,
            notes: `Production ${type === "OUT" ? "material issue" : "finished goods receipt"}`,
            createdBy: session.user.id,
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("updateStockOnProduction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update stock",
    };
  }
}

/**
 * Update stock on Sale (for future Sales module integration)
 */
export async function updateStockOnSale(
  saleId: string,
  warehouseId: string,
  items: Array<{ itemId: string; variantId?: string; quantity: number }>,
  tx?: Prisma.TransactionClient
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const client = tx || prisma;

    const performUpdate = async (transaction: Prisma.TransactionClient) => {
      for (const item of items) {
        const stockItem = await transaction.item.findUnique({
          where: { id: item.itemId },
          select: { trackInventory: true },
        });

        if (!stockItem || !stockItem.trackInventory) continue;

        // Update Stock (decrease)
        const existingStock = item.variantId ? await transaction.stock.findUnique({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: warehouseId,
            },
          },
        }) : await transaction.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: warehouseId,
            },
          },
        });

        if (existingStock) {
          await transaction.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                decrement: item.quantity,
              },
              lastUpdated: new Date(),
            },
          });
        } else {
          // If a stock record doesn't exist yet for this item/variant and warehouse, create it with negative quantity
          await transaction.stock.create({
            data: {
              itemId: item.variantId ? null : item.itemId,
              variantId: item.variantId || null,
              warehouseId: warehouseId,
              quantity: -item.quantity,
              reservedQuantity: 0,
            }
          });
        }

        // Create StockLedger entry
        await transaction.stockLedger.create({
          data: {
            itemId: item.variantId ? null : item.itemId,
            variantId: item.variantId || null,
            warehouseId: warehouseId,
            transactionType: StockTransactionType.OUT,
            quantity: -item.quantity, // Negative for OUT
            referenceType: "SALE",
            referenceId: saleId,
            notes: `Sale transaction`,
            createdBy: session.user.id,
          },
        });
      }
    };

    if (tx) {
      await performUpdate(tx);
    } else {
      await prisma.$transaction(async (t) => await performUpdate(t));
    }

    return { success: true };
  } catch (error) {
    console.error("updateStockOnSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update stock",
    };
  }
}

/**
 * Update stock on Return to Vendor (RTV)
 */
export async function updateStockOnRTV(
  rtvId: string,
  warehouseId: string,
  items: Array<{ itemId: string; variantId?: string; quantity: number }>,
  tx?: Prisma.TransactionClient
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const client = tx || prisma;

    const performUpdate = async (transaction: Prisma.TransactionClient) => {
      for (const item of items) {
        const stockItem = await transaction.item.findUnique({
          where: { id: item.itemId },
          select: { trackInventory: true },
        });

        if (!stockItem || !stockItem.trackInventory) continue;

        // Update Stock (decrease)
        const existingStock = item.variantId ? await transaction.stock.findUnique({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: warehouseId,
            },
          },
        }) : await transaction.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: warehouseId,
            },
          },
        });

        if (existingStock) {
          await transaction.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                decrement: item.quantity,
              },
              lastUpdated: new Date(),
            },
          });
        } else {
          // If a stock record doesn't exist yet for this item/variant and warehouse, create it with negative quantity
          await transaction.stock.create({
            data: {
              itemId: item.variantId ? null : item.itemId,
              variantId: item.variantId || null,
              warehouseId: warehouseId,
              quantity: -item.quantity,
              reservedQuantity: 0,
            }
          });
        }

        // Create StockLedger entry
        await transaction.stockLedger.create({
          data: {
            itemId: item.variantId ? null : item.itemId,
            variantId: item.variantId || null,
            warehouseId: warehouseId,
            transactionType: StockTransactionType.PURCHASE_RETURN,
            quantity: -item.quantity, // Negative for OUT
            referenceType: "PURCHASE_RETURN",
            referenceId: rtvId,
            notes: `RTV transaction`,
            createdBy: session.user.id,
          },
        });
      }
    };

    if (tx) {
      await performUpdate(tx);
    } else {
      await prisma.$transaction(async (t) => await performUpdate(t));
    }

    return { success: true };
  } catch (error) {
    console.error("updateStockOnRTV error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update stock",
    };
  }
}

/**
 * Manual stock adjustment
 */
export async function adjustStock(input: {
  itemId: string;
  warehouseId: string;
  quantity: number; // Can be positive (increase) or negative (decrease)
  notes: string; // Mandatory reason for adjustment
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", stock: null };
    }

    // Mandatory reason validation
    if (!input.notes || input.notes.trim().length < 5) {
      return {
        success: false,
        error: "A valid reason (minimum 5 characters) is mandatory for stock adjustments.",
        stock: null,
      };
    }

    // Permission check
    const canAdjust = await hasPermission(session.user.id, "inventory.stock", "adjust");
    if (!canAdjust) {
      return {
        success: false,
        error: "You do not have permission to adjust stock",
        stock: null,
      };
    }

    // Validate item exists and tracks inventory
    const item = await prisma.item.findUnique({
      where: { id: input.itemId },
      select: { trackInventory: true, name: true, itemType: true, costPrice: true },
    });

    if (!item) {
      return { success: false, error: "Item not found", stock: null };
    }

    if (!item.trackInventory) {
      return {
        success: false,
        error: "Item does not track inventory",
        stock: null,
      };
    }

    // Validate warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: input.warehouseId },
    });

    if (!warehouse) {
      return { success: false, error: "Warehouse not found", stock: null };
    }

    // --- RISK THRESHOLD CHECK ---
    const adjustmentValue = Math.abs(input.quantity) * Number(item.costPrice || 0);
    const RISK_THRESHOLD = 10000;
    const isHighRisk = adjustmentValue > RISK_THRESHOLD;

    if (isHighRisk) {
      // For high risk, we create a DRAFT voucher and do NOT update stock yet
      try {
        // Get inventory and adjustment accounts from operation settings
        const { getAccountingOperationSettings } = await import("@/lib/accounting-settings");
        const settings = await getAccountingOperationSettings();

        // Determine accounts based on adjustment direction and item type
        const isPositive = input.quantity > 0;
        let inventoryAccountId: string | null = null;
        let adjustmentAccountId: string | null = null;

        if (isPositive) {
          adjustmentAccountId = settings.inventoryAdjustment.positiveAdjustmentGainId;
          if (item.itemType === "RAW_MATERIAL") {
            inventoryAccountId = settings.inventoryAdjustment.positiveRmInventoryId;
          } else {
            inventoryAccountId = settings.inventoryAdjustment.positiveFgInventoryId;
          }
        } else {
          adjustmentAccountId = settings.inventoryAdjustment.negativeAdjustmentExpenseId;
          if (item.itemType === "RAW_MATERIAL") {
            inventoryAccountId = settings.inventoryAdjustment.negativeRmInventoryId;
          } else {
            inventoryAccountId = settings.inventoryAdjustment.negativeFgInventoryId;
          }
        }

        // Fallback for inventory account if not set in adjustment settings
        if (!inventoryAccountId) {
          if (item.itemType === "RAW_MATERIAL") {
            inventoryAccountId = settings.production.consumptionRawMaterialInventoryId;
          } else if (item.itemType === "READY_PRODUCT") {
            inventoryAccountId = settings.production.completionFinishedGoodsInventoryId;
          } else {
            inventoryAccountId = settings.purchase.inventoryAccountId;
          }
        }

        if (inventoryAccountId && adjustmentAccountId) {
          const voucherLines = [
            {
              lineNumber: 1,
              debitAmount: isPositive ? adjustmentValue : 0,
              creditAmount: isPositive ? 0 : adjustmentValue,
              description: `High-Risk Stock Adjustment - ${item.name} (${isPositive ? '+' : ''}${input.quantity})`,
              chartOfAccountId: inventoryAccountId,
            },
            {
              lineNumber: 2,
              debitAmount: isPositive ? 0 : adjustmentValue,
              creditAmount: isPositive ? adjustmentValue : 0,
              description: `Inventory ${isPositive ? 'Gain' : 'Adjustment Expense'} (Pending Approval) - ${item.name}`,
              chartOfAccountId: adjustmentAccountId,
            },
          ];

          const voucherResult = await createVoucher({
            date: new Date(),
            type: VoucherType.JOURNAL,
            reference: `PENDING-ADJ`,
            description: `PENDING APPROVAL: Stock adjustment for ${item.name}. Reason: ${input.notes}`,
            isSystemAction: true,
            lines: voucherLines,
          });

          if (voucherResult.success && voucherResult.voucher) {
            // Log activity for pending adjustment
            await logItemUpdated(
              session.user.id,
              "Stock",
              "PENDING",
              [`High-risk adjustment pending approval: ${input.quantity > 0 ? "+" : ""}${input.quantity}`],
              `${item.name} - ${warehouse.name}`
            );

            return {
              success: true,
              message: `High-value adjustment (৳${adjustmentValue.toLocaleString()}) requires approval. A draft voucher ${voucherResult.voucher.voucherNumber} has been created for manager review. Stock will be updated upon posting.`,
              stock: null,
            };
          }
        }
      } catch (accError) {
        console.error("High-risk adjustment error:", accError);
        return { success: false, error: "Failed to create approval request for high-value adjustment.", stock: null };
      }
    }
    // --- END RISK THRESHOLD CHECK ---

    // Transaction-safe stock update (Only for non-high-risk or if approved)
    const result = await prisma.$transaction(async (tx) => {
      // Get or create Stock record
      let stock = await tx.stock.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: input.itemId,
            warehouseId: input.warehouseId,
          },
        },
      });

      const newQuantity = stock
        ? Number(stock.quantity) + input.quantity
        : input.quantity;

      // Prevent negative stock (unless it's a decrease adjustment)
      if (newQuantity < 0 && input.quantity < 0) {
        // Allow negative adjustments but log warning
        console.warn(`Stock adjustment results in negative quantity for item ${input.itemId}`);
      }

      if (stock) {
        stock = await tx.stock.update({
          where: { id: stock.id },
          data: {
            quantity: { increment: input.quantity },
            lastUpdated: new Date(),
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
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });
      } else {
        stock = await tx.stock.create({
          data: {
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            quantity: newQuantity,
            reservedQuantity: 0,
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
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });
      }

      // Create StockLedger entry
      await tx.stockLedger.create({
        data: {
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          transactionType: StockTransactionType.ADJUSTMENT,
          quantity: input.quantity,
          referenceType: "ADJUSTMENT",
          referenceId: stock.id,
          notes: input.notes || `Manual stock adjustment`,
          createdBy: session.user.id,
        },
      });

      return stock;
    });

    // --- ACCOUNTING INTEGRATION ---
    if (adjustmentValue > 0) {
      try {
        // Get inventory and adjustment accounts from operation settings
        const { getAccountingOperationSettings } = await import("@/lib/accounting-settings");
        const settings = await getAccountingOperationSettings();

        // Determine accounts based on adjustment direction and item type
        const isPositive = input.quantity > 0;
        let inventoryAccountId: string | null = null;
        let adjustmentAccountId: string | null = null;

        if (isPositive) {
          adjustmentAccountId = settings.inventoryAdjustment.positiveAdjustmentGainId;
          if (item.itemType === "RAW_MATERIAL") {
            inventoryAccountId = settings.inventoryAdjustment.positiveRmInventoryId;
          } else {
            inventoryAccountId = settings.inventoryAdjustment.positiveFgInventoryId;
          }
        } else {
          adjustmentAccountId = settings.inventoryAdjustment.negativeAdjustmentExpenseId;
          if (item.itemType === "RAW_MATERIAL") {
            inventoryAccountId = settings.inventoryAdjustment.negativeRmInventoryId;
          } else {
            inventoryAccountId = settings.inventoryAdjustment.negativeFgInventoryId;
          }
        }

        // Fallback for inventory account if not set in adjustment settings
        if (!inventoryAccountId) {
          if (item.itemType === "RAW_MATERIAL") {
            inventoryAccountId = settings.production.consumptionRawMaterialInventoryId;
          } else if (item.itemType === "READY_PRODUCT") {
            inventoryAccountId = settings.production.completionFinishedGoodsInventoryId;
          } else {
            inventoryAccountId = settings.purchase.inventoryAccountId;
          }
        }

        if (inventoryAccountId && adjustmentAccountId) {
          const voucherLines = [
            {
              lineNumber: 1,
              debitAmount: isPositive ? adjustmentValue : 0,
              creditAmount: isPositive ? 0 : adjustmentValue,
              description: `Stock Adjustment - ${item.name} (${isPositive ? '+' : ''}${input.quantity})`,
              chartOfAccountId: inventoryAccountId,
            },
            {
              lineNumber: 2,
              debitAmount: isPositive ? 0 : adjustmentValue,
              creditAmount: isPositive ? adjustmentValue : 0,
              description: `Inventory ${isPositive ? 'Gain' : 'Adjustment Expense'} - ${item.name}`,
              chartOfAccountId: adjustmentAccountId,
            },
          ];

          const voucherResult = await createVoucher({
            date: new Date(),
            type: VoucherType.JOURNAL,
            reference: `ADJ-${result.id.slice(-8)}`,
            description: `Automatic voucher for manual stock adjustment: ${item.name}`,
            isSystemAction: true,
            lines: voucherLines,
          });

          if (voucherResult.success && voucherResult.voucher) {
            await postVoucher(voucherResult.voucher.id, undefined, true);
          }
        }
      } catch (accError) {
        console.error("Accounting adjustment error:", accError);
        // We don't fail the whole operation if accounting fails, but we log it
      }
    }
    // --- END ACCOUNTING INTEGRATION ---

    // Log activity
    await logItemUpdated(
      session.user.id,
      "Stock",
      result.id,
      [`Stock adjusted: ${input.quantity > 0 ? "+" : ""}${input.quantity}`],
      `${item.name} - ${warehouse.name}`
    );

    // Send notification
    await notifyItemUpdated(session.user.id, "Stock", `${item.name} - ${warehouse.name}`);

    // Revalidate cache
    await revalidateBothPaths("/dashboard/inventory/stock");

    // Convert Decimal to number for client components
    return {
      success: true,
      stock: {
        ...result,
        quantity: Number(result.quantity),
        reservedQuantity: Number(result.reservedQuantity),
      },
    };
  } catch (error) {
    console.error("adjustStock error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to adjust stock",
      stock: null,
    };
  }
}

/**
 * Get current stock for item and warehouse
 */
export async function getStock(itemId: string, warehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        stock: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "inventory.stock", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view stock",
        stock: null,
      };
    }

    // RBAC: Check warehouse assignment
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    if (user?.role !== "admin" && user?.role !== "superadmin" && user?.defaultWarehouseId !== warehouseId) {
      return {
        success: false,
        error: "Unauthorized: You can only view stock in your assigned warehouse",
        stock: null,
      };
    }

    const stock = await prisma.stock.findUnique({
      where: {
        itemId_warehouseId: {
          itemId,
          warehouseId,
        },
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
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (stock) {
      // Convert Decimal to number for client components
      return {
        success: true,
        stock: {
          ...stock,
          quantity: Number(stock.quantity),
          reservedQuantity: Number(stock.reservedQuantity),
        },
      };
    }

    // Return default stock if not found
    const defaultItem = await prisma.item.findUnique({
      where: { id: itemId },
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
    });

    const defaultWarehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    return {
      success: true,
      stock: {
        id: "",
        itemId,
        warehouseId,
        quantity: 0,
        reservedQuantity: 0,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        item: defaultItem || {
          id: itemId,
          name: "",
          code: "",
          unit: { symbol: "" },
        },
        warehouse: defaultWarehouse || {
          id: warehouseId,
          name: "",
          code: "",
        },
      },
    };
  } catch (error) {
    console.error("getStock error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock",
      stock: null,
    };
  }
}

/**
 * Get all stocks for a specific warehouse
 */
export async function getWarehouseStocks(warehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", stocks: [] };
    }

    // RBAC: Check warehouse assignment
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    if (user?.role !== "admin" && user?.role !== "superadmin" && user?.defaultWarehouseId !== warehouseId) {
      return { success: false, error: "Unauthorized: You can only view stock in your assigned warehouse", stocks: [], debug: { warehouseId, count: 0 } };
    }

    const stocks = await prisma.stock.findMany({
      where: {
        warehouseId,
      },
      select: {
        itemId: true,
        variantId: true,
        quantity: true,
        variant: {
          select: {
            itemId: true,
          }
        }
      },
    });

    return {
      success: true,
      stocks: stocks.map(s => ({ 
        itemId: s.itemId || s.variant?.itemId, 
        variantId: s.variantId, 
        quantity: Number(s.quantity) 
      })),
      debug: { warehouseId, count: stocks.length }
    };
  } catch (error) {
    console.error("getWarehouseStocks error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stocks",
      stocks: [],
      debug: { warehouseId, error: String(error) }
    };
  }
}

/**
 * Get overall summary metrics (total quantity & value) for stocks
 */
export async function getStockSummaryMetrics(filters: {
  itemId?: string;
  warehouseId?: string;
  search?: string;
} = {}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, totalQuantity: 0, totalValue: 0 };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const where: Prisma.StockWhereInput = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    if (user && user.role !== "admin") {
      where.warehouseId = user.defaultWarehouseId || "unassigned-no-match";
      if (filters.warehouseId && filters.warehouseId !== user.defaultWarehouseId) {
        where.warehouseId = "unassigned-no-match";
      }
    } else if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    // Combine Search query AND Item status filters
    where.AND = [
      ...(filters.search
        ? [
            {
              OR: [
                { item: { name: { contains: filters.search, mode: "insensitive" as const } } },
                { item: { code: { contains: filters.search, mode: "insensitive" as const } } },
                { item: { barcode: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { sku: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { barcode: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { item: { name: { contains: filters.search, mode: "insensitive" as const } } } },
                { variant: { item: { code: { contains: filters.search, mode: "insensitive" as const } } } },
                { variant: { item: { barcode: { contains: filters.search, mode: "insensitive" as const } } } },
                { warehouse: { name: { contains: filters.search, mode: "insensitive" as const } } },
                { warehouse: { code: { contains: filters.search, mode: "insensitive" as const } } },
              ],
            },
          ]
        : []),
      {
        OR: [
          {
            item: {
              isTrash: false,
              status: "active",
              trackInventory: true,
            },
          },
          {
            variant: {
              item: {
                isTrash: false,
                status: "active",
                trackInventory: true,
              },
            },
          },
        ],
      },
    ];

    const stocks = await prisma.stock.findMany({
      where,
      select: {
        quantity: true,
        item: {
          select: {
            costPrice: true
          }
        },
        variant: {
          select: {
            costPrice: true,
            item: {
              select: {
                costPrice: true
              }
            }
          }
        }
      }
    });

    let totalQuantity = 0;
    let totalValue = 0;

    for (const stock of stocks) {
      const qty = Number(stock.quantity);
      const costPrice = stock.variant
        ? Number(stock.variant.costPrice || stock.variant.item?.costPrice || 0)
        : Number(stock.item?.costPrice || 0);
      totalQuantity += qty;
      totalValue += qty * costPrice;
    }

    return {
      success: true,
      totalQuantity,
      totalValue
    };
  } catch (error) {
    console.error("getStockSummaryMetrics error:", error);
    return { success: false, totalQuantity: 0, totalValue: 0 };
  }
}

/**
 * Get paginated list of stocks with filters
 */
export async function getStocks(
  page: number = 1,
  limit: number = 10,
  filters: {
    itemId?: string;
    warehouseId?: string;
    search?: string;
  } = {}
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        stocks: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "inventory.stock", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view stock",
        stocks: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Fetch user details for RBAC
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    // Build where clause
    const where: Prisma.StockWhereInput = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    if (user && user.role !== "admin") {
      where.warehouseId = user.defaultWarehouseId || "unassigned-no-match";
      if (filters.warehouseId && filters.warehouseId !== user.defaultWarehouseId) {
        where.warehouseId = "unassigned-no-match"; // Force no results
      }
    } else if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    // Combine Search query AND Item status filters
    where.AND = [
      ...(filters.search
        ? [
            {
              OR: [
                // 1. Direct Item match (simple items)
                { item: { name: { contains: filters.search, mode: "insensitive" as const } } },
                { item: { code: { contains: filters.search, mode: "insensitive" as const } } },
                { item: { barcode: { contains: filters.search, mode: "insensitive" as const } } },

                // 2. Variant match (SKUs / barcodes / parent details)
                { variant: { sku: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { barcode: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { item: { name: { contains: filters.search, mode: "insensitive" as const } } } },
                { variant: { item: { code: { contains: filters.search, mode: "insensitive" as const } } } },
                { variant: { item: { barcode: { contains: filters.search, mode: "insensitive" as const } } } },

                // 3. Warehouse match
                { warehouse: { name: { contains: filters.search, mode: "insensitive" as const } } },
                { warehouse: { code: { contains: filters.search, mode: "insensitive" as const } } },
              ],
            },
          ]
        : []),
      {
        OR: [
          {
            item: {
              isTrash: false,
              status: "active",
              trackInventory: true,
            },
          },
          {
            variant: {
              item: {
                isTrash: false,
                status: "active",
                trackInventory: true,
              },
            },
          },
        ],
      },
    ];

    // Get total count
    const total = await prisma.stock.count({ where });

    // Get stocks
    const stocks = await prisma.stock.findMany({
      where,
      skip,
      take: limit,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            images: true,
            featuredImage: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        variant: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                images: true,
                featuredImage: true,
                unit: {
                  select: {
                    symbol: true,
                  },
                },
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
        lastUpdated: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    // Convert Decimal to number for client components, and dynamically resolve variant/item details
    const serializedStocks = stocks.map((stock) => {
      const parentItem = stock.item || stock.variant?.item;
      const unit = parentItem?.unit;
      const name = parentItem ? parentItem.name : "Unknown Item";
      const code = stock.variant ? stock.variant.sku : (parentItem ? parentItem.code : "N/A");
      const featuredImage = stock.variant?.image || parentItem?.featuredImage;
      const images = parentItem?.images;

      return {
        ...stock,
        quantity: Number(stock.quantity),
        reservedQuantity: Number(stock.reservedQuantity),
        item: parentItem ? {
          id: parentItem.id,
          name,
          code,
          images,
          featuredImage,
          unit: unit || { symbol: "pcs" },
          variant: stock.variant ? {
            id: stock.variant.id,
            sku: stock.variant.sku,
            size: stock.variant.size,
            color: stock.variant.color,
          } : null,
        } : {
          id: "",
          name: "Unknown Item",
          code: "N/A",
          images: [],
          featuredImage: null,
          unit: { symbol: "pcs" },
          variant: null,
        }
      };
    });

    return {
      success: true,
      stocks: serializedStocks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getStocks error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stocks",
      stocks: [],
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
 * Get stock ledger entries with filters
 */
export async function getStockLedger(
  page: number = 1,
  limit: number = 10,
  filters: {
    itemId?: string;
    warehouseId?: string;
    transactionType?: StockTransactionType;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
  } = {}
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        entries: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "inventory.stock", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view stock ledger",
        entries: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Fetch user details for RBAC
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    // Build where clause
    const where: Prisma.StockLedgerWhereInput = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    if (user && user.role !== "admin") {
      where.warehouseId = user.defaultWarehouseId || "unassigned-no-match";
      if (filters.warehouseId && filters.warehouseId !== user.defaultWarehouseId) {
        where.warehouseId = "unassigned-no-match"; // Force no results
      }
    } else if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
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
        { item: { name: { contains: filters.search, mode: "insensitive" } } },
        { item: { code: { contains: filters.search, mode: "insensitive" } } },
        { item: { barcode: { contains: filters.search, mode: "insensitive" } } },
        { variant: { sku: { contains: filters.search, mode: "insensitive" } } },
        { variant: { barcode: { contains: filters.search, mode: "insensitive" } } },
        { warehouse: { name: { contains: filters.search, mode: "insensitive" } } },
        { warehouse: { code: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Get total count
    const total = await prisma.stockLedger.count({ where });

    // Get ledger entries
    const entries = await prisma.stockLedger.findMany({
      where,
      skip,
      take: limit,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            images: true,
            featuredImage: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        variant: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                images: true,
                featuredImage: true,
                unit: {
                  select: {
                    symbol: true,
                  },
                },
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

    // Convert Decimal to number for client components, and dynamically resolve variant/item details
    const serializedEntries = entries.map((entry) => {
      const parentItem = entry.item || entry.variant?.item;
      const unit = parentItem?.unit;
      const name = parentItem ? parentItem.name : "Unknown Item";
      const code = entry.variant ? entry.variant.sku : (parentItem ? parentItem.code : "N/A");
      const featuredImage = entry.variant?.image || parentItem?.featuredImage || null;
      const images = parentItem?.images || null;

      let serializedVariant = null;
      if (entry.variant) {
        serializedVariant = {
          ...entry.variant,
          costPrice: entry.variant.costPrice ? Number(entry.variant.costPrice) : null,
          salesPrice: entry.variant.salesPrice ? Number(entry.variant.salesPrice) : null,
          wholesalePrice: entry.variant.wholesalePrice ? Number(entry.variant.wholesalePrice) : null,
          wholesaleDiscountAmount: entry.variant.wholesaleDiscountAmount ? Number(entry.variant.wholesaleDiscountAmount) : null,
        };
      }

      return {
        ...entry,
        quantity: Number(entry.quantity),
        rate: entry.rate ? Number(entry.rate) : null,
        variant: serializedVariant,
        item: parentItem ? {
          id: parentItem.id,
          name,
          code,
          images,
          featuredImage,
          unit: unit || { symbol: "pcs" },
        } : {
          id: entry.itemId || "",
          name: "Unknown Item",
          code: "N/A",
          images: [],
          featuredImage: null,
          unit: { symbol: "pcs" },
        }
      };
    });

    return {
      success: true,
      entries: serializedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getStockLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock ledger",
      entries: [],
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
 * Get stock report (aggregate data)
 */
export async function getStockReport(itemId?: string, warehouseId?: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        report: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "inventory.stock", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view stock reports",
        report: null,
      };
    }

    // Fetch user details for RBAC
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const where: Prisma.StockWhereInput = {};
    if (itemId) where.itemId = itemId;

    if (user && user.role !== "admin") {
      where.warehouseId = user.defaultWarehouseId || "unassigned-no-match";
      if (warehouseId && warehouseId !== user.defaultWarehouseId) {
        where.warehouseId = "unassigned-no-match"; // Force no results
      }
    } else if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    // Get all stocks matching filters
    const stocks = await prisma.stock.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
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
    });

    // Calculate totals
    let totalQuantity = 0;
    let totalValue = 0;
    let totalReserved = 0;

    // Convert Decimal to number for client components
    const serializedStocks = stocks.map((stock) => {
      const qty = Number(stock.quantity);
      const reserved = Number(stock.reservedQuantity);
      const costPrice = stock.item?.costPrice ? Number(stock.item?.costPrice) : 0;

      totalQuantity += qty;
      totalReserved += reserved;
      totalValue += qty * costPrice;

      return {
        ...stock,
        quantity: qty,
        reservedQuantity: reserved,
        item: {
          ...stock.item,
          costPrice: costPrice,
        },
      };
    });

    // Get recent movements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ledgerWhere: Prisma.StockLedgerWhereInput = {};
    if (itemId) ledgerWhere.itemId = itemId;
    if (warehouseId) ledgerWhere.warehouseId = warehouseId;
    ledgerWhere.createdAt = { gte: thirtyDaysAgo };

    const recentMovements = await prisma.stockLedger.count({ where: ledgerWhere });

    return {
      success: true,
      report: {
        totalStocks: stocks.length,
        totalQuantity,
        totalReserved,
        availableQuantity: totalQuantity - totalReserved,
        totalValue,
        recentMovements,
        stocks: serializedStocks,
      },
    };
  } catch (error) {
    console.error("getStockReport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate stock report",
      report: null,
    };
  }
}

/**
 * Get active items that track inventory (for dropdowns)
 */
export async function getActiveItems() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const items = await prisma.item.findMany({
      where: {
        status: "active",
        isTrash: false,
        trackInventory: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        costPrice: true,
        itemType: true,
        trackInventory: true,
        barcode: true,
        variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            size: true,
            color: true,
            costPrice: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      items: items.map(item => ({
        ...item,
        costPrice: Number(item.costPrice),
        barcode: item.barcode || null,
        variants: item.variants ? item.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: v.barcode,
          size: v.size,
          color: v.color,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
        })) : [],
      })),
    };
  } catch (error) {
    console.error("getActiveItems error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items",
      items: [],
    };
  }
}

/**
 * Get active warehouses (for dropdowns)
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
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
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
 * Update stock on TPN (Transfer Purchase Note)
 */
export async function updateStockOnTPN(
  tpnId: string,
  warehouseId: string,
  type: "IN" | "OUT",
  items: Array<{ itemId: string; variantId?: string | null; quantity: number }>,
  tx?: Prisma.TransactionClient
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const client = tx || prisma;

    const performUpdate = async (transaction: Prisma.TransactionClient) => {
      for (const item of items) {
        const stockItem = await transaction.item.findUnique({
          where: { id: item.itemId },
          select: { trackInventory: true },
        });

        if (!stockItem || !stockItem.trackInventory) continue;

        const quantity = type === "OUT" ? -item.quantity : item.quantity;

        // Update Stock
        const existingStock = item.variantId ? await transaction.stock.findUnique({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: warehouseId,
            },
          },
        }) : await transaction.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: item.itemId,
              warehouseId: warehouseId,
            },
          },
        });

        if (existingStock) {
          await transaction.stock.update({
            where: { id: existingStock.id },
            data: {
              quantity: {
                increment: quantity,
              },
              lastUpdated: new Date(),
            },
          });
        } else {
          // Create stock if it doesn't exist
          await transaction.stock.create({
            data: {
              itemId: item.variantId ? null : item.itemId,
              variantId: item.variantId || null,
              warehouseId: warehouseId,
              quantity: quantity,
              reservedQuantity: 0,
            }
          });
        }

        // Create StockLedger entry
        await transaction.stockLedger.create({
          data: {
            itemId: item.variantId ? null : item.itemId,
            variantId: item.variantId || null,
            warehouseId: warehouseId,
            transactionType: StockTransactionType.TRANSFER,
            quantity: quantity,
            referenceType: "TPN",
            referenceId: tpnId,
            notes: `Transfer Purchase Note ${type}`,
            createdBy: session.user.id,
          },
        });
      }
    };

    if (tx) {
      await performUpdate(tx);
    } else {
      await prisma.$transaction(async (t) => await performUpdate(t));
    }

    return { success: true };
  } catch (error) {
    console.error("updateStockOnTPN error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update stock for TPN",
    };
  }
}

/**
 * Get active items that have stock movements
 */
export async function getItemsWithStockMovements(warehouseId?: string | null) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const whereClause: any = {};
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    const stocks = await prisma.stock.findMany({
      where: whereClause,
      select: {
        itemId: true,
        variant: {
          select: {
            itemId: true,
          }
        }
      },
    });

    const itemIds = Array.from(new Set(stocks.map(s => s.itemId || s.variant?.itemId).filter(Boolean))) as string[];

    const items = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        status: "active",
        isTrash: false,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      items,
    };
  } catch (error) {
    console.error("getItemsWithStockMovements error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items",
      items: [],
    };
  }
}

/**
 * Get all stocks matching filters for export (no pagination limit)
 */
export async function getAllStocksForExport(filters: {
  itemId?: string;
  warehouseId?: string;
  search?: string;
} = {}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", stocks: [] };
    }

    const canView = await hasPermission(session.user.id, "inventory.stock", "view");
    if (!canView) {
      return { success: false, error: "Permission denied", stocks: [] };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    const where: Prisma.StockWhereInput = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    if (user && user.role !== "admin") {
      where.warehouseId = user.defaultWarehouseId || "unassigned-no-match";
      if (filters.warehouseId && filters.warehouseId !== user.defaultWarehouseId) {
        where.warehouseId = "unassigned-no-match";
      }
    } else if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    where.AND = [
      ...(filters.search
        ? [
            {
              OR: [
                { item: { name: { contains: filters.search, mode: "insensitive" as const } } },
                { item: { code: { contains: filters.search, mode: "insensitive" as const } } },
                { item: { barcode: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { sku: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { barcode: { contains: filters.search, mode: "insensitive" as const } } },
                { variant: { item: { name: { contains: filters.search, mode: "insensitive" as const } } } },
                { variant: { item: { code: { contains: filters.search, mode: "insensitive" as const } } } },
                { variant: { item: { barcode: { contains: filters.search, mode: "insensitive" as const } } } },
                { warehouse: { name: { contains: filters.search, mode: "insensitive" as const } } },
                { warehouse: { code: { contains: filters.search, mode: "insensitive" as const } } },
              ],
            },
          ]
        : []),
      {
        OR: [
          {
            item: {
              isTrash: false,
              status: "active",
              trackInventory: true,
            },
          },
          {
            variant: {
              item: {
                isTrash: false,
                status: "active",
                trackInventory: true,
              },
            },
          },
        ],
      },
    ];

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            itemType: true,
            costPrice: true,
            salesPrice: true,
            wholesalePrice: true,
            category: { select: { name: true } },
            unit: { select: { symbol: true } },
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            costPrice: true,
            salesPrice: true,
            wholesalePrice: true,
            item: {
              select: {
                name: true,
                code: true,
                itemType: true,
                salesPrice: true,
                wholesalePrice: true,
                category: { select: { name: true } },
                unit: { select: { symbol: true } },
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
      ],
    });

    const serializedStocks = stocks.map((stock) => {
      const quantity = Number(stock.quantity);
      const reservedQuantity = Number(stock.reservedQuantity);
      
      const costPrice = Number(
        stock.variant?.costPrice || stock.item?.costPrice || 0
      );
      const salesPrice = Number(
        stock.variant?.salesPrice || stock.item?.salesPrice || stock.variant?.item?.salesPrice || 0
      );
      const wholesalePrice = Number(
        stock.variant?.wholesalePrice || stock.item?.wholesalePrice || stock.variant?.item?.wholesalePrice || 0
      );

      const totalCostValue = quantity * costPrice;
      const totalSalesValue = quantity * salesPrice;
      const totalWholesaleValue = quantity * wholesalePrice;

      return {
        ...stock,
        quantity,
        reservedQuantity,
        costPrice,
        totalCostValue,
        salesPrice,
        totalSalesValue,
        wholesalePrice,
        totalWholesaleValue,
      };
    });

    return { success: true, stocks: serializedStocks };
  } catch (error) {
    console.error("getAllStocksForExport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stocks for export",
      stocks: [],
    };
  }
}

