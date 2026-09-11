"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { getNextSequenceNumber } from "@/lib/sequence";
import { revalidateBothPaths } from "@/lib/route-utils-server";

async function getAuthAndOrg() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const userId = session.user.id;
  const organizationId = (session.user as any)?.organizationId || "default-org";
  return { userId, organizationId };
}

/**
 * Register a physical asset item
 */
export async function createFixedAssetItem(data: {
  name: string;
  assetTag?: string;
  serialNumber?: string;
  chartOfAccountId: string;
  purchaseDate?: string;
  purchaseCost: number;
  salvageValue?: number;
  usefulLifeYears?: number;
  location?: string;
  assignedToEmployeeId?: string;
  notes?: string;
}) {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canCreate =
      (await hasPermission(userId, "accounts.chart-of-accounts", "create")) ||
      (await hasPermission(userId, "accounts.vouchers", "create"));

    if (!canCreate) {
      return { success: false, error: "Permission denied to register fixed asset item" };
    }

    if (!data.name || !data.chartOfAccountId || !data.purchaseCost || data.purchaseCost <= 0) {
      return { success: false, error: "Item Name, Asset Account, and Positive Purchase Cost are required" };
    }

    // Auto-generate unique asset tag if not provided
    let assetTag = data.assetTag;
    if (!assetTag) {
      assetTag = await getNextSequenceNumber(
        organizationId,
        "FIXED_ASSET_TAG",
        "FA",
        new Date().getFullYear(),
        4
      );
    }

    // Check assetTag uniqueness
    const existingTag = await prisma.fixedAssetItem.findUnique({
      where: { assetTag },
    });
    if (existingTag) {
      return { success: false, error: `Asset Tag '${assetTag}' already exists` };
    }

    const pDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();

    const newItem = await prisma.fixedAssetItem.create({
      data: {
        assetTag,
        name: data.name,
        serialNumber: data.serialNumber || null,
        chartOfAccountId: data.chartOfAccountId,
        purchaseDate: pDate,
        purchaseCost: new Prisma.Decimal(data.purchaseCost),
        salvageValue: new Prisma.Decimal(data.salvageValue || 0),
        usefulLifeYears: data.usefulLifeYears || 5,
        status: "in_use",
        location: data.location || "Main Office",
        assignedToEmployeeId: data.assignedToEmployeeId || null,
        notes: data.notes || null,
        organizationId,
        createdBy: userId,
      },
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/items");

    return { success: true, item: newItem };
  } catch (error: any) {
    console.error("Error creating fixed asset item:", error);
    return { success: false, error: error.message || "Failed to register fixed asset item" };
  }
}

/**
 * Get all itemized fixed assets with computed individual depreciation
 */
export async function getFixedAssetItems(filters?: {
  status?: string;
  chartOfAccountId?: string;
  assignedToEmployeeId?: string;
  search?: string;
}) {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canView =
      (await hasPermission(userId, "accounts.chart-of-accounts", "view")) ||
      (await hasPermission(userId, "accounts.vouchers", "view"));

    if (!canView) {
      return { success: false, error: "Permission denied", items: [], metrics: null };
    }

    const where: any = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
    };

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.chartOfAccountId) {
      where.chartOfAccountId = filters.chartOfAccountId;
    }
    if (filters?.assignedToEmployeeId) {
      where.assignedToEmployeeId = filters.assignedToEmployeeId;
    }

    const items = await prisma.fixedAssetItem.findMany({
      where,
      include: {
        ChartOfAccount: {
          select: { id: true, code: true, name: true },
        },
        Employee: {
          select: { id: true, name: true, employeeCode: true, designation: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    // Compute unit-level depreciation & NBV
    const itemsWithCalculations = items.map((item) => {
      const cost = Number(item.purchaseCost);
      const salvage = Number(item.salvageValue);
      const lifeYears = item.usefulLifeYears || 5;

      const pDate = new Date(item.purchaseDate);
      const diffTime = Math.max(0, now.getTime() - pDate.getTime());
      const ageInYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

      const annualDepr = Math.max(0, (cost - salvage) / lifeYears);
      const calculatedAccumDepr = Math.min(cost - salvage, annualDepr * ageInYears);
      const netBookValue = Math.max(salvage, cost - calculatedAccumDepr);

      return {
        ...item,
        purchaseCost: cost,
        salvageValue: salvage,
        calculatedAccumDepr,
        netBookValue,
        annualDepr,
        ageInMonths: Math.floor(ageInYears * 12),
      };
    });

    const filteredItems = itemsWithCalculations.filter((item) => {
      if (!filters?.search) return true;
      const term = filters.search.toLowerCase();
      return (
        item.name.toLowerCase().includes(term) ||
        item.assetTag.toLowerCase().includes(term) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(term)) ||
        (item.location && item.location.toLowerCase().includes(term)) ||
        (item.Employee && item.Employee.name.toLowerCase().includes(term))
      );
    });

    const totalCost = filteredItems.reduce((sum, i) => sum + i.purchaseCost, 0);
    const totalAccumDepr = filteredItems.reduce((sum, i) => sum + i.calculatedAccumDepr, 0);
    const totalNBV = filteredItems.reduce((sum, i) => sum + i.netBookValue, 0);

    const countsByStatus = {
      in_use: itemsWithCalculations.filter((i) => i.status === "in_use").length,
      pending_transfer: itemsWithCalculations.filter((i) => i.status === "pending_transfer").length,
      ready_for_disposal: itemsWithCalculations.filter((i) => i.status === "ready_for_disposal").length,
      disposed: itemsWithCalculations.filter((i) => i.status === "disposed").length,
      total: itemsWithCalculations.length,
    };

    return {
      success: true,
      items: filteredItems,
      metrics: {
        totalCost,
        totalAccumDepr,
        totalNBV,
        countsByStatus,
      },
    };
  } catch (error: any) {
    console.error("Error fetching fixed asset items:", error);
    return { success: false, error: error.message || "Failed to fetch items", items: [], metrics: null };
  }
}

/**
 * Update fixed asset item status (e.g., mark as ready for disposal, in use, pending transfer)
 */
export async function updateFixedAssetItemStatus(
  id: string,
  status: "in_use" | "pending_transfer" | "ready_for_disposal" | "disposed" | "in_maintenance",
  notes?: string
) {
  try {
    const { userId } = await getAuthAndOrg();
    const canUpdate = await hasPermission(userId, "accounts.chart-of-accounts", "edit");

    if (!canUpdate) {
      return { success: false, error: "Permission denied" };
    }

    const updated = await prisma.fixedAssetItem.update({
      where: { id },
      data: {
        status,
        ...(notes ? { notes } : {}),
      },
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/items");

    return { success: true, item: updated };
  } catch (error: any) {
    console.error("Error updating fixed asset item status:", error);
    return { success: false, error: error.message || "Failed to update item status" };
  }
}

/**
 * Transfer item to a new location or assigned employee
 */
export async function transferFixedAssetItem(
  id: string,
  data: {
    location?: string;
    assignedToEmployeeId?: string;
    notes?: string;
  }
) {
  try {
    const { userId } = await getAuthAndOrg();
    const canUpdate = await hasPermission(userId, "accounts.chart-of-accounts", "edit");

    if (!canUpdate) {
      return { success: false, error: "Permission denied" };
    }

    const updated = await prisma.fixedAssetItem.update({
      where: { id },
      data: {
        ...(data.location ? { location: data.location } : {}),
        assignedToEmployeeId: data.assignedToEmployeeId || null,
        ...(data.notes ? { notes: data.notes } : {}),
        status: "in_use",
      },
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/items");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/transfers");

    return { success: true, item: updated };
  } catch (error: any) {
    console.error("Error transferring fixed asset item:", error);
    return { success: false, error: error.message || "Failed to transfer item" };
  }
}

/**
 * Delete a fixed asset item record
 */
export async function deleteFixedAssetItem(id: string) {
  try {
    const { userId } = await getAuthAndOrg();
    const canDelete = await hasPermission(userId, "accounts.chart-of-accounts", "delete");

    if (!canDelete) {
      return { success: false, error: "Permission denied to delete item" };
    }

    await prisma.fixedAssetItem.delete({
      where: { id },
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/items");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting fixed asset item:", error);
    return { success: false, error: error.message || "Failed to delete item" };
  }
}
