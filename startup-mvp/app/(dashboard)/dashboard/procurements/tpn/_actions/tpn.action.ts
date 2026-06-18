"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { TransferStatus, Prisma } from "@prisma/client";
import { updateStockOnTPN } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";

/**
 * Generate a unique TPN Number
 */
async function generateTPNNumber(): Promise<string> {
  const lastTPN = await prisma.transferPurchaseNote.findFirst({
    orderBy: {
      tpnNumber: 'desc',
    },
  });

  if (!lastTPN) {
    return 'TPN-10001';
  }

  const lastNumber = parseInt(lastTPN.tpnNumber.replace('TPN-', ''), 10);
  return `TPN-${lastNumber + 1}`;
}

export type TPNFormInput = {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  date: Date;
  notes?: string;
  items: Array<{
    itemId: string;
    variantId?: string | null;
    quantity: number;
  }>;
};

/**
 * Create a new TPN
 */
export async function createTPN(input: TPNFormInput) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canCreate = await hasPermission(session.user.id, "procurements.tpn", "create");
    if (!canCreate) {
      return { success: false, error: "You don't have permission to create TPNs" };
    }

    if (input.sourceWarehouseId === input.destinationWarehouseId) {
      return { success: false, error: "Source and destination warehouses cannot be the same" };
    }

    const tpnNumber = await generateTPNNumber();

    const result = await prisma.$transaction(async (tx) => {
      const tpn = await tx.transferPurchaseNote.create({
        data: {
          tpnNumber,
          sourceWarehouseId: input.sourceWarehouseId,
          destinationWarehouseId: input.destinationWarehouseId,
          date: input.date,
          status: TransferStatus.DRAFT,
          notes: input.notes,
          createdBy: session.user.id,
          items: {
            create: input.items.map((item) => ({
              itemId: item.itemId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          },
        },
      });
      return tpn;
    });

    await logItemCreated(
      session.user.id,
      "TransferPurchaseNote",
      result.id,
      "Created TPN",
      { tpnNumber: result.tpnNumber }
    );

    await notifyItemCreated(session.user.id, "TPN", result.tpnNumber);
    await revalidateBothPaths("/dashboard/procurements/tpn");

    return { success: true, tpnId: result.id };
  } catch (error) {
    console.error("createTPN error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create TPN",
    };
  }
}

/**
 * Ship a TPN (Deducts stock from source warehouse)
 */
export async function shipTPN(tpnId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canApprove = await hasPermission(session.user.id, "procurements.tpn", "approve");
    if (!canApprove) {
      return { success: false, error: "You don't have permission to ship TPNs" };
    }

    const tpn = await prisma.transferPurchaseNote.findUnique({
      where: { id: tpnId },
      include: { items: true },
    });

    if (!tpn) return { success: false, error: "TPN not found" };
    if (tpn.status !== TransferStatus.DRAFT) {
      return { success: false, error: "Only DRAFT TPNs can be shipped" };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updatedTPN = await tx.transferPurchaseNote.update({
        where: { id: tpnId },
        data: {
          status: TransferStatus.SHIPPED,
          updatedBy: session.user.id,
        },
      });

      // 2. Deduct from source warehouse
      const stockUpdateResult = await updateStockOnTPN(
        tpn.id,
        tpn.sourceWarehouseId,
        "OUT",
        tpn.items.map(i => ({
          itemId: i.itemId,
          variantId: i.variantId,
          quantity: Number(i.quantity)
        })),
        tx
      );

      if (!stockUpdateResult.success) {
        throw new Error(stockUpdateResult.error || "Failed to update stock");
      }

      return updatedTPN;
    });

    await logItemUpdated(
      session.user.id,
      "TransferPurchaseNote",
      tpnId,
      ["Status changed to SHIPPED (Stock deducted from source)"],
      tpn.tpnNumber
    );

    await notifyItemUpdated(session.user.id, "TPN Shipped", tpn.tpnNumber);
    await revalidateBothPaths("/dashboard/procurements/tpn");

    return { success: true };
  } catch (error) {
    console.error("shipTPN error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to ship TPN",
    };
  }
}

/**
 * Receive a TPN (Adds stock to destination warehouse)
 */
export async function receiveTPN(tpnId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canApprove = await hasPermission(session.user.id, "procurements.tpn", "approve");
    if (!canApprove) {
      return { success: false, error: "You don't have permission to receive TPNs" };
    }

    const tpn = await prisma.transferPurchaseNote.findUnique({
      where: { id: tpnId },
      include: { items: true },
    });

    if (!tpn) return { success: false, error: "TPN not found" };
    if (tpn.status !== TransferStatus.SHIPPED) {
      return { success: false, error: "Only SHIPPED TPNs can be received" };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updatedTPN = await tx.transferPurchaseNote.update({
        where: { id: tpnId },
        data: {
          status: TransferStatus.RECEIVED,
          updatedBy: session.user.id,
        },
      });

      // 2. Add to destination warehouse
      const stockUpdateResult = await updateStockOnTPN(
        tpn.id,
        tpn.destinationWarehouseId,
        "IN",
        tpn.items.map(i => ({
          itemId: i.itemId,
          variantId: i.variantId,
          quantity: Number(i.quantity)
        })),
        tx
      );

      if (!stockUpdateResult.success) {
        throw new Error(stockUpdateResult.error || "Failed to update stock");
      }

      return updatedTPN;
    });

    await logItemUpdated(
      session.user.id,
      "TransferPurchaseNote",
      tpnId,
      ["Status changed to RECEIVED (Stock added to destination)"],
      tpn.tpnNumber
    );

    await notifyItemUpdated(session.user.id, "TPN Received", tpn.tpnNumber);
    await revalidateBothPaths("/dashboard/procurements/tpn");

    return { success: true };
  } catch (error) {
    console.error("receiveTPN error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to receive TPN",
    };
  }
}

export async function getTPNs(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "trash" | "all" = "all",
  warehouseId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { 
        success: false, 
        error: "Unauthorized", 
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true },
    });

    const isNormalUser = user?.role !== "admin" && user?.role !== "superadmin";

    const skip = (page - 1) * limit;

    const where: Prisma.TransferPurchaseNoteWhereInput = {
      isTrash: status === "trash",
      ...(isNormalUser && user?.defaultWarehouseId ? { destinationWarehouseId: user.defaultWarehouseId } : warehouseId ? { destinationWarehouseId: warehouseId } : {}),
    };

    if (search) {
      where.OR = [
        { tpnNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.transferPurchaseNote.count({ where });

    const tpns = await prisma.transferPurchaseNote.findMany({
      where,
      skip,
      take: limit,
      include: {
        sourceWarehouse: { select: { name: true } },
        destinationWarehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPages = Math.ceil(total / limit);

    return { 
      success: true, 
      data: tpns,
      pagination: { page, limit, total, totalPages },
    };
  } catch (error) {
    console.error("getTPNs error:", error);
    return { 
      success: false, 
      error: "Failed to load TPNs", 
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function getTPNById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: null };
    }

    const tpn = await prisma.transferPurchaseNote.findUnique({
      where: { id },
      include: {
        sourceWarehouse: { select: { name: true } },
        destinationWarehouse: { select: { name: true } },
        items: {
          include: {
            item: { select: { name: true, code: true } },
            variant: { select: { sku: true, size: true, color: true } },
          }
        },
      },
    });

    return { success: true, data: tpn };
  } catch (error) {
    console.error("getTPNById error:", error);
    return { success: false, error: "Failed to load TPN", data: null };
  }
}


export async function deleteTPN(tpnId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const tpn = await prisma.transferPurchaseNote.findUnique({
      where: { id: tpnId },
      select: { 
        id: true, 
        tpnNumber: true, 
        isTrash: true,
        status: true,
      },
    });

    if (!tpn) {
      return { success: false, error: "TPN not found" };
    }

    if (tpn.status !== TransferStatus.DRAFT) {
      return { 
        success: false, 
        error: "Only DRAFT TPNs can be moved to trash. Shipped or Received TPNs cannot be deleted." 
      };
    }

    await prisma.transferPurchaseNote.update({
      where: { id: tpnId },
      data: { isTrash: true },
    });

    await logItemDeleted(
      userId,
      "TransferPurchaseNote",
      tpnId,
      tpn.tpnNumber
    );

    revalidateBothPaths("/dashboard/procurements/tpn");

    return { success: true };
  } catch (error) {
    console.error("deleteTPN error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete TPN",
    };
  }
}

export async function bulkUpdateTPNStatus(
  tpnIds: string[],
  action: "trash" | "restore"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (tpnIds.length === 0) {
      return { success: false, error: "No TPNs selected" };
    }

    if (action === "trash") {
      // only draft tpns can be trashed
      const tpnsToTrash = await prisma.transferPurchaseNote.findMany({
        where: { id: { in: tpnIds }, status: TransferStatus.DRAFT }
      });
      const validIds = tpnsToTrash.map(t => t.id);
      if (validIds.length === 0) {
        return { success: false, error: "Only DRAFT TPNs can be moved to trash" };
      }
      await prisma.transferPurchaseNote.updateMany({
        where: { id: { in: validIds } },
        data: { isTrash: true },
      });
    } else if (action === "restore") {
      await prisma.transferPurchaseNote.updateMany({
        where: { id: { in: tpnIds } },
        data: { isTrash: false },
      });
    }

    revalidateBothPaths("/dashboard/procurements/tpn");
    return { success: true };
  } catch (error) {
    console.error("bulkUpdateTPNStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update TPNs",
    };
  }
}

export async function deleteTPNsPermanently(tpnIds: string[]) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    if (tpnIds.length === 0) {
      return { success: false, error: "No TPNs selected" };
    }

    const tpns = await prisma.transferPurchaseNote.findMany({
      where: { id: { in: tpnIds }, isTrash: true },
      select: { id: true, tpnNumber: true },
    });

    if (tpns.length === 0) {
      return { success: false, error: "No TPNs found in trash" };
    }

    for (const tpn of tpns) {
      await logItemDeleted(
        userId,
        "TransferPurchaseNote",
        tpn.id,
        tpn.tpnNumber
      );
    }

    // Must delete items first due to foreign keys, unless cascade delete is set
    await prisma.transferPurchaseNoteItem.deleteMany({
      where: { tpnId: { in: tpnIds } }
    });

    await prisma.transferPurchaseNote.deleteMany({
      where: { id: { in: tpnIds }, isTrash: true },
    });

    revalidateBothPaths("/dashboard/procurements/tpn");
    return { success: true };
  } catch (error) {
    console.error("deleteTPNsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete TPNs",
    };
  }
}
