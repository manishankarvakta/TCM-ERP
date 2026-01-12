"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from "@/lib/notification";
import { createUserLog, LogAction } from "@/lib/user-log";

/**
 * Get paginated list of module groups with search
 */
export async function getGroups(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        groups: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.ModuleGroupWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      where.status = { not: "trash" };
    }

    // Get total count
    const total = await prisma.moduleGroup.count({ where });

    // Get module groups
    const groups = await prisma.moduleGroup.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        description: true,
        sortOrder: true,
        status: true,
        baseUnit: true,
        baseUnitPrice: true,
        costPrice: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          select: {
            id: true,
            sl: true,
            code: true,
            description: true,
            unitPrice: true,
            amount: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize Decimal fields
    const serializedGroups = groups.map((mg) => ({
      ...mg,
      baseUnitPrice: mg.baseUnitPrice !== null && mg.baseUnitPrice !== undefined ? Number(mg.baseUnitPrice) : null,
      costPrice: Number(mg.costPrice),
      items: mg.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    }));

    return {
      success: true,
      groups: serializedGroups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("getGroups error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch groups",
      groups: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get group by ID
 */
export async function getGroupById(groupId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        group: null,
      };
    }

    const group = await prisma.moduleGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        code: true,
        description: true,
        sortOrder: true,
        status: true,
        baseUnit: true,
        baseUnitPrice: true,
        costPrice: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          select: {
            id: true,
            sl: true,
            code: true,
            description: true,
            height: true,
            width: true,
            depth: true,
            unit: true,
            unitPrice: true,
            amount: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!group) {
      return {
        success: false,
        error: "Group not found",
        group: null,
      };
    }

    // Serialize Decimal fields
    const serializedGroup = {
      ...group,
      baseUnitPrice: group.baseUnitPrice !== null && group.baseUnitPrice !== undefined ? Number(group.baseUnitPrice) : null,
      costPrice: Number(group.costPrice),
      items: group.items.map((item) => ({
        ...item,
        height: item.height ? Number(item.height) : null,
        width: item.width ? Number(item.width) : null,
        depth: item.depth ? Number(item.depth) : null,
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    };

    return {
      success: true,
      group: serializedGroup,
    };
  } catch (error) {
    console.error("getGroupById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch group",
      group: null,
    };
  }
}

/**
 * Create a new group
 */
export async function createGroup(input: {
  code?: string;
  description?: string;
  sortOrder?: number;
  status?: "active" | "inactive";
  baseUnit?: string;
  baseUnitPrice?: number;
  costPrice?: number;
  items: Array<{
    sl: number;
    code?: string;
    description?: string;
    height?: number;
    width?: number;
    depth?: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    sortOrder: number;
  }>;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        group: null,
      };
    }

    // Create group with items
    const group = await prisma.moduleGroup.create({
      data: {
        code: input.code || null,
        description: input.description || null,
        sortOrder: input.sortOrder || 0,
        status: input.status || "active",
        baseUnit: input.baseUnit || null,
        baseUnitPrice: input.baseUnitPrice ? new Prisma.Decimal(input.baseUnitPrice) : null,
        costPrice: input.costPrice !== undefined ? new Prisma.Decimal(input.costPrice) : new Prisma.Decimal(0),
        createdBy: session.user.id,
        items: {
          create: input.items.map((item) => ({
            sl: item.sl,
            code: item.code || null,
            description: item.description || null,
            height: item.height ? new Prisma.Decimal(item.height) : null,
            width: item.width ? new Prisma.Decimal(item.width) : null,
            depth: item.depth ? new Prisma.Decimal(item.depth) : null,
            unit: item.unit || null,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            amount: new Prisma.Decimal(item.amount),
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    // Notify and log
    const groupLabel = group.code || "Untitled Group";
    await notifyItemCreated(
      session.user.id,
      "Group",
      groupLabel
    );

    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
      details: `Created group: ${groupLabel}`,
    });

    revalidateBothPaths("items/groups", "page");
    revalidateBothPaths("items/groups", "layout");

    return {
      success: true,
      group,
    };
  } catch (error) {
    console.error("createGroup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group",
      group: null,
    };
  }
}

/**
 * Update a group
 */
export async function updateGroup(input: {
  id: string;
  code?: string;
  description?: string;
  sortOrder?: number;
  status?: "active" | "inactive";
  baseUnit?: string;
  baseUnitPrice?: number;
  costPrice?: number;
  items: Array<{
    id?: string;
    sl: number;
    code?: string;
    description?: string;
    height?: number;
    width?: number;
    depth?: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    sortOrder: number;
  }>;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        group: null,
      };
    }

    // Check if group exists
    const existingGroup = await prisma.moduleGroup.findUnique({
      where: { id: input.id },
    });

    if (!existingGroup) {
      return {
        success: false,
        error: "Group not found",
        group: null,
      };
    }

    // Delete existing items and create new ones
    await prisma.moduleGroupItem.deleteMany({
      where: { moduleGroupId: input.id },
    });

    // Update group with new items
    const group = await prisma.moduleGroup.update({
      where: { id: input.id },
      data: {
        code: input.code || null,
        description: input.description || null,
        sortOrder: input.sortOrder || 0,
        status: input.status || "active",
        baseUnit: input.baseUnit || null,
        baseUnitPrice: input.baseUnitPrice ? new Prisma.Decimal(input.baseUnitPrice) : null,
        costPrice: input.costPrice !== undefined ? new Prisma.Decimal(input.costPrice) : new Prisma.Decimal(0),
        items: {
          create: input.items.map((item) => ({
            sl: item.sl,
            code: item.code || null,
            description: item.description || null,
            height: item.height ? new Prisma.Decimal(item.height) : null,
            width: item.width ? new Prisma.Decimal(item.width) : null,
            depth: item.depth ? new Prisma.Decimal(item.depth) : null,
            unit: item.unit || null,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            amount: new Prisma.Decimal(item.amount),
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    // Notify and log
    const groupLabel = group.code || "Untitled Group";
    await notifyItemUpdated(
      session.user.id,
      "Group",
      groupLabel
    );

    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Updated group: ${groupLabel}`,
    });

    revalidateBothPaths("items/groups", "page");
    revalidatePath(`/admin/items/groups/${input.id}`, "page");

    return {
      success: true,
      group,
    };
  } catch (error) {
    console.error("updateGroup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update group",
      group: null,
    };
  }
}

/**
 * Delete group (move to trash)
 */
export async function deleteGroup(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const group = await prisma.moduleGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return {
        success: false,
        error: "Group not found",
      };
    }

    // Move to trash
    await prisma.moduleGroup.update({
      where: { id },
      data: {
        status: "trash",
      },
    });

    // Notify and log
    const groupLabel = group.code || "Untitled Group";
    await notifyItemDeleted(
      session.user.id,
      "Group",
      groupLabel
    );

    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Moved group to trash: ${groupLabel}`,
    });

    revalidateBothPaths("items/groups", "page");
    revalidatePath(`/admin/items/groups/${id}`, "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteGroup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete group",
    };
  }
}

/**
 * Delete group permanently (only for trashed groups)
 */
export async function deleteGroupPermanently(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const group = await prisma.moduleGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return {
        success: false,
        error: "Group not found",
      };
    }

    if (group.status !== "trash") {
      return {
        success: false,
        error: "Only trashed groups can be permanently deleted",
      };
    }

    // Delete permanently (cascade will handle items)
    await prisma.moduleGroup.delete({
      where: { id },
    });

    // Log permanent deletion
    const groupLabel = group.code || "Untitled Group";
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Group "${groupLabel}" permanently deleted`,
      metadata: {
        groupId: group.id,
        groupName: groupLabel,
        code: group.code,
      },
    });

    // Notify
    await notifyItemDeleted(
      session.user.id,
      "Group",
      groupLabel
    );

    revalidateBothPaths("items/groups", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteGroupPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete group permanently",
    };
  }
}

/**
 * Restore group from trash
 */
export async function restoreGroup(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const group = await prisma.moduleGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return {
        success: false,
        error: "Group not found",
      };
    }

    if (group.status !== "trash") {
      return {
        success: false,
        error: "Only trashed groups can be restored",
      };
    }

    // Restore to active status
    await prisma.moduleGroup.update({
      where: { id },
      data: {
        status: "active",
      },
    });

    // Notify and log
    const groupLabel = group.code || "Untitled Group";
    await notifyItemUpdated(
      session.user.id,
      "Group",
      groupLabel
    );

    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Restored group from trash: ${groupLabel}`,
    });

    revalidateBothPaths("items/groups", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error("restoreGroup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore group",
    };
  }
}

/**
 * Bulk update group status
 */
export async function bulkUpdateGroupStatus(
  groupIds: string[],
  status: "active" | "inactive" | "trash"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!groupIds || groupIds.length === 0) {
      return {
        success: false,
        error: "No groups selected",
      };
    }

    // Update all groups
    const result = await prisma.moduleGroup.updateMany({
      where: {
        id: { in: groupIds },
      },
      data: {
        status,
      },
    });

    // Get updated groups for logging
    const updatedGroups = await prisma.moduleGroup.findMany({
      where: {
        id: { in: groupIds },
      },
      select: {
        id: true,
        code: true,
      },
    });

    // Log bulk action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Bulk updated ${result.count} group(s) to ${status}`,
      metadata: {
        groupIds,
        status,
        count: result.count,
      },
    });

    // Notify for each group
    for (const group of updatedGroups) {
      const groupLabel = group.code || "Untitled Group";
      if (status === "trash") {
        await notifyItemDeleted(
          session.user.id,
          "Group",
          groupLabel
        );
      } else {
        await notifyItemUpdated(
          session.user.id,
          "Group",
          groupLabel
        );
      }
    }

    revalidateBothPaths("items/groups", "page");

    return {
      success: true,
      count: result.count,
    };
  } catch (error) {
    console.error("bulkUpdateGroupStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update group status",
    };
  }
}

/**
 * Delete groups permanently (bulk)
 */
export async function deleteGroupsPermanently(groupIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!groupIds || groupIds.length === 0) {
      return {
        success: false,
        error: "No groups selected",
      };
    }

    // Get groups before deletion for logging
    const groups = await prisma.moduleGroup.findMany({
      where: {
        id: { in: groupIds },
        status: "trash", // Only allow permanent deletion of trashed groups
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (groups.length === 0) {
      return {
        success: false,
        error: "No trashed groups found to delete permanently",
      };
    }

    // Delete permanently (cascade will handle items)
    const result = await prisma.moduleGroup.deleteMany({
      where: {
        id: { in: groups.map((g) => g.id) },
        status: "trash",
      },
    });

    // Log permanent deletion
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Permanently deleted ${result.count} group(s)`,
      metadata: {
        groupIds: groups.map((g) => g.id),
        count: result.count,
      },
    });

    // Notify for each group
    for (const group of groups) {
      const groupLabel = group.code || "Untitled Group";
      await notifyItemDeleted(
        session.user.id,
        "Group",
        groupLabel
      );
    }

    revalidateBothPaths("items/groups", "page");

    return {
      success: true,
      count: result.count,
    };
  } catch (error) {
    console.error("deleteGroupsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete groups permanently",
    };
  }
}

/**
 * Get ModuleGroup by ID with all items (for populating quotation groups)
 */
export async function getModuleGroupById(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        group: null,
      };
    }

    const group = await prisma.moduleGroup.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        description: true,
        baseUnit: true,
        baseUnitPrice: true,
        items: {
          select: {
            id: true,
            sl: true,
            code: true,
            description: true,
            height: true,
            width: true,
            depth: true,
            unit: true,
            unitPrice: true,
            amount: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!group) {
      return {
        success: false,
        error: "Group not found",
        group: null,
      };
    }

    // Serialize Decimal fields
    const serializedGroup = {
      ...group,
      baseUnitPrice: group.baseUnitPrice !== null && group.baseUnitPrice !== undefined ? Number(group.baseUnitPrice) : null,
      costPrice: Number(group.costPrice),
      items: group.items.map((item) => ({
        ...item,
        height: item.height ? Number(item.height) : null,
        width: item.width ? Number(item.width) : null,
        depth: item.depth ? Number(item.depth) : null,
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    };

    return {
      success: true,
      group: serializedGroup,
    };
  } catch (error) {
    console.error("getModuleGroupById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch group",
      group: null,
    };
  }
}

/**
 * Get all active groups for dropdown
 */
export async function getActiveGroups() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        groups: [],
      };
    }

    const groups = await prisma.moduleGroup.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        code: true,
        description: true,
        items: {
          select: {
            id: true,
            sl: true,
            code: true,
            description: true,
            unitPrice: true,
            amount: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    // Serialize Decimal fields
    const serializedGroups = groups.map((mg) => ({
      ...mg,
      items: mg.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    }));

    return {
      success: true,
      groups: serializedGroups,
    };
  } catch (error) {
    console.error("getActiveGroups error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch groups",
      groups: [],
    };
  }
}

