"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { ReturnToVendorStatus, Prisma, VoucherType } from "@prisma/client";
import * as z from "zod";
import { updateStockOnRTV } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

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
  status: z.nativeEnum(ReturnToVendorStatus).optional(),
  notes: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).optional().nullable(),
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

/**
 * Create a Return to Vendor (always initial status DRAFT/PENDING)
 * Stock is NOT deducted and vouchers are NOT posted until approved.
 */
export async function createReturnToVendor(input: z.infer<typeof rtvSchema>) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canCreate = await hasPermission(session.user.id, "procurements.rtv", "create");
    if (!canCreate) {
      return { success: false, error: "You do not have permission to create RTVs" };
    }

    const validated = rtvSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      // If returning from a purchase, validate available quantities
      if (validated.purchaseId) {
        for (const item of validated.items) {
          const purchaseItem = await tx.purchaseItem.findFirst({
            where: {
              purchaseId: validated.purchaseId,
              itemId: item.itemId,
              variantId: item.variantId || null,
            },
          });

          if (!purchaseItem) {
            throw new Error(`Item not found in the original purchase.`);
          }

          const availableToReturn = Number(purchaseItem.quantity) - Number(purchaseItem.returnedQuantity);
          if (item.quantity > availableToReturn) {
            throw new Error(`Cannot return more than available. Available to return: ${availableToReturn}`);
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
      const discount = validated.discount ?? 0;
      const tax = validated.tax ?? 0;
      const grandTotal = Math.max(0, subTotal - discount) + tax;

      const rtv = await tx.returnToVendor.create({
        data: {
          rtvNumber,
          supplierId: validated.supplierId,
          warehouseId: validated.warehouseId,
          purchaseId: validated.purchaseId || null,
          date: validated.date,
          status: ReturnToVendorStatus.DRAFT, // Always created as DRAFT
          notes: validated.notes || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
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

/**
 * Update an existing Return to Vendor (Only allowed in DRAFT status)
 */
export async function updateReturnToVendor(rtvId: string, input: z.infer<typeof rtvSchema>) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canEdit = await hasPermission(session.user.id, "procurements.rtv", "edit");
    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit RTVs" };
    }

    const existingRtv = await prisma.returnToVendor.findUnique({
      where: { id: rtvId },
      select: { id: true, status: true, rtvNumber: true },
    });

    if (!existingRtv) {
      return { success: false, error: "Return to Vendor not found" };
    }

    if (existingRtv.status !== ReturnToVendorStatus.DRAFT) {
      return { success: false, error: "Only draft returns can be edited" };
    }

    const validated = rtvSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      // Validate quantities against original purchase if linked
      if (validated.purchaseId) {
        for (const item of validated.items) {
          const purchaseItem = await tx.purchaseItem.findFirst({
            where: {
              purchaseId: validated.purchaseId,
              itemId: item.itemId,
              variantId: item.variantId || null,
            },
          });

          if (!purchaseItem) {
            throw new Error(`Item not found in the original purchase.`);
          }

          const availableToReturn = Number(purchaseItem.quantity) - Number(purchaseItem.returnedQuantity);
          if (item.quantity > availableToReturn) {
            throw new Error(`Cannot return more than available. Available to return: ${availableToReturn}`);
          }
        }
      }

      // Recalculate item amounts and totals
      const calculatedItems = validated.items.map(item => ({
        ...item,
        amount: Number((item.quantity * item.unitPrice).toFixed(2))
      }));
      
      const subTotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);
      const discount = validated.discount ?? 0;
      const tax = validated.tax ?? 0;
      const grandTotal = Math.max(0, subTotal - discount) + tax;

      // Delete old items and recreate new items
      await tx.returnToVendorItem.deleteMany({
        where: { rtvId: rtvId },
      });

      const updatedRtv = await tx.returnToVendor.update({
        where: { id: rtvId },
        data: {
          supplierId: validated.supplierId,
          warehouseId: validated.warehouseId,
          purchaseId: validated.purchaseId || null,
          date: validated.date,
          notes: validated.notes || null,
          subTotal: new Prisma.Decimal(subTotal),
          discount: discount ? new Prisma.Decimal(discount) : null,
          tax: tax ? new Prisma.Decimal(tax) : null,
          grandTotal: new Prisma.Decimal(grandTotal),
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

      return updatedRtv;
    });

    await logItemUpdated(userId, "ReturnToVendor", result.id, ["items", "details"], result.rtvNumber);
    revalidateBothPaths("rtv");
    revalidatePath(`/dashboard/procurements/rtv/${rtvId}/view`);
    revalidatePath(`/dashboard/procurements/rtv/${rtvId}/edit`);

    return { success: true, rtv: result };
  } catch (error) {
    console.error("updateReturnToVendor error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update Return to Vendor",
    };
  }
}

/**
 * Approve & Complete Return to Vendor:
 * 1. Deducts inventory stock from warehouse & writes negative stock ledger
 * 2. Increments returnedQuantity on linked purchase items
 * 3. Creates & posts balanced accounting journal voucher (Debit AP, Credit Inventory)
 * 4. Marks status as COMPLETED
 */
export async function approveAndCompleteReturnToVendor(rtvId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canEdit = await hasPermission(session.user.id, "procurements.rtv", "edit");
    if (!canEdit) {
      return { success: false, error: "You do not have permission to approve RTVs" };
    }

    const rtv = await prisma.returnToVendor.findUnique({
      where: { id: rtvId },
      include: {
        items: true,
        supplier: { select: { id: true, name: true, chartOfAccountId: true } },
      },
    });

    if (!rtv) {
      return { success: false, error: "Return to Vendor not found" };
    }

    if (rtv.status !== ReturnToVendorStatus.DRAFT) {
      return { success: false, error: `Cannot approve return with status ${rtv.status}` };
    }

    if (!rtv.items || rtv.items.length === 0) {
      return { success: false, error: "Return has no items to process" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. If purchase linked, increment returned quantity on PurchaseItem
      if (rtv.purchaseId) {
        for (const item of rtv.items) {
          const purchaseItem = await tx.purchaseItem.findFirst({
            where: {
              purchaseId: rtv.purchaseId,
              itemId: item.itemId,
              variantId: item.variantId || null,
            },
          });

          if (purchaseItem) {
            const availableToReturn = Number(purchaseItem.quantity) - Number(purchaseItem.returnedQuantity);
            if (Number(item.quantity) > availableToReturn) {
              throw new Error(`Cannot return more than received for item. Available: ${availableToReturn}`);
            }

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

      // 2. Deduct inventory stock
      const stockResult = await updateStockOnRTV(
        rtv.id,
        rtv.warehouseId,
        rtv.items.map((i) => ({
          itemId: i.itemId,
          variantId: i.variantId || undefined,
          quantity: Number(i.quantity),
        })),
        tx
      );

      if (!stockResult.success) {
        throw new Error(stockResult.error || "Failed to update stock for RTV");
      }

      // 3. Create & Post Accounting Voucher (Debit Accounts Payable, Credit Inventory)
      let voucherId: string | null = null;
      const { getPurchaseAccounts } = await import("@/lib/accounting-settings");
      let accounts;
      try {
        accounts = await getPurchaseAccounts();
      } catch (e) {
        /* ignore */
      }

      const payableAccountId = rtv.supplier?.chartOfAccountId || accounts?.payableAccountId;
      const inventoryAccountId = accounts?.inventoryAccountId;
      const grandTotal = Number(rtv.grandTotal);

      if (payableAccountId && inventoryAccountId && grandTotal > 0) {
        const voucherResult = await createVoucher(
          {
            date: rtv.date,
            type: VoucherType.JOURNAL,
            reference: rtv.rtvNumber,
            description: `Return to Vendor ${rtv.rtvNumber} - ${rtv.supplier?.name || "Supplier"}`,
            supplierId: rtv.supplierId,
            isSystemAction: true,
            lines: [
              {
                lineNumber: 1,
                debitAmount: grandTotal,
                creditAmount: 0,
                description: `Accounts Payable Reduction - ${rtv.rtvNumber}`,
                chartOfAccountId: payableAccountId,
                supplierId: rtv.supplierId,
              },
              {
                lineNumber: 2,
                debitAmount: 0,
                creditAmount: grandTotal,
                description: `Inventory Returned - ${rtv.rtvNumber}`,
                chartOfAccountId: inventoryAccountId,
              },
            ],
          },
          tx
        );

        if (voucherResult.success && voucherResult.voucher) {
          await postVoucher(voucherResult.voucher.id, tx, true);
          voucherId = voucherResult.voucher.id;
        }
      }

      // 4. Mark status as COMPLETED
      await tx.returnToVendor.update({
        where: { id: rtv.id },
        data: {
          status: ReturnToVendorStatus.COMPLETED,
          voucherId: voucherId || undefined,
        },
      });
    });

    await logItemUpdated(userId, "ReturnToVendor", rtv.id, ["status"], `Completed RTV ${rtv.rtvNumber}`);
    revalidateBothPaths("rtv");
    revalidatePath(`/dashboard/procurements/rtv/${rtvId}/view`);
    revalidatePath("/dashboard/inventory/stock");

    return { success: true };
  } catch (error) {
    console.error("approveAndCompleteReturnToVendor error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve Return to Vendor",
    };
  }
}

/**
 * Cancel a Return to Vendor (Only allowed in DRAFT status)
 */
export async function cancelReturnToVendor(rtvId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canEdit = await hasPermission(session.user.id, "procurements.rtv", "edit");
    if (!canEdit) {
      return { success: false, error: "You do not have permission to cancel RTVs" };
    }

    const rtv = await prisma.returnToVendor.findUnique({
      where: { id: rtvId },
      select: { id: true, status: true, rtvNumber: true },
    });

    if (!rtv) {
      return { success: false, error: "Return to Vendor not found" };
    }

    if (rtv.status !== ReturnToVendorStatus.DRAFT) {
      return { success: false, error: "Only draft returns can be cancelled" };
    }

    await prisma.returnToVendor.update({
      where: { id: rtvId },
      data: { status: ReturnToVendorStatus.CANCELLED },
    });

    await logItemUpdated(userId, "ReturnToVendor", rtv.id, ["status"], `Cancelled RTV ${rtv.rtvNumber}`);
    revalidateBothPaths("rtv");
    revalidatePath(`/dashboard/procurements/rtv/${rtvId}/view`);

    return { success: true };
  } catch (error) {
    console.error("cancelReturnToVendor error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel Return to Vendor",
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
        discount: r.discount ? Number(r.discount) : null,
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
        discount: rtv.discount ? Number(rtv.discount) : null,
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
