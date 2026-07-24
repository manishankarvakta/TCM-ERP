"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { determineAccountType } from "@/lib/payment-account-config";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string | null;
  isWarehouseSpecific?: boolean;
}

export async function getAccountsForExpenses(): Promise<{
  success: boolean;
  creditAccounts: {
    cash: AccountOption[];
    bank: AccountOption[];
    digitalWallet: AccountOption[];
  };
  debitAccounts: AccountOption[];
  isAdmin?: boolean;
  userWarehouseId?: string | null;
  warehouses?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { 
        success: false, 
        error: "Unauthorized", 
        creditAccounts: { cash: [], bank: [], digitalWallet: [] },
        debitAccounts: []
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultWarehouseId: true },
    });
    const defaultWarehouseId = user?.defaultWarehouseId || null;
    const isAdmin = session.user.role?.toLowerCase() === "admin" || session.user.role?.toLowerCase() === "super-admin" || session.user.role?.toLowerCase() === "superadmin";

    // 1. Fetch Credit Accounts (Cash, Bank, Digital Wallets)
    const assetAccounts = await prisma.chartOfAccount.findMany({
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

    const cash: AccountOption[] = [];
    const bank: AccountOption[] = [];
    const digitalWallet: AccountOption[] = [];

    assetAccounts.forEach((account) => {
      const accountType = determineAccountType({
        code: account.code,
        name: account.name,
        // @ts-ignore - Prisma relation type fix
        CashBankAccount: account.CashBankAccount,
      });

      if (!accountType) return;

      // @ts-ignore - Prisma relation type fix
      const warehouses = account.CashBankAccount?.warehouses || [];
      const isGlobal = warehouses.length === 0;
      const isLinkedToUserWarehouse = defaultWarehouseId ? warehouses.some((w: any) => w.id === defaultWarehouseId) : false;

      const accountData = {
        id: account.id,
        code: account.code,
        name: account.name,
        type: "ASSET",
        description: account.description,
        isWarehouseSpecific: isLinkedToUserWarehouse,
      };

      if (isAdmin || isGlobal || isLinkedToUserWarehouse) {
        if (accountType === "CASH") {
          cash.push(accountData);
        } else if (accountType === "BANK") {
          bank.push(accountData);
        } else if (accountType === "DIGITAL_WALLET") {
          digitalWallet.push(accountData);
        }
      }
    });

    // 2. Fetch Debit Accounts (Strictly EXPENSE accounts)
    const expenseAccounts = await prisma.chartOfAccount.findMany({
      where: {
        type: "EXPENSE",
        status: "active",
        isControl: false,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    const debitAccounts: AccountOption[] = expenseAccounts.map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: "EXPENSE",
      description: account.description,
    }));

    let warehouses: Array<{ id: string; name: string }> = [];
    if (isAdmin) {
      warehouses = await prisma.warehouse.findMany({
        where: { isTrash: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    return {
      success: true,
      creditAccounts: {
        cash,
        bank,
        digitalWallet,
      },
      debitAccounts,
      isAdmin,
      userWarehouseId: defaultWarehouseId,
      warehouses,
    };
  } catch (error) {
    console.error("getAccountsForExpenses error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch accounts",
      creditAccounts: { cash: [], bank: [], digitalWallet: [] },
      debitAccounts: [],
    };
  }
}
