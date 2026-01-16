"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { Prisma, AccountType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { createUserLog, LogAction } from "@/lib/user-log";

/**
 * Check if an account is used in vouchers or journal entries
 */
async function checkAccountIsUsed(accountId: string): Promise<boolean> {
  const [voucherLineCount, journalEntryLineCount] = await Promise.all([
    prisma.voucherLine.count({ where: { chartOfAccountId: accountId } }),
    prisma.journalEntryLine.count({ where: { chartOfAccountId: accountId } }),
  ]);
  return voucherLineCount > 0 || journalEntryLineCount > 0;
}

/**
 * Get paginated list of chart of accounts with search
 */
export async function getChartOfAccounts(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        accounts: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.chart-of-accounts", "read") ||
                    await hasPermission(session.user.id, "accounts.chart-of-accounts", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view chart of accounts",
        accounts: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause for search and status
    const where: Prisma.ChartOfAccountWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.status = { not: "trash" };
    }

    // Get total count
    const total = await prisma.chartOfAccount.count({ where });

    // Get accounts
    const accounts = await prisma.chartOfAccount.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        parentId: true,
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        description: true,
        status: true,
        createdBy: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            other_ChartOfAccount: true,
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    // Map accounts to include child count (remove _count from result)
    const accountsWithChildCount = accounts.map(({ _count, ChartOfAccount, User, ...account }) => ({
      ...account,
      parent: ChartOfAccount,
      creator: User,
      childCount: _count.other_ChartOfAccount,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      accounts: accountsWithChildCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getChartOfAccounts error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch chart of accounts",
      accounts: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get chart of account by ID
 */
export async function getChartOfAccountById(accountId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        account: null,
      };
    }

    // Check permission
    const canView = await hasPermission(session.user.id, "accounts.chart-of-accounts", "read") ||
                    await hasPermission(session.user.id, "accounts.chart-of-accounts", "view");

    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view chart of accounts",
        account: null,
      };
    }

    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
      include: {
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        other_ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!account) {
      return {
        success: false,
        error: "Account not found",
        account: null,
      };
    }

    // Map field names for consistency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedAccount = {
      ...account,
      parent: (account as any).ChartOfAccount || null,
      children: (account as any).other_ChartOfAccount || [],
      creator: (account as any).User || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const { ChartOfAccount: _, other_ChartOfAccount: __, User: ___, ...accountWithoutRelations } = mappedAccount as any;

    return {
      success: true,
      account: accountWithoutRelations,
    };
  } catch (error) {
    console.error("getChartOfAccountById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch account",
      account: null,
    };
  }
}

/**
 * Create a new chart of account
 */
export async function createChartOfAccount(input: {
  code: string;
  name: string;
  type: AccountType;
  parentId?: string | null;
  description?: string | null;
  status?: string;
}) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        account: null,
      };
    }

    // Check permission
    const canCreate = await hasPermission(session.user.id, "accounts.chart-of-accounts", "create");

    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create chart of accounts",
        account: null,
      };
    }

    // Validate code uniqueness
    const existingAccount = await prisma.chartOfAccount.findUnique({
      where: { code: input.code },
      select: { id: true },
    });

    if (existingAccount) {
      return {
        success: false,
        error: `Account code "${input.code}" already exists. Please use a unique code.`,
        account: null,
      };
    }

    // Validate parent exists if provided
    if (input.parentId) {
      const parent = await prisma.chartOfAccount.findUnique({
        where: { id: input.parentId },
        select: { id: true, status: true },
      });

      if (!parent) {
        return {
          success: false,
          error: "Parent account not found",
          account: null,
        };
      }

      if (parent.status === "trash") {
        return {
          success: false,
          error: "Cannot set parent to a trashed account",
          account: null,
        };
      }
    }

    // Create account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const account = await prisma.chartOfAccount.create({
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        parentId: input.parentId || null,
        description: input.description || null,
        status: input.status || "active",
        createdBy: session.user.id,
      } as any,
      include: {
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Map field names for consistency
    const mappedAccount = {
      ...account,
      parent: (account as any).ChartOfAccount || null,
      creator: (account as any).User || null,
    };
    const { ChartOfAccount: _, User: __, ...accountWithoutRelations } = mappedAccount as any;

    // Log action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
      details: `Created chart of account: ${input.code} - ${input.name}`,
    });

    // Revalidate paths
    revalidateBothPaths("accounts/chart-of-accounts", "page");

    return {
      success: true,
      account: accountWithoutRelations,
    };
  } catch (error) {
    console.error("createChartOfAccount error:", error);
    
    // Handle Prisma unique constraint error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: `Account code "${input.code}" already exists. Please use a unique code.`,
        account: null,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create chart of account",
      account: null,
    };
  }
}

/**
 * Update an existing chart of account
 */
export async function updateChartOfAccount(
  accountId: string,
  input: {
    code?: string;
    name?: string;
    type?: AccountType;
    parentId?: string | null;
    description?: string | null;
    status?: string;
  }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        account: null,
      };
    }

    // Check permission
    const canEdit = await hasPermission(session.user.id, "accounts.chart-of-accounts", "edit");

    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit chart of accounts",
        account: null,
      };
    }

    // Check if account exists
    const existingAccount = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
      select: { id: true, code: true, type: true },
    });

    if (!existingAccount) {
      return {
        success: false,
        error: "Account not found",
        account: null,
      };
    }

    // Validate code uniqueness if code is being changed
    if (input.code && input.code !== existingAccount.code) {
      const codeExists = await prisma.chartOfAccount.findUnique({
        where: { code: input.code },
        select: { id: true },
      });

      if (codeExists) {
        return {
          success: false,
          error: `Account code "${input.code}" already exists. Please use a unique code.`,
          account: null,
        };
      }
    }

    // Validate parent exists if provided
    if (input.parentId !== undefined) {
      if (input.parentId) {
        // Prevent circular reference - cannot set parent to self or descendant
        if (input.parentId === accountId) {
          return {
            success: false,
            error: "Cannot set account as its own parent",
            account: null,
          };
        }

        const parent = await prisma.chartOfAccount.findUnique({
          where: { id: input.parentId },
          select: { id: true, status: true },
        });

        if (!parent) {
          return {
            success: false,
            error: "Parent account not found",
            account: null,
          };
        }

        if (parent.status === "trash") {
          return {
            success: false,
            error: "Cannot set parent to a trashed account",
            account: null,
          };
        }

        // Check for circular reference - ensure parent is not a descendant
        const checkCircular = async (checkId: string, targetId: string): Promise<boolean> => {
          const checkAccount = await prisma.chartOfAccount.findUnique({
            where: { id: checkId },
            select: { parentId: true },
          });

          if (!checkAccount || !checkAccount.parentId) {
            return false;
          }

          if (checkAccount.parentId === targetId) {
            return true;
          }

          return checkCircular(checkAccount.parentId, targetId);
        };

        const isCircular = await checkCircular(input.parentId, accountId);
        if (isCircular) {
          return {
            success: false,
            error: "Cannot set parent - would create circular reference",
            account: null,
          };
        }
      }
    }

    // Build update data
    const updateData: Prisma.ChartOfAccountUpdateInput = {};

    if (input.code !== undefined) {
      updateData.code = input.code;
    }
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.type !== undefined) {
      // Prevent account type change if account is used
      if (input.type !== existingAccount.type) {
        const isUsed = await checkAccountIsUsed(accountId);
        if (isUsed) {
          return {
            success: false,
            error: "Cannot change account type. This account has been used in vouchers or journal entries.",
            account: null,
          };
        }
      }
      updateData.type = input.type;
    }
    if (input.parentId !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updateData as any).parentId = input.parentId || null;
    }
    if (input.description !== undefined) {
      updateData.description = input.description || null;
    }
    if (input.status !== undefined) {
      // If moving to trash, check if account has children and if account is used
      if (input.status === "trash") {
        const childCount = await prisma.chartOfAccount.count({
          where: {
            parentId: accountId,
          },
        });

        if (childCount > 0) {
          return {
            success: false,
            error: "Cannot move account to trash. This account has child accounts. Please delete or move child accounts first.",
            account: null,
          };
        }

        // Check if account is used in vouchers or journal entries
        const isUsed = await checkAccountIsUsed(accountId);
        if (isUsed) {
          return {
            success: false,
            error: "Cannot move account to trash. This account has been used in vouchers or journal entries.",
            account: null,
          };
        }
      }
      updateData.status = input.status;
    }

    // Update account
    const account = await prisma.chartOfAccount.update({
      where: { id: accountId },
      data: updateData,
      include: {
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Map field names for consistency
    const mappedAccount = {
      ...account,
      parent: (account as any).ChartOfAccount || null,
      creator: (account as any).User || null,
    };
    const { ChartOfAccount: _, User: __, ...accountWithoutRelations } = mappedAccount as any;

    // Log action
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Updated chart of account: ${account.code} - ${account.name}`,
    });

    // Revalidate paths
    revalidateBothPaths("accounts/chart-of-accounts", "page");
    revalidateBothPaths(`accounts/chart-of-accounts/${accountId}`, "page");

    return {
      success: true,
      account: accountWithoutRelations,
    };
  } catch (error) {
    console.error("updateChartOfAccount error:", error);

    // Handle Prisma unique constraint error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: `Account code "${input.code}" already exists. Please use a unique code.`,
        account: null,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update chart of account",
      account: null,
    };
  }
}

/**
 * Delete chart of accounts permanently
 */
export async function deleteChartOfAccountsPermanently(accountIds: string[]) {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        count: 0,
      };
    }

    // Check permission
    const canDelete = await hasPermission(session.user.id, "accounts.chart-of-accounts", "delete-permanently");

    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete chart of accounts permanently",
        count: 0,
      };
    }

    if (!accountIds || accountIds.length === 0) {
      return {
        success: false,
        error: "No accounts selected",
        count: 0,
      };
    }

    // Get accounts before deletion for logging
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        id: { in: accountIds },
        status: "trash", // Only allow permanent deletion of trashed accounts
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (accounts.length === 0) {
      return {
        success: false,
        error: "No trashed accounts found to delete permanently",
        count: 0,
      };
    }

    // Check if any account has children (even in trash)
    const accountsWithChildren: string[] = [];
    for (const account of accounts) {
      const childCount = await prisma.chartOfAccount.count({
        where: {
          parentId: account.id,
        },
      });

      if (childCount > 0) {
        accountsWithChildren.push(`${account.code} - ${account.name}`);
      }
    }

    if (accountsWithChildren.length > 0) {
      return {
        success: false,
        error: `Cannot delete account(s) with child accounts: ${accountsWithChildren.join(", ")}. Please delete child accounts first.`,
        count: 0,
      };
    }

    // Delete permanently
    const result = await prisma.chartOfAccount.deleteMany({
      where: {
        id: { in: accounts.map((a) => a.id) },
        status: "trash",
      },
    });

    // Log permanent deletion
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Permanently deleted ${result.count} chart of account(s)`,
      metadata: {
        accountIds: accounts.map((a) => a.id),
        count: result.count,
      },
    });

    // Revalidate paths
    revalidateBothPaths("accounts/chart-of-accounts", "page");

    return {
      success: true,
      count: result.count,
    };
  } catch (error) {
    console.error("deleteChartOfAccountsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete chart of accounts permanently",
      count: 0,
    };
  }
}

