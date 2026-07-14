"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";
import { type Prisma } from "@prisma/client";

/**
 * Get paginated list of brands with search
 */
export async function getBrands(
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
        brands: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.brands", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view brands",
        brands: [],
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
    const where: Prisma.BrandWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
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
    const total = await prisma.brand.count({ where });

    // Get brands
    const brands = await prisma.brand.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
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
      brands,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getBrands error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch brands",
      brands: [],
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
 * Get brand by ID
 */
export async function getBrandById(brandId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        brand: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.brands", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view brand details",
        brand: null,
      };
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!brand) {
      return {
        success: false,
        error: "Brand not found",
        brand: null,
      };
    }

    return {
      success: true,
      brand,
    };
  } catch (error) {
    console.error("getBrandById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch brand",
      brand: null,
    };
  }
}

/**
 * Create a new brand
 */
export async function createBrand(input: {
  name: string;
  description?: string;
  status?: "active" | "inactive";
  image?: string | null;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        brand: null,
      };
    }

    // Permission check
    const canCreate = await hasPermission(session.user.id, "master.brands", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create brands",
        brand: null,
      };
    }

    // Check if name already exists
    const existingBrand = await prisma.brand.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
    });

    if (existingBrand) {
      return {
        success: false,
        error: "Brand with this name already exists",
        brand: null,
      };
    }

    // Create brand
    const brand = await prisma.brand.create({
      data: {
        name: input.name,
        description: input.description || null,
        status: input.status || "active",
        image: input.image || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        createdAt: true,
      },
    });

    // Log brand creation
    await logItemCreated(
      session.user.id,
      "Brand",
      brand.id,
      brand.name,
      { name: brand.name, description: brand.description, image: brand.image }
    );

    // Revalidate brands page
    revalidateBothPaths("master/brands");

    return {
      success: true,
      brand,
    };
  } catch (error) {
    console.error("createBrand error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create brand",
      brand: null,
    };
  }
}

/**
 * Update a brand
 */
export async function updateBrand(input: {
  id: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
  image?: string | null;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        brand: null,
      };
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "master.brands", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit brands",
        brand: null,
      };
    }

    // Check if brand exists
    const existingBrand = await prisma.brand.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, description: true, status: true, image: true },
    });

    if (!existingBrand) {
      return {
        success: false,
        error: "Brand not found",
        brand: null,
      };
    }
    
    // Check if name is being changed and if it's already taken
    if (input.name !== existingBrand.name) {
      const nameTaken = await prisma.brand.findFirst({
        where: { 
          name: { equals: input.name, mode: "insensitive" },
          id: { not: input.id },
        },
      });

      if (nameTaken) {
        return {
          success: false,
          error: "Brand name is already taken by another brand",
          brand: null,
        };
      }
    }

    // Prepare update data
    const updateData: {
      name: string;
      description?: string | null;
      status?: string;
      image?: string | null;
    } = {
      name: input.name,
      description: input.description || null,
      image: input.image !== undefined ? input.image : undefined,
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update brand
    const brand = await prisma.brand.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log brand update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingBrand.name) changes.push("name");
    if (input.description !== existingBrand.description) changes.push("description");
    if (input.status !== undefined && input.status !== existingBrand.status) changes.push("status");
    if (input.image !== undefined && input.image !== existingBrand.image) changes.push("image");

    await logItemUpdated(
      session.user.id,
      "Brand",
      brand.id,
      changes,
      brand.name,
      { name: brand.name, description: brand.description, image: brand.image, changes }
    );

    // Revalidate brands page
    revalidateBothPaths("master/brands");
    revalidateBothPaths(`master/brands/${brand.id}`);
    revalidateBothPaths(`master/brands/details?id=${brand.id}`);

    return {
      success: true,
      brand,
    };
  } catch (error) {
    console.error("updateBrand error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update brand",
      brand: null,
    };
  }
}

/**
 * Delete a brand (moves to trash)
 */
export async function deleteBrand(brandId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canDelete = await hasPermission(session.user.id, "master.brands", "move-to-trash");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete brands",
      };
    }

    // Get brand info before moving to trash for logging
    const brandToDelete = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true },
    });

    if (!brandToDelete) {
      return {
        success: false,
        error: "Brand not found",
      };
    }

    // Move brand to trash (soft delete)
    await prisma.brand.update({
      where: { id: brandId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Brand",
      brandId,
      brandToDelete.name,
      { name: brandToDelete.name }
    );

    // Revalidate brands page
    revalidateBothPaths("master/brands");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteBrand error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete brand",
    };
  }
}

/**
 * Bulk update brand status
 */
export async function bulkUpdateBrandStatus(
  brandIds: string[],
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
    const canEdit = await hasPermission(session.user.id, "master.brands", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit brands",
      };
    }

    if (brandIds.length === 0) {
      return {
        success: false,
        error: "No brands selected",
      };
    }

    // Update brands
    await prisma.brand.updateMany({
      where: {
        id: { in: brandIds },
      },
      data: {
        status,
      },
    });

    // Revalidate brands page
    revalidateBothPaths("master/brands");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateBrandStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update brands",
    };
  }
}

/**
 * Delete brands permanently
 */
export async function deleteBrandsPermanently(brandIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canDeletePermanently = await hasPermission(session.user.id, "master.brands", "delete-permanently");
    if (!canDeletePermanently) {
      return {
        success: false,
        error: "You do not have permission to permanently delete brands",
      };
    }

    if (brandIds.length === 0) {
      return {
        success: false,
        error: "No brands selected",
      };
    }

    // Check if any brands are used by items
    const brandsWithItems = await prisma.brand.findMany({
      where: {
        id: { in: brandIds },
        status: "trash",
        items: { some: {} }
      },
      select: { name: true }
    });

    if (brandsWithItems.length > 0) {
      const names = brandsWithItems.map(b => b.name).join(", ");
      return {
        success: false,
        error: `Cannot permanently delete brands that are in use by items: ${names}`,
      };
    }

    // Delete brands permanently
    await prisma.brand.deleteMany({
      where: {
        id: { in: brandIds },
        status: "trash", // Only allow deleting brands that are in trash
      },
    });

    // Revalidate brands page
    revalidateBothPaths("master/brands");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteBrandsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete brands",
    };
  }
}

/**
 * Get active brands for dropdown
 */
export async function getActiveBrands() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", brands: [] };
    }

    const brands = await prisma.brand.findMany({
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
      brands,
    };
  } catch (error) {
    console.error("getActiveBrands error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch brands",
      brands: [],
    };
  }
}
