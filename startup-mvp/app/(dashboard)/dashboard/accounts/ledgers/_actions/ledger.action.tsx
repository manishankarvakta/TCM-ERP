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
        journalEntry: {
          ...(Object.keys(journalEntryDateFilter).length > 0 && { date: journalEntryDateFilter }),
        },
      },
      include: {
        journalEntry: {
          include: {
            voucher: {
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
        journalEntry: {
          date: "asc",
        },
      },
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
        id: line.chartOfAccount.id,
        code: line.chartOfAccount.code,
        name: line.chartOfAccount.name,
        type: line.chartOfAccount.type,
      },
      client: line.client
        ? {
            id: line.client.id,
            name: line.client.name,
            email: line.client.email,
          }
        : null,
      supplier: line.supplier
        ? {
            id: line.supplier.id,
            name: line.supplier.name,
            email: line.supplier.email,
          }
        : null,
      user: line.user
        ? {
            id: line.user.id,
            name: line.user.name,
            email: line.user.email,
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
        journalEntry: {
          ...(Object.keys(journalEntryDateFilter).length > 0 && { date: journalEntryDateFilter }),
        },
      },
      include: {
        journalEntry: {
          include: {
            voucher: {
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
        journalEntry: {
          date: "asc",
        },
      },
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
      date: line.journalEntry.date,
      entryNumber: line.journalEntry.entryNumber,
      description: line.description || line.journalEntry.description,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
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
      chartOfAccount: {
        id: line.chartOfAccount.id,
        code: line.chartOfAccount.code,
        name: line.chartOfAccount.name,
        type: line.chartOfAccount.type,
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
        journalEntry: {
          ...(Object.keys(journalEntryDateFilter).length > 0 && { date: journalEntryDateFilter }),
        },
      },
      include: {
        journalEntry: {
          include: {
            voucher: {
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
        journalEntry: {
          date: "asc",
        },
      },
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
      date: line.journalEntry.date,
      entryNumber: line.journalEntry.entryNumber,
      description: line.description || line.journalEntry.description,
      debitAmount: Number(line.debitAmount),
      creditAmount: Number(line.creditAmount),
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
      chartOfAccount: {
        id: line.chartOfAccount.id,
        code: line.chartOfAccount.code,
        name: line.chartOfAccount.name,
        type: line.chartOfAccount.type,
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
          journalEntry: {
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
        journalEntry: {
          ...(Object.keys(journalEntryDateFilter).length > 0 && { date: journalEntryDateFilter }),
        },
      },
      include: {
        journalEntry: {
          include: {
            voucher: {
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
        journalEntry: {
          date: "asc",
        },
      },
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
        date: line.journalEntry.date,
        entryNumber: line.journalEntry.entryNumber,
        description: line.description || line.journalEntry.description,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance: runningBalance,
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
        chartOfAccount: {
          id: line.chartOfAccount.id,
          code: line.chartOfAccount.code,
          name: line.chartOfAccount.name,
          type: line.chartOfAccount.type,
        },
        createdAt: line.createdAt,
      };
    });

    return {
      success: true,
      ledger: formattedLedger,
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
          journalEntry: {
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
        journalEntry: {
          ...(Object.keys(journalEntryDateFilter).length > 0 && { date: journalEntryDateFilter }),
        },
      },
      include: {
        journalEntry: {
          include: {
            voucher: {
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
        journalEntry: {
          date: "asc",
        },
      },
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
        date: line.journalEntry.date,
        entryNumber: line.journalEntry.entryNumber,
        description: line.description || line.journalEntry.description,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance: runningBalance,
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
        chartOfAccount: {
          id: line.chartOfAccount.id,
          code: line.chartOfAccount.code,
          name: line.chartOfAccount.name,
          type: line.chartOfAccount.type,
        },
        createdAt: line.createdAt,
      };
    });

    return {
      success: true,
      ledger: formattedLedger,
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

