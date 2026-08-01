"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";
import { type Prisma } from "@prisma/client";

/**
 * Get paginated list of categories with search
 */
export async function getCategories(
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
        categories: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const canView = await hasPermission(session.user.id, "master.categories", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view categories",
        categories: [],
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
    const where: Prisma.CategoryWhereInput = {};
    
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
    const total = await prisma.category.count({ where });

    // Get categories
    const categories = await prisma.category.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
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
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getCategories error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch categories",
      categories: [],
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
 * Get category by ID
 */
export async function getCategoryById(categoryId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        category: null,
      };
    }

    const canView = await hasPermission(session.user.id, "master.categories", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view categories",
        category: null,
      };
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!category) {
      return {
        success: false,
        error: "Category not found",
        category: null,
      };
    }

    return {
      success: true,
      category,
    };
  } catch (error) {
    console.error("getCategoryById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch category",
      category: null,
    };
  }
}

/**
 * Create a new category
 */
export async function createCategory(input: {
  name: string;
  description?: string;
  status?: "active" | "inactive";
  image?: string | null;
  parentId?: string | null;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        category: null,
      };
    }

    const canCreate = await hasPermission(session.user.id, "master.categories", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create categories",
        category: null,
      };
    }

    // Validate: parentId exists (if provided)
    if (input.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: input.parentId },
      });
      if (!parentCategory) {
        return {
          success: false,
          error: "Parent category not found",
          category: null,
        };
      }
    }

    // Check if name already exists
    const existingCategory = await prisma.category.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
    });

    if (existingCategory) {
      return {
        success: false,
        error: "Category with this name already exists",
        category: null,
      };
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: input.name,
        description: input.description || null,
        status: input.status || "active",
        image: input.image || null,
        parentId: input.parentId || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    // Log category creation
    await logItemCreated(
      session.user.id,
      "Category",
      category.id,
      category.name,
      { name: category.name, description: category.description, image: category.image, parentId: category.parentId }
    );

    // Revalidate categories page
    revalidateBothPaths("master/categories");

    return {
      success: true,
      category,
    };
  } catch (error) {
    console.error("createCategory error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create category",
      category: null,
    };
  }
}

/**
 * Update a category
 */
export async function updateCategory(input: {
  id: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
  image?: string | null;
  parentId?: string | null;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        category: null,
      };
    }

    const canEdit = await hasPermission(session.user.id, "master.categories", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit categories",
        category: null,
      };
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, description: true, status: true, image: true, parentId: true },
    });

    if (!existingCategory) {
      return {
        success: false,
        error: "Category not found",
        category: null,
      };
    }

    // Validate parentId if provided
    if (input.parentId) {
      if (input.parentId === input.id) {
        return {
          success: false,
          error: "A category cannot be its own parent",
          category: null,
        };
      }

      const parentCategory = await prisma.category.findUnique({
        where: { id: input.parentId },
      });
      if (!parentCategory) {
        return {
          success: false,
          error: "Parent category not found",
          category: null,
        };
      }

      // Cycle check
      let currentParentId = input.parentId;
      while (currentParentId) {
        const parent = await prisma.category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        if (parent?.parentId === input.id) {
          return {
            success: false,
            error: "Cyclic relationship detected: parent category is a subcategory of this category",
            category: null,
          };
        }
        currentParentId = parent?.parentId || "";
      }
    }
    
    // Check if name is being changed and if it's already taken
    if (input.name !== existingCategory.name) {
      const nameTaken = await prisma.category.findFirst({
        where: { 
          name: { equals: input.name, mode: "insensitive" },
          id: { not: input.id },
        },
      });

      if (nameTaken) {
        return {
          success: false,
          error: "Category name is already taken by another category",
          category: null,
        };
      }
    }

    // Prepare update data
    const updateData: {
      name: string;
      description?: string | null;
      status?: string;
      image?: string | null;
      parentId?: string | null;
    } = {
      name: input.name,
      description: input.description || null,
      image: input.image !== undefined ? input.image : undefined,
      parentId: input.parentId !== undefined ? (input.parentId || null) : undefined,
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update category
    const category = await prisma.category.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        image: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log category update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingCategory.name) changes.push("name");
    if (input.description !== existingCategory.description) changes.push("description");
    if (input.status !== undefined && input.status !== existingCategory.status) changes.push("status");
    if (input.image !== undefined && input.image !== existingCategory.image) changes.push("image");
    if (input.parentId !== existingCategory.parentId) changes.push("parentId");

    await logItemUpdated(
      session.user.id,
      "Category",
      category.id,
      changes,
      category.name,
      { name: category.name, description: category.description, image: category.image, parentId: category.parentId, changes }
    );

    // Revalidate categories page
    revalidateBothPaths("master/categories");
    revalidateBothPaths(`master/categories/${category.id}`);
    revalidateBothPaths(`master/categories/details?id=${category.id}`);

    return {
      success: true,
      category,
    };
  } catch (error) {
    console.error("updateCategory error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category",
      category: null,
    };
  }
}

/**
 * Delete a category (moves to trash)
 */
export async function deleteCategory(categoryId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const canDelete = await hasPermission(session.user.id, "master.categories", "move-to-trash");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete categories",
      };
    }

    // Get category info before moving to trash for logging
    const categoryToDelete = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });

    if (!categoryToDelete) {
      return {
        success: false,
        error: "Category not found",
      };
    }

    // Move category to trash (soft delete)
    await prisma.category.update({
      where: { id: categoryId },
      data: { status: "trash" },
    });

    // Cascade soft delete to child categories
    await prisma.category.updateMany({
      where: { parentId: categoryId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Category",
      categoryId,
      categoryToDelete.name,
      { name: categoryToDelete.name }
    );

    // Revalidate categories page
    revalidateBothPaths("master/categories");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteCategory error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}

/**
 * Bulk update category status
 */
export async function bulkUpdateCategoryStatus(
  categoryIds: string[],
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

    const requiredOp = status === "trash" ? "move-to-trash" : "edit";
    const canPerform = await hasPermission(session.user.id, "master.categories", requiredOp);
    if (!canPerform) {
      return {
        success: false,
        error: `You do not have permission to ${requiredOp === "move-to-trash" ? "delete" : "edit"} categories`,
      };
    }

    if (categoryIds.length === 0) {
      return {
        success: false,
        error: "No categories selected",
      };
    }

    // Update categories
    await prisma.category.updateMany({
      where: {
        id: { in: categoryIds },
      },
      data: {
        status,
      },
    });

    if (status === "trash") {
      // Cascade soft delete to all subcategories of these categories
      await prisma.category.updateMany({
        where: {
          parentId: { in: categoryIds },
        },
        data: {
          status: "trash",
        },
      });
    }

    // Revalidate categories page
    revalidateBothPaths("master/categories");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateCategoryStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update categories",
    };
  }
}

/**
 * Delete categories permanently
 */
export async function deleteCategoriesPermanently(categoryIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const canDeletePermanently = await hasPermission(session.user.id, "master.categories", "delete-permanently");
    if (!canDeletePermanently) {
      return {
        success: false,
        error: "You do not have permission to permanently delete categories",
      };
    }

    if (categoryIds.length === 0) {
      return {
        success: false,
        error: "No categories selected",
      };
    }

    // Check if any categories have children
    const categoriesWithChildren = await prisma.category.findMany({
      where: {
        parentId: { in: categoryIds },
      },
      select: { name: true, parent: { select: { name: true } } }
    });

    if (categoriesWithChildren.length > 0) {
      const parentNames = Array.from(new Set(categoriesWithChildren.map(c => c.parent?.name))).filter(Boolean).join(", ");
      return {
        success: false,
        error: `Cannot permanently delete categories that have subcategories: ${parentNames}. Please delete subcategories first.`,
      };
    }

    // Check if any categories are used by items
    const categoriesWithItems = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        status: "trash",
        items: { some: {} }
      },
      select: { name: true }
    });

    if (categoriesWithItems.length > 0) {
      const names = categoriesWithItems.map(c => c.name).join(", ");
      return {
        success: false,
        error: `Cannot permanently delete categories that are in use by items: ${names}`,
      };
    }

    // Delete categories permanently
    await prisma.category.deleteMany({
      where: {
        id: { in: categoryIds },
        status: "trash", // Only allow deleting categories that are in trash
      },
    });

    // Revalidate categories page
    revalidateBothPaths("master/categories");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteCategoriesPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete categories",
    };
  }
}

/**
 * Get active root categories (categories where parentId is null and status is active)
 */
export async function getActiveRootCategories() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        categories: [],
      };
    }

    const canView = await hasPermission(session.user.id, "master.categories", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view categories",
        categories: [],
      };
    }

    const categories = await prisma.category.findMany({
      where: {
        status: "active",
        parentId: null,
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
    console.error("getActiveRootCategories error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch active root categories",
      categories: [],
    };
  }
}

/**
 * Get all categories matching filters for export (no pagination limit)
 */
export async function getAllCategoriesForExport(
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  categoryIds?: string[]
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", categories: [] };
    }

    const canView = await hasPermission(session.user.id, "master.categories", "view");
    if (!canView) {
      return { success: false, error: "You do not have permission to view categories", categories: [] };
    }

    const where: Prisma.CategoryWhereInput = {};

    if (categoryIds && categoryIds.length > 0) {
      where.id = { in: categoryIds };
    } else {
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (status === "trash") {
        where.status = "trash";
      } else if (status === "active") {
        where.status = "active";
      } else if (status === "inactive") {
        where.status = "inactive";
      } else if (status === "all") {
        where.status = { not: "trash" };
      }
    }

    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
            children: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, categories };
  } catch (error) {
    console.error("getAllCategoriesForExport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch categories for export",
      categories: [],
    };
  }
}

