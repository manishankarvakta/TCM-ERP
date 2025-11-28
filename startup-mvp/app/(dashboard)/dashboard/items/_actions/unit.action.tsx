"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidatePath } from "next/cache";
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
        { details: { contains: search, mode: "insensitive" } },
        { symbol: { contains: search, mode: "insensitive" } },
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
        details: true,
        symbol: true,
        status: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
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
      select: {
        id: true,
        details: true,
        symbol: true,
        status: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
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
  details: string;
  symbol: string;
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

    // Create unit
    const unit = await prisma.unit.create({
      data: {
        details: input.details,
        symbol: input.symbol,
        status: input.status || "active",
        createdBy: session.user.id,
      },
      select: {
        id: true,
        details: true,
        symbol: true,
        status: true,
        createdBy: true,
        createdAt: true,
      },
    });

    // Log unit creation
    await logItemCreated(
      session.user.id,
      "Unit",
      unit.id,
      `${unit.symbol} - ${unit.details}`,
      { symbol: unit.symbol, details: unit.details }
    );

    // Revalidate units page
    revalidatePath("/dashboard/items/units");

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
  details: string;
  symbol: string;
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
      select: { id: true, details: true, symbol: true, status: true },
    });

    if (!existingUnit) {
      return {
        success: false,
        error: "Unit not found",
        unit: null,
      };
    }

    // Prepare update data
    const updateData: {
      details: string;
      symbol: string;
      status?: string;
    } = {
      details: input.details,
      symbol: input.symbol,
    };

    if (input.status) {
      updateData.status = input.status;
    }

    // Update unit
    const unit = await prisma.unit.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        details: true,
        symbol: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log unit update - track what actually changed
    const changes: string[] = [];
    if (input.details !== existingUnit.details) changes.push("details");
    if (input.symbol !== existingUnit.symbol) changes.push("symbol");
    if (input.status && input.status !== existingUnit.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Unit",
      unit.id,
      changes,
      `${unit.symbol} - ${unit.details}`,
      { symbol: unit.symbol, details: unit.details, changes }
    );

    // Revalidate units page
    revalidatePath("/dashboard/items/units");
    revalidatePath(`/dashboard/items/units/${unit.id}`);
    revalidatePath(`/dashboard/items/units/details?id=${unit.id}`);

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
      select: { details: true, symbol: true },
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
      `${unitToDelete.symbol} - ${unitToDelete.details}`,
      { symbol: unitToDelete.symbol, details: unitToDelete.details }
    );

    // Revalidate units page
    revalidatePath("/dashboard/items/units");

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
    revalidatePath("/dashboard/items/units");

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

    // Delete units permanently
    await prisma.unit.deleteMany({
      where: {
        id: { in: unitIds },
        status: "trash", // Only allow deleting units that are in trash
      },
    });

    // Revalidate units page
    revalidatePath("/dashboard/items/units");
    
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

