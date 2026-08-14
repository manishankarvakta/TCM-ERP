"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { PurchaseStatus, ItemType, AccountType, VoucherType, Prisma } from "@prisma/client";
import * as z from "zod";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { findControlAccount } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/accounting-helpers";
import { createUserLog, LogAction } from "@/lib/user-log";

const purchaseItemSchema = z.object({
  itemId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
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
          in: [ItemType.RAW_MATERIAL, ItemType.READY_PRODUCT, ItemType.RETAIL, ItemType.WHOLESALE],
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        itemType: true,
        costPrice: true,
        barcode: true,
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
      items: items.map((item) => {
        // Calculate total stock from all warehouse balances
        const totalStock = item.stocks.reduce((sum: number, stock: {quantity: any}) => sum + Number(stock.quantity), 0);
        
        return {
          id: item.id,
          code: item.code,
          barcode: (item as any).barcode || null,
          description: item.name,
          itemType: item.itemType,
          unitPrice: item.costPrice ? Number(item.costPrice) : 0,
          stock: totalStock,
          unit: item.unit.symbol,
          variants: (item as any).variants ? ((item as any).variants as any[]).map((v) => ({
            id: v.id,
            sku: v.sku,
            barcode: v.barcode,
            size: v.size,
            color: v.color,
            costPrice: v.costPrice ? Number(v.costPrice) : null,
          })) : [],
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
  status: "trash" | "all" = "all",
  warehouseId?: string,
  startDate?: string,
  endDate?: string
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    let targetWarehouseId: string | undefined = undefined;
    if (isNormalUser) {
      targetWarehouseId = user?.defaultWarehouseId || undefined;
    } else if (warehouseId && warehouseId !== "all") {
      targetWarehouseId = warehouseId;
    }

    const where: Prisma.PurchaseWhereInput = {
      isTrash: status === "trash",
      ...(targetWarehouseId ? { warehouseId: targetWarehouseId } : {}),
    };

    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)) } : {}),
        ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {}),
      };
    }

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
        warehouse: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
        attachmentUrl: true,
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
            address: true,
            city: true,
            state: true,
            zip: true,
            country: true,
          },
        },
        items: {              // ✅ Add this
          select: {
            id: true,
            itemId: true,
            variantId: true,
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
              variantId: item.variantId || null,
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
      select: { 
        id: true, 
        purchaseNumber: true,
        status: true,  // Get current status
      },
    });

    if (!existingPurchase) {
      return { success: false, error: "Purchase not found", purchase: null };
    }

    // Prevent editing purchases that have received goods
    if (existingPurchase.status === "RECEIVED" || existingPurchase.status === "PARTIALLY_RECEIVED") {
      return { 
        success: false, 
        error: "Cannot edit a purchase that has received goods. Modifying the original order will conflict with generated Goods Receipt Notes (GRN).", 
        purchase: null 
      };
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
              variantId: item.variantId || null,
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

    // Prevent deleting purchases that have received goods
    if (purchase.status === "RECEIVED" || purchase.status === "PARTIALLY_RECEIVED") {
      return { 
        success: false, 
        error: "Cannot delete a purchase that has received goods. Cancel or delete the linked GRNs first." 
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


