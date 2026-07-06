"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

/**
 * Get account ledger entries derived from JournalEntry
 * Read-only operation - no create/update/delete
 */
export async function getAccountLedger(
  accountId: string,
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
          balance: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.ledgers", "read") ||
                    await hasPermission(session.user.id, "accounts.ledgers", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view ledgers",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Validate account exists and is active
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });

    if (!account) {
      return {
        success: false,
        error: "Account not found",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (account.status !== "active") {
      return {
        success: false,
        error: "Account is not active",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
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
            balance: 0,
          },
        };
      }
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

    // Query JournalEntryLine filtered by accountId and date range
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: accountId,
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

    ledgerLines.forEach((line) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    const balance = totalDebit - totalCredit;

    // Serialize Decimal fields and format response
    const serializedLedger = ledgerLines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
      description: line.description,
      journalEntry: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: (line as any).JournalEntry.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entryNumber: (line as any).JournalEntry.entryNumber,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        date: (line as any).JournalEntry.date,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (line as any).JournalEntry.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (line as any).JournalEntry.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postedAt: (line as any).JournalEntry.postedAt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        voucher: (line as any).JournalEntry.Voucher
          ? {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              id: (line as any).JournalEntry.Voucher.id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              voucherNumber: (line as any).JournalEntry.Voucher.voucherNumber,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: (line as any).JournalEntry.Voucher.type,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              reference: (line as any).JournalEntry.Voucher.reference,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              description: (line as any).JournalEntry.Voucher.description,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: (line as any).JournalEntry.Voucher.status,
            }
          : null,
      },
      chartOfAccount: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: (line as any).ChartOfAccount.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code: (line as any).ChartOfAccount.code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: (line as any).ChartOfAccount.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: (line as any).ChartOfAccount.type,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: (line as any).Client
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (line as any).Client.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (line as any).Client.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            email: (line as any).Client.email,
          }
        : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supplier: (line as any).Supplier
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (line as any).Supplier.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (line as any).Supplier.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            email: (line as any).Supplier.email,
          }
        : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: (line as any).User
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (line as any).User.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (line as any).User.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            email: (line as any).User.email,
          }
        : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organization: (line as any).Organization
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (line as any).Organization.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (line as any).Organization.name,
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
        balance,
      },
    };
  } catch (error) {
    console.error("getAccountLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch account ledger",
      ledger: [],
      summary: {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      },
    };
  }
}

/**
 * Get customer ledger entries derived from JournalEntry
 * Uses customer.chartOfAccountId to query ledger
 * Read-only operation - no create/update/delete
 */
export async function getCustomerLedger(
  customerId: string,
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
          balance: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.ledgers", "read") ||
                    await hasPermission(session.user.id, "accounts.ledgers", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view ledgers",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Get customer and their COA ID
    const customer = await prisma.client.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        chartOfAccountId: true,
        status: true,
      },
    });

    if (!customer) {
      return {
        success: false,
        error: "Customer not found",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (customer.status === "trash") {
      return {
        success: false,
        error: "Customer is deleted",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (!customer.chartOfAccountId) {
      return {
        success: false,
        error: "Customer does not have a Chart of Account assigned",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Validate date range if both dates provided
    const journalEntryDateFilter: Prisma.DateTimeFilter = {};
    if (filters?.dateFrom) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      dateFrom.setHours(0, 0, 0, 0);
      journalEntryDateFilter.gte = dateFrom;
    }
    if (filters?.dateTo) {
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      dateTo.setHours(23, 59, 59, 999);
      journalEntryDateFilter.lte = dateTo;
    }

    // Query JournalEntryLine filtered by customer's COA ID and date range
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: customer.chartOfAccountId,
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
      },
      orderBy: [
        { JournalEntry: { date: "desc" } },
        { JournalEntry: { entryNumber: "desc" } },
      ],
    });

    // Calculate summary totals
    let totalDebit = 0;
    let totalCredit = 0;

    ledgerLines.forEach((line) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    const balance = totalDebit - totalCredit;

    // Serialize Decimal fields and format response
    const formattedLedger = ledgerLines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      date: (line as any).JournalEntry.date,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entryNumber: (line as any).JournalEntry.entryNumber,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: line.description || (line as any).JournalEntry.description,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      voucher: (line as any).JournalEntry.Voucher
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (line as any).JournalEntry.Voucher.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            voucherNumber: (line as any).JournalEntry.Voucher.voucherNumber,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: (line as any).JournalEntry.Voucher.type,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reference: (line as any).JournalEntry.Voucher.reference,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            description: (line as any).JournalEntry.Voucher.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: (line as any).JournalEntry.Voucher.status,
          }
        : null,
      chartOfAccount: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: (line as any).ChartOfAccount.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code: (line as any).ChartOfAccount.code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: (line as any).ChartOfAccount.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: (line as any).ChartOfAccount.type,
      },
      createdAt: line.createdAt,
    }));

    return {
      success: true,
      ledger: formattedLedger,
      summary: {
        totalDebit,
        totalCredit,
        balance,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    };
  } catch (error) {
    console.error("getCustomerLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customer ledger",
      ledger: [],
      summary: {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      },
    };
  }
}

/**
 * Get supplier ledger entries derived from JournalEntry
 * Uses supplier.chartOfAccountId to query ledger
 * Read-only operation - no create/update/delete
 */
export async function getSupplierLedger(
  supplierId: string,
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
          balance: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.ledgers", "read") ||
                    await hasPermission(session.user.id, "accounts.ledgers", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view ledgers",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Get supplier and their COA ID
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        email: true,
        chartOfAccountId: true,
        status: true,
      },
    });

    if (!supplier) {
      return {
        success: false,
        error: "Supplier not found",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (supplier.status === "trash") {
      return {
        success: false,
        error: "Supplier is deleted",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (!supplier.chartOfAccountId) {
      return {
        success: false,
        error: "Supplier does not have a Chart of Account assigned",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Validate date range if both dates provided
    const journalEntryDateFilter: Prisma.DateTimeFilter = {};
    if (filters?.dateFrom) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      dateFrom.setHours(0, 0, 0, 0);
      journalEntryDateFilter.gte = dateFrom;
    }
    if (filters?.dateTo) {
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      dateTo.setHours(23, 59, 59, 999);
      journalEntryDateFilter.lte = dateTo;
    }

    // Query JournalEntryLine filtered by supplier's COA ID and date range
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: supplier.chartOfAccountId,
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
      },
      orderBy: [
        { JournalEntry: { date: "desc" } },
        { JournalEntry: { entryNumber: "desc" } },
      ],
    });

    // Calculate summary totals
    let totalDebit = 0;
    let totalCredit = 0;

    ledgerLines.forEach((line) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    const balance = totalDebit - totalCredit;

    // Serialize Decimal fields and format response
    const formattedLedger = ledgerLines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      date: (line as any).JournalEntry.date,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entryNumber: (line as any).JournalEntry.entryNumber,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: line.description || (line as any).JournalEntry.description,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      voucher: (line as any).JournalEntry.Voucher
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: (line as any).JournalEntry.Voucher.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            voucherNumber: (line as any).JournalEntry.Voucher.voucherNumber,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: (line as any).JournalEntry.Voucher.type,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reference: (line as any).JournalEntry.Voucher.reference,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            description: (line as any).JournalEntry.Voucher.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: (line as any).JournalEntry.Voucher.status,
          }
        : null,
      chartOfAccount: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: (line as any).ChartOfAccount.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code: (line as any).ChartOfAccount.code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: (line as any).ChartOfAccount.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: (line as any).ChartOfAccount.type,
      },
      createdAt: line.createdAt,
    }));

    return {
      success: true,
      ledger: formattedLedger,
      summary: {
        totalDebit,
        totalCredit,
        balance,
      },
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
      },
    };
  } catch (error) {
    console.error("getSupplierLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch supplier ledger",
      ledger: [],
      summary: {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      },
    };
  }
}

/**
 * Get employee salary payable ledger entries derived from JournalEntry
 * Uses employee.salaryPayableAccountId to query ledger
 * Read-only operation - no create/update/delete
 */
export async function getEmployeeLedger(
  employeeId: string,
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
          balance: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.ledgers", "read") ||
                    await hasPermission(session.user.id, "accounts.ledgers", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view ledgers",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Get employee and their COA ID
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        salaryPayableAccountId: true,
        status: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (employee.status === "trash") {
      return {
        success: false,
        error: "Employee is deleted",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (!employee.salaryPayableAccountId) {
      return {
        success: false,
        error: "Employee does not have a salary payable account assigned",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Validate date range if both dates provided
    const journalEntryDateFilter: Prisma.DateTimeFilter = {};
    let openingBalance = 0;

    if (filters?.dateFrom) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      dateFrom.setHours(0, 0, 0, 0);
      journalEntryDateFilter.gte = dateFrom;

      // Calculate opening balance (balance before dateFrom)
      const openingBalanceLines = await prisma.journalEntryLine.findMany({
        where: {
          chartOfAccountId: employee.salaryPayableAccountId,
          JournalEntry: {
            date: { lt: dateFrom },
          },
        },
        select: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      openingBalance = openingBalanceLines.reduce((sum, line) => {
        return sum + (Number(line.creditAmount) - Number(line.debitAmount)); // LIABILITY: Credit - Debit
      }, 0);
    }

    if (filters?.dateTo) {
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      dateTo.setHours(23, 59, 59, 999);
      journalEntryDateFilter.lte = dateTo;
    }

    // Validate date range
    if (filters?.dateFrom && filters?.dateTo) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      if (dateFrom > dateTo) {
        return {
          success: false,
          error: "Invalid date range: dateFrom must be before or equal to dateTo",
          ledger: [],
          summary: {
            totalDebit: 0,
            totalCredit: 0,
            balance: 0,
            openingBalance: 0,
          },
        };
      }
    }

    // Query JournalEntryLine filtered by employee's salary payable COA ID and date range
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: employee.salaryPayableAccountId,
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
      },
      orderBy: [
        { JournalEntry: { date: "asc" } },
        { JournalEntry: { entryNumber: "asc" } },
      ],
    });

    // Calculate summary totals
    let totalDebit = 0;
    let totalCredit = 0;

    ledgerLines.forEach((line) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    // For LIABILITY (salary payable): Balance = Credit - Debit
    const balance = totalCredit - totalDebit;
    const finalBalance = openingBalance + balance;

    // Calculate running balance (cumulative)
    let runningBalance = openingBalance;

    // Serialize Decimal fields and format response with running balance
    const formattedLedger = ledgerLines.map((line) => {
      const debit = Number(line.debitAmount);
      const credit = Number(line.creditAmount);
      // For LIABILITY: Credit increases balance, Debit decreases balance
      const entryBalance = credit - debit;
      runningBalance += entryBalance;

      return {
        id: line.id,
        lineNumber: line.lineNumber,
        date: (line as any).JournalEntry.date,
        entryNumber: (line as any).JournalEntry.entryNumber,
        description: line.description || (line as any).JournalEntry.description,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance: runningBalance,
        voucher: (line as any).JournalEntry.voucher
          ? {
              id: (line as any).JournalEntry.voucher.id,
              voucherNumber: (line as any).JournalEntry.voucher.voucherNumber,
              type: (line as any).JournalEntry.voucher.type,
              reference: (line as any).JournalEntry.voucher.reference,
              description: (line as any).JournalEntry.voucher.description,
              status: (line as any).JournalEntry.voucher.status,
            }
          : null,
        chartOfAccount: {
          id: (line as any).ChartOfAccount.id,
          code: (line as any).ChartOfAccount.code,
          name: (line as any).ChartOfAccount.name,
          type: (line as any).ChartOfAccount.type,
        },
        createdAt: line.createdAt,
      };
    });

    return {
      success: true,
      ledger: formattedLedger.reverse(),
      summary: {
        totalDebit,
        totalCredit,
        balance: finalBalance,
        ...(filters?.dateFrom && { openingBalance }),
      },
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
      },
    };
  } catch (error) {
    console.error("getEmployeeLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee ledger",
      ledger: [],
      summary: {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      },
    };
  }
}

/**
 * Get employee advance ledger entries derived from JournalEntry
 * Uses employee.advanceAccountId to query ledger
 * Read-only operation - no create/update/delete
 */
export async function getEmployeeAdvanceLedger(
  employeeId: string,
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
          balance: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.ledgers", "read") ||
                    await hasPermission(session.user.id, "accounts.ledgers", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view ledgers",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Get employee and their COA ID
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        advanceAccountId: true,
        status: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "Employee not found",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (employee.status === "trash") {
      return {
        success: false,
        error: "Employee is deleted",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    if (!employee.advanceAccountId) {
      return {
        success: false,
        error: "Employee does not have an advance account assigned",
        ledger: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
        },
      };
    }

    // Validate date range if both dates provided
    const journalEntryDateFilter: Prisma.DateTimeFilter = {};
    let openingBalance = 0;

    if (filters?.dateFrom) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      dateFrom.setHours(0, 0, 0, 0);
      journalEntryDateFilter.gte = dateFrom;

      // Calculate opening balance (balance before dateFrom)
      const openingBalanceLines = await prisma.journalEntryLine.findMany({
        where: {
          chartOfAccountId: employee.advanceAccountId,
          JournalEntry: {
            date: { lt: dateFrom },
          },
        },
        select: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      openingBalance = openingBalanceLines.reduce((sum, line) => {
        return sum + (Number(line.debitAmount) - Number(line.creditAmount)); // ASSET: Debit - Credit
      }, 0);
    }

    if (filters?.dateTo) {
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      dateTo.setHours(23, 59, 59, 999);
      journalEntryDateFilter.lte = dateTo;
    }

    // Validate date range
    if (filters?.dateFrom && filters?.dateTo) {
      const dateFrom = typeof filters.dateFrom === "string" ? new Date(filters.dateFrom) : filters.dateFrom;
      const dateTo = typeof filters.dateTo === "string" ? new Date(filters.dateTo) : filters.dateTo;
      if (dateFrom > dateTo) {
        return {
          success: false,
          error: "Invalid date range: dateFrom must be before or equal to dateTo",
          ledger: [],
          summary: {
            totalDebit: 0,
            totalCredit: 0,
            balance: 0,
            openingBalance: 0,
          },
        };
      }
    }

    // Query JournalEntryLine filtered by employee's advance COA ID and date range
    const ledgerLines = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: employee.advanceAccountId,
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
      },
      orderBy: [
        { JournalEntry: { date: "asc" } },
        { JournalEntry: { entryNumber: "asc" } },
      ],
    });

    // Calculate summary totals
    let totalDebit = 0;
    let totalCredit = 0;

    ledgerLines.forEach((line) => {
      totalDebit += Number(line.debitAmount);
      totalCredit += Number(line.creditAmount);
    });

    // For ASSET (advance): Balance = Debit - Credit
    const balance = totalDebit - totalCredit;
    const finalBalance = openingBalance + balance;

    // Calculate running balance (cumulative)
    let runningBalance = openingBalance;

    // Serialize Decimal fields and format response with running balance
    const formattedLedger = ledgerLines.map((line) => {
      const debit = Number(line.debitAmount);
      const credit = Number(line.creditAmount);
      // For ASSET: Debit increases balance, Credit decreases balance
      const entryBalance = debit - credit;
      runningBalance += entryBalance;

      return {
        id: line.id,
        lineNumber: line.lineNumber,
        date: line.JournalEntry.date,
        entryNumber: line.JournalEntry.entryNumber,
        description: line.description || line.JournalEntry.description,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance: runningBalance,
        voucher: line.JournalEntry.Voucher
          ? {
              id: line.JournalEntry.Voucher.id,
              voucherNumber: line.JournalEntry.Voucher.voucherNumber,
              type: line.JournalEntry.Voucher.type,
              reference: line.JournalEntry.Voucher.reference,
              description: line.JournalEntry.Voucher.description,
              status: line.JournalEntry.Voucher.status,
            }
          : null,
        chartOfAccount: {
          id: line.ChartOfAccount.id,
          code: line.ChartOfAccount.code,
          name: line.ChartOfAccount.name,
          type: line.ChartOfAccount.type,
        },
        createdAt: line.createdAt,
      };
    });

    return {
      success: true,
      ledger: formattedLedger.reverse(),
      summary: {
        totalDebit,
        totalCredit,
        balance: finalBalance,
        ...(filters?.dateFrom && { openingBalance }),
      },
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
      },
    };
  } catch (error) {
    console.error("getEmployeeAdvanceLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch employee advance ledger",
      ledger: [],
      summary: {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
      },
    };
  }
}

