"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { SaleStatus, Prisma, ItemType } from "@prisma/client";
import * as z from "zod";
import { updateStockOnSale } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { AccountType, VoucherType } from "@prisma/client";

const saleItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater"),
});

const saleSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  date: z.coerce.date(),
  status: z.nativeEnum(SaleStatus),
  notes: z.string().optional().nullable(),
  attachmentUrl: z
    .string()
    .url("Attachment must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  discount: z.coerce.number().min(0).optional().nullable(),
  tax: z.coerce.number().min(0).optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
});

const updateSaleSchema = saleSchema.extend({
  id: z.string().min(1),
});

function serializeSale(sale: {
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
    ...sale,
    subTotal: Number(sale.subTotal),
    discount: sale.discount ? Number(sale.discount) : null,
    tax: sale.tax ? Number(sale.tax) : null,
    grandTotal: Number(sale.grandTotal),
    items: sale.items?.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
    })),
  };
}

async function generateSaleNumber(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SAL-${year}-`;
  const client = tx || prisma;

  const lastSale = await client.sale.findFirst({
    where: {
      saleNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      saleNumber: "desc",
    },
    select: {
      saleNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastSale?.saleNumber) {
    const lastNumber = parseInt(lastSale.saleNumber.split("-").pop() || "0", 10);
    if (!isNaN(lastNumber) && lastNumber >= 1) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

export async function getClientsForSale() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", clients: [] };
    }

    const clients = await prisma.client.findMany({
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

    return { success: true, clients };
  } catch (error) {
    console.error("getClientsForSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      clients: [],
    };
  }
}

export async function getWarehousesForSale() {
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

    return { success: true, warehouses };
  } catch (error) {
    console.error("getWarehousesForSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouses",
      warehouses: [],
    };
  }
}

export async function getItemsForSale() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    // Only get FINISHED_GOOD and RETAIL items with salesPrice
    const items = await prisma.item.findMany({
      where: {
        status: "active",
        isTrash: false,
        itemType: {
          in: [ItemType.FINISHED_GOOD, ItemType.RETAIL],
        },
        salesPrice: {
          not: null,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        salesPrice: true,
        itemType: true,
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
        unitPrice: item.salesPrice ? Number(item.salesPrice) : 0,
        itemType: item.itemType,
      })),
    };
  } catch (error) {
    console.error("getItemsForSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items",
      items: [],
    };
  }
}

export async function getSales(
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
        sales: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      isTrash: status === "trash",
    };

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
        { client: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          saleNumber: true,
          date: true,
          status: true,
          grandTotal: true,
          isTrash: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.sale.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      sales: sales.map((sale) => ({
        ...sale,
        grandTotal: Number(sale.grandTotal),
      })),
      pagination: { page, limit, total, totalPages },
    };
  } catch (error) {
    console.error("getSales error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sales",
      sales: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function getSaleById(saleId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", sale: null };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        saleNumber: true,
        date: true,
        status: true,
        notes: true,
        attachmentUrl: true,
        subTotal: true,
        discount: true,
        tax: true,
        grandTotal: true,
        isTrash: true,
        client: {
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
        completedAt: true,
      },
    });

    if (!sale) {
      return { success: false, error: "Sale not found", sale: null };
    }

    return {
      success: true,
      sale: {
        id: sale.id,
        saleNumber: sale.saleNumber,
        date: sale.date,
        status: sale.status,
        notes: sale.notes,
        attachmentUrl: sale.attachmentUrl,
        subTotal: Number(sale.subTotal),
        discount: sale.discount ? Number(sale.discount) : null,
        tax: sale.tax ? Number(sale.tax) : null,
        grandTotal: Number(sale.grandTotal),
        isTrash: sale.isTrash,
        client: sale.client,
        warehouse: sale.warehouse,
        createdByUser: sale.createdByUser,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        completedAt: sale.completedAt,
        items: sale.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount),
        })),
      },
    };
  } catch (error) {
    console.error("getSaleById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sale",
      sale: null,
    };
  }
}

export async function createSale(input: z.infer<typeof saleSchema>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", sale: null };
    }

    const validated = saleSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      let saleNumber = await generateSaleNumber(tx);
      let saleNumberExists = await tx.sale.findUnique({
        where: { saleNumber },
        select: { id: true },
      });

      let attempts = 0;
      while (saleNumberExists && attempts < 10) {
        const codeWithoutPrefix = saleNumber.replace("SAL-", "");
        const parts = codeWithoutPrefix.split("-");
        if (parts.length === 2) {
          const year = parts[0];
          const number = parseInt(parts[1], 10);
          if (!isNaN(number) && number >= 1) {
            const newNumber = number + 1;
            saleNumber = `SAL-${year}-${newNumber.toString().padStart(4, "0")}`;
          } else {
            saleNumber = `SAL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
          }
        } else {
          saleNumber = `SAL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        }
        saleNumberExists = await tx.sale.findUnique({
          where: { saleNumber },
          select: { id: true },
        });
        attempts++;
      }

      if (saleNumberExists) {
        throw new Error("Unable to generate unique sale number. Please try again.");
      }

      const subTotal = validated.items.reduce((sum, item) => sum + item.amount, 0);
      const discount = validated.discount ?? 0;
      const tax = validated.tax ?? 0;
      const grandTotal = subTotal - discount + tax;

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          clientId: validated.clientId,
          warehouseId: validated.warehouseId,
          date: validated.date,
          status: validated.status,
          notes: validated.notes || null,
          attachmentUrl: validated.attachmentUrl || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          createdBy: session.user.id,
          items: {
            create: validated.items.map((item) => ({
              itemId: item.itemId,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.amount),
            })),
          },
        },
        select: {
          id: true,
          saleNumber: true,
          grandTotal: true,
          createdAt: true,
        },
      });

      return sale;
    });

    await logItemCreated(
      session.user.id,
      "Sale",
      result.id,
      result.saleNumber,
      {
        saleNumber: result.saleNumber,
        grandTotal: Number(result.grandTotal),
      }
    );

    revalidateBothPaths("sales");

    return {
      success: true,
      sale: {
        ...result,
        grandTotal: Number(result.grandTotal),
      },
    };
  } catch (error) {
    console.error("createSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create sale",
      sale: null,
    };
  }
}

export async function updateSale(input: z.infer<typeof updateSaleSchema>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", sale: null };
    }

    const validated = updateSaleSchema.parse(input);

    const existingSale = await prisma.sale.findUnique({
      where: { id: validated.id },
      select: { id: true, saleNumber: true, status: true },
    });

    if (!existingSale) {
      return { success: false, error: "Sale not found", sale: null };
    }

    // Only allow editing DRAFT sales
    if (existingSale.status !== "DRAFT") {
      return {
        success: false,
        error: "Only DRAFT sales can be edited",
        sale: null,
      };
    }

    const subTotal = validated.items.reduce((sum, item) => sum + item.amount, 0);
    const discount = validated.discount ?? 0;
    const tax = validated.tax ?? 0;
    const grandTotal = subTotal - discount + tax;

    const sale = await prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({
        where: { saleId: validated.id },
      });

      return tx.sale.update({
        where: { id: validated.id },
        data: {
          clientId: validated.clientId,
          warehouseId: validated.warehouseId,
          date: validated.date,
          status: validated.status,
          notes: validated.notes || null,
          attachmentUrl: validated.attachmentUrl || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          updatedBy: session.user.id,
          items: {
            create: validated.items.map((item) => ({
              itemId: item.itemId,
              description: item.description,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.amount),
            })),
          },
        },
        select: {
          id: true,
          saleNumber: true,
          grandTotal: true,
          updatedAt: true,
        },
      });
    });

    await logItemUpdated(
      session.user.id,
      "Sale",
      sale.id,
      ["details", "items"],
      sale.saleNumber,
      {
        saleNumber: sale.saleNumber,
        grandTotal: Number(sale.grandTotal),
      }
    );

    revalidateBothPaths("sales");

    return {
      success: true,
      sale: {
        ...sale,
        grandTotal: Number(sale.grandTotal),
      },
    };
  } catch (error) {
    console.error("updateSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update sale",
      sale: null,
    };
  }
}

export async function deleteSale(saleId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { id: true, saleNumber: true, isTrash: true, status: true },
    });

    if (!sale) {
      return { success: false, error: "Sale not found" };
    }

    // Only allow deleting DRAFT sales
    if (sale.status !== "DRAFT") {
      return {
        success: false,
        error: "Only DRAFT sales can be deleted",
      };
    }

    await prisma.sale.update({
      where: { id: saleId },
      data: { isTrash: true },
    });

    await logItemDeleted(
      session.user.id,
      "Sale",
      saleId,
      sale.saleNumber,
      { saleNumber: sale.saleNumber }
    );

    revalidateBothPaths("sales");

    return { success: true };
  } catch (error) {
    console.error("deleteSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete sale",
    };
  }
}

export async function deleteSalesPermanently(saleIds: string[]) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (saleIds.length === 0) {
      return { success: false, error: "No sales selected" };
    }

    const sales = await prisma.sale.findMany({
      where: { id: { in: saleIds }, isTrash: true },
      select: { id: true, saleNumber: true, status: true },
    });

    if (sales.length === 0) {
      return { success: false, error: "No sales found in trash" };
    }

    // Only allow deleting DRAFT sales from trash
    const draftSales = sales.filter((s) => s.status === "DRAFT");
    if (draftSales.length === 0) {
      return {
        success: false,
        error: "Only DRAFT sales can be permanently deleted",
      };
    }

    for (const sale of draftSales) {
      await logItemDeleted(
        session.user.id,
        "Sale",
        sale.id,
        sale.saleNumber,
        { saleNumber: sale.saleNumber }
      );
    }

    await prisma.sale.deleteMany({
      where: { id: { in: draftSales.map((s) => s.id) }, isTrash: true },
    });

    revalidateBothPaths("sales");
    return { success: true };
  } catch (error) {
    console.error("deleteSalesPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete sales",
    };
  }
}

/**
 * Helper function to find control account by name
 */
async function findControlAccount(accountName: string): Promise<string | null> {
  const account = await prisma.chartOfAccount.findFirst({
    where: {
      name: {
        contains: accountName,
        mode: "insensitive",
      },
      status: "active",
    },
    select: {
      id: true,
    },
  });

  return account?.id || null;
}

/**
 * Complete a sale: deduct stock, create accounting entries, update status
 */
export async function completeSale(saleId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", sale: null };
    }

    // Get sale with items and item details
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                trackInventory: true,
                costPrice: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!sale) {
      return { success: false, error: "Sale not found", sale: null };
    }

    if (sale.status !== "DRAFT") {
      return {
        success: false,
        error: `Sale is already ${sale.status}. Only DRAFT sales can be completed.`,
        sale: null,
      };
    }

    // Validate stock availability for all items
    for (const saleItem of sale.items) {
      if (!saleItem.item?.trackInventory) continue;

      const stock = await prisma.stock.findUnique({
        where: {
          itemId_warehouseId: {
            itemId: saleItem.itemId,
            warehouseId: sale.warehouseId,
          },
        },
        select: {
          quantity: true,
          reservedQuantity: true,
        },
      });

      const availableQuantity = stock
        ? Number(stock.quantity) - Number(stock.reservedQuantity)
        : 0;
      const requiredQuantity = Number(saleItem.quantity);

      if (availableQuantity < requiredQuantity) {
        return {
          success: false,
          error: `Insufficient stock for ${saleItem.item.name}. Available: ${availableQuantity}, Required: ${requiredQuantity}`,
          sale: null,
        };
      }
    }

    // Use transaction for accounting and status update
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct stock (moved inside transaction for atomicity)
      if (stockItems.length > 0) {
        const stockResult = await updateStockOnSale(
          saleId,
          sale.warehouseId,
          stockItems
        );
        if (!stockResult.success) {
          throw new Error(stockResult.error || "Failed to update stock");
        }
      }

      // 2. Find control accounts
      const arAccountId = await findControlAccount("Accounts Receivable");
      const salesRevenueAccountId = await findControlAccount("Sales Revenue");
      const cogsAccountId = await findControlAccount("Cost of Goods Sold");
      const fgInventoryAccountId = await findControlAccount("Finished Goods Inventory");
      const retailInventoryAccountId = await findControlAccount("Retail Inventory");

      if (!arAccountId || !salesRevenueAccountId) {
        throw new Error(
          "Required control accounts not found. Please ensure Accounts Receivable and Sales Revenue accounts exist."
        );
      }

      // 3. Calculate COGS (for FINISHED_GOOD and RETAIL items)
      const cogsByAccount: Record<string, { amount: number; description: string }> = {};

      for (const saleItem of sale.items) {
        if (!saleItem.item.costPrice) continue;

        const itemCOGS = Number(saleItem.quantity) * Number(saleItem.item.costPrice);
        if (itemCOGS <= 0) continue;

        let inventoryAccountId: string | null = null;
        if (saleItem.item.type === ItemType.FINISHED_GOOD) {
          inventoryAccountId = fgInventoryAccountId;
        } else if (saleItem.item.type === ItemType.RETAIL) {
          inventoryAccountId = retailInventoryAccountId;
        }

        if (inventoryAccountId && cogsAccountId) {
          if (!cogsByAccount[inventoryAccountId]) {
            cogsByAccount[inventoryAccountId] = { amount: 0, description: "COGS for " };
          }
          cogsByAccount[inventoryAccountId].amount += itemCOGS;
          // Append item name to description (limited to avoid too long string)
          if (!cogsByAccount[inventoryAccountId].description.includes(saleItem.item.name)) {
            if (cogsByAccount[inventoryAccountId].description.length < 100) {
              cogsByAccount[inventoryAccountId].description += (cogsByAccount[inventoryAccountId].description === "COGS for " ? "" : ", ") + saleItem.item.name;
            } else if (!cogsByAccount[inventoryAccountId].description.endsWith("...")) {
              cogsByAccount[inventoryAccountId].description += "...";
            }
          }
        }
      }

      // 4. Create accounting voucher
      const voucherLines: Array<{
        lineNumber: number;
        debitAmount: number;
        creditAmount: number;
        description?: string;
        chartOfAccountId: string;
        clientId?: string;
      }> = [];

      let lineNumber = 1;

      // Debit: Accounts Receivable
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: Number(sale.grandTotal),
        creditAmount: 0,
        description: `Sale ${sale.saleNumber} - ${sale.client.name}`,
        chartOfAccountId: arAccountId,
        clientId: sale.clientId,
      });

      // Credit: Sales Revenue
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: 0,
        creditAmount: Number(sale.grandTotal),
        description: `Sales Revenue for ${sale.saleNumber}`,
        chartOfAccountId: salesRevenueAccountId,
      });

      // Add COGS lines (Aggregated by inventory account)
      for (const [invAccountId, data] of Object.entries(cogsByAccount)) {
        // Debit COGS
        voucherLines.push({
          lineNumber: lineNumber++,
          chartOfAccountId: cogsAccountId!,
          debitAmount: data.amount,
          creditAmount: 0,
          description: `${data.description} (${sale.saleNumber})`,
        });

        // Credit Inventory
        voucherLines.push({
          lineNumber: lineNumber++,
          chartOfAccountId: invAccountId,
          debitAmount: 0,
          creditAmount: data.amount,
          description: `Inventory reduction for ${sale.saleNumber}`,
        });
      }

      // Create voucher
      const voucherResult = await createVoucher({
        date: sale.date,
        type: VoucherType.SALES,
        reference: sale.saleNumber,
        description: `Sale ${sale.saleNumber} - ${sale.client.name}`,
        clientId: sale.clientId,
        lines: voucherLines,
      });

      if (!voucherResult.success || !voucherResult.voucher) {
        throw new Error(
          voucherResult.error || "Failed to create accounting voucher"
        );
      }

      // 5. Post voucher
      const postResult = await postVoucher(voucherResult.voucher.id);
      if (!postResult.success) {
        throw new Error(postResult.error || "Failed to post accounting voucher");
      }

      // 6. Update sale status and link voucher
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: SaleStatus.COMPLETED,
          completedAt: new Date(),
          voucherId: voucherResult.voucher.id,
          updatedBy: session.user.id,
        },
        select: {
          id: true,
          saleNumber: true,
          status: true,
          completedAt: true,
          voucherId: true,
        },
      });

      return updatedSale;
    });

    // Log activity
    await logItemUpdated(
      session.user.id,
      "Sale",
      result.id,
      ["status"],
      result.saleNumber,
      {
        saleNumber: result.saleNumber,
        status: result.status,
      }
    );

    revalidateBothPaths("sales");

    return {
      success: true,
      sale: {
        ...result,
        completedAt: result.completedAt,
        voucherId: result.voucherId,
      },
    };
  } catch (error) {
    console.error("completeSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete sale",
      sale: null,
    };
  }
}

/**
 * Cancel a sale
 */
export async function cancelSale(saleId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", sale: null };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { id: true, saleNumber: true, status: true },
    });

    if (!sale) {
      return { success: false, error: "Sale not found", sale: null };
    }

    if (sale.status === "CANCELLED") {
      return {
        success: false,
        error: "Sale is already cancelled",
        sale: null,
      };
    }

    if (sale.status === "COMPLETED") {
      return {
        success: false,
        error: "Completed sales cannot be cancelled. Please reverse the transaction instead.",
        sale: null,
      };
    }

    const updatedSale = await prisma.sale.update({
      where: { id: saleId },
      data: {
        status: SaleStatus.CANCELLED,
        updatedBy: session.user.id,
      },
      select: {
        id: true,
        saleNumber: true,
        status: true,
        updatedAt: true,
      },
    });

    await logItemUpdated(
      session.user.id,
      "Sale",
      updatedSale.id,
      ["status"],
      updatedSale.saleNumber,
      {
        saleNumber: updatedSale.saleNumber,
        status: updatedSale.status,
      }
    );

    revalidateBothPaths("sales");

    return {
      success: true,
      sale: updatedSale,
    };
  } catch (error) {
    console.error("cancelSale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel sale",
      sale: null,
    };
  }
}
