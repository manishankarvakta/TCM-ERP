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
      },
      select: {
        id: true,
        code: true,
        name: true,
        costPrice: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        description: item.name,
        unitPrice: item.costPrice ? Number(item.costPrice) : 0,
      })),
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
 * Create accounting voucher for purchase receipt
 * Creates item-type based accounting entries: Debit Inventory, Credit Accounts Payable
 */
async function createPurchaseAccountingVoucher(
  purchaseId: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; error?: string; voucherId?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const client = tx || prisma;
    // ... (rest of the function using userId)

    // Get purchase with items and item details
    const purchase = await client.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Find control accounts
    const apAccountId = await findControlAccount("Accounts Payable");
    const rawMaterialInventoryId = await findControlAccount("Raw Material Inventory");
    const finishedGoodsInventoryId = await findControlAccount("Finished Goods Inventory");
    const retailInventoryId = await findControlAccount("Retail Inventory");

    if (!apAccountId) {
      return {
        success: false,
        error: "Accounts Payable control account not found. Please ensure it exists in Chart of Accounts.",
      };
    }

    // Group items by itemType and calculate totals
    const itemsByType: Record<
      ItemType,
      Array<{ quantity: number; unitPrice: number; totalCost: number; description: string }>
    > = {
      RAW_MATERIAL: [],
      FINISHED_GOOD: [],
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

    // Debit: Inventory accounts based on item type
    if (itemsByType.RAW_MATERIAL.length > 0 && rawMaterialInventoryId) {
      const totalRawMaterialCost = itemsByType.RAW_MATERIAL.reduce(
        (sum, item) => sum + item.totalCost,
        0
      );
      if (totalRawMaterialCost > 0) {
        voucherLines.push({
          lineNumber: lineNumber++,
          debitAmount: totalRawMaterialCost,
          creditAmount: 0,
          description: `Raw Material Inventory - ${purchase.purchaseNumber}`,
          chartOfAccountId: rawMaterialInventoryId,
        });
        totalInventoryDebit += totalRawMaterialCost;
      }
    }

    if (itemsByType.FINISHED_GOOD.length > 0 && finishedGoodsInventoryId) {
      const totalFGCost = itemsByType.FINISHED_GOOD.reduce((sum, item) => sum + item.totalCost, 0);
      if (totalFGCost > 0) {
        voucherLines.push({
          lineNumber: lineNumber++,
          debitAmount: totalFGCost,
          creditAmount: 0,
          description: `Finished Goods Inventory - ${purchase.purchaseNumber}`,
          chartOfAccountId: finishedGoodsInventoryId,
        });
        totalInventoryDebit += totalFGCost;
      }
    }

    if (itemsByType.RETAIL.length > 0 && retailInventoryId) {
      const totalRetailCost = itemsByType.RETAIL.reduce((sum, item) => sum + item.totalCost, 0);
      if (totalRetailCost > 0) {
        voucherLines.push({
          lineNumber: lineNumber++,
          debitAmount: totalRetailCost,
          creditAmount: 0,
          description: `Retail Inventory - ${purchase.purchaseNumber}`,
          chartOfAccountId: retailInventoryId,
        });
        totalInventoryDebit += totalRetailCost;
      }
    }

    // Handle Tax and Discount
    const discount = Number(purchase.discount || 0);
    const tax = Number(purchase.tax || 0);
    const grandTotal = Number(purchase.grandTotal);

    if (tax > 0) {
      const taxAccountId = await findControlAccount("Tax Payable"); // Or a specific Purchase Tax account if available
      if (taxAccountId) {
        voucherLines.push({
          lineNumber: lineNumber++,
          debitAmount: tax,
          creditAmount: 0,
          description: `Purchase Tax - ${purchase.purchaseNumber}`,
          chartOfAccountId: taxAccountId,
        });
      }
    }

    if (discount > 0) {
      const discountAccountId = await findControlAccount("Other Income"); // Or "Purchase Discount" if available
      if (discountAccountId) {
        voucherLines.push({
          lineNumber: lineNumber++,
          debitAmount: 0,
          creditAmount: discount,
          description: `Purchase Discount - ${purchase.purchaseNumber}`,
          chartOfAccountId: discountAccountId,
        });
      }
    }

    // Credit: Accounts Payable
    if (grandTotal > 0) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: 0,
        creditAmount: grandTotal,
        description: `Accounts Payable - ${purchase.purchaseNumber} - ${purchase.supplier.name || purchase.supplier.email}`,
        chartOfAccountId: apAccountId,
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
      lines: voucherLines,
    });

    if (!voucherResult.success || !voucherResult.voucher) {
      return {
        success: false,
        error: voucherResult.error || "Failed to create accounting voucher",
      };
    }

    // Post voucher
    const postResult = await postVoucher(voucherResult.voucher.id);
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
      select: { id: true, purchaseNumber: true },
    });

    if (!existingPurchase) {
      return { success: false, error: "Purchase not found", purchase: null };
    }

    const subTotal = validated.items.reduce((sum, item) => sum + item.amount, 0);
    const discount = validated.discount ?? 0;
    const tax = validated.tax ?? 0;
    const grandTotal = subTotal - discount + tax;

    const purchase = await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: validated.id },
      });

      return tx.purchase.update({
        where: { id: validated.id },
        data: {
          supplierId: validated.supplierId,
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
    });

    await logItemUpdated(
      userId,
      "Purchase",
      purchase.id,
      ["details", "items"],
      purchase.purchaseNumber
    );

    // Update stock and create accounting voucher if purchase is received
    if (validated.status === "RECEIVED" || validated.status === "PARTIALLY_RECEIVED") {
      await updateStockOnPurchase(purchase.id);
      // Create accounting voucher (only if not already created)
      if (!purchase.voucherId) {
        await createPurchaseAccountingVoucher(purchase.id);
      }
    }

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
      select: { id: true, purchaseNumber: true, isTrash: true },
    });

    if (!purchase) {
      return { success: false, error: "Purchase not found" };
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
      await prisma.purchase.updateMany({
        where: { id: { in: purchaseIds } },
        data: { status, isTrash: false },
      });

      // Update stock and create accounting vouchers if status is RECEIVED or PARTIALLY_RECEIVED
      if (status === "RECEIVED" || status === "PARTIALLY_RECEIVED") {
        for (const purchaseId of purchaseIds) {
          await updateStockOnPurchase(purchaseId);
          // Check if voucher already exists before creating
          const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            select: { voucherId: true },
          });
          if (!purchase?.voucherId) {
            await createPurchaseAccountingVoucher(purchaseId);
          }
        }
      }
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


