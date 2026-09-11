"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { getNextSequenceNumber } from "@/lib/sequence";
import { revalidateBothPaths } from "@/lib/route-utils-server";

async function getAuthAndOrg() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const userId = session.user.id;
  const organizationId = (session.user as any)?.organizationId || "default-org";
  return { userId, organizationId };
}

/**
 * Get all Fixed Asset Accounts with debits, credits, and net book values
 */
export async function getFixedAssetAccounts() {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canView =
      (await hasPermission(userId, "accounts.chart-of-accounts", "view")) ||
      (await hasPermission(userId, "accounts.vouchers", "view"));

    if (!canView) {
      return { success: false, error: "Permission denied", assets: [] };
    }

    // Find parent Fixed Asset account (code 1700) or any code starting with 17
    const fixedAssetParent = await prisma.chartOfAccount.findFirst({
      where: {
        code: "1700",
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
      },
    });

    const assetAccounts = await prisma.chartOfAccount.findMany({
      where: {
        type: "ASSET",
        status: "active",
        AND: [
          {
            OR: [
              { code: { startsWith: "17" } },
              ...(fixedAssetParent ? [{ parentId: fixedAssetParent.id }] : []),
              { name: { contains: "Depreciation", mode: "insensitive" } },
              { name: { contains: "Fixed Asset", mode: "insensitive" } },
              { name: { contains: "Equipment", mode: "insensitive" } },
              { name: { contains: "Furniture", mode: "insensitive" } },
              { name: { contains: "Vehicle", mode: "insensitive" } },
              { name: { contains: "Hardware", mode: "insensitive" } },
              { name: { contains: "Laptop", mode: "insensitive" } },
              { name: { contains: "MacBook", mode: "insensitive" } },
            ],
          },
          ...(organizationId
            ? [
                {
                  OR: [
                    { organizationId },
                    { organizationId: null },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: { code: "asc" },
    });

    const accountBalances = await Promise.all(
      assetAccounts.map(async (acc) => {
        const aggregate = await prisma.journalEntryLine.aggregate({
          where: { chartOfAccountId: acc.id },
          _sum: {
            debitAmount: true,
            creditAmount: true,
          },
        });

        const debit = Number(aggregate._sum.debitAmount || 0);
        const credit = Number(aggregate._sum.creditAmount || 0);
        const isAccumulatedDepr = acc.name.toLowerCase().includes("accumulated") || acc.code.startsWith("179");
        // For accumulated depreciation, balance is net credit (contra-asset)
        const balance = isAccumulatedDepr ? credit - debit : debit - credit;

        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          parentId: acc.parentId,
          debit,
          credit,
          balance,
          isAccumulatedDepr,
        };
      })
    );

    const grossCost = accountBalances
      .filter((a) => !a.isAccumulatedDepr)
      .reduce((sum, a) => sum + a.balance, 0);

    const accumulatedDepreciation = accountBalances
      .filter((a) => a.isAccumulatedDepr)
      .reduce((sum, a) => sum + a.balance, 0);

    const netBookValue = grossCost - accumulatedDepreciation;

    return {
      success: true,
      assets: accountBalances,
      metrics: {
        grossCost,
        accumulatedDepreciation,
        netBookValue,
        totalAccounts: accountBalances.length,
      },
    };
  } catch (error: any) {
    console.error("Error fetching fixed asset accounts:", error);
    return { success: false, error: error.message || "Failed to fetch fixed assets", assets: [] };
  }
}

/**
 * Create a new Fixed Asset Chart of Account
 */
export async function createFixedAssetAccount(data: {
  code: string;
  name: string;
  description?: string;
  parentId?: string;
}) {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canCreate = await hasPermission(userId, "accounts.chart-of-accounts", "create");
    if (!canCreate) {
      return { success: false, error: "Permission denied to create account" };
    }

    if (!data.code || !data.name) {
      return { success: false, error: "Account code and name are required" };
    }

    // Check code uniqueness
    const existing = await prisma.chartOfAccount.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return { success: false, error: `Account code '${data.code}' already exists` };
    }

    // Default parent to 1700 if not specified
    let parentId = data.parentId;
    if (!parentId) {
      const parent = await prisma.chartOfAccount.findFirst({
        where: { code: "1700", ...(organizationId ? { organizationId } : {}) },
      });
      if (parent) parentId = parent.id;
    }

    const newAccount = await prisma.chartOfAccount.create({
      data: {
        code: data.code,
        name: data.name,
        type: "ASSET",
        description: data.description || "Fixed Asset Account",
        parentId: parentId || null,
        organizationId,
        createdBy: userId,
        status: "active",
      },
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/chart-of-accounts");

    return { success: true, account: newAccount };
  } catch (error: any) {
    console.error("Error creating fixed asset account:", error);
    return { success: false, error: error.message || "Failed to create account" };
  }
}

/**
 * Record Capitalization Entry (Debit Fixed Asset Account, Credit Cash/Bank or Accounts Payable)
 */
export async function recordCapitalizationEntry(data: {
  assetAccountId: string;
  paymentAccountId: string; // Cash/Bank/MFS or Payable COA ID
  amount: number;
  date?: string;
  description: string;
  reference?: string;
}) {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canCreate = await hasPermission(userId, "accounts.vouchers", "create");
    if (!canCreate) {
      return { success: false, error: "Permission denied to record voucher" };
    }

    if (!data.assetAccountId || !data.paymentAccountId || !data.amount || data.amount <= 0) {
      return { success: false, error: "Please provide valid accounts and a positive amount" };
    }

    const entryDate = data.date ? new Date(data.date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const voucherNum = await getNextSequenceNumber(organizationId, "VOUCHER", "VCH", entryDate.getFullYear(), 6);
      const journalNum = await getNextSequenceNumber(organizationId, "JOURNAL_ENTRY", "JE", entryDate.getFullYear(), 6);

      const voucher = await tx.voucher.create({
        data: {
          voucherNumber: voucherNum,
          type: "JOURNAL",
          date: entryDate,
          status: "posted",
          reference: data.reference || "Asset Capitalization",
          description: data.description,
          organizationId,
          createdBy: userId,
          postedById: userId,
          postedAt: entryDate,
          VoucherLine: {
            create: [
              {
                lineNumber: 1,
                chartOfAccountId: data.assetAccountId,
                debitAmount: new Prisma.Decimal(data.amount),
                creditAmount: new Prisma.Decimal(0),
                description: `Asset Capitalization: ${data.description}`,
              },
              {
                lineNumber: 2,
                chartOfAccountId: data.paymentAccountId,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(data.amount),
                description: `Asset Capitalization Funding: ${data.description}`,
              },
            ],
          },
        },
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber: journalNum,
          voucherId: voucher.id,
          date: entryDate,
          description: data.description,
          status: "posted",
          createdBy: userId,
          postedBy: userId,
          postedAt: entryDate,
          JournalEntryLine: {
            create: [
              {
                lineNumber: 1,
                chartOfAccountId: data.assetAccountId,
                debitAmount: new Prisma.Decimal(data.amount),
                creditAmount: new Prisma.Decimal(0),
                description: `Asset Capitalization: ${data.description}`,
                organizationId,
              },
              {
                lineNumber: 2,
                chartOfAccountId: data.paymentAccountId,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(data.amount),
                description: `Asset Capitalization Funding: ${data.description}`,
                organizationId,
              },
            ],
          },
        },
      });

      return { voucher, journalEntry };
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/capitalization");
    revalidateBothPaths("/dashboard/accounts/ledgers");

    return { success: true, voucherNumber: result.voucher.voucherNumber };
  } catch (error: any) {
    console.error("Error recording capitalization entry:", error);
    return { success: false, error: error.message || "Failed to record capitalization" };
  }
}

/**
 * Get Capitalization Entries
 */
export async function getCapitalizationEntries() {
  try {
    const { organizationId } = await getAuthAndOrg();

    const vouchers = await prisma.voucher.findMany({
      where: {
        reference: { contains: "Capitalization", mode: "insensitive" },
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        VoucherLine: {
          include: {
            ChartOfAccount: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return { success: true, entries: vouchers };
  } catch (error: any) {
    console.error("Error fetching capitalization entries:", error);
    return { success: false, error: error.message, entries: [] };
  }
}

/**
 * Record Depreciation Entry
 * Debit: Depreciation Expense Account (e.g., 6200)
 * Credit: Accumulated Depreciation Account (e.g., 1790/1791/1792/1793)
 */
export async function recordDepreciationEntry(data: {
  accumulatedDeprAccountId: string;
  expenseAccountId?: string;
  amount: number;
  periodName: string; // e.g. "August 2026"
  date?: string;
  description?: string;
}) {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canCreate = await hasPermission(userId, "accounts.vouchers", "create");
    if (!canCreate) {
      return { success: false, error: "Permission denied to record depreciation" };
    }

    if (!data.accumulatedDeprAccountId || !data.amount || data.amount <= 0) {
      return { success: false, error: "Please select an accumulated depreciation account and valid amount" };
    }

    // Resolve or auto-create Depreciation Expense Account if not specified
    let expenseAccountId = data.expenseAccountId;
    if (!expenseAccountId) {
      let deprExpense = await prisma.chartOfAccount.findFirst({
        where: {
          name: { contains: "Depreciation", mode: "insensitive" },
          type: "EXPENSE",
          ...(organizationId ? { organizationId } : {}),
        },
      });

      if (!deprExpense) {
        // Create 6200 Depreciation Expense
        const parentExpense = await prisma.chartOfAccount.findFirst({
          where: { code: "6000", ...(organizationId ? { organizationId } : {}) },
        });

        deprExpense = await prisma.chartOfAccount.create({
          data: {
            code: "6200",
            name: "Depreciation Expense",
            type: "EXPENSE",
            description: "Fixed asset depreciation expenses",
            parentId: parentExpense ? parentExpense.id : null,
            organizationId,
            createdBy: userId,
            status: "active",
          },
        });
      }
      expenseAccountId = deprExpense.id;
    }

    const entryDate = data.date ? new Date(data.date) : new Date();
    const desc = data.description || `Depreciation Entry for ${data.periodName}`;

    const result = await prisma.$transaction(async (tx) => {
      const voucherNum = await getNextSequenceNumber(organizationId, "VOUCHER", "VCH", entryDate.getFullYear(), 6);
      const journalNum = await getNextSequenceNumber(organizationId, "JOURNAL_ENTRY", "JE", entryDate.getFullYear(), 6);

      const voucher = await tx.voucher.create({
        data: {
          voucherNumber: voucherNum,
          type: "JOURNAL",
          date: entryDate,
          status: "posted",
          reference: `Depreciation: ${data.periodName}`,
          description: desc,
          organizationId,
          createdBy: userId,
          postedById: userId,
          postedAt: entryDate,
          VoucherLine: {
            create: [
              {
                lineNumber: 1,
                chartOfAccountId: expenseAccountId!,
                debitAmount: new Prisma.Decimal(data.amount),
                creditAmount: new Prisma.Decimal(0),
                description: `Depreciation Expense - ${data.periodName}`,
              },
              {
                lineNumber: 2,
                chartOfAccountId: data.accumulatedDeprAccountId,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(data.amount),
                description: `Accumulated Depreciation - ${data.periodName}`,
              },
            ],
          },
        },
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber: journalNum,
          voucherId: voucher.id,
          date: entryDate,
          description: desc,
          status: "posted",
          createdBy: userId,
          postedBy: userId,
          postedAt: entryDate,
          JournalEntryLine: {
            create: [
              {
                lineNumber: 1,
                chartOfAccountId: expenseAccountId!,
                debitAmount: new Prisma.Decimal(data.amount),
                creditAmount: new Prisma.Decimal(0),
                description: `Depreciation Expense - ${data.periodName}`,
                organizationId,
              },
              {
                lineNumber: 2,
                chartOfAccountId: data.accumulatedDeprAccountId,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(data.amount),
                description: `Accumulated Depreciation - ${data.periodName}`,
                organizationId,
              },
            ],
          },
        },
      });

      return { voucher, journalEntry };
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/depreciation");
    revalidateBothPaths("/dashboard/accounts/ledgers");

    return { success: true, voucherNumber: result.voucher.voucherNumber };
  } catch (error: any) {
    console.error("Error recording depreciation entry:", error);
    return { success: false, error: error.message || "Failed to record depreciation" };
  }
}

/**
 * Get Depreciation Entries
 */
export async function getDepreciationEntries() {
  try {
    const { organizationId } = await getAuthAndOrg();

    const vouchers = await prisma.voucher.findMany({
      where: {
        reference: { contains: "Depreciation", mode: "insensitive" },
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        VoucherLine: {
          include: {
            ChartOfAccount: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return { success: true, entries: vouchers };
  } catch (error: any) {
    console.error("Error fetching depreciation entries:", error);
    return { success: false, error: error.message, entries: [] };
  }
}

/**
 * Record Asset Disposal Entry
 * Debit: Cash/Bank Account (Sale Proceeds)
 * Debit: Accumulated Depreciation Account (Clear accum depr)
 * Debit (if Loss) or Credit (if Gain): Gain/Loss on Disposal Account
 * Credit: Fixed Asset Account (Clear original gross cost)
 */
export async function recordDisposalEntry(data: {
  assetAccountId: string;
  accumulatedDeprAccountId?: string;
  paymentAccountId: string; // Cash/Bank COA
  grossCost: number;
  accumulatedDeprAmount: number;
  saleProceeds: number;
  date?: string;
  description: string;
}) {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canCreate = await hasPermission(userId, "accounts.vouchers", "create");
    if (!canCreate) {
      return { success: false, error: "Permission denied to record disposal" };
    }

    const netBookValue = data.grossCost - data.accumulatedDeprAmount;
    const gainOrLoss = data.saleProceeds - netBookValue; // Positive = Gain, Negative = Loss

    // Resolve Gain/Loss Account
    let gainLossAccount = await prisma.chartOfAccount.findFirst({
      where: {
        name: { contains: "Disposal", mode: "insensitive" },
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (!gainLossAccount) {
      gainLossAccount = await prisma.chartOfAccount.create({
        data: {
          code: gainOrLoss >= 0 ? "4800" : "6300",
          name: gainOrLoss >= 0 ? "Gain on Asset Disposal" : "Loss on Asset Disposal",
          type: gainOrLoss >= 0 ? "REVENUE" : "EXPENSE",
          description: "Gain or loss from fixed asset retirement or disposal",
          organizationId,
          createdBy: userId,
          status: "active",
        },
      });
    }

    const entryDate = data.date ? new Date(data.date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const voucherNum = await getNextSequenceNumber(organizationId, "VOUCHER", "VCH", entryDate.getFullYear(), 6);
      const journalNum = await getNextSequenceNumber(organizationId, "JOURNAL_ENTRY", "JE", entryDate.getFullYear(), 6);

      const lines: any[] = [];
      let lineNo = 1;

      // 1. Debit Payment Account with Sale Proceeds
      if (data.saleProceeds > 0) {
        lines.push({
          lineNumber: lineNo++,
          chartOfAccountId: data.paymentAccountId,
          debitAmount: new Prisma.Decimal(data.saleProceeds),
          creditAmount: new Prisma.Decimal(0),
          description: `Disposal Sale Proceeds: ${data.description}`,
        });
      }

      // 2. Debit Accumulated Depreciation to clear it
      if (data.accumulatedDeprAmount > 0 && data.accumulatedDeprAccountId) {
        lines.push({
          lineNumber: lineNo++,
          chartOfAccountId: data.accumulatedDeprAccountId,
          debitAmount: new Prisma.Decimal(data.accumulatedDeprAmount),
          creditAmount: new Prisma.Decimal(0),
          description: `Clear Accumulated Depreciation: ${data.description}`,
        });
      }

      // 3. Loss (Debit) or Gain (Credit)
      if (gainOrLoss < 0) {
        // Loss
        lines.push({
          lineNumber: lineNo++,
          chartOfAccountId: gainLossAccount.id,
          debitAmount: new Prisma.Decimal(Math.abs(gainOrLoss)),
          creditAmount: new Prisma.Decimal(0),
          description: `Loss on Disposal: ${data.description}`,
        });
      } else if (gainOrLoss > 0) {
        // Gain
        lines.push({
          lineNumber: lineNo++,
          chartOfAccountId: gainLossAccount.id,
          debitAmount: new Prisma.Decimal(0),
          creditAmount: new Prisma.Decimal(gainOrLoss),
          description: `Gain on Disposal: ${data.description}`,
        });
      }

      // 4. Credit Asset Account to remove original cost
      lines.push({
        lineNumber: lineNo++,
        chartOfAccountId: data.assetAccountId,
        debitAmount: new Prisma.Decimal(0),
        creditAmount: new Prisma.Decimal(data.grossCost),
        description: `Remove Fixed Asset Cost: ${data.description}`,
      });

      const voucher = await tx.voucher.create({
        data: {
          voucherNumber: voucherNum,
          type: "JOURNAL",
          date: entryDate,
          status: "posted",
          reference: "Asset Disposal",
          description: data.description,
          organizationId,
          createdBy: userId,
          postedById: userId,
          postedAt: entryDate,
          VoucherLine: {
            create: lines,
          },
        },
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber: journalNum,
          voucherId: voucher.id,
          date: entryDate,
          description: data.description,
          status: "posted",
          createdBy: userId,
          postedBy: userId,
          postedAt: entryDate,
          JournalEntryLine: {
            create: lines.map((l) => ({ ...l, organizationId })),
          },
        },
      });

      return { voucher, journalEntry };
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/disposals");
    revalidateBothPaths("/dashboard/accounts/ledgers");

    return { success: true, voucherNumber: result.voucher.voucherNumber };
  } catch (error: any) {
    console.error("Error recording asset disposal:", error);
    return { success: false, error: error.message || "Failed to record disposal" };
  }
}

/**
 * Get Disposal Entries
 */
export async function getDisposalEntries() {
  try {
    const { organizationId } = await getAuthAndOrg();

    const vouchers = await prisma.voucher.findMany({
      where: {
        reference: { contains: "Disposal", mode: "insensitive" },
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        VoucherLine: {
          include: {
            ChartOfAccount: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return { success: true, entries: vouchers };
  } catch (error: any) {
    console.error("Error fetching disposal entries:", error);
    return { success: false, error: error.message, entries: [] };
  }
}

/**
 * Record Asset Transfer Entry
 * Debit Target Asset Account, Credit Source Asset Account
 */
export async function recordTransferEntry(data: {
  fromAssetAccountId: string;
  toAssetAccountId: string;
  amount: number;
  date?: string;
  description: string;
}) {
  try {
    const { userId, organizationId } = await getAuthAndOrg();
    const canCreate = await hasPermission(userId, "accounts.vouchers", "create");
    if (!canCreate) {
      return { success: false, error: "Permission denied to record transfer" };
    }

    if (!data.fromAssetAccountId || !data.toAssetAccountId || !data.amount || data.amount <= 0) {
      return { success: false, error: "Please select valid source and target accounts and amount" };
    }

    if (data.fromAssetAccountId === data.toAssetAccountId) {
      return { success: false, error: "Source and target asset accounts must be different" };
    }

    const entryDate = data.date ? new Date(data.date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const voucherNum = await getNextSequenceNumber(organizationId, "VOUCHER", "VCH", entryDate.getFullYear(), 6);
      const journalNum = await getNextSequenceNumber(organizationId, "JOURNAL_ENTRY", "JE", entryDate.getFullYear(), 6);

      const voucher = await tx.voucher.create({
        data: {
          voucherNumber: voucherNum,
          type: "JOURNAL",
          date: entryDate,
          status: "posted",
          reference: "Asset Transfer",
          description: data.description,
          organizationId,
          createdBy: userId,
          postedById: userId,
          postedAt: entryDate,
          VoucherLine: {
            create: [
              {
                lineNumber: 1,
                chartOfAccountId: data.toAssetAccountId,
                debitAmount: new Prisma.Decimal(data.amount),
                creditAmount: new Prisma.Decimal(0),
                description: `Asset Transfer In: ${data.description}`,
              },
              {
                lineNumber: 2,
                chartOfAccountId: data.fromAssetAccountId,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(data.amount),
                description: `Asset Transfer Out: ${data.description}`,
              },
            ],
          },
        },
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber: journalNum,
          voucherId: voucher.id,
          date: entryDate,
          description: data.description,
          status: "posted",
          createdBy: userId,
          postedBy: userId,
          postedAt: entryDate,
          JournalEntryLine: {
            create: [
              {
                lineNumber: 1,
                chartOfAccountId: data.toAssetAccountId,
                debitAmount: new Prisma.Decimal(data.amount),
                creditAmount: new Prisma.Decimal(0),
                description: `Asset Transfer In: ${data.description}`,
                organizationId,
              },
              {
                lineNumber: 2,
                chartOfAccountId: data.fromAssetAccountId,
                debitAmount: new Prisma.Decimal(0),
                creditAmount: new Prisma.Decimal(data.amount),
                description: `Asset Transfer Out: ${data.description}`,
                organizationId,
              },
            ],
          },
        },
      });

      return { voucher, journalEntry };
    });

    revalidateBothPaths("/dashboard/accounts/fixed-assets");
    revalidateBothPaths("/dashboard/accounts/fixed-assets/transfers");
    revalidateBothPaths("/dashboard/accounts/ledgers");

    return { success: true, voucherNumber: result.voucher.voucherNumber };
  } catch (error: any) {
    console.error("Error recording asset transfer:", error);
    return { success: false, error: error.message || "Failed to record asset transfer" };
  }
}

/**
 * Get Transfer Entries
 */
export async function getTransferEntries() {
  try {
    const { organizationId } = await getAuthAndOrg();

    const vouchers = await prisma.voucher.findMany({
      where: {
        reference: { contains: "Transfer", mode: "insensitive" },
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        VoucherLine: {
          include: {
            ChartOfAccount: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return { success: true, entries: vouchers };
  } catch (error: any) {
    console.error("Error fetching transfer entries:", error);
    return { success: false, error: error.message, entries: [] };
  }
}
