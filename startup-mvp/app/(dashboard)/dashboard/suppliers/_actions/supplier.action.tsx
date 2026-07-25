"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { revalidatePath } from "next/cache";
import { type Prisma, AccountType, VoucherType } from "@prisma/client";
import { createVoucher, postVoucher } from "../../accounts/vouchers/_actions/voucher.action";

/**
 * Get paginated list of suppliers with search
 */
export async function getSuppliers(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  warehouseId: string = "all"
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

    // Filter by warehouse if provided
    if (warehouseId && warehouseId !== "all") {
      where.warehouseId = warehouseId;
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
        documents: true,
        openingBalance: true,
        status: true,
        createdBy: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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

    // Calculate payable due amount for each supplier via their AP sub-ledger account
    const suppliersWithDue = await Promise.all(
      suppliers.map(async (supplier) => {
        const coaId = supplier.ChartOfAccount?.id;
        if (!coaId) return { ...supplier, dueAmount: 0 };

        const balanceResult = await prisma.journalEntryLine.aggregate({
          where: { chartOfAccountId: coaId },
          _sum: { debitAmount: true, creditAmount: true },
        });

        const due =
          Number(balanceResult._sum.creditAmount || 0) -
          Number(balanceResult._sum.debitAmount || 0);

        return { ...supplier, dueAmount: Math.max(0, due) };
      })
    );

    return {
      success: true,
      suppliers: suppliersWithDue,
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
        documents: true,
        openingBalance: true,
        status: true,
        createdBy: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
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
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
async function findAccountsPayableParent(tx?: Prisma.TransactionClient): Promise<string | null> {
  const client = tx || prisma;
  const account = await client.chartOfAccount.findFirst({
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
  email?: string | null;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  image?: string;
  documents?: any;
  openingBalance?: number;
  status?: "active" | "inactive";
  warehouseId?: string | null;
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

    // Check if email already exists if provided
    if (input.email) {
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
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Generate unique supplier code
      let supplierCode = await generateSupplierCode(tx);
      
      // Ensure code doesn't exist (double-check for race conditions)
      let supplierCodeExists = await tx.supplier.findUnique({
        where: { supplierCode },
        select: { id: true },
      });

      // Retry logic for code generation (up to 10 attempts)
      let supplierCodeAttempts = 0;
      while (supplierCodeExists && supplierCodeAttempts < 10) {
        // Extract number and increment
        const codeWithoutPrefix = supplierCode.replace("SUP", "");
        const number = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(number) && number >= 1000001) {
          const newNumber = number + 1;
          supplierCode = `SUP${newNumber.toString().padStart(7, "0")}`;
        } else {
          // Fallback: start from 1000001
          supplierCode = `SUP1000001`;
        }
        supplierCodeExists = await tx.supplier.findUnique({
          where: { supplierCode },
          select: { id: true },
        });
        supplierCodeAttempts++;
      }

      if (supplierCodeExists) {
        throw new Error("Unable to generate unique supplier code. Please try again.");
      }

      // Find Accounts Payable parent account
      const apParentId = await findAccountsPayableParent(tx);
      
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
      const supplierName = input.name || input.email || "Unnamed Supplier";
      const accountName = `AP - ${supplierName}`;
      const coaId = `coa_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const chartOfAccount = await tx.chartOfAccount.create({
        data: {
          id: coaId,
          code: accountCode,
          name: accountName,
          type: AccountType.LIABILITY,
          parentId: apParentId,
          description: `Accounts Payable account for supplier: ${supplierName}`,
          status: "active",
          createdBy: session.user.id,
        },
      });

      // Fetch default warehouse of logged-in user if warehouseId not specified
      const userRecord = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { defaultWarehouseId: true },
      });
      const targetWarehouseId = (input.warehouseId && input.warehouseId.trim() !== "")
        ? input.warehouseId
        : (userRecord?.defaultWarehouseId || null);

      // Create supplier with chartOfAccountId reference
      const supplier = await tx.supplier.create({
        data: {
          name: input.name || null,
          supplierCode,
          email: input.email || null,
          phone: input.phone || null,
          address: input.address || null,
          city: input.city || null,
          state: input.state || null,
          zip: input.zip || null,
          country: input.country || null,
          company: input.company || null,
          image: input.image || null,
          documents: input.documents || null,
          openingBalance: input.openingBalance || 0,
          status: input.status || "active",
          createdBy: session.user.id,
          chartOfAccountId: chartOfAccount.id,
          warehouseId: targetWarehouseId,
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
          documents: true,
          openingBalance: true,
        status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Handle opening balance if provided
      if (input.openingBalance && input.openingBalance > 0) {
        // Find Owner's Capital account (code "3110")
        const capitalAccount = await tx.chartOfAccount.findUnique({
          where: { code: "3110" },
          select: { id: true },
        });

        if (!capitalAccount) {
          throw new Error("Owner's Capital account (Code 3110) not found. Please ensure Chart of Accounts is seeded.");
        }

        const voucherResult = await createVoucher({
          date: new Date(),
          type: "JOURNAL",
          reference: "OPENING-BALANCE",
          description: `Opening Balance for Supplier: ${input.name || input.email || "Unnamed Supplier"}`,
          isSystemAction: true,
          lines: [
            {
              lineNumber: 1,
              debitAmount: input.openingBalance,
              creditAmount: 0,
              description: "Opening Balance Debit Offset",
              chartOfAccountId: capitalAccount.id,
            },
            {
              lineNumber: 2,
              debitAmount: 0,
              creditAmount: input.openingBalance,
              description: "Opening Balance Credit",
              chartOfAccountId: chartOfAccount.id,
            },
          ],
        }, tx);

        if (!voucherResult.success || !voucherResult.voucher) {
          throw new Error(voucherResult.error || "Failed to create opening balance voucher");
        }

        const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
        if (!postResult.success) {
          throw new Error(postResult.error || "Failed to post opening balance voucher");
        }
      }

      return { supplier, chartOfAccount };
    });

    // Log supplier creation
    await logItemCreated(
      session.user.id,
      "Supplier",
      result.supplier.id,
      result.supplier.name || result.supplier.email || undefined,
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
  email?: string | null;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  image?: string;
  documents?: any;
  openingBalance?: number;
  status?: "active" | "inactive";
  warehouseId?: string | null;
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
        openingBalance: true,
        status: true,
        chartOfAccountId: true,
      },
    });

    if (!existingSupplier) {
      return {
        success: false,
        error: "Supplier not found",
        supplier: null,
      };
    }

    // Check if email is being changed and if new email already exists
    if (input.email && input.email !== existingSupplier.email) {
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

    // Use transaction to ensure atomicity when creating missing account
    const result = await prisma.$transaction(async (tx) => {
      const supplierName = input.name !== undefined ? (input.name || input.email || "Unnamed Supplier") : (existingSupplier.name || existingSupplier.email || "Unnamed Supplier");
      let chartOfAccountId = existingSupplier.chartOfAccountId;
      
      // Generate supplier code if missing
      let supplierCode = existingSupplier.supplierCode;
      if (!supplierCode) {
        supplierCode = await generateSupplierCode(tx);
        
        // Ensure code doesn't exist
        let supplierCodeExists = await tx.supplier.findUnique({
          where: { supplierCode },
          select: { id: true },
        });

        // Retry logic for code generation (up to 10 attempts)
        let supplierCodeAttempts = 0;
        while (supplierCodeExists && supplierCodeAttempts < 10) {
          const codeWithoutPrefix = supplierCode.replace("SUP", "");
          const number = parseInt(codeWithoutPrefix, 10);
          if (!isNaN(number)) {
            const newNumber = number + 1;
            const digits = newNumber < 1000 ? 3 : newNumber.toString().length;
            supplierCode = `SUP${newNumber.toString().padStart(digits, "0")}`;
          } else {
            supplierCode = `SUP${Date.now().toString().slice(-6)}`;
          }
          supplierCodeExists = await tx.supplier.findUnique({
            where: { supplierCode },
            select: { id: true },
          });
          supplierCodeAttempts++;
        }

        if (supplierCodeExists) {
          throw new Error("Unable to generate unique supplier code. Please try again.");
        }
      }

      // Check and create Accounts Payable account if missing
      if (!chartOfAccountId) {
        // Find Accounts Payable parent account (required)
        const apParentId = await findAccountsPayableParent(tx);
        
        if (!apParentId) {
          throw new Error(
            "Accounts Payable control account not found. Please ensure it exists in Chart of Accounts before updating suppliers."
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

        // Generate unique account code
        let accountCode = await generateSupplierAccountCode(tx);
        
        // Ensure code doesn't exist
        let codeExists = await tx.chartOfAccount.findUnique({
          where: { code: accountCode },
          select: { id: true },
        });

        // Retry logic for code generation (up to 10 attempts)
        let attempts = 0;
        while (codeExists && attempts < 10) {
          const parts = accountCode.split("-");
          const numberPart = parts[parts.length - 1];
          const number = parseInt(numberPart, 10);
          if (!isNaN(number)) {
            const newNumber = number + 1;
            accountCode = `${parts.slice(0, -1).join("-")}-${newNumber.toString().padStart(4, "0")}`;
          } else {
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
        const accountName = `AP - ${supplierName}`;
        const coaId = `coa_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const chartOfAccount = await tx.chartOfAccount.create({
          data: {
            id: coaId,
            code: accountCode,
            name: accountName,
            type: AccountType.LIABILITY,
            parentId: apParentId,
            description: `Accounts Payable account for supplier: ${supplierName}`,
            status: "active",
            createdBy: session.user.id,
          },
        });

        chartOfAccountId = chartOfAccount.id;
      }

      // Build update data
      const updateData: Prisma.SupplierUpdateInput = {
        name: input.name !== undefined ? (input.name || null) : undefined,
        email: input.email !== undefined ? (input.email || null) : undefined,
        phone: input.phone,
        address: input.address !== undefined ? (input.address || null) : undefined,
        city: input.city !== undefined ? (input.city || null) : undefined,
        state: input.state !== undefined ? (input.state || null) : undefined,
        zip: input.zip !== undefined ? (input.zip || null) : undefined,
        country: input.country !== undefined ? (input.country || null) : undefined,
        company: input.company !== undefined ? (input.company || null) : undefined,
        image: input.image !== undefined ? (input.image || null) : undefined,
        documents: input.documents !== undefined ? input.documents : undefined,
        openingBalance: input.openingBalance !== undefined ? input.openingBalance : undefined,
      };

      if (input.warehouseId !== undefined) {
        updateData.warehouse = input.warehouseId ? { connect: { id: input.warehouseId } } : { disconnect: true };
      }

      if (input.status) {
        updateData.status = input.status;
      }

      // Add supplierCode if it was generated
      if (supplierCode && supplierCode !== existingSupplier.supplierCode) {
        updateData.supplierCode = supplierCode;
      }

      if (chartOfAccountId && chartOfAccountId !== existingSupplier.chartOfAccountId) {
        updateData.ChartOfAccount = { connect: { id: chartOfAccountId } };
      }

      // Update supplier
      const supplier = await tx.supplier.update({
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
          documents: true,
          openingBalance: true,
        status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Handle rename: Update COA name if supplier name changed and COA exists
      if (input.name !== undefined && input.name !== existingSupplier.name && chartOfAccountId) {
        const updatedSupplierName = input.name || input.email;
        const accountName = `AP - ${updatedSupplierName}`;
        
        await tx.chartOfAccount.update({
          where: { id: chartOfAccountId },
          data: {
            name: accountName,
            description: `Accounts Payable account for supplier: ${updatedSupplierName}`,
          },
        });
      }

      return supplier;
    });

    const supplier = result;

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
    if (input.openingBalance !== (existingSupplier as any).openingBalance) changes.push("openingBalance");
    if (input.image !== undefined && input.image !== existingSupplier.image) changes.push("image");
    if (input.status && input.status !== existingSupplier.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Supplier",
      supplier.id,
      changes,
      supplier.name || supplier.email || undefined,
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
    revalidatePath(`/dashboard/suppliers/${supplier.id}`);
    revalidatePath(`/dashboard/suppliers/details?id=${supplier.id}`);

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
      supplierToDelete.name || supplierToDelete.email || undefined,
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
        supplier.name || supplier.email || undefined,
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
        supplier.name || supplier.email || undefined,
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

/**
 * Get Supplier Ledger with chronological transactions and running payable balance
 */
export async function getSupplierLedger(
  supplierId: string,
  startDate?: string | Date,
  endDate?: string | Date
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        supplier: null,
        ledger: [],
        summary: { totalPurchased: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
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
        openingBalance: true,
        status: true,
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        createdAt: true,
      },
    });

    if (!supplier) {
      return {
        success: false,
        error: "Supplier not found",
        supplier: null,
        ledger: [],
        summary: { totalPurchased: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
      };
    }

    const coaId = supplier.ChartOfAccount?.id;

    // Fetch all journal entry lines for this supplier sub-ledger account or supplierId
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        OR: [
          ...(coaId ? [{ chartOfAccountId: coaId }] : []),
          { supplierId: supplierId },
        ],
      },
      include: {
        JournalEntry: {
          include: {
            Voucher: {
              include: {
                purchases: {
                  select: { id: true, purchaseNumber: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const rawTransactions: Array<{
      id: string;
      date: Date;
      type: string;
      typeLabel: string;
      reference: string;
      description: string;
      status: string;
      debit: number;
      credit: number;
    }> = [];

    // Opening balance entry if supplier has openingBalance > 0 and no explicit journal entry for it
    const initialOpeningBal = Number(supplier.openingBalance || 0);
    const hasOpeningJournal = journalLines.some((jl) =>
      jl.description?.toLowerCase().includes("opening balance")
    );

    if (initialOpeningBal > 0 && !hasOpeningJournal) {
      rawTransactions.push({
        id: `op-bal-${supplier.id}`,
        date: supplier.createdAt,
        type: "OPENING_BALANCE",
        typeLabel: "Opening Balance",
        reference: supplier.supplierCode || "SUP-OP",
        description: "Initial Opening Balance",
        status: "POSTED",
        debit: 0,
        credit: initialOpeningBal,
      });
    }

    // Process Journal Entry Lines
    for (const line of journalLines) {
      const je = line.JournalEntry;
      const voucher = je?.Voucher;
      const purchase = voucher?.purchases?.[0];

      let type = "JOURNAL";
      let typeLabel = "Journal Entry";

      if (voucher) {
        if (voucher.type === VoucherType.PURCHASE || purchase) {
          type = "PURCHASE";
          typeLabel = "Purchase";
        } else if (voucher.type === VoucherType.PAYMENT) {
          type = "PAYMENT";
          typeLabel = "Payment";
        } else if (voucher.type === VoucherType.RECEIPT || voucher.type === VoucherType.RETURN) {
          type = "RETURN";
          typeLabel = "Return / Receipt";
        }
      }

      const reference = purchase?.purchaseNumber || voucher?.voucherNumber || je?.entryNumber || "JE";
      const description =
        line.description ||
        voucher?.description ||
        je?.description ||
        `${typeLabel} #${reference}`;

      const txnStatus = (je?.status || voucher?.status || "POSTED").toUpperCase();

      rawTransactions.push({
        id: line.id,
        date: je?.date || line.createdAt,
        type,
        typeLabel,
        reference,
        description,
        status: txnStatus,
        debit: Number(line.debitAmount || 0),
        credit: Number(line.creditAmount || 0),
      });
    }



    // Sort all raw transactions chronologically by date ascending
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Date range filtering
    let filteredTransactions = rawTransactions;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) {
      start.setHours(0, 0, 0, 0);
      filteredTransactions = filteredTransactions.filter(
        (t) => new Date(t.date) >= start
      );
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter(
        (t) => new Date(t.date) <= end
      );
    }

    // Compute running balance (Accounts Payable / Liability):
    // Credit (Purchase) increases payable, Debit (Payment) decreases payable
    let runningBalance = 0;
    let totalPurchased = 0;
    let totalPaid = 0;

    const ledger = filteredTransactions.map((tx) => {
      runningBalance += tx.credit - tx.debit;
      totalPurchased += tx.credit;
      totalPaid += tx.debit;

      return {
        ...tx,
        runningBalance,
      };
    });

    return {
      success: true,
      supplier: {
        ...supplier,
        openingBalance: Number(supplier.openingBalance || 0),
      },
      summary: {
        totalPurchased,
        totalPaid,
        closingBalance: runningBalance,
        totalTransactions: ledger.length,
      },
      ledger,
    };
  } catch (error) {
    console.error("getSupplierLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch supplier ledger",
      supplier: null,
      ledger: [],
      summary: { totalPurchased: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
    };
  }
}

/**
 * Get warehouses list and default user warehouse for Supplier forms
 */
export async function getWarehousesForSupplier() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", warehouses: [], defaultWarehouseId: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultWarehouseId: true },
    });

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

    return { success: true, warehouses, defaultWarehouseId: user?.defaultWarehouseId || null };
  } catch (error) {
    console.error("getWarehousesForSupplier error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouses",
      warehouses: [],
      defaultWarehouseId: null,
    };
  }
}


