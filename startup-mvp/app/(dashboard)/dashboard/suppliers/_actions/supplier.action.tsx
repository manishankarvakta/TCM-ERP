"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, AccountType } from "@prisma/client";

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
        { supplierCode: { contains: search, mode: "insensitive" } },
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
        supplierCode: true,
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
// @ts-expect-error - Legacy compatibility
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
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
        supplierCode: true,
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
// @ts-expect-error - Legacy compatibility
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
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
 * Helper function to find Accounts Payable parent account
 */
async function findAccountsPayableParent(): Promise<string | null> {
  const account = await prisma.chartOfAccount.findFirst({
    where: {
      name: {
        contains: "Accounts Payable",
        mode: "insensitive",
      },
      status: "active",
      type: AccountType.LIABILITY,
    },
    select: {
      id: true,
    },
  });

  return account?.id || null;
}

/**
 * Helper function to generate unique supplier code
 * Format: SUP{NNNNNNN} (e.g., SUP1000001, SUP1000002, SUP1000003)
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
async function generateSupplierCode(tx?: Prisma.TransactionClient): Promise<string> {
  const prefix = "SUP";
  const client = tx || prisma;

  // Find the highest existing code
  const lastSupplier = await client.supplier.findFirst({
    where: {
      supplierCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      supplierCode: "desc",
    },
    select: {
      supplierCode: true,
    },
  });

  let nextNumber = 1000001;
  if (lastSupplier?.supplierCode) {
    // Extract number from code (e.g., "SUP1000001" -> 1000001)
    const codeWithoutPrefix = lastSupplier.supplierCode.replace(prefix, "");
    const lastNumber = parseInt(codeWithoutPrefix, 10);
    if (!isNaN(lastNumber) && lastNumber >= 1000001) {
      nextNumber = lastNumber + 1;
    }
  }

  // Always use 7 digits for 10-digit total (3 prefix + 7 digits)
  return `${prefix}${nextNumber.toString().padStart(7, "0")}`;
}

/**
 * Helper function to generate unique account code for supplier
 * Format: AP-{YYYY}-{NNNN} (e.g., AP-2025-0001)
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
async function generateSupplierAccountCode(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AP-${year}-`;
  const client = tx || prisma;

  // Find the highest number for this year
  const lastAccount = await client.chartOfAccount.findFirst({
    where: {
      code: {
        startsWith: prefix,
      },
    },
    orderBy: {
      code: "desc",
    },
    select: {
      code: true,
    },
  });

  let nextNumber = 1;
  if (lastAccount) {
    const lastNumberStr = lastAccount.code.split("-").pop() || "0";
    const lastNumber = parseInt(lastNumberStr, 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
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

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Find Accounts Payable parent account
      const apParentId = await findAccountsPayableParent();
      
      if (!apParentId) {
        throw new Error(
          "Accounts Payable control account not found. Please ensure it exists in Chart of Accounts before creating suppliers."
        );
      }

      // Verify parent account is active
      const parentAccount = await tx.chartOfAccount.findUnique({
        where: { id: apParentId },
        select: { id: true, status: true, type: true },
      });

      if (!parentAccount || parentAccount.status !== "active") {
        throw new Error("Accounts Payable parent account is not active");
      }

      if (parentAccount.type !== AccountType.LIABILITY) {
        throw new Error("Accounts Payable parent account must be of type LIABILITY");
      }

      // Generate unique account code (using transaction client for consistency)
      let accountCode = await generateSupplierAccountCode(tx);
      
      // Ensure code doesn't exist (double-check for race conditions)
      let codeExists = await tx.chartOfAccount.findUnique({
        where: { code: accountCode },
        select: { id: true },
      });

      // If code exists, try generating a new one (up to 10 attempts)
      let attempts = 0;
      while (codeExists && attempts < 10) {
        // Extract number and increment
        const parts = accountCode.split("-");
        const numberPart = parts[parts.length - 1];
        const number = parseInt(numberPart, 10);
        if (!isNaN(number)) {
          const newNumber = number + 1;
          accountCode = `${parts.slice(0, -1).join("-")}-${newNumber.toString().padStart(4, "0")}`;
        } else {
          // Fallback: append timestamp
          accountCode = `AP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        }
        codeExists = await tx.chartOfAccount.findUnique({
          where: { code: accountCode },
          select: { id: true },
        });
        attempts++;
      }

      if (codeExists) {
        throw new Error("Unable to generate unique account code. Please try again.");
      }

      // Create Chart of Account for supplier
      const supplierName = input.name || input.email;
      const accountName = `AP - ${supplierName}`;

      const chartOfAccount = await tx.chartOfAccount.create({
        data: {
          id: crypto.randomUUID(),
          code: accountCode,
          name: accountName,
          type: AccountType.LIABILITY,
          parentId: apParentId,
          description: `Accounts Payable account for supplier: ${supplierName}`,
          status: "active",
          createdBy: session.user.id,
        },
      });

      // Generate unique supplier code
      let supplierCode = await generateSupplierCode(tx);

      // Create supplier with chartOfAccountId reference
      const supplier = await tx.supplier.create({
        data: {
          name: input.name || null,
          supplierCode,
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
          chartOfAccountId: chartOfAccount.id,
        },
        select: {
          id: true,
          name: true,
          supplierCode: true,
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

      return { supplier, chartOfAccount };
    });

    // Log supplier creation
    await logItemCreated(
      session.user.id,
      "Supplier",
      result.supplier.id,
      result.supplier.name || result.supplier.email,
      { 
        name: result.supplier.name, 
        email: result.supplier.email,
        phone: result.supplier.phone,
        company: result.supplier.company,
        chartOfAccountId: result.chartOfAccount.id,
        chartOfAccountCode: result.chartOfAccount.code,
      }
    );

    // Revalidate suppliers page
    revalidateBothPaths("suppliers");

    return {
      success: true,
      supplier: result.supplier,
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

    // Backfill supplier code if missing
    if (!existingSupplier.supplierCode) {
      const supplierCode = await (async () => {
        const lastSupplier = await prisma.supplier.findFirst({
          orderBy: { createdAt: "desc" },
          select: { supplierCode: true },
        });

        let nextNumber = 1000001;
        if (lastSupplier?.supplierCode) {
          const lastNumber = parseInt(lastSupplier.supplierCode.replace("SUP", ""), 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
        return `SUP${nextNumber}`;
      })();
      updateData.supplierCode = supplierCode;
    }

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        supplierCode: true,
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
        ChartOfAccount: {
          select: {
            id: true,
          },
        },
      },
    });

    // Handle rename: Update COA name if supplier name changed and COA exists
    if (input.name !== undefined && input.name !== existingSupplier.name && supplier.ChartOfAccount?.id) {
      const supplierName = input.name || input.email;
      const accountName = `AP - ${supplierName}`;
      
      await prisma.chartOfAccount.update({
        where: { id: supplier.ChartOfAccount.id },
        data: {
          name: accountName,
          description: `Accounts Payable account for supplier: ${supplierName}`,
        },
      });
    }

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
    revalidateBothPaths("suppliers");

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
      select: { 
        name: true, 
        email: true, 
        phone: true, 
        company: true,
        chartOfAccountId: true,
      },
    });

    if (!supplierToDelete) {
      return {
        success: false,
        error: "Supplier not found",
      };
    }

    // Use transaction to ensure both supplier and COA are soft-deleted atomically
    await prisma.$transaction(async (tx) => {
      // Move supplier to trash (soft delete)
      await tx.supplier.update({
        where: { id: supplierId },
        data: { status: "trash" },
      });

      // Also soft-delete the associated COA if it exists
      if (supplierToDelete.chartOfAccountId) {
        await tx.chartOfAccount.update({
          where: { id: supplierToDelete.chartOfAccountId },
          data: { status: "trash" },
        });
      }
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
    revalidateBothPaths("suppliers");

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
    revalidateBothPaths("suppliers");

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
    revalidateBothPaths("suppliers");
    
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

