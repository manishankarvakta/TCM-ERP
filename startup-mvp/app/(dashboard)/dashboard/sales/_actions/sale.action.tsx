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
  variantId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().refine(val => val !== 0, "Quantity cannot be zero"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  amount: z.coerce.number(),
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
  couponCode: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
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

    let defaultClient = await prisma.client.findFirst({
      where: { name: { equals: "Walkway Customer", mode: "insensitive" } },
      select: { id: true, name: true, email: true, company: true }
    });

    if (!defaultClient) {
      const newClient = await prisma.client.create({
        data: {
          name: "Walkway Customer",
          email: "walkway@customer.local",
          phone: "00000000000",
          status: "active",
          createdBy: session.user.id
        }
      });
      defaultClient = {
        id: newClient.id,
        name: newClient.name,
        email: newClient.email,
        company: newClient.company
      };
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
        clientCode: true,
        clientType: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Make sure Walkway Customer is at the top or at least exists
    const clientList = clients.filter(c => c.id !== defaultClient?.id);
    if (defaultClient) {
      clientList.unshift(defaultClient);
    }

    return { success: true, clients: clientList };
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

export async function getPaymentAccountsForPOS() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", accounts: [] };
    }
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        type: "ASSET",
        status: "active",
        isControl: false,
      },
      select: {
        id: true,
        code: true,
        name: true,
        CashBankAccount: {
          select: {
            type: true,
            isVisible: true,
            warehouses: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    const isWalletName = (name: string) => {
      const n = name.toLowerCase();
      return n.includes("bkash") || n.includes("nagad") || n.includes("rocket") || n.includes("upay") || n.includes("wallet");
    };

    const formatted = accounts
      .map((acc) => {
        // Determine account type: WALLET, CASH, BANK
        let type: "CASH" | "BANK" | "WALLET" | null = null;
        if (isWalletName(acc.name)) {
          type = "WALLET";
        } else if (acc.CashBankAccount?.type) {
          type = acc.CashBankAccount.type as "CASH" | "BANK";
        } else {
          if (acc.name.toLowerCase().includes("cash")) {
            type = "CASH";
          } else if (acc.name.toLowerCase().includes("bank") || acc.name.toLowerCase().includes("card")) {
            type = "BANK";
          }
        }

        const warehouseIds = acc.CashBankAccount?.warehouses?.map(w => w.id) || [];
        const isVisible = acc.CashBankAccount ? acc.CashBankAccount.isVisible : true;

        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          type: type,
          warehouseIds: warehouseIds,
          isVisible: isVisible,
        };
      })
      .filter((acc) => (acc.type === "CASH" || acc.type === "BANK" || acc.type === "WALLET") && acc.isVisible);

    return { success: true, accounts: formatted };
  } catch (error) {
    console.error("getPaymentAccountsForPOS error:", error);
    return { success: false, error: "Failed to fetch payment accounts", accounts: [] };
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
        description: true,
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
        isVatEnabled: true,
        vatPercentage: true,
        stocks: {
          select: {
            warehouseId: true,
            quantity: true,
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
            salesPrice: true,
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
        name: item.name,
        description: item.name,
        itemDescription: item.description || "",
        unit: item.unit?.symbol || "unit",
        category: item.category?.name || null,
        unitPrice: item.salesPrice ? Number(item.salesPrice) : 0,
        wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice) : 0,
        itemType: item.itemType,
        imageUrl: item.featuredImage || (Array.isArray(item.images) && item.images.length > 0 ? (item.images[0] as string) : null) || null,
        isVatEnabled: item.isVatEnabled || false,
        vatPercentage: item.vatPercentage ? Number(item.vatPercentage) : 0,
        stocks: item.stocks.map(s => ({
            warehouseId: s.warehouseId,
            quantity: Number(s.quantity)
        })),
        variants: (item as any).variants ? ((item as any).variants as any[]).map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: v.barcode,
          size: v.size,
          color: v.color,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          salesPrice: v.salesPrice ? Number(v.salesPrice) : null,
        })) : [],
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
 * Validate and apply a coupon code from the database.
 * Returns the discount amount for the given subtotal if coupon is valid.
 */
export async function validateCoupon(
  code: string,
  subTotal: number
): Promise<{ success: boolean; discountAmount?: number; message?: string; couponId?: string; error?: string }> {
  try {
    if (!code || !code.trim()) {
      return { success: false, error: "No coupon code provided" };
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      return { success: false, error: "Invalid coupon code. Please check and try again." };
    }

    if (coupon.status !== "ACTIVE") {
      return { success: false, error: "This coupon is no longer active." };
    }

    if (coupon.expiryDate && coupon.expiryDate < new Date()) {
      return { success: false, error: "This coupon has expired." };
    }

    const value = Number(coupon.value);
    let discountAmount = 0;
    let message = "";

    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = Math.round(subTotal * (value / 100));
      message = `${value}% discount applied! You save ৳${discountAmount.toFixed(2)}`;
    } else if (coupon.discountType === "FLAT") {
      discountAmount = Math.min(value, subTotal);
      message = `Flat ৳${value} discount applied!`;
    } else {
      return { success: false, error: "Unknown coupon type." };
    }

    return {
      success: true,
      discountAmount,
      message,
      couponId: coupon.id,
    };
  } catch (error) {
    console.error("validateCoupon error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate coupon",
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

    let hasClientAccount = !!clientData.chartOfAccountId;
    const hasDefaultReceivableAccount = !!salesAccounts.receivableAccountId;

    if (!hasClientAccount) {
      // Let's dynamically create the Chart of Account for this customer
      try {
        const arParent = await client.chartOfAccount.findFirst({
          where: {
            name: { contains: "Accounts Receivable", mode: "insensitive" },
            status: "active",
            type: AccountType.ASSET,
          },
          select: { id: true }
        });
        
        if (arParent) {
          const year = new Date().getFullYear();
          const prefix = `AR-${year}-`;
          
          const lastAccount = await client.chartOfAccount.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: "desc" },
            select: { code: true },
          });

          let nextNumber = 1;
          if (lastAccount) {
            const lastNumberStr = lastAccount.code.split("-").pop() || "0";
            const lastNumber = parseInt(lastNumberStr, 10);
            if (!isNaN(lastNumber)) {
              nextNumber = lastNumber + 1;
            }
          }
          const accountCode = `${prefix}${nextNumber.toString().padStart(4, "0")}`;
          const customerName = clientData.name || clientData.email;
          const accountName = `AR - ${customerName}`;
          const coaId = `coa_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

          // Get a valid user ID for createdBy
          const firstUser = await client.user.findFirst({
            where: { status: "active" },
            select: { id: true }
          });
          const createdByUserId = firstUser?.id || "system"; // Fallback, but firstUser.id will exist

          // Create the ChartOfAccount
          const newCoa = await client.chartOfAccount.create({
            data: {
              id: coaId,
              code: accountCode,
              name: accountName,
              type: AccountType.ASSET,
              parentId: arParent.id,
              description: `Accounts Receivable account for customer: ${customerName}`,
              status: "active",
              createdBy: createdByUserId,
            }
          });

          // Link to client
          await client.client.update({
            where: { id: clientId },
            data: { chartOfAccountId: newCoa.id }
          });
          
          hasClientAccount = true;
        }
      } catch (err) {
        console.error("Failed to dynamically generate ChartOfAccount for client:", err);
      }
    }

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
  tx?: Prisma.TransactionClient,
  paymentMethod?: string
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
        
        if (itemCOGS !== 0) {
           let inventoryAccountId: string | null = null;
           // Prefer Sales settings for inventory if available (e.g. general FG or retail)
           // If detailed granular tracking specific to production types is needed, check item type
           
           if (item.item.itemType === ItemType.READY_PRODUCT) {
             inventoryAccountId = productionAccounts?.completionFinishedGoodsInventoryId || salesAccounts.finishedGoodsInventoryAccountId || null;
           } else if (item.item.itemType === ItemType.RETAIL) {
             // For retail, reuse FG or specific retail if we add it later
             inventoryAccountId = salesAccounts.finishedGoodsInventoryAccountId || productionAccounts?.completionFinishedGoodsInventoryId || null;
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

    // 1. Debit: Cash/Bank or Accounts Receivable depending on payment method
    let debitAccountId: string | null = null;
    let debitDescription = "";
    let debitClientId: string | undefined = undefined;

    // Check if paymentMethod is a direct ChartOfAccount CUID (typically starts with 'c')
    if (paymentMethod && paymentMethod.startsWith("c")) {
      const directAcct = await client.chartOfAccount.findUnique({
        where: { id: paymentMethod, status: "active" },
        select: { id: true, name: true }
      });
      if (directAcct) {
        debitAccountId = directAcct.id;
        debitDescription = `Payment Received via ${directAcct.name} - ${sale.saleNumber} - ${sale.client.name}`;
      }
    }

    if (!debitAccountId) {
      const normalizedMethod = (paymentMethod || "").toUpperCase();
      if (normalizedMethod === "CASH") {
        // Try to use configured receipt cash account (Cash in Hand / Cash register)
        try {
          const allSettings = await (await import("@/lib/accounting-settings")).getAccountingOperationSettings();
          if (allSettings?.receipt?.cashAccountId) {
            debitAccountId = allSettings.receipt.cashAccountId;
            debitDescription = `Cash Received - ${sale.saleNumber} - ${sale.client.name}`;
          }
        } catch (_) {}
        // Fallback: search for a "Cash" ASSET account by name
        if (!debitAccountId) {
          const cashAcct = await client.chartOfAccount.findFirst({
            where: {
              name: { contains: "Cash", mode: "insensitive" },
              type: "ASSET",
              status: "active",
            },
            select: { id: true },
          });
          if (cashAcct) {
            debitAccountId = cashAcct.id;
            debitDescription = `Cash Received - ${sale.saleNumber} - ${sale.client.name}`;
          }
        }
      } else if (normalizedMethod === "CARD" || normalizedMethod === "MOBILE" || normalizedMethod === "BANK") {
        // Try to use configured bank account
        try {
          const allSettings = await (await import("@/lib/accounting-settings")).getAccountingOperationSettings();
          // Check contra from-account (often a Bank account)
          if (allSettings?.contra?.fromAccountId) {
            debitAccountId = allSettings.contra.fromAccountId;
            debitDescription = `Bank/Card Received - ${sale.saleNumber} - ${sale.client.name}`;
          }
        } catch (_) {}
        // Fallback: search for a "Bank" ASSET account by name
        if (!debitAccountId) {
          const bankAcct = await client.chartOfAccount.findFirst({
            where: {
              name: { contains: "Bank", mode: "insensitive" },
              type: "ASSET",
              status: "active",
            },
            select: { id: true },
          });
          if (bankAcct) {
            debitAccountId = bankAcct.id;
            debitDescription = `Bank Received - ${sale.saleNumber} - ${sale.client.name}`;
          }
        }
      }
    }

    // Fallback to Accounts Receivable if no direct payment account was resolved
    if (!debitAccountId) {
      const receivableAccountId = sale.client.chartOfAccountId || salesAccounts.receivableAccountId;
      if (!receivableAccountId) {
        return { success: false, error: "No Cash/Bank or Accounts Receivable ledger found. Please configure sales accounts." };
      }
      debitAccountId = receivableAccountId;
      debitDescription = `Accounts Receivable - ${sale.saleNumber} - ${sale.client.name}`;
      debitClientId = sale.clientId;
    }

    const isReturn = Number(totalSaleAmount) < 0;
    const absTotalSaleAmount = Math.abs(Number(totalSaleAmount));

    // 1. Payment/Receivable
    voucherLines.push({
      lineNumber: lineNumber++,
      debitAmount: isReturn ? 0 : absTotalSaleAmount,
      creditAmount: isReturn ? absTotalSaleAmount : 0,
      description: debitDescription,
      chartOfAccountId: debitAccountId,
      clientId: debitClientId,
    });

    // 2. Sales Revenue
    voucherLines.push({
      lineNumber: lineNumber++,
      debitAmount: isReturn ? absTotalSaleAmount : 0,
      creditAmount: isReturn ? 0 : absTotalSaleAmount,
      description: `Sales Revenue - ${sale.saleNumber}`,
      chartOfAccountId: salesAccounts.revenueAccountId,
    });

    // 3. COGS & Inventory
    if (salesAccounts.cogsAccountId) {
      for (const [invAccountId, data] of Object.entries(cogsByAccount)) {
        const absAmount = Math.abs(data.amount);
        
        // COGS
        voucherLines.push({
          lineNumber: lineNumber++,
          chartOfAccountId: salesAccounts.cogsAccountId,
          debitAmount: isReturn ? 0 : absAmount,
          creditAmount: isReturn ? absAmount : 0,
          description: `${data.description} (${sale.saleNumber})`,
        });

        // Inventory
        voucherLines.push({
          lineNumber: lineNumber++,
          chartOfAccountId: invAccountId,
          debitAmount: isReturn ? absAmount : 0,
          creditAmount: isReturn ? 0 : absAmount,
          description: isReturn ? `Inventory restock for ${sale.saleNumber}` : `Inventory reduction for ${sale.saleNumber}`,
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

export async function getSaleByNumber(saleNumber: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", sale: null };
    }

    const sale = await prisma.sale.findUnique({
      where: { saleNumber },
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
    console.error("getSaleByNumber error:", error);
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

      // Fetch client info to check if they are classified as wholesale client
      const client = await tx.client.findUnique({
        where: { id: validated.clientId },
        select: { name: true, email: true, company: true, clientCode: true }
      });

      const isWholesaleClient = client
        ? !!(
            client.company?.toLowerCase().includes("wholesale") ||
            client.name?.toLowerCase().includes("wholesale") ||
            client.email?.toLowerCase().includes("wholesale") ||
            client.clientCode?.toLowerCase().includes("wholesale")
          )
        : false;

      // Apply custom client discounts if orderType is WHOLESALE or customer is classified as wholesale client
      let itemsToCreate = validated.items;
      let calculatedSubTotal = 0;

      if (validated.orderType === "WHOLESALE" || isWholesaleClient) {
        // Fetch client discounts
        const clientDiscounts = await tx.clientItemDiscount.findMany({
          where: { clientId: validated.clientId }
        });

        const itemIds = validated.items.map(i => i.itemId);
        const variantIds = validated.items.map(i => i.variantId).filter(Boolean) as string[];

        const dbItems = await tx.item.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, wholesalePrice: true, wholesaleDiscountAmount: true, salesPrice: true }
        });

        const dbVariants = variantIds.length > 0 ? await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, salesPrice: true, wholesalePrice: true, wholesaleDiscountAmount: true }
        }) : [];

        itemsToCreate = validated.items.map((item) => {
          const itemDb = dbItems.find(i => i.id === item.itemId);
          const variantDb = item.variantId ? dbVariants.find(v => v.id === item.variantId) : null;
          
          let basePrice = item.unitPrice;
          if (variantDb) {
            if (variantDb.wholesalePrice !== null) {
              basePrice = Number(variantDb.wholesalePrice);
            } else if (variantDb.wholesaleDiscountAmount !== null) {
              basePrice = Number(variantDb.salesPrice || itemDb?.salesPrice || 0) - Number(variantDb.wholesaleDiscountAmount);
            } else if (variantDb.salesPrice !== null) {
              basePrice = Number(variantDb.salesPrice);
            }
          } else if (itemDb) {
            if (itemDb.wholesalePrice !== null) {
              basePrice = Number(itemDb.wholesalePrice);
            } else if (itemDb.wholesaleDiscountAmount !== null) {
              basePrice = Number(itemDb.salesPrice || 0) - Number(itemDb.wholesaleDiscountAmount);
            } else if (itemDb.salesPrice !== null) {
              basePrice = Number(itemDb.salesPrice);
            }
          }

          let discountRecord = null;
          if (item.variantId) {
            discountRecord = clientDiscounts.find(
              d => d.variantId === item.variantId
            );
          }
          if (!discountRecord) {
            discountRecord = clientDiscounts.find(
              d => d.itemId === item.itemId && !d.variantId
            );
          }

          let finalUnitPrice = basePrice;
          if (discountRecord) {
            let discountApplied = 0;
            if (discountRecord.discountType === "PERCENTAGE") {
              discountApplied = basePrice * (Number(discountRecord.discountValue) / 100);
            } else if (discountRecord.discountType === "FLAT") {
              discountApplied = Number(discountRecord.discountValue);
            }
            finalUnitPrice = Math.max(0, basePrice - discountApplied);
          }

          const amount = item.quantity * finalUnitPrice;
          calculatedSubTotal += amount;

          return {
            ...item,
            unitPrice: finalUnitPrice,
            amount,
          };
        });
      } else {
        calculatedSubTotal = validated.items.reduce((sum, item) => sum + item.amount, 0);
      }

      const discount = validated.discount ?? 0;
      const tax = validated.tax ?? 0;
      const grandTotal = calculatedSubTotal - discount + tax;

      // Resolve coupon if a code was passed
      let resolvedCouponId: string | null = null;
      if (validated.couponCode) {
        const dbCoupon = await tx.coupon.findUnique({
          where: { code: validated.couponCode.trim().toUpperCase() },
          select: { id: true, status: true, expiryDate: true },
        });
        if (dbCoupon && dbCoupon.status === "ACTIVE" && (!dbCoupon.expiryDate || dbCoupon.expiryDate >= new Date())) {
          resolvedCouponId = dbCoupon.id;
        }
      }

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          clientId: validated.clientId,
          warehouseId: validated.warehouseId,
          date: validated.date,
          status: validated.status,
          orderType: validated.orderType,
          notes: validated.notes || `POS Sale - Paid via ${validated.paymentMethod || 'CASH'}`,
          attachmentUrl: validated.attachmentUrl || null,
          subTotal: new Prisma.Decimal(calculatedSubTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          createdBy: userId,
          ...(resolvedCouponId ? { couponId: resolvedCouponId } : {}),
          items: {
            create: itemsToCreate.map((item) => ({
              itemId: item.itemId,
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
        const stockItems = itemsToCreate.map(i => ({ itemId: i.itemId, variantId: i.variantId || undefined, quantity: i.quantity }));
        const stockResult = await updateStockOnSale(sale.id, validated.warehouseId, stockItems, tx);
        if (!stockResult.success) throw new Error(stockResult.error || "Failed to update stock");
        
        const voucherResult = await createSaleAccountingVoucher(sale.id, tx, validated.paymentMethod || undefined);
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

    if (!result) {
      return { success: false, error: "Sale was created but could not be retrieved", sale: null };
    }

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

    const discount = validated.discount ?? 0;
    const tax = validated.tax ?? 0;

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

      // Fetch client info to check if they are classified as wholesale client
      const client = await tx.client.findUnique({
        where: { id: validated.clientId },
        select: { name: true, email: true, company: true, clientCode: true }
      });

      const isWholesaleClient = client
        ? !!(
            client.company?.toLowerCase().includes("wholesale") ||
            client.name?.toLowerCase().includes("wholesale") ||
            client.email?.toLowerCase().includes("wholesale") ||
            client.clientCode?.toLowerCase().includes("wholesale")
          )
        : false;

      // Apply custom client discounts if orderType is WHOLESALE or customer is classified as wholesale client
      let itemsToCreate = validated.items;
      let calculatedSubTotal = 0;

      if (validated.orderType === "WHOLESALE" || isWholesaleClient) {
        // Fetch client discounts
        const clientDiscounts = await tx.clientItemDiscount.findMany({
          where: { clientId: validated.clientId }
        });

        const itemIds = validated.items.map(i => i.itemId);
        const variantIds = validated.items.map(i => i.variantId).filter(Boolean) as string[];

        const dbItems = await tx.item.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, wholesalePrice: true, wholesaleDiscountAmount: true, salesPrice: true }
        });

        const dbVariants = variantIds.length > 0 ? await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, salesPrice: true, wholesalePrice: true, wholesaleDiscountAmount: true }
        }) : [];

        itemsToCreate = validated.items.map((item) => {
          const itemDb = dbItems.find(i => i.id === item.itemId);
          const variantDb = item.variantId ? dbVariants.find(v => v.id === item.variantId) : null;
          
          let basePrice = item.unitPrice;
          if (variantDb) {
            if (variantDb.wholesalePrice !== null) {
              basePrice = Number(variantDb.wholesalePrice);
            } else if (variantDb.wholesaleDiscountAmount !== null) {
              basePrice = Number(variantDb.salesPrice || itemDb?.salesPrice || 0) - Number(variantDb.wholesaleDiscountAmount);
            } else if (variantDb.salesPrice !== null) {
              basePrice = Number(variantDb.salesPrice);
            }
          } else if (itemDb) {
            if (itemDb.wholesalePrice !== null) {
              basePrice = Number(itemDb.wholesalePrice);
            } else if (itemDb.wholesaleDiscountAmount !== null) {
              basePrice = Number(itemDb.salesPrice || 0) - Number(itemDb.wholesaleDiscountAmount);
            } else if (itemDb.salesPrice !== null) {
              basePrice = Number(itemDb.salesPrice);
            }
          }

          let discountRecord = null;
          if (item.variantId) {
            discountRecord = clientDiscounts.find(
              d => d.variantId === item.variantId
            );
          }
          if (!discountRecord) {
            discountRecord = clientDiscounts.find(
              d => d.itemId === item.itemId && !d.variantId
            );
          }

          let finalUnitPrice = basePrice;
          if (discountRecord) {
            let discountApplied = 0;
            if (discountRecord.discountType === "PERCENTAGE") {
              discountApplied = basePrice * (Number(discountRecord.discountValue) / 100);
            } else if (discountRecord.discountType === "FLAT") {
              discountApplied = Number(discountRecord.discountValue);
            }
            finalUnitPrice = Math.max(0, basePrice - discountApplied);
          }

          const amount = item.quantity * finalUnitPrice;
          calculatedSubTotal += amount;

          return {
            ...item,
            unitPrice: finalUnitPrice,
            amount,
          };
        });
      } else {
        calculatedSubTotal = validated.items.reduce((sum, item) => sum + item.amount, 0);
      }

      const calculatedGrandTotal = calculatedSubTotal - discount + tax;

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
          subTotal: new Prisma.Decimal(calculatedSubTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(calculatedGrandTotal),
          updatedBy: userId,
          items: {
            create: itemsToCreate.map((item) => ({
              itemId: item.itemId,
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
          saleNumber: true,
          grandTotal: true,
          updatedAt: true,
          status: true,
          voucherId: true,
        },
      });

      // Update stock and create voucher if transitioning to COMPLETED
      if (isTransitioningToCompleted) {
         const stockItems = itemsToCreate.map(i => ({ itemId: i.itemId, variantId: i.variantId || undefined, quantity: i.quantity }));
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
    };
  }
}

/**
 * Get item/variant discounts for a specific client
 */
export async function getClientItemDiscounts(clientId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", discounts: [] };
    }

    const discounts = await prisma.clientItemDiscount.findMany({
      where: {
        clientId,
      },
      select: {
        id: true,
        itemId: true,
        variantId: true,
        discountType: true,
        discountValue: true,
      },
    });

    return {
      success: true,
      discounts: discounts.map((d) => ({
        id: d.id,
        itemId: d.itemId,
        variantId: d.variantId,
        discountType: d.discountType,
        discountValue: Number(d.discountValue),
      })),
    };
  } catch (error) {
    console.error("getClientItemDiscounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client discounts",
      discounts: [],
    };
  }
}

export async function voidSale(saleId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: { item: { select: { trackInventory: true } } }
        },
        voucher: {
          include: { VoucherLine: true }
        }
      }
    });

    if (!sale) return { success: false, error: "Sale not found" };
    if (sale.status === "CANCELLED") return { success: false, error: "Sale is already cancelled" };

    await prisma.$transaction(async (tx) => {
      // 1. Update sale status
      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "CANCELLED",
          updatedBy: session.user.id
        }
      });

      // 2. Restore inventory stock
      for (const item of sale.items) {
        if (!item.item?.trackInventory) continue;
        const quantity = Number(item.quantity);

        const existingStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: { itemId: item.itemId, warehouseId: sale.warehouseId }
          }
        });

        if (existingStock) {
          await tx.stock.update({
            where: { id: existingStock.id },
            data: { quantity: Number(existingStock.quantity) + quantity }
          });
        } else {
          await tx.stock.create({
            data: {
              itemId: item.itemId,
              warehouseId: sale.warehouseId,
              quantity: quantity
            }
          });
        }

        await tx.stockLedger.create({
          data: {
            itemId: item.itemId,
            warehouseId: sale.warehouseId,
            transactionType: "IN",
            quantity: quantity,
            referenceType: "SALE_VOID",
            referenceId: sale.id,
            notes: `Sale voided for ${sale.saleNumber}`,
            createdBy: session.user.id
          }
        });
      }

      // 3. Reverse financial impact
      if (sale.voucherId && sale.voucher) {
        const lines = sale.voucher.VoucherLine.map((line, index) => ({
          lineNumber: index + 1,
          chartOfAccountId: line.chartOfAccountId,
          clientId: line.clientId || undefined,
          supplierId: line.supplierId || undefined,
          userId: line.userId || undefined,
          organizationId: line.organizationId || undefined,
          debitAmount: Number(line.creditAmount),
          creditAmount: Number(line.debitAmount),
          description: `Reversal for voided sale: ${line.description || sale.saleNumber}`
        }));

        const voucherResult = await createVoucher({
          date: new Date(),
          type: "JOURNAL",
          reference: sale.saleNumber,
          description: `Reversal for voided sale ${sale.saleNumber}`,
          clientId: sale.clientId,
          isSystemAction: true,
          lines
        }, tx);

        if (voucherResult.success && voucherResult.voucher) {
          await postVoucher(voucherResult.voucher.id, tx, true);
        }
      }
    });

    revalidateBothPaths("sales");
    return { success: true };
  } catch (error) {
    console.error("voidSale error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to void sale" };
  }
}

export async function processSaleReturn(saleId: string | null, returnItems: { itemId: string, variantId?: string, quantity: number, unitPrice?: number }[]) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    let originalSale: any = null;
    let clientId: string | null = null;
    let warehouseId: string | null = null;

    if (saleId) {
      originalSale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          items: {
            include: { item: { select: { trackInventory: true } } }
          },
          client: true
        }
      });
      if (!originalSale) return { success: false, error: "Sale not found" };
      clientId = originalSale.clientId;
      warehouseId = originalSale.warehouseId;
    } else {
      // Find default warehouse
      const defaultWarehouse = await prisma.warehouse.findFirst({
        where: { status: "active", isTrash: false },
        orderBy: { name: "asc" }
      });
      if (!defaultWarehouse) return { success: false, error: "No warehouse found for return" };
      warehouseId = defaultWarehouse.id;
      
      // Find default client
      const defaultClient = await prisma.client.findFirst({
        where: { name: { equals: "Walkway Customer", mode: "insensitive" } }
      });
      if (defaultClient) {
         clientId = defaultClient.id;
      }
    }

    const returnSaleData = await prisma.$transaction(async (tx) => {
      let totalRefund = 0;
      const newSaleItems = [];

      for (const ret of returnItems) {
        let itemUnitPrice = ret.unitPrice || 0;
        let trackInventory = false;
        let itemDescription = "Void Return Item";

        if (originalSale) {
          const originalItem = originalSale.items.find((i: any) => 
            i.itemId === ret.itemId && 
            (ret.variantId ? i.variantId === ret.variantId : !i.variantId)
          );
          if (!originalItem) throw new Error(`Item ${ret.itemId} not found in sale`);
          
          if (ret.quantity > Number(originalItem.quantity)) {
            throw new Error(`Return quantity exceeds sale quantity for item ${ret.itemId}`);
          }
          itemUnitPrice = Number(originalItem.unitPrice);
          trackInventory = originalItem.item?.trackInventory || false;
          itemDescription = originalItem.description;
        } else {
          // Look up item from database
          const dbItem = await tx.item.findUnique({
            where: { id: ret.itemId }
          });
          if (!dbItem) throw new Error(`Item ${ret.itemId} not found in database`);
          
          let variantName = "";
          if (ret.variantId) {
            const dbVariant = await tx.productVariant.findUnique({
              where: { id: ret.variantId }
            });
            if (dbVariant) {
              if (dbVariant.salesPrice) {
                itemUnitPrice = Number(dbVariant.salesPrice);
              } else if (!ret.unitPrice) {
                itemUnitPrice = Number(dbItem.salesPrice || 0);
              }
              variantName = ` - ${dbVariant.color} / ${dbVariant.size} (${dbVariant.sku})`;
            }
          } else if (!ret.unitPrice) {
            itemUnitPrice = Number(dbItem.salesPrice || 0);
          }
          
          trackInventory = dbItem.trackInventory;
          itemDescription = dbItem.name + variantName;
        }

        const refundAmount = itemUnitPrice * ret.quantity;
        totalRefund += refundAmount;

        newSaleItems.push({
          itemId: ret.itemId,
          variantId: ret.variantId || null,
          description: `Return: ${itemDescription}`,
          quantity: -ret.quantity,
          unitPrice: itemUnitPrice,
          amount: -refundAmount
        });

        // Restore stock
        if (trackInventory && warehouseId) {
          const existingStock = ret.variantId ? await tx.stock.findUnique({
            where: {
              variantId_warehouseId: { variantId: ret.variantId, warehouseId: warehouseId }
            }
          }) : await tx.stock.findUnique({
            where: {
              itemId_warehouseId: { itemId: ret.itemId, warehouseId: warehouseId }
            }
          });

          if (existingStock) {
            await tx.stock.update({
              where: { id: existingStock.id },
              data: { quantity: Number(existingStock.quantity) + ret.quantity }
            });
          } else {
            await tx.stock.create({
              data: {
                itemId: ret.variantId ? null : ret.itemId,
                variantId: ret.variantId || null,
                warehouseId: warehouseId,
                quantity: ret.quantity
              }
            });
          }

          const refId = originalSale ? originalSale.id : "VOID_RETURN";
          const refNotes = originalSale ? `Return for sale ${originalSale.saleNumber}` : "Standalone Void Return";

          await tx.stockLedger.create({
            data: {
              itemId: ret.variantId ? null : ret.itemId,
              variantId: ret.variantId || null,
              warehouseId: warehouseId,
              transactionType: "IN",
              quantity: ret.quantity,
              referenceType: "SALE_RETURN",
              referenceId: refId,
              notes: refNotes,
              createdBy: session.user.id
            }
          });
        }
      }

      let returnSaleNumber = "";
      if (originalSale) {
        returnSaleNumber = originalSale.saleNumber.replace(/^SAL-/, "RET-");
      } else {
        const generatedNum = await generateSaleNumber(tx);
        returnSaleNumber = generatedNum.replace(/^SAL-/, "RET-");
      }

      const returnSale = await tx.sale.create({
        data: {
          saleNumber: returnSaleNumber,
          clientId: clientId!,
          warehouseId: warehouseId!,
          date: new Date(),
          status: "COMPLETED",
          orderType: originalSale ? originalSale.orderType : "RETAIL",
          subTotal: -totalRefund,
          grandTotal: -totalRefund,
          createdBy: session.user.id,
          items: {
            create: newSaleItems.map(i => ({
              itemId: i.itemId,
              variantId: i.variantId,
              description: i.description,
              quantity: new Prisma.Decimal(i.quantity),
              unitPrice: new Prisma.Decimal(i.unitPrice),
              amount: new Prisma.Decimal(i.amount)
            }))
          }
        }
      });

      let arAccountId = null;
      if (originalSale && originalSale.client?.chartOfAccountId) {
         arAccountId = originalSale.client.chartOfAccountId;
      } else if (clientId) {
         const dbClient = await tx.client.findUnique({ where: { id: clientId } });
         arAccountId = dbClient?.chartOfAccountId || null;
      }

      if (!arAccountId) {
        try {
          const { getSalesAccounts } = await import("@/lib/accounting-settings");
          const salesAccounts = await getSalesAccounts();
          arAccountId = salesAccounts.receivableAccountId;
        } catch (e) {
          console.warn("Could not load sales accounts", e);
        }
      }

      if (arAccountId) {
        const cashAccount = await tx.chartOfAccount.findFirst({
          where: { name: { contains: "Cash", mode: "insensitive" }, type: "ASSET", status: "active" }
        });

        const debitAccountId = arAccountId; 
        const creditAccountId = cashAccount ? cashAccount.id : arAccountId;

        const voucherResult = await createVoucher({
          date: new Date(),
          type: "RETURN",
          reference: returnSale.saleNumber,
          description: `Refund for sale return ${returnSale.saleNumber}`,
          clientId: clientId || undefined,
          isSystemAction: true,
          lines: [
            {
              lineNumber: 1,
              chartOfAccountId: debitAccountId,
              clientId: clientId || undefined,
              debitAmount: totalRefund,
              creditAmount: 0,
              description: `Sales Return`
            },
            {
              lineNumber: 2,
              chartOfAccountId: creditAccountId,
              clientId: clientId || undefined,
              debitAmount: 0,
              creditAmount: totalRefund,
              description: `Refund for Sales Return`
            }
          ]
        }, tx);

        if (voucherResult.success && voucherResult.voucher) {
          await postVoucher(voucherResult.voucher.id, tx, true);
        }
      }

      return returnSale;
    });

    revalidateBothPaths("sales");
    return { success: true, returnSale: returnSaleData };
  } catch (error) {
    console.error("processSaleReturn error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process sale return" };
  }
}

export async function getSalesByCustomer(customerId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const sales = await prisma.sale.findMany({
      where: {
        clientId: customerId,
        status: "COMPLETED",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        saleNumber: true,
        createdAt: true,
        grandTotal: true,
      },
    });

    return {
      success: true,
      sales: sales.map((sale) => ({
        ...sale,
        grandTotal: Number(sale.grandTotal),
      })),
    };
  } catch (error) {
    console.error("getSalesByCustomer error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sales",
    };
  }
}

export async function getLastSaleForUser() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const lastSale = await prisma.sale.findFirst({
      where: {
        createdBy: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (!lastSale) {
      return { success: true, saleId: null };
    }

    return { success: true, saleId: lastSale.id };
  } catch (error) {
    console.error("getLastSaleForUser error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch the last sale",
    };
  }
}
