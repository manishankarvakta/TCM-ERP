'use server';

import { revalidateBothPaths } from '@/lib/route-utils-server';
import { prisma } from '@/lib/prisma';
import { Prisma, QuotationStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from '@/lib/notification';
import { createUserLog, LogAction } from '@/lib/user-log';
import { createClient } from '@/app/(dashboard)/dashboard/clients/_actions/client.action';

/**
 * Get all quotations with relations
 */
export async function getQuotations(
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
        quotations: [],
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

    // Build where clause - use AND array to properly combine filters
    const whereConditions: any[] = [];
    
    // Add user filter: only show quotations from current user or users they are in charge of
    // Admins can see all quotations from all users
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
        submittedById: { in: allowedUserIds }
      });
    }
    
    // Set trash filter
    if (isTrashTab) {
      // Show only trashed items
      whereConditions.push({ isTrash: true });
    } else {
      // For all other tabs, exclude trashed items
      whereConditions.push({ isTrash: false });
      
      // Set status filter if specific status is requested
      if (status && status !== 'all') {
        const statusUpper = status.toUpperCase();
        if (Object.values(QuotationStatus).includes(statusUpper as QuotationStatus)) {
          whereConditions.push({ status: statusUpper as QuotationStatus });
        }
      }
    }

    // Add search filter
    if (search) {
      whereConditions.push({
        OR: [
          { quotationNumber: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
          { client: { company: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    // Combine all conditions with AND
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Get total count
    const total = await prisma.quotation.count({ where });

    // Get quotations
    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            image: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        workOrders: {
          select: {
            id: true,
            isTrash: true,
          },
          where: {
            isTrash: false, // Only count non-trashed work orders
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
    const serializedQuotations = quotations.map((quotation) => ({
      ...quotation,
      total: Number(quotation.total || 0),
      discount: quotation.discount ? Number(quotation.discount) : null,
      grandTotal: quotation.grandTotal ? Number(quotation.grandTotal) : null,
      shippingCharges: quotation.shippingCharges ? Number(quotation.shippingCharges) : null,
      isTrash: quotation.isTrash || false,
    }));

    return {
      success: true,
      quotations: serializedQuotations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quotations',
      quotations: [],
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
 * Get single quotation by ID
 */
export async function getQuotation(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        data: null,
      };
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            company: true,
            image: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            details: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            logo: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        section: {
          include: {
            preparedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            groups: {
              include: {
                items: {
                  include: {
                    item: {
                      select: {
                        id: true,
                        code: true,
                        description: true,
                        unitPrice: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
            items: {
              include: {
                item: {
                  select: {
                    id: true,
                    code: true,
                    description: true,
                    unitPrice: true,
                  },
                },
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
            categoryGroups: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                items: {
                  include: {
                    item: {
                      select: {
                        id: true,
                        code: true,
                        description: true,
                        unitPrice: true,
                      },
                    },
                  },
                  orderBy: {
                    sortOrder: 'asc',
                  },
                },
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!quotation) {
      return {
        success: false,
        error: 'Quotation not found',
        data: null,
      };
    }

    // Check if quotation is expired and update status if needed
    const now = new Date();
    if (quotation.expiredDate && quotation.expiredDate <= now && quotation.status !== 'EXPIRED' && !quotation.isTrash) {
      await prisma.quotation.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      // Update the status in the current object
      quotation.status = 'EXPIRED';
    }

    // Serialize Decimal values to numbers for client components
    const serializedQuotation = {
      ...quotation,
      total: Number(quotation.total),
      discount: quotation.discount ? Number(quotation.discount) : null,
      grandTotal: quotation.grandTotal ? Number(quotation.grandTotal) : null,
      shippingCharges: quotation.shippingCharges ? Number(quotation.shippingCharges) : null,
      vatIncluded: quotation.vatIncluded,
      projectLocation: quotation.projectLocation,
      client: quotation.client,
      organization: quotation.organization || null,
      organizationId: quotation.organizationId || null,
      submittedBy: quotation.submittedBy,
      section: quotation.section?.map((section) => ({
        ...section,
        discount: section.discount ? Number(section.discount) : null,
        total: section.total ? Number(section.total) : null,
        grandTotal: section.grandTotal ? Number(section.grandTotal) : null,
        categoryId: section.categoryId || null,
        groups: section.groups?.map((group) => ({
          ...group,
          quantity: group.quantity ? Number(group.quantity) : null,
          baseUnit: group.baseUnit || null,
          baseUnitPrice: group.baseUnitPrice ? Number(group.baseUnitPrice) : null,
          items: group.items?.map((item) => ({
            ...item,
            no: item.no != null ? String(item.no) : null, // Ensure no is always string
            height: item.height ? Number(item.height) : null,
            width: item.width ? Number(item.width) : null,
            depth: item.depth ? Number(item.depth) : null,
            unit: item.unit || null,
            unitPrice: Number(item.unitPrice),
            quantity: Number(item.quantity),
            unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
            totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
            amount: Number(item.amount),
            item: item.item ? {
              ...item.item,
              unitPrice: Number(item.item.unitPrice),
            } : null,
          })),
        })),
        items: section.items?.map((item) => ({
          ...item,
          height: item.height ? Number(item.height) : null,
          width: item.width ? Number(item.width) : null,
          depth: item.depth ? Number(item.depth) : null,
          unit: item.unit || null,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
          unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
          totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
          amount: Number(item.amount),
          item: item.item ? {
            ...item.item,
            unitPrice: Number(item.item.unitPrice),
          } : null,
        })),
        categoryGroups: section.categoryGroups?.map((categoryGroup) => ({
          ...categoryGroup,
          categoryId: categoryGroup.categoryId || null,
          category: categoryGroup.category ? {
            id: categoryGroup.category.id,
            name: categoryGroup.category.name,
          } : null,
          items: categoryGroup.items?.map((item) => ({
            ...item,
            height: item.height ? Number(item.height) : null,
            width: item.width ? Number(item.width) : null,
            depth: item.depth ? Number(item.depth) : null,
            unit: item.unit || null,
            unitPrice: Number(item.unitPrice),
            quantity: Number(item.quantity),
            unitShutter: item.unitShutter ? Number(item.unitShutter) : null,
            totalShutter: item.totalShutter ? Number(item.totalShutter) : null,
            amount: Number(item.amount),
            item: item.item ? {
              ...item.item,
              unitPrice: Number(item.item.unitPrice),
            } : null,
          })),
        })),
      })),
    };

    return {
      success: true,
      data: serializedQuotation,
    };
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quotation',
      data: null,
    };
  }
}

/**
 * Create quotation
 */
export async function createQuotation(data: any) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        data: null,
      };
    }

    // Handle client
    let clientId = data.clientId;
    if (!clientId && data.clientName) {
      const existingClient = await prisma.client.findFirst({
        where: { name: data.clientName },
      });

      if (existingClient) {
        clientId = existingClient.id;
        if (data.clientAddress || data.clientContact) {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              address: data.clientAddress || undefined,
              phone: data.clientContact || undefined,
              email: data.clientContact?.includes('@') ? data.clientContact : undefined,
            },
          });
        }
      } else {
        // Use createClient function to ensure COA is created automatically
        // Generate a temporary email if not provided (createClient requires email)
        const clientEmail = data.clientContact?.includes('@') 
          ? data.clientContact 
          : `client-${Date.now()}@temp.local`;
        
        const clientResult = await createClient({
          name: data.clientName,
          address: data.clientAddress || undefined,
          phone: data.clientContact || undefined,
          email: clientEmail,
          status: 'active',
        });
        
        if (!clientResult.success || !clientResult.client) {
          return {
            success: false,
            error: clientResult.error || 'Failed to create client',
            quotation: null,
          };
        }
        
        clientId = clientResult.client.id;
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Client is required',
        data: null,
      };
    }

    // Use current session user for submittedById
    const submittedById = session.user.id;

    // Map modules to sections (form uses "modules", Prisma uses "sections")
    const sections = data.sections || data.modules || [];
    
    // Optimized total calculation using reduce/flatMap (single pass instead of nested loops)
    const total = sections && Array.isArray(sections) ? sections.reduce((sum: number, section: any) => {
      // Use grandTotal if available (already calculated with discount)
      if (section.grandTotal != null) {
        return sum + Number(section.grandTotal || 0);
      }
      
      // Otherwise calculate from items using flatMap for single-pass iteration
      const allItems = [
        ...(section.groups || []).flatMap((group: any) => group.items || []),
        ...(section.categoryGroups || []).flatMap((categoryGroup: any) => categoryGroup.items || []),
        ...(section.items || [])
      ];
      
      const sectionTotal = allItems.reduce((itemSum: number, item: any) => 
        itemSum + Number(item.amount || 0), 0
      );
      
      // Apply discount (amount-based, not percentage)
      const discountedTotal = section.discount 
        ? Math.max(0, sectionTotal - Number(section.discount))
        : sectionTotal;
      
      return sum + discountedTotal;
    }, 0) : 0;

    // Prepare moduleGroupIds for parallel fetching
    const moduleGroupIdsToFetch = new Set<string>();
    sections.forEach((section: any) => {
      if (section.groups && Array.isArray(section.groups)) {
        section.groups.forEach((group: any) => {
          if (group.moduleGroupId && 
              group.moduleGroupId !== '' && 
              (!group.baseUnit || !group.baseUnitPrice)) {
            moduleGroupIdsToFetch.add(group.moduleGroupId);
          }
        });
      }
    });

    // Parallel database queries: Fetch TOS, coverLetter, and moduleGroups simultaneously
    const [tosResult, coverLetterResult, moduleGroupsResult] = await Promise.all([
      // TOS content fetch
      !data.tos ? (async () => {
        try {
          const { getTOSContent } = await import('@/app/actions/quotation-helpers');
          return await getTOSContent();
        } catch (error) {
          return { success: false, content: null };
        }
      })() : Promise.resolve({ success: true, content: data.tos }),
      
      // Cover letter fetch
      (!data.coverLetter && data.selectedCoverLetterId && data.selectedCoverLetterId !== 'custom') 
        ? (async () => {
            try {
              const { getCoverLetterById } = await import('@/app/(dashboard)/dashboard/settings/_actions/coverLetter.action');
              return await getCoverLetterById(data.selectedCoverLetterId);
            } catch (error) {
              return { success: false, coverLetter: null };
            }
          })()
        : Promise.resolve({ success: true, coverLetter: data.coverLetter ? { content: data.coverLetter } : null }),
      
      // ModuleGroup data fetch
      moduleGroupIdsToFetch.size > 0
        ? prisma.moduleGroup.findMany({
            where: { id: { in: Array.from(moduleGroupIdsToFetch) } },
            select: { id: true, baseUnit: true, baseUnitPrice: true },
          })
        : Promise.resolve([])
    ]);

    // Extract results
    const tosContent = tosResult.success ? tosResult.content : data.tos || null;
    const coverLetterContent = coverLetterResult.success && coverLetterResult.coverLetter
      ? coverLetterResult.coverLetter.content
      : data.coverLetter || null;

    // Build moduleGroupData map
    const moduleGroupData: Record<string, { baseUnit: string | null; baseUnitPrice: number | null }> = {};
    moduleGroupsResult.forEach((mg) => {
      moduleGroupData[mg.id] = {
        baseUnit: mg.baseUnit,
        baseUnitPrice: mg.baseUnitPrice ? Number(mg.baseUnitPrice) : null,
      };
    });

    // Enrich sections with baseUnit/baseUnitPrice from ModuleGroup if missing
    const enrichedSections = sections.map((section: any) => ({
      ...section,
      groups: (section.groups || []).map((group: any) => {
        if (group.moduleGroupId && moduleGroupData[group.moduleGroupId]) {
          return {
            ...group,
            baseUnit: group.baseUnit || moduleGroupData[group.moduleGroupId].baseUnit,
            baseUnitPrice: group.baseUnitPrice || moduleGroupData[group.moduleGroupId].baseUnitPrice,
          };
        }
        return group;
      }),
    }));

    // Create quotation with optimized data fetching
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: data.quotationNumber || `QT-${Date.now()}`,
        subject: data.subject || '',
        date: data.date ? new Date(data.date) : new Date(),
        coverLetter: coverLetterContent || null,
        tos: tosContent || null,
        total: total > 0 ? new Prisma.Decimal(total) : new Prisma.Decimal(0),
        status: 'DRAFT', // Always DRAFT on create
        expiredDate: data.expiredDate ? new Date(data.expiredDate) : null as any,
        clientId: clientId,
        organizationId: data.organizationId || null,
        submittedById: submittedById, // Always use session user
        shippingCharges: data.shippingCharges ? new Prisma.Decimal(data.shippingCharges) : new Prisma.Decimal(0),
        vatIncluded: data.vatIncluded || false,
        projectLocation: data.projectLocation || null,
        isTrash: false, // Default to false - quotations are not in trash by default
        section: {
          create: (enrichedSections || []).map((section: any, sectionIndex: number) => ({
            title: section.title || `Section ${sectionIndex + 1}`,
            note: section.note || null,
        discount: section.discount ? new Prisma.Decimal(section.discount) : new Prisma.Decimal(0),
        total: section.total ? new Prisma.Decimal(section.total) : new Prisma.Decimal(0),
        grandTotal: section.grandTotal ? new Prisma.Decimal(section.grandTotal) : new Prisma.Decimal(0),
            sortOrder: section.sortOrder ?? sectionIndex,
            categoryId: section.categoryId || null,
            preparedById: section.preparedById || session.user.id,
            groups: {
              create: (section.groups || []).map((group: any, groupIndex: number) => ({
                code: group.code || null,
                description: group.description || '',
                quantity: group.quantity ? new Prisma.Decimal(group.quantity) : new Prisma.Decimal(0),
                number: group.number || null,
                sortOrder: group.sortOrder ?? groupIndex,
                moduleGroupId: group.moduleGroupId && group.moduleGroupId !== '' ? group.moduleGroupId : null,
                baseUnit: group.baseUnit || null,
                baseUnitPrice: group.baseUnitPrice ? new Prisma.Decimal(group.baseUnitPrice) : null,
                items: {
                  create: (group.items || []).map((item: any, itemIndex: number) => ({
                    sl: item.sl ?? itemIndex + 1,
                    no: item.no != null && item.no !== '' ? String(item.no) : null,
                    code: item.code || null,
                    description: item.description || null,
                    height: item.height ? new Prisma.Decimal(item.height) : null,
                    width: item.width ? new Prisma.Decimal(item.width) : null,
                    depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                    unit: item.unit || null,
                    unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                    quantity: new Prisma.Decimal(item.quantity || 0),
                    unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                    totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                    discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                    amount: new Prisma.Decimal(item.amount || 0),
                    sortOrder: item.sortOrder ?? itemIndex,
                    itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                    moduleGroupItemId: item.moduleGroupItemId && item.moduleGroupItemId !== '' ? item.moduleGroupItemId : null,
                  })),
                },
              })),
            },
            items: {
              create: (section.items || []).map((item: any, itemIndex: number) => ({
                sl: item.sl ?? itemIndex + 1,
                no: item.no != null && item.no !== '' ? String(item.no) : null,
                code: item.code || null,
                description: item.description || null,
                height: item.height ? new Prisma.Decimal(item.height) : null,
                width: item.width ? new Prisma.Decimal(item.width) : null,
                depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                unit: item.unit || null,
                unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                quantity: new Prisma.Decimal(item.quantity || 0),
                unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                amount: new Prisma.Decimal(item.amount || 0),
                sortOrder: item.sortOrder ?? itemIndex,
                itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
              })),
            },
            categoryGroups: {
              create: (section.categoryGroups || []).map((categoryGroup: any, categoryGroupIndex: number) => ({
                categoryId: categoryGroup.categoryId || null,
                sortOrder: categoryGroup.sortOrder ?? categoryGroupIndex,
                items: {
                  create: (categoryGroup.items || []).map((item: any, itemIndex: number) => ({
                    sl: item.sl ?? itemIndex + 1,
                    no: item.no != null && item.no !== '' ? String(item.no) : null,
                    code: item.code || null,
                    description: item.description || null,
                    height: item.height ? new Prisma.Decimal(item.height) : null,
                    width: item.width ? new Prisma.Decimal(item.width) : null,
                    depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                    unit: item.unit || null,
                    unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                    quantity: new Prisma.Decimal(item.quantity || 0),
                    unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                    totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                    discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                    amount: new Prisma.Decimal(item.amount || 0),
                    sortOrder: item.sortOrder ?? itemIndex,
                    itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                  })),
                },
              })),
            },
          })),
        },
      },
      // Selective includes: Only fetch essential relations, not everything
      include: {
        client: {
          select: { id: true, name: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        section: {
          select: {
            id: true,
            title: true,
            total: true,
            grandTotal: true,
          },
          take: 1, // Only need first section for basic info
        },
      },
    });

    revalidateBothPaths('quotations', 'page');
    
    // Create notification for quotation creation
    await notifyItemCreated(
      session.user.id,
      'Quotation',
      quotation.quotationNumber
    );
    
    // Log quotation creation
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_CREATED,
      details: `Quotation "${quotation.quotationNumber}" created successfully`,
      metadata: {
        quotationId: quotation.id,
        quotationNumber: quotation.quotationNumber,
        subject: quotation.subject,
        clientId: quotation.clientId,
        organizationId: quotation.organizationId || null,
        total: Number(quotation.total || 0),
        status: quotation.status,
      },
    });
    
    return {
      success: true,
      data: quotation,
    };
  } catch (error) {
    console.error('Error creating quotation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quotation',
      data: null,
    };
  }
}

/**
 * Update quotation
 */
export async function updateQuotation(id: string, data: any) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        data: null,
      };
    }

    // Check if quotation exists
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existingQuotation) {
      return {
        success: false,
        error: 'Quotation not found',
        data: null,
      };
    }

    // Handle client
    let clientId = data.clientId;
    if (!clientId && data.clientName) {
      const existingClient = await prisma.client.findFirst({
        where: { name: data.clientName },
      });

      if (existingClient) {
        clientId = existingClient.id;
        if (data.clientAddress || data.clientContact) {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              address: data.clientAddress || undefined,
              phone: data.clientContact || undefined,
              email: data.clientContact?.includes('@') ? data.clientContact : undefined,
            },
          });
        }
      } else {
        // Use createClient function to ensure COA is created automatically
        // Generate a temporary email if not provided (createClient requires email)
        const clientEmail = data.clientContact?.includes('@') 
          ? data.clientContact 
          : `client-${Date.now()}@temp.local`;
        
        const clientResult = await createClient({
          name: data.clientName,
          address: data.clientAddress || undefined,
          phone: data.clientContact || undefined,
          email: clientEmail,
          status: 'active',
        });
        
        if (!clientResult.success || !clientResult.client) {
          return {
            success: false,
            error: clientResult.error || 'Failed to create client',
            quotation: null,
          };
        }
        
        clientId = clientResult.client.id;
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Client is required',
        data: null,
      };
    }

    // Use current session user for submittedById
    const submittedById = session.user.id;

    // Map modules to sections (form uses "modules", Prisma uses "sections")
    const sections = data.sections || data.modules || [];
    
    // Optimized total calculation using reduce/flatMap (single pass instead of nested loops)
    const total = sections && Array.isArray(sections) ? sections.reduce((sum: number, section: any) => {
      // Use grandTotal if available (already calculated with discount)
      if (section.grandTotal != null) {
        return sum + Number(section.grandTotal || 0);
      }
      
      // Otherwise calculate from items using flatMap for single-pass iteration
      const allItems = [
        ...(section.groups || []).flatMap((group: any) => group.items || []),
        ...(section.categoryGroups || []).flatMap((categoryGroup: any) => categoryGroup.items || []),
        ...(section.items || [])
      ];
      
      const sectionTotal = allItems.reduce((itemSum: number, item: any) => 
        itemSum + Number(item.amount || 0), 0
      );
      
      // Apply discount (amount-based, not percentage)
      const discountedTotal = section.discount 
        ? Math.max(0, sectionTotal - Number(section.discount))
        : sectionTotal;
      
      return sum + discountedTotal;
    }, 0) : 0;

    // Prepare moduleGroupIds for parallel fetching
    const moduleGroupIdsToFetch = new Set<string>();
    sections.forEach((section: any) => {
      if (section.groups && Array.isArray(section.groups)) {
        section.groups.forEach((group: any) => {
          if (group.moduleGroupId && 
              group.moduleGroupId !== '' && 
              (!group.baseUnit || !group.baseUnitPrice)) {
            moduleGroupIdsToFetch.add(group.moduleGroupId);
          }
        });
      }
    });

    // Parallel operations: Delete sections and fetch moduleGroups simultaneously
    const [, moduleGroupsResult] = await Promise.all([
      // Delete existing sections (cascade will handle items and groups)
      prisma.section.deleteMany({
        where: { quotationId: id },
      }),
      
      // Fetch moduleGroup data in parallel
      moduleGroupIdsToFetch.size > 0
        ? prisma.moduleGroup.findMany({
            where: { id: { in: Array.from(moduleGroupIdsToFetch) } },
            select: { id: true, baseUnit: true, baseUnitPrice: true },
          })
        : Promise.resolve([])
    ]);

    // Build moduleGroupData map
    const moduleGroupData: Record<string, { baseUnit: string | null; baseUnitPrice: number | null }> = {};
    moduleGroupsResult.forEach((mg) => {
      moduleGroupData[mg.id] = {
        baseUnit: mg.baseUnit,
        baseUnitPrice: mg.baseUnitPrice ? Number(mg.baseUnitPrice) : null,
      };
    });

    // Enrich sections with baseUnit/baseUnitPrice from ModuleGroup if missing
    const enrichedSections = sections.map((section: any) => ({
      ...section,
      groups: (section.groups || []).map((group: any) => {
        if (group.moduleGroupId && moduleGroupData[group.moduleGroupId]) {
          return {
            ...group,
            baseUnit: group.baseUnit || moduleGroupData[group.moduleGroupId].baseUnit,
            baseUnitPrice: group.baseUnitPrice || moduleGroupData[group.moduleGroupId].baseUnitPrice,
          };
        }
        return group;
      }),
    }));

    // Parallel fetch for TOS and coverLetter
    const [tosResult, coverLetterResult] = await Promise.all([
      // TOS content fetch
      !data.tos ? (async () => {
        try {
          const { getTOSContent } = await import('@/app/actions/quotation-helpers');
          return await getTOSContent();
        } catch (error) {
          return { success: false, content: null };
        }
      })() : Promise.resolve({ success: true, content: data.tos }),
      
      // Cover letter fetch
      (!data.coverLetter && data.selectedCoverLetterId && data.selectedCoverLetterId !== 'custom') 
        ? (async () => {
            try {
              const { getCoverLetterById } = await import('@/app/(dashboard)/dashboard/settings/_actions/coverLetter.action');
              return await getCoverLetterById(data.selectedCoverLetterId);
            } catch (error) {
              return { success: false, coverLetter: null };
            }
          })()
        : Promise.resolve({ success: true, coverLetter: data.coverLetter ? { content: data.coverLetter } : null })
    ]);

    // Extract results
    const tosContent = tosResult.success ? tosResult.content : data.tos || null;
    const coverLetterContent = coverLetterResult.success && coverLetterResult.coverLetter
      ? coverLetterResult.coverLetter.content
      : data.coverLetter || null;

    // Update quotation with new sections
    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        quotationNumber: data.quotationNumber || existingQuotation.quotationNumber,
        subject: data.subject || existingQuotation.subject,
        date: data.date ? new Date(data.date) : existingQuotation.date,
        updatedById: session.user.id, // Set the user who updated the quotation
        coverLetter: coverLetterContent !== undefined ? (coverLetterContent || null) : existingQuotation.coverLetter,
        financialStatement: data.financialStatement !== undefined ? (data.financialStatement || null) : existingQuotation.financialStatement,
        tos: tosContent !== undefined ? (tosContent || null) : existingQuotation.tos,
        total: total >= 0 ? new Prisma.Decimal(total) : new Prisma.Decimal(0),
        discount: data.discount !== undefined ? (data.discount ? new Prisma.Decimal(data.discount) : new Prisma.Decimal(0)) : (existingQuotation.discount || new Prisma.Decimal(0)),
        grandTotal: total >= 0 ? new Prisma.Decimal(total) : new Prisma.Decimal(0),
        // Always set status to REVIEW when updating a quotation
        status: 'REVIEW' as QuotationStatus,
        expiredDate: data.expiredDate !== undefined 
          ? (data.expiredDate ? new Date(data.expiredDate) : null) 
          : (existingQuotation as any).expiredDate,
        clientId: clientId,
        organizationId: data.organizationId !== undefined && data.organizationId !== '' ? (data.organizationId || null) : existingQuotation.organizationId,
        submittedById: submittedById,
        shippingCharges: data.shippingCharges !== undefined ? (data.shippingCharges ? new Prisma.Decimal(data.shippingCharges) : new Prisma.Decimal(0)) : existingQuotation.shippingCharges,
        vatIncluded: data.vatIncluded !== undefined ? data.vatIncluded : existingQuotation.vatIncluded,
        projectLocation: data.projectLocation !== undefined ? (data.projectLocation || null) : existingQuotation.projectLocation,
        section: {
          create: (enrichedSections || []).map((section: any, sectionIndex: number) => ({
            title: section.title || `Section ${sectionIndex + 1}`,
            note: section.note || null,
        discount: section.discount ? new Prisma.Decimal(section.discount) : new Prisma.Decimal(0),
        total: section.total ? new Prisma.Decimal(section.total) : new Prisma.Decimal(0),
        grandTotal: section.grandTotal ? new Prisma.Decimal(section.grandTotal) : new Prisma.Decimal(0),
            sortOrder: section.sortOrder ?? sectionIndex,
            categoryId: section.categoryId || null,
            preparedById: section.preparedById || session.user.id,
            groups: {
              create: (section.groups || []).map((group: any, groupIndex: number) => ({
                code: group.code || null,
                description: group.description || '',
                quantity: group.quantity ? new Prisma.Decimal(group.quantity) : new Prisma.Decimal(0),
                number: group.number || null,
                sortOrder: group.sortOrder ?? groupIndex,
                moduleGroupId: group.moduleGroupId && group.moduleGroupId !== '' ? group.moduleGroupId : null,
                baseUnit: group.baseUnit || null,
                baseUnitPrice: group.baseUnitPrice ? new Prisma.Decimal(group.baseUnitPrice) : null,
                items: {
                  create: (group.items || []).map((item: any, itemIndex: number) => ({
                    sl: item.sl ?? itemIndex + 1,
                    no: item.no != null && item.no !== '' ? String(item.no) : null,
                    code: item.code || null,
                    description: item.description || null,
                    height: item.height ? new Prisma.Decimal(item.height) : null,
                    width: item.width ? new Prisma.Decimal(item.width) : null,
                    depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                    unit: item.unit || null,
                    unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                    quantity: new Prisma.Decimal(item.quantity || 0),
                    unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                    totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                    discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                    amount: new Prisma.Decimal(item.amount || 0),
                    sortOrder: item.sortOrder ?? itemIndex,
                    itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                    moduleGroupItemId: item.moduleGroupItemId && item.moduleGroupItemId !== '' ? item.moduleGroupItemId : null,
                  })),
                },
              })),
            },
            items: {
              create: (section.items || []).map((item: any, itemIndex: number) => ({
                sl: item.sl ?? itemIndex + 1,
                no: item.no != null && item.no !== '' ? String(item.no) : null,
                code: item.code || null,
                description: item.description || null,
                height: item.height ? new Prisma.Decimal(item.height) : null,
                width: item.width ? new Prisma.Decimal(item.width) : null,
                depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                unit: item.unit || null,
                unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                quantity: new Prisma.Decimal(item.quantity || 0),
                unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                amount: new Prisma.Decimal(item.amount || 0),
                sortOrder: item.sortOrder ?? itemIndex,
                itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
              })),
            },
            categoryGroups: {
              create: (section.categoryGroups || []).map((categoryGroup: any, categoryGroupIndex: number) => ({
                categoryId: categoryGroup.categoryId || null,
                sortOrder: categoryGroup.sortOrder ?? categoryGroupIndex,
                items: {
                  create: (categoryGroup.items || []).map((item: any, itemIndex: number) => ({
                    sl: item.sl ?? itemIndex + 1,
                    no: item.no != null && item.no !== '' ? String(item.no) : null,
                    code: item.code || null,
                    description: item.description || null,
                    height: item.height ? new Prisma.Decimal(item.height) : null,
                    width: item.width ? new Prisma.Decimal(item.width) : null,
                    depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                    unit: item.unit || null,
                    unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                    quantity: new Prisma.Decimal(item.quantity || 0),
                    unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                    totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                    discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                    amount: new Prisma.Decimal(item.amount || 0),
                    sortOrder: item.sortOrder ?? itemIndex,
                    itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                  })),
                },
              })),
            },
          })),
        },
      },
      // Selective includes: Only fetch essential relations, not everything
      include: {
        client: {
          select: { id: true, name: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
        section: {
          select: {
            id: true,
            title: true,
            total: true,
            grandTotal: true,
          },
          take: 1, // Only need first section for basic info
        },
      },
    });

    revalidateBothPaths('quotations', 'page');
    revalidateBothPaths(`quotations/${id}`, 'page');
    
    // Track changes for notification
    const changes: string[] = [];
    if (data.subject && data.subject !== existingQuotation.subject) {
      changes.push('subject');
    }
    if (data.status && data.status !== existingQuotation.status) {
      changes.push('status');
    }

    // Integration: Create SALES voucher when quotation status changes to ACCEPTED
    if (data.status === 'ACCEPTED' && existingQuotation.status !== 'ACCEPTED') {
      try {
        const { createSalesVoucherForQuotation } = await import('./quotation-accounting-integration');
        const voucherResult = await createSalesVoucherForQuotation(
          quotation.id,
          quotation.quotationNumber,
          quotation.clientId,
          Number(quotation.grandTotal || quotation.total || 0),
          session.user.id,
          quotation.date
        );

        if (voucherResult.success) {
          console.log(`Sales voucher created and posted for quotation ${quotation.quotationNumber}: ${voucherResult.voucherId}`);
        } else {
          console.error(`Failed to create sales voucher for quotation ${quotation.quotationNumber}:`, voucherResult.error);
          // Don't fail the quotation update if voucher creation fails
          // Log error but continue
        }
      } catch (error) {
        console.error('Error creating sales voucher for quotation:', error);
        // Don't fail the quotation update if voucher creation fails
      }
    }
    if (data.organizationId !== undefined && data.organizationId !== existingQuotation.organizationId) {
      changes.push('organization');
    }
    if (data.sections || data.modules) {
      changes.push('sections');
    }
    
    // Create notification for quotation update
    await notifyItemUpdated(
      session.user.id,
      'Quotation',
      quotation.quotationNumber,
      changes.length > 0 ? changes : undefined
    );
    
    // Log quotation update
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Quotation "${quotation.quotationNumber}" updated successfully`,
      metadata: {
        quotationId: quotation.id,
        quotationNumber: quotation.quotationNumber,
        changes: changes.length > 0 ? changes : ['general update'],
        total: Number(quotation.total || 0),
        status: quotation.status,
      },
    });
    
    return {
      success: true,
      data: quotation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update quotation',
      data: null,
    };
  }
}

/**
 * Delete quotation
 */
export async function deleteQuotation(id: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Check if quotation exists
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existingQuotation) {
      return {
        success: false,
        error: 'Quotation not found',
      };
    }

    // Move to trash instead of permanent delete
    await prisma.quotation.update({
      where: { id },
      data: {
        isTrash: true,
      },
    });

    revalidateBothPaths('quotations', 'page');
    revalidateBothPaths(`quotations/${id}`, 'page');
    
    // Create notification for quotation moved to trash
    await notifyItemDeleted(
      session.user.id,
      'Quotation',
      existingQuotation.quotationNumber
    );
    
    // Log quotation moved to trash
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_DELETED,
      details: `Quotation "${existingQuotation.quotationNumber}" moved to trash`,
      metadata: {
        quotationId: id,
        quotationNumber: existingQuotation.quotationNumber,
        subject: existingQuotation.subject,
      },
    });
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting quotation:', error);
    console.error('Quotation ID:', id);
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Full error details:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete quotation',
    };
  }
}

/**
 * Bulk update quotation status
 */
export async function bulkUpdateQuotationStatus(
  quotationIds: string[],
  status: QuotationStatus | string
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (quotationIds.length === 0) {
      return {
        success: false,
        error: 'No quotations selected',
      };
    }

    // Handle trash/restore operations
    if (status === 'TRASH') {
      // Move to trash
      await prisma.quotation.updateMany({
        where: {
          id: { in: quotationIds },
        },
        data: {
          isTrash: true,
        },
      });
    } else if (status === 'DRAFT' || status === QuotationStatus.DRAFT) {
      // Check if this is a restore operation (from trash)
      const quotations = await prisma.quotation.findMany({
        where: {
          id: { in: quotationIds },
          isTrash: true,
        },
        select: {
          id: true,
        },
      });
      
      // If any quotations are in trash, restore them
      if (quotations.length > 0) {
        await prisma.quotation.updateMany({
          where: {
            id: { in: quotations.map(q => q.id) },
          },
          data: {
            isTrash: false,
          },
        });
      }
      
      // Update status to DRAFT for all selected quotations
      await prisma.quotation.updateMany({
        where: {
          id: { in: quotationIds },
        },
        data: {
          status: QuotationStatus.DRAFT,
        },
      });
    } else {
      // Update status for other status changes
      let statusEnum: QuotationStatus;
      if (typeof status === 'string') {
        const statusUpper = status.toUpperCase();
        if (!Object.values(QuotationStatus).includes(statusUpper as QuotationStatus)) {
          return {
            success: false,
            error: `Invalid status: ${status}`,
          };
        }
        statusEnum = statusUpper as QuotationStatus;
      } else {
        statusEnum = status;
      }

      await prisma.quotation.updateMany({
        where: {
          id: { in: quotationIds },
        },
        data: {
          status: statusEnum,
        },
      });
    }

    // Get quotation details for logging
    const quotations = await prisma.quotation.findMany({
      where: {
        id: { in: quotationIds },
      },
      select: {
        id: true,
        quotationNumber: true,
        subject: true,
        isTrash: true,
      },
    });

    // Log bulk update
    const isTrashOperation = status === 'TRASH';
    const isRestoreOperation = status === 'DRAFT' || status === QuotationStatus.DRAFT;
    
    for (const quotation of quotations) {
      if (isTrashOperation) {
        await createUserLog({
          userId: session.user.id,
          action: LogAction.ITEM_DELETED,
          details: `Quotation "${quotation.quotationNumber}" moved to trash`,
          metadata: {
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            isTrash: true,
          },
        });
      } else if (isRestoreOperation && quotation.isTrash) {
        await createUserLog({
          userId: session.user.id,
          action: LogAction.ITEM_UPDATED,
          details: `Quotation "${quotation.quotationNumber}" restored from trash`,
          metadata: {
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            isTrash: false,
            status: 'DRAFT',
          },
        });
      } else {
        const statusStr = typeof status === 'string' ? status : String(status);
        await createUserLog({
          userId: session.user.id,
          action: LogAction.ITEM_UPDATED,
          details: `Quotation "${quotation.quotationNumber}" status updated to ${statusStr}`,
          metadata: {
            quotationId: quotation.id,
            quotationNumber: quotation.quotationNumber,
            status: statusStr,
          },
        });
      }
    }

    // Create notification
    if (isTrashOperation) {
      await notifyItemDeleted(
        session.user.id,
        'Quotation',
        `${quotations.length} quotation(s)`
      );
    } else {
      const actionText = isRestoreOperation ? 'restored from trash' : `status updated to ${typeof status === 'string' ? status.toLowerCase() : String(status).toLowerCase()}`;
      await notifyItemUpdated(
        session.user.id,
        'Quotation',
        `${quotations.length} quotation(s)`,
        [actionText]
      );
    }

    // Revalidate quotations list page
    revalidateBothPaths('quotations', 'page');
    // Revalidate individual quotation pages for each updated quotation
    for (const quotation of quotations) {
      revalidateBothPaths(`quotations/${quotation.id}`, 'page');
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating quotation status:', error);
    console.error('Status received:', status);
    console.error('Quotation IDs:', quotationIds);
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Full error details:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update quotation status',
    };
  }
}

/**
 * Delete quotations permanently
 */
export async function deleteQuotationsPermanently(quotationIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (quotationIds.length === 0) {
      return {
        success: false,
        error: 'No quotations selected',
      };
    }

    // Get quotation details for logging before deletion
    const quotations = await prisma.quotation.findMany({
      where: {
        id: { in: quotationIds },
        isTrash: true, // Only allow permanent deletion of trashed items
      },
      select: {
        id: true,
        quotationNumber: true,
        subject: true,
      },
    });

    if (quotations.length === 0) {
      return {
        success: false,
        error: 'No trashed quotations found to delete',
      };
    }

    // Delete quotations permanently (cascade will handle sections, groups, items)
    await prisma.quotation.deleteMany({
      where: {
        id: { in: quotations.map(q => q.id) },
      },
    });

    // Log permanent deletion
    for (const quotation of quotations) {
      await createUserLog({
        userId: session.user.id,
        action: LogAction.ITEM_DELETED,
        details: `Quotation "${quotation.quotationNumber}" permanently deleted`,
        metadata: {
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          subject: quotation.subject,
        },
      });
    }

    // Create notification
    await notifyItemDeleted(
      session.user.id,
      'Quotation',
      `${quotations.length} quotation(s)`
    );

    revalidateBothPaths('quotations', 'page');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting quotations permanently:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete quotations',
    };
  }
}

/**
 * Update quotation status (for Send, Approve, Accept actions)
 */
export async function updateQuotationStatus(
  id: string,
  newStatus: QuotationStatus
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return {
        success: false,
        error: 'Quotation not found',
      };
    }

    // Check if quotation is expired before allowing status change
    const now = new Date();
    let finalStatus = newStatus;
    
    // If expiredDate has passed, automatically set to EXPIRED
    if (quotation.expiredDate && quotation.expiredDate <= now && newStatus !== 'EXPIRED') {
      finalStatus = 'EXPIRED';
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['SENT'],
      'REVIEW': ['REVISED', 'SENT'], // Approve action: REVIEW -> REVISED, or send directly
      'SENT': ['ACCEPTED', 'REJECTED'],
      'ACCEPTED': ['SENT', 'REVISED'],
      'REJECTED': ['SENT', 'REVISED'],
      'REVISED': ['SENT'],
      'EXPIRED': [], // Cannot transition from expired
    };

    const allowedStatuses = validTransitions[quotation.status] || [];
    if (!allowedStatuses.includes(finalStatus)) {
      return {
        success: false,
        error: `Cannot change status from ${quotation.status} to ${finalStatus}`,
      };
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: finalStatus,
        updatedById: session.user.id,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    revalidateBothPaths('quotations', 'page');
    revalidateBothPaths(`quotations/${id}`, 'page');

    // Log status change
    await createUserLog({
      userId: session.user.id,
      action: LogAction.ITEM_UPDATED,
      details: `Quotation "${quotation.quotationNumber}" status changed from ${quotation.status} to ${finalStatus}`,
      metadata: {
        quotationId: quotation.id,
        quotationNumber: quotation.quotationNumber,
        oldStatus: quotation.status,
        newStatus: finalStatus,
      },
    });

    return {
      success: true,
      data: updatedQuotation,
    };
  } catch (error) {
    console.error('Error updating quotation status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update quotation status',
    };
  }
}

/**
 * Check and update expired quotations
 * Should be called periodically (e.g., via cron job or scheduled task)
 */
export async function checkAndUpdateExpiredQuotations(): Promise<{ updated: number }> {
  try {
    const now = new Date();
    
    // Find quotations that are expired but status is not EXPIRED
    const expiredQuotations = await prisma.quotation.findMany({
      where: {
        expiredDate: {
          lte: now,
        } as any,
        status: {
          not: 'EXPIRED',
        },
        isTrash: false,
      },
      select: {
        id: true,
        quotationNumber: true,
      },
    });

    if (expiredQuotations.length === 0) {
      return { updated: 0 };
    }

    // Update all expired quotations
    await prisma.quotation.updateMany({
      where: {
        id: { in: expiredQuotations.map(q => q.id) },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    revalidateBothPaths('quotations', 'page');

    return { updated: expiredQuotations.length };
  } catch (error) {
    console.error('Error checking expired quotations:', error);
    return { updated: 0 };
  }
}



