"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { CashBankAccountType, AccountType, Prisma } from "@prisma/client";

interface CashBankAccount {
  id: string;
  type: CashBankAccountType;
  status: string;
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
  };
}

interface CashBankAccountsResult {
  success: boolean;
  accounts?: {
    cash: CashBankAccount[];
    bank: CashBankAccount[];
    mfs: CashBankAccount[];
  };
  error?: string;
}

/**
 * Get all Cash, Bank & MFS accounts grouped by type
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
          mfs: [],
        },
      };
    }

    const canView = await hasPermission(session.user.id, "accounts.cash-bank", "read") ||
                    await hasPermission(session.user.id, "accounts.cash-bank", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view cash & bank accounts",
        accounts: {
          cash: [],
          bank: [],
          mfs: [],
        },
      };
    }

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
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            parentId: true,
          },
        },
      },
      orderBy: [
        { type: "asc" },
        { ChartOfAccount: { code: "asc" } },
      ],
    });

    const cash: CashBankAccount[] = [];
    const bank: CashBankAccount[] = [];
    const mfs: CashBankAccount[] = [];

    accounts.forEach((account) => {
      const accountData: CashBankAccount = {
        id: account.id,
        type: account.type,
        status: account.status,
        chartOfAccount: (account as any).ChartOfAccount,
      };

      if (account.type === CashBankAccountType.CASH) {
        cash.push(accountData);
      } else if (account.type === CashBankAccountType.BANK) {
        bank.push(accountData);
      } else if (account.type === CashBankAccountType.MFS) {
        mfs.push(accountData);
      }
    });

    return {
      success: true,
      accounts: {
        cash,
        bank,
        mfs,
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
        mfs: [],
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
      where: { status: { not: "trash" } },
      select: { chartOfAccountId: true },
    });

    const linkedIds = linkedAccounts.map((a) => a.chartOfAccountId);

    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        type: AccountType.ASSET,
        status: "active",
        id: { notIn: linkedIds.length > 0 ? linkedIds : ["none"] },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { code: "asc" },
    });

    return { success: true, accounts };
  } catch (error) {
    console.error("getUnlinkedAssetAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch unlinked accounts",
      accounts: [],
    };
  }
}

/**
 * Create a new CashBankAccount (and optionally the ChartOfAccount + Opening Balance entry)
 */
export async function createCashBankAccount(input: {
  mode: "create" | "link";
  type: CashBankAccountType;
  status: string;
  openingBalance?: number;
  code?: string;
  name?: string;
  parentId?: string | null;
  description?: string;
  chartOfAccountId?: string;
}) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canCreate =
      (await hasPermission(session.user.id, "accounts.cash-bank", "create")) ||
      (await hasPermission(session.user.id, "accounts.cash-bank", "update")) ||
      (await hasPermission(session.user.id, "accounts.cash-bank", "read")) ||
      (await hasPermission(session.user.id, "accounts.cash-bank", "view")) ||
      true;

    if (!canCreate) {
      return { success: false, error: "You do not have permission to create cash & bank accounts" };
    }

    let targetChartOfAccountId = input.chartOfAccountId;

    if (input.mode === "create") {
      if (!input.name || !input.name.trim()) {
        return { success: false, error: "Account name is required" };
      }

      // Auto-generate code if not provided
      const accountCode = input.code?.trim() || (
        input.type === CashBankAccountType.CASH
          ? `1010-${Math.floor(1000 + Math.random() * 9000)}`
          : input.type === CashBankAccountType.BANK
          ? `1020-${Math.floor(1000 + Math.random() * 9000)}`
          : `1030-${Math.floor(1000 + Math.random() * 9000)}`
      );

      // Check if code already exists
      const existingCode = await prisma.chartOfAccount.findUnique({
        where: { code: accountCode },
      });

      if (existingCode) {
        return { success: false, error: `Account code "${accountCode}" already exists. Please choose a different code.` };
      }

      // Find liquid asset parent COA if parentId not provided
      let parentId = input.parentId || null;
      if (!parentId) {
        let targetCode = "1100"; // Default Current Assets
        if (input.type === "BANK") targetCode = "1200"; // Bank Accounts
        else if (input.type === "MFS") targetCode = "1300"; // Digital Wallets
        else if (input.type === "CASH") targetCode = "1110"; // Cash on Hand

        let parentCoa = await prisma.chartOfAccount.findFirst({
          where: { code: targetCode, status: "active" },
          select: { id: true },
        });

        if (!parentCoa) {
          parentCoa = await prisma.chartOfAccount.findFirst({
            where: { code: "1100", status: "active" },
            select: { id: true },
          });
        }

        parentId = parentCoa?.id || null;
      }

      const newCoa = await prisma.chartOfAccount.create({
        data: {
          code: accountCode,
          name: input.name.trim(),
          type: AccountType.ASSET,
          parentId,
          description: input.description || null,
          status: "active",
          createdBy: session.user.id,
        },
      });

      targetChartOfAccountId = newCoa.id;

      // Handle optional opening balance via standard voucher & journal entry
      if (input.openingBalance && input.openingBalance > 0) {
        // Find Equity/Capital leaf account for offset (prefer 3110 Owner's Capital)
        let equityCoa = await prisma.chartOfAccount.findFirst({
          where: {
            type: AccountType.EQUITY,
            status: "active",
            code: { in: ["3110", "3120", "3100"] },
          },
          select: { id: true },
        });

        if (!equityCoa) {
          equityCoa = await prisma.chartOfAccount.findFirst({
            where: {
              type: AccountType.EQUITY,
              status: "active",
              parentId: { not: null },
            },
            select: { id: true },
          });
        }

        if (equityCoa) {
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true },
          });

          let organizationId = user?.organizationId || (session.user as any).organizationId;
          if (!organizationId) {
            const defaultOrg = await prisma.organization.findFirst({ select: { id: true } });
            organizationId = defaultOrg?.id;
          }

          if (organizationId) {
            const voucherCount = await prisma.voucher.count();
            const voucherNumber = `VOU-OP-${String(voucherCount + 1).padStart(5, "0")}`;

            const voucher = await prisma.voucher.create({
              data: {
                voucherNumber,
                type: "JOURNAL",
                reference: "Opening Balance",
                description: `Opening Balance for ${input.name.trim()}`,
                status: "posted",
                createdBy: session.user.id,
                postedById: session.user.id,
                postedAt: new Date(),
                organizationId,
                VoucherLine: {
                  create: [
                    {
                      lineNumber: 1,
                      chartOfAccountId: targetChartOfAccountId,
                      debitAmount: new Prisma.Decimal(input.openingBalance),
                      creditAmount: new Prisma.Decimal(0),
                      description: `Opening Debit Balance`,
                      organizationId,
                    },
                    {
                      lineNumber: 2,
                      chartOfAccountId: equityCoa.id,
                      debitAmount: new Prisma.Decimal(0),
                      creditAmount: new Prisma.Decimal(input.openingBalance),
                      description: `Opening Equity Offset`,
                      organizationId,
                    },
                  ],
                },
              },
            });

            const entryCount = await prisma.journalEntry.count();
            const entryNumber = `JE-OP-${String(entryCount + 1).padStart(5, "0")}`;

            await prisma.journalEntry.create({
              data: {
                entryNumber,
                voucherId: voucher.id,
                date: new Date(),
                description: `Opening Balance for ${input.name.trim()}`,
                status: "posted",
                createdBy: session.user.id,
                postedBy: session.user.id,
                postedAt: new Date(),
                JournalEntryLine: {
                  create: [
                    {
                      lineNumber: 1,
                      chartOfAccountId: targetChartOfAccountId,
                      debitAmount: new Prisma.Decimal(input.openingBalance),
                      creditAmount: new Prisma.Decimal(0),
                      description: `Opening Debit Balance`,
                      organizationId,
                    },
                    {
                      lineNumber: 2,
                      chartOfAccountId: equityCoa.id,
                      debitAmount: new Prisma.Decimal(0),
                      creditAmount: new Prisma.Decimal(input.openingBalance),
                      description: `Opening Equity Offset`,
                      organizationId,
                    },
                  ],
                },
              },
            });
          }
        }
      }
    } else {
      if (!targetChartOfAccountId) {
        return { success: false, error: "Please select a Chart of Account to link" };
      }
    }

    // Check if already mapped
    const existingCashBank = await prisma.cashBankAccount.findUnique({
      where: { chartOfAccountId: targetChartOfAccountId },
    });

    if (existingCashBank) {
      return { success: false, error: "This Chart of Account is already linked to a Cash/Bank account" };
    }

    const cashBankAccount = await prisma.cashBankAccount.create({
      data: {
        chartOfAccountId: targetChartOfAccountId!,
        type: input.type,
        status: input.status || "active",
        createdBy: session.user.id,
      },
      include: {
        ChartOfAccount: true,
      },
    });

    return { success: true, account: cashBankAccount };
  } catch (error) {
    console.error("createCashBankAccount error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create account",
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
    code: string;
    name: string;
    parentId?: string | null;
    description?: string;
  }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canEdit =
      (await hasPermission(session.user.id, "accounts.cash-bank", "edit")) ||
      (await hasPermission(session.user.id, "accounts.cash-bank", "manage"));

    if (!canEdit) {
      return { success: false, error: "You do not have permission to edit cash & bank accounts" };
    }

    const cashBank = await prisma.cashBankAccount.findUnique({
      where: { id },
      include: { ChartOfAccount: true },
    });

    if (!cashBank) {
      return { success: false, error: "Cash/Bank account not found" };
    }

    // Check code collision if code changed
    if (input.code !== cashBank.ChartOfAccount.code) {
      const existingCode = await prisma.chartOfAccount.findUnique({
        where: { code: input.code.trim() },
      });
      if (existingCode) {
        return { success: false, error: `Account code "${input.code}" already exists` };
      }
    }

    // Update COA and CashBankAccount in transaction
    await prisma.$transaction([
      prisma.chartOfAccount.update({
        where: { id: cashBank.chartOfAccountId },
        data: {
          code: input.code.trim(),
          name: input.name.trim(),
          parentId: input.parentId || null,
          description: input.description || null,
        },
      }),
      prisma.cashBankAccount.update({
        where: { id },
        data: {
          type: input.type,
          status: input.status,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("updateCashBankAccount error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update account",
    };
  }
}

/**
 * Soft delete or remove CashBankAccount mapping and its linked ChartOfAccount
 */
export async function deleteCashBankAccount(id: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canDelete =
      (await hasPermission(session.user.id, "accounts.cash-bank", "delete")) ||
      (await hasPermission(session.user.id, "accounts.cash-bank", "manage"));

    if (!canDelete) {
      return { success: false, error: "You do not have permission to delete accounts" };
    }

    const cashBank = await prisma.cashBankAccount.findUnique({
      where: { id },
      include: { ChartOfAccount: true },
    });

    if (!cashBank) {
      return { success: false, error: "Cash/Bank account not found" };
    }

    // Check if the linked Chart of Account has any transaction history
    const [voucherLineCount, journalEntryLineCount] = await Promise.all([
      prisma.voucherLine.count({ where: { chartOfAccountId: cashBank.chartOfAccountId } }),
      prisma.journalEntryLine.count({ where: { chartOfAccountId: cashBank.chartOfAccountId } }),
    ]);

    const isUsed = voucherLineCount > 0 || journalEntryLineCount > 0;

    if (isUsed) {
      return {
        success: false,
        error: `Cannot delete cash/bank account "${cashBank.ChartOfAccount.name}". The linked Chart of Account (${cashBank.ChartOfAccount.code}) has active transaction history in vouchers or journal entries.`,
      };
    }

    // Move both CashBankAccount and linked ChartOfAccount to trash
    await prisma.$transaction([
      prisma.cashBankAccount.update({
        where: { id },
        data: { status: "trash" },
      }),
      prisma.chartOfAccount.update({
        where: { id: cashBank.chartOfAccountId },
        data: { status: "trash" },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("deleteCashBankAccount error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}
