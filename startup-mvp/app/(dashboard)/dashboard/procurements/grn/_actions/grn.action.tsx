import { z } from "zod";
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { ItemType, Prisma, VoucherType } from "@prisma/client";
import { updateStockOnGRN } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { createUserLog, LogAction } from "@/lib/user-log";
import { createGRNSchema } from "./grn.schema";

// --- HELPER FUNCTIONS ---

async function generateGRNNumber(tx: Prisma.TransactionClient) {
  const latestGRN = await tx.gRN.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { grnNumber: true },
  });

  if (latestGRN && latestGRN.grnNumber.startsWith('GRN')) {
    const codeWithoutPrefix = latestGRN.grnNumber.replace('GRN', '');
    const number = parseInt(codeWithoutPrefix, 10);
    if (!isNaN(number)) {
      const newNumber = number + 1;
      return `GRN${newNumber.toString().padStart(7, '0')}`;
    }
  }
  return `GRN${Date.now().toString().slice(-7)}`;
}

async function createGRNAccountingVoucher(
  grnId: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; error?: string; voucherId?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const client = tx || prisma;

    const grn = await client.gRN.findUnique({
      where: { id: grnId },
      include: {
        purchase: {
          include: {
            supplier: true,
          }
        },
        items: {
          include: {
            purchaseItem: true,
            item: true,
          },
        },
      },
    });

    if (!grn) {
      return { success: false, error: "GRN not found" };
    }

    if (grn.voucherId) {
      return { success: true, voucherId: grn.voucherId };
    }

    const { getPurchaseAccounts, getProductionAccounts } = await import("@/lib/accounting-settings");

    let purchaseAccounts;
    let productionAccounts;

    try {
      purchaseAccounts = await getPurchaseAccounts();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to retrieve purchase accounting settings" };
    }

    const itemsByType: Record<ItemType, Array<{ quantity: number; unitPrice: number; totalCost: number }>> = {
      RAW_MATERIAL: [],
      READY_PRODUCT: [],
      RETAIL: [],
      WHOLESALE: [],
    };

    for (const grnItem of grn.items) {
      if (!grnItem.item) continue;
      const quantity = Number(grnItem.receivedQuantity);
      if (quantity <= 0) continue;
      
      const unitPrice = Number(grnItem.purchaseItem?.unitPrice || 0);
      const totalCost = quantity * unitPrice;

      itemsByType[grnItem.item.itemType].push({
        quantity,
        unitPrice,
        totalCost,
      });
    }

    const hasRawMaterials = itemsByType.RAW_MATERIAL.length > 0;
    const hasFinishedGoods = itemsByType.READY_PRODUCT.length > 0;

    if (hasRawMaterials || hasFinishedGoods) {
      try {
        productionAccounts = await getProductionAccounts();
      } catch (error) {
        return { success: false, error: "Production accounting settings are not configured." };
      }
    }

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

    const totalRawMaterialCost = itemsByType.RAW_MATERIAL.reduce((sum, item) => sum + item.totalCost, 0);
    const totalFGCost = itemsByType.READY_PRODUCT.reduce((sum, item) => sum + item.totalCost, 0);
    const totalRetailCost = itemsByType.RETAIL.reduce((sum, item) => sum + item.totalCost, 0);
    const totalWholesaleCost = itemsByType.WHOLESALE.reduce((sum, item) => sum + item.totalCost, 0);

    if (totalRawMaterialCost > 0 && productionAccounts) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: totalRawMaterialCost,
        creditAmount: 0,
        description: `Raw Material Inventory - ${grn.grnNumber}`,
        chartOfAccountId: productionAccounts.consumptionRawMaterialInventoryId,
      });
      totalInventoryDebit += totalRawMaterialCost;
    }

    if (totalFGCost > 0 && productionAccounts) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: totalFGCost,
        creditAmount: 0,
        description: `Ready Products Inventory - ${grn.grnNumber}`,
        chartOfAccountId: productionAccounts.completionFinishedGoodsInventoryId,
      });
      totalInventoryDebit += totalFGCost;
    }

    if (totalRetailCost > 0) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: totalRetailCost,
        creditAmount: 0,
        description: `Retail Inventory - ${grn.grnNumber}`,
        chartOfAccountId: purchaseAccounts.inventoryAccountId,
      });
      totalInventoryDebit += totalRetailCost;
    }

    if (totalWholesaleCost > 0) {
      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: totalWholesaleCost,
        creditAmount: 0,
        description: `Wholesale Inventory - ${grn.grnNumber}`,
        chartOfAccountId: purchaseAccounts.inventoryAccountId,
      });
      totalInventoryDebit += totalWholesaleCost;
    }

    if (totalInventoryDebit > 0) {
      const payableAccountId = grn.purchase?.supplier?.chartOfAccountId || purchaseAccounts.payableAccountId;

      if (!payableAccountId) {
        return { success: false, error: `No Accounts Payable ledger found for supplier.` };
      }

      voucherLines.push({
        lineNumber: lineNumber++,
        debitAmount: 0,
        creditAmount: totalInventoryDebit,
        description: `Accounts Payable - ${grn.grnNumber} - ${grn.purchase?.supplier?.name || grn.purchase?.supplier?.email}`,
        chartOfAccountId: payableAccountId,
        supplierId: grn.purchase?.supplierId,
      });
    }

    if (voucherLines.length === 0) {
      return { success: false, error: "No valid items or amounts found for voucher" };
    }

    const voucherResult = await createVoucher({
      date: grn.date,
      type: VoucherType.PURCHASE,
      reference: grn.grnNumber,
      description: `GRN ${grn.grnNumber} - ${grn.purchase?.supplier?.name || grn.purchase?.supplier?.email}`,
      supplierId: grn.purchase?.supplierId,
      isSystemAction: true,
      lines: voucherLines,
    }, tx);

    if (!voucherResult.success || !voucherResult.voucher) {
      return { success: false, error: voucherResult.error || "Failed to create accounting voucher" };
    }

    const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
    if (!postResult.success) {
      return { success: false, error: postResult.error || "Failed to post accounting voucher" };
    }

    await client.gRN.update({
      where: { id: grnId },
      data: { voucherId: voucherResult.voucher.id },
    });

    await createUserLog({
      userId: userId,
      action: LogAction.ITEM_CREATED,
      details: `Created and posted GRN accounting voucher for ${grn.grnNumber}`,
    });

    return { success: true, voucherId: voucherResult.voucher.id };
  } catch (error) {
    console.error("createGRNAccountingVoucher error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create GRN accounting voucher" };
  }
}

// --- MAIN ACTIONS ---

export async function createGRN(input: z.infer<typeof createGRNSchema>) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const validated = createGRNSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      let grnItemsData: any[] = [];

      if (validated.purchaseId) {
        // 1. Validate Purchase
        const purchase = await tx.purchase.findUnique({
          where: { id: validated.purchaseId },
          include: { items: true },
        });

        if (!purchase) throw new Error("Purchase not found");
        if (purchase.status !== "APPROVED" && purchase.status !== "PARTIALLY_RECEIVED") {
          throw new Error(`Cannot create GRN for purchase with status ${purchase.status}. Must be APPROVED or PARTIALLY_RECEIVED.`);
        }

        // 2. Validate quantities
        const purchaseItemMap = new Map(purchase.items.map(i => [i.id, i]));
        for (const item of validated.items) {
          if (item.receivedQuantity <= 0) continue;
          if (!item.purchaseItemId) throw new Error("Purchase item ID missing");
          
          const pItem = purchaseItemMap.get(item.purchaseItemId);
          if (!pItem) throw new Error(`Purchase item ${item.purchaseItemId} not found`);

          const remainingQty = Number(pItem.quantity) - Number(pItem.receivedQuantity);
          if (item.receivedQuantity > remainingQty) {
            throw new Error(`Cannot receive ${item.receivedQuantity}. Only ${remainingQty} remaining for item ${pItem.description}`);
          }

          grnItemsData.push({
            purchaseItemId: item.purchaseItemId,
            itemId: pItem.itemId,
            variantId: pItem.variantId,
            receivedQuantity: new Prisma.Decimal(item.receivedQuantity),
          });
        }
      } else if (validated.tpnId) {
        // 1. Validate TPN
        const tpn = await tx.transferPurchaseNote.findUnique({
          where: { id: validated.tpnId },
          include: { items: true },
        });

        if (!tpn) throw new Error("Transfer Purchase Note not found");
        if (tpn.status !== "SHIPPED") {
          throw new Error(`Cannot create GRN for TPN with status ${tpn.status}. Must be SHIPPED.`);
        }

        // 2. Validate quantities (For TPN, we don't have receivedQuantity tracking on item level yet, assuming full receipt or partial without tracking)
        // Since TPN items don't have receivedQuantity, we can just check against total quantity
        const tpnItemMap = new Map(tpn.items.map(i => [i.id, i]));
        for (const item of validated.items) {
          if (item.receivedQuantity <= 0) continue;
          if (!item.tpnItemId) throw new Error("TPN item ID missing");

          const tItem = tpnItemMap.get(item.tpnItemId);
          if (!tItem) throw new Error(`TPN item ${item.tpnItemId} not found`);

          // Normally we'd track partially received TPNs, but for now we just allow up to the shipped quantity.
          if (item.receivedQuantity > Number(tItem.quantity)) {
            throw new Error(`Cannot receive ${item.receivedQuantity}. Only ${tItem.quantity} shipped.`);
          }

          grnItemsData.push({
            tpnItemId: item.tpnItemId,
            itemId: tItem.itemId,
            variantId: tItem.variantId,
            receivedQuantity: new Prisma.Decimal(item.receivedQuantity),
          });
        }
      } else {
        throw new Error("Either purchaseId or tpnId must be provided");
      }

      // 3. Generate GRN Number
      let grnNumber = await generateGRNNumber(tx);

      // 4. Create GRN
      const grn = await tx.gRN.create({
        data: {
          grnNumber,
          purchaseId: validated.purchaseId,
          tpnId: validated.tpnId,
          warehouseId: validated.warehouseId,
          date: validated.date,
          status: "DRAFT",
          notes: validated.notes,
          createdBy: userId,
          items: {
            create: grnItemsData,
          },
        },
      });

      return grn;
    });

    await logItemCreated(userId, "GRN", result.id, result.grnNumber);
    revalidateBothPaths("purchases");

    return { success: true, grn: result };
  } catch (error) {
    console.error("createGRN error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create GRN" };
  }
}

export async function confirmGRN(grnId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const result = await prisma.$transaction(async (tx) => {
      const grn = await tx.gRN.findUnique({
        where: { id: grnId },
        include: { items: true },
      });

      if (!grn) throw new Error("GRN not found");
      if (grn.status === "COMPLETED") throw new Error("GRN is already completed");

      // 1. Update GRN status
      await tx.gRN.update({
        where: { id: grnId },
        data: { status: "COMPLETED", updatedBy: userId },
      });

      if (grn.purchaseId) {
        // 2. Update PurchaseItem received quantities
        for (const item of grn.items) {
          if (!item.purchaseItemId) continue;
          await tx.purchaseItem.update({
            where: { id: item.purchaseItemId },
            data: {
              receivedQuantity: { increment: item.receivedQuantity },
            },
          });
        }

        // 3. Check and update Purchase status (PARTIALLY_RECEIVED or RECEIVED)
        const purchase = await tx.purchase.findUnique({
          where: { id: grn.purchaseId },
          include: { items: true },
        });

        if (purchase) {
          let allReceived = true;
          let anyReceived = false;

          for (const pItem of purchase.items) {
            const qty = Number(pItem.quantity);
            const received = Number(pItem.receivedQuantity);
            if (received < qty) allReceived = false;
            if (received > 0) anyReceived = true;
          }

          const newStatus = allReceived ? "RECEIVED" : (anyReceived ? "PARTIALLY_RECEIVED" : purchase.status);
          if (newStatus !== purchase.status) {
            await tx.purchase.update({
              where: { id: purchase.id },
              data: { status: newStatus },
            });
          }
        }

        // Create Accounting Voucher ONLY for purchases
        const voucherResult = await createGRNAccountingVoucher(grn.id, tx);
        if (!voucherResult.success) throw new Error(voucherResult.error || "Failed to create accounting voucher");
      } else if (grn.tpnId) {
        // Update TPN status to RECEIVED
        // Currently we do not track partial receipts for TPNs, so any GRN completes it
        await tx.transferPurchaseNote.update({
          where: { id: grn.tpnId },
          data: { status: "RECEIVED", updatedBy: userId },
        });
      }

      // 4. Update Stock
      const stockResult = await updateStockOnGRN(grn.id, tx);
      if (!stockResult.success) throw new Error(stockResult.error || "Failed to update stock");

      return grn;
    });

    await logItemUpdated(userId, "GRN", result.id, ["status"], result.grnNumber);
    revalidateBothPaths("purchases");
    revalidateBothPaths("inventory");

    return { success: true };
  } catch (error) {
    console.error("confirmGRN error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to confirm GRN" };
  }
}

export async function getGRNs(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "all" | "trash" = "all",
  warehouseId?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const session = await auth();
    const user = session?.user ? await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    }) : null;

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const skip = (page - 1) * limit;

    let targetWarehouseId: string | undefined = undefined;
    if (isNormalUser) {
      targetWarehouseId = user?.defaultWarehouseId || undefined;
    } else if (warehouseId && warehouseId !== "all") {
      targetWarehouseId = warehouseId;
    }

    const where: Prisma.GRNWhereInput = {
      isTrash: status === "trash",
      ...(targetWarehouseId ? { warehouseId: targetWarehouseId } : {}),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate ? { gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)) } : {}),
              ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { grnNumber: { contains: search, mode: "insensitive" } },
              { purchase: { purchaseNumber: { contains: search, mode: "insensitive" } } },
              { purchase: { supplier: { name: { contains: search, mode: "insensitive" } } } },
              { purchase: { supplier: { email: { contains: search, mode: "insensitive" } } } },
              { purchase: { supplier: { company: { contains: search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [grns, total] = await Promise.all([
      prisma.gRN.findMany({
        where,
        include: {
          purchase: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  company: true,
                },
              },
            },
          },
          tpn: {
            select: {
              tpnNumber: true,
            }
          },
          warehouse: {
            select: {
              name: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.gRN.count({ where }),
    ]);

    // Calculate total amount per GRN from its purchase?
    // Actually, GRN doesn't have a direct total cost stored. We can fetch items or just omit total.
    // For UI parity, we might need a total. Let's fetch items to calculate total, or just skip grandTotal.
    // Let's just fetch items to sum up the cost.
    const grnIds = grns.map(g => g.id);
    const grnItems = await prisma.gRNItem.findMany({
      where: { grnId: { in: grnIds } },
      include: { purchaseItem: true },
    });

    const itemsByGrn = grnItems.reduce((acc, item) => {
      if (!acc[item.grnId]) acc[item.grnId] = [];
      acc[item.grnId].push(item);
      return acc;
    }, {} as Record<string, typeof grnItems>);

    const formattedGrns = grns.map((grn) => {
      const items = itemsByGrn[grn.id] || [];
      const totalAmount = items.reduce((sum, item) => {
        const unitPrice = item.purchaseItem ? Number(item.purchaseItem.unitPrice) : 0;
        return sum + (Number(item.receivedQuantity) * unitPrice);
      }, 0);

      return {
        id: grn.id,
        grnNumber: grn.grnNumber,
        date: grn.date,
        status: grn.status,
        isTrash: grn.isTrash,
        grandTotal: totalAmount,
        itemsCount: items.length,
        source: grn.purchaseId ? {
          type: "PURCHASE",
          number: grn.purchase?.purchaseNumber || "",
          supplier: grn.purchase?.supplier || null,
        } : {
          type: "TPN",
          number: grn.tpn?.tpnNumber || "",
          supplier: null,
        },
        warehouse: grn.warehouse || null,
        createdAt: grn.createdAt,
        updatedAt: grn.updatedAt,
      };
    });

    return {
      success: true,
      grns: formattedGrns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getGRNs error:", error);
    return { success: false, error: "Failed to fetch GRNs: " + (error instanceof Error ? error.message : String(error)) };
  }
}

export async function deleteGRN(id: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const grn = await prisma.gRN.findUnique({
      where: { id },
    });

    if (!grn) {
      throw new Error("GRN not found");
    }

    if (grn.status === "COMPLETED") {
      throw new Error("Cannot delete a completed GRN. It has already updated stock and accounts.");
    }

    await prisma.gRN.update({
      where: { id },
      data: {
        isTrash: true,
        updatedBy: userId,
      },
    });

    await logItemUpdated(userId, "GRN", id, ["isTrash"], grn.grnNumber);
    revalidateBothPaths("purchases");

    return { success: true };
  } catch (error) {
    console.error("deleteGRN error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete GRN" };
  }
}

export async function bulkUpdateGRNStatus(ids: string[], action: "trash" | "restore") {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    // Validate that none of the GRNs to be trashed are completed
    if (action === "trash") {
      const completedGRNs = await prisma.gRN.count({
        where: {
          id: { in: ids },
          status: "COMPLETED",
        },
      });

      if (completedGRNs > 0) {
        throw new Error("Cannot move completed GRNs to trash.");
      }
    }

    await prisma.gRN.updateMany({
      where: { id: { in: ids } },
      data: {
        isTrash: action === "trash",
        updatedBy: userId,
      },
    });

    await createUserLog({
      userId,
      action: LogAction.ITEM_UPDATED,
      details: `Bulk ${action}d ${ids.length} GRNs`,
    });

    revalidateBothPaths("purchases");
    return { success: true };
  } catch (error) {
    console.error("bulkUpdateGRNStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update GRNs" };
  }
}

export async function deleteGRNsPermanently(ids: string[]) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    // Only allow permanently deleting trashed items that are not completed
    const validGrns = await prisma.gRN.findMany({
      where: {
        id: { in: ids },
        isTrash: true,
        status: { not: "COMPLETED" },
      },
      select: { id: true },
    });

    const validIds = validGrns.map((p) => p.id);

    if (validIds.length === 0) {
      throw new Error("No valid GRNs found to delete permanently");
    }

    await prisma.$transaction(async (tx) => {
      // Delete GRN Items
      await tx.gRNItem.deleteMany({
        where: { grnId: { in: validIds } },
      });

      // Delete GRNs
      await tx.gRN.deleteMany({
        where: { id: { in: validIds } },
      });
    });

    await createUserLog({
      userId,
      action: LogAction.ITEM_DELETED,
      details: `Permanently deleted ${validIds.length} GRNs`,
    });

    revalidateBothPaths("purchases");
    return { success: true };
  } catch (error) {
    console.error("deleteGRNsPermanently error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete GRNs" };
  }
}

export async function getGRNById(id: string) {
  try {
    const grn = await prisma.gRN.findUnique({
      where: { id },
      include: {
        warehouse: true,
        creator: { select: { name: true, email: true } },
        purchase: {
          include: {
            supplier: true,
          }
        },
        tpn: {
          include: {
            sourceWarehouse: true,
          }
        },
        items: {
          include: {
            item: {
              include: {
                unit: true,
              }
            },
            variant: true,
            purchaseItem: true,
            tpnItem: true,
          }
        }
      }
    });

    if (!grn) {
      return { success: false, error: "GRN not found" };
    }

    return { success: true, grn };
  } catch (error) {
    console.error("getGRNById error:", error);
    return { success: false, error: "Failed to fetch GRN details" };
  }
}

// --- PENDING DOCUMENTS FETCHERS ---

export async function getPendingPurchasesForWarehouse(warehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const purchases = await prisma.purchase.findMany({
      where: {
        warehouseId,
        status: {
          in: ["APPROVED", "PARTIALLY_RECEIVED"]
        },
        isTrash: false,
      },
      include: {
        supplier: {
          select: { name: true, company: true, email: true }
        },
        items: {
          include: {
            item: true,
            variant: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, purchases };
  } catch (error) {
    console.error("getPendingPurchasesForWarehouse error:", error);
    return { success: false, error: "Failed to fetch pending purchases" };
  }
}

export async function getPendingTPNsForWarehouse(destinationWarehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const tpns = await prisma.transferPurchaseNote.findMany({
      where: {
        destinationWarehouseId,
        status: "SHIPPED",
        isTrash: false,
      },
      include: {
        sourceWarehouse: {
          select: { name: true, code: true }
        },
        items: {
          include: {
            item: true,
            variant: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, tpns };
  } catch (error) {
    console.error("getPendingTPNsForWarehouse error:", error);
    return { success: false, error: "Failed to fetch pending TPNs" };
  }
}
