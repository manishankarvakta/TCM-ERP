"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { revalidatePath } from "next/cache";
import { type Prisma, AccountType, VoucherType } from "@prisma/client";
import { randomBytes } from "crypto";
import { createVoucher, postVoucher } from "../../accounts/vouchers/_actions/voucher.action";

/**
 * Get paginated list of clients with search
 */
export async function getClients(
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
        clients: [],
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
    const where: Prisma.ClientWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { clientCode: { contains: search, mode: "insensitive" } },
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
    const total = await prisma.client.count({ where });

    // Get clients
    const clients = await prisma.client.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        clientCode: true,
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
        clientType: true,
        membershipTier: true,
        membershipPoints: true,
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

    // Calculate receivable due amount for each client via their AR sub-ledger account
    const clientsWithDue = await Promise.all(
      clients.map(async (client) => {
        const coaId = client.ChartOfAccount?.id;
        if (!coaId) return { ...client, dueAmount: 0 };

        const balanceResult = await prisma.journalEntryLine.aggregate({
          where: { chartOfAccountId: coaId },
          _sum: { debitAmount: true, creditAmount: true },
        });

        // AR is an Asset account: debit increases balance, credit reduces it
        const due =
          Number(balanceResult._sum.debitAmount || 0) -
          Number(balanceResult._sum.creditAmount || 0);

        return { ...client, dueAmount: Math.max(0, due) };
      })
    );

    return {
      success: true,
      clients: clientsWithDue,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getClients error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      clients: [],
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
 * Get client by ID
 */
export async function getClientById(clientId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        client: null,
      };
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        clientCode: true,
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
        clientType: true,
        membershipNumber: true,
        membershipTier: true,
        membershipStatus: true,
        membershipPoints: true,
        membershipExpiry: true,
        itemDiscounts: {
          select: {
            id: true,
            discountType: true,
            discountValue: true,
            itemId: true,
            variantId: true,
            item: {
              select: {
                id: true,
                name: true,
                code: true,
                salesPrice: true,
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
                salesPrice: true,
                item: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        createdBy: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
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

    if (!client) {
      return {
        success: false,
        error: "Client not found",
        client: null,
      };
    }

    return {
      success: true,
      client,
    };
  } catch (error) {
    console.error("getClientById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client",
      client: null,
    };
  }
}

/**
 * Helper function to find Accounts Receivable parent account
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
export async function findAccountsReceivableParent(tx?: Prisma.TransactionClient): Promise<string | null> {
  const client = tx || prisma;
  const account = await client.chartOfAccount.findFirst({
    where: {
      name: {
        contains: "Accounts Receivable",
        mode: "insensitive",
      },
      status: "active",
      type: AccountType.ASSET,
    },
    select: {
      id: true,
    },
  });

  return account?.id || null;
}

/**
 * Helper function to generate unique client code
 * Format: CLI{NNNNNNN} (e.g., CLI1000001, CLI1000002, CLI1000003)
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
export async function generateClientCode(tx?: Prisma.TransactionClient): Promise<string> {
  const prefix = "CLI";
  const client = tx || prisma;

  // Find the highest existing code
  const lastClient = await client.client.findFirst({
    where: {
      clientCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      clientCode: "desc",
    },
    select: {
      clientCode: true,
    },
  });

  let nextNumber = 1000001;
  if (lastClient?.clientCode) {
    // Extract number from code (e.g., "CLI1000001" -> 1000001)
    const codeWithoutPrefix = lastClient.clientCode.replace(prefix, "");
    const lastNumber = parseInt(codeWithoutPrefix, 10);
    if (!isNaN(lastNumber) && lastNumber >= 1000001) {
      nextNumber = lastNumber + 1;
    }
  }

  // Always use 7 digits for 10-digit total (3 prefix + 7 digits)
  return `${prefix}${nextNumber.toString().padStart(7, "0")}`;
}

/**
 * Helper function to generate unique account code for customer
 * Format: AR-{YYYY}-{NNNN} (e.g., AR-2025-0001)
 * @param tx Optional transaction client - if provided, uses transaction for consistency
 */
export async function generateCustomerAccountCode(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AR-${year}-`;
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
 * Create a new client
 */
export async function createClient(input: {
  name?: string;
  email?: string | null;
  phone?: string;
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
  clientType?: string;
  itemDiscounts?: any;
  discounts?: any[];
  membershipNumber?: string;
  membershipTier?: string;
  membershipStatus?: string;
  membershipPoints?: number;
  membershipExpiry?: Date;
  warehouseId?: string | null;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        client: null,
      };
    }

    // Check if email already exists
    if (input.email) {
      const existingClient = await prisma.client.findUnique({
        where: { email: input.email },
      });

      if (existingClient) {
        return {
          success: false,
          error: "Client with this email already exists",
          client: null,
        };
      }
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const discountsToUse = input.itemDiscounts || (input as any).discounts;
      // Generate unique client code
      let clientCode = await generateClientCode(tx);
      
      // Ensure code doesn't exist (double-check for race conditions)
      let clientCodeExists = await tx.client.findUnique({
        where: { clientCode },
        select: { id: true },
      });

      // Retry logic for code generation (up to 10 attempts)
      let clientCodeAttempts = 0;
      while (clientCodeExists && clientCodeAttempts < 10) {
        // Extract number and increment
        const codeWithoutPrefix = clientCode.replace("CLI", "");
        const number = parseInt(codeWithoutPrefix, 10);
        if (!isNaN(number) && number >= 1000001) {
          const newNumber = number + 1;
          clientCode = `CLI${newNumber.toString().padStart(7, "0")}`;
        } else {
          // Fallback: start from 1000001
          clientCode = `CLI1000001`;
        }
        clientCodeExists = await tx.client.findUnique({
          where: { clientCode },
          select: { id: true },
        });
        clientCodeAttempts++;
      }

      if (clientCodeExists) {
        throw new Error("Unable to generate unique client code. Please try again.");
      }

      // Find Accounts Receivable parent account
      const arParentId = await findAccountsReceivableParent(tx);
      
      if (!arParentId) {
        throw new Error(
          "Accounts Receivable control account not found. Please ensure it exists in Chart of Accounts before creating clients."
        );
      }

      // Verify parent account is active
      const parentAccount = await tx.chartOfAccount.findUnique({
        where: { id: arParentId },
        select: { id: true, status: true, type: true },
      });

      if (!parentAccount || parentAccount.status !== "active") {
        throw new Error("Accounts Receivable parent account is not active");
      }

      if (parentAccount.type !== AccountType.ASSET) {
        throw new Error("Accounts Receivable parent account must be of type ASSET");
      }

      // Generate unique account code (using transaction client for consistency)
      let accountCode = await generateCustomerAccountCode(tx);
      
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
          accountCode = `AR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
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

      // Create Chart of Account for customer
      const customerName = input.name || input.email || `Client ${clientCode}`;
      const accountName = `AR - ${customerName}`;

      // Generate a unique ID for ChartOfAccount (since schema doesn't have @default(cuid()))
      const chartOfAccountId = `coa_${Date.now()}_${randomBytes(8).toString("hex")}`;

      const chartOfAccount = await tx.chartOfAccount.create({
        data: {
          id: chartOfAccountId,
          code: accountCode,
          name: accountName,
          type: AccountType.ASSET,
          parentId: arParentId,
          description: `Accounts Receivable account for customer: ${customerName}`,
          status: "active",
          createdBy: session.user.id,
          updatedAt: new Date(),
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

      let membershipTierId: string | null = null;
      if (input.membershipTier && input.membershipTier !== "NONE") {
        const mt = await tx.membershipTier.findFirst({
          where: { name: input.membershipTier, isTrash: false }
        });
        if (mt) {
          membershipTierId = mt.id;
        }
      }

      // Create client with chartOfAccountId reference
      const client = await tx.client.create({
        data: {
          name: input.name || null,
          clientCode,
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
          clientType: input.clientType || "regular",
          membershipNumber: clientCode,
          membershipTier: input.membershipTier || "NONE",
          membershipTierId: membershipTierId,
          membershipStatus: input.membershipStatus || (input.membershipTier && input.membershipTier !== "NONE" ? "ACTIVE" : "INACTIVE"),
          membershipPoints: input.membershipPoints !== undefined ? Number(input.membershipPoints) : 0,
          membershipExpiry: input.membershipExpiry ? new Date(input.membershipExpiry) : null,
          itemDiscounts: Array.isArray(discountsToUse) && discountsToUse.length > 0
            ? {
                create: discountsToUse.map((discount: any) => ({
                  itemId: discount.itemId || null,
                  variantId: discount.variantId || null,
                  discountType: (discount.discountType || "PERCENTAGE").toUpperCase(),
                  discountValue: discount.discountValue,
                })),
              }
            : undefined,
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
          clientType: true,
          itemDiscounts: {
            select: {
              id: true,
              itemId: true,
              variantId: true,
              discountType: true,
              discountValue: true,
            }
          },
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
          description: `Opening Balance for Customer: ${input.name || input.email}`,
          isSystemAction: true,
          lines: [
            {
              lineNumber: 1,
              debitAmount: input.openingBalance,
              creditAmount: 0,
              description: "Opening Balance Debit",
              chartOfAccountId: chartOfAccount.id,
            },
            {
              lineNumber: 2,
              debitAmount: 0,
              creditAmount: input.openingBalance,
              description: "Opening Balance Credit Offset",
              chartOfAccountId: capitalAccount.id,
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

      return { client, chartOfAccount };
    });

    // Log client creation
    await logItemCreated(
      session.user.id,
      "Client",
      result.client.id,
      result.client.name || result.client.email || undefined,
      { 
        name: result.client.name, 
        email: result.client.email,
        phone: result.client.phone,
        company: result.client.company,
        chartOfAccountId: result.chartOfAccount.id,
        chartOfAccountCode: result.chartOfAccount.code,
      }
    );

    // Revalidate clients page
    revalidateBothPaths("clients");

    return {
      success: true,
      client: result.client,
    };
  } catch (error) {
    console.error("createClient error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create client",
      client: null,
    };
  }
}

/**
 * Update a client
 */
export async function updateClient(input: {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string;
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
  clientType?: string;
  itemDiscounts?: any;
  discounts?: any[];
  membershipNumber?: string;
  membershipTier?: string;
  membershipStatus?: string;
  membershipPoints?: number;
  membershipExpiry?: Date;
  warehouseId?: string | null;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        client: null,
      };
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        clientCode: true,
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
        clientType: true,
        itemDiscounts: true,
      },
    });

    if (!existingClient) {
      return {
        success: false,
        error: "Client not found",
        client: null,
      };
    }

    // Check if email is being changed and if new email already exists
    if (input.email && input.email !== existingClient.email) {
      const emailExists = await prisma.client.findUnique({
        where: { email: input.email },
      });

      if (emailExists) {
        return {
          success: false,
          error: "Client with this email already exists",
          client: null,
        };
      }
    }

    // Use transaction to ensure atomicity when creating missing account
    const result = await prisma.$transaction(async (tx) => {
      const discountsToUse = input.itemDiscounts !== undefined ? input.itemDiscounts : (input as any).discounts;
      // Generate client code if missing (moved up so we have a code for fallback name)
      let clientCode = existingClient.clientCode;
      const clientName = input.name !== undefined 
        ? (input.name || input.email || clientCode || "Client") 
        : (existingClient.name || existingClient.email || existingClient.clientCode || "Client");
      let chartOfAccountId = existingClient.chartOfAccountId;
      if (!clientCode) {
        clientCode = await generateClientCode(tx);
        
        // Ensure code doesn't exist
        let clientCodeExists = await tx.client.findUnique({
          where: { clientCode },
          select: { id: true },
        });

        // Retry logic for code generation (up to 10 attempts)
        let clientCodeAttempts = 0;
        while (clientCodeExists && clientCodeAttempts < 10) {
          const codeWithoutPrefix = clientCode.replace("CLI", "");
          const number = parseInt(codeWithoutPrefix, 10);
          if (!isNaN(number)) {
            const newNumber = number + 1;
            const digits = newNumber < 1000 ? 3 : newNumber.toString().length;
            clientCode = `CLI${newNumber.toString().padStart(digits, "0")}`;
          } else {
            clientCode = `CLI${Date.now().toString().slice(-6)}`;
          }
          clientCodeExists = await tx.client.findUnique({
            where: { clientCode },
            select: { id: true },
          });
          clientCodeAttempts++;
        }

        if (clientCodeExists) {
          throw new Error("Unable to generate unique client code. Please try again.");
        }
      }

      // Check and create Accounts Receivable account if missing
      if (!chartOfAccountId) {
        // Find Accounts Receivable parent account (required)
        const arParentId = await findAccountsReceivableParent(tx);
        
        if (!arParentId) {
          throw new Error(
            "Accounts Receivable control account not found. Please ensure it exists in Chart of Accounts before updating clients."
          );
        }

        // Verify parent account is active
        const parentAccount = await tx.chartOfAccount.findUnique({
          where: { id: arParentId },
          select: { id: true, status: true, type: true },
        });

        if (!parentAccount || parentAccount.status !== "active") {
          throw new Error("Accounts Receivable parent account is not active");
        }

        if (parentAccount.type !== AccountType.ASSET) {
          throw new Error("Accounts Receivable parent account must be of type ASSET");
        }

        // Generate unique account code
        let accountCode = await generateCustomerAccountCode(tx);
        
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
            accountCode = `AR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
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

        // Create Chart of Account for customer
        const accountName = `AR - ${clientName}`;
        // Generate a unique ID for ChartOfAccount (since schema doesn't have @default(cuid()))
        const coaId = `coa_${Date.now()}_${randomBytes(8).toString("hex")}`;
        
        const chartOfAccount = await tx.chartOfAccount.create({
          data: {
            id: coaId,
            code: accountCode,
            name: accountName,
            type: AccountType.ASSET,
            parentId: arParentId,
            description: `Accounts Receivable account for customer: ${clientName}`,
            status: "active",
            createdBy: session.user.id,
            updatedAt: new Date(),
          },
        });

        chartOfAccountId = chartOfAccount.id;
      }

      let membershipTierId: string | null | undefined = undefined;
      if (input.membershipTier !== undefined) {
        if (input.membershipTier === "NONE") {
          membershipTierId = null;
        } else {
          const mt = await tx.membershipTier.findFirst({
            where: { name: input.membershipTier, isTrash: false }
          });
          membershipTierId = mt ? mt.id : null;
        }
      }

      // Build update data
      const updateData: Prisma.ClientUpdateInput = {
        name: input.name !== undefined ? (input.name || null) : undefined,
        email: input.email !== undefined ? (input.email || null) : undefined,
        phone: input.phone !== undefined ? (input.phone || null) : undefined,
        address: input.address !== undefined ? (input.address || null) : undefined,
        city: input.city !== undefined ? (input.city || null) : undefined,
        state: input.state !== undefined ? (input.state || null) : undefined,
        zip: input.zip !== undefined ? (input.zip || null) : undefined,
        country: input.country !== undefined ? (input.country || null) : undefined,
        company: input.company !== undefined ? (input.company || null) : undefined,
        image: input.image !== undefined ? (input.image || null) : undefined,
        documents: input.documents !== undefined ? input.documents : undefined,
        openingBalance: input.openingBalance !== undefined ? input.openingBalance : undefined,
        clientType: input.clientType !== undefined ? input.clientType : undefined,
        membershipNumber: clientCode,
        membershipTier: input.membershipTier !== undefined ? input.membershipTier : undefined,
        membershipTierRel: membershipTierId === undefined ? undefined : (membershipTierId ? { connect: { id: membershipTierId } } : { disconnect: true }),
        membershipStatus: input.membershipStatus !== undefined ? input.membershipStatus : (input.membershipTier !== undefined ? (input.membershipTier !== "NONE" ? "ACTIVE" : "INACTIVE") : undefined),
        membershipPoints: input.membershipPoints !== undefined ? Number(input.membershipPoints) : undefined,
        membershipExpiry: input.membershipExpiry !== undefined ? (input.membershipExpiry ? new Date(input.membershipExpiry) : null) : undefined,
      };

      if (input.warehouseId !== undefined) {
        updateData.warehouse = input.warehouseId ? { connect: { id: input.warehouseId } } : { disconnect: true };
      }

      if (input.status) {
        updateData.status = input.status;
      }

      // Add clientCode if it was generated
      if (clientCode && clientCode !== existingClient.clientCode) {
        updateData.clientCode = clientCode;
      }

      // Add ChartOfAccount if it was created
      if (chartOfAccountId && chartOfAccountId !== existingClient.chartOfAccountId) {
        updateData.ChartOfAccount = { connect: { id: chartOfAccountId } };
      }

      // Handle client discounts if provided
      if (discountsToUse !== undefined) {
        // Delete all existing discounts for this client
        await tx.clientItemDiscount.deleteMany({
          where: { clientId: input.id },
        });

        // Insert new discounts if any
        if (Array.isArray(discountsToUse) && discountsToUse.length > 0) {
          await tx.clientItemDiscount.createMany({
            data: discountsToUse.map((discount: any) => ({
              clientId: input.id,
              itemId: discount.itemId || null,
              variantId: discount.variantId || null,
              discountType: (discount.discountType || "PERCENTAGE").toUpperCase(),
              discountValue: discount.discountValue,
            })),
          });
        }
      }

      // Update client
      const client = await tx.client.update({
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
          clientType: true,
          itemDiscounts: {
            select: {
              id: true,
              itemId: true,
              variantId: true,
              discountType: true,
              discountValue: true,
            }
          },
        },
      });

      // Handle rename: Update COA name if client name changed and COA exists
      if (input.name !== undefined && input.name !== existingClient.name && chartOfAccountId) {
        const updatedClientName = input.name || input.email || clientCode || "Client";
        const accountName = `AR - ${updatedClientName}`;
        
        await tx.chartOfAccount.update({
          where: { id: chartOfAccountId },
          data: {
            name: accountName,
            description: `Accounts Receivable account for customer: ${updatedClientName}`,
          },
        });
      }

      return client;
    });

    const client = result;

    // Log client update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingClient.name) changes.push("name");
    if (input.email !== existingClient.email) changes.push("email");
    if (input.phone !== existingClient.phone) changes.push("phone");
    if (input.address !== existingClient.address) changes.push("address");
    if (input.city !== existingClient.city) changes.push("city");
    if (input.state !== existingClient.state) changes.push("state");
    if (input.zip !== existingClient.zip) changes.push("zip");
    if (input.country !== existingClient.country) changes.push("country");
    if (input.company !== existingClient.company) changes.push("company");
    if (input.image !== undefined && input.image !== existingClient.image) changes.push("image");
    if (input.status && input.status !== existingClient.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Client",
      client.id,
      changes,
      client.name || client.email || undefined,
      { 
        name: client.name, 
        email: client.email,
        phone: client.phone,
        company: client.company,
        changes 
      }
    );

    // Revalidate clients page
    revalidateBothPaths("clients");
    revalidatePath(`/dashboard/clients/${client.id}`);
    revalidatePath(`/dashboard/clients/details?id=${client.id}`);

    return {
      success: true,
      client,
    };
  } catch (error) {
    console.error("updateClient error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update client",
      client: null,
    };
  }
}

/**
 * Delete a client (moves to trash)
 */
export async function deleteClient(clientId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get client info before moving to trash for logging
    const clientToDelete = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, email: true, phone: true, company: true },
    });

    if (!clientToDelete) {
      return {
        success: false,
        error: "Client not found",
      };
    }

    // Move client to trash (soft delete)
    await prisma.client.update({
      where: { id: clientId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Client",
      clientId,
      clientToDelete.name || clientToDelete.email || undefined,
      { 
        name: clientToDelete.name, 
        email: clientToDelete.email,
        phone: clientToDelete.phone,
        company: clientToDelete.company,
      }
    );

    // Revalidate clients page
    revalidateBothPaths("clients");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteClient error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete client",
    };
  }
}

/**
 * Bulk update client status
 */
export async function bulkUpdateClientStatus(
  clientIds: string[],
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

    if (clientIds.length === 0) {
      return {
        success: false,
        error: "No clients selected",
      };
    }

    // Get client names for logging
    const clients = await prisma.client.findMany({
      where: {
        id: { in: clientIds },
      },
      select: { id: true, name: true, email: true },
    });

    // Update clients
    await prisma.client.updateMany({
      where: {
        id: { in: clientIds },
      },
      data: {
        status,
      },
    });

    // Log bulk update for each client
    for (const client of clients) {
      await logItemUpdated(
        session.user.id,
        "Client",
        client.id,
        ["status"],
        client.name || client.email || undefined,
        { name: client.name, email: client.email, status, changes: ["status"] }
      );
    }

    // Revalidate clients page
    revalidateBothPaths("clients");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateClientStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update clients",
    };
  }
}

/**
 * Delete clients permanently
 */
export async function deleteClientsPermanently(clientIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (clientIds.length === 0) {
      return {
        success: false,
        error: "No clients selected",
      };
    }

    // Get client names for logging
    const clients = await prisma.client.findMany({
      where: {
        id: { in: clientIds },
        status: "trash", // Only allow deleting clients that are in trash
      },
      select: { id: true, name: true, email: true },
    });

    if (clients.length === 0) {
      return {
        success: false,
        error: "No clients found in trash",
      };
    }

    // Log permanent deletion for each client
    for (const client of clients) {
      await logItemDeleted(
        session.user.id,
        "Client",
        client.id,
        client.name || client.email || undefined,
        { name: client.name, email: client.email }
      );
    }

    // Delete clients permanently
    await prisma.client.deleteMany({
      where: {
        id: { in: clientIds },
        status: "trash", // Only allow deleting clients that are in trash
      },
    });

    // Revalidate clients page
    revalidateBothPaths("clients");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteClientsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete clients",
    };
  }
}

/**
 * Get Client Ledger with chronological transactions and running balance
 */
export async function getClientLedger(
  clientId: string,
  startDate?: string | Date,
  endDate?: string | Date
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        client: null,
        ledger: [],
        summary: { totalBilled: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
      };
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        clientCode: true,
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
        clientType: true,
        membershipTier: true,
        membershipPoints: true,
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

    if (!client) {
      return {
        success: false,
        error: "Client not found",
        client: null,
        ledger: [],
        summary: { totalBilled: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
      };
    }

    const coaId = client.ChartOfAccount?.id;

    // Fetch all journal entry lines for this client sub-ledger account or clientId
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        OR: [
          ...(coaId ? [{ chartOfAccountId: coaId }] : []),
          { clientId: clientId },
        ],
      },
      include: {
        JournalEntry: {
          include: {
            Voucher: {
              include: {
                sales: {
                  select: { id: true, saleNumber: true },
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

    // Opening balance entry if client has openingBalance > 0 and no explicit journal entry for it
    const initialOpeningBal = Number(client.openingBalance || 0);
    const hasOpeningJournal = journalLines.some((jl) =>
      jl.description?.toLowerCase().includes("opening balance")
    );

    if (initialOpeningBal > 0 && !hasOpeningJournal) {
      rawTransactions.push({
        id: `op-bal-${client.id}`,
        date: client.createdAt,
        type: "OPENING_BALANCE",
        typeLabel: "Opening Balance",
        reference: client.clientCode || "CLI-OP",
        description: "Initial Opening Balance",
        status: "POSTED",
        debit: initialOpeningBal,
        credit: 0,
      });
    }

    // Process Journal Entry Lines
    for (const line of journalLines) {
      const je = line.JournalEntry;
      const voucher = je?.Voucher;
      const sale = voucher?.sales?.[0];

      let type = "JOURNAL";
      let typeLabel = "Journal Entry";

      if (voucher) {
        if (voucher.type === VoucherType.SALES || sale) {
          type = "SALE";
          typeLabel = "Sale";
        } else if (voucher.type === VoucherType.RECEIPT) {
          type = "RECEIPT";
          typeLabel = "Payment Receipt";
        } else if (voucher.type === VoucherType.PAYMENT) {
          type = "PAYMENT";
          typeLabel = "Refund / Payment";
        }
      }

      const reference = sale?.saleNumber || voucher?.voucherNumber || je?.entryNumber || "JE";
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

    // Compute running balance
    let runningBalance = 0;
    let totalBilled = 0;
    let totalPaid = 0;

    const ledger = filteredTransactions.map((tx) => {
      runningBalance += tx.debit - tx.credit;
      totalBilled += tx.debit;
      totalPaid += tx.credit;

      return {
        ...tx,
        runningBalance,
      };
    });

    return {
      success: true,
      client: {
        ...client,
        openingBalance: Number(client.openingBalance || 0),
      },
      summary: {
        totalBilled,
        totalPaid,
        closingBalance: runningBalance,
        totalTransactions: ledger.length,
      },
      ledger,
    };
  } catch (error) {
    console.error("getClientLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client ledger",
      client: null,
      ledger: [],
      summary: { totalBilled: 0, totalPaid: 0, closingBalance: 0, totalTransactions: 0 },
    };
  }
}

/**
 * Get warehouses list and default user warehouse for Client forms
 */
export async function getWarehousesForClient() {
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
    console.error("getWarehousesForClient error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouses",
      warehouses: [],
      defaultWarehouseId: null,
    };
  }
}


