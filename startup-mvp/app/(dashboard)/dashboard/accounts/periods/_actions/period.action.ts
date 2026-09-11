"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";
import { createUserLog, LogAction } from "@/lib/user-log";

/**
 * List all accounting periods
 */
export async function listPeriods(organizationId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const periods = await prisma.accountingPeriod.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { startDate: "desc" },
    });

    return { success: true, periods };
  } catch (error) {
    console.error("listPeriods error:", error);
    return { success: false, error: "Failed to fetch accounting periods" };
  }
}

/**
 * Create a new accounting period
 */
export async function createPeriod(input: {
  periodName: string;
  startDate: Date;
  endDate: Date;
  organizationId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canCreate = await hasPermission(session.user.id, "accounts.periods", "create");
    if (!canCreate) return { success: false, error: "Unauthorized" };

    const orgId = input.organizationId || (session.user as any).organizationId || "default";

    const period = await prisma.accountingPeriod.create({
      data: {
        periodName: input.periodName,
        startDate: input.startDate,
        endDate: input.endDate,
        organizationId: orgId,
      },
    });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
      details: `Created accounting period: ${period.periodName}`,
    });

    revalidateBothPaths("accounts/periods");
    return { success: true, period };
  } catch (error) {
    console.error("createPeriod error:", error);
    return { success: false, error: "Failed to create accounting period" };
  }
}

/**
 * Lock an accounting period
 */
export async function lockPeriod(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canLock = await hasPermission(session.user.id, "accounts.periods", "create");
    if (!canLock) return { success: false, error: "Unauthorized" };

    const period = await prisma.accountingPeriod.update({
      where: { id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedBy: session.user.id,
      },
    });

    // Optionally lock all vouchers in this period
    await prisma.voucher.updateMany({
      where: {
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      data: { isLocked: true },
    });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.CUSTOM,
      details: `Locked accounting period: ${period.periodName}`,
    });

    revalidateBothPaths("accounts/periods");
    return { success: true, period };
  } catch (error) {
    console.error("lockPeriod error:", error);
    return { success: false, error: "Failed to lock accounting period" };
  }
}

/**
 * Unlock an accounting period
 */
export async function unlockPeriod(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canUnlock = await hasPermission(session.user.id, "accounts.periods", "create");
    if (!canUnlock) return { success: false, error: "Unauthorized" };

    const period = await prisma.accountingPeriod.update({
      where: { id },
      data: {
        isClosed: false,
        closedAt: null,
        closedBy: null,
      },
    });

    // Optionally unlock all vouchers in this period
    await prisma.voucher.updateMany({
      where: {
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      data: { isLocked: false },
    });

    await createUserLog({
      userId: session.user.id,
      action: LogAction.CUSTOM,
      details: `Unlocked accounting period: ${period.periodName}`,
    });

    revalidateBothPaths("accounts/periods");
    return { success: true, period };
  } catch (error) {
    console.error("unlockPeriod error:", error);
    return { success: false, error: "Failed to unlock accounting period" };
  }
}

/**
 * Helper to check if a date falls within a locked accounting period
 */
export async function isPeriodLocked(date: Date | string, organizationId?: string): Promise<boolean> {
  try {
    const checkDate = typeof date === "string" ? new Date(date) : date;
    if (isNaN(checkDate.getTime())) return false;

    const lockedPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        startDate: { lte: checkDate },
        endDate: { gte: checkDate },
        isClosed: true,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    return !!lockedPeriod;
  } catch (error) {
    console.error("isPeriodLocked error:", error);
    return false;
  }
}

