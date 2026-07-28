"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function getMembershipTiers(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", membershipTiers: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.MembershipTierWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (status === "trash") {
      where.isTrash = true;
    } else if (status === "active") {
      where.isTrash = false;
      where.status = "active";
    } else if (status === "inactive") {
      where.isTrash = false;
      where.status = "inactive";
    } else if (status === "all") {
      where.isTrash = false;
    }

    const total = await prisma.membershipTier.count({ where });
    const membershipTiers = await prisma.membershipTier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { minPurchaseValue: "asc" },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      membershipTiers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getMembershipTiers error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch membership tiers",
      membershipTiers: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}

export async function createMembershipTier(input: {
  name: string;
  minPurchaseValue: number;
  discountPercentage: number;
  status?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", membershipTier: null };
    }

    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Forbidden: Admin access required", membershipTier: null };
    }

    const existing = await prisma.membershipTier.findUnique({
      where: { name: input.name }
    });

    if (existing) {
      return { success: false, error: "A membership tier with this name already exists", membershipTier: null };
    }

    const membershipTier = await prisma.membershipTier.create({
      data: {
        name: input.name,
        minPurchaseValue: new Prisma.Decimal(input.minPurchaseValue),
        discountPercentage: new Prisma.Decimal(input.discountPercentage),
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    await logItemCreated(session.user.id, "MembershipTier", membershipTier.id, membershipTier.name, membershipTier);
    revalidateBothPaths("settings/membership/tiers");

    return { success: true, membershipTier };
  } catch (error) {
    console.error("createMembershipTier error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create membership tier", membershipTier: null };
  }
}

export async function updateMembershipTier(
  id: string,
  input: {
    name?: string;
    minPurchaseValue?: number;
    discountPercentage?: number;
    status?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", membershipTier: null };
    }

    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Forbidden: Admin access required", membershipTier: null };
    }

    const oldMembershipTier = await prisma.membershipTier.findUnique({ where: { id } });
    if (!oldMembershipTier) {
      return { success: false, error: "Membership tier not found", membershipTier: null };
    }

    if (input.name && input.name !== oldMembershipTier.name) {
      const existing = await prisma.membershipTier.findUnique({
        where: { name: input.name }
      });
      if (existing) {
        return { success: false, error: "A membership tier with this name already exists", membershipTier: null };
      }
    }

    const membershipTier = await prisma.membershipTier.update({
      where: { id },
      data: {
        name: input.name,
        minPurchaseValue: input.minPurchaseValue !== undefined ? new Prisma.Decimal(input.minPurchaseValue) : undefined,
        discountPercentage: input.discountPercentage !== undefined ? new Prisma.Decimal(input.discountPercentage) : undefined,
        status: input.status,
      },
    });

    await logItemUpdated(session.user.id, "MembershipTier", membershipTier.id, ["Updated MembershipTier"], oldMembershipTier as any, membershipTier as any);
    revalidateBothPaths("settings/membership/tiers");

    return { success: true, membershipTier };
  } catch (error) {
    console.error("updateMembershipTier error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update membership tier", membershipTier: null };
  }
}

export async function getMembershipTierById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", membershipTier: null };
    }

    const membershipTier = await prisma.membershipTier.findUnique({
      where: { id },
    });

    if (!membershipTier) {
      return { success: false, error: "Membership tier not found", membershipTier: null };
    }

    return { success: true, membershipTier };
  } catch (error) {
    console.error("getMembershipTierById error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch membership tier", membershipTier: null };
  }
}

export async function trashMembershipTier(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Forbidden: Admin access required" };
    }

    const oldMembershipTier = await prisma.membershipTier.findUnique({ where: { id } });
    if (!oldMembershipTier) {
      return { success: false, error: "Membership tier not found" };
    }

    const membershipTier = await prisma.membershipTier.update({
      where: { id },
      data: { isTrash: true, status: "trash" },
    });

    await logItemDeleted(session.user.id, "MembershipTier (Trash)", membershipTier.id, membershipTier.name);
    revalidateBothPaths("settings/membership/tiers");

    return { success: true };
  } catch (error) {
    console.error("trashMembershipTier error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to move membership tier to trash" };
  }
}

export async function bulkUpdateMembershipTierStatus(
  ids: string[],
  action: "trash" | "active" | "inactive" | "restore" | "delete"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Forbidden: Admin access required" };
    }

    if (action === "delete") {
      await prisma.membershipTier.deleteMany({
        where: { id: { in: ids } },
      });
    } else {
      const data: any = {};
      if (action === "trash") {
        data.isTrash = true;
        data.status = "trash";
      } else if (action === "restore") {
        data.isTrash = false;
        data.status = "active";
      } else {
        data.isTrash = false;
        data.status = action;
      }

      await prisma.membershipTier.updateMany({
        where: { id: { in: ids } },
        data,
      });
    }

    revalidateBothPaths("settings/membership/tiers");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateMembershipTierStatus error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to perform bulk action" };
  }
}

export async function deleteMembershipTier(id: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role?.toLowerCase() !== "admin") {
      return { success: false, error: "Forbidden: Admin access required" };
    }

    const oldMembershipTier = await prisma.membershipTier.findUnique({ where: { id } });
    if (!oldMembershipTier) {
      return { success: false, error: "Membership tier not found" };
    }

    await prisma.membershipTier.delete({
      where: { id },
    });

    await logItemDeleted(session.user.id, "MembershipTier (Permanent)", oldMembershipTier.id, oldMembershipTier.name);
    revalidateBothPaths("settings/membership/tiers");

    return { success: true };
  } catch (error) {
    console.error("deleteMembershipTier error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to permanently delete membership tier" };
  }
}
