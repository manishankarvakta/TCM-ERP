"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SupplierForPayment {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  supplierCode: string | null;
  chartOfAccountId: string | null;
  chartOfAccountName: string | null;
}

/**
 * Get suppliers with their AP accounts for payment vouchers
 */
export async function getSuppliersForPayment(): Promise<{
  success: boolean;
  suppliers: SupplierForPayment[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", suppliers: [] };
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        supplierCode: true,
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

    const formattedSuppliers: SupplierForPayment[] = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      company: s.company,
      supplierCode: s.supplierCode,
      chartOfAccountId: s.chartOfAccountId,
      chartOfAccountName: s.ChartOfAccount?.name || null,
    }));

    return { success: true, suppliers: formattedSuppliers };
  } catch (error) {
    console.error("getSuppliersForPayment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch suppliers",
      suppliers: [],
    };
  }
}

/**
 * Get supplier by ID with AP account
 */
export async function getSupplierById(supplierId: string): Promise<{
  success: boolean;
  supplier: SupplierForPayment | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", supplier: null };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        supplierCode: true,
        chartOfAccountId: true,
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!supplier) {
      return { success: false, error: "Supplier not found", supplier: null };
    }

    return {
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        company: supplier.company,
        supplierCode: supplier.supplierCode,
        chartOfAccountId: supplier.chartOfAccountId,
        chartOfAccountName: supplier.ChartOfAccount?.name || null,
      },
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

interface SupplierFinancialInfo {
  totalPurchases: number;
  totalPayments: number;
  outstandingBalance: number;
  lastPurchaseDate: Date | null;
  lastPaymentDate: Date | null;
}

/**
 * Get supplier financial information
 */
export async function getSupplierFinancialInfo(supplierId: string): Promise<{
  success: boolean;
  financialInfo: SupplierFinancialInfo | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", financialInfo: null };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        chartOfAccountId: true,
      },
    });

    if (!supplier || !supplier.chartOfAccountId) {
      return {
        success: true,
        financialInfo: {
          totalPurchases: 0,
          totalPayments: 0,
          outstandingBalance: 0,
          lastPurchaseDate: null,
          lastPaymentDate: null,
        },
      };
    }

    // Get all voucher lines for this supplier's AP account
    const voucherLines = await prisma.voucherLine.findMany({
      where: {
        chartOfAccountId: supplier.chartOfAccountId,
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
    let totalPurchases = 0;
    let totalPayments = 0;
    let lastPurchaseDate: Date | null = null;
    let lastPaymentDate: Date | null = null;

    voucherLines.forEach((line) => {
      // Credit to AP account = Purchase (increases liability)
      if (Number(line.creditAmount) > 0) {
        totalPurchases += Number(line.creditAmount);
        if (!lastPurchaseDate || line.Voucher.date > lastPurchaseDate) {
          lastPurchaseDate = line.Voucher.date;
        }
      }
      // Debit to AP account = Payment (decreases liability)
      if (Number(line.debitAmount) > 0) {
        totalPayments += Number(line.debitAmount);
        if (!lastPaymentDate || line.Voucher.date > lastPaymentDate) {
          lastPaymentDate = line.Voucher.date;
        }
      }
    });

    const outstandingBalance = totalPurchases - totalPayments;

    return {
      success: true,
      financialInfo: {
        totalPurchases,
        totalPayments,
        outstandingBalance,
        lastPurchaseDate,
        lastPaymentDate,
      },
    };
  } catch (error) {
    console.error("getSupplierFinancialInfo error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch supplier financial info",
      financialInfo: null,
    };
  }
}

import { determineAccountType } from "@/lib/payment-account-config";

/**
 * Get payment accounts from Chart of Accounts
 * Fetches ASSET accounts that can be used for payments (Cash, Bank, Digital Wallets)
 */
export async function getPaymentAccountsFromCOA(): Promise<{
  success: boolean;
  accounts: {
    cash: Array<{ id: string; code: string; name: string; description?: string | null }>;
    bank: Array<{ id: string; code: string; name: string; description?: string | null }>;
    digitalWallet: Array<{ id: string; code: string; name: string; description?: string | null }>;
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

    const isAdmin = session.user.role?.toLowerCase() === "admin" || session.user.role?.toLowerCase() === "super-admin" || session.user.role?.toLowerCase() === "superadmin";
    let defaultWarehouseId: string | null = null;

    if (!isAdmin) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { defaultWarehouseId: true },
      });
      defaultWarehouseId = user?.defaultWarehouseId || null;
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
            warehouses: {
              select: {
                id: true,
              },
            },
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

      const accountData = {
        id: account.id,
        code: account.code,
        name: account.name,
        description: account.description,
      };

      // Check if user is admin or if account matches user's warehouse
      const warehouses = account.CashBankAccount?.warehouses || [];
      const isLinkedToUserWarehouse = defaultWarehouseId ? warehouses.some(w => w.id === defaultWarehouseId) : false;

      if (isAdmin || isLinkedToUserWarehouse) {
        if (accountType === "CASH") {
          cash.push(accountData);
        } else if (accountType === "BANK") {
          bank.push(accountData);
        } else if (accountType === "DIGITAL_WALLET") {
          digitalWallet.push(accountData);
        }
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
    console.error("getPaymentAccountsFromCOA error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payment accounts",
      accounts: { cash: [], bank: [], digitalWallet: [] },
    };
  }
}

