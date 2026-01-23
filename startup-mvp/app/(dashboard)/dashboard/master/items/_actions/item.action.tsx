"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, ItemType } from "@prisma/client";

/**
 * Generate unique item code based on item type
 */
async function generateItemCode(itemType: ItemType): Promise<string> {
  const prefix = {
    RAW_MATERIAL: "RM",
    FINISHED_GOOD: "FG",
    RETAIL: "RT",
  }[itemType];
  
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  
  // Find last code with this pattern
  const lastItem = await prisma.item.findFirst({
    where: { 
      code: { startsWith: pattern },
      isTrash: false,
    },
    orderBy: { code: "desc" },
  });
  
  let sequence = 1;
  if (lastItem) {
    const parts = lastItem.code.split("-");
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2] || "0");
      sequence = lastSeq + 1;
    }
  }
  
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Get active categories for dropdown
 */
export async function getActiveCategories() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", categories: [] };
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
 * Get active units for dropdown
 */
export async function getActiveUnits() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", units: [] };
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
 * Get paginated list of items with search
 */
export async function getItems(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  itemType?: ItemType
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

    // Permission check
    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view items",
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
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status === "trash") {
      where.isTrash = true;
      where.status = "trash";
    } else if (status === "active") {
      where.isTrash = false;
      where.status = "active";
    } else if (status === "inactive") {
      where.isTrash = false;
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.isTrash = false;
    }

    // Filter by item type
    if (itemType) {
      where.itemType = itemType;
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
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        trackInventory: true,
        image: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      items,
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

    // Permission check
    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view items",
        item: null,
      };
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        trackInventory: true,
        image: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
 * Get stock information for an item
 * Calculates stock from purchase items (simplified - until proper inventory system is implemented)
 */
export async function getItemStock(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        stock: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view items",
        stock: null,
      };
    }

    // Check if item exists and has inventory tracking enabled
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        trackInventory: true,
      },
    });

    if (!item) {
      return {
        success: false,
        error: "Item not found",
        stock: null,
      };
    }

    // If inventory tracking is disabled, return null
    if (!item.trackInventory) {
      return {
        success: true,
        stock: {
          quantity: null,
          totalValue: null,
          lastUpdated: null,
          message: "Inventory tracking is disabled for this item",
        },
      };
    }

    // Calculate stock from purchase items where purchase status is RECEIVED
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: {
        itemId: itemId,
        purchase: {
          status: "RECEIVED", // Only count received purchases
        },
      },
      select: {
        quantity: true,
        unitPrice: true,
        purchase: {
          select: {
            date: true,
          },
        },
      },
    });

    // Calculate total quantity and value
    let totalQuantity = 0;
    let totalValue = 0;
    let lastPurchaseDate: Date | null = null;

    for (const purchaseItem of purchaseItems) {
      const qty = Number(purchaseItem.quantity);
      const price = Number(purchaseItem.unitPrice);
      totalQuantity += qty;
      totalValue += qty * price;
      
      if (purchaseItem.purchase.date) {
        if (!lastPurchaseDate || purchaseItem.purchase.date > lastPurchaseDate) {
          lastPurchaseDate = purchaseItem.purchase.date;
        }
      }
    }

    // Calculate average cost
    const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    return {
      success: true,
      stock: {
        quantity: totalQuantity,
        averageCost,
        totalValue,
        lastUpdated: lastPurchaseDate,
        message: null,
      },
    };
  } catch (error) {
    console.error("getItemStock error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock",
      stock: null,
    };
  }
}

/**
 * Create a new item
 */
export async function createItem(input: {
  name: string;
  description?: string;
  itemType: ItemType;
  categoryId?: string | null;
  unitId: string;
  costPrice: number;
  salesPrice?: number | null;
  trackInventory?: boolean;
  image?: string | null;
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

    // Permission check
    const canCreate = await hasPermission(session.user.id, "master.items", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create items",
        item: null,
      };
    }

    // Validate: salesPrice required if itemType = FINISHED_GOOD or RETAIL
    if ((input.itemType === "FINISHED_GOOD" || input.itemType === "RETAIL") && (!input.salesPrice || input.salesPrice <= 0)) {
      return {
        success: false,
        error: "Sales price is required for Finished Goods and Retail items",
        item: null,
      };
    }

    // Validate: categoryId exists (if provided)
    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        return {
          success: false,
          error: "Category not found",
          item: null,
        };
      }
    }

    // Validate: unitId exists
    const unit = await prisma.unit.findUnique({
      where: { id: input.unitId },
    });
    if (!unit) {
      return {
        success: false,
        error: "Unit not found",
        item: null,
      };
    }

    // Generate code
    const code = await generateItemCode(input.itemType);

    // Create item
    const item = await prisma.item.create({
      data: {
        code,
        name: input.name,
        description: input.description || null,
        itemType: input.itemType,
        categoryId: input.categoryId || null,
        unitId: input.unitId,
        costPrice: input.costPrice,
        salesPrice: input.salesPrice || null,
        trackInventory: input.trackInventory ?? false,
        image: input.image || null,
        status: input.status || "active",
        isTrash: false,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        trackInventory: true,
        image: true,
        status: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
      },
    });

    // Log item creation
    await logItemCreated(
      session.user.id,
      "Item",
      item.id,
      item.name,
      { 
        code: item.code,
        name: item.name,
        itemType: item.itemType,
        costPrice: Number(item.costPrice),
        salesPrice: item.salesPrice ? Number(item.salesPrice) : null,
      }
    );

    // Notify user
    await notifyItemCreated(
      session.user.id,
      "Item",
      item.name
    );

    // Revalidate items page
    revalidateBothPaths("master/items");

    return {
      success: true,
      item,
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
  name: string;
  description?: string;
  itemType: ItemType;
  categoryId?: string | null;
  unitId: string;
  costPrice: number;
  salesPrice?: number | null;
  trackInventory?: boolean;
  image?: string | null;
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

    // Permission check
    const canEdit = await hasPermission(session.user.id, "master.items", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit items",
        item: null,
      };
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: input.id },
      select: { 
        id: true, 
        name: true, 
        description: true, 
        itemType: true,
        categoryId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        trackInventory: true,
        image: true,
        status: true,
      },
    });

    if (!existingItem) {
      return {
        success: false,
        error: "Item not found",
        item: null,
      };
    }

    // Validate: salesPrice required if itemType = FINISHED_GOOD or RETAIL
    if ((input.itemType === "FINISHED_GOOD" || input.itemType === "RETAIL") && (!input.salesPrice || input.salesPrice <= 0)) {
      return {
        success: false,
        error: "Sales price is required for Finished Goods and Retail items",
        item: null,
      };
    }

    // Validate: categoryId exists (if provided)
    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        return {
          success: false,
          error: "Category not found",
          item: null,
        };
      }
    }

    // Validate: unitId exists
    const unit = await prisma.unit.findUnique({
      where: { id: input.unitId },
    });
    if (!unit) {
      return {
        success: false,
        error: "Unit not found",
        item: null,
      };
    }

    // Prepare update data
    const updateData: Prisma.ItemUpdateInput = {
      name: input.name,
      description: input.description || null,
      itemType: input.itemType,
      categoryId: input.categoryId || null,
      unitId: input.unitId,
      costPrice: input.costPrice,
      salesPrice: input.salesPrice || null,
      trackInventory: input.trackInventory ?? false,
      image: input.image || null,
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update item
    const item = await prisma.item.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        trackInventory: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
      },
    });

    // Log item update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingItem.name) changes.push("name");
    if (input.description !== existingItem.description) changes.push("description");
    if (input.itemType !== existingItem.itemType) changes.push("itemType");
    if (input.categoryId !== existingItem.categoryId) changes.push("categoryId");
    if (input.unitId !== existingItem.unitId) changes.push("unitId");
    if (Number(input.costPrice) !== Number(existingItem.costPrice)) changes.push("costPrice");
    if ((input.salesPrice || null) !== (existingItem.salesPrice || null)) changes.push("salesPrice");
    if ((input.trackInventory ?? false) !== existingItem.trackInventory) changes.push("trackInventory");
    if (input.image !== existingItem.image) changes.push("image");
    if (input.status !== undefined && input.status !== existingItem.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Item",
      item.id,
      changes,
      item.name,
      { 
        code: item.code,
        name: item.name,
        itemType: item.itemType,
        changes,
      }
    );

    // Notify user
    await notifyItemUpdated(
      session.user.id,
      "Item",
      item.name,
      changes
    );

    // Revalidate items pages
    revalidateBothPaths("master/items");
    revalidateBothPaths(`master/items/${item.id}`);
    revalidateBothPaths(`master/items/${item.id}/edit`);

    return {
      success: true,
      item,
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

    // Permission check
    const canDelete = await hasPermission(session.user.id, "master.items", "move-to-trash");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete items",
      };
    }

    // Get item info before moving to trash for logging
    const itemToDelete = await prisma.item.findUnique({
      where: { id: itemId },
      select: { name: true, code: true },
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
      data: { 
        isTrash: true,
        status: "trash",
      },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Item",
      itemId,
      itemToDelete.name,
      { name: itemToDelete.name, code: itemToDelete.code }
    );

    // Notify user
    await notifyItemDeleted(
      session.user.id,
      "Item",
      itemToDelete.name
    );

    // Revalidate items page
    revalidateBothPaths("master/items");

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

    // Permission check
    const canDeletePermanently = await hasPermission(session.user.id, "master.items", "delete-permanently");
    if (!canDeletePermanently) {
      return {
        success: false,
        error: "You do not have permission to permanently delete items",
      };
    }

    if (itemIds.length === 0) {
      return {
        success: false,
        error: "No items selected",
      };
    }

    // Get items for logging
    const itemsToDelete = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        isTrash: true, // Only allow deleting items that are in trash
      },
      select: { id: true, name: true, code: true },
    });

    // Delete items permanently
    await prisma.item.deleteMany({
      where: {
        id: { in: itemIds },
        isTrash: true, // Only allow deleting items that are in trash
      },
    });

    // Log deletions
    for (const item of itemsToDelete) {
      await logItemDeleted(
        session.user.id,
        "Item",
        item.id,
        item.name,
        { name: item.name, code: item.code, permanent: true }
      );
    }

    // Revalidate items page
    revalidateBothPaths("master/items");
    
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

    // Permission check
    const canEdit = await hasPermission(session.user.id, "master.items", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to update items",
      };
    }

    if (itemIds.length === 0) {
      return {
        success: false,
        error: "No items selected",
      };
    }

    // Update items
    const updateData: Prisma.ItemUpdateManyMutationInput = {
      status,
    };

    if (status === "trash") {
      updateData.isTrash = true;
    } else {
      updateData.isTrash = false;
    }

    await prisma.item.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: updateData,
    });

    // Revalidate items page
    revalidateBothPaths("master/items");

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
