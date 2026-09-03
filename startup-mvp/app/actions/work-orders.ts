'use server';

import { revalidateBothPaths } from '@/lib/route-utils-server';
import { prisma } from '@/lib/prisma';
// @ts-expect-error - Legacy compatibility
import { Prisma, WorkOrderStatus, QuotationStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from '@/lib/notification';
import { createUserLog, LogAction } from '@/lib/user-log';
import { hasPermission } from '@/lib/permissions';

/**
 * Generate work order code: WO-YYYY-XXX format
 */
async function generateWorkOrderCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;
  
  // Find the latest work order code for this year
  const latest = await prisma.order.findFirst({
    where: {
// @ts-expect-error - Legacy compatibility
      code: {
        startsWith: prefix,
      },
    },
    orderBy: {
// @ts-expect-error - Legacy compatibility
      code: 'desc',
    },
  });

  if (!latest) {
    return `${prefix}001`;
  }

  // Extract the number from the latest code
// @ts-expect-error - Legacy compatibility
  const latestNumber = parseInt(latest.code.replace(prefix, ''), 10);
  const nextNumber = latestNumber + 1;
  
  // Format with leading zeros (001, 002, etc.)
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Get all work orders with relations
 */
export async function getWorkOrders(
  page: number = 1,
  limit: number = 10,
  search: string = '',
  status?: string
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        workOrders: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Check if user is admin
    const isAdmin = session.user.role?.toLowerCase() === 'admin';

    const skip = (page - 1) * limit;
    const isTrashTab = status === 'trash';

    // Build where clause
    const whereConditions: any[] = [];
    
    // Add user filter: only show work orders from current user or users they are in charge of
    // Admins can see all work orders from all users
    if (!isAdmin) {
      // Fetch users that the current user is in charge of
      const usersInCharge = await prisma.user.findMany({
        where: { inchargeId: session.user.id },
        select: { id: true },
      });
      const userIdsInCharge = usersInCharge.map(u => u.id);

      // Build array of allowed user IDs (current user + users in charge)
      const allowedUserIds = [session.user.id, ...userIdsInCharge];
      
      whereConditions.push({
        createdById: { in: allowedUserIds }
      });
    }
    
    // Set trash filter
    if (isTrashTab) {
      whereConditions.push({ isTrash: true });
    } else {
      whereConditions.push({ isTrash: false });
      // Set status filter if specific status is requested
      if (status && status !== 'all') {
        const statusUpper = status.toUpperCase();
        if (Object.values(WorkOrderStatus).includes(statusUpper as WorkOrderStatus)) {
          whereConditions.push({ status: statusUpper as WorkOrderStatus });
        }
      }
    }

    // Add search filter
    if (search) {
      whereConditions.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { Quotation: { quotationNumber: { contains: search, mode: 'insensitive' } } },
          { Quotation: { subject: { contains: search, mode: 'insensitive' } } },
          { Quotation: { Client: { name: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }

    // Combine all conditions with AND
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Get total count
    const total = await prisma.order.count({ where });

    // Get work orders
    const workOrders = await prisma.order.findMany({
      where,
      include: {
        Quotation: {
          select: {
            id: true,
            quotationNumber: true,
            subject: true,
            Client: {
              select: {
                id: true,
                name: true,
                company: true,
              },
            },
          },
        },
// @ts-expect-error - Legacy compatibility
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
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    // Serialize Decimal values to numbers for client components
    const serializedWorkOrders = workOrders.map((workOrder) => ({
      ...workOrder,
// @ts-expect-error - Legacy compatibility
      amount: Number(workOrder.amount),
// @ts-expect-error - Legacy compatibility
      advance: workOrder.advance ? Number(workOrder.advance) : null,
// @ts-expect-error - Legacy compatibility
      balance: Number(workOrder.balance),
    }));

    return {
      success: true,
      workOrders: serializedWorkOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work orders',
      workOrders: [],
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
 * Get single work order by ID
 */
export async function getWorkOrder(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        data: null,
      };
    }

    const workOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        Quotation: {
          select: {
            id: true,
            quotationNumber: true,
            subject: true,
            date: true,
            Client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                company: true,
              },
            },
            Organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
// @ts-expect-error - Legacy compatibility
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!workOrder) {
      return {
        success: false,
        error: 'Work order not found',
        data: null,
      };
    }

    // Serialize Decimal values
    const serializedWorkOrder = {
      ...workOrder,
// @ts-expect-error - Legacy compatibility
      amount: Number(workOrder.amount),
// @ts-expect-error - Legacy compatibility
      advance: workOrder.advance ? Number(workOrder.advance) : null,
// @ts-expect-error - Legacy compatibility
      balance: Number(workOrder.balance),
    };

    return {
      success: true,
      data: serializedWorkOrder,
    };
  } catch (error) {
    console.error('Error fetching work order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work order',
      data: null,
    };
  }
}

/**
 * Create work order
 */
export async function createWorkOrder(data: {
  quotationId: string;
  amount: number;
  advance?: number;
  status?: WorkOrderStatus;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        data: null,
      };
    }

    // Check permission
    const canCreate = await hasPermission(session.user.id, 'work-orders.work-orders', 'create');
    if (!canCreate && session.user.role?.toLowerCase() !== 'admin') {
      return {
        success: false,
        error: 'You do not have permission to create work orders',
        data: null,
      };
    }

    // Validate quotation exists
    const quotation = await prisma.quotation.findUnique({
      where: { id: data.quotationId },
    });

    if (!quotation) {
      return {
        success: false,
        error: 'Quotation not found',
        data: null,
      };
    }

    // Generate code
    const code = await generateWorkOrderCode();

    // Calculate balance
    const advanceAmount = data.advance || 0;
    const balance = data.amount - advanceAmount;

    // Create work order
    const workOrder = await prisma.order.create({
      data: {
// @ts-expect-error - Legacy compatibility
        code,
        quotationId: data.quotationId,
        createdById: session.user.id,
        amount: new Prisma.Decimal(data.amount),
        advance: advanceAmount > 0 ? new Prisma.Decimal(advanceAmount) : null,
        balance: new Prisma.Decimal(balance),
        status: data.status || WorkOrderStatus.PROGRESS,
      },
      include: {
        Quotation: {
          select: {
            id: true,
            quotationNumber: true,
            subject: true,
          },
        },
// @ts-expect-error - Legacy compatibility
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update quotation status to ACCEPTED when work order is created
    await prisma.quotation.update({
      where: { id: data.quotationId },
      data: { status: QuotationStatus.ACCEPTED },
    });

    // Create Order from accepted quotation (Transitional step)
    try {
      const { createOrderFromQuotation } = await import('./orders');
      await createOrderFromQuotation(data.quotationId);
    } catch (error) {
      console.error('Failed to create order for quotation from work order:', error);
    }

    revalidateBothPaths('work-orders', 'page');
    revalidateBothPaths('quotations', 'page');
    revalidateBothPaths(`quotations/${data.quotationId}`, 'page');
    
    // Create notification
    await notifyItemCreated(
      session.user.id,
      'Work Order',
// @ts-expect-error - Legacy compatibility
      workOrder.code
    );
    
    // Log work order creation
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
// @ts-expect-error - Legacy compatibility
      details: `Work Order "${workOrder.code}" created successfully. Quotation "${quotation.quotationNumber}" status updated to ACCEPTED.`,
      metadata: {
        workOrderId: workOrder.id,
// @ts-expect-error - Legacy compatibility
        code: workOrder.code,
        quotationId: workOrder.quotationId,
        quotationNumber: quotation.quotationNumber,
// @ts-expect-error - Legacy compatibility
        amount: Number(workOrder.amount),
        status: workOrder.status,
        quotationStatusUpdated: true,
      },
    });
    
    return {
      success: true,
      data: {
        ...workOrder,
// @ts-expect-error - Legacy compatibility
        amount: Number(workOrder.amount),
// @ts-expect-error - Legacy compatibility
        advance: workOrder.advance ? Number(workOrder.advance) : null,
// @ts-expect-error - Legacy compatibility
        balance: Number(workOrder.balance),
      },
    };
  } catch (error) {
    console.error('Error creating work order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create work order',
      data: null,
    };
  }
}

/**
 * Update work order
 */
export async function updateWorkOrder(
  id: string,
  data: {
    quotationId?: string;
    amount?: number;
    advance?: number;
    status?: WorkOrderStatus;
  }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        data: null,
      };
    }

    // Check permission
    const canEdit = await hasPermission(session.user.id, 'work-orders.work-orders', 'edit');
    if (!canEdit && session.user.role?.toLowerCase() !== 'admin') {
      return {
        success: false,
        error: 'You do not have permission to edit work orders',
        data: null,
      };
    }

    // Check if work order exists
    const existingWorkOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingWorkOrder) {
      return {
        success: false,
        error: 'Work order not found',
        data: null,
      };
    }

    // Validate quotation if provided
    if (data.quotationId) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: data.quotationId },
      });

      if (!quotation) {
        return {
          success: false,
          error: 'Quotation not found',
          data: null,
        };
      }
    }

    // Calculate balance
// @ts-expect-error - Legacy compatibility
    const amount = data.amount !== undefined ? data.amount : Number(existingWorkOrder.amount);
// @ts-expect-error - Legacy compatibility
    const advance = data.advance !== undefined ? data.advance : (existingWorkOrder.advance ? Number(existingWorkOrder.advance) : 0);
    const balance = amount - advance;

    // Update work order
    const workOrder = await prisma.order.update({
      where: { id },
      data: {
        quotationId: data.quotationId || existingWorkOrder.quotationId,
// @ts-expect-error - Legacy compatibility
        amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : existingWorkOrder.amount,
        advance: data.advance !== undefined 
          ? (data.advance > 0 ? new Prisma.Decimal(data.advance) : null)
// @ts-expect-error - Legacy compatibility
          : existingWorkOrder.advance,
        balance: new Prisma.Decimal(balance),
        status: data.status || existingWorkOrder.status,
      },
      include: {
        Quotation: {
          select: {
            id: true,
            quotationNumber: true,
            subject: true,
          },
        },
// @ts-expect-error - Legacy compatibility
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidateBothPaths('work-orders', 'page');
    revalidateBothPaths(`work-orders/${id}`, 'page');
    
    // Create notification
    await notifyItemUpdated(
      session.user.id,
      'Work Order',
// @ts-expect-error - Legacy compatibility
      workOrder.code
    );
    
    // Log work order update
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
// @ts-expect-error - Legacy compatibility
      details: `Work Order "${workOrder.code}" updated`,
      metadata: {
        workOrderId: workOrder.id,
// @ts-expect-error - Legacy compatibility
        code: workOrder.code,
// @ts-expect-error - Legacy compatibility
        amount: Number(workOrder.amount),
        status: workOrder.status,
      },
    });
    
    return {
      success: true,
      data: {
        ...workOrder,
// @ts-expect-error - Legacy compatibility
        amount: Number(workOrder.amount),
// @ts-expect-error - Legacy compatibility
        advance: workOrder.advance ? Number(workOrder.advance) : null,
// @ts-expect-error - Legacy compatibility
        balance: Number(workOrder.balance),
      },
    };
  } catch (error) {
    console.error('Error updating work order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update work order',
      data: null,
    };
  }
}

/**
 * Update work order status
 */
export async function updateWorkOrderStatus(
  id: string,
  newStatus: WorkOrderStatus
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const workOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!workOrder) {
      return {
        success: false,
        error: 'Work order not found',
      };
    }

    const updatedWorkOrder = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
      },
      include: {
        Quotation: {
          select: {
            id: true,
            quotationNumber: true,
          },
        },
      },
    });

    revalidateBothPaths('work-orders', 'page');
    revalidateBothPaths(`work-orders/${id}`, 'page');

    // Log status change
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
// @ts-expect-error - Legacy compatibility
      details: `Work Order "${workOrder.code}" status changed from ${workOrder.status} to ${newStatus}`,
      metadata: {
        workOrderId: workOrder.id,
// @ts-expect-error - Legacy compatibility
        code: workOrder.code,
        oldStatus: workOrder.status,
        newStatus: newStatus,
      },
    });

    return {
      success: true,
      data: {
        ...updatedWorkOrder,
// @ts-expect-error - Legacy compatibility
        amount: Number(updatedWorkOrder.amount),
// @ts-expect-error - Legacy compatibility
        advance: updatedWorkOrder.advance ? Number(updatedWorkOrder.advance) : null,
// @ts-expect-error - Legacy compatibility
        balance: Number(updatedWorkOrder.balance),
      },
    };
  } catch (error) {
    console.error('Error updating work order status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update work order status',
    };
  }
}

/**
 * Move work order to trash
 */
export async function moveWorkOrderToTrash(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Check permission
    const canDelete = await hasPermission(session.user.id, 'work-orders.work-orders', 'move-to-trash');
    if (!canDelete && session.user.role?.toLowerCase() !== 'admin') {
      return {
        success: false,
        error: 'You do not have permission to delete work orders',
      };
    }

    const workOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!workOrder) {
      return {
        success: false,
        error: 'Work order not found',
      };
    }

    await prisma.order.update({
      where: { id },
      data: {
// @ts-expect-error - Legacy compatibility
        isTrash: true,
      },
    });

    revalidateBothPaths('work-orders', 'page');

    // Log deletion
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
// @ts-expect-error - Legacy compatibility
      details: `Work Order "${workOrder.code}" moved to trash`,
      metadata: {
        workOrderId: workOrder.id,
// @ts-expect-error - Legacy compatibility
        code: workOrder.code,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error moving work order to trash:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move work order to trash',
    };
  }
}

/**
 * Restore work order from trash
 */
export async function restoreWorkOrder(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const workOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!workOrder) {
      return {
        success: false,
        error: 'Work order not found',
      };
    }

    await prisma.order.update({
      where: { id },
      data: {
// @ts-expect-error - Legacy compatibility
        isTrash: false,
      },
    });

    revalidateBothPaths('work-orders', 'page');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error restoring work order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore work order',
    };
  }
}

/**
 * Delete work order permanently
 */
export async function deleteWorkOrderPermanently(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Check permission
    const canDelete = await hasPermission(session.user.id, 'work-orders.work-orders', 'delete-permanently');
    if (!canDelete && session.user.role?.toLowerCase() !== 'admin') {
      return {
        success: false,
        error: 'You do not have permission to permanently delete work orders',
      };
    }

    const workOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!workOrder) {
      return {
        success: false,
        error: 'Work order not found',
      };
    }

    await prisma.order.delete({
      where: { id },
    });

    revalidateBothPaths('work-orders', 'page');

    // Create notification
    await notifyItemDeleted(
      session.user.id,
      'Work Order',
// @ts-expect-error - Legacy compatibility
      workOrder.code
    );

    // Log permanent deletion
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
// @ts-expect-error - Legacy compatibility
      details: `Work Order "${workOrder.code}" permanently deleted`,
      metadata: {
        workOrderId: workOrder.id,
// @ts-expect-error - Legacy compatibility
        code: workOrder.code,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting work order permanently:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete work order permanently',
    };
  }
}

