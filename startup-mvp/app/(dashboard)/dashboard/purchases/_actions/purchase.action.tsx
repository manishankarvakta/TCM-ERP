"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { PurchaseStatus, ItemType, AccountType, VoucherType, Prisma } from "@prisma/client";
import * as z from "zod";
import { updateStockOnPurchase } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { findControlAccount } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/accounting-helpers";
import { createUserLog, LogAction } from "@/lib/user-log";

const purchaseItemSchema = z.object({
  itemId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater"),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().optional().nullable(), // Optional for backward compatibility
  date: z.coerce.date(),
  status: z.nativeEnum(PurchaseStatus),
  notes: z.string().optional().nullable(),
  attachmentUrl: z
    .string()
    .url("Attachment must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  discount: z.coerce.number().min(0).optional().nullable(),
  tax: z.coerce.number().min(0).optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

const updatePurchaseSchema = purchaseSchema.extend({
  id: z.string().min(1),
});

function serializePurchase(purchase: {
  subTotal: Prisma.Decimal;
  discount: Prisma.Decimal | null;
  tax: Prisma.Decimal | null;
  grandTotal: Prisma.Decimal;
  items?: Array<{
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    amount: Prisma.Decimal;
  }>;
}) {
  return {
    ...purchase,
    subTotal: Number(purchase.subTotal),
    discount: purchase.discount ? Number(purchase.discount) : null,
    tax: purchase.tax ? Number(purchase.tax) : null,
    grandTotal: Number(purchase.grandTotal),
    items: purchase.items?.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
    })),
  };
}

async function generatePurchaseNumber(tx?: Prisma.TransactionClient): Promise<string> {
  const prefix = "PUR";
  const client = tx || prisma;

  const lastPurchase = await client.purchase.findFirst({
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

export async function getSuppliersForPurchase() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", suppliers: [] };
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        supplierCode: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, suppliers };
  } catch (error) {
    console.error("getSuppliersForPurchase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch suppliers",
      suppliers: [],
    };
  }
}

export async function getItemsForPurchase() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const items = await prisma.item.findMany({
      where: {
        status: "active",
        isTrash: false,
        itemType: {
          in: [ItemType.RAW_MATERIAL, ItemType.RETAIL],
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        costPrice: true,
        stocks: {
          select: {
            quantity: true,
          },
        },
        unit: {
          select: {
            symbol: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      items: items.map((item) => {
        // Calculate total stock from all warehouse balances
        const totalStock = item.stocks.reduce((sum: number, stock: {quantity: any}) => sum + Number(stock.quantity), 0);
        
        return {
          id: item.id,
          code: item.code,
          description: item.name,
          unitPrice: item.costPrice ? Number(item.costPrice) : 0,
          stock: totalStock,
          unit: item.unit.symbol,
        };
      }),
    };
  } catch (error) {
    console.error("getItemsForPurchase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items",
      items: [],
    };
  }
}


export async function getPurchases(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        purchases: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      isTrash: status === "trash",
    };

    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { supplier: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.purchase.count({ where });

    const purchases = await prisma.purchase.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        purchaseNumber: true,
        date: true,
        status: true,
        subTotal: true,
        discount: true,
        tax: true,
        grandTotal: true,
        isTrash: true,
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      purchases: purchases.map((purchase) => serializePurchase(purchase)),
      pagination: { page, limit, total, totalPages },
    };
  } catch (error) {
    console.error("getPurchases error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch purchases",
      purchases: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function getPurchaseById(purchaseId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", purchase: null };
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        purchaseNumber: true,
        date: true,
        status: true,
        notes: true,
        attachmentUrl: true,
        subTotal: true,
        discount: true,
        tax: true,
        grandTotal: true,
        isTrash: true,
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            phone: true,
          },
        },
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          select: {
            id: true,
            itemId: true,
            description: true,
            quantity: true,
            unitPrice: true,
            amount: true,
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
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!purchase) {
      return { success: false, error: "Purchase not found", purchase: null };
    }

    return {
      success: true,
      purchase: {
        id: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        date: purchase.date,
        status: purchase.status,
        notes: purchase.notes,
        attachmentUrl: purchase.attachmentUrl,
        isTrash: purchase.isTrash,
        supplier: purchase.supplier,
        warehouse: purchase.warehouse,
        createdByUser: purchase.createdByUser,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
        ...serializePurchase(purchase),
        items: purchase.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount),
        })),
      },
    };
  } catch (error) {
    console.error("getPurchaseById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch purchase",
      purchase: null,
    };
  }
}

/**
 * Validate that required accounting accounts are configured
 * before creating/updating a purchase to RECEIVED status
 */
async function validatePurchaseAccounts(
  supplierId: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = tx || prisma;
    
    // Get purchase accounts from settings
    const { getPurchaseAccounts } = await import("@/lib/accounting-settings");

    
    let purchaseAccounts;
    
    try {
      purchaseAccounts = await getPurchaseAccounts();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error 
          ? error.message 
          : "Required accounting settings are not configured. Please configure Purchase accounts in Settings.",
      };
    }

    // Check inventory account (required for all purchases)
    if (!purchaseAccounts.inventoryAccountId) {
      return {
        success: false,
        error: "Purchase Inventory Account is not configured. Please set up the default inventory account in Purchase Settings before creating purchases.",
      };
    }

    // Check payable account
    // Either supplier must have chartOfAccountId OR default payable account must be set
    const supplier = await client.supplier.findUnique({
      where: { id: supplierId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        chartOfAccountId: true 
      },
    });

    if (!supplier) {
      return {
        success: false,
        error: "Supplier not found",
      };
    }

    const hasSupplierAccount = !!supplier.chartOfAccountId;
    const hasDefaultPayableAccount = !!purchaseAccounts.payableAccountId;

    if (!hasSupplierAccount && !hasDefaultPayableAccount) {
      return {
        success: false,
        error: `Cannot create purchase: Supplier "${supplier.name || supplier.email}" has no account ledger assigned, and no default Accounts Payable account is configured in Purchase Settings. Please assign an account ledger to the supplier or configure the default Accounts Payable account.`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("validatePurchaseAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate purchase accounts",
    };
  }
}

/**
 * Create accounting voucher for purchase receipt
 * Creates item-type based accounting entries: Debit Inventory, Credit Accounts Payable
 * 
 * REFACTORED: Uses operation-based accounting settings (accounting.operationAccounts)
 */
async function createPurchaseAccountingVoucher(
  purchaseId: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; error?: string; voucherId?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const client = tx || prisma;

    // Get purchase with items and item details
    const purchase = await client.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            chartOfAccountId: true,
          },
        },
        items: {
          where: { itemId: { not: null } },
          include: {
            item: {
              select: {
                id: true,
                itemType: true,
                costPrice: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return { success: false, error: "Purchase not found" };
    }

    // Check if voucher already exists
    if (purchase.voucherId) {
      return { success: true, voucherId: purchase.voucherId };
    }

    // Get purchase accounts from operation settings
    const { getPurchaseAccounts, getProductionAccounts } = await import("@/lib/accounting-settings");

    let purchaseAccounts;
    let productionAccounts;

    try {
      // Always get purchase accounts
      purchaseAccounts = await getPurchaseAccounts();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve purchase accounting settings",
      };
    }

    // Group items by itemType and calculate totals
    const itemsByType: Record<
      ItemType,
      Array<{ quantity: number; unitPrice: number; totalCost: number; description: string }>
    > = {
      RAW_MATERIAL: [],
      READY_PRODUCT: [],
      RETAIL: [],
    };

    for (const purchaseItem of purchase.items) {
      if (!purchaseItem.item) continue;

      const quantity = Number(purchaseItem.quantity);
      const unitPrice = Number(purchaseItem.unitPrice);
      const totalCost = quantity * unitPrice;

      itemsByType[purchaseItem.item.itemType].push({
        quantity,
        unitPrice,
        totalCost,
        description: purchaseItem.description,
      });
    }

    // Check if we need production accounts (for RM or FG)
    const hasRawMaterials = itemsByType.RAW_MATERIAL.length > 0;
    const hasFinishedGoods = itemsByType.READY_PRODUCT.length > 0;

    if (hasRawMaterials || hasFinishedGoods) {
      try {
        productionAccounts = await getProductionAccounts();
      } catch (error) {
        return {
          success: false,
          error: "Production accounting settings are not configured, but this purchase contains Raw Materials or Ready Products. Please configure Production accounts in Settings.",
        };
      }
    }

    // Create voucher lines
    const voucherLines: Array<{
      lineNumber: number;
      debitAmount: number;
      creditAmount: number;
      description?: string;
      chartOfAccountId: string;
      supplierId?: string;
    }> = [];

    let lineNumber = 1;
    let totalInventoryDebit = 0;

    // Calculate total cost for all items
    const totalRawMaterialCost = itemsByType.RAW_MATERIAL.reduce((sum, item) => sum + item.totalCost, 0);
    const totalFGCost = itemsByType.READY_PRODUCT.reduce((sum, item) => sum + item.totalCost, 0);
    const totalRetailCost = itemsByType.RETAIL.reduce((sum, item) => sum + item.totalCost, 0);
    const totalItemsCost = totalRawMaterialCost + totalFGCost + totalRetailCost;

    // Debit: Inventory account (single account for all inventory types in purchase)
    // Use production.rawMaterialInventoryId for raw materials
    // Use purchaseAccounts.inventoryAccountId for finished goods and retail
    if (totalRawMaterialCost > 0 && productionAccounts) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: totalRawMaterialCost,
        creditAmount: 0,
        description: `Raw Material Inventory - ${purchase.purchaseNumber}`,
        chartOfAccountId: productionAccounts.consumptionRawMaterialInventoryId,
      });
      totalInventoryDebit += totalRawMaterialCost;
    }

    if (totalFGCost > 0 && productionAccounts) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: totalFGCost,
        creditAmount: 0,
        description: `Ready Products Inventory - ${purchase.purchaseNumber}`,
        chartOfAccountId: productionAccounts.completionFinishedGoodsInventoryId,
      });
      totalInventoryDebit += totalFGCost;
    }

    if (totalRetailCost > 0) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: totalRetailCost,
        creditAmount: 0,
        description: `Retail Inventory - ${purchase.purchaseNumber}`,
        chartOfAccountId: purchaseAccounts.inventoryAccountId,
      });
      totalInventoryDebit += totalRetailCost;
    }

    // Handle Tax and Discount (optional - skip if not configured)
    const discount = Number(purchase.discount || 0);
    const tax = Number(purchase.tax || 0);
    const grandTotal = Number(purchase.grandTotal);

    // Note: Tax and discount accounts are optional and not included in the simplified structure
    // They can be added later if needed

    // Credit: Accounts Payable
    // Credit: Accounts Payable
    if (totalInventoryDebit > 0) {
      const payableAccountId = purchase.supplier.chartOfAccountId || purchaseAccounts.payableAccountId;

      if (!payableAccountId) {
        return {
          success: false,
          error: `Cannot create voucher: No Accounts Payable ledger found for supplier "${purchase.supplier.name || purchase.supplier.email}" and no default Accounts Payable account is configured in Purchase Settings.`,
        };
      }

      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: 0,
        creditAmount: totalInventoryDebit, // Balance against total debits
        description: `Accounts Payable - ${purchase.purchaseNumber} - ${purchase.supplier.name || purchase.supplier.email}`,
        chartOfAccountId: payableAccountId,
        supplierId: purchase.supplierId,
      });
    }

    if (voucherLines.length === 0) {
      return { success: false, error: "No valid items or amounts found for voucher" };
    }

    // Create voucher
    const voucherResult = await createVoucher({
      date: purchase.date,
      type: VoucherType.PURCHASE,
      reference: purchase.purchaseNumber,
      description: `Purchase ${purchase.purchaseNumber} - ${purchase.supplier.name || purchase.supplier.email}`,
      supplierId: purchase.supplierId,
      isSystemAction: true,
      lines: voucherLines,
    }, tx);

    if (!voucherResult.success || !voucherResult.voucher) {
      return {
        success: false,
        error: voucherResult.error || "Failed to create accounting voucher",
      };
    }

    // Post voucher
    const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
    if (!postResult.success) {
      return {
        success: false,
        error: postResult.error || "Failed to post accounting voucher",
      };
    }

    // Link voucher to purchase
    await client.purchase.update({
      where: { id: purchaseId },
      data: { voucherId: voucherResult.voucher.id },
    });

    // Log activity
    await createUserLog({
      userId: userId,
      action: LogAction.ITEM_CREATED,
      details: `Created and posted purchase accounting voucher for ${purchase.purchaseNumber}`,
    });

    return { success: true, voucherId: voucherResult.voucher.id };
  } catch (error) {
    console.error("createPurchaseAccountingVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create purchase accounting voucher",
    };
  }
}

export async function createPurchase(input: z.infer<typeof purchaseSchema>) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const validated = purchaseSchema.parse(input);

    // Validate accounts if creating as RECEIVED
    if (validated.status === "RECEIVED") {
      const accountValidation = await validatePurchaseAccounts(validated.supplierId);
      if (!accountValidation.success) {
        return {
          success: false,
          error: accountValidation.error,
          purchase: null,
        };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let purchaseNumber = await generatePurchaseNumber(tx);
      let purchaseNumberExists = await tx.purchase.findUnique({
        where: { purchaseNumber },
        select: { id: true },
      });

      let attempts = 0;
      while (purchaseNumberExists && attempts < 10) {
        const codeWithoutPrefix = purchaseNumber.replace("PUR", "");
        const number = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(number) && number >= 1000001) {
          const newNumber = number + 1;
          purchaseNumber = `PUR${newNumber.toString().padStart(7, "0")}`;
        } else {
          purchaseNumber = `PUR${Date.now().toString().slice(-7)}`;
        }
        purchaseNumberExists = await tx.purchase.findUnique({
          where: { purchaseNumber },
          select: { id: true },
        });
        attempts++;
      }

      if (purchaseNumberExists) {
        throw new Error("Unable to generate unique purchase number. Please try again.");
      }

      const subTotal = validated.items.reduce((sum, item) => sum + item.amount, 0);
      const discount = validated.discount ?? 0;
      const tax = validated.tax ?? 0;
      const grandTotal = subTotal - discount + tax;

      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: validated.supplierId,
          warehouseId: validated.warehouseId || null,
          date: validated.date,
          status: validated.status,
          notes: validated.notes || null,
          attachmentUrl: validated.attachmentUrl || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          createdBy: userId,
          items: {
            create: validated.items.map((item) => ({
              itemId: item.itemId || null,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.amount),
            })),
          },
        },
        select: {
          id: true,
          purchaseNumber: true,
          grandTotal: true,
          createdAt: true,
          voucherId: true,
        },
      });

      // Update stock and create accounting voucher if purchase is received
      if (validated.status === "RECEIVED") {
        const stockResult = await updateStockOnPurchase(purchase.id, undefined, tx);
        if (!stockResult.success) throw new Error(stockResult.error || "Failed to update stock");

        const voucherResult = await createPurchaseAccountingVoucher(purchase.id, tx);
        if (!voucherResult.success) throw new Error(voucherResult.error || "Failed to create accounting voucher");
      }

      return purchase;
    });

    await logItemCreated(
      userId,
      "Purchase",
      result.id,
      result.purchaseNumber
    );

    revalidateBothPaths("purchases");

    return {
      success: true,
      purchase: {
        ...result,
        grandTotal: Number(result.grandTotal),
      },
    };
  } catch (error) {
    console.error("createPurchase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create purchase",
      purchase: null,
    };
  }
}

export async function updatePurchase(input: z.infer<typeof updatePurchaseSchema>) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const validated = updatePurchaseSchema.parse(input);

    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: validated.id },
      select: { 
        id: true, 
        purchaseNumber: true,
        status: true,  // Get current status
      },
    });

    if (!existingPurchase) {
      return { success: false, error: "Purchase not found", purchase: null };
    }

    // Prevent editing RECEIVED purchases
    if (existingPurchase.status === "RECEIVED") {
      return { 
        success: false, 
        error: "Cannot edit a RECEIVED purchase. RECEIVED purchases are locked for audit compliance.", 
        purchase: null 
      };
    }

    // Detect status transition
    // Note: We already checked earlier that existingPurchase.status !== "RECEIVED"
    const isTransitioningToReceived = validated.status === "RECEIVED";

    // Validate accounts if transitioning to RECEIVED
    if (isTransitioningToReceived) {
      const accountValidation = await validatePurchaseAccounts(validated.supplierId);
      if (!accountValidation.success) {
        return {
          success: false,
          error: accountValidation.error,
          purchase: null,
        };
      }
    }

    const subTotal = validated.items.reduce((sum, item) => sum + item.amount, 0);
    const discount = validated.discount ?? 0;
    const tax = validated.tax ?? 0;
    const grandTotal = subTotal - discount + tax;

    const purchase = await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: validated.id },
      });

      const purchase = await tx.purchase.update({
        where: { id: validated.id },
        data: {
          supplierId: validated.supplierId,
          warehouseId: validated.warehouseId || null,
          date: validated.date,
          status: validated.status,
          notes: validated.notes || null,
          attachmentUrl: validated.attachmentUrl || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          updatedBy: userId,
          items: {
            create: validated.items.map((item) => ({
              itemId: item.itemId || null,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.amount),
            })),
          },
        },
        select: {
          id: true,
          purchaseNumber: true,
          grandTotal: true,
          updatedAt: true,
          voucherId: true,
        },
      });

      // Update stock and create accounting voucher ONLY when transitioning TO RECEIVED
      if (isTransitioningToReceived) {
        const stockResult = await updateStockOnPurchase(purchase.id, undefined, tx);
        if (!stockResult.success) throw new Error(stockResult.error || "Failed to update stock");

        const voucherResult = await createPurchaseAccountingVoucher(purchase.id, tx);
        if (!voucherResult.success) throw new Error(voucherResult.error || "Failed to create accounting voucher");
      }

      return purchase;
    });

    await logItemUpdated(
      userId,
      "Purchase",
      purchase.id,
      ["details", "items"],
      purchase.purchaseNumber
    );

    revalidateBothPaths("purchases");

    return {
      success: true,
      purchase: {
        ...purchase,
        grandTotal: Number(purchase.grandTotal),
      },
    };
  } catch (error) {
    console.error("updatePurchase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update purchase",
      purchase: null,
    };
  }
}

export async function deletePurchase(purchaseId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { 
        id: true, 
        purchaseNumber: true, 
        isTrash: true,
        status: true,  // Get status
      },
    });

    if (!purchase) {
      return { success: false, error: "Purchase not found" };
    }

    // Prevent deleting RECEIVED purchases
    if (purchase.status === "RECEIVED") {
      return { 
        success: false, 
        error: "Cannot delete a RECEIVED purchase. RECEIVED purchases are locked because stock and accounting entries have been created." 
      };
    }

    await prisma.purchase.update({
      where: { id: purchaseId },
      data: { isTrash: true },
    });

    await logItemDeleted(
      userId,
      "Purchase",
      purchaseId,
      purchase.purchaseNumber
    );

    revalidateBothPaths("purchases");

    return { success: true };
  } catch (error) {
    console.error("deletePurchase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete purchase",
    };
  }
}

export async function bulkUpdatePurchaseStatus(
  purchaseIds: string[],
  status: PurchaseStatus | "trash" | "restore"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (purchaseIds.length === 0) {
      return { success: false, error: "No purchases selected" };
    }

    if (status === "trash") {
      await prisma.purchase.updateMany({
        where: { id: { in: purchaseIds } },
        data: { isTrash: true },
      });
    } else if (status === "restore") {
      await prisma.purchase.updateMany({
        where: { id: { in: purchaseIds } },
        data: { isTrash: false },
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.purchase.updateMany({
          where: { id: { in: purchaseIds } },
          data: { status, isTrash: false },
        });

        // Update stock and create accounting vouchers if status is RECEIVED
        if (status === "RECEIVED") {
          // Pre-validate that accounting settings are configured before starting process
          const { getPurchaseAccounts } = await import("@/lib/accounting-settings");
          try {
            await getPurchaseAccounts();
          } catch (error) {
            throw error; // Re-throw to be caught by the outer catch block
          }

          for (const purchaseId of purchaseIds) {
            const stockResult = await updateStockOnPurchase(purchaseId, undefined, tx);
            if (!stockResult.success) throw new Error(stockResult.error || "Failed to update stock");

            // Check if voucher already exists before creating
            const purchase = await tx.purchase.findUnique({
              where: { id: purchaseId },
              select: { voucherId: true },
            });
            if (!purchase?.voucherId) {
              const voucherResult = await createPurchaseAccountingVoucher(purchaseId, tx);
              if (!voucherResult.success) throw new Error(voucherResult.error || "Failed to create accounting voucher");
            }
          }
        }
      });
    }

    revalidateBothPaths("purchases");
    return { success: true };
  } catch (error) {
    console.error("bulkUpdatePurchaseStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update purchases",
    };
  }
}

export async function deletePurchasesPermanently(purchaseIds: string[]) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    if (purchaseIds.length === 0) {
      return { success: false, error: "No purchases selected" };
    }

    const purchases = await prisma.purchase.findMany({
      where: { id: { in: purchaseIds }, isTrash: true },
      select: { id: true, purchaseNumber: true },
    });

    if (purchases.length === 0) {
      return { success: false, error: "No purchases found in trash" };
    }

    for (const purchase of purchases) {
      await logItemDeleted(
        userId,
        "Purchase",
        purchase.id,
        purchase.purchaseNumber
      );
    }

    await prisma.purchase.deleteMany({
      where: { id: { in: purchaseIds }, isTrash: true },
    });

    revalidateBothPaths("purchases");
    return { success: true };
  } catch (error) {
    console.error("deletePurchasesPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete purchases",
    };
  }
}

export async function getWarehousesForPurchase() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", warehouses: [] };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: {
        status: "active",
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

    return { success: true, warehouses };
  } catch (error) {
    console.error("getWarehousesForPurchase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouses",
      warehouses: [],
    };
  }
}


