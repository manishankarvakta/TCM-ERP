'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, ProductionOrderStatus, SaleStatus, ItemType, VoucherType } from '@prisma/client';
import { canAccessModule, hasPermission } from '@/lib/permissions';
import { startOfDay, endOfDay, subDays } from 'date-fns';

/**
 * Helper to convert Prisma Decimal/Date objects to plain types for Client Components
 */
function serializeData<T>(data: T): any {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        stats: null,
      };
    }

    // Check if user is admin
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized - Admin access required',
        stats: null,
      };
    }

    // Get all statistics in parallel for better performance
    const [
      activeClients,
      totalUsers,
      totalCategories,
      activeSuppliers,
      totalFiles,
      recentClientsCount,
    ] = await Promise.all([
      // Active clients
      prisma.client.count({
        where: { status: 'active' },
      }),
      // Total active users
      prisma.user.count({
        where: { status: 'active' },
      }),
      // Total categories
      prisma.category.count({
        where: { status: 'active' },
      }),
      // Active suppliers
      prisma.supplier.count({
        where: { status: 'active' },
      }),
      // Total files
      prisma.file.count(),
      // Recent clients (last 7 days)
      prisma.client.count({
        where: {
          status: 'active',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get admin vs regular users count
    const [adminUsers, regularUsers] = await Promise.all([
      prisma.user.count({
        where: {
          status: 'active',
          role: 'admin',
        },
      }),
      prisma.user.count({
        where: {
          status: 'active',
          role: { not: 'admin' },
        },
      }),
    ]);

    return {
      success: true,
      stats: serializeData({
        clients: {
          total: activeClients,
          recent: recentClientsCount,
        },
        users: {
          total: totalUsers,
          admin: adminUsers,
          regular: regularUsers,
        },
        categories: {
          total: totalCategories,
        },
        suppliers: {
          total: activeSuppliers,
        },
        files: {
          total: totalFiles,
        },
      }),
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics',
      stats: null,
    };
  }
}

/**
 * Get Production Dashboard Data
 */
export async function getProductionDashboardData() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;
    const canView = await hasPermission(userId, 'production.orders', 'view');
    if (!canView) return { success: false, error: 'Permission denied' };

    const today = new Date();
    const [planned, inProgress, completedToday] = await Promise.all([
      prisma.productionOrder.count({ where: { status: ProductionOrderStatus.PLANNED, isTrash: false } }),
      prisma.productionOrder.count({ where: { status: ProductionOrderStatus.IN_PROGRESS, isTrash: false } }),
      prisma.productionOrder.count({
        where: {
          status: ProductionOrderStatus.COMPLETED,
          completedAt: { gte: startOfDay(today), lte: endOfDay(today) },
          isTrash: false
        }
      }),
    ]);

    const recentOrders = await prisma.productionOrder.findMany({
      where: { isTrash: false, status: { not: 'CANCELLED' } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { 
        item: { select: { name: true, unit: { select: { symbol: true } } } } 
      }
    });

    return {
      success: true,
      data: serializeData({
        stats: { planned, inProgress, completedToday },
        recentOrders
      })
    };
  } catch (error) {
    console.error('getProductionDashboardData error:', error);
    return { success: false, error: 'Failed to fetch production data' };
  }
}

/**
 * Get Inventory Dashboard Data
 */
export async function getInventoryDashboardData() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;
    const canView = await hasPermission(userId, 'inventory.stock', 'view');
    if (!canView) return { success: false, error: 'Permission denied' };

    // Get items with low stock (raw materials focus)
    const lowStockItems = await prisma.item.findMany({
      where: {
        status: 'active',
        isTrash: false,
        trackInventory: true,
        itemType: ItemType.RAW_MATERIAL,
        stocks: {
          some: {
            quantity: { lt: 10 } // Simple threshold for now
          }
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        unit: { select: { symbol: true } },
        stocks: {
          select: { quantity: true, warehouse: { select: { name: true } } }
        }
      },
      take: 5
    });

    // Recent stock movements (last 5 from ledger)
    const recentMovements = await prisma.stockLedger.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { name: true, code: true } },
        warehouse: { select: { name: true } }
      }
    });

    // Total stock value
    const stockStats = await prisma.stock.aggregate({
      _sum: { quantity: true }
    });

    return {
      success: true,
      data: serializeData({
        lowStockItems,
        recentMovements,
        totalQuantity: Number(stockStats._sum.quantity || 0)
      })
    };
  } catch (error) {
    console.error('getInventoryDashboardData error:', error);
    return { success: false, error: 'Failed to fetch inventory data' };
  }
}

/**
 * Get Sales Dashboard Data
 */
export async function getSalesDashboardData() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;
    const canView = await hasPermission(userId, 'sales.sales', 'view');
    if (!canView) return { success: false, error: 'Permission denied' };

    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const [todaySales, todayRevenue] = await Promise.all([
      prisma.sale.count({ where: { date: { gte: start, lte: end }, status: SaleStatus.COMPLETED, isTrash: false } }),
      prisma.sale.aggregate({
        where: { date: { gte: start, lte: end }, status: SaleStatus.COMPLETED, isTrash: false },
        _sum: { grandTotal: true }
      })
    ]);

    // Top selling garment items today
    const topItems = await prisma.saleItem.groupBy({
      by: ['itemId'],
      where: { sale: { date: { gte: start, lte: end }, status: SaleStatus.COMPLETED, isTrash: false } },
      _sum: { quantity: true, amount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    // Fetch names for top items
    const topItemsWithNames = await Promise.all(
      topItems.map(async (item) => {
        const itemInfo = await prisma.item.findUnique({
          where: { id: item.itemId },
          select: { name: true }
        });
        return {
          ...item,
          name: itemInfo?.name || 'Unknown'
        };
      })
    );

    return {
      success: true,
      data: serializeData({
        todaySales,
        todayRevenue: Number(todayRevenue._sum.grandTotal || 0),
        topItems: topItemsWithNames
      })
    };
  } catch (error) {
    console.error('getSalesDashboardData error:', error);
    return { success: false, error: 'Failed to fetch sales data' };
  }
}

/**
 * Get Accounting Dashboard Data
 */
export async function getAccountingDashboardData() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const userId = session.user.id;
    const canView = await hasPermission(userId, 'accounts.vouchers', 'view');
    if (!canView) return { success: false, error: 'Permission denied' };

    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // Get Cash & Bank Balances
    const cashBankAccounts = await prisma.cashBankAccount.findMany({
      include: {
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
            code: true,
            VoucherLine: {
              select: {
                debitAmount: true,
                creditAmount: true
              }
            }
          }
        }
      }
    });

    const balances = cashBankAccounts.map(account => {
      const totalDebit = account.ChartOfAccount.VoucherLine.reduce((sum, line) => sum + Number(line.debitAmount), 0);
      const totalCredit = account.ChartOfAccount.VoucherLine.reduce((sum, line) => sum + Number(line.creditAmount), 0);
      return {
        name: account.ChartOfAccount.name,
        type: account.type,
        balance: totalDebit - totalCredit
      };
    });

    // Counts for staff dashboard
    const [pendingVouchers, todayReceipts, todayPayments] = await Promise.all([
      prisma.voucher.count({ where: { status: 'draft' } }),
      prisma.voucher.count({ where: { type: VoucherType.RECEIPT, date: { gte: start, lte: end } } }),
      prisma.voucher.count({ where: { type: VoucherType.PAYMENT, date: { gte: start, lte: end } } }),
    ]);

    return {
      success: true,
      data: serializeData({ 
        balances,
        pendingVouchers,
        todayActivity: {
          receipts: todayReceipts,
          payments: todayPayments
        }
      })
    };
  } catch (error) {
    console.error('getAccountingDashboardData error:', error);
    return { success: false, error: 'Failed to fetch accounting data' };
  }
}

/**
 * Get system activity (user logs)
 */
export async function getSystemActivity(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        activities: [],
      };
    }

    const activities = await prisma.userLog.findMany({
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return {
      success: true,
      activities: serializeData(activities),
    };
  } catch (error) {
    console.error('Error fetching system activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch system activity',
      activities: [],
    };
  }
}


/**
 * Get user-specific dashboard statistics (permission-aware)
 */
export async function getUserDashboardStats() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        stats: null,
      };
    }

    const userId = session.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Check permissions for each module
    const canAccessClients = await canAccessModule(userId, 'peoples');
    const canAccessSuppliers = await canAccessModule(userId, 'peoples');

    // Build queries based on permissions
    const queries: Promise<any>[] = [];

    // Clients stats (if user has access)
    if (canAccessClients) {
      queries.push(
        prisma.client.count({
          where: { status: 'active' },
        }),
        prisma.client.count({
          where: {
            status: 'active',
            createdAt: { gte: sevenDaysAgo },
          },
        }),
      );
    } else {
      queries.push(Promise.resolve(0), Promise.resolve(0));
    }

    // Suppliers stats (if user has access)
    if (canAccessSuppliers) {
      queries.push(
        prisma.supplier.count({
          where: { status: 'active' },
        }),
      );
    } else {
      queries.push(Promise.resolve(0));
    }

    // Activity count (always available)
    queries.push(
      prisma.userLog.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    );

    const results = await Promise.all(queries);

    let idx = 0;
    const activeClients = canAccessClients ? results[idx++] : 0;
    const recentClientsCount = canAccessClients ? results[idx++] : 0;
    const activeSuppliers = canAccessSuppliers ? results[idx++] : 0;
    const recentActivityCount = results[idx++];

    return {
      success: true,
      stats: serializeData({
        clients: {
          total: activeClients,
          recent: recentClientsCount,
        },
        suppliers: {
          total: activeSuppliers,
        },
        activity: {
          recent: recentActivityCount,
        },
        permissions: {
          canAccessClients,
          canAccessSuppliers,
        },
      }),
    };
  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics',
      stats: null,
    };
  }
}


/**
 * Get user-specific recent clients (permission-aware)
 */
export async function getUserRecentClients(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        clients: [],
      };
    }

    const userId = session.user.id;
    const canAccess = await canAccessModule(userId, 'peoples');

    if (!canAccess) {
      return {
        success: true,
        clients: [],
      };
    }

    const clients = await prisma.client.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            sales: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return {
      success: true,
      clients: serializeData(clients.map((client) => ({
        ...client,
        saleCount: client._count.sales,
      }))),
    };
  } catch (error) {
    console.error('Error fetching user recent clients:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent clients',
      clients: [],
    };
  }
}

/**
 * Get user-specific activity (filtered by user if needed)
 */
export async function getUserActivity(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        activities: [],
      };
    }

    const activities = await prisma.userLog.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return {
      success: true,
      activities: serializeData(activities),
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity',
      activities: [],
    };
  }
}
