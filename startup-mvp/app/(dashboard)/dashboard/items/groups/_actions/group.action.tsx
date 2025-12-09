"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
        { name: { contains: search, mode: "insensitive" } },
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
        name: true,
        code: true,
        description: true,
        quantity: true,
        number: true,
        sortOrder: true,
        status: true,
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
            quantity: true,
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
      quantity: mg.quantity ? Number(mg.quantity) : null,
      items: mg.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
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
        name: true,
        code: true,
        description: true,
        quantity: true,
        number: true,
        sortOrder: true,
        status: true,
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
            quantity: true,
            unitShutter: true,
            totalShutter: true,
            amount: true,
            note: true,
            sortOrder: true,
            itemId: true,
            item: {
              select: {
                id: true,
                code: true,
                description: true,
                unit: {
                  select: {
                    id: true,
                    symbol: true,
                    details: true,
                  },
                },
              },
            },
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
      quantity: group.quantity ? Number(group.quantity) : null,
      items: group.items.map((item) => ({
        ...item,
        height: item.height ? Number(item.height) : null,
        width: item.width ? Number(item.width) : null,
        depth: item.depth ? Number(item.depth) : null,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
        totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
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
  name: string;
  code?: string;
  description?: string;
  quantity?: number;
  number?: number;
  sortOrder?: number;
  status?: "active" | "inactive";
  items: Array<{
    sl: number;
    code?: string;
    description?: string;
    height?: number;
    width?: number;
    depth?: number;
    unit?: string;
    unitPrice: number;
    quantity: number;
    unitShutter?: number;
    totalShutter?: number;
    amount: number;
    note?: string;
    sortOrder: number;
    itemId?: string;
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
        name: input.name,
        code: input.code || null,
        description: input.description || null,
        quantity: input.quantity ? new Prisma.Decimal(input.quantity) : null,
        number: input.number || null,
        sortOrder: input.sortOrder || 0,
        status: input.status || "active",
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
            quantity: new Prisma.Decimal(item.quantity),
            unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
            totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
            amount: new Prisma.Decimal(item.amount),
            note: item.note || null,
            sortOrder: item.sortOrder,
            itemId: item.itemId || null,
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
        items: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Notify and log
    await notifyItemCreated({
      userId: session.user.id,
      itemType: "Group",
      itemName: group.name,
    });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.CREATE,
      details: `Created group: ${group.name}`,
    });

    revalidatePath("/dashboard/items/groups", "page");
    revalidatePath("/dashboard/items/groups", "layout");

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
  name: string;
  code?: string;
  description?: string;
  quantity?: number;
  number?: number;
  sortOrder?: number;
  status?: "active" | "inactive";
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
    quantity: number;
    unitShutter?: number;
    totalShutter?: number;
    amount: number;
    note?: string;
    sortOrder: number;
    itemId?: string;
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
        name: input.name,
        code: input.code || null,
        description: input.description || null,
        quantity: input.quantity ? new Prisma.Decimal(input.quantity) : null,
        number: input.number || null,
        sortOrder: input.sortOrder || 0,
        status: input.status || "active",
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
            quantity: new Prisma.Decimal(item.quantity),
            unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
            totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
            amount: new Prisma.Decimal(item.amount),
            note: item.note || null,
            sortOrder: item.sortOrder,
            itemId: item.itemId || null,
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
        items: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                description: true,
              },
            },
          },
        },
      },
    });

    // Notify and log
    await notifyItemUpdated({
      userId: session.user.id,
      itemType: "Group",
      itemName: group.name,
    });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.UPDATE,
      details: `Updated group: ${group.name}`,
    });

    revalidatePath("/dashboard/items/groups", "page");
    revalidatePath(`/dashboard/items/groups/${input.id}`, "page");

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
    await notifyItemDeleted({
      userId: session.user.id,
      itemType: "Group",
      itemName: group.name,
    });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.DELETE,
      details: `Moved group to trash: ${group.name}`,
    });

    revalidatePath("/dashboard/items/groups", "page");
    revalidatePath(`/dashboard/items/groups/${id}`, "page");

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
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Group "${group.name}" permanently deleted`,
      metadata: {
        groupId: group.id,
        groupName: group.name,
        code: group.code,
      },
    });

    // Notify
    await notifyItemDeleted({
      userId: session.user.id,
      itemType: "Group",
      itemName: group.name,
    });

    revalidatePath("/dashboard/items/groups", "page");

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
    await notifyItemUpdated({
      userId: session.user.id,
      itemType: "Group",
      itemName: group.name,
    });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.UPDATE,
      details: `Restored group from trash: ${group.name}`,
    });

    revalidatePath("/dashboard/items/groups", "page");

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
        name: true,
      },
    });

    // Log bulk action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.UPDATE,
      details: `Bulk updated ${result.count} group(s) to ${status}`,
      metadata: {
        groupIds,
        status,
        count: result.count,
      },
    });

    // Notify for each group
    for (const group of updatedGroups) {
      if (status === "trash") {
        await notifyItemDeleted({
          userId: session.user.id,
          itemType: "Group",
          itemName: group.name,
        });
      } else {
        await notifyItemUpdated({
          userId: session.user.id,
          itemType: "Group",
          itemName: group.name,
        });
      }
    }

    revalidatePath("/dashboard/items/groups", "page");

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
        name: true,
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
      await notifyItemDeleted({
        userId: session.user.id,
        itemType: "Group",
        itemName: group.name,
      });
    }

    revalidatePath("/dashboard/items/groups", "page");

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
        name: true,
        code: true,
        description: true,
        quantity: true,
        number: true,
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
            quantity: true,
            unitShutter: true,
            totalShutter: true,
            amount: true,
            note: true,
            sortOrder: true,
            itemId: true,
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
      quantity: group.quantity ? Number(group.quantity) : null,
      items: group.items.map((item) => ({
        ...item,
        height: item.height ? Number(item.height) : null,
        width: item.width ? Number(item.width) : null,
        depth: item.depth ? Number(item.depth) : null,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
        totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
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
        name: true,
        code: true,
        description: true,
        quantity: true,
        number: true,
        items: {
          select: {
            id: true,
            sl: true,
            code: true,
            description: true,
            quantity: true,
            unitPrice: true,
            amount: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Serialize Decimal fields
    const serializedGroups = groups.map((mg) => ({
      ...mg,
      quantity: mg.quantity ? Number(mg.quantity) : null,
      items: mg.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
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

