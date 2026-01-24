"use server";

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
async function generateVoucherNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VCH-${year}-`;
  
  // Find the highest number for this year
  const lastVoucher = await prisma.voucher.findFirst({
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
async function generateJournalEntryNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JE-${year}-`;
  
  // Find the highest number for this year
  const lastEntry = await prisma.journalEntry.findFirst({
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
  dateTo?: Date | string
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
            clientId: true,
            supplierId: true,
            userId: true,
            organizationId: true,
            chartOfAccount: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            organization: {
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
        journalEntries: {
          select: {
            id: true,
            entryNumber: true,
            date: true,
            description: true,
            status: true,
            postedBy: true,
            postedAt: true,
            createdAt: true,
            journalEntryLines: {
              select: {
                id: true,
                lineNumber: true,
                debitAmount: true,
                creditAmount: true,
                description: true,
                chartOfAccountId: true,
                chartOfAccount: {
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
    const { User_Voucher_createdByToUser, VoucherLine, JournalEntry, ...voucherWithoutRelations } = voucher as any;
    const serializedVoucher = {
      ...voucherWithoutRelations,
      creator: User_Voucher_createdByToUser,
      voucherLines: (VoucherLine || []).map((line: any) => ({
        ...line,
        chartOfAccount: line.ChartOfAccount,
        debitAmount: Number(line.debitAmount),
        creditAmount: Number(line.creditAmount),
      })),
      journalEntries: (JournalEntry || []).map((entry: any) => ({
        ...entry,
        journalEntryLines: (entry.JournalEntryLine || []).map((line: any) => ({
          ...line,
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
}) {
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
    const canCreate = await hasPermission(session.user.id, "accounts.vouchers", "create");

    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create vouchers",
        voucher: null,
      };
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
    const accountIds = input.lines.map((line) => line.chartOfAccountId);
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { in: accountIds },
        status: "active",
      },
      select: { 
        id: true,
        name: true,
        isControl: true,
        CashBankAccount: {
          select: { id: true }
        }
      },
    });

    if (accounts.length !== accountIds.length) {
      return {
        success: false,
        error: "One or more chart of accounts are invalid or inactive",
        voucher: null,
      };
    }

    // Manual Voucher Type Restrictions
    const manualAllowedTypes = ["JOURNAL", "PAYMENT", "RECEIPT", "CONTRA"];
    if (!manualAllowedTypes.includes(input.type)) {
      return {
        success: false,
        error: `Manual creation of ${input.type} vouchers is prohibited. These are system-reserved types.`,
        voucher: null,
      };
    }

    // Manual JOURNAL/PAYMENT/RECEIPT restriction for control accounts
    if (["JOURNAL", "PAYMENT", "RECEIPT"].includes(input.type)) {
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

    // CONTRA validation: Only Cash and Bank accounts allowed
    if (input.type === "CONTRA") {
      for (const account of accounts) {
        if (!account.CashBankAccount) {
          return {
            success: false,
            error: "Contra vouchers can only involve Cash or Bank accounts.",
            voucher: null,
          };
        }
      }
    }

    // Generate voucher number
    const voucherNumber = await generateVoucherNumber();

    // --- OVERPAYMENT GUARD ---
    if (input.type === "PAYMENT" && input.supplierId) {
      const totalPaymentAmount = input.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
      
      // Calculate current AP balance for this supplier
      const supplierAccount = await prisma.chartOfAccount.findFirst({
        where: {
          Supplier: { some: { id: input.supplierId } }
        },
        select: { id: true }
      });

      if (supplierAccount) {
        const balanceResult = await prisma.journalEntryLine.aggregate({
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
      const clientAccount = await prisma.chartOfAccount.findFirst({
        where: {
          Client: { some: { id: input.clientId } }
        },
        select: { id: true }
      });

      if (clientAccount) {
        const balanceResult = await prisma.journalEntryLine.aggregate({
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

    // Create voucher with lines
    const voucher = await prisma.voucher.create({
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
        voucherLines: {
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
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
      details: `Created voucher: ${voucherNumber} (${input.type})`,
      metadata: { 
        voucherId: voucher.id, 
        voucherNumber, 
        type: input.type,
        linesCount: input.lines.length,
        grandTotal: input.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0)
      },
    });

    // Revalidate paths
    revalidateBothPaths("accounts/vouchers", "page");

    // Serialize Decimal fields and map relation names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { User_Voucher_createdByToUser, VoucherLine, ...voucherWithoutRelations } = voucher as any;
    const serializedVoucher = {
      ...voucherWithoutRelations,
      creator: User_Voucher_createdByToUser,
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
export async function postVoucher(voucherId: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        voucher: null,
        journalEntry: null,
      };
    }

    // Check permission - allow update, approve, or edit (for UI consistency)
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

    // Get voucher with lines
    const voucher = await prisma.voucher.findUnique({
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
    const existingJournalEntry = await prisma.journalEntry.findFirst({
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
    const entryNumber = await generateJournalEntryNumber();

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create JournalEntry
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          description: voucher.description || null,
          status: "posted",
          createdBy: voucher.createdBy,
          postedBy: session.user.id,
          postedAt: new Date(),
          journalEntryLines: {
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
          journalEntryLines: {
            include: {
              chartOfAccount: {
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
      const updatedVoucher = await tx.voucher.update({
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
          journalEntries: {
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

      return { journalEntry, voucher: updatedVoucher };
    });

    // Log action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Posted voucher: ${voucher.voucherNumber} (Journal Entry: ${entryNumber})`,
      metadata: { 
        voucherId: voucher.id, 
        entryNumber, 
        postedAt: new Date(),
        totalAmount: ((voucher as any).VoucherLine || []).reduce((sum: number, line: any) => sum + Number(line.debitAmount), 0)
      },
    });

    // Revalidate paths
    revalidateBothPaths("accounts/vouchers", "page");
    revalidateBothPaths(`accounts/vouchers/${voucherId}`, "page");

    // Serialize Decimal fields and map relation names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { User_Voucher_createdByToUser, User_Voucher_postedByIdToUser, VoucherLine, ...voucherWithoutRelations } = (result.voucher as any);
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
      journalEntryLines: result.journalEntry.journalEntryLines.map((line) => ({
        ...line,
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
          voucherLines: {
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

    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Updated voucher: ${voucher.voucherNumber}`,
      metadata: { 
        voucherId, 
        oldStatus: voucher.status,
        oldLinesCount: voucher.VoucherLine.length,
        newLinesCount: input.lines.length 
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
export async function deleteVoucher(voucherId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canDelete = await hasPermission(session.user.id, "accounts.vouchers", "delete");
    if (!canDelete) return { success: false, error: "Unauthorized" };

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) return { success: false, error: "Voucher not found" };
    if (voucher.status === "posted") {
      return { success: false, error: "Cannot delete a posted voucher. Cancel/Reverse it instead." };
    }

    // Accounting Period Lock Check
    if (await isPeriodLocked(voucher.date)) {
      return { success: false, error: "Cannot delete voucher in a locked accounting period." };
    }

    await prisma.voucher.delete({ where: { id: voucherId } });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Deleted voucher: ${voucher.voucherNumber}`,
      metadata: { voucherId, voucherNumber: voucher.voucherNumber },
    });

    revalidateBothPaths("accounts/vouchers");
    return { success: true };
  } catch (error) {
    console.error("deleteVoucher error:", error);
    return { success: false, error: "Failed to delete voucher" };
  }
}

