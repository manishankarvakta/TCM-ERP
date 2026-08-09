"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  subWeeks, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear, 
  endOfYear, 
  subYears, 
  differenceInDays 
} from "date-fns";

export interface DateFilterRange {
  from: string; // ISO string or YYYY-MM-DD
  to: string;   // ISO string or YYYY-MM-DD
}

function getPeriodDates(filter: string, customRange?: DateFilterRange) {
  const now = new Date();
  let currentStart = startOfDay(now);
  let currentEnd = endOfDay(now);
  let prevStart = startOfDay(subDays(now, 1));
  let prevEnd = endOfDay(subDays(now, 1));

  if (filter === "today") {
    currentStart = startOfDay(now);
    currentEnd = endOfDay(now);
    prevStart = startOfDay(subDays(now, 1));
    prevEnd = endOfDay(subDays(now, 1));
  } else if (filter === "this-week") {
    currentStart = startOfWeek(now, { weekStartsOn: 1 });
    currentEnd = endOfWeek(now, { weekStartsOn: 1 });
    prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  } else if (filter === "this-month") {
    currentStart = startOfMonth(now);
    currentEnd = endOfMonth(now);
    prevStart = startOfMonth(subMonths(now, 1));
    prevEnd = endOfMonth(subMonths(now, 1));
  } else if (filter === "this-year") {
    currentStart = startOfYear(now);
    currentEnd = endOfYear(now);
    prevStart = startOfYear(subYears(now, 1));
    prevEnd = endOfYear(subYears(now, 1));
  } else if (filter === "custom" && customRange) {
    currentStart = startOfDay(new Date(customRange.from));
    currentEnd = endOfDay(new Date(customRange.to));
    const daysDiff = differenceInDays(currentEnd, currentStart) + 1;
    prevStart = startOfDay(subDays(currentStart, daysDiff));
    prevEnd = endOfDay(subDays(currentEnd, daysDiff));
  }

  return { currentStart, currentEnd, prevStart, prevEnd };
}

export async function getRealtimeDashboardStats(
  warehouseId: string | "all",
  filterType: "today" | "this-week" | "this-month" | "this-year" | "custom",
  customRange?: DateFilterRange,
  chartRange?: "7-days" | "last-month" | "3-months" | "last-year"
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const { currentStart, currentEnd, prevStart, prevEnd } = getPeriodDates(filterType, customRange);

    const getSaleDue = (sale: any) => {
      const grandTotal = Number(sale.grandTotal);
      const details = sale.paymentDetails as any;
      let initialPaid = 0;
      let totalCollected = 0;
      if (details) {
        initialPaid = Number(details.cashAmount || 0) + Number(details.cardAmount || 0) + Number(details.mfsAmount || 0) - Number(details.changeAmount || 0);
        if (Array.isArray(details.dueCollections)) {
          for (const col of details.dueCollections) {
            totalCollected += Number(col.cashAmount || 0) + Number(col.cardAmount || 0) + Number(col.mfsAmount || 0);
          }
        }
      }
      return Math.max(0, grandTotal - initialPaid - totalCollected);
    };

    // Build Prisma query filter
    const baseFilter: any = {
      isTrash: false,
    };
    if (warehouseId !== "all") {
      baseFilter.warehouseId = warehouseId;
    }

    const currentFilter = {
      ...baseFilter,
      createdAt: { gte: currentStart, lte: currentEnd },
    };

    const prevFilter = {
      ...baseFilter,
      createdAt: { gte: prevStart, lte: prevEnd },
    };

    const purchaseFilter: any = { isTrash: false };
    if (warehouseId !== "all") {
      purchaseFilter.warehouseId = warehouseId;
    }

    // 1. Fetch Current & Previous Sales Aggregates
    const [currentSales, prevSales] = await Promise.all([
      prisma.sale.findMany({
        where: currentFilter,
        select: {
          grandTotal: true,
          clientId: true,
          paymentDetails: true,
          discount: true,
          couponId: true,
        },
      }),
      prisma.sale.findMany({
        where: prevFilter,
        select: {
          grandTotal: true,
          paymentDetails: true,
          discount: true,
          couponId: true,
        },
      }),
    ]);

    // Revenue calculations
    const currentRevenue = currentSales.reduce((acc, sale) => acc + Number(sale.grandTotal), 0);
    const prevRevenue = prevSales.reduce((acc, sale) => acc + Number(sale.grandTotal), 0);
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Discount calculations
    let currentGeneralDiscount = 0;
    let currentCouponDiscount = 0;
    currentSales.forEach((sale) => {
      const d = Number(sale.discount || 0);
      if (sale.couponId) {
        currentCouponDiscount += d;
      } else {
        currentGeneralDiscount += d;
      }
    });
    const currentTotalSaleDiscount = currentGeneralDiscount + currentCouponDiscount;

    let prevGeneralDiscount = 0;
    let prevCouponDiscount = 0;
    prevSales.forEach((sale) => {
      const d = Number(sale.discount || 0);
      if (sale.couponId) {
        prevCouponDiscount += d;
      } else {
        prevGeneralDiscount += d;
      }
    });
    const prevTotalSaleDiscount = prevGeneralDiscount + prevCouponDiscount;
    const totalSaleDiscountGrowth = prevTotalSaleDiscount > 0 ? ((currentTotalSaleDiscount - prevTotalSaleDiscount) / prevTotalSaleDiscount) * 100 : 0;

    // Purchase calculations
    const [currentPurchases, prevPurchases] = await Promise.all([
      prisma.purchase.findMany({
        where: {
          ...purchaseFilter,
          createdAt: { gte: currentStart, lte: currentEnd },
        },
        select: { grandTotal: true },
      }),
      prisma.purchase.findMany({
        where: {
          ...purchaseFilter,
          createdAt: { gte: prevStart, lte: prevEnd },
        },
        select: { grandTotal: true },
      }),
    ]);
    const currentPurchaseTotal = currentPurchases.reduce((acc, p) => acc + Number(p.grandTotal), 0);
    const prevPurchaseTotal = prevPurchases.reduce((acc, p) => acc + Number(p.grandTotal), 0);
    const purchaseGrowth = prevPurchaseTotal > 0 ? ((currentPurchaseTotal - prevPurchaseTotal) / prevPurchaseTotal) * 100 : 0;

    // Due calculations
    const currentDueTotal = currentSales.reduce((acc, sale) => acc + getSaleDue(sale), 0);
    const prevDueTotal = prevSales.reduce((acc, sale) => acc + getSaleDue(sale), 0);
    const dueGrowth = prevDueTotal > 0 ? ((currentDueTotal - prevDueTotal) / prevDueTotal) * 100 : 0;

    // Paid Sale calculations
    const currentPaidSaleTotal = Math.max(0, currentRevenue - currentDueTotal);
    const prevPaidSaleTotal = Math.max(0, prevRevenue - prevDueTotal);
    const paidSaleGrowth = prevPaidSaleTotal > 0 ? ((currentPaidSaleTotal - prevPaidSaleTotal) / prevPaidSaleTotal) * 100 : 0;

    // New Customers count (first sale placed ever)
    const currentNewCustomers = await prisma.client.count({
      where: {
        createdAt: { gte: currentStart, lte: currentEnd },
        status: "active",
      },
    });
    const prevNewCustomers = await prisma.client.count({
      where: {
        createdAt: { gte: prevStart, lte: prevEnd },
        status: "active",
      },
    });
    const newCustomersGrowth = prevNewCustomers > 0 ? ((currentNewCustomers - prevNewCustomers) / prevNewCustomers) * 100 : 0;

    // Warehouse filter for Vouchers / Expenses
    const voucherWarehouseFilter: any = warehouseId !== "all"
      ? {
          OR: [
            { warehouseId: warehouseId },
            {
              warehouseId: null,
              User_Voucher_createdByToUser: {
                defaultWarehouseId: warehouseId,
              },
            },
            {
              VoucherLine: {
                some: {
                  ChartOfAccount: {
                    CashBankAccount: {
                      warehouses: {
                        some: { id: warehouseId },
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : {};

    // Expenses calculations
    const [currentExpensesAgg, prevExpensesAgg] = await Promise.all([
      prisma.voucherLine.aggregate({
        where: {
          Voucher: {
            type: "PAYMENT",
            createdAt: { gte: currentStart, lte: currentEnd },
            ...voucherWarehouseFilter,
          },
          debitAmount: { gt: 0 },
        },
        _sum: { debitAmount: true },
      }),
      prisma.voucherLine.aggregate({
        where: {
          Voucher: {
            type: "PAYMENT",
            createdAt: { gte: prevStart, lte: prevEnd },
            ...voucherWarehouseFilter,
          },
          debitAmount: { gt: 0 },
        },
        _sum: { debitAmount: true },
      }),
    ]);
    const currentExpenseTotal = Number(currentExpensesAgg._sum?.debitAmount || 0);
    const prevExpenseTotal = Number(prevExpensesAgg._sum?.debitAmount || 0);
    const expenseGrowth = prevExpenseTotal > 0 ? ((currentExpenseTotal - prevExpenseTotal) / prevExpenseTotal) * 100 : 0;

    // Retail Stock & Value Calculations
    const stockWhere: any = {};
    if (warehouseId !== "all") {
      stockWhere.warehouseId = warehouseId;
    }
    const stockItems = await prisma.stock.findMany({
      where: stockWhere,
      include: {
        item: {
          select: {
            costPrice: true,
            salesPrice: true,
            wholesalePrice: true,
            itemType: true,
            isTrash: true,
            status: true,
          },
        },
        variant: {
          select: {
            costPrice: true,
            salesPrice: true,
            wholesalePrice: true,
            item: {
              select: {
                itemType: true,
                isTrash: true,
                status: true,
              },
            },
          },
        },
      },
    });

    let retailTotalQuantity = 0;
    let retailSaleValue = 0;
    let retailStockCostValue = 0;

    let wholesaleTotalQuantity = 0;
    let wholesaleSaleValue = 0;
    let wholesaleStockCostValue = 0;

    for (const s of stockItems) {
      const parentItem = s.item || s.variant?.item;
      if (parentItem?.isTrash || parentItem?.status === "inactive") continue;

      const qty = Number(s.quantity || 0);
      if (qty <= 0) continue;

      const itemType = parentItem?.itemType;
      const sellingPrice = Number(s.variant?.salesPrice ?? s.item?.salesPrice ?? 0);
      const wholesalePrice = Number(s.variant?.wholesalePrice ?? s.item?.wholesalePrice ?? sellingPrice);
      const purchasePrice = Number(s.variant?.costPrice ?? s.item?.costPrice ?? 0);

      if (itemType === "WHOLESALE") {
        wholesaleTotalQuantity += qty;
        wholesaleSaleValue += qty * (wholesalePrice > 0 ? wholesalePrice : sellingPrice);
        wholesaleStockCostValue += qty * purchasePrice;
      } else if (itemType === "RETAIL" || itemType === "READY_PRODUCT") {
        retailTotalQuantity += qty;
        retailSaleValue += qty * sellingPrice;
        retailStockCostValue += qty * purchasePrice;
      }
    }

    // 2. Fetch Recent Orders (latest 3)
    const recentOrders = await prisma.sale.findMany({
      where: currentFilter,
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        saleNumber: true,
        createdAt: true,
        grandTotal: true,
        status: true,
        client: {
          select: {
            name: true,
          },
        },
        items: {
          take: 1,
          select: {
            description: true,
            item: {
              select: {
                featuredImage: true,
              },
            },
          },
        },
      },
    });

    // 3. Fetch Most Selling Products
    const topSaleItems = await prisma.saleItem.groupBy({
      by: ["itemId"],
      where: {
        sale: currentFilter,
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 3,
    });

    const mostSellingProducts = await Promise.all(
      topSaleItems.map(async (group) => {
        const item = await prisma.item.findUnique({
          where: { id: group.itemId },
          select: { id: true, name: true, code: true, featuredImage: true },
        });
        return {
          id: item?.code || "N/A",
          name: item?.name || "Unknown Item",
          image: item?.featuredImage || null,
          sales: Number(group._sum.quantity || 0),
        };
      })
    );

    // 4. Fetch Weekly Top Customers
    const topClientsBySales = await prisma.sale.groupBy({
      by: ["clientId"],
      where: {
        ...currentFilter,
        orderType: { not: "RETURN" }
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 3,
    });

    const topCustomers = await Promise.all(
      topClientsBySales.map(async (group) => {
        const client = await prisma.client.findUnique({
          where: { id: group.clientId },
          select: { id: true, name: true, image: true },
        });
        return {
          id: client?.id || group.clientId,
          name: client?.name || "Anonymous Customer",
          image: client?.image || null,
          orders: group._count.id,
        };
      })
    );

    // Fetch all active & visible Cash & Bank & MFS Accounts
    const cashBankAccounts = await prisma.cashBankAccount.findMany({
      where: {
        status: "active",
        isVisible: true,
      },
      select: {
        id: true,
        chartOfAccountId: true,
        type: true,
        ChartOfAccount: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        warehouses: {
          select: {
            id: true,
          },
        },
      },
    });

    // Filter accounts by warehouse
    const filteredAccounts = cashBankAccounts.filter((acc: any) => {
      if (warehouseId === "all") return true;
      if (acc.warehouses.length === 0) return true; // Global account
      return acc.warehouses.some((w: any) => w.id === warehouseId);
    });

    const accountWarehouseMap = new Map<string, Set<string>>();
    cashBankAccounts.forEach((acc: any) => {
      if (acc.warehouses && acc.warehouses.length > 0) {
        accountWarehouseMap.set(acc.id, new Set(acc.warehouses.map((w: any) => w.id)));
      }
    });

    // Fetch completed, non-trash sales up to currentEnd
    const salesForPayments = await prisma.sale.findMany({
      where: {
        isTrash: false,
        status: "COMPLETED",
        date: { lte: currentEnd },
      },
      select: {
        date: true,
        paymentDetails: true,
        warehouseId: true,
      },
    });

    // In-memory aggregation of payments received up to currentEnd
    const paymentMap = new Map<string, number>();
    let currentCollectionsReceived = 0;
    let prevCollectionsReceived = 0;

    for (const sale of salesForPayments) {
      const details = sale.paymentDetails as any;
      if (!details) continue;

      // 1. Initial Payments (sales up to selected date filter end boundary)
      const saleDate = new Date(sale.date);
      const isInitialForWarehouse = warehouseId === "all" || sale.warehouseId === warehouseId;
      if (saleDate <= currentEnd && isInitialForWarehouse) {
        if (details.cashAmount && details.cashAccountId) {
          const netCash = Number(details.cashAmount) - Number(details.changeAmount || 0);
          paymentMap.set(details.cashAccountId, (paymentMap.get(details.cashAccountId) || 0) + netCash);
        }
        if (details.cardAmount && details.cardAccountId) {
          paymentMap.set(details.cardAccountId, (paymentMap.get(details.cardAccountId) || 0) + Number(details.cardAmount));
        }
        if (details.mfsAmount && details.mfsAccountId) {
          paymentMap.set(details.mfsAccountId, (paymentMap.get(details.mfsAccountId) || 0) + Number(details.mfsAmount));
        }
      }

      // 2. Due Collections (collections up to selected date filter end boundary)
      if (Array.isArray(details.dueCollections)) {
        for (const col of details.dueCollections) {
          const colDate = new Date(col.date);
          const colAmount = Number(col.cashAmount || 0) + Number(col.cardAmount || 0) + Number(col.mfsAmount || 0);
          
          const colWarehouseId = col.warehouseId;
          const colAccountId = col.cashAccountId || col.cardAccountId || col.mfsAccountId;

          let isColForWarehouse = false;
          if (warehouseId === "all") {
            isColForWarehouse = true;
          } else if (colWarehouseId) {
            isColForWarehouse = colWarehouseId === warehouseId;
          } else if (colAccountId && accountWarehouseMap.has(colAccountId)) {
            isColForWarehouse = accountWarehouseMap.get(colAccountId)!.has(warehouseId);
          } else {
            isColForWarehouse = sale.warehouseId === warehouseId;
          }

          if (isColForWarehouse) {
            if (colDate <= currentEnd) {
              if (colDate >= currentStart) {
                currentCollectionsReceived += colAmount;
              }
              if (col.cashAmount && col.cashAccountId) {
                paymentMap.set(col.cashAccountId, (paymentMap.get(col.cashAccountId) || 0) + Number(col.cashAmount));
              }
              if (col.cardAmount && col.cardAccountId) {
                paymentMap.set(col.cardAccountId, (paymentMap.get(col.cardAccountId) || 0) + Number(col.cardAmount));
              }
              if (col.mfsAmount && col.mfsAccountId) {
                paymentMap.set(col.mfsAccountId, (paymentMap.get(col.mfsAccountId) || 0) + Number(col.mfsAmount));
              }
            } else if (colDate >= prevStart && colDate <= prevEnd) {
              prevCollectionsReceived += colAmount;
            }
          }
        }
      }
    }

    const collectionsReceivedGrowth = prevCollectionsReceived > 0 
      ? ((currentCollectionsReceived - prevCollectionsReceived) / prevCollectionsReceived) * 100 
      : 0;

    // 3. Proper Accounts System: Compute Debit, Credit, and Net Cumulative Balance for each account up to currentEnd
    const accountCoaIds = filteredAccounts.map((acc: any) => acc.chartOfAccountId || acc.ChartOfAccount?.id).filter(Boolean);
    const accountDetailsMap = new Map<string, { debit: number; credit: number; balance: number }>();

    if (accountCoaIds.length > 0) {
      // Query JournalEntryLine aggregates
      const journalAggregates = await prisma.journalEntryLine.groupBy({
        by: ["chartOfAccountId"],
        where: {
          chartOfAccountId: { in: accountCoaIds },
          JournalEntry: {
            date: { lte: currentEnd },
          },
        },
        _sum: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      const glDebitMap = new Map<string, number>();
      const glCreditMap = new Map<string, number>();
      for (const agg of journalAggregates) {
        glDebitMap.set(agg.chartOfAccountId, Number(agg._sum.debitAmount || 0));
        glCreditMap.set(agg.chartOfAccountId, Number(agg._sum.creditAmount || 0));
      }

      // Query VoucherLine for expense outflows / deposits
      const voucherLines = await prisma.voucherLine.findMany({
        where: {
          chartOfAccountId: { in: accountCoaIds },
          createdAt: { lte: currentEnd },
        },
        select: {
          chartOfAccountId: true,
          debitAmount: true,
          creditAmount: true,
        },
      });

      const vDebitMap = new Map<string, number>();
      const vCreditMap = new Map<string, number>();
      for (const line of voucherLines) {
        const d = Number(line.debitAmount || 0);
        const c = Number(line.creditAmount || 0);
        vDebitMap.set(line.chartOfAccountId, (vDebitMap.get(line.chartOfAccountId) || 0) + d);
        vCreditMap.set(line.chartOfAccountId, (vCreditMap.get(line.chartOfAccountId) || 0) + c);
      }

      for (const acc of filteredAccounts) {
        const coaId = acc.ChartOfAccount?.id;
        if (!coaId) continue;

        const glDebit = glDebitMap.get(coaId) || 0;
        const glCredit = glCreditMap.get(coaId) || 0;
        const posInflow = paymentMap.get(coaId) || 0;
        const vDebit = vDebitMap.get(coaId) || 0;
        const vCredit = vCreditMap.get(coaId) || 0;

        let debit = glDebit;
        let credit = glCredit;

        if (debit === 0 && posInflow > 0) debit += posInflow;
        if (glDebit === 0 && vDebit > 0) debit += vDebit;
        if (glCredit === 0 && vCredit > 0) credit += vCredit;

        const balance = debit - credit;
        accountDetailsMap.set(coaId, { debit, credit, balance });
      }
    }

    const receivedAccounts = filteredAccounts.map((acc: any) => {
      const coa = acc.ChartOfAccount;
      const details = accountDetailsMap.get(coa.id) || { debit: 0, credit: 0, balance: 0 };

      return {
        id: acc.id,
        type: acc.type, // "CASH" | "BANK" | "MFS"
        coaId: coa.id,
        coaCode: coa.code,
        coaName: coa.name,
        debit: details.debit,
        credit: details.credit,
        balance: details.balance,
        ledgerBalance: details.balance,
        receivedAmount: details.balance,
      };
    });

    // Sort by type CASH (1), BANK (2), MFS (3) then by name
    receivedAccounts.sort((a, b) => {
      const typeOrder = { CASH: 1, BANK: 2, MFS: 3 };
      const orderA = typeOrder[a.type as keyof typeof typeOrder] || 4;
      const orderB = typeOrder[b.type as keyof typeof typeOrder] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return a.coaName.localeCompare(b.coaName);
    });

    // 5. Generate Trend points (SVG Charts: Order count and Income growth)
    // Dynamic chart boundary calculation independent of top-level date filters
    const now = new Date();
    let chartStart = subDays(now, 7);



    const chartData = [];
    const selectedChartRange = chartRange || "7-days";

    let stepsCount = 7;
    if (selectedChartRange === "7-days") {
      stepsCount = 7;
      chartStart = subDays(now, 7);
      for (let i = 0; i < stepsCount; i++) {
        const stepStart = startOfDay(subDays(now, 6 - i));
        const stepEnd = endOfDay(subDays(now, 6 - i));
        
        // Sales
        const intervalSales = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const salesTotal = intervalSales.reduce((acc, s) => acc + Number(s.grandTotal), 0);

        // Purchases
        const intervalPurchases = await prisma.purchase.findMany({
          where: { ...purchaseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const purchaseTotal = intervalPurchases.reduce((acc, p) => acc + Number(p.grandTotal), 0);

        // Expenses (Payment Vouchers)
        const intervalExpenses = await prisma.voucherLine.aggregate({
          where: {
            Voucher: {
              type: "PAYMENT",
              createdAt: { gte: stepStart, lte: stepEnd },
              ...voucherWarehouseFilter,
            },
            debitAmount: { gt: 0 },
          },
          _sum: { debitAmount: true },
        });
        const expenseTotal = Number(intervalExpenses._sum?.debitAmount || 0);

        // Due (Client unpaid outstanding amount)
        const intervalSalesForDue = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true, paymentDetails: true },
        });
        const dueTotal = intervalSalesForDue.reduce((acc, s) => acc + getSaleDue(s), 0);

        chartData.push({
          label: stepStart.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
          sales: salesTotal,
          purchase: purchaseTotal,
          expense: expenseTotal,
          due: dueTotal,
        });
      }
    } else if (selectedChartRange === "last-month") {
      stepsCount = 4;
      for (let i = 0; i < stepsCount; i++) {
        const stepStart = startOfDay(subDays(now, (4 - i) * 7));
        const stepEnd = endOfDay(subDays(now, (3 - i) * 7));
        
        const intervalSales = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const salesTotal = intervalSales.reduce((acc, s) => acc + Number(s.grandTotal), 0);

        const intervalPurchases = await prisma.purchase.findMany({
          where: { ...purchaseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const purchaseTotal = intervalPurchases.reduce((acc, p) => acc + Number(p.grandTotal), 0);

        const intervalExpenses = await prisma.voucherLine.aggregate({
          where: {
            Voucher: {
              type: "PAYMENT",
              createdAt: { gte: stepStart, lte: stepEnd },
              ...voucherWarehouseFilter,
            },
            debitAmount: { gt: 0 },
          },
          _sum: { debitAmount: true },
        });
        const expenseTotal = Number(intervalExpenses._sum?.debitAmount || 0);

        const intervalSalesForDue = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true, paymentDetails: true },
        });
        const dueTotal = intervalSalesForDue.reduce((acc, s) => acc + getSaleDue(s), 0);

        chartData.push({
          label: `Week ${i + 1}`,
          sales: salesTotal,
          purchase: purchaseTotal,
          expense: expenseTotal,
          due: dueTotal,
        });
      }
    } else if (selectedChartRange === "3-months") {
      stepsCount = 12;
      for (let i = 0; i < stepsCount; i++) {
        const stepStart = startOfDay(subDays(now, (12 - i) * 7));
        const stepEnd = endOfDay(subDays(now, (11 - i) * 7));
        
        const intervalSales = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const salesTotal = intervalSales.reduce((acc, s) => acc + Number(s.grandTotal), 0);

        const intervalPurchases = await prisma.purchase.findMany({
          where: { ...purchaseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const purchaseTotal = intervalPurchases.reduce((acc, p) => acc + Number(p.grandTotal), 0);

        const intervalExpenses = await prisma.voucherLine.aggregate({
          where: {
            Voucher: {
              type: "PAYMENT",
              createdAt: { gte: stepStart, lte: stepEnd },
              ...voucherWarehouseFilter,
            },
            debitAmount: { gt: 0 },
          },
          _sum: { debitAmount: true },
        });
        const expenseTotal = Number(intervalExpenses._sum?.debitAmount || 0);

        const intervalSalesForDue = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true, paymentDetails: true },
        });
        const dueTotal = intervalSalesForDue.reduce((acc, s) => acc + getSaleDue(s), 0);

        chartData.push({
          label: `W${i + 1}`,
          sales: salesTotal,
          purchase: purchaseTotal,
          expense: expenseTotal,
          due: dueTotal,
        });
      }
    } else if (selectedChartRange === "last-year") {
      stepsCount = 12;
      for (let i = 0; i < stepsCount; i++) {
        const stepStart = startOfMonth(subMonths(now, 11 - i));
        const stepEnd = endOfMonth(subMonths(now, 11 - i));
        
        const intervalSales = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const salesTotal = intervalSales.reduce((acc, s) => acc + Number(s.grandTotal), 0);

        const intervalPurchases = await prisma.purchase.findMany({
          where: { ...purchaseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true },
        });
        const purchaseTotal = intervalPurchases.reduce((acc, p) => acc + Number(p.grandTotal), 0);

        const intervalExpenses = await prisma.voucherLine.aggregate({
          where: {
            Voucher: {
              type: "PAYMENT",
              createdAt: { gte: stepStart, lte: stepEnd },
              ...voucherWarehouseFilter,
            },
            debitAmount: { gt: 0 },
          },
          _sum: { debitAmount: true },
        });
        const expenseTotal = Number(intervalExpenses._sum?.debitAmount || 0);

        const intervalSalesForDue = await prisma.sale.findMany({
          where: { ...baseFilter, createdAt: { gte: stepStart, lte: stepEnd } },
          select: { grandTotal: true, paymentDetails: true },
        });
        const dueTotal = intervalSalesForDue.reduce((acc, s) => acc + getSaleDue(s), 0);

        chartData.push({
          label: stepStart.toLocaleDateString("en-US", { month: "short" }),
          sales: salesTotal,
          purchase: purchaseTotal,
          expense: expenseTotal,
          due: dueTotal,
        });
      }
    }

    return {
      success: true,
      data: {
        revenue: currentRevenue,
        revenueGrowth,
        paidSaleTotal: currentPaidSaleTotal,
        paidSaleGrowth,
        newCustomers: currentNewCustomers,
        newCustomersGrowth,
        purchaseTotal: currentPurchaseTotal,
        purchaseGrowth,
        dueTotal: currentDueTotal,
        dueGrowth,
        collectionsReceived: currentCollectionsReceived,
        collectionsReceivedGrowth,
        expenseTotal: currentExpenseTotal,
        expenseGrowth,
        generalDiscount: currentGeneralDiscount,
        couponDiscount: currentCouponDiscount,
        totalSaleDiscount: currentTotalSaleDiscount,
        totalSaleDiscountGrowth,
        retailStock: {
          totalQuantity: retailTotalQuantity,
          saleValue: retailSaleValue,
          stockValue: retailStockCostValue,
        },
        wholesaleStock: {
          totalQuantity: wholesaleTotalQuantity,
          saleValue: wholesaleSaleValue,
          stockValue: wholesaleStockCostValue,
        },
        recentOrders: recentOrders.map(o => ({
          id: o.id,
          orderId: o.saleNumber,
          product: o.items[0]?.description || "General Goods",
          productImage: o.items[0]?.item?.featuredImage || null,
          customer: o.client.name,
          date: o.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          status: o.status === "COMPLETED" ? "Shipped" : o.status === "DRAFT" ? "Pending" : "Canceled",
          amount: Number(o.grandTotal),
        })),
        mostSellingProducts,
        topCustomers,
        chartData,
        receivedAccounts,
      },
    };
  } catch (err) {
    console.error("Dashboard Server Action Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load database stats" };
  }
}
