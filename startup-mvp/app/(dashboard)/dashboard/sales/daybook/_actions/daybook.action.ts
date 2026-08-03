"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Custom helper to get date bounds in UTC relative to Dhaka (GMT+6)
function getDhakaDateBounds(dateStr: string) {
  // dateStr is in 'YYYY-MM-DD'
  const startOfDay = new Date(`${dateStr}T00:00:00.000+06:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+06:00`);
  return { startOfDay, endOfDay };
}

export async function getPOSClosingData(billerId: string, warehouseId: string, dateStr: string) {
  try {
    if (process.env.NODE_ENV !== "test") {
      const session = await auth();
      if (!session?.user) {
        return { success: false, error: "Unauthorized" };
      }
    }

    const { startOfDay, endOfDay } = getDhakaDateBounds(dateStr);

    // Fetch all active payment accounts for grouping
    const coaAccounts = await prisma.chartOfAccount.findMany({
      where: {
        type: "ASSET",
        status: "active",
        isControl: false,
        CashBankAccount: {
          isNot: null
        }
      },
      select: {
        id: true,
        name: true,
        CashBankAccount: {
          select: {
            type: true,
            isVisible: true,
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

    const isWalletName = (name: string) => {
      const n = name.toLowerCase();
      return n.includes("bkash") || n.includes("nagad") || n.includes("rocket") || n.includes("upay") || n.includes("wallet");
    };

    const paymentAccounts = coaAccounts
      .map((acc) => {
        let type: "CASH" | "BANK" | "WALLET" | null = null;
        if (isWalletName(acc.name) || acc.CashBankAccount?.type === "MFS") {
          type = "WALLET";
        } else if (acc.CashBankAccount?.type === "CASH") {
          type = "CASH";
        } else if (acc.CashBankAccount?.type === "BANK") {
          type = "BANK";
        } else {
          if (acc.name.toLowerCase().includes("cash")) {
            type = "CASH";
          } else if (acc.name.toLowerCase().includes("bank") || acc.name.toLowerCase().includes("card")) {
            type = "BANK";
          }
        }
        
        const warehouseIds = acc.CashBankAccount?.warehouses?.map(w => w.id) || [];
        const isVisible = acc.CashBankAccount ? acc.CashBankAccount.isVisible : true;

        return {
          id: acc.id,
          name: acc.name,
          type: type,
          warehouseIds: warehouseIds,
          isVisible: isVisible,
        };
      })
      .filter((acc) => acc.type !== null && acc.isVisible && (acc.warehouseIds.length === 0 || acc.warehouseIds.includes(warehouseId)));

    // 1. Fetch completed sales of this biller, warehouse and business date
    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        isTrash: false,
        createdBy: billerId,
        warehouseId: warehouseId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 2. Fetch posted dues collection vouchers for this biller, warehouse and date range
    const dueVouchers = await prisma.voucher.findMany({
      where: {
        type: "RECEIPT",
        status: "posted",
        createdBy: billerId,
        warehouseId: warehouseId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        reference: {
          startsWith: "COLL_"
        }
      },
      include: {
        VoucherLine: true
      }
    });

    // Initialize map for collections
    const collectionsMap: Record<string, {
      id: string;
      name: string;
      type: string;
      regularCollection: number;
      duesCollection: number;
      totalCollection: number;
    }> = {};

    for (const acc of paymentAccounts) {
      collectionsMap[acc.id] = {
        id: acc.id,
        name: acc.name,
        type: acc.type || "CASH",
        regularCollection: 0,
        duesCollection: 0,
        totalCollection: 0,
      };
    }

    // A. Parse direct sales payments
    let todaysCreditSales = 0;
    let loyaltyPointsUsed = 0; 

    for (const sale of sales) {
      const isReturn = sale.orderType === "RETURN";
      const paymentDetails = sale.paymentDetails as any;
      const factor = isReturn ? -1 : 1;

      const grandTotalNum = Number(sale.grandTotal);
      // Credit sales calculation (due amount)
      if (!isReturn && grandTotalNum > 0) {
        const cashAmt = Number(paymentDetails?.cashAmount || 0);
        const cardAmt = Number(paymentDetails?.cardAmount || 0);
        const mfsAmt = Number(paymentDetails?.mfsAmount || 0);
        const paidAmount = cashAmt + cardAmt + mfsAmt;
        if (grandTotalNum > paidAmount) {
          todaysCreditSales += (grandTotalNum - paidAmount);
        }
      }

      if (paymentDetails) {
        const cashAmt = Number(paymentDetails.cashAmount || 0) * factor;
        const cardAmt = Number(paymentDetails.cardAmount || 0) * factor;
        const mfsAmt = Number(paymentDetails.mfsAmount || 0) * factor;

        if (cashAmt !== 0 && paymentDetails.cashAccountId && collectionsMap[paymentDetails.cashAccountId]) {
          collectionsMap[paymentDetails.cashAccountId].regularCollection += cashAmt;
        }
        if (cardAmt !== 0 && paymentDetails.cardAccountId && collectionsMap[paymentDetails.cardAccountId]) {
          collectionsMap[paymentDetails.cardAccountId].regularCollection += cardAmt;
        }
        if (mfsAmt !== 0 && paymentDetails.mfsAccountId && collectionsMap[paymentDetails.mfsAccountId]) {
          collectionsMap[paymentDetails.mfsAccountId].regularCollection += mfsAmt;
        }
      }
    }

    // B. Parse dues collections from receipt vouchers
    for (const voucher of dueVouchers) {
      for (const line of voucher.VoucherLine) {
        const debitAmt = Number(line.debitAmount || 0);
        if (debitAmt > 0 && collectionsMap[line.chartOfAccountId]) {
          collectionsMap[line.chartOfAccountId].duesCollection += debitAmt;
        }
      }
    }

    // Compute totals
    for (const accId in collectionsMap) {
      const col = collectionsMap[accId];
      col.regularCollection = Number(col.regularCollection.toFixed(2));
      col.duesCollection = Number(col.duesCollection.toFixed(2));
      col.totalCollection = Number((col.regularCollection + col.duesCollection).toFixed(2));
    }

    // Check if there is an existing saved session
    const savedSession = await prisma.pOSClosingSession.findFirst({
      where: {
        billerId,
        warehouseId,
        businessDate: startOfDay
      },
      include: {
        denominations: true,
        collections: true
      }
    });

    return {
      success: true,
      collections: Object.values(collectionsMap),
      todaysCreditSales: Number(todaysCreditSales.toFixed(2)),
      loyaltyPoints: loyaltyPointsUsed,
      savedSession: savedSession ? {
        ...savedSession,
        openingCash: Number(savedSession.openingCash),
        cashOut: Number(savedSession.cashOut),
        officeBill: Number(savedSession.officeBill),
        cashInHand: Number(savedSession.cashInHand),
        availableCash: Number(savedSession.availableCash),
        difference: Number(savedSession.difference),
        todaysCreditSales: Number(savedSession.todaysCreditSales)
      } : null
    };

  } catch (error) {
    console.error("getPOSClosingData error:", error);
    return { success: false, error: "Failed to fetch closing data." };
  }
}

export async function savePOSClosingSession(payload: {
  billerId: string;
  warehouseId: string;
  dateStr: string;
  status: "DRAFT" | "CLOSED";
  openingCash: number;
  cashOut: number;
  officeBill: number;
  cashInHand: number;
  availableCash: number;
  difference: number;
  todaysCreditSales: number;
  loyaltyPoints: number;
  notes?: string;
  denominations: {
    note1000: number;
    note500: number;
    note200: number;
    note100: number;
    note50: number;
    note20: number;
    note10: number;
    note5: number;
    note2: number;
    note1: number;
  };
  collections: Array<{
    paymentMethodName: string;
    regularCollection: number;
    duesCollection: number;
    totalCollection: number;
    totalReceived: number;
    difference: number;
  }>;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const { startOfDay } = getDhakaDateBounds(payload.dateStr);

    const result = await prisma.$transaction(async (tx) => {
      // Find if already exists
      const existing = await tx.pOSClosingSession.findFirst({
        where: {
          billerId: payload.billerId,
          warehouseId: payload.warehouseId,
          businessDate: startOfDay,
        }
      });

      const sessionData = {
        billerId: payload.billerId,
        warehouseId: payload.warehouseId,
        businessDate: startOfDay,
        status: payload.status,
        openingCash: payload.openingCash,
        cashOut: payload.cashOut,
        officeBill: payload.officeBill,
        cashInHand: payload.cashInHand,
        availableCash: payload.availableCash,
        difference: payload.difference,
        todaysCreditSales: payload.todaysCreditSales,
        loyaltyPoints: payload.loyaltyPoints,
        notes: payload.notes,
        createdBy: session.user.id,
      };

      let activeSessionId = "";

      if (existing) {
        if (existing.status === "VERIFIED") {
          throw new Error("Cannot modify a verified closing session.");
        }

        // Delete existing relations to overwrite
        await tx.pOSCashDenomination.deleteMany({ where: { sessionId: existing.id } });
        await tx.pOSClosingCollection.deleteMany({ where: { sessionId: existing.id } });

        const updated = await tx.pOSClosingSession.update({
          where: { id: existing.id },
          data: {
            status: payload.status,
            openingCash: payload.openingCash,
            cashOut: payload.cashOut,
            officeBill: payload.officeBill,
            cashInHand: payload.cashInHand,
            availableCash: payload.availableCash,
            difference: payload.difference,
            todaysCreditSales: payload.todaysCreditSales,
            loyaltyPoints: payload.loyaltyPoints,
            notes: payload.notes,
            createdBy: session.user.id,
          }
        });
        activeSessionId = updated.id;
      } else {
        const created = await tx.pOSClosingSession.create({
          data: sessionData
        });
        activeSessionId = created.id;
      }

      // Create denominations
      await tx.pOSCashDenomination.create({
        data: {
          sessionId: activeSessionId,
          ...payload.denominations
        }
      });

      // Create collections
      for (const col of payload.collections) {
        await tx.pOSClosingCollection.create({
          data: {
            sessionId: activeSessionId,
            paymentMethodName: col.paymentMethodName,
            regularCollection: col.regularCollection,
            duesCollection: col.duesCollection,
            totalCollection: col.totalCollection,
            totalReceived: col.totalReceived,
            difference: col.difference
          }
        });
      }

      return { sessionId: activeSessionId };
    });

    revalidatePath("/dashboard/sales/daybook");
    return { success: true, sessionId: result.sessionId };

  } catch (error: any) {
    console.error("savePOSClosingSession error:", error);
    return { success: false, error: error.message || "Failed to save closing session." };
  }
}

export async function verifyPOSClosingSession(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.pOSClosingSession.update({
      where: { id: sessionId },
      data: {
        status: "VERIFIED",
        verifiedBy: session.user.id,
        verifiedAt: new Date()
      }
    });

    revalidatePath("/dashboard/sales/daybook");
    return { success: true };
  } catch (error) {
    console.error("verifyPOSClosingSession error:", error);
    return { success: false, error: "Failed to verify session." };
  }
}

export async function reopenPOSClosingSession(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.pOSClosingSession.update({
      where: { id: sessionId },
      data: {
        status: "DRAFT",
        verifiedBy: null,
        verifiedAt: null
      }
    });

    revalidatePath("/dashboard/sales/daybook");
    return { success: true };
  } catch (error) {
    console.error("reopenPOSClosingSession error:", error);
    return { success: false, error: "Failed to reopen session." };
  }
}

export async function getDailyWarehouseClosings(dateStr: string, warehouseId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", closings: [] };
    }

    const { startOfDay, endOfDay } = getDhakaDateBounds(dateStr);

    const closings = await prisma.pOSClosingSession.findMany({
      where: {
        ...(warehouseId !== "all" && { warehouseId }),
        businessDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        biller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        verifier: {
          select: {
            name: true
          }
        },
        collections: true,
        denominations: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formatted = closings.map((c) => ({
      ...c,
      openingCash: Number(c.openingCash),
      cashOut: Number(c.cashOut),
      officeBill: Number(c.officeBill),
      cashInHand: Number(c.cashInHand),
      availableCash: Number(c.availableCash),
      difference: Number(c.difference),
      todaysCreditSales: Number(c.todaysCreditSales)
    }));

    return { success: true, closings: formatted };
  } catch (error) {
    console.error("getDailyWarehouseClosings error:", error);
    return { success: false, error: "Failed to fetch warehouse closings.", closings: [] };
  }
}

export async function getBillersForWarehouse(warehouseId: string) {
  try {
    const salesBillers = await prisma.sale.findMany({
      where: {
        ...(warehouseId !== "all" && { warehouseId })
      },
      distinct: ["createdBy"],
      select: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const billers = salesBillers
      .map(s => s.createdByUser)
      .filter(u => u !== null);

    return { success: true, billers };
  } catch (error) {
    console.error("getBillersForWarehouse error:", error);
    return { success: false, error: "Failed to fetch billers.", billers: [] };
  }
}
