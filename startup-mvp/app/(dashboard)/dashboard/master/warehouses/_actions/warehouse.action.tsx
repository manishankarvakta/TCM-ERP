"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";

/**
 * Generate unique warehouse code
 * Format: WH-{YEAR}-{SEQUENCE} (e.g., WH-2026-0001)
 */
async function generateWarehouseCode(): Promise<string> {
  const prefix = "WH";
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  
  // Find last code with this pattern
  const lastWarehouse = await prisma.warehouse.findFirst({
    where: { 
      code: { startsWith: pattern },
    },
    orderBy: { code: "desc" },
  });
  
  let sequence = 1;
  if (lastWarehouse) {
    const parts = lastWarehouse.code.split("-");
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2] || "0");
      sequence = lastSeq + 1;
    }
  }
  
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Get paginated list of warehouses with search
 */
export async function getWarehouses(
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
        warehouses: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.warehouses", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view warehouses",
        warehouses: [],
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
    const where: Prisma.WarehouseWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
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

    // Get total count
    const total = await prisma.warehouse.count({ where });

    // Get warehouses
    const warehouses = await prisma.warehouse.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
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
      warehouses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getWarehouses error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouses",
      warehouses: [],
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
 * Get warehouse by ID
 */
export async function getWarehouseById(warehouseId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        warehouse: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.warehouses", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view warehouses",
        warehouse: null,
      };
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!warehouse) {
      return {
        success: false,
        error: "Warehouse not found",
        warehouse: null,
      };
    }

    return {
      success: true,
      warehouse,
    };
  } catch (error) {
    console.error("getWarehouseById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouse",
      warehouse: null,
    };
  }
}

/**
 * Create a new warehouse
 */
export async function createWarehouse(input: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        warehouse: null,
      };
    }

    // Permission check
    const canCreate = await hasPermission(session.user.id, "master.warehouses", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create warehouses",
        warehouse: null,
      };
    }

    // Generate code
    const code = await generateWarehouseCode();

    // Create warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name: input.name,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        country: input.country || null,
        status: input.status || "active",
        isTrash: false,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await logItemCreated(session.user.id, "Warehouse", warehouse.id, warehouse.name);

    // Send notification
    await notifyItemCreated(session.user.id, "Warehouse", warehouse.name);

    // Revalidate cache
    await revalidateBothPaths("/dashboard/master/warehouses");

    return {
      success: true,
      warehouse,
    };
  } catch (error) {
    console.error("createWarehouse error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create warehouse",
      warehouse: null,
    };
  }
}

/**
 * Update an existing warehouse
 */
export async function updateWarehouse(input: {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        warehouse: null,
      };
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "master.warehouses", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit warehouses",
        warehouse: null,
      };
    }

    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id: input.id },
    });

    if (!existingWarehouse) {
      return {
        success: false,
        error: "Warehouse not found",
        warehouse: null,
      };
    }

    // Update warehouse
    const warehouse = await prisma.warehouse.update({
      where: { id: input.id },
      data: {
        name: input.name,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        country: input.country || null,
        status: input.status || existingWarehouse.status,
      },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await logItemUpdated(session.user.id, "Warehouse", warehouse.id, undefined, warehouse.name);

    // Send notification
    await notifyItemUpdated(session.user.id, "Warehouse", warehouse.name);

    // Revalidate cache
    await revalidateBothPaths("/dashboard/master/warehouses");

    return {
      success: true,
      warehouse,
    };
  } catch (error) {
    console.error("updateWarehouse error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update warehouse",
      warehouse: null,
    };
  }
}

/**
 * Delete a warehouse (soft delete)
 */
export async function deleteWarehouse(warehouseId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canDelete = await hasPermission(session.user.id, "master.warehouses", "move-to-trash");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete warehouses",
      };
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!warehouse) {
      return {
        success: false,
        error: "Warehouse not found",
      };
    }

    // Soft delete
    await prisma.warehouse.update({
      where: { id: warehouseId },
      data: {
        isTrash: true,
        status: "trash",
      },
    });

    // Log activity
    await logItemDeleted(session.user.id, "Warehouse", warehouse.id, warehouse.name);

    // Send notification
    await notifyItemDeleted(session.user.id, "Warehouse", warehouse.name);

    // Revalidate cache
    await revalidateBothPaths("/dashboard/master/warehouses");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteWarehouse error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete warehouse",
    };
  }
}

/**
 * Permanently delete warehouses
 */
export async function deleteWarehousesPermanently(warehouseIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canDelete = await hasPermission(session.user.id, "master.warehouses", "delete-permanently");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to permanently delete warehouses",
      };
    }

    if (warehouseIds.length === 0) {
      return {
        success: false,
        error: "No warehouses selected",
      };
    }

    // Check if any warehouses have stock > 0
    const warehousesWithStock = await prisma.warehouse.findMany({
      where: {
        id: { in: warehouseIds },
        stocks: { some: { quantity: { gt: 0 } } }
      },
      select: { name: true }
    });

    if (warehousesWithStock.length > 0) {
      const names = warehousesWithStock.map(w => w.name).join(", ");
      return {
        success: false,
        error: `Cannot permanently delete warehouses with existing stock: ${names}`,
      };
    }

    // Permanently delete
    await prisma.warehouse.deleteMany({
      where: {
        id: { in: warehouseIds },
        isTrash: true, // Only allow deleting warehouses that are in trash
      },
    });

    // Revalidate cache
    await revalidateBothPaths("/dashboard/master/warehouses");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteWarehousesPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to permanently delete warehouses",
    };
  }
}

/**
 * Bulk update warehouse status
 */
export async function bulkUpdateWarehouseStatus(
  warehouseIds: string[],
  status: "active" | "inactive"
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
    const canEdit = await hasPermission(session.user.id, "master.warehouses", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to update warehouses",
      };
    }

    // Update status
    await prisma.warehouse.updateMany({
      where: {
        id: { in: warehouseIds },
        isTrash: false, // Only update non-trash warehouses
      },
      data: {
        status,
      },
    });

    // Revalidate cache
    await revalidateBothPaths("/dashboard/master/warehouses");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateWarehouseStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update warehouse status",
    };
  }
}

/**
 * Get active warehouses for dropdown selection
 */
export async function getActiveWarehouses() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        warehouses: [],
      };
    }

    const warehouses = await prisma.warehouse.findMany({
      where: {
        status: "active",
        isTrash: false,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      warehouses,
    };
  } catch (error) {
    console.error("getActiveWarehouses error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouses",
      warehouses: [],
    };
  }
}

/**
 * Restore trashed warehouses
 */
export async function restoreWarehouses(warehouseIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "master.warehouses", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to restore warehouses",
      };
    }

    if (warehouseIds.length === 0) {
      return {
        success: false,
        error: "No warehouses selected",
      };
    }

    // Update status and remove from trash
    await prisma.warehouse.updateMany({
      where: {
        id: { in: warehouseIds },
        isTrash: true, // Only restore trashed warehouses
      },
      data: {
        status: "active",
        isTrash: false,
      },
    });

    // Revalidate cache
    await revalidateBothPaths("/dashboard/master/warehouses");

    return {
      success: true,
    };
  } catch (error) {
    console.error("restoreWarehouses error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore warehouses",
    };
  }
}
