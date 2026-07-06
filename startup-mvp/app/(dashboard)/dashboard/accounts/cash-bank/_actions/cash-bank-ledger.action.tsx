"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, CashBankAccountType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

/**
 * Get Cash ledger entries derived from JournalEntry
 * Aggregates transactions from all Cash accounts
 * Read-only operation - no create/update/delete
 */
export async function getCashLedger(
  filters?: {
    dateFrom?: Date | string;
    dateTo?: Date | string;
  }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.ledgers", "read") ||
                    await hasPermission(session.user.id, "accounts.ledgers", "view") ||
                    await hasPermission(session.user.id, "accounts.cash-bank", "read") ||
                    await hasPermission(session.user.id, "accounts.cash-bank", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view ledgers",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
        },
      };
    }

    // Validate date range if both dates provided
    if (filters?.dateFrom && filters?.dateTo) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      
      if (dateFrom > dateTo) {
        return {
          success: false,
          error: "Start date must be before or equal to end date",
          ledger: [],
          summary: {
            totalDebit: 0,
            totalCredit: 0,
          },
        };
      }
    }

    // Get all Cash account chartOfAccountIds
    const cashBankAccounts = await prisma.cashBankAccount.findMany({
      where: {
        type: CashBankAccountType.CASH,
        status: {
          not: "trash",
        },
      },
      select: {
        chartOfAccountId: true,
      },
    });

    const accountIds = cashBankAccounts.map((cb) => cb.chartOfAccountId);

    if (accountIds.length === 0) {
      return {
        success: true,
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
        },
      };
    }

    // Build date filter for JournalEntry
    const journalEntryDateFilter: Prisma.DateTimeFilter = {};
    if (filters?.dateFrom) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      journalEntryDateFilter.gte = dateFrom;
    }
    if (filters?.dateTo) {
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      // Set to end of day
      dateTo.setHours(23, 59, 59, 999);
      journalEntryDateFilter.lte = dateTo;
    }

    // Query JournalEntryLine filtered by Cash account IDs and date range
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: { in: accountIds },
        JournalEntry: {
          ...(Object.keys(journalEntryDateFilter).length > 0 && { date: journalEntryDateFilter }),
        },
      },
      include: {
        JournalEntry: {
          include: {
            Voucher: {
              select: {
                id: true,
                voucherNumber: true,
                type: true,
                reference: true,
                description: true,
                status: true,
              },
            },
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
      orderBy: [
        { JournalEntry: { date: "desc" } },
        { JournalEntry: { entryNumber: "desc" } },
      ],
    });

    // Calculate summary totals
    let totalDebit = 0;
    let totalCredit = 0;

    ledgerLines.forEach((line: any) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    // Serialize Decimal fields and format response
    const serializedLedger = ledgerLines.map((line: any) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
      description: line.description,
      journalEntry: {
        id: line.journalEntry.id,
        entryNumber: line.journalEntry.entryNumber,
        date: line.journalEntry.date,
        description: line.journalEntry.description,
        status: line.journalEntry.status,
        postedAt: line.journalEntry.postedAt,
        voucher: line.journalEntry.voucher
          ? {
              id: line.journalEntry.voucher.id,
              voucherNumber: line.journalEntry.voucher.voucherNumber,
              type: line.journalEntry.voucher.type,
              reference: line.journalEntry.voucher.reference,
              description: line.journalEntry.voucher.description,
              status: line.journalEntry.voucher.status,
            }
          : null,
      },
      chartOfAccount: {
        id: (line as any).ChartOfAccount.id,
        code: (line as any).ChartOfAccount.code,
        name: (line as any).ChartOfAccount.name,
        type: (line as any).ChartOfAccount.type,
      },
      client: (line as any).Client
        ? {
            id: (line as any).Client.id,
            name: (line as any).Client.name,
            email: (line as any).Client.email,
          }
        : null,
      supplier: (line as any).Supplier
        ? {
            id: (line as any).Supplier.id,
            name: (line as any).Supplier.name,
            email: (line as any).Supplier.email,
          }
        : null,
      user: (line as any).User
        ? {
            id: (line as any).User.id,
            name: (line as any).User.name,
            email: (line as any).User.email,
          }
        : null,
      organization: line.organization
        ? {
            id: line.organization.id,
            name: line.organization.name,
          }
        : null,
      createdAt: line.createdAt,
    }));

    return {
      success: true,
      ledger: serializedLedger,
      summary: {
        totalDebit,
        totalCredit,
      },
    };
  } catch (error) {
    console.error("getCashLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cash ledger",
      ledger: [],
      summary: {
        totalDebit: 0,
        totalCredit: 0,
      },
    };
  }
}

/**
 * Get Bank ledger entries derived from JournalEntry
 * Aggregates transactions from all Bank accounts
 * Read-only operation - no create/update/delete
 */
export async function getBankLedger(
  filters?: {
    dateFrom?: Date | string;
    dateTo?: Date | string;
  }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.ledgers", "read") ||
                    await hasPermission(session.user.id, "accounts.ledgers", "view") ||
                    await hasPermission(session.user.id, "accounts.cash-bank", "read") ||
                    await hasPermission(session.user.id, "accounts.cash-bank", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view ledgers",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
        },
      };
    }

    // Validate date range if both dates provided
    if (filters?.dateFrom && filters?.dateTo) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      
      if (dateFrom > dateTo) {
        return {
          success: false,
          error: "Start date must be before or equal to end date",
          ledger: [],
          summary: {
            totalDebit: 0,
            totalCredit: 0,
          },
        };
      }
    }

    // Get all Bank account chartOfAccountIds
    const cashBankAccounts = await prisma.cashBankAccount.findMany({
      where: {
        type: CashBankAccountType.BANK,
        status: {
          not: "trash",
        },
      },
      select: {
        chartOfAccountId: true,
      },
    });

    const accountIds = cashBankAccounts.map((cb) => cb.chartOfAccountId);

    if (accountIds.length === 0) {
      return {
        success: true,
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
        },
      };
    }

    // Build date filter for JournalEntry
    const journalEntryDateFilter: Prisma.DateTimeFilter = {};
    if (filters?.dateFrom) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      journalEntryDateFilter.gte = dateFrom;
    }
    if (filters?.dateTo) {
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      // Set to end of day
      dateTo.setHours(23, 59, 59, 999);
      journalEntryDateFilter.lte = dateTo;
    }

    // Query JournalEntryLine filtered by Bank account IDs and date range
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: { in: accountIds },
        JournalEntry: {
          ...(Object.keys(journalEntryDateFilter).length > 0 && { date: journalEntryDateFilter }),
        },
      },
      include: {
        JournalEntry: {
          include: {
            Voucher: {
              select: {
                id: true,
                voucherNumber: true,
                type: true,
                reference: true,
                description: true,
                status: true,
              },
            },
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
      orderBy: [
        { JournalEntry: { date: "desc" } },
        { JournalEntry: { entryNumber: "desc" } },
      ],
    });

    // Calculate summary totals
    let totalDebit = 0;
    let totalCredit = 0;

    ledgerLines.forEach((line: any) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    // Serialize Decimal fields and format response
    const serializedLedger = ledgerLines.map((line: any) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
      description: line.description,
      journalEntry: {
        id: line.journalEntry.id,
        entryNumber: line.journalEntry.entryNumber,
        date: line.journalEntry.date,
        description: line.journalEntry.description,
        status: line.journalEntry.status,
        postedAt: line.journalEntry.postedAt,
        voucher: line.journalEntry.voucher
          ? {
              id: line.journalEntry.voucher.id,
              voucherNumber: line.journalEntry.voucher.voucherNumber,
              type: line.journalEntry.voucher.type,
              reference: line.journalEntry.voucher.reference,
              description: line.journalEntry.voucher.description,
              status: line.journalEntry.voucher.status,
            }
          : null,
      },
      chartOfAccount: {
        id: (line as any).ChartOfAccount.id,
        code: (line as any).ChartOfAccount.code,
        name: (line as any).ChartOfAccount.name,
        type: (line as any).ChartOfAccount.type,
      },
      client: (line as any).Client
        ? {
            id: (line as any).Client.id,
            name: (line as any).Client.name,
            email: (line as any).Client.email,
          }
        : null,
      supplier: (line as any).Supplier
        ? {
            id: (line as any).Supplier.id,
            name: (line as any).Supplier.name,
            email: (line as any).Supplier.email,
          }
        : null,
      user: (line as any).User
        ? {
            id: (line as any).User.id,
            name: (line as any).User.name,
            email: (line as any).User.email,
          }
        : null,
      organization: line.organization
        ? {
            id: line.organization.id,
            name: line.organization.name,
          }
        : null,
      createdAt: line.createdAt,
    }));

    return {
      success: true,
      ledger: serializedLedger,
      summary: {
        totalDebit,
        totalCredit,
      },
    };
  } catch (error) {
    console.error("getBankLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch bank ledger",
      ledger: [],
      summary: {
        totalDebit: 0,
        totalCredit: 0,
      },
    };
  }
}

