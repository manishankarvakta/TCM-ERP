"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";

/**
 * Get paginated list of suppliers with search
 */
export async function getSuppliers(
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
        suppliers: [],
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
    const where: Prisma.SupplierWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
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
    const total = await prisma.supplier.count({ where });

    // Get suppliers
    const suppliers = await prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdBy: true,
        createdByUser: {
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
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getSuppliers error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch suppliers",
      suppliers: [],
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
 * Get supplier by ID
 */
export async function getSupplierById(supplierId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        supplier: null,
      };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdBy: true,
        createdByUser: {
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

    if (!supplier) {
      return {
        success: false,
        error: "Supplier not found",
        supplier: null,
      };
    }

    return {
      success: true,
      supplier,
    };
  } catch (error) {
    console.error("getSupplierById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch supplier",
      supplier: null,
    };
  }
}

/**
 * Create a new supplier
 */
export async function createSupplier(input: {
  name?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  image?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        supplier: null,
      };
    }

    // Check if email already exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { email: input.email },
    });

    if (existingSupplier) {
      return {
        success: false,
        error: "Supplier with this email already exists",
        supplier: null,
      };
    }

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: input.name || null,
        email: input.email,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        country: input.country || null,
        company: input.company || null,
        image: input.image || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log supplier creation
    await logItemCreated(
      session.user.id,
      "Supplier",
      supplier.id,
      supplier.name || supplier.email,
      { 
        name: supplier.name, 
        email: supplier.email,
        phone: supplier.phone,
        company: supplier.company,
      }
    );

    // Revalidate suppliers page
    revalidatePath("/admin/suppliers");

    return {
      success: true,
      supplier,
    };
  } catch (error) {
    console.error("createSupplier error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create supplier",
      supplier: null,
    };
  }
}

/**
 * Update a supplier
 */
export async function updateSupplier(input: {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  image?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        supplier: null,
      };
    }

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: input.id },
    });

    if (!existingSupplier) {
      return {
        success: false,
        error: "Supplier not found",
        supplier: null,
      };
    }

    // Check if email is being changed and if new email already exists
    if (input.email !== existingSupplier.email) {
      const emailExists = await prisma.supplier.findUnique({
        where: { email: input.email },
      });

      if (emailExists) {
        return {
          success: false,
          error: "Supplier with this email already exists",
          supplier: null,
        };
      }
    }

    // Build update data
    const updateData: Prisma.SupplierUpdateInput = {
      name: input.name !== undefined ? (input.name || null) : undefined,
      email: input.email,
      phone: input.phone !== undefined ? (input.phone || null) : undefined,
      address: input.address !== undefined ? (input.address || null) : undefined,
      city: input.city !== undefined ? (input.city || null) : undefined,
      state: input.state !== undefined ? (input.state || null) : undefined,
      zip: input.zip !== undefined ? (input.zip || null) : undefined,
      country: input.country !== undefined ? (input.country || null) : undefined,
      company: input.company !== undefined ? (input.company || null) : undefined,
      image: input.image !== undefined ? (input.image || null) : undefined,
    };

    if (input.status) {
      updateData.status = input.status;
    }

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log supplier update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingSupplier.name) changes.push("name");
    if (input.email !== existingSupplier.email) changes.push("email");
    if (input.phone !== existingSupplier.phone) changes.push("phone");
    if (input.address !== existingSupplier.address) changes.push("address");
    if (input.city !== existingSupplier.city) changes.push("city");
    if (input.state !== existingSupplier.state) changes.push("state");
    if (input.zip !== existingSupplier.zip) changes.push("zip");
    if (input.country !== existingSupplier.country) changes.push("country");
    if (input.company !== existingSupplier.company) changes.push("company");
    if (input.image !== undefined && input.image !== existingSupplier.image) changes.push("image");
    if (input.status && input.status !== existingSupplier.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Supplier",
      supplier.id,
      changes,
      supplier.name || supplier.email,
      { 
        name: supplier.name, 
        email: supplier.email,
        phone: supplier.phone,
        company: supplier.company,
        changes 
      }
    );

    // Revalidate suppliers page
    revalidatePath("/admin/suppliers");
    revalidatePath(`/admin/suppliers/${supplier.id}`);
    revalidatePath(`/admin/suppliers/details?id=${supplier.id}`);

    return {
      success: true,
      supplier,
    };
  } catch (error) {
    console.error("updateSupplier error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update supplier",
      supplier: null,
    };
  }
}

/**
 * Delete a supplier (moves to trash)
 */
export async function deleteSupplier(supplierId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get supplier info before moving to trash for logging
    const supplierToDelete = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { name: true, email: true, phone: true, company: true },
    });

    if (!supplierToDelete) {
      return {
        success: false,
        error: "Supplier not found",
      };
    }

    // Move supplier to trash (soft delete)
    await prisma.supplier.update({
      where: { id: supplierId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Supplier",
      supplierId,
      supplierToDelete.name || supplierToDelete.email,
      { 
        name: supplierToDelete.name, 
        email: supplierToDelete.email,
        phone: supplierToDelete.phone,
        company: supplierToDelete.company,
      }
    );

    // Revalidate suppliers page
    revalidatePath("/admin/suppliers");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteSupplier error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete supplier",
    };
  }
}

/**
 * Bulk update supplier status
 */
export async function bulkUpdateSupplierStatus(
  supplierIds: string[],
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

    if (supplierIds.length === 0) {
      return {
        success: false,
        error: "No suppliers selected",
      };
    }

    // Get supplier names for logging
    const suppliers = await prisma.supplier.findMany({
      where: {
        id: { in: supplierIds },
      },
      select: { id: true, name: true, email: true },
    });

    // Update suppliers
    await prisma.supplier.updateMany({
      where: {
        id: { in: supplierIds },
      },
      data: {
        status,
      },
    });

    // Log bulk update for each supplier
    for (const supplier of suppliers) {
      await logItemUpdated(
        session.user.id,
        "Supplier",
        supplier.id,
        ["status"],
        supplier.name || supplier.email,
        { name: supplier.name, email: supplier.email, status, changes: ["status"] }
      );
    }

    // Revalidate suppliers page
    revalidatePath("/admin/suppliers");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateSupplierStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update suppliers",
    };
  }
}

/**
 * Delete suppliers permanently
 */
export async function deleteSuppliersPermanently(supplierIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (supplierIds.length === 0) {
      return {
        success: false,
        error: "No suppliers selected",
      };
    }

    // Get supplier names for logging
    const suppliers = await prisma.supplier.findMany({
      where: {
        id: { in: supplierIds },
        status: "trash", // Only allow deleting suppliers that are in trash
      },
      select: { id: true, name: true, email: true },
    });

    if (suppliers.length === 0) {
      return {
        success: false,
        error: "No suppliers found in trash",
      };
    }

    // Log permanent deletion for each supplier
    for (const supplier of suppliers) {
      await logItemDeleted(
        session.user.id,
        "Supplier",
        supplier.id,
        supplier.name || supplier.email,
        { name: supplier.name, email: supplier.email }
      );
    }

    // Delete suppliers permanently
    await prisma.supplier.deleteMany({
      where: {
        id: { in: supplierIds },
        status: "trash", // Only allow deleting suppliers that are in trash
      },
    });

    // Revalidate suppliers page
    revalidatePath("/admin/suppliers");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteSuppliersPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete suppliers",
    };
  }
}

