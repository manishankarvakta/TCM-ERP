'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QuotationStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

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
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
          },
        },
        submittedBy: {
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
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        categories: {
          select: {
            category: {
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
      activities,
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

