"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";

/**
 * Get paginated list of units with search
 */
export async function getUnits(
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
        units: [],
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
    const where: Prisma.UnitWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { symbol: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
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
    const total = await prisma.unit.count({ where });

    // Get units
    const units = await prisma.unit.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        symbol: true,
        details: true,
        status: true,
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
      units,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getUnits error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch units",
      units: [],
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
 * Get unit by ID
 */
export async function getUnitById(unitId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        unit: null,
      };
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!unit) {
      return {
        success: false,
        error: "Unit not found",
        unit: null,
      };
    }

    return {
      success: true,
      unit,
    };
  } catch (error) {
    console.error("getUnitById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch unit",
      unit: null,
    };
  }
}

/**
 * Create a new unit
 */
export async function createUnit(input: {
  symbol: string;
  details: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        unit: null,
      };
    }

    // Check if symbol already exists
    const existingUnit = await prisma.unit.findFirst({
      where: { symbol: { equals: input.symbol, mode: "insensitive" } },
    });

    if (existingUnit) {
      return {
        success: false,
        error: "Unit with this symbol already exists",
        unit: null,
      };
    }

    // Create unit
    const unit = await prisma.unit.create({
      data: {
        symbol: input.symbol,
        details: input.details,
        status: input.status || "active",
        createdBy: session.user.id,
      },
    });

    // Log unit creation
    await logItemCreated(
      session.user.id,
      "Unit",
      unit.id,
      unit.symbol,
      { symbol: unit.symbol, details: unit.details }
    );

    // Revalidate units page
    revalidateBothPaths("master/units");

    return {
      success: true,
      unit,
    };
  } catch (error) {
    console.error("createUnit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create unit",
      unit: null,
    };
  }
}

/**
 * Update a unit
 */
export async function updateUnit(input: {
  id: string;
  symbol: string;
  details: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        unit: null,
      };
    }

    // Check if unit exists
    const existingUnit = await prisma.unit.findUnique({
      where: { id: input.id },
    });

    if (!existingUnit) {
      return {
        success: false,
        error: "Unit not found",
        unit: null,
      };
    }
    
    // Check if symbol is being changed and if it's already taken
    if (input.symbol !== existingUnit.symbol) {
      const symbolTaken = await prisma.unit.findFirst({
        where: { 
          symbol: { equals: input.symbol, mode: "insensitive" },
          id: { not: input.id },
        },
      });

      if (symbolTaken) {
        return {
          success: false,
          error: "Unit symbol is already taken by another unit",
          unit: null,
        };
      }
    }

    // Update unit
    const unit = await prisma.unit.update({
      where: { id: input.id },
      data: {
        symbol: input.symbol,
        details: input.details,
        status: input.status || "active",
      },
    });

    // Log unit update
    const changes: string[] = [];
    if (input.symbol !== existingUnit.symbol) changes.push("symbol");
    if (input.details !== existingUnit.details) changes.push("details");
    if (input.status !== undefined && input.status !== existingUnit.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Unit",
      unit.id,
      changes,
      unit.symbol,
      { symbol: unit.symbol, details: unit.details, changes }
    );

    // Revalidate units page
    revalidateBothPaths("master/units");
    revalidateBothPaths(`master/units/${unit.id}`);
    revalidateBothPaths(`master/units/details?id=${unit.id}`);

    return {
      success: true,
      unit,
    };
  } catch (error) {
    console.error("updateUnit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update unit",
      unit: null,
    };
  }
}

/**
 * Delete a unit (moves to trash)
 */
export async function deleteUnit(unitId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get unit info before moving to trash for logging
    const unitToDelete = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { symbol: true },
    });

    if (!unitToDelete) {
      return {
        success: false,
        error: "Unit not found",
      };
    }

    // Move unit to trash (soft delete)
    await prisma.unit.update({
      where: { id: unitId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Unit",
      unitId,
      unitToDelete.symbol,
      { symbol: unitToDelete.symbol }
    );

    // Revalidate units page
    revalidateBothPaths("master/units");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteUnit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete unit",
    };
  }
}

/**
 * Bulk update unit status
 */
export async function bulkUpdateUnitStatus(
  unitIds: string[],
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

    if (unitIds.length === 0) {
      return {
        success: false,
        error: "No units selected",
      };
    }

    // Update units
    await prisma.unit.updateMany({
      where: {
        id: { in: unitIds },
      },
      data: {
        status,
      },
    });

    // Revalidate units page
    revalidateBothPaths("master/units");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateUnitStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update units",
    };
  }
}

/**
 * Delete units permanently
 */
export async function deleteUnitsPermanently(unitIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (unitIds.length === 0) {
      return {
        success: false,
        error: "No units selected",
      };
    }

    // Check if any units are used by items
    const unitsWithItems = await prisma.unit.findMany({
      where: {
        id: { in: unitIds },
        status: "trash",
        items: { some: {} }
      },
      select: { symbol: true }
    });

    if (unitsWithItems.length > 0) {
      const symbols = unitsWithItems.map(u => u.symbol).join(", ");
      return {
        success: false,
        error: `Cannot permanently delete units that are in use by items: ${symbols}`,
      };
    }

    // Delete units permanently
    await prisma.unit.deleteMany({
      where: {
        id: { in: unitIds },
        status: "trash", // Only allow deleting units that are in trash
      },
    });

    // Revalidate units page
    revalidateBothPaths("master/units");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteUnitsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete units",
    };
  }
}
