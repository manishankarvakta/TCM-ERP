"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { determineAccountType } from "@/lib/payment-account-config";

interface ClientForReceipt {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  clientCode: string | null;
  chartOfAccountId: string | null;
  chartOfAccountName: string | null;
}

/**
 * Get clients with their AR accounts for receipt vouchers
 */
export async function getClientsForReceipt(): Promise<{
  success: boolean;
  clients: ClientForReceipt[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", clients: [] };
    }

    const clients = await prisma.client.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        clientCode: true,
        chartOfAccountId: true,
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedClients: ClientForReceipt[] = clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company,
      clientCode: c.clientCode,
      chartOfAccountId: c.chartOfAccountId,
      chartOfAccountName: c.ChartOfAccount?.name || null,
    }));

    return { success: true, clients: formattedClients };
  } catch (error) {
    console.error("getClientsForReceipt error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      clients: [],
    };
  }
}

/**
 * Get client by ID with AR account
 */
export async function getClientById(clientId: string): Promise<{
  success: boolean;
  client: ClientForReceipt | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", client: null };
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        clientCode: true,
        chartOfAccountId: true,
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!client) {
      return { success: false, error: "Client not found", client: null };
    }

    return {
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
        clientCode: client.clientCode,
        chartOfAccountId: client.chartOfAccountId,
        chartOfAccountName: client.ChartOfAccount?.name || null,
      },
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

interface ClientFinancialInfo {
  totalSales: number;
  totalReceipts: number;
  outstandingBalance: number;
  lastSaleDate: Date | null;
  lastReceiptDate: Date | null;
}

/**
 * Get client financial information
 */
export async function getClientFinancialInfo(clientId: string): Promise<{
  success: boolean;
  financialInfo: ClientFinancialInfo | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", financialInfo: null };
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        chartOfAccountId: true,
      },
    });

    if (!client || !client.chartOfAccountId) {
      return {
        success: true,
        financialInfo: {
          totalSales: 0,
          totalReceipts: 0,
          outstandingBalance: 0,
          lastSaleDate: null,
          lastReceiptDate: null,
        },
      };
    }

    // Get all voucher lines for this client's AR account
    const voucherLines = await prisma.voucherLine.findMany({
      where: {
        chartOfAccountId: client.chartOfAccountId,
        Voucher: {
          status: "posted",
        },
      },
      select: {
        debitAmount: true,
        creditAmount: true,
        Voucher: {
          select: {
            date: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate totals
    let totalSales = 0;
    let totalReceipts = 0;
    let lastSaleDate: Date | null = null;
    let lastReceiptDate: Date | null = null;

    voucherLines.forEach((line) => {
      const debit = Number(line.debitAmount);
      const credit = Number(line.creditAmount);

      // Debit to AR increases Sales/Receivables
      if (debit > 0) {
        totalSales += debit;
        if (!lastSaleDate) lastSaleDate = line.Voucher.date;
      }

      // Credit to AR decreases Sales (Payments/Receipts)
      if (credit > 0) {
        totalReceipts += credit;
        if (!lastReceiptDate) lastReceiptDate = line.Voucher.date;
      }
    });

    // Outstanding Balance = Total Debits (Sales) - Total Credits (Collctions)
    const outstandingBalance = totalSales - totalReceipts;

    return {
      success: true,
      financialInfo: {
        totalSales,
        totalReceipts,
        outstandingBalance,
        lastSaleDate,
        lastReceiptDate,
      },
    };
  } catch (error) {
    console.error("getClientFinancialInfo error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client financial info",
      financialInfo: null,
    };
  }
}

/**
 * Get receipt accounts from Chart of Accounts
 * Fetches ASSET accounts that can be used for receipts (Cash, Bank, Digital Wallets)
 */
export async function getReceiptAccountsFromCOA(): Promise<{
  success: boolean;
  accounts: {
    cash: Array<{
      id: string;
      code: string;
      name: string;
      description?: string | null;
    }>;
    bank: Array<{
      id: string;
      code: string;
      name: string;
      description?: string | null;
    }>;
    digitalWallet: Array<{
      id: string;
      code: string;
      name: string;
      description?: string | null;
    }>;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        accounts: { cash: [], bank: [], digitalWallet: [] },
      };
    }

    // Fetch ASSET accounts from Chart of Accounts
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        type: "ASSET",
        status: "active",
        isControl: false,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        CashBankAccount: {
          select: {
            type: true,
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    // Categorize accounts by type
    const cash: Array<{ id: string; code: string; name: string; description?: string | null }> = [];
    const bank: Array<{ id: string; code: string; name: string; description?: string | null }> = [];
    const digitalWallet: Array<{ id: string; code: string; name: string; description?: string | null }> = [];

    accounts.forEach((account) => {
      // Determine account type using pattern matching configuration
      const accountType = determineAccountType({
        code: account.code,
        name: account.name,
        // @ts-ignore - Prisma return type mismatch fix
        CashBankAccount: account.CashBankAccount,
      });

      if (!accountType) return; // Skip if not a known payment account type

      // Add to appropriate array
      const accountData = {
        id: account.id,
        code: account.code,
        name: account.name,
        description: account.description,
      };

      if (accountType === "CASH") {
        cash.push(accountData);
      } else if (accountType === "BANK") {
        bank.push(accountData);
      } else if (accountType === "DIGITAL_WALLET") {
        digitalWallet.push(accountData);
      }
    });

    return {
      success: true,
      accounts: {
        cash,
        bank,
        digitalWallet,
      },
    };
  } catch (error) {
    console.error("getReceiptAccountsFromCOA error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch receipt accounts",
      accounts: { cash: [], bank: [], digitalWallet: [] },
    };
  }
}
