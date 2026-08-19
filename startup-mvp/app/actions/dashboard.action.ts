'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QuotationStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { canAccessModule, hasPermission } from '@/lib/permissions';

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
      totalQuotations,
      quotationsByStatus,
      totalRevenue,
      activeClients,
      totalItems,
      totalUsers,
      totalCategories,
      totalModuleGroups,
      activeSuppliers,
      totalFiles,
      recentQuotationsCount,
      recentItemsCount,
      recentClientsCount,
    ] = await Promise.all([
      // Total quotations (excluding trash)
      prisma.quotation.count({
        where: { isTrash: false },
      }),
      // Quotations by status
      prisma.quotation.groupBy({
        by: ['status'],
        where: { isTrash: false },
        _count: { status: true },
      }),
      // Total revenue from accepted quotations
      prisma.quotation.aggregate({
        where: {
          isTrash: false,
          status: QuotationStatus.ACCEPTED,
        },
        _sum: {
          grandTotal: true,
        },
      }),
      // Active clients
      prisma.client.count({
        where: { status: 'active' },
      }),
      // Total active items
      prisma.item.count({
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
      // Total module groups
      prisma.moduleGroup.count({
        where: { status: 'active' },
      }),
      // Active suppliers
      prisma.supplier.count({
        where: { status: 'active' },
      }),
      // Total files
      prisma.file.count(),
      // Recent quotations (last 7 days)
      prisma.quotation.count({
        where: {
          isTrash: false,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Recent items (last 7 days)
      prisma.item.count({
        where: {
          status: 'active',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
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

    // Calculate revenue
    const revenue = totalRevenue._sum.grandTotal 
      ? Number(totalRevenue._sum.grandTotal) 
      : 0;

    // Format quotations by status
    const statusBreakdown = quotationsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

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
      stats: {
        quotations: {
          total: totalQuotations,
          byStatus: statusBreakdown,
          recent: recentQuotationsCount,
        },
        revenue: {
          total: revenue,
          formatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(revenue),
        },
        clients: {
          total: activeClients,
          recent: recentClientsCount,
        },
        items: {
          total: totalItems,
          recent: recentItemsCount,
        },
        users: {
          total: totalUsers,
          admin: adminUsers,
          regular: regularUsers,
        },
        categories: {
          total: totalCategories,
        },
        moduleGroups: {
          total: totalModuleGroups,
        },
        suppliers: {
          total: activeSuppliers,
        },
        files: {
          total: totalFiles,
        },
      },
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
 * Get recent quotations
 */
export async function getRecentQuotations(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        quotations: [],
      };
    }

    const quotations = await prisma.quotation.findMany({
      where: {
        isTrash: false,
      },
      select: {
        id: true,
        quotationNumber: true,
        subject: true,
        status: true,
        total: true,
        grandTotal: true,
        discount: true,
        shippingCharges: true,
        createdAt: true,
        Client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
          },
        },
        User_Quotation_submittedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Serialize Decimal values
    const serializedQuotations = quotations.map((q) => ({
      ...q,
      total: q.total ? Number(q.total) : 0,
      grandTotal: q.grandTotal ? Number(q.grandTotal) : 0,
      discount: q.discount ? Number(q.discount) : null,
      shippingCharges: q.shippingCharges ? Number(q.shippingCharges) : null,
      client: q.Client,
      submittedBy: q.User_Quotation_submittedByIdToUser,
      Client: undefined,
      User_Quotation_submittedByIdToUser: undefined,
    }));

    return {
      success: true,
      quotations: serializedQuotations,
    };
  } catch (error) {
    console.error('Error fetching recent quotations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent quotations',
      quotations: [],
    };
  }
}

/**
 * Get quotation status breakdown
 */
export async function getQuotationStatusBreakdown() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        breakdown: [],
      };
    }

    const breakdown = await prisma.quotation.groupBy({
      by: ['status'],
      where: {
        isTrash: false,
      },
      _count: {
        status: true,
      },
    });

    const formatted = breakdown.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));

    return {
      success: true,
      breakdown: formatted,
    };
  } catch (error) {
    console.error('Error fetching quotation status breakdown:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch status breakdown',
      breakdown: [],
    };
  }
}

/**
 * Get recent items
 */
export async function getRecentItems(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        items: [],
      };
    }

    const items = await prisma.item.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        code: true,
        description: true,
        unitPrice: true,
        costPrice: true,
        createdAt: true,
        Unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        ItemCategory: {
          select: {
            Category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 3,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Serialize Decimal values
    const serializedItems = items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      costPrice: Number(item.costPrice),
      unit: item.Unit,
      categories: item.ItemCategory.map((ic) => ({
        category: ic.Category,
      })),
      Unit: undefined,
      ItemCategory: undefined,
    }));

    return {
      success: true,
      items: serializedItems,
    };
  } catch (error) {
    console.error('Error fetching recent items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent items',
      items: [],
    };
  }
}

/**
 * Get recent clients
 */
export async function getRecentClients(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
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
            Quotation: true,
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
      clients: clients.map((client) => ({
        ...client,
        quotationCount: client._count.Quotation,
      })),
    };
  } catch (error) {
    console.error('Error fetching recent clients:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent clients',
      clients: [],
    };
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
        User: {
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

    const mappedActivities = activities.map((a) => ({
      ...a,
      user: a.User,
      User: undefined,
    }));

    return {
      success: true,
      activities: mappedActivities,
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
 * Get revenue statistics
 */
export async function getRevenueStats() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        revenue: null,
      };
    }

    // Get revenue by status
    const revenueByStatus = await prisma.quotation.groupBy({
      by: ['status'],
      where: {
        isTrash: false,
      },
      _sum: {
        grandTotal: true,
      },
    });

    // Get total revenue
    const totalRevenue = await prisma.quotation.aggregate({
      where: {
        isTrash: false,
      },
      _sum: {
        grandTotal: true,
      },
    });

    // Get revenue from accepted quotations
    const acceptedRevenue = await prisma.quotation.aggregate({
      where: {
        isTrash: false,
        status: QuotationStatus.ACCEPTED,
      },
      _sum: {
        grandTotal: true,
      },
    });

    const formatted = revenueByStatus.map((item) => ({
      status: item.status,
      revenue: item._sum.grandTotal ? Number(item._sum.grandTotal) : 0,
    }));

    return {
      success: true,
      revenue: {
        total: totalRevenue._sum.grandTotal ? Number(totalRevenue._sum.grandTotal) : 0,
        accepted: acceptedRevenue._sum.grandTotal ? Number(acceptedRevenue._sum.grandTotal) : 0,
        byStatus: formatted,
      },
    };
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch revenue statistics',
      revenue: null,
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
    const canAccessQuotations = await canAccessModule(userId, 'quotations');
    const canAccessItems = await canAccessModule(userId, 'items');
    const canAccessClients = await canAccessModule(userId, 'peoples');
    const canAccessSuppliers = await canAccessModule(userId, 'peoples');

    // Build queries based on permissions
    const queries: Promise<any>[] = [];

    // Quotations stats (if user has access)
    if (canAccessQuotations) {
      queries.push(
        prisma.quotation.count({
          where: { isTrash: false },
        }),
        prisma.quotation.groupBy({
          by: ['status'],
          where: { isTrash: false },
          _count: { status: true },
        }),
        prisma.quotation.aggregate({
          where: {
            isTrash: false,
            status: QuotationStatus.ACCEPTED,
          },
          _sum: { grandTotal: true },
        }),
        prisma.quotation.count({
          where: {
            isTrash: false,
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.quotation.count({
          where: {
            isTrash: false,
            status: { in: [QuotationStatus.DRAFT, QuotationStatus.SENT] },
          },
        }),
      );
    } else {
      queries.push(Promise.resolve(0), Promise.resolve([]), Promise.resolve({ _sum: { grandTotal: null } }), Promise.resolve(0), Promise.resolve(0));
    }

    // Items stats (if user has access)
    if (canAccessItems) {
      queries.push(
        prisma.item.count({
          where: { status: 'active' },
        }),
        prisma.item.count({
          where: {
            status: 'active',
            createdAt: { gte: sevenDaysAgo },
          },
        }),
      );
    } else {
      queries.push(Promise.resolve(0), Promise.resolve(0));
    }

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
    const totalQuotations = canAccessQuotations ? results[idx++] : 0;
    const quotationsByStatus = canAccessQuotations ? results[idx++] : [];
    const totalRevenue = canAccessQuotations ? results[idx++] : { _sum: { grandTotal: null } };
    const recentQuotationsCount = canAccessQuotations ? results[idx++] : 0;
    const pendingQuotations = canAccessQuotations ? results[idx++] : 0;
    const totalItems = canAccessItems ? results[idx++] : 0;
    const recentItemsCount = canAccessItems ? results[idx++] : 0;
    const activeClients = canAccessClients ? results[idx++] : 0;
    const recentClientsCount = canAccessClients ? results[idx++] : 0;
    const activeSuppliers = canAccessSuppliers ? results[idx++] : 0;
    const recentActivityCount = results[idx++];

    // Calculate revenue
    const revenue = totalRevenue._sum?.grandTotal 
      ? Number(totalRevenue._sum.grandTotal) 
      : 0;

    // Format quotations by status
    const statusBreakdown = Array.isArray(quotationsByStatus) 
      ? quotationsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>)
      : {};

    return {
      success: true,
      stats: {
        quotations: {
          total: totalQuotations,
          byStatus: statusBreakdown,
          recent: recentQuotationsCount,
          pending: pendingQuotations,
        },
        revenue: {
          total: revenue,
          formatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(revenue),
        },
        clients: {
          total: activeClients,
          recent: recentClientsCount,
        },
        items: {
          total: totalItems,
          recent: recentItemsCount,
        },
        suppliers: {
          total: activeSuppliers,
        },
        activity: {
          recent: recentActivityCount,
        },
        permissions: {
          canAccessQuotations,
          canAccessItems,
          canAccessClients,
          canAccessSuppliers,
        },
      },
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
 * Get user-specific recent quotations (permission-aware)
 */
export async function getUserRecentQuotations(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        quotations: [],
      };
    }

    const userId = session.user.id;
    const canAccess = await canAccessModule(userId, 'quotations');

    if (!canAccess) {
      return {
        success: true,
        quotations: [],
      };
    }

    const quotations = await prisma.quotation.findMany({
      where: {
        isTrash: false,
      },
      select: {
        id: true,
        quotationNumber: true,
        subject: true,
        status: true,
        total: true,
        grandTotal: true,
        discount: true,
        shippingCharges: true,
        createdAt: true,
        Client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
          },
        },
        User_Quotation_submittedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Serialize Decimal values
    const serializedQuotations = quotations.map((q) => ({
      ...q,
      total: q.total ? Number(q.total) : 0,
      grandTotal: q.grandTotal ? Number(q.grandTotal) : 0,
      discount: q.discount ? Number(q.discount) : null,
      shippingCharges: q.shippingCharges ? Number(q.shippingCharges) : null,
      client: q.Client,
      submittedBy: q.User_Quotation_submittedByIdToUser,
      Client: undefined,
      User_Quotation_submittedByIdToUser: undefined,
    }));

    return {
      success: true,
      quotations: serializedQuotations,
    };
  } catch (error) {
    console.error('Error fetching user recent quotations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent quotations',
      quotations: [],
    };
  }
}

/**
 * Get user-specific recent items (permission-aware)
 */
export async function getUserRecentItems(limit: number = 10) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        items: [],
      };
    }

    const userId = session.user.id;
    const canAccess = await canAccessModule(userId, 'items');

    if (!canAccess) {
      return {
        success: true,
        items: [],
      };
    }

    const items = await prisma.item.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        code: true,
        description: true,
        unitPrice: true,
        costPrice: true,
        createdAt: true,
        Unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        ItemCategory: {
          select: {
            Category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 3,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Serialize Decimal values
    const serializedItems = items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      costPrice: Number(item.costPrice),
      unit: item.Unit,
      categories: item.ItemCategory.map((ic) => ({
        category: ic.Category,
      })),
      Unit: undefined,
      ItemCategory: undefined,
    }));

    return {
      success: true,
      items: serializedItems,
    };
  } catch (error) {
    console.error('Error fetching user recent items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recent items',
      items: [],
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
            Quotation: true,
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
      clients: clients.map((client) => ({
        ...client,
        quotationCount: client._count.Quotation,
      })),
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
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        User: {
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

    const mappedActivities = activities.map((a) => ({
      ...a,
      user: a.User,
      User: undefined,
    }));

    return {
      success: true,
      activities: mappedActivities,
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

/**
 * Get user-specific quotation status breakdown (permission-aware)
 */
export async function getUserQuotationStatusBreakdown() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized',
        breakdown: [],
      };
    }

    const userId = session.user.id;
    const canAccess = await canAccessModule(userId, 'quotations');

    if (!canAccess) {
      return {
        success: true,
        breakdown: [],
      };
    }

    const breakdown = await prisma.quotation.groupBy({
      by: ['status'],
      where: {
        isTrash: false,
      },
      _count: {
        status: true,
      },
    });

    const formatted = breakdown.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));

    return {
      success: true,
      breakdown: formatted,
    };
  } catch (error) {
    console.error('Error fetching user quotation status breakdown:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch status breakdown',
      breakdown: [],
    };
  }
}

/**
 * Get monthly sales and quotation counts for the last N months
 */
export async function getDashboardTrends(monthsCount: number = 6) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        trends: [],
      };
    }

    // Check if user is admin
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized - Admin access required',
        trends: [],
      };
    }

    const now = new Date();
    // Get start date (first day of the month N months ago)
    const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);

    const quotations = await prisma.quotation.findMany({
      where: {
        isTrash: false,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        grandTotal: true,
      },
    });

    // Initialize all months in the range with 0 values to ensure clean visualization
    const trendsMap: Record<string, { month: string; monthLabel: string; revenue: number; quotations: number; sortKey: string }> = {};
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      const displayLabel = `${monthLabel} ${year}`;
      
      trendsMap[monthKey] = {
        month: displayLabel,
        monthLabel: monthLabel,
        revenue: 0,
        quotations: 0,
        sortKey: monthKey,
      };
    }

    // Populate data from database
    for (const q of quotations) {
      const qDate = new Date(q.createdAt);
      const year = qDate.getFullYear();
      const monthNum = qDate.getMonth();
      const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;
      
      if (trendsMap[monthKey]) {
        trendsMap[monthKey].quotations += 1;
        if (q.status === QuotationStatus.ACCEPTED && q.grandTotal) {
          trendsMap[monthKey].revenue += Number(q.grandTotal);
        }
      }
    }

    // Sort chronologically and format
    const trends = Object.values(trendsMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ month, revenue, quotations }) => ({
        month,
        revenue,
        quotations,
      }));

    return {
      success: true,
      trends,
    };
  } catch (error) {
    console.error('Error fetching dashboard trends:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard trends',
      trends: [],
    };
  }
}


