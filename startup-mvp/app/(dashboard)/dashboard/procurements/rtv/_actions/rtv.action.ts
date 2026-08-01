"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { ReturnToVendorStatus, Prisma, VoucherType, ItemType } from "@prisma/client";
import * as z from "zod";
import { updateStockOnRTV } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";

const rtvItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  variantId: z.string().optional().nullable(),
  purchaseItemId: z.string().optional().nullable(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  amount: z.coerce.number().min(0, "Amount must be 0 or greater"),
  reason: z.string().optional().nullable(),
});

const rtvSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  purchaseId: z.string().optional().nullable(),
  date: z.coerce.date(),
  status: z.nativeEnum(ReturnToVendorStatus),
  notes: z.string().optional().nullable(),
  tax: z.coerce.number().min(0).optional().nullable(),
  items: z.array(rtvItemSchema).min(1, "At least one item is required"),
});

async function generateRTVNumber(tx?: Prisma.TransactionClient): Promise<string> {
  const prefix = "RTV";
  const client = tx || prisma;

  const lastRTV = await client.returnToVendor.findFirst({
    where: { rtvNumber: { startsWith: prefix } },
    orderBy: { rtvNumber: "desc" },
    select: { rtvNumber: true },
  });

  let nextNumber = 1000001;
  if (lastRTV?.rtvNumber) {
    const codeWithoutPrefix = lastRTV.rtvNumber.replace(prefix, "");
    const lastNumber = parseInt(codeWithoutPrefix, 10);
    if (!isNaN(lastNumber) && lastNumber >= 1000001) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(7, "0")}`;
}

export async function createReturnToVendor(input: z.infer<typeof rtvSchema>) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const validated = rtvSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      // If returning from a purchase, validate quantities
      if (validated.purchaseId) {
        for (const item of validated.items) {
          // Find the matching purchase item to check quantity
          const purchaseItem = await tx.purchaseItem.findFirst({
            where: {
              purchaseId: validated.purchaseId,
              itemId: item.itemId,
              variantId: item.variantId || null,
            },
          });

          if (!purchaseItem) {
            throw new Error(`Item ${item.itemId} not found in the original purchase.`);
          }

          const availableToReturn = Number(purchaseItem.quantity) - Number(purchaseItem.returnedQuantity);
          if (item.quantity > availableToReturn) {
            throw new Error(`Cannot return more than received. Available to return for item ${item.itemId}: ${availableToReturn}`);
          }

          // If COMPLETED, update the returned quantity on the purchase item
          if (validated.status === "COMPLETED") {
            await tx.purchaseItem.update({
              where: { id: purchaseItem.id },
              data: {
                returnedQuantity: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }

      const rtvNumber = await generateRTVNumber(tx);
      
      // Securely recalculate item amounts and totals
      const calculatedItems = validated.items.map(item => ({
        ...item,
        amount: Number((item.quantity * item.unitPrice).toFixed(2))
      }));
      
      const subTotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);
      const tax = validated.tax ?? 0;
      const grandTotal = subTotal + tax;

      const rtv = await tx.returnToVendor.create({
        data: {
          rtvNumber,
          supplierId: validated.supplierId,
          warehouseId: validated.warehouseId,
          purchaseId: validated.purchaseId || null,
          date: validated.date,
          status: validated.status,
          notes: validated.notes || null,
          subTotal: new Prisma.Decimal(subTotal),
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
          createdBy: userId,
          items: {
            create: calculatedItems.map((item) => ({
              itemId: item.itemId,
              variantId: item.variantId || null,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              amount: new Prisma.Decimal(item.amount),
              reason: item.reason || null,
            })),
          },
        },
      });

      // Process stock and accounting if status is COMPLETED
      if (validated.status === "COMPLETED") {
        // 1. Update Stock
        const stockResult = await updateStockOnRTV(
          rtv.id,
          validated.warehouseId,
          validated.items.map(i => ({
            itemId: i.itemId,
            variantId: i.variantId || undefined,
            quantity: i.quantity,
          })),
          tx
        );

        if (!stockResult.success) {
          throw new Error(stockResult.error || "Failed to update stock for RTV");
        }

        // 2. Create Accounting Voucher (Debit Payable, Credit Inventory)
        // Simple fallback implementation:
        // Attempt to find accounts from supplier and settings
        const supplier = await tx.supplier.findUnique({
          where: { id: validated.supplierId },
          select: { name: true, chartOfAccountId: true },
        });

        // Try getting accounting settings
        const { getPurchaseAccounts } = await import("@/lib/accounting-settings");
        let accounts;
        try { accounts = await getPurchaseAccounts(); } catch (e) { /* ignore */ }

        const payableAccountId = supplier?.chartOfAccountId || accounts?.payableAccountId;
        const inventoryAccountId = accounts?.inventoryAccountId;

        if (payableAccountId && inventoryAccountId) {
          const voucherResult = await createVoucher({
            date: validated.date,
            type: VoucherType.JOURNAL,
            reference: rtvNumber,
            description: `Return to Vendor ${rtvNumber} - ${supplier?.name || 'Supplier'}`,
            supplierId: validated.supplierId,
            isSystemAction: true,
            lines: [
              {
                lineNumber: 1,
                debitAmount: grandTotal,
                creditAmount: 0,
                description: `Accounts Payable Reduction - ${rtvNumber}`,
                chartOfAccountId: payableAccountId,
                supplierId: validated.supplierId,
              },
              {
                lineNumber: 2,
                debitAmount: 0,
                creditAmount: grandTotal,
                description: `Inventory Returned - ${rtvNumber}`,
                chartOfAccountId: inventoryAccountId,
              }
            ],
          }, tx);

          if (voucherResult.success && voucherResult.voucher) {
            await postVoucher(voucherResult.voucher.id, tx, true);
            await tx.returnToVendor.update({
              where: { id: rtv.id },
              data: { voucherId: voucherResult.voucher.id },
            });
          }
        }
      }

      return rtv;
    });

    await logItemCreated(userId, "ReturnToVendor", result.id, result.rtvNumber);
    revalidateBothPaths("rtv");

    return { success: true, rtv: result };
  } catch (error) {
    console.error("createReturnToVendor error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create Return to Vendor",
    };
  }
}

export async function getReturnsToVendor(
  page = 1,
  limit = 10,
  search = "",
  warehouseId?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", rtvs: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const skip = (page - 1) * limit;
    const where: Prisma.ReturnToVendorWhereInput = {
      ...(isNormalUser && user?.defaultWarehouseId ? { warehouseId: user.defaultWarehouseId } : warehouseId && warehouseId !== "all" ? { warehouseId } : {}),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate ? { gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)) } : {}),
              ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {}),
            },
          }
        : {}),
    };
    if (search) {
      where.OR = [
        { rtvNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.returnToVendor.count({ where });
    const rtvs = await prisma.returnToVendor.findMany({
      where,
      skip,
      take: limit,
      include: {
        supplier: { select: { id: true, name: true, company: true } },
        warehouse: { select: { id: true, name: true } },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      rtvs: rtvs.map(r => ({
        ...r,
        subTotal: Number(r.subTotal),
        tax: r.tax ? Number(r.tax) : null,
        grandTotal: Number(r.grandTotal),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    console.error("getReturnsToVendor error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch RTVs", rtvs: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function getReturnToVendorById(rtvId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", rtv: null };

    const rtv = await prisma.returnToVendor.findUnique({
      where: { id: rtvId },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true, company: true } },
        warehouse: { select: { id: true, name: true, code: true, address: true, city: true, state: true, zip: true, country: true } },
        purchase: { select: { id: true, purchaseNumber: true, date: true } },
        items: {
          include: {
            item: { select: { id: true, code: true, name: true, unit: { select: { symbol: true } } } },
            variant: { select: { sku: true, color: true, size: true } },
          }
        }
      }
    });

    if (!rtv) return { success: false, error: "RTV not found", rtv: null };

    // Fetch creator details
    const creator = await prisma.user.findUnique({
      where: { id: rtv.createdBy },
      select: { name: true, email: true }
    });

    return {
      success: true,
      rtv: {
        ...rtv,
        subTotal: Number(rtv.subTotal),
        tax: rtv.tax ? Number(rtv.tax) : null,
        grandTotal: Number(rtv.grandTotal),
        creator: creator,
        items: rtv.items.map(i => ({
          ...i,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          amount: Number(i.amount),
        })),
      }
    };
  } catch (error) {
    console.error("getReturnToVendorById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch RTV", rtv: null };
  }
}
