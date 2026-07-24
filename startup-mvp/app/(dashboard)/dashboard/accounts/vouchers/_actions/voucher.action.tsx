"use server";

import { determineAccountType } from "@/lib/payment-account-config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { createUserLog, LogAction } from "@/lib/user-log";
import { isControlAccount } from "./accounting-helpers";
import { isPeriodLocked } from "../../periods/_actions/period.action";

/**
 * Generate unique voucher number
 * Format: VCH-YYYY-XXXX (e.g., VCH-2025-0001)
 */
async function generateVoucherNumber(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VCH-${year}-`;
  const client = tx || prisma;
  
  // Find the highest number for this year
  const lastVoucher = await client.voucher.findFirst({
    where: {
      voucherNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      voucherNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastVoucher) {
    const lastNumber = parseInt(lastVoucher.voucherNumber.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Generate unique journal entry number
 * Format: JE-YYYY-XXXX (e.g., JE-2025-0001)
 */
async function generateJournalEntryNumber(tx?: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;
  const client = tx || prisma;
  
  // Find the highest number for this year
  const lastEntry = await client.journalEntry.findFirst({
    where: {
      entryNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      entryNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastEntry) {
    const lastNumber = parseInt(lastEntry.entryNumber.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Validate voucher lines for double-entry accounting
 * Returns { valid: boolean, error?: string }
 */
function validateVoucherLines(lines: Array<{ debitAmount: number; creditAmount: number }>): {
  valid: boolean;
  error?: string;
} {
  // Minimum 2 lines required
  if (lines.length < 2) {
    return {
      valid: false,
      error: "Voucher must have at least 2 lines",
    };
  }

  // Calculate totals
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);

  // Check double-entry balance (allow small floating point differences)
  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > 0.01) {
    return {
      valid: false,
      error: `Double-entry balance mismatch: Debit total (${totalDebit.toFixed(2)}) must equal Credit total (${totalCredit.toFixed(2)})`,
    };
  }

  // Validate each line has either debit or credit (not both, not neither)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasDebit = Number(line.debitAmount || 0) > 0;
    const hasCredit = Number(line.creditAmount || 0) > 0;

    if (hasDebit && hasCredit) {
      return {
        valid: false,
        error: `Line ${i + 1}: Cannot have both debit and credit amounts`,
      };
    }

    if (!hasDebit && !hasCredit) {
      return {
        valid: false,
        error: `Line ${i + 1}: Must have either debit or credit amount`,
      };
    }
  }

  return { valid: true };
}

/**
 * Get paginated list of vouchers with search and filters
 */
export async function listVouchers(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "draft" | "posted" | "cancelled" | "all" = "all",
  type?: string,
  dateFrom?: Date | string,
  dateTo?: Date | string,
  warehouseId?: string
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        vouchers: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.vouchers", "read") ||
                    await hasPermission(session.user.id, "accounts.vouchers", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view vouchers",
        vouchers: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;
    const where: Prisma.VoucherWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { voucherNumber: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (status === "draft") {
      where.status = "draft";
    } else if (status === "posted") {
      where.status = "posted";
    } else if (status === "cancelled") {
      where.status = "cancelled";
    } else if (status === "all") {
      // Show all statuses
    }

    // Type filter
    if (type) {
      where.type = type as any;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = typeof dateFrom === "string" ? new Date(dateFrom) : dateFrom;
      }
      if (dateTo) {
        const toDate = typeof dateTo === "string" ? new Date(dateTo) : dateTo;
        // Set to end of day
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    // Warehouse filter
    if (warehouseId) {
      if (warehouseId === "none") {
        where.id = "none";
      } else {
        where.OR = [
          { warehouseId },
          { sales: { some: { warehouseId } } },
          { purchases: { some: { warehouseId } } },
          { productionOrders: { some: { warehouseId } } },
          { inventoryAdjustment: { warehouseId } },
          { inventoryDamage: { warehouseId } },
          { grns: { some: { warehouseId } } },
          { returnToVendors: { some: { warehouseId } } },
          {
            User_Voucher_createdByToUser: {
              defaultWarehouseId: warehouseId,
            },
          },
          {
            VoucherLine: {
              some: {
                ChartOfAccount: {
                  CashBankAccount: {
                    warehouses: {
                      some: { id: warehouseId },
                    },
                  },
                },
              },
            },
          },
        ];
      }
    }

    // Get total count
    const total = await prisma.voucher.count({ where });

    // Get vouchers
    const vouchers = await prisma.voucher.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        voucherNumber: true,
        date: true,
        type: true,
        reference: true,
        description: true,
        status: true,
        createdBy: true,
        postedById: true,
        postedAt: true,
        clientId: true,
        supplierId: true,
        userId: true,
        organizationId: true,
        User_Voucher_createdByToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        User_Voucher_postedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Organization: {
          select: {
            id: true,
            name: true,
          },
        },
        VoucherLine: {
          select: {
            id: true,
            lineNumber: true,
            debitAmount: true,
            creditAmount: true,
            description: true,
            chartOfAccountId: true,
            ChartOfAccount: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            lineNumber: "asc",
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize Decimal fields and map relation names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serializedVouchers = vouchers.map((voucher: any) => {
      const { User_Voucher_createdByToUser, User_Voucher_postedByIdToUser, Client, Supplier, Organization, VoucherLine, ...voucherWithoutRelations } = voucher;
      return {
        ...voucherWithoutRelations,
        creator: User_Voucher_createdByToUser,
        postedBy: User_Voucher_postedByIdToUser,
        client: Client,
        supplier: Supplier,
        organization: Organization,
        voucherLines: (VoucherLine || []).map((line: any) => ({
          ...line,
          chartOfAccount: line.ChartOfAccount,
          debitAmount: Number(line.debitAmount),
          creditAmount: Number(line.creditAmount),
        })),
      };
    });

    return {
      success: true,
      vouchers: serializedVouchers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("listVouchers error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch vouchers",
      vouchers: [],
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
 * Get voucher by ID with all relations
 */
export async function getVoucherById(voucherId: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        voucher: null,
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.vouchers", "read") ||
                    await hasPermission(session.user.id, "accounts.vouchers", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view vouchers",
        voucher: null,
      };
    }

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      select: {
        id: true,
        voucherNumber: true,
        date: true,
        type: true,
        reference: true,
        description: true,
        status: true,
        createdBy: true,
        postedById: true,
        postedAt: true,
        clientId: true,
        supplierId: true,
        userId: true,
        organizationId: true,
        User_Voucher_createdByToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        User_Voucher_postedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        User_Voucher_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Organization: {
          select: {
            id: true,
            name: true,
          },
        },
        VoucherLine: {
          select: {
            id: true,
            lineNumber: true,
            debitAmount: true,
            creditAmount: true,
            description: true,
            chartOfAccountId: true,
            ChartOfAccount: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            Client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            Supplier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            Organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            lineNumber: "asc",
          },
        },
        JournalEntry: {
          select: {
            id: true,
            entryNumber: true,
            date: true,
            description: true,
            status: true,
            postedBy: true,
            postedAt: true,
            createdAt: true,
            JournalEntryLine: {
              select: {
                id: true,
                lineNumber: true,
                debitAmount: true,
                creditAmount: true,
                description: true,
                chartOfAccountId: true,
                ChartOfAccount: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    type: true,
                  },
                },
              },
              orderBy: {
                lineNumber: "asc",
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!voucher) {
      return {
        success: false,
        error: "Voucher not found",
        voucher: null,
      };
    }

    // Serialize Decimal fields and map relation names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { User_Voucher_createdByToUser, VoucherLine, JournalEntry, Client, Supplier, User_Voucher_userIdToUser, Organization, ...voucherWithoutRelations } = voucher as any;
    const serializedVoucher = {
      ...voucherWithoutRelations,
      creator: User_Voucher_createdByToUser,
      client: Client,
      supplier: Supplier,
      user: User_Voucher_userIdToUser,
      organization: Organization,
      voucherLines: (VoucherLine || []).map((line: any) => ({
        ...line,
        chartOfAccount: line.ChartOfAccount,
        client: line.Client,
        supplier: line.Supplier,
        user: line.User,
        organization: line.Organization,
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      })),
      journalEntries: (JournalEntry || []).map((entry: any) => ({
        ...entry,
        journalEntryLines: (entry.JournalEntryLine || []).map((line: any) => ({
          ...line,
          chartOfAccount: line.ChartOfAccount,
          debitAmount: Number(line.debitAmount),
          creditAmount: Number(line.creditAmount),
        })),
      })),
    };

    return {
      success: true,
      voucher: serializedVoucher,
    };
  } catch (error) {
    console.error("getVoucherById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch voucher",
      voucher: null,
    };
  }
}

/**
 * Create a new draft voucher
 */
export async function createVoucher(input: {
  date?: Date | string;
  type: string;
  reference?: string;
  description?: string;
  clientId?: string;
  supplierId?: string;
  userId?: string;
  organizationId?: string;
  warehouseId?: string;
  isSystemAction?: boolean;
  lines: Array<{
    lineNumber: number;
    debitAmount: number;
    creditAmount: number;
    description?: string;
    chartOfAccountId: string;
    clientId?: string;
    supplierId?: string;
    userId?: string;
    organizationId?: string;
  }>;
}, tx?: Prisma.TransactionClient) {
  try {
    let session = null;
    try {
      session = await auth();
    } catch (_) {}

    if (!session?.user && process.env.MOCK_ADMIN_SESSION === "true" && process.env.NODE_ENV !== "production") {
      const admin = await (tx || prisma).user.findFirst({
        where: { role: { equals: "ADMIN", mode: "insensitive" } }
      });
      if (admin) {
        session = { user: { id: admin.id, role: "ADMIN", email: admin.email, name: admin.name } } as any;
      }
    }

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        voucher: null,
      };
    }

    const client = tx || prisma;

    // Check permission
    if (!input.isSystemAction) {
      const canCreate = await hasPermission(session.user.id, "accounts.vouchers", "create");

      if (!canCreate) {
        return {
          success: false,
          error: "You do not have permission to create vouchers",
          voucher: null,
        };
      }
    }

    // Accounting Period Lock Check
    if (await isPeriodLocked(input.date || new Date())) {
      return {
        success: false,
        error: "Cannot create voucher in a locked accounting period.",
        voucher: null,
      };
    }

    // Validate voucher lines
    const validation = validateVoucherLines(input.lines);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        voucher: null,
      };
    }

    // Validate all chart of accounts exist and check for control accounts
    // Filter out undefined/null IDs to prevent Prisma error, and deduplicate for correct count check
    const rawAccountIds = input.lines.map((line) => line.chartOfAccountId).filter(id => !!id);
    const uniqueAccountIds = [...new Set(rawAccountIds)];

    const accounts = await client.chartOfAccount.findMany({
      where: {
        id: { in: uniqueAccountIds },
        status: "active",
      },
      select: { 
        id: true,
        code: true,
        name: true,
        type: true,
        isControl: true,
        CashBankAccount: {
          select: { id: true, type: true }
        }
      },
    });

    if (accounts.length !== uniqueAccountIds.length) {
      return {
        success: false,
        error: "One or more chart of accounts are invalid or inactive",
        voucher: null,
      };
    }

    // Manual Voucher Type Restrictions
    const manualAllowedTypes = ["JOURNAL", "PAYMENT", "RECEIPT", "CONTRA"];
    if (!input.isSystemAction && !manualAllowedTypes.includes(input.type)) {
      return {
        success: false,
        error: `Manual creation of ${input.type} vouchers is prohibited. These are system-reserved types.`,
        voucher: null,
      };
    }

    // Manual JOURNAL/PAYMENT/RECEIPT restriction for control accounts
    if (!input.isSystemAction && ["JOURNAL", "PAYMENT", "RECEIPT"].includes(input.type)) {
      for (const account of accounts) {
        if (account.isControl) {
          return {
            success: false,
            error: `Manual ${input.type} entries to control accounts (AR, AP, Inventory) are prohibited. Please use the appropriate module (Sales, Purchases, etc.)`,
            voucher: null,
          };
        }
      }
    }

    // CONTRA validation: Only Cash, Bank, or Digital Wallet accounts allowed
    if (input.type === "CONTRA") {
      for (const account of accounts) {
        const accountType = determineAccountType({
          code: account.code,
          name: account.name,
          CashBankAccount: account.CashBankAccount
            ? { type: account.CashBankAccount.type as "CASH" | "BANK" }
            : null,
        });

        if (!accountType) {
          return {
            success: false,
            error: "Contra vouchers can only involve Cash, Bank, or Digital Wallet accounts.",
            voucher: null,
          };
        }
      }
    }

    // ===== VOUCHER TYPE-SPECIFIC ACCOUNT VALIDATION =====
    // These validations apply to MANUAL vouchers only (not isSystemAction)
    if (!input.isSystemAction) {
      // Build account lookup map
      const accountMap = new Map(accounts.map(a => [a.id, a]));

      // PAYMENT: CR must be Cash/Bank/Digital Wallet, DR must not be Revenue
      if (input.type === "PAYMENT") {
        for (const line of input.lines) {
          const account = accountMap.get(line.chartOfAccountId);
          if (!account) continue;

          // Credit side must be Cash/Bank/Digital Wallet
          if (Number(line.creditAmount) > 0) {
            const accountType = determineAccountType({
              code: account.code,
              name: account.name,
              CashBankAccount: account.CashBankAccount 
                ? { type: account.CashBankAccount.type as "CASH" | "BANK" }
                : null
            });

            if (!accountType) {
              return {
                success: false,
                error: "Payment voucher credit lines must be Cash, Bank, or Digital Wallet accounts only.",
                voucher: null,
              };
            }
          }

          // Debit side: block Revenue accounts
          if (Number(line.debitAmount) > 0) {
            if (account.type === "REVENUE") {
              return {
                success: false,
                error: "Payment vouchers cannot debit Revenue accounts.",
                voucher: null,
              };
            }
          }
        }
      }

      // RECEIPT: DR must be Cash/Bank/Digital Wallet, CR must not be Expense
      if (input.type === "RECEIPT") {
        for (const line of input.lines) {
          const account = accountMap.get(line.chartOfAccountId);
          if (!account) continue;

          // Debit side must be Cash/Bank/Digital Wallet
          if (Number(line.debitAmount) > 0) {
            const accountType = determineAccountType({
              code: account.code,
              name: account.name,
              CashBankAccount: account.CashBankAccount 
                ? { type: account.CashBankAccount.type as "CASH" | "BANK" }
                : null
            });

            if (!accountType) {
              return {
                success: false,
                error: "Receipt voucher debit lines must be Cash, Bank, or Digital Wallet accounts only.",
                voucher: null,
              };
            }
          }

          // Credit side: block Expense accounts
          if (Number(line.creditAmount) > 0) {
            if (account.type === "EXPENSE") {
              return {
                success: false,
                error: "Receipt vouchers cannot credit Expense accounts.",
                voucher: null,
              };
            }
          }
        }
      }

      // JOURNAL: Block Cash/Bank/Digital Wallet accounts (use CONTRA, PAYMENT, RECEIPT instead)
      if (input.type === "JOURNAL") {
        for (const line of input.lines) {
          const account = accountMap.get(line.chartOfAccountId);
          // Check if it's a payment account using strict config
          const accountType = account ? determineAccountType({
             code: account.code,
             name: account.name,
             CashBankAccount: account.CashBankAccount 
                ? { type: account.CashBankAccount.type as "CASH" | "BANK" }
                : null
          }) : null;

          if (accountType) {
            return {
              success: false,
              error: "Journal entries cannot involve Cash, Bank, or Digital Wallet accounts. Use Contra, Payment, or Receipt vouchers instead.",
              voucher: null,
            };
          }
        }
      }

      // CONTRA: Validate accounts allowed + From ≠ To
      if (input.type === "CONTRA") {
        const accountIdsUsed = input.lines.map(l => l.chartOfAccountId);
        const uniqueAccountIds = new Set(accountIdsUsed);
        if (uniqueAccountIds.size < 2) {
          return {
            success: false,
            error: "Contra voucher must involve at least 2 different accounts.",
            voucher: null,
          };
        }
      }
    }

    // Generate voucher number
    const voucherNumber = await generateVoucherNumber(tx);

    // --- OVERPAYMENT GUARD ---
    if (input.type === "PAYMENT" && input.supplierId) {
      const totalPaymentAmount = input.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
      
      // Calculate current AP balance for this supplier
      const supplierAccount = await client.chartOfAccount.findFirst({
        where: {
          Supplier: { some: { id: input.supplierId } }
        },
        select: { id: true }
      });

      if (supplierAccount) {
        const balanceResult = await client.journalEntryLine.aggregate({
          where: { chartOfAccountId: supplierAccount.id },
          _sum: { debitAmount: true, creditAmount: true }
        });

        const currentBalance = Number(balanceResult._sum.creditAmount || 0) - Number(balanceResult._sum.debitAmount || 0);
        
        if (totalPaymentAmount > currentBalance + 0.01) {
          return {
            success: false,
            error: `Overpayment detected. Current outstanding balance for this supplier is ৳${currentBalance.toFixed(2)}. You are attempting to pay ৳${totalPaymentAmount.toFixed(2)}.`,
            voucher: null,
          };
        }
      }
    }
    // --- END OVERPAYMENT GUARD ---

    // --- OVER-RECEIPT GUARD ---
    if (input.type === "RECEIPT" && input.clientId) {
      const totalReceiptAmount = input.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
      
      // Calculate current AR balance for this client
      const clientAccount = await client.chartOfAccount.findFirst({
        where: {
          Client: { some: { id: input.clientId } }
        },
        select: { id: true }
      });

      if (clientAccount) {
        const balanceResult = await client.journalEntryLine.aggregate({
          where: { chartOfAccountId: clientAccount.id },
          _sum: { debitAmount: true, creditAmount: true }
        });

        const currentBalance = Number(balanceResult._sum.debitAmount || 0) - Number(balanceResult._sum.creditAmount || 0);
        
        if (totalReceiptAmount > currentBalance + 0.01) {
          return {
            success: false,
            error: `Over-receipt detected. Current outstanding balance for this client is ৳${currentBalance.toFixed(2)}. You are attempting to record a receipt of ৳${totalReceiptAmount.toFixed(2)}.`,
            voucher: null,
          };
        }
      }
    }
    // --- END OVER-RECEIPT GUARD ---

    const performCreate = async (transaction: Prisma.TransactionClient) => {
      let targetWarehouseId = input.warehouseId || null;
      if (!targetWarehouseId && session.user.id) {
        const creatorUser = await transaction.user.findUnique({
          where: { id: session.user.id },
          select: { defaultWarehouseId: true },
        });
        targetWarehouseId = creatorUser?.defaultWarehouseId || null;
      }

      // Create voucher with lines
      const voucher = await transaction.voucher.create({
        data: {
          voucherNumber,
          date: input.date ? (typeof input.date === "string" ? new Date(input.date) : input.date) : new Date(),
          type: input.type as any,
          reference: input.reference || null,
          description: input.description || null,
          status: "draft",
          createdBy: session.user.id,
          clientId: input.clientId || null,
          supplierId: input.supplierId || null,
          userId: input.userId || null,
          organizationId: input.organizationId || null,
          warehouseId: targetWarehouseId,
          VoucherLine: {
            create: input.lines.map((line) => ({
              lineNumber: line.lineNumber,
              debitAmount: new Prisma.Decimal(line.debitAmount || 0),
              creditAmount: new Prisma.Decimal(line.creditAmount || 0),
              description: line.description || null,
              chartOfAccountId: line.chartOfAccountId,
              clientId: line.clientId || null,
              supplierId: line.supplierId || null,
              userId: line.userId || null,
              organizationId: line.organizationId || null,
            })),
          },
        },
        include: {
          User_Voucher_createdByToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          VoucherLine: {
            include: {
              ChartOfAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: {
              lineNumber: "asc",
            },
          },
          Client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          Supplier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          Organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Log action with detailed audit trail
      await createUserLog({
        userId: session.user.id,
        action: LogAction.ITEM_CREATED,
        details: `Created voucher: ${voucherNumber} (${input.type}) - Total: ৳${input.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0).toFixed(2)}`,
        metadata: { 
          voucherId: voucher.id, 
          voucherNumber, 
          type: input.type,
          totalDebit: input.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0),
          totalCredit: input.lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0),
          linesCount: input.lines.length,
          accounts: input.lines.map(line => ({
            accountId: line.chartOfAccountId,
            debit: Number(line.debitAmount || 0),
            credit: Number(line.creditAmount || 0),
          })),
          clientId: input.clientId || null,
          supplierId: input.supplierId || null,
        },
      });

      return voucher;
    };

    let voucher;
    if (tx) {
      voucher = await performCreate(tx);
    } else {
      voucher = await prisma.$transaction(async (t) => await performCreate(t));
    }

    // Revalidate paths
    revalidateBothPaths("accounts/vouchers", "page");

    // Serialize Decimal fields and map relation names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { User_Voucher_createdByToUser, VoucherLine, Client, Supplier, Organization, ...voucherWithoutRelations } = voucher as any;
    const serializedVoucher = {
      ...voucherWithoutRelations,
      creator: User_Voucher_createdByToUser,
      client: Client,
      supplier: Supplier,
      organization: Organization,
      voucherLines: (VoucherLine || []).map((line: any) => ({
        ...line,
        chartOfAccount: line.ChartOfAccount,
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      })),
    };

    return {
      success: true,
      voucher: serializedVoucher,
    };
  } catch (error) {
    console.error("createVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create voucher",
      voucher: null,
    };
  }
}

/**
 * Post a draft voucher (creates JournalEntry and locks voucher)
 */
export async function postVoucher(voucherId: string, tx?: Prisma.TransactionClient, isSystemAction?: boolean) {
  try {
    let session = null;
    try {
      session = await auth();
    } catch (_) {}

    if (!session?.user && process.env.MOCK_ADMIN_SESSION === "true" && process.env.NODE_ENV !== "production") {
      const admin = await (tx || prisma).user.findFirst({
        where: { role: { equals: "ADMIN", mode: "insensitive" } }
      });
      if (admin) {
        session = { user: { id: admin.id, role: "ADMIN", email: admin.email, name: admin.name } } as any;
      }
    }

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        voucher: null,
        journalEntry: null,
      };
    }

    const client = tx || prisma;

    // Check permission - allow update, approve, or edit (for UI consistency)
    if (!isSystemAction) {
      const canUpdate = await hasPermission(session.user.id, "accounts.vouchers", "update");
      const canApprove = await hasPermission(session.user.id, "accounts.vouchers", "approve");
      const canEdit = await hasPermission(session.user.id, "accounts.vouchers", "edit");

      if (!canUpdate && !canApprove && !canEdit) {
        return {
          success: false,
          error: "You do not have permission to post vouchers",
          voucher: null,
          journalEntry: null,
        };
      }
    }

    // Get voucher with lines
    const voucher = await client.voucher.findUnique({
      where: { id: voucherId },
      include: {
        VoucherLine: {
          include: {
            ChartOfAccount: true,
          },
          orderBy: {
            lineNumber: "asc",
          },
        },
      },
    });

    if (!voucher) {
      return {
        success: false,
        error: "Voucher not found",
        voucher: null,
        journalEntry: null,
      };
    }

    // Validate voucher is in draft status
    if (voucher.status !== "draft") {
      return {
        success: false,
        error: `Cannot post voucher with status "${voucher.status}". Only draft vouchers can be posted.`,
        voucher: null,
        journalEntry: null,
      };
    }

    // Accounting Period Lock Check
    if (await isPeriodLocked(voucher.date)) {
      return {
        success: false,
        error: "Cannot post voucher in a locked accounting period.",
        voucher: null,
        journalEntry: null,
      };
    }

    // Validate voucher lines
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validation = validateVoucherLines(
      ((voucher as any).VoucherLine || []).map((line: any) => ({
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      }))
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        voucher: null,
        journalEntry: null,
      };
    }

    // Check if journal entry already exists
    const existingJournalEntry = await client.journalEntry.findFirst({
      where: { voucherId: voucher.id },
    });

    if (existingJournalEntry) {
      return {
        success: false,
        error: "Journal entry already exists for this voucher",
        voucher: null,
        journalEntry: null,
      };
    }

    // Generate journal entry number
    const entryNumber = await generateJournalEntryNumber(tx);

    const performPost = async (transaction: Prisma.TransactionClient) => {
      // Create JournalEntry
      const journalEntry = await transaction.journalEntry.create({
        data: {
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          description: voucher.description || null,
          status: "posted",
          createdBy: voucher.createdBy,
          postedBy: session.user.id,
          postedAt: new Date(),
          JournalEntryLine: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: ((voucher as any).VoucherLine || []).map((line: any) => ({
              lineNumber: line.lineNumber,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description || null,
              chartOfAccountId: line.chartOfAccountId,
              clientId: line.clientId || null,
              supplierId: line.supplierId || null,
              userId: line.userId || null,
              organizationId: line.organizationId || null,
            })),
          },
        },
        include: {
          JournalEntryLine: {
            include: {
              ChartOfAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: {
              lineNumber: "asc",
            },
          },
        },
      });

      // Update voucher status
      const updatedVoucher = await transaction.voucher.update({
        where: { id: voucher.id },
        data: {
          status: "posted",
          postedById: session.user.id,
          postedAt: new Date(),
        },
        include: {
          User_Voucher_createdByToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          User_Voucher_postedByIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          VoucherLine: {
            include: {
              ChartOfAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: {
              lineNumber: "asc",
            },
          },
          JournalEntry: {
            select: {
              id: true,
              entryNumber: true,
              date: true,
              description: true,
              status: true,
              postedBy: true,
              postedAt: true,
              createdAt: true,
            },
          },
        },
      });

      // Log action with detailed audit trail
      const voucherLines = (voucher as any).VoucherLine || [];
      const postTotalDebit = voucherLines.reduce((sum: number, line: any) => sum + Number(line.debitAmount), 0);
      const postTotalCredit = voucherLines.reduce((sum: number, line: any) => sum + Number(line.creditAmount), 0);
      
      await createUserLog({
        userId: session.user.id,
        action: LogAction.ITEM_UPDATED,
        details: `Posted voucher: ${voucher.voucherNumber} (Journal Entry: ${entryNumber}) - Total: ৳${postTotalDebit.toFixed(2)}`,
        metadata: { 
          voucherId: voucher.id, 
          voucherNumber: voucher.voucherNumber,
          type: voucher.type,
          journalEntryId: journalEntry.id,
          entryNumber, 
          postedAt: new Date(),
          totalDebit: postTotalDebit,
          totalCredit: postTotalCredit,
          accounts: voucherLines.map((line: any) => ({
            accountId: line.chartOfAccountId,
            accountName: line.ChartOfAccount?.name || null,
            debit: Number(line.debitAmount),
            credit: Number(line.creditAmount),
          })),
          clientId: voucher.clientId,
          supplierId: voucher.supplierId,
        },
      });

      return { journalEntry, voucher: updatedVoucher };
    };

    let result;
    if (tx) {
      result = await performPost(tx);
    } else {
      result = await prisma.$transaction(async (t) => await performPost(t));
    }

    // Revalidate paths
    revalidateBothPaths("accounts/vouchers", "page");
    revalidateBothPaths(`accounts/vouchers/${voucherId}`, "page");

    // Serialize Decimal fields and map relation names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { User_Voucher_createdByToUser, User_Voucher_postedByIdToUser, VoucherLine, JournalEntry, ...voucherWithoutRelations } = (result.voucher as any);
    const serializedVoucher = {
      ...voucherWithoutRelations,
      creator: User_Voucher_createdByToUser,
      postedBy: User_Voucher_postedByIdToUser,
      voucherLines: (VoucherLine || []).map((line: any) => ({
        ...line,
        chartOfAccount: line.ChartOfAccount,
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      })),
    };

    const serializedJournalEntry = {
      ...result.journalEntry,
      journalEntryLines: result.journalEntry.JournalEntryLine.map((line) => ({
        ...line,
        chartOfAccount: line.ChartOfAccount,
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      })),
    };

    return {
      success: true,
      voucher: serializedVoucher,
      journalEntry: serializedJournalEntry,
    };
  } catch (error) {
    console.error("postVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post voucher",
      voucher: null,
      journalEntry: null,
    };
  }
}

/**
 * Get employee's Chart of Accounts (both salary payable and advance)
 * Used for auto-suggesting COAs in voucher forms
 */
export async function getEmployeeCOAs(employeeId: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        employee: null,
      };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        userId: true,
        salaryPayableAccountId: true,
        advanceAccountId: true,
        salaryPayableAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
        advanceAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
        employee: null,
      };
    }

    return {
      success: true,
      employee,
    };
  } catch (error) {
    console.error("getEmployeeCOAs error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee COAs",
      employee: null,
    };
  }
}

/**
 * Get employee's salary payable COA ID
 * Helper function for salary accrual and payment vouchers
 */
export async function getEmployeeSalaryPayableCOA(employeeId: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        coaId: null,
      };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        salaryPayableAccountId: true,
        salaryPayableAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
        coaId: null,
      };
    }

    if (!employee.salaryPayableAccountId || !employee.salaryPayableAccount) {
      return {
        success: false,
        error: "Employee does not have a salary payable account",
        coaId: null,
      };
    }

    if (employee.salaryPayableAccount.status !== "active") {
      return {
        success: false,
        error: "Employee's salary payable account is not active",
        coaId: null,
      };
    }

    return {
      success: true,
      coaId: employee.salaryPayableAccountId,
      coa: employee.salaryPayableAccount,
      employee: {
        id: employee.id,
        name: employee.name,
      },
    };
  } catch (error) {
    console.error("getEmployeeSalaryPayableCOA error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee salary payable COA",
      coaId: null,
    };
  }
}

/**
 * Get employee's advance COA ID (if exists)
 * Helper function for employee advance and adjustment vouchers
 */
export async function getEmployeeAdvanceCOA(employeeId: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        coaId: null,
      };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        advanceAccountId: true,
        advanceAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
        coaId: null,
      };
    }

    if (!employee.advanceAccountId || !employee.advanceAccount) {
      return {
        success: false,
        error: "Employee does not have an advance account",
        coaId: null,
      };
    }

    if (employee.advanceAccount.status !== "active") {
      return {
        success: false,
        error: "Employee's advance account is not active",
        coaId: null,
      };
    }

    return {
      success: true,
      coaId: employee.advanceAccountId,
      coa: employee.advanceAccount,
      employee: {
        id: employee.id,
        name: employee.name,
      },
    };
  } catch (error) {
    console.error("getEmployeeAdvanceCOA error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee advance COA",
      coaId: null,
    };
  }
}

/**
 * Get list of employees with their COAs for voucher forms
 * Used for employee dropdown/autocomplete in voucher UI
 */
export async function getEmployeesForVoucher() {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        employees: [],
      };
    }

    const employees = await prisma.employee.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        userId: true,
        salaryPayableAccountId: true,
        advanceAccountId: true,
        salaryPayableAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
        advanceAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      employees,
    };
  } catch (error) {
    console.error("getEmployeesForVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employees",
      employees: [],
    };
  }
}

/**
 * Update a draft voucher
 */
export async function updateVoucher(
  voucherId: string,
  input: {
    date?: Date | string;
    reference?: string;
    description?: string;
    lines: Array<{
      lineNumber: number;
      debitAmount: number;
      creditAmount: number;
      description?: string;
      chartOfAccountId: string;
    }>;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "accounts.vouchers", "edit");
    if (!canEdit) return { success: false, error: "Unauthorized" };

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      include: { VoucherLine: true },
    });

    if (!voucher) return { success: false, error: "Voucher not found" };
    if (voucher.status === "posted") {
      return { success: false, error: "Cannot edit a posted voucher. Reverse it instead." };
    }

    // Accounting Period Lock Check
    if (await isPeriodLocked(input.date || voucher.date)) {
      return { success: false, error: "Cannot update voucher in a locked accounting period." };
    }

    // Validate lines
    const validation = validateVoucherLines(input.lines);
    if (!validation.valid) return { success: false, error: validation.error };

    const updatedVoucher = await prisma.$transaction(async (tx) => {
      // Delete old lines
      await tx.voucherLine.deleteMany({ where: { voucherId } });

      // Update voucher and create new lines
      return tx.voucher.update({
        where: { id: voucherId },
        data: {
          date: input.date ? new Date(input.date) : voucher.date,
          reference: input.reference ?? voucher.reference,
          description: input.description ?? voucher.description,
          VoucherLine: {
            create: input.lines.map((line) => ({
              lineNumber: line.lineNumber,
              debitAmount: new Prisma.Decimal(line.debitAmount),
              creditAmount: new Prisma.Decimal(line.creditAmount),
              description: line.description,
              chartOfAccountId: line.chartOfAccountId,
            })),
          },
        },
      });
    });

    // Log action with detailed audit trail
    const updateTotalDebit = input.lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
    const updateTotalCredit = input.lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);
    
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Updated voucher: ${voucher.voucherNumber} - Total: ৳${updateTotalDebit.toFixed(2)}`,
      metadata: { 
        voucherId, 
        voucherNumber: voucher.voucherNumber,
        type: voucher.type,
        totalDebit: updateTotalDebit,
        totalCredit: updateTotalCredit,
        oldLinesCount: voucher.VoucherLine.length,
        newLinesCount: input.lines.length,
        accounts: input.lines.map(line => ({
          accountId: line.chartOfAccountId,
          debit: Number(line.debitAmount || 0),
          credit: Number(line.creditAmount || 0),
        })),
        clientId: voucher.clientId,
        supplierId: voucher.supplierId,
      },
    });

    revalidateBothPaths("accounts/vouchers");
    return { success: true, voucher: updatedVoucher };
  } catch (error) {
    console.error("updateVoucher error:", error);
    return { success: false, error: "Failed to update voucher" };
  }
}

/**
 * Delete a draft voucher
 */
/**
 * Cancel/Void a voucher (updates status to cancelled and deletes related journal entry)
 */
export async function cancelVoucher(voucherId: string, tx?: Prisma.TransactionClient, isSystemAction?: boolean) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const client = tx || prisma;

    if (!isSystemAction) {
      const canCancel = await hasPermission(session.user.id, "accounts.vouchers", "delete");
      if (!canCancel) return { success: false, error: "Unauthorized" };
    }

    const voucher = await client.voucher.findUnique({
      where: { id: voucherId },
      include: { JournalEntry: true },
    });

    if (!voucher) return { success: false, error: "Voucher not found" };
    
    // In a real system, you might want to create a REVERSAL journal instead of deleting.
    // For this ERP, we follow the pattern of deleting/voiding the JournalEntry to revert impact.
    
    await (client as any).$transaction(async (t: any) => {
      // 1. Delete associated Journal Entries
      await t.journalEntryLine.deleteMany({
        where: { journalEntry: { voucherId: voucher.id } }
      });
      const v = voucher as any;
      await t.voucherLine.deleteMany({
        where: { voucherId: v.id }
      });

      // 2. Update voucher status to cancelled
      await t.voucher.update({
        where: { id: voucherId },
        data: { status: "cancelled" }
      });
    });

    revalidateBothPaths("accounts/vouchers");
    return { success: true, message: "Voucher cancelled successfully" };
  } catch (error) {
    console.error("cancelVoucher error:", error);
    return { success: false, error: "Failed to cancel voucher" };
  }
}

export async function deleteVoucher(voucherId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canDelete = await hasPermission(session.user.id, "accounts.vouchers", "delete");
    if (!canDelete) return { success: false, error: "Unauthorized" };

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        VoucherLine: {
          include: {
            ChartOfAccount: {
              select: { id: true, name: true },
            },
          },
        },
        payrollAccrual: true,
        payrollPayment: true,
      },
    });

    if (!voucher) return { success: false, error: "Voucher not found" };
    if (voucher.status === "posted") {
      return { success: false, error: "Cannot delete a posted voucher. Cancel/Reverse it instead." };
    }

    if ((voucher as any).payrollAccrual || (voucher as any).payrollPayment) {
      return { 
        success: false, 
        error: "This voucher is linked to a Payroll record and cannot be manually deleted. Please void the payroll instead." 
      };
    }

    // Accounting Period Lock Check
    if (await isPeriodLocked(voucher.date)) {
      return { success: false, error: "Cannot delete voucher in a locked accounting period." };
    }

    // Calculate totals before deletion for audit log
    const deleteTotalDebit = (voucher as any).VoucherLine.reduce((sum: any, line: any) => sum + Number(line.debitAmount), 0);
    const deleteTotalCredit = (voucher as any).VoucherLine.reduce((sum: any, line: any) => sum + Number(line.creditAmount), 0);
    const deleteAccounts = (voucher as any).VoucherLine.map((line: any) => ({
      accountId: line.chartOfAccountId,
      accountName: line.ChartOfAccount?.name || null,
      debit: Number(line.debitAmount),
      credit: Number(line.creditAmount),
    }));

    await prisma.voucher.delete({ where: { id: voucherId } });

    // Log action with detailed audit trail
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Deleted voucher: ${voucher.voucherNumber} (${voucher.type}) - Total: ৳${deleteTotalDebit.toFixed(2)}`,
      metadata: { 
        voucherId, 
        voucherNumber: voucher.voucherNumber,
        type: voucher.type,
        totalDebit: deleteTotalDebit,
        totalCredit: deleteTotalCredit,
        linesCount: (voucher as any).VoucherLine.length,
        accounts: deleteAccounts,
        clientId: voucher.clientId,
        supplierId: voucher.supplierId,
      },
    });

    revalidateBothPaths("accounts/vouchers");
    return { success: true };
  } catch (error) {
    console.error("deleteVoucher error:", error);
    return { success: false, error: "Failed to delete voucher" };
  }
}

export async function getWarehouseOptionsForVoucher() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { isAdmin: false, userWarehouseId: null, warehouses: [] };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultWarehouseId: true, role: true },
    });

    const role = session?.user?.role?.toLowerCase() || dbUser?.role?.toLowerCase() || "";
    const isAdmin = role === "admin" || role === "super-admin" || role === "superadmin";

    let warehouses: Array<{ id: string; name: string }> = [];
    if (isAdmin) {
      warehouses = await prisma.warehouse.findMany({
        where: { isTrash: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    return {
      isAdmin,
      userWarehouseId: dbUser?.defaultWarehouseId || null,
      warehouses,
    };
  } catch (err) {
    console.error("getWarehouseOptionsForVoucher error:", err);
    return { isAdmin: false, userWarehouseId: null, warehouses: [] };
  }
}

