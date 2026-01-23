'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
      stats: {
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
      stats: {
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
    console.error('Error fetching user activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity',
      activities: [],
    };
  }
}


