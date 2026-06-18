"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

/**
 * Helper function to find control account by name
 * Returns account ID or null if not found
 */
async function findControlAccount(accountName: string): Promise<string | null> {
  const account = await prisma.chartOfAccount.findFirst({
    where: {
      name: {
        contains: accountName,
        mode: "insensitive",
      },
      status: "active",
    },
    select: {
      id: true,
    },
  });

  return account?.id || null;
}

/**
 * Calculate aging bucket based on transaction date
 * Returns bucket label
 */
function calculateAgingBucket(transactionDate: Date, asOfDate: Date = new Date()): string {
  const daysDiff = Math.floor((asOfDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 30) {
    return "0-30";
  } else if (daysDiff <= 60) {
    return "31-60";
  } else if (daysDiff <= 90) {
    return "61-90";
  } else {
    return "90+";
  }
}

/**
 * Get Accounts Receivable - Grouped by client with optional aging
 */
export async function getAccountsReceivable(asOfDate?: Date | string, includeAging: boolean = false) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
        clients: [],
        total: 0,
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.accounts-receivable", "read") ||
                    await hasPermission(session.user.id, "accounts.accounts-receivable", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view accounts receivable",
        asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
        clients: [],
        total: 0,
      };
    }

    // Find Accounts Receivable control account
    const arAccountId = await findControlAccount("Accounts Receivable");

    if (!arAccountId) {
      return {
        success: false,
        error: "Accounts Receivable control account not found. Please ensure it exists in Chart of Accounts.",
        asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
        clients: [],
        total: 0,
      };
    }

    // Convert asOfDate and set to end of day
    const reportDate = asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date();
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all customer COAs (child accounts of AR parent)
    // This includes all accounts where parentId = AR account ID
    const customerAccounts = await prisma.chartOfAccount.findMany({
      where: {
        parentId: arAccountId,
        status: "active",
      },
      select: {
        id: true,
      },
    });

    const customerAccountIds = customerAccounts.map((acc) => acc.id);

    // If no customer accounts exist, return empty result
    if (customerAccountIds.length === 0) {
      return {
        success: true,
        asOfDate: reportDate,
        clients: [],
        total: 0,
      };
    }

    // Get all JournalEntryLine entries for customer COAs up to asOfDate
    const arEntries = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: {
          in: customerAccountIds,
        },
        JournalEntry: {
          date: {
            lte: endOfDay,
          },
        },
      },
      include: {
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        JournalEntry: {
          select: {
            id: true,
            date: true,
            entryNumber: true,
            description: true,
            Voucher: {
              select: {
                id: true,
                voucherNumber: true,
                type: true,
                reference: true,
              },
            },
          },
        },
      },
      orderBy: {
        JournalEntry: {
          date: "asc",
        },
      },
    });

    // Group by client and calculate balances
    const clientMap = new Map<
      string,
      {
        client: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
        };
        entries: Array<{
          id: string;
          date: Date;
          entryNumber: string;
          description: string | null;
          debitAmount: number;
          creditAmount: number;
          balance: number;
          voucherNumber: string | null;
          voucherType: string | null;
          reference: string | null;
        }>;
        totalDebit: number;
        totalCredit: number;
        balance: number;
        aging?: {
          "0-30": number;
          "31-60": number;
          "61-90": number;
          "90+": number;
        };
      }
    >();

    // Get all clients with their COA IDs for mapping
    const clientsWithCOA = await prisma.client.findMany({
      where: {
        chartOfAccountId: {
          in: customerAccountIds,
        },
        status: {
          not: "trash",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        chartOfAccountId: true,
      },
    });

    // Create a map from COA ID to Client
    const coaToClientMap = new Map<string, typeof clientsWithCOA[0]>();
    clientsWithCOA.forEach((client) => {
      if (client.chartOfAccountId) {
        coaToClientMap.set(client.chartOfAccountId, client);
      }
    });

    for (const entry of arEntries) {
      // Find client by COA ID
      const client = coaToClientMap.get(entry.chartOfAccountId);
      if (!client) continue;

      const clientId = client.id;
      const debitAmount = Number(entry.debitAmount);
      const creditAmount = Number(entry.creditAmount);
      const balance = debitAmount - creditAmount; // AR is ASSET, so debit - credit

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client: {
            id: client.id,
            name: client.name || "",
            email: client.email,
            phone: client.phone,
            company: client.company,
          },
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
          ...(includeAging && {
            aging: {
              "0-30": 0,
              "31-60": 0,
              "61-90": 0,
              "90+": 0,
            },
          }),
        });
      }

      const clientData = clientMap.get(clientId)!;
      clientData.entries.push({
        id: entry.id,
        date: entry.JournalEntry.date,
        entryNumber: entry.JournalEntry.entryNumber,
        description: entry.JournalEntry.description,
        debitAmount,
        creditAmount,
        balance,
        voucherNumber: entry.JournalEntry.Voucher?.voucherNumber || null,
        voucherType: entry.JournalEntry.Voucher?.type || null,
        reference: entry.JournalEntry.Voucher?.reference || null,
      });

      clientData.totalDebit += debitAmount;
      clientData.totalCredit += creditAmount;
      clientData.balance += balance;

      // Calculate aging if requested
      if (includeAging && balance > 0) {
        const bucket = calculateAgingBucket(entry.JournalEntry.date, reportDate);
        (clientData.aging as any)[bucket] = (clientData.aging![bucket as keyof typeof clientData.aging] || 0) + balance;
      }
    }

    // Convert map to array and filter out zero balances
    const clients = Array.from(clientMap.values())
      .filter((client) => client.balance !== 0)
      .map((client) => ({
        client: client.client,
        balance: client.balance,
        totalDebit: client.totalDebit,
        totalCredit: client.totalCredit,
        entryCount: client.entries.length,
        ...(includeAging && { aging: client.aging }),
        // Include entries only if needed (can be removed for performance)
        // entries: client.entries,
      }))
      .sort((a, b) => b.balance - a.balance); // Sort by balance descending

    const total = clients.reduce((sum, client) => sum + client.balance, 0);

    return {
      success: true,
      asOfDate: reportDate,
      clients,
      total,
    };
  } catch (error) {
    console.error("getAccountsReceivable error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accounts receivable",
      asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
      clients: [],
      total: 0,
    };
  }
}

/**
 * Get Accounts Payable - Grouped by supplier with optional aging
 */
export async function getAccountsPayable(asOfDate?: Date | string, includeAging: boolean = false) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
        suppliers: [],
        total: 0,
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.accounts-payable", "read") ||
                    await hasPermission(session.user.id, "accounts.accounts-payable", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view accounts payable",
        asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
        suppliers: [],
        total: 0,
      };
    }

    // Find Accounts Payable control account
    const apAccountId = await findControlAccount("Accounts Payable");

    if (!apAccountId) {
      return {
        success: false,
        error: "Accounts Payable control account not found. Please ensure it exists in Chart of Accounts.",
        asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
        suppliers: [],
        total: 0,
      };
    }

    // Convert asOfDate and set to end of day
    const reportDate = asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date();
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all supplier COAs (child accounts of AP parent)
    // This includes all accounts where parentId = AP account ID
    const supplierAccounts = await prisma.chartOfAccount.findMany({
      where: {
        parentId: apAccountId,
        status: "active",
      },
      select: {
        id: true,
      },
    });

    const supplierAccountIds = supplierAccounts.map((acc) => acc.id);

    // If no supplier accounts exist, return empty result
    if (supplierAccountIds.length === 0) {
      return {
        success: true,
        asOfDate: reportDate,
        suppliers: [],
        total: 0,
      };
    }

    // Get all JournalEntryLine entries for supplier COAs up to asOfDate
    const apEntries = await prisma.journalEntryLine.findMany({
      where: {
        chartOfAccountId: {
          in: supplierAccountIds,
        },
        JournalEntry: {
          date: {
            lte: endOfDay,
          },
        },
      },
      include: {
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        JournalEntry: {
          select: {
            id: true,
            date: true,
            entryNumber: true,
            description: true,
            Voucher: {
              select: {
                id: true,
                voucherNumber: true,
                type: true,
                reference: true,
              },
            },
          },
        },
      },
      orderBy: {
        JournalEntry: {
          date: "asc",
        },
      },
    });

    // Group by supplier and calculate balances
    const supplierMap = new Map<
      string,
      {
        supplier: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
        };
        entries: Array<{
          id: string;
          date: Date;
          entryNumber: string;
          description: string | null;
          debitAmount: number;
          creditAmount: number;
          balance: number;
          voucherNumber: string | null;
          voucherType: string | null;
          reference: string | null;
        }>;
        totalDebit: number;
        totalCredit: number;
        balance: number;
        aging?: {
          "0-30": number;
          "31-60": number;
          "61-90": number;
          "90+": number;
        };
      }
    >();

    // Get all suppliers with their COA IDs for mapping
    const suppliersWithCOA = await prisma.supplier.findMany({
      where: {
        chartOfAccountId: {
          in: supplierAccountIds,
        },
        status: {
          not: "trash",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        chartOfAccountId: true,
      },
    });

    // Create a map from COA ID to Supplier
    const coaToSupplierMap = new Map<string, typeof suppliersWithCOA[0]>();
    suppliersWithCOA.forEach((supplier) => {
      if (supplier.chartOfAccountId) {
        coaToSupplierMap.set(supplier.chartOfAccountId, supplier);
      }
    });

    for (const entry of apEntries) {
      // Find supplier by COA ID
      const supplier = coaToSupplierMap.get(entry.chartOfAccountId);
      if (!supplier) continue;

      const supplierId = supplier.id;
      const debitAmount = Number(entry.debitAmount);
      const creditAmount = Number(entry.creditAmount);
      // AP is LIABILITY, so credit - debit (normal balance is credit)
      const balance = creditAmount - debitAmount;

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplier: {
            id: supplier.id,
            name: supplier.name || "",
            email: supplier.email,
            phone: supplier.phone,
            company: supplier.company,
          },
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
          balance: 0,
          ...(includeAging && {
            aging: {
              "0-30": 0,
              "31-60": 0,
              "61-90": 0,
              "90+": 0,
            },
          }),
        });
      }

      const supplierData = supplierMap.get(supplierId)!;
      supplierData.entries.push({
        id: entry.id,
        date: entry.JournalEntry.date,
        entryNumber: entry.JournalEntry.entryNumber,
        description: entry.JournalEntry.description,
        debitAmount,
        creditAmount,
        balance,
        voucherNumber: entry.JournalEntry.Voucher?.voucherNumber || null,
        voucherType: entry.JournalEntry.Voucher?.type || null,
        reference: entry.JournalEntry.Voucher?.reference || null,
      });

      supplierData.totalDebit += debitAmount;
      supplierData.totalCredit += creditAmount;
      supplierData.balance += balance;

      // Calculate aging if requested
      if (includeAging && balance > 0) {
        const bucket = calculateAgingBucket(entry.JournalEntry.date, reportDate);
        (supplierData.aging as any)[bucket] = (supplierData.aging![bucket as keyof typeof supplierData.aging] || 0) + balance;
      }
    }

    // Convert map to array and filter out zero balances
    const suppliers = Array.from(supplierMap.values())
      .filter((supplier) => supplier.balance !== 0)
      .map((supplier) => ({
        supplier: supplier.supplier,
        balance: supplier.balance,
        totalDebit: supplier.totalDebit,
        totalCredit: supplier.totalCredit,
        entryCount: supplier.entries.length,
        ...(includeAging && { aging: supplier.aging }),
        // Include entries only if needed (can be removed for performance)
        // entries: supplier.entries,
      }))
      .sort((a, b) => b.balance - a.balance); // Sort by balance descending

    const total = suppliers.reduce((sum, supplier) => sum + supplier.balance, 0);

    return {
      success: true,
      asOfDate: reportDate,
      suppliers,
      total,
    };
  } catch (error) {
    console.error("getAccountsPayable error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accounts payable",
      asOfDate: asOfDate ? (typeof asOfDate === "string" ? new Date(asOfDate) : asOfDate) : new Date(),
      suppliers: [],
      total: 0,
    };
  }
}

