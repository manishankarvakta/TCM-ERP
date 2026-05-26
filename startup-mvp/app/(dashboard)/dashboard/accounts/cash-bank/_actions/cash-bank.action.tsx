"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { CashBankAccountType, AccountType } from "@prisma/client";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { createUserLog, LogAction } from "@/lib/user-log";
import { createVoucher, postVoucher } from "../../vouchers/_actions/voucher.action";

interface CashBankAccount {
  id: string;
  type: CashBankAccountType;
  status: string;
  isVisible: boolean;
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
  };
  warehouses?: Array<{ id: string; name: string }>;
}

interface CashBankAccountsResult {
  success: boolean;
  accounts?: {
    cash: CashBankAccount[];
    bank: CashBankAccount[];
    wallets: CashBankAccount[];
  };
  error?: string;
}

/**
 * Get all Cash & Bank accounts grouped by type
 */
export async function getCashBankAccounts(): Promise<CashBankAccountsResult> {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        accounts: {
          cash: [],
          bank: [],
          wallets: [],
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.cash-bank", "read") ||
                    await hasPermission(session.user.id, "accounts.cash-bank", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view cash & bank accounts",
        accounts: {
          cash: [],
          bank: [],
          wallets: [],
        },
      };
    }

    // Fetch all cash & bank accounts (exclude trash)
    const accounts = await prisma.cashBankAccount.findMany({
      where: {
        status: {
          not: "trash",
        },
      },
      select: {
        id: true,
        type: true,
        status: true,
        isVisible: true,
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            parentId: true,
          },
        },
        warehouses: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { type: "asc" },
        { ChartOfAccount: { code: "asc" } },
      ],
    });

    // Get IDs of COAs that are already linked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkedCoaIds = accounts.map((a) => (a as any).ChartOfAccount.id);

    // Fetch unlinked ChartOfAccounts that look like Cash/Bank (Name match & ASSET type)
    const unlinkedAccounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { notIn: linkedCoaIds },
        type: AccountType.ASSET, // Must be Assets
        status: { not: "trash" },
        OR: [
          { name: { contains: "Cash", mode: "insensitive" } },
          { name: { contains: "Bank", mode: "insensitive" } },
          { name: { contains: "Bkash", mode: "insensitive" } },
          { name: { contains: "Nagad", mode: "insensitive" } },
          { name: { contains: "Rocket", mode: "insensitive" } },
          { name: { contains: "Upay", mode: "insensitive" } },
          { name: { contains: "Wallet", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        description: true,
        parentId: true,
      },
    });

    // Group accounts by type
    const cash: CashBankAccount[] = [];
    const bank: CashBankAccount[] = [];
    const wallets: CashBankAccount[] = [];

    const isWalletName = (name: string) => {
      const n = name.toLowerCase();
      return n.includes("bkash") || n.includes("nagad") || n.includes("rocket") || n.includes("upay") || n.includes("wallet");
    };

    // Add explicitly linked accounts
    accounts.forEach((account) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coa = (account as any).ChartOfAccount;
      
      const accountData: CashBankAccount = {
        id: account.id,
        type: account.type, // Keep original DB type
        status: account.status,
        isVisible: account.isVisible,
        chartOfAccount: coa,
        warehouses: account.warehouses,
      };

      // If it looks like a wallet or has MFS type, put it in wallets
      if (account.type === CashBankAccountType.MFS || isWalletName(coa.name)) {
        wallets.push(accountData);
      } else if (account.type === CashBankAccountType.CASH) {
        cash.push(accountData);
      } else if (account.type === CashBankAccountType.BANK) {
        bank.push(accountData);
      }
    });

    // Add inferred unlinked accounts
    unlinkedAccounts.forEach((coa) => {
      const isBank = coa.name.toLowerCase().includes("bank");
      const isWallet = isWalletName(coa.name);
      
      const accountData: CashBankAccount = {
        id: `inferred-${coa.id}`, // Virtual ID
        type: isBank ? CashBankAccountType.BANK : CashBankAccountType.CASH, // Default mapping
        status: coa.status,
        isVisible: true,
        chartOfAccount: {
          id: coa.id,
          code: coa.code,
          name: coa.name,
          description: coa.description,
          parentId: coa.parentId,
        },
        warehouses: [],
      };

      if (isWallet) {
        wallets.push(accountData);
      } else if (isBank) {
        bank.push(accountData);
      } else {
        cash.push(accountData);
      }
    });

    return {
      success: true,
      accounts: {
        cash,
        bank,
        wallets,
      },
    };
  } catch (error) {
    console.error("getCashBankAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cash & bank accounts",
      accounts: {
        cash: [],
        bank: [],
        wallets: [],
      },
    };
  }
}

/**
 * Fetch all active Chart of Accounts of type ASSET that are not yet linked to any CashBankAccount
 */
export async function getUnlinkedAssetAccounts() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", accounts: [] };
    }

    const linkedAccounts = await prisma.cashBankAccount.findMany({
      select: { chartOfAccountId: true },
    });
    const linkedCoaIds = linkedAccounts.map((a) => a.chartOfAccountId);

    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { notIn: linkedCoaIds },
        type: AccountType.ASSET,
        status: "active",
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    return { success: true, accounts };
  } catch (error) {
    console.error("getUnlinkedAssetAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch unlinked asset accounts",
      accounts: [],
    };
  }
}

/**
 * Create a new CashBankAccount (and optionally the ChartOfAccount)
 */
export async function createCashBankAccount(input: {
  mode: "create" | "link";
  type: CashBankAccountType;
  status?: string;
  isVisible?: boolean;
  openingBalance?: number;
  // Create mode fields
  code?: string;
  name?: string;
  parentId?: string | null;
  description?: string | null;
  // Link mode fields
  chartOfAccountId?: string;
  warehouseIds?: string[];
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check permission
    const canCreate = await hasPermission(session.user.id, "accounts.cash-bank", "create");
    if (!canCreate) {
      return { success: false, error: "You do not have permission to create cash & bank accounts" };
    }

    const result = await prisma.$transaction(async (tx) => {
      let coaId = input.chartOfAccountId;
      let coaName = "";

      if (input.mode === "create") {
        if (!input.code || !input.name) {
          throw new Error("Account code and name are required");
        }

        // Check if code is unique
        const existingCoa = await tx.chartOfAccount.findUnique({
          where: { code: input.code },
          select: { id: true },
        });
        if (existingCoa) {
          throw new Error(`Account code "${input.code}" already exists.`);
        }

        // Create the ChartOfAccount
        const coa = await tx.chartOfAccount.create({
          data: {
            code: input.code,
            name: input.name,
            type: AccountType.ASSET,
            parentId: input.parentId || null,
            description: input.description || null,
            status: input.status || "active",
            createdBy: session.user.id,
          },
        });
        coaId = coa.id;
        coaName = coa.name;
      } else {
        if (!coaId) {
          throw new Error("Chart of Account is required");
        }
        const existingCoa = await tx.chartOfAccount.findUnique({
          where: { id: coaId },
          select: { name: true },
        });
        if (!existingCoa) {
          throw new Error("Chart of Account not found");
        }
        coaName = existingCoa.name;
      }

      // Check if CashBankAccount already exists
      const existingLink = await tx.cashBankAccount.findUnique({
        where: { chartOfAccountId: coaId },
      });
      if (existingLink) {
        throw new Error("This Chart of Account is already linked to a cash/bank account");
      }

      // Create CashBankAccount
      const cashBankAccount = await tx.cashBankAccount.create({
        data: {
          chartOfAccountId: coaId,
          type: input.type,
          status: input.status || "active",
          isVisible: input.isVisible !== undefined ? input.isVisible : true,
          createdBy: session.user.id,
          updatedAt: new Date(),
          warehouses: input.warehouseIds && input.warehouseIds.length > 0 ? {
            connect: input.warehouseIds.map(id => ({ id }))
          } : undefined
        },
        include: {
          ChartOfAccount: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }) as any;

      // Handle opening balance if provided
      if (input.openingBalance && input.openingBalance > 0) {
        await setAccountOpeningBalance(coaId, coaName, input.openingBalance, session.user.id, tx);
      }

      return cashBankAccount;
    });

    // Log the action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
      details: `Created cash/bank account linkage: ${result.ChartOfAccount.name} (${input.type})`,
    });

    revalidateBothPaths("accounts/cash-bank", "page");

    return { success: true, account: result };
  } catch (error) {
    console.error("createCashBankAccount error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create cash/bank account",
    };
  }
}

/**
 * Update an existing CashBankAccount and its linked ChartOfAccount
 */
export async function updateCashBankAccount(
  id: string,
  input: {
    type: CashBankAccountType;
    status: string;
    isVisible?: boolean;
    // ChartOfAccount fields
    code?: string;
    name?: string;
    parentId?: string | null;
    description?: string | null;
    warehouseIds?: string[];
  }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check permission
    const canEdit = await hasPermission(session.user.id, "accounts.cash-bank", "edit");
    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit cash & bank accounts" };
    }

    let isVirtual = id.startsWith("inferred-");
    let coaId = isVirtual ? id.replace("inferred-", "") : "";
    let cashBankAccountId = isVirtual ? "" : id;

    if (!isVirtual) {
      const existingLink = await prisma.cashBankAccount.findUnique({
        where: { id },
        select: { chartOfAccountId: true },
      });
      if (!existingLink) {
        return { success: false, error: "Cash & Bank account linkage not found" };
      }
      coaId = existingLink.chartOfAccountId;
    }

    // Check if ChartOfAccount exists
    const existingCoa = await prisma.chartOfAccount.findUnique({
      where: { id: coaId },
      select: { id: true, code: true },
    });
    if (!existingCoa) {
      return { success: false, error: "Linked Chart of Account not found" };
    }

    // Validate code uniqueness if changing code
    if (input.code && input.code !== existingCoa.code) {
      const codeExists = await prisma.chartOfAccount.findUnique({
        where: { code: input.code },
        select: { id: true },
      });
      if (codeExists) {
        return { success: false, error: `Account code "${input.code}" already exists.` };
      }
    }

    // Update the Chart of Account
    await prisma.chartOfAccount.update({
      where: { id: coaId },
      data: {
        code: input.code,
        name: input.name,
        parentId: input.parentId !== undefined ? (input.parentId || null) : undefined,
        description: input.description !== undefined ? (input.description || null) : undefined,
        status: input.status,
      },
    });

    let updatedAccount;

    if (isVirtual) {
      // If virtual, persist it to DB for the first time
      updatedAccount = await prisma.cashBankAccount.create({
        data: {
          chartOfAccountId: coaId,
          type: input.type,
          status: input.status,
          isVisible: input.isVisible !== undefined ? input.isVisible : true,
          createdBy: session.user.id,
          updatedAt: new Date(),
          warehouses: input.warehouseIds && input.warehouseIds.length > 0 ? {
            connect: input.warehouseIds.map(id => ({ id }))
          } : undefined
        },
        include: {
          ChartOfAccount: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }) as any;
    } else {
      // Otherwise, update the existing linkage
      // First disconnect all existing warehouses before connecting new ones
      await prisma.cashBankAccount.update({
        where: { id: cashBankAccountId },
        data: {
          warehouses: {
            set: []
          }
        }
      });

      updatedAccount = await prisma.cashBankAccount.update({
        where: { id: cashBankAccountId },
        data: {
          type: input.type,
          status: input.status,
          isVisible: input.isVisible !== undefined ? input.isVisible : true,
          warehouses: input.warehouseIds && input.warehouseIds.length > 0 ? {
            connect: input.warehouseIds.map(id => ({ id }))
          } : undefined
        },
        include: {
          ChartOfAccount: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }) as any;
    }

    // Log action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Updated cash/bank account: ${updatedAccount.ChartOfAccount.name} (${input.type})`,
    });

    revalidateBothPaths("accounts/cash-bank", "page");

    return { success: true, account: updatedAccount };
  } catch (error) {
    console.error("updateCashBankAccount error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update cash/bank account",
    };
  }
}

/**
 * Record opening balance for a cash/bank account offset by Owner's Capital (Code 3110)
 */
async function setAccountOpeningBalance(
  coaId: string,
  coaName: string,
  amount: number,
  userId: string,
  tx?: any
) {
  const client = tx || prisma;

  // Find Owner's Capital account (code "3110")
  const capitalAccount = await client.chartOfAccount.findUnique({
    where: { code: "3110" },
    select: { id: true },
  });

  if (!capitalAccount) {
    throw new Error("Owner's Capital account (Code 3110) not found. Please ensure Chart of Accounts is seeded.");
  }

  // Create opening balance voucher (JOURNAL type, marked as system action)
  const voucherResult = await createVoucher({
    date: new Date(),
    type: "JOURNAL",
    reference: "OPENING-BALANCE",
    description: `Opening Balance for ${coaName}`,
    isSystemAction: true,
    lines: [
      {
        lineNumber: 1,
        debitAmount: amount,
        creditAmount: 0,
        description: "Opening Balance Debit",
        chartOfAccountId: coaId,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: amount,
        description: "Opening Balance Credit Offset",
        chartOfAccountId: capitalAccount.id,
      },
    ],
  }, tx);

  if (!voucherResult.success || !voucherResult.voucher) {
    throw new Error(voucherResult.error || "Failed to create opening balance voucher");
  }

  // Post the voucher immediately to affect ledger
  const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
  if (!postResult.success) {
    throw new Error(postResult.error || "Failed to post opening balance voucher");
  }

  return { success: true };
}
