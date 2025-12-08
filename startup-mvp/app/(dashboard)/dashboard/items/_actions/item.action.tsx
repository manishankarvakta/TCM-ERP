"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

/**
 * Get paginated list of items with search
 */
export async function getItems(
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
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause for search and status
    const where: Prisma.ItemWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { categories: { some: { category: { name: { contains: search, mode: "insensitive" } } } } },
      ];
    }

    // Filter by status
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.status = { not: "trash" };
    }

    // Get total count
    const total = await prisma.item.count({ where });

    // Get items
    const items = await prisma.item.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        description: true,
        unitId: true,
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        unitPrice: true,
        costPrice: true,
        categories: {
          select: {
            id: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal to number for serialization
    const serializedItems = items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      items: serializedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getItems error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items",
      items: [],
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
 * Get item by ID
 */
export async function getItemById(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        item: null,
      };
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        code: true,
        description: true,
        unitId: true,
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        unitPrice: true,
        costPrice: true,
        categories: {
          select: {
            id: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      return {
        success: false,
        error: "Item not found",
        item: null,
      };
    }

    return {
      success: true,
      item,
    };
  } catch (error) {
    console.error("getItemById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch item",
      item: null,
    };
  }
}

/**
 * Get all active units for dropdown
 */
export async function getActiveUnits() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        units: [],
      };
    }

    const units = await prisma.unit.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        symbol: true,
        details: true,
      },
      orderBy: {
        symbol: "asc",
      },
    });

    return {
      success: true,
      units,
    };
  } catch (error) {
    console.error("getActiveUnits error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch units",
      units: [],
    };
  }
}

/**
 * Get all active categories for dropdown
 */
export async function getActiveCategories() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        categories: [],
      };
    }

    const categories = await prisma.category.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      categories,
    };
  } catch (error) {
    console.error("getActiveCategories error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch categories",
      categories: [],
    };
  }
}

/**
 * Get all active items for dropdown selection
 */
export async function getActiveItems() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        items: [],
      };
    }

    const items = await prisma.item.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        code: true,
        description: true,
        unitPrice: true,
        costPrice: true,
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    // Convert Decimal to number for serialization
    const serializedItems = items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
    }));

    return {
      success: true,
      items: serializedItems,
    };
  } catch (error) {
    console.error("getActiveItems error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items",
      items: [],
    };
  }
}

/**
 * Create a new item
 */
export async function createItem(input: {
  code: string;
  description: string;
  unitId: string;
  unitPrice: number;
  costPrice: number;
  categoryIds?: string[];
  image?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        item: null,
      };
    }

    // Check if code already exists
    const existingItem = await prisma.item.findUnique({
      where: { code: input.code },
    });

    if (existingItem) {
      return {
        success: false,
        error: "Item with this code already exists",
        item: null,
      };
    }

    // Create item with categories
    const item = await prisma.item.create({
      data: {
        code: input.code,
        description: input.description,
        unitId: input.unitId,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        costPrice: new Prisma.Decimal(input.costPrice),
        image: input.image || null,
        status: input.status || "active",
        categories: input.categoryIds && input.categoryIds.length > 0
          ? {
              create: input.categoryIds.map((categoryId) => ({
                categoryId,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        code: true,
        description: true,
        unitId: true,
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        unitPrice: true,
        costPrice: true,
        categories: {
          select: {
            id: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        image: true,
        status: true,
        createdAt: true,
      },
    });

    // Convert Decimal to number for serialization
    const serializedItem = {
      ...item,
      unitPrice: Number(item.unitPrice),
    };

    // Log item creation
    await logItemCreated(
      session.user.id,
      "Item",
      item.id,
      `${item.code} - ${item.description}`,
      { code: item.code, description: item.description, unitPrice: item.unitPrice.toString() }
    );

    // Revalidate items page
    revalidatePath("/dashboard/items");

    return {
      success: true,
      item: serializedItem,
    };
  } catch (error) {
    console.error("createItem error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create item",
      item: null,
    };
  }
}

/**
 * Update an item
 */
export async function updateItem(input: {
  id: string;
  code: string;
  description: string;
  unitId: string;
  unitPrice: number;
  costPrice: number;
  categoryIds?: string[];
  image?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        item: null,
      };
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: input.id },
      select: { 
        id: true, 
        code: true, 
        description: true, 
        unitId: true, 
        unitPrice: true, 
        image: true, 
        status: true,
        categories: {
          select: {
            categoryId: true,
          },
        },
      },
    });

    if (!existingItem) {
      return {
        success: false,
        error: "Item not found",
        item: null,
      };
    }
    
    // Check if code is being changed and if it's already taken
    if (input.code !== existingItem.code) {
      const codeTaken = await prisma.item.findUnique({
        where: { code: input.code },
      });

      if (codeTaken) {
        return {
          success: false,
          error: "Item code is already taken by another item",
          item: null,
        };
      }
    }

    // Prepare update data
    const updateData: {
      code: string;
      description: string;
      unitId: string;
      unitPrice: Prisma.Decimal;
      costPrice: Prisma.Decimal;
      image?: string | null;
      status?: string;
      categories?: {
        deleteMany: {};
        create?: { categoryId: string }[];
      };
    } = {
      code: input.code,
      description: input.description,
      unitId: input.unitId,
      unitPrice: new Prisma.Decimal(input.unitPrice),
      costPrice: new Prisma.Decimal(input.costPrice),
    };

    if (input.image !== undefined) {
      updateData.image = input.image || null;
    }

    if (input.status) {
      updateData.status = input.status;
    }

    // Handle categories: delete all existing and create new ones
    if (input.categoryIds !== undefined) {
      updateData.categories = {
        deleteMany: {},
        create: input.categoryIds.map((categoryId) => ({
          categoryId,
        })),
      };
    }

    // Update item
    const item = await prisma.item.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        code: true,
        description: true,
        unitId: true,
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        unitPrice: true,
        costPrice: true,
        categories: {
          select: {
            id: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Convert Decimal to number for serialization
    const serializedItem = {
      ...item,
      unitPrice: Number(item.unitPrice),
    };

    // Log item update - track what actually changed
    const changes: string[] = [];
    if (input.code !== existingItem.code) changes.push("code");
    if (input.description !== existingItem.description) changes.push("description");
    if (input.unitId !== existingItem.unitId) changes.push("unitId");
    if (input.unitPrice !== Number(existingItem.unitPrice)) changes.push("unitPrice");
    
    // Check if categories changed
    if (input.categoryIds !== undefined) {
      const existingCategoryIds = existingItem.categories.map(c => c.categoryId).sort();
      const newCategoryIds = [...input.categoryIds].sort();
      if (JSON.stringify(existingCategoryIds) !== JSON.stringify(newCategoryIds)) {
        changes.push("categories");
      }
    }
    
    if (input.image !== undefined && input.image !== existingItem.image) changes.push("image");
    if (input.status && input.status !== existingItem.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Item",
      item.id,
      changes,
      `${item.code} - ${item.description}`,
      { code: item.code, description: item.description, unitPrice: item.unitPrice.toString(), changes }
    );

    // Revalidate items page
    revalidatePath("/dashboard/items");
    revalidatePath(`/dashboard/items/${item.id}`);
    revalidatePath(`/dashboard/items/details?id=${item.id}`);

    return {
      success: true,
      item: serializedItem,
    };
  } catch (error) {
    console.error("updateItem error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update item",
      item: null,
    };
  }
}

/**
 * Delete an item (moves to trash)
 */
export async function deleteItem(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get item info before moving to trash for logging
    const itemToDelete = await prisma.item.findUnique({
      where: { id: itemId },
      select: { code: true, description: true },
    });

    if (!itemToDelete) {
      return {
        success: false,
        error: "Item not found",
      };
    }

    // Move item to trash (soft delete)
    await prisma.item.update({
      where: { id: itemId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Item",
      itemId,
      `${itemToDelete.code} - ${itemToDelete.description}`,
      { code: itemToDelete.code, description: itemToDelete.description }
    );

    // Revalidate items page
    revalidatePath("/dashboard/items");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteItem error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}

/**
 * Bulk update item status
 */
export async function bulkUpdateItemStatus(
  itemIds: string[],
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

    if (itemIds.length === 0) {
      return {
        success: false,
        error: "No items selected",
      };
    }

    // Update items
    await prisma.item.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: {
        status,
      },
    });

    // Revalidate items page
    revalidatePath("/dashboard/items");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateItemStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update items",
    };
  }
}

/**
 * Delete items permanently
 */
export async function deleteItemsPermanently(itemIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (itemIds.length === 0) {
      return {
        success: false,
        error: "No items selected",
      };
    }

    // Delete items permanently
    await prisma.item.deleteMany({
      where: {
        id: { in: itemIds },
        status: "trash", // Only allow deleting items that are in trash
      },
    });

    // Revalidate items page
    revalidatePath("/dashboard/items");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteItemsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete items",
    };
  }
}

