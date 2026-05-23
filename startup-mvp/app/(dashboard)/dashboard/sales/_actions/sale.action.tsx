"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted, createUserLog, LogAction } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { SaleStatus, Prisma, ItemType, OrderType } from "@prisma/client";
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
  orderType: z.enum(["RETAIL", "READY_PRODUCT", "WHOLESALE"]).optional().default("RETAIL"),
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

    // Only get READY_PRODUCT, RETAIL and WHOLESALE items
    const items = await prisma.item.findMany({
      where: {
        status: "active",
        isTrash: false,
        itemType: {
          in: [ItemType.READY_PRODUCT, ItemType.RETAIL, ItemType.WHOLESALE],
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        unit: {
            select: {
                symbol: true
            }
        },
        category: {
            select: {
                name: true
            }
        },
        salesPrice: true,
        wholesalePrice: true,
        itemType: true,
        featuredImage: true,
        images: true,
        stocks: {
          select: {
            warehouseId: true,
            quantity: true,
          },
        },
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
        unit: item.unit?.symbol || "unit",
        category: item.category?.name || null,
        unitPrice: item.salesPrice ? Number(item.salesPrice) : 0,
        wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice) : 0,
        itemType: item.itemType,
        imageUrl: item.featuredImage || (Array.isArray(item.images) && item.images.length > 0 ? (item.images[0] as string) : null) || null,
        stocks: item.stocks.map(s => ({
            warehouseId: s.warehouseId,
            quantity: Number(s.quantity)
        })),
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

/**
 * Validate that required accounting accounts are configured
 * before creating/updating a sale to COMPLETED status
 */
async function validateSaleAccounts(
  clientId: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = tx || prisma;
    
    // Get sales and production accounts via dynamic import to avoid circular dep issues if any
    const { getSalesAccounts, getProductionAccounts } = await import("@/lib/accounting-settings");

    let salesAccounts;
    // let productionAccounts; // Reserved for COGS if strict checking needed

    try {
      salesAccounts = await getSalesAccounts();
      // productionAccounts = await getProductionAccounts();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error 
          ? error.message 
          : "Required accounting settings are not configured. Please configure Sales accounts in Settings.",
      };
    }

    // Check Revenue Account (Sales Income)
    if (!salesAccounts.revenueAccountId) {
      return {
        success: false,
        error: "Sales Revenue Account is not configured. Please set up the default revenue account in Sales Settings.",
      };
    }

    // Check Receivable Account
    // Either Client must have chartOfAccountId OR default receivable account must be set
    const clientData = await client.client.findUnique({
      where: { id: clientId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        chartOfAccountId: true 
      },
    });

    if (!clientData) {
      return {
        success: false,
        error: "Client not found",
      };
    }

    const hasClientAccount = !!clientData.chartOfAccountId;
    const hasDefaultReceivableAccount = !!salesAccounts.receivableAccountId;

    if (!hasClientAccount && !hasDefaultReceivableAccount) {
      return {
        success: false,
        error: `Cannot complete sale: Client "${clientData.name || clientData.email}" has no account ledger assigned, and no default Accounts Receivable account is configured in Sales Settings.`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("validateSaleAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate sale accounts",
    };
  }
}

/**
 * Create accounting voucher for Sale
 * Debit: Accounts Receivable (Client or Default)
 * Credit: Sales Revenue
 * Debit: COGS (if configured)
 * Credit: Inventory (if configured)
 */
async function createSaleAccountingVoucher(
  saleId: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; error?: string; voucherId?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const client = tx || prisma;

    // Get sale with items and item details
    const sale = await client.sale.findUnique({
      where: { id: saleId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            chartOfAccountId: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                itemType: true,
                costPrice: true,
                salesPrice: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return { success: false, error: "Sale not found" };
    }

    // Check if voucher already exists
    if (sale.voucherId) {
      return { success: true, voucherId: sale.voucherId };
    }

    // Get accounts
    const { getSalesAccounts, getProductionAccounts } = await import("@/lib/accounting-settings");

    let salesAccounts;
    let productionAccounts;

    try {
      salesAccounts = await getSalesAccounts();
      productionAccounts = await getProductionAccounts();
    } catch (error) {
      console.warn("Could not load all accounting settings", error);
    }

    if (!salesAccounts?.revenueAccountId) {
       return { success: false, error: "Sales Revenue Account not configured." };
    }

    // Calculate Totals and COGS
    let totalSaleAmount = 0;
    const cogsByAccount: Record<string, { amount: number; description: string }> = {};

    for (const item of sale.items) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice); // Sale Price
      const itemSaleAmount = quantity * unitPrice;
      totalSaleAmount += itemSaleAmount;

      if (item.item && item.item.costPrice) {
        const costPrice = Number(item.item.costPrice);
        const itemCOGS = quantity * costPrice;
        
        if (itemCOGS > 0) {
           let inventoryAccountId: string | null = null;
           // Prefer Sales settings for inventory if available (e.g. general FG or retail)
           // If detailed granular tracking specific to production types is needed, check item type
           
           if (item.item.itemType === ItemType.READY_PRODUCT) {
             inventoryAccountId = productionAccounts?.completionFinishedGoodsInventoryId || salesAccounts.finishedGoodsInventoryAccountId;
           } else if (item.item.itemType === ItemType.RETAIL) {
             // For retail, reuse FG or specific retail if we add it later
             inventoryAccountId = salesAccounts.finishedGoodsInventoryAccountId || productionAccounts?.completionFinishedGoodsInventoryId;
           }

           // Fallback
           if (!inventoryAccountId) {
              inventoryAccountId = salesAccounts.finishedGoodsInventoryAccountId;
           }

           if (inventoryAccountId) {
              if (!cogsByAccount[inventoryAccountId]) {
                cogsByAccount[inventoryAccountId] = { amount: 0, description: "COGS for " };
              }
              cogsByAccount[inventoryAccountId].amount += itemCOGS;
              
              if (!cogsByAccount[inventoryAccountId].description.includes(item.item.name)) {
                 if (cogsByAccount[inventoryAccountId].description.length < 100) {
                   cogsByAccount[inventoryAccountId].description += (cogsByAccount[inventoryAccountId].description === "COGS for " ? "" : ", ") + item.item.name;
                 } else if (!cogsByAccount[inventoryAccountId].description.endsWith("...")) {
                   cogsByAccount[inventoryAccountId].description += "...";
                 }
              }
           }
        }
      }
    }

    const voucherLines: Array<{
      lineNumber: number;
      debitAmount: number;
      creditAmount: number;
      description?: string;
      chartOfAccountId: string;
      clientId?: string;
    }> = [];

    let lineNumber = 1;

    // 1. Debit: Accounts Receivable
    const receivableAccountId = sale.client.chartOfAccountId || salesAccounts.receivableAccountId;
    if (!receivableAccountId) {
         return { success: false, error: "No Accounts Receivable ledger found for client and no default configured." };
    }

    voucherLines.push({
      lineNumber: lineNumber++,
      debitAmount: totalSaleAmount,
      creditAmount: 0,
      description: `Accounts Receivable - ${sale.saleNumber} - ${sale.client.name}`,
      chartOfAccountId: receivableAccountId,
      clientId: sale.clientId,
    });

    // 2. Credit: Sales Revenue
    voucherLines.push({
      lineNumber: lineNumber++,
      debitAmount: 0,
      creditAmount: totalSaleAmount,
      description: `Sales Revenue - ${sale.saleNumber}`,
      chartOfAccountId: salesAccounts.revenueAccountId,
    });

    // 3. COGS & Inventory
    if (salesAccounts.cogsAccountId) {
      for (const [invAccountId, data] of Object.entries(cogsByAccount)) {
        // Debit COGS
        voucherLines.push({
          lineNumber: lineNumber++,
          chartOfAccountId: salesAccounts.cogsAccountId,
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
    }

    if (voucherLines.length === 0) {
      return { success: false, error: "No valid voucher lines generated." };
    }

    const voucherResult = await createVoucher({
      date: sale.date,
      type: VoucherType.SALES,
      reference: sale.saleNumber,
      description: `Sale ${sale.saleNumber} - ${sale.client.name}`,
      clientId: sale.clientId,
      isSystemAction: true,
      lines: voucherLines,
    }, tx);

    if (!voucherResult.success || !voucherResult.voucher) {
      return {
        success: false,
        error: voucherResult.error || "Failed to create accounting voucher",
      };
    }

    const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
    if (!postResult.success) {
      return {
        success: false,
        error: postResult.error || "Failed to post accounting voucher",
      };
    }

    await client.sale.update({
      where: { id: saleId },
      data: { voucherId: voucherResult.voucher.id },
    });
    
    await createUserLog({
      userId,
      action: LogAction.ITEM_CREATED,
      details: `Created and posted sales accounting voucher for ${sale.saleNumber}`,
    });

    return { success: true, voucherId: voucherResult.voucher.id };

  } catch (error) {
    console.error("createSaleAccountingVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create sale accounting voucher",
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
    const userId = session.user.id;

    const validated = saleSchema.parse(input);

    // Validate accounts if creating as COMPLETED
    if (validated.status === "COMPLETED") {
       const accountValidation = await validateSaleAccounts(validated.clientId);
       if (!accountValidation.success) {
         return {
           success: false,
           error: accountValidation.error,
           sale: null,
         };
       }
    }

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
          orderType: validated.orderType,
          notes: validated.notes || null,
          attachmentUrl: validated.attachmentUrl || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          createdBy: userId,
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
          status: true,
          voucherId: true,
        },
      });

      // Automatically complete sale if status is COMPLETED
      // Automatically complete sale if status is COMPLETED
      if (sale.status === SaleStatus.COMPLETED) {
        const stockItems = validated.items.map(i => ({ itemId: i.itemId, quantity: i.quantity }));
        const stockResult = await updateStockOnSale(sale.id, validated.warehouseId, stockItems, tx);
        if (!stockResult.success) throw new Error(stockResult.error || "Failed to update stock");
        
        const voucherResult = await createSaleAccountingVoucher(sale.id, tx);
        if (!voucherResult.success) throw new Error(voucherResult.error || "Failed to create accounting voucher");
        
        // Re-fetch sale to get updated fields (completedAt, voucherId)
        return tx.sale.findUnique({
          where: { id: sale.id },
          select: {
            id: true,
            saleNumber: true,
            grandTotal: true,
            createdAt: true,
            completedAt: true,
            voucherId: true,
          }
        });
      }

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
    const userId = session.user.id;

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

    // Validate accounts if transitioning to COMPLETED (Only DRAFT can be edited, so this implies DRAFT -> COMPLETED)
    const isTransitioningToCompleted = validated.status === "COMPLETED";

    if (isTransitioningToCompleted) {
         const accountValidation = await validateSaleAccounts(validated.clientId);
         if (!accountValidation.success) {
            return {
                success: false,
                error: accountValidation.error,
                sale: null,
            };
         }
    }

    const sale = await prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({
        where: { saleId: validated.id },
      });

      const updatedSale = await tx.sale.update({
        where: { id: validated.id },
        data: {
          clientId: validated.clientId,
          warehouseId: validated.warehouseId,
          date: validated.date,
          status: validated.status,
          orderType: validated.orderType,
          notes: validated.notes || null,
          attachmentUrl: validated.attachmentUrl || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          updatedBy: userId,
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
          status: true,
          voucherId: true,
        },
      });

      // Update stock and create voucher if transitioning to COMPLETED
      if (isTransitioningToCompleted) {
         const stockItems = validated.items.map(i => ({ itemId: i.itemId, quantity: i.quantity }));
         const stockResult = await updateStockOnSale(updatedSale.id, validated.warehouseId, stockItems, tx);
         if (!stockResult.success) throw new Error(stockResult.error || "Failed to update stock");
         
         const voucherResult = await createSaleAccountingVoucher(updatedSale.id, tx);
         if (!voucherResult.success) throw new Error(voucherResult.error || "Failed to create accounting voucher");
      }

      return updatedSale;
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

export async function bulkUpdateSaleStatus(
  saleIds: string[],
  status: SaleStatus | "trash" | "restore"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (saleIds.length === 0) {
      return { success: false, error: "No sales selected" };
    }

    if (status === "trash") {
      // Only allow trashing DRAFT sales
      const result = await prisma.sale.updateMany({
        where: { 
          id: { in: saleIds },
          status: SaleStatus.DRAFT
        },
        data: { isTrash: true },
      });
      
      if (result.count === 0) {
        return { 
          success: false, 
          error: "No eligible sales found. Only DRAFT sales can be moved to trash." 
        };
      }
    } else if (status === "restore") {
      await prisma.sale.updateMany({
        where: { id: { in: saleIds } },
        data: { isTrash: false },
      });
    } else if (status === "COMPLETED") {
      // For bulk completion, we should use the completeSale function for each to ensure stock and accounting
      let successCount = 0;
      let errors: string[] = [];

      for (const id of saleIds) {
        try {
          const result = await completeSale(id);
          if (result.success) {
            successCount++;
          } else {
            errors.push(`${id}: ${result.error}`);
          }
        } catch (err) {
          errors.push(`${id}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (successCount === 0 && errors.length > 0) {
        return { success: false, error: `Failed to complete sales: ${errors.join(", ")}` };
      }
      
      return { 
        success: true, 
        message: `Successfully completed ${successCount} sales.${errors.length > 0 ? ` Errors in ${errors.length} sales.` : ""}` 
      };
    } else {
      // For other statuses (DRAFT, CANCELLED)
      const result = await prisma.sale.updateMany({
        where: { 
          id: { in: saleIds },
          status: { not: SaleStatus.COMPLETED } // Don't change completed sales
        },
        data: { status, isTrash: false },
      });

      if (result.count === 0 && status === "CANCELLED") {
        return { 
          success: false, 
          error: "No eligible sales found. COMPLETED sales cannot be cancelled." 
        };
      }
    }

    revalidateBothPaths("sales");
    return { success: true };
  } catch (error) {
    console.error("bulkUpdateSaleStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update sales",
    };
  }
}

/**
 * Helper function to find control account by name
 */
async function findControlAccount(accountName: string, tx?: Prisma.TransactionClient): Promise<string | null> {
  const client = tx || prisma;
  const account = await client.chartOfAccount.findFirst({
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
 * Internal helper to complete a sale (stock & accounting)
 * Must be called within a transaction if tx is provided
 * 
 * REFACTORED: Uses operation-based accounting settings (accounting.operationAccounts)
 */
async function performSaleCompletion(saleId: string, tx: Prisma.TransactionClient) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Get sale with items and item details
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: {
      items: {
        include: {
          item: {
            select: {
              id: true,
              code: true,
              name: true,
              itemType: true,
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

  if (!sale) throw new Error("Sale not found");

  // Prepare stock items for update
  const stockItems = sale.items
    .filter((item) => item.item?.trackInventory)
    .map((item) => ({
      itemId: item.itemId,
      quantity: Number(item.quantity),
    }));

  // Validate stock availability for all items
  for (const saleItem of sale.items) {
    if (!saleItem.item?.trackInventory) continue;

    const stock = await tx.stock.findUnique({
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
      throw new Error(`Insufficient stock for ${saleItem.item.name}. Available: ${availableQuantity}, Required: ${requiredQuantity}`);
    }
  }

  // 1. Deduct stock
  if (stockItems.length > 0) {
    const stockResult = await updateStockOnSale(
      saleId,
      sale.warehouseId,
      stockItems,
      tx
    );
    if (!stockResult.success) {
      throw new Error(stockResult.error || "Failed to update stock");
    }
  }

  // 2. Create Accounting Voucher
  const voucherResult = await createSaleAccountingVoucher(saleId, tx);
  if (!voucherResult.success) throw new Error(voucherResult.error || "Failed to create accounting voucher");

  // 3. Update sale status and link voucher
  const updatedSale = await tx.sale.update({
    where: { id: saleId },
    data: {
      status: SaleStatus.COMPLETED,
      completedAt: new Date(),
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

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { status: true },
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

    const result = await prisma.$transaction(async (tx) => {
      return await performSaleCompletion(saleId, tx);
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
