"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, ItemType, Prisma as PrismaClient } from "@prisma/client";

/**
 * Generate unique BOM code
 */
async function generateBOMCode(): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `BOM-${year}-`;
  
  // Find last code with this pattern
  const lastBOM = await prisma.bOM.findFirst({
    where: { 
      code: { startsWith: pattern },
      isTrash: false,
    },
    orderBy: { code: "desc" },
  });
  
  let sequence = 1;
  if (lastBOM) {
    const parts = lastBOM.code.split("-");
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2] || "0");
      sequence = lastSeq + 1;
    }
  }
  
  return `BOM-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Get active finished goods for dropdown
 */
export async function getActiveFinishedGoods() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const items = await prisma.item.findMany({
      where: {
        itemType: ItemType.READY_PRODUCT,
        status: "active",
        isTrash: false,
      },
      select: {
        id: true,
        name: true,
        code: true,
        unit: {
          select: {
            symbol: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      items,
    };
  } catch (error) {
    console.error("getActiveFinishedGoods error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch finished goods",
      items: [],
    };
  }
}

/**
 * Get active raw materials for dropdown
 */
export async function getActiveRawMaterials() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const items = await prisma.item.findMany({
      where: {
        itemType: ItemType.RAW_MATERIAL,
        status: "active",
        isTrash: false,
      },
      select: {
        id: true,
        name: true,
        code: true,
        unit: {
          select: {
            symbol: true,
          },
        },
        costPrice: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      items,
    };
  } catch (error) {
    console.error("getActiveRawMaterials error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch raw materials",
      items: [],
    };
  }
}

/**
 * Get paginated list of BOMs with filters
 */
export async function getBOMs(
  page: number = 1,
  limit: number = 10,
  filters: {
    search?: string;
    status?: string;
    itemId?: string;
  } = {}
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        boms: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "production.boms", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view BOMs",
        boms: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.BOMWhereInput = {
      isTrash: filters.status === "trash" ? true : false,
    };

    if (filters.status && filters.status !== "trash" && filters.status !== "all") {
      where.status = filters.status;
    }

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { item: { name: { contains: filters.search, mode: "insensitive" } } },
        { item: { code: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Get total count
    const total = await prisma.bOM.count({ where });

    // Get BOMs
    const boms = await prisma.bOM.findMany({
      where,
      skip,
      take: limit,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    // Convert Decimal to number for client components
    const serializedBOMs = boms.map((bom) => ({
      ...bom,
      quantityPerUnit: Number(bom.quantityPerUnit),
    }));

    return {
      success: true,
      boms: serializedBOMs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getBOMs error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch BOMs",
      boms: [],
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
 * Get single BOM by ID with all BOMItems
 */
export async function getBOMById(bomId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        bom: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "production.boms", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view BOMs",
        bom: null,
      };
    }

    const bom = await prisma.bOM.findUnique({
      where: { id: bomId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
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
                name: true,
                code: true,
                unit: {
                  select: {
                    symbol: true,
                  },
                },
                costPrice: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!bom) {
      return {
        success: false,
        error: "BOM not found",
        bom: null,
      };
    }

    // Convert Decimal to number for client components
    const serializedBOM = {
      ...bom,
      quantityPerUnit: Number(bom.quantityPerUnit),
      items: bom.items.map((item) => ({
        ...item,
        quantityRequired: Number(item.quantityRequired),
        item: {
          ...item.item,
          costPrice: item.item.costPrice ? Number(item.item.costPrice) : 0,
        },
      })),
    };

    return {
      success: true,
      bom: serializedBOM,
    };
  } catch (error) {
    console.error("getBOMById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch BOM",
      bom: null,
    };
  }
}

/**
 * Get active BOM for a finished good item (for Production module)
 */
export async function getBOMForProduction(itemId: string) {
  try {
    const bom = await prisma.bOM.findFirst({
      where: {
        itemId,
        status: "active",
        isTrash: false,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            code: true,
            unit: {
              select: {
                symbol: true,
              },
            },
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: {
                  select: {
                    symbol: true,
                  },
                },
                costPrice: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!bom) {
      return {
        success: false,
        error: "No active BOM found for this item",
        bom: null,
      };
    }

    // Convert Decimal to number
    const serializedBOM = {
      ...bom,
      quantityPerUnit: Number(bom.quantityPerUnit),
      items: bom.items.map((item) => ({
        ...item,
        quantityRequired: Number(item.quantityRequired),
        item: {
          ...item.item,
          costPrice: item.item.costPrice ? Number(item.item.costPrice) : 0,
        },
      })),
    };

    return {
      success: true,
      bom: serializedBOM,
    };
  } catch (error) {
    console.error("getBOMForProduction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch BOM",
      bom: null,
    };
  }
}

/**
 * Create a new BOM with BOMItems
 */
export async function createBOM(input: {
  name: string;
  description?: string;
  itemId: string;
  quantityPerUnit: number;
  status?: "active" | "inactive";
  items: Array<{
    itemId: string;
    quantityRequired: number;
  }>;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        bom: null,
      };
    }

    // Permission check
    const canCreate = await hasPermission(session.user.id, "production.boms", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create BOMs",
        bom: null,
      };
    }

    // Validate: itemId must be READY_PRODUCT
    const finishedGood = await prisma.item.findUnique({
      where: { id: input.itemId },
      select: { id: true, itemType: true, name: true },
    });

    if (!finishedGood) {
      return {
        success: false,
        error: "Finished good item not found",
        bom: null,
      };
    }

    if (finishedGood.itemType !== ItemType.READY_PRODUCT) {
      return {
        success: false,
        error: "Item must be a Ready Product",
        bom: null,
      };
    }

    // Validate: quantityPerUnit > 0
    if (input.quantityPerUnit <= 0) {
      return {
        success: false,
        error: "Quantity per unit must be greater than 0",
        bom: null,
      };
    }

    // Validate: At least one BOMItem
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        error: "At least one raw material item is required",
        bom: null,
      };
    }

    // Validate: All BOMItems must be RAW_MATERIAL and quantities > 0
    const rawMaterialIds = input.items.map((item) => item.itemId);
    const rawMaterials = await prisma.item.findMany({
      where: {
        id: { in: rawMaterialIds },
      },
      select: { id: true, itemType: true, name: true },
    });

    for (const rm of rawMaterials) {
      if (rm.itemType !== ItemType.RAW_MATERIAL) {
        return {
          success: false,
          error: `Item "${rm.name}" must be a Raw Material`,
          bom: null,
        };
      }
    }

    // Validate: No duplicate raw materials
    const uniqueItemIds = new Set(rawMaterialIds);
    if (uniqueItemIds.size !== rawMaterialIds.length) {
      return {
        success: false,
        error: "Duplicate raw materials are not allowed",
        bom: null,
      };
    }

    // Validate: All quantities > 0
    for (const item of input.items) {
      if (item.quantityRequired <= 0) {
        return {
          success: false,
          error: "All quantities must be greater than 0",
          bom: null,
        };
      }
    }

    // Generate code
    const code = await generateBOMCode();

    // Create BOM with BOMItems in transaction
    const bom = await prisma.$transaction(async (tx) => {
      const newBOM = await tx.bOM.create({
        data: {
          code,
          name: input.name,
          description: input.description || null,
          itemId: input.itemId,
          quantityPerUnit: input.quantityPerUnit,
          status: input.status || "active",
          isTrash: false,
          createdBy: session.user.id,
          items: {
            create: input.items.map((item) => ({
              itemId: item.itemId,
              quantityRequired: item.quantityRequired,
            })),
          },
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: {
                select: {
                  symbol: true,
                },
              },
            },
          },
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
                  name: true,
                  code: true,
                  unit: {
                    select: {
                      symbol: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return newBOM;
    });

    // Log activity
    await logItemCreated(
      session.user.id,
      "BOM",
      bom.id,
      bom.name,
      {
        code: bom.code,
        itemName: finishedGood.name,
        itemsCount: input.items.length,
      }
    );

    // Send notification
    await notifyItemCreated(session.user.id, "BOM", bom.name);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/boms");

    // Convert Decimal to number
    const serializedBOM = {
      ...bom,
      quantityPerUnit: Number(bom.quantityPerUnit),
      items: bom.items.map((item) => ({
        ...item,
        quantityRequired: Number(item.quantityRequired),
      })),
    };

    return {
      success: true,
      bom: serializedBOM,
    };
  } catch (error) {
    console.error("createBOM error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create BOM",
      bom: null,
    };
  }
}

/**
 * Update BOM and replace BOMItems
 */
export async function updateBOM(input: {
  id: string;
  name: string;
  description?: string;
  itemId: string;
  quantityPerUnit: number;
  status?: "active" | "inactive";
  items: Array<{
    itemId: string;
    quantityRequired: number;
  }>;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        bom: null,
      };
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "production.boms", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit BOMs",
        bom: null,
      };
    }

    // Check if BOM exists
    const existingBOM = await prisma.bOM.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, code: true },
    });

    if (!existingBOM) {
      return {
        success: false,
        error: "BOM not found",
        bom: null,
      };
    }

    // Validate: itemId must be READY_PRODUCT
    const finishedGood = await prisma.item.findUnique({
      where: { id: input.itemId },
      select: { id: true, itemType: true, name: true },
    });

    if (!finishedGood) {
      return {
        success: false,
        error: "Finished good item not found",
        bom: null,
      };
    }

    if (finishedGood.itemType !== ItemType.READY_PRODUCT) {
      return {
        success: false,
        error: "Item must be a Ready Product",
        bom: null,
      };
    }

    // Validate: quantityPerUnit > 0
    if (input.quantityPerUnit <= 0) {
      return {
        success: false,
        error: "Quantity per unit must be greater than 0",
        bom: null,
      };
    }

    // Validate: At least one BOMItem
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        error: "At least one raw material item is required",
        bom: null,
      };
    }

    // Validate: All BOMItems must be RAW_MATERIAL
    const rawMaterialIds = input.items.map((item) => item.itemId);
    const rawMaterials = await prisma.item.findMany({
      where: {
        id: { in: rawMaterialIds },
      },
      select: { id: true, itemType: true, name: true },
    });

    for (const rm of rawMaterials) {
      if (rm.itemType !== ItemType.RAW_MATERIAL) {
        return {
          success: false,
          error: `Item "${rm.name}" must be a Raw Material`,
          bom: null,
        };
      }
    }

    // Validate: No duplicate raw materials
    const uniqueItemIds = new Set(rawMaterialIds);
    if (uniqueItemIds.size !== rawMaterialIds.length) {
      return {
        success: false,
        error: "Duplicate raw materials are not allowed",
        bom: null,
      };
    }

    // Validate: All quantities > 0
    for (const item of input.items) {
      if (item.quantityRequired <= 0) {
        return {
          success: false,
          error: "All quantities must be greater than 0",
          bom: null,
        };
      }
    }

    // Update BOM and replace BOMItems in transaction
    const bom = await prisma.$transaction(async (tx) => {
      // Delete existing BOMItems
      await tx.bOMItem.deleteMany({
        where: { bomId: input.id },
      });

      // Update BOM and create new BOMItems
      const updatedBOM = await tx.bOM.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description || null,
          itemId: input.itemId,
          quantityPerUnit: input.quantityPerUnit,
          status: input.status || "active",
          items: {
            create: input.items.map((item) => ({
              itemId: item.itemId,
              quantityRequired: item.quantityRequired,
            })),
          },
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: {
                select: {
                  symbol: true,
                },
              },
            },
          },
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
                  name: true,
                  code: true,
                  unit: {
                    select: {
                      symbol: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updatedBOM;
    });

    // Log activity
    await logItemUpdated(
      session.user.id,
      "BOM",
      bom.id,
      ["name", "description", "itemId", "quantityPerUnit", "items"],
      bom.name,
      {
        code: bom.code,
        itemName: finishedGood.name,
        itemsCount: input.items.length,
      }
    );

    // Send notification
    await notifyItemUpdated(session.user.id, "BOM", bom.name);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/boms");

    // Convert Decimal to number
    const serializedBOM = {
      ...bom,
      quantityPerUnit: Number(bom.quantityPerUnit),
      items: bom.items.map((item) => ({
        ...item,
        quantityRequired: Number(item.quantityRequired),
      })),
    };

    return {
      success: true,
      bom: serializedBOM,
    };
  } catch (error) {
    console.error("updateBOM error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update BOM",
      bom: null,
    };
  }
}

/**
 * Soft delete BOM (move to trash)
 */
export async function deleteBOM(bomId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Permission check
    const canDelete = await hasPermission(session.user.id, "production.boms", "move-to-trash");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete BOMs",
      };
    }

    const bom = await prisma.bOM.findUnique({
      where: { id: bomId },
      select: { id: true, name: true, code: true },
    });

    if (!bom) {
      return { success: false, error: "BOM not found" };
    }

    await prisma.bOM.update({
      where: { id: bomId },
      data: {
        isTrash: true,
        status: "trash",
      },
    });

    // Log activity
    await logItemDeleted(
      session.user.id,
      "BOM",
      bom.id,
      bom.name,
      {
        code: bom.code,
      }
    );

    // Send notification
    await notifyItemDeleted(session.user.id, "BOM", bom.name);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/boms");

    return { success: true };
  } catch (error) {
    console.error("deleteBOM error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete BOM",
    };
  }
}

/**
 * Permanently delete BOM
 */
export async function deleteBOMPermanently(bomId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Permission check
    const canDelete = await hasPermission(session.user.id, "production.boms", "delete-permanently");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to permanently delete BOMs",
      };
    }

    const bom = await prisma.bOM.findUnique({
      where: { id: bomId },
      select: { id: true, name: true, code: true },
    });

    if (!bom) {
      return { success: false, error: "BOM not found" };
    }

    // Delete BOMItems first (cascade should handle this, but explicit for safety)
    await prisma.$transaction(async (tx) => {
      await tx.bOMItem.deleteMany({
        where: { bomId },
      });

      await tx.bOM.delete({
        where: { id: bomId },
      });
    });

    // Log activity
    await logItemDeleted(
      session.user.id,
      "BOM",
      bom.id,
      bom.name,
      {
        code: bom.code,
        permanent: true,
      }
    );

    // Send notification
    await notifyItemDeleted(session.user.id, "BOM", bom.name);

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/boms");

    return { success: true };
  } catch (error) {
    console.error("deleteBOMPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to permanently delete BOM",
    };
  }
}

/**
 * Bulk update BOM status
 */
export async function bulkUpdateBOMStatus(
  bomIds: string[],
  status: "active" | "inactive" | "trash" | "restore"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (bomIds.length === 0) {
      return { success: false, error: "No BOMs selected" };
    }

    if (status === "trash") {
      const canDelete = await hasPermission(session.user.id, "production.boms", "move-to-trash");
      if (!canDelete) {
        return {
          success: false,
          error: "You do not have permission to move BOMs to trash",
        };
      }

      await prisma.bOM.updateMany({
        where: { id: { in: bomIds } },
        data: { isTrash: true, status: "trash" },
      });
    } else if (status === "restore") {
      const canEdit = await hasPermission(session.user.id, "production.boms", "edit");
      if (!canEdit) {
        return {
          success: false,
          error: "You do not have permission to restore BOMs",
        };
      }

      await prisma.bOM.updateMany({
        where: { id: { in: bomIds } },
        data: { isTrash: false, status: "active" },
      });
    } else {
      const canEdit = await hasPermission(session.user.id, "production.boms", "edit");
      if (!canEdit) {
        return {
          success: false,
          error: "You do not have permission to update BOM status",
        };
      }

      await prisma.bOM.updateMany({
        where: { id: { in: bomIds } },
        data: { status, isTrash: false },
      });
    }

    // Revalidate paths
    await revalidateBothPaths("/dashboard/production/boms");

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateBOMStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update BOM status",
    };
  }
}
