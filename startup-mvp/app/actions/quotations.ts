'use server';

import { revalidateBothPaths } from '@/lib/route-utils-server';
import { prisma } from '@/lib/prisma';
import { Prisma, QuotationStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { getTenantContext, verifyTenantAccess, verifyParentTenantAccess } from '@/lib/tenant-context';
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from '@/lib/notification';
import { createUserLog, LogAction } from '@/lib/user-log';
import { getNextSequenceNumber } from "@/lib/sequence";
import { createClient } from '@/app/(dashboard)/dashboard/crm/clients/_actions/client.action';
import { buildDefaultSections } from '@/lib/quotation/buildDefaultSections';
import { sortSectionsByDisplayOrder } from '@/lib/quotation/sortSections';
import { serializeData } from '@/lib/utils/serialization';

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
          { Client: { name: { contains: search, mode: 'insensitive' } } },
          { Client: { company: { contains: search, mode: 'insensitive' } } },
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
        Client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            image: true,
          },
        },
        User_Quotation_submittedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        Organization: {
          select: {
            id: true,
            name: true,
          },
        },
        User_Quotation_updatedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        Order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
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

    // Serialize Decimal values and map Prisma relation names to component-expected keys
    const serializedQuotations = quotations.map((quotation) => ({
      ...quotation,
      total: Number(quotation.total || 0),
      discount: quotation.discount ? Number(quotation.discount) : null,
      grandTotal: quotation.grandTotal ? Number(quotation.grandTotal) : null,
      shippingCharges: quotation.shippingCharges ? Number(quotation.shippingCharges) : null,
      isTrash: quotation.isTrash || false,
      client: (quotation as any).Client || null,
      submittedBy: (quotation as any).User_Quotation_submittedByIdToUser || null,
      organization: (quotation as any).Organization || null,
      updatedBy: (quotation as any).User_Quotation_updatedByIdToUser || null,
      order: (quotation as any).Order || null,
    }));

    return {
      success: true,
      quotations: serializeData(serializedQuotations),
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
        Client: {
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
        Order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
        Organization: {
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
        User_Quotation_submittedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        User_Quotation_updatedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        Opportunity: {
          select: {
            id: true,
            title: true,
          }
        },
        Section: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            ItemGroup: {
              include: {
                QuotationItem: {
                  include: {
                    Item: {
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
            QuotationItem: {
              include: {
                Item: {
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
            CategoryGroup: {
              include: {
                Category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                QuotationItem: {
                  include: {
                    Item: {
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
            displayOrder: 'asc',
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
      client: (quotation as any).Client,
      order: (quotation as any).Order,
      organization: (quotation as any).Organization || null,
      organizationId: quotation.organizationId || null,
      submittedBy: (quotation as any).User_Quotation_submittedByIdToUser,
      updatedBy: (quotation as any).User_Quotation_updatedByIdToUser,
      section: sortSectionsByDisplayOrder((quotation as any).Section)?.map((section: any) => ({
        ...section,
        discount: section.discount ? Number(section.discount) : null,
        total: section.total ? Number(section.total) : null,
        grandTotal: section.grandTotal ? Number(section.grandTotal) : null,
        categoryId: section.categoryId || null,
        preparedBy: section.User,
        groups: section.ItemGroup?.map((group: any) => ({
          ...group,
          quantity: group.quantity ? Number(group.quantity) : null,
          baseUnit: group.baseUnit || null,
          baseUnitPrice: group.baseUnitPrice ? Number(group.baseUnitPrice) : null,
          items: group.QuotationItem?.map((item: any) => ({
            ...item,
            no: item.no != null ? String(item.no) : null, // Ensure no is always string
            unit: item.unit || null,
            unitPrice: Number(item.unitPrice),
            quantity: Number(item.quantity),
            amount: Number(item.amount),
            item: item.Item ? {
              ...item.Item,
              unitPrice: Number(item.Item.unitPrice),
            } : null,
          })),
        })),
        items: section.QuotationItem?.map((item: any) => ({
          ...item,
          unit: item.unit || null,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
          amount: Number(item.amount),
          item: item.Item ? {
            ...item.Item,
            unitPrice: Number(item.Item.unitPrice),
          } : null,
        })),
        categoryGroups: section.CategoryGroup?.map((categoryGroup: any) => ({
          ...categoryGroup,
          categoryId: categoryGroup.categoryId || null,
          category: categoryGroup.Category ? {
            id: categoryGroup.Category.id,
            name: categoryGroup.Category.name,
          } : null,
          items: categoryGroup.QuotationItem?.map((item: any) => ({
            ...item,
            unit: item.unit || null,
            unitPrice: Number(item.unitPrice),
            quantity: Number(item.quantity),
            amount: Number(item.amount),
            item: item.Item ? {
              ...item.Item,
              unitPrice: Number(item.Item.unitPrice),
            } : null,
          })),
        })),
      })),
    };

    return {
      success: true,
      data: serializeData(serializedQuotation),
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

    // Parallel database queries: Fetch Quotation Settings (TOS, Payment Terms), coverLetterSimultaneously
    const [settingsResult, coverLetterResult] = await Promise.all([
      // Quotation settings fetch (TOS & Payment Terms)
      (async () => {
        try {
          const { getQuotationSettings } = await import('@/app/actions/quotation-helpers');
          return await getQuotationSettings();
        } catch (error) {
          return { success: false, tos: null, paymentTerms: null };
        }
      })(),
      
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
    ]);
 
    // Extract results
    const tosContent = settingsResult.success ? settingsResult.tos : data.tos || null;
    const paymentTermsContent = settingsResult.success ? settingsResult.paymentTerms : null;
    const coverLetterContent = coverLetterResult.success && coverLetterResult.coverLetter
      ? coverLetterResult.coverLetter.content
      : data.coverLetter || null;
 
    // Prepare final sections
    let finalSections: any[] = [];
    
    if (sections.length === 0) {
      // Use the Factory to generate the standard sections, passing initial payment terms
      const { buildDefaultSections } = await import('@/lib/quotation/buildDefaultSections');
      finalSections = buildDefaultSections(paymentTermsContent);
    } else {
      // Use provided sections
      sections.forEach((s: any, idx: number) => {
        finalSections.push({
          ...s,
          sectionType: s.sectionType || 'PRICING',
          displayOrder: idx + 1
        });
      });
    }

    // Generate atomic sequence number if not provided
// @ts-expect-error - Legacy compatibility
    const finalQuotationNumber = data.quotationNumber || (await getNextSequenceNumber(organizationId, "QUOTATION", "QUO"));

    // Create quotation with optimized data fetching
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: finalQuotationNumber,
        mode: data.mode || 'SIMPLE',
        subject: data.subject || '',
        date: data.date ? new Date(data.date) : new Date(),
        coverLetter: coverLetterContent || null,
        financialStatement: data.financialStatement || null,
        tos: tosContent || null,
        total: total > 0 ? new Prisma.Decimal(total) : new Prisma.Decimal(0),
        discount: data.discount ? new Prisma.Decimal(data.discount) : new Prisma.Decimal(0),
        grandTotal: total > 0 ? new Prisma.Decimal(Math.max(0, total - (data.discount ? Number(data.discount) : 0))) : new Prisma.Decimal(0),
        status: 'DRAFT', // Always DRAFT on create
        expiredDate: data.expiredDate ? new Date(data.expiredDate) : null as any,
        clientId: clientId,
        organizationId: data.organizationId || null,
        submittedById: submittedById, // Always use session user
        shippingCharges: data.shippingCharges ? new Prisma.Decimal(data.shippingCharges) : new Prisma.Decimal(0),
        currency: data.currency || 'TK',
        vatIncluded: data.vatIncluded || false,
        projectLocation: data.projectLocation || null,
        opportunityId: (data as any).opportunityId || null,
        isTrash: false,
        Section: {
          create: (finalSections || []).map((section: any, sectionIndex: number) => {
            const sectionData: any = {
              sectionType: section.sectionType || 'PRICING',
              title: section.title || null,
              isEnabled: section.isEnabled !== undefined ? section.isEnabled : true,
              displayOrder: section.displayOrder ?? (sectionIndex + 1),
              metadata: section.metadata || null,
              note: section.note || null,
              discount: section.discount ? new Prisma.Decimal(section.discount) : new Prisma.Decimal(0),
              total: section.total ? new Prisma.Decimal(section.total) : new Prisma.Decimal(0),
              grandTotal: section.grandTotal ? new Prisma.Decimal(section.grandTotal) : new Prisma.Decimal(0),
              sortOrder: section.sortOrder ?? sectionIndex,
              categoryId: section.categoryId || null,
              preparedById: section.preparedById || session.user.id,
            };

            // Only add relations if their arrays are non-empty
            if (section.groups && Array.isArray(section.groups) && section.groups.length > 0) {
              sectionData.ItemGroup = {
                create: section.groups.map((group: any, groupIndex: number) => ({
                  code: group.code || null,
                  description: group.description || '',
                  quantity: group.quantity ? new Prisma.Decimal(group.quantity) : new Prisma.Decimal(0),
                  number: group.number || null,
                  sortOrder: group.sortOrder ?? groupIndex,
                  moduleGroupId: group.moduleGroupId && group.moduleGroupId !== '' ? group.moduleGroupId : null,
                  baseUnit: group.baseUnit || null,
                  baseUnitPrice: group.baseUnitPrice ? new Prisma.Decimal(group.baseUnitPrice) : null,
                  QuotationItem: {
                    create: (group.items || []).map((item: any, itemIndex: number) => ({
                      sl: item.sl ?? itemIndex + 1,
                      no: item.no != null && item.no !== '' ? String(item.no) : null,
                      code: item.code || null,
                      description: item.description || null,
                      unit: item.unit || null,
                      unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                      quantity: new Prisma.Decimal(item.quantity || 0),
                      discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                      amount: new Prisma.Decimal(item.amount || 0),
                      sortOrder: item.sortOrder ?? itemIndex,
                      itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                      moduleGroupItemId: item.moduleGroupItemId && item.moduleGroupItemId !== '' ? item.moduleGroupItemId : null,
                    })),
                  },
                })),
              };
            }

            if (section.items && Array.isArray(section.items) && section.items.length > 0) {
              sectionData.QuotationItem = {
                create: section.items.map((item: any, itemIndex: number) => ({
                  sl: item.sl ?? itemIndex + 1,
                  no: item.no != null && item.no !== '' ? String(item.no) : null,
                  code: item.code || null,
                  description: item.description || null,
                  unit: item.unit || null,
                  unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                  quantity: new Prisma.Decimal(item.quantity || 0),
                  discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                  amount: new Prisma.Decimal(item.amount || 0),
                  sortOrder: item.sortOrder ?? itemIndex,
                  itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                })),
              };
            }

            if (section.categoryGroups && Array.isArray(section.categoryGroups) && section.categoryGroups.length > 0) {
              sectionData.CategoryGroup = {
                create: section.categoryGroups.map((categoryGroup: any, categoryGroupIndex: number) => ({
                  categoryId: categoryGroup.categoryId || null,
                  sortOrder: categoryGroup.sortOrder ?? categoryGroupIndex,
                  QuotationItem: {
                    create: (categoryGroup.items || []).map((item: any, itemIndex: number) => ({
                      sl: item.sl ?? itemIndex + 1,
                      no: item.no != null && item.no !== '' ? String(item.no) : null,
                      code: item.code || null,
                      description: item.description || null,
                      unit: item.unit || null,
                      unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                      quantity: new Prisma.Decimal(item.quantity || 0),
                      discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                      amount: new Prisma.Decimal(item.amount || 0),
                      sortOrder: item.sortOrder ?? itemIndex,
                      itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                    })),
                  },
                })),
              };
            }

            return sectionData;
          }),
        },
      },
      // Selective includes: Only fetch essential relations, not everything
      include: {
        Client: {
          select: { id: true, name: true },
        },
        User_Quotation_submittedByIdToUser: {
          select: { id: true, name: true, email: true },
        },
        Section: {
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
      data: serializeData(quotation),
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

    // ── Delete existing sections before re-creating to prevent duplication ──
    // Section has onDelete: Cascade so child records (items, groups) are auto-deleted.
    await prisma.section.deleteMany({ where: { quotationId: id } });

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
        grandTotal: total >= 0 ? new Prisma.Decimal(Math.max(0, total - (data.discount ? Number(data.discount) : (data.discount === undefined && existingQuotation.discount ? Number(existingQuotation.discount) : 0)))) : new Prisma.Decimal(0),
        // Always set status to REVIEW when updating a quotation
        status: 'REVIEW' as QuotationStatus,
        expiredDate: data.expiredDate !== undefined 
          ? (data.expiredDate ? new Date(data.expiredDate) : null) 
          : (existingQuotation as any).expiredDate,
        clientId: clientId,
        organizationId: data.organizationId !== undefined && data.organizationId !== '' ? (data.organizationId || null) : existingQuotation.organizationId,
        submittedById: submittedById,
        shippingCharges: data.shippingCharges !== undefined ? (data.shippingCharges ? new Prisma.Decimal(data.shippingCharges) : new Prisma.Decimal(0)) : existingQuotation.shippingCharges,
        currency: data.currency || existingQuotation.currency || 'TK',
        vatIncluded: data.vatIncluded !== undefined ? data.vatIncluded : existingQuotation.vatIncluded,
        projectLocation: data.projectLocation !== undefined ? (data.projectLocation || null) : existingQuotation.projectLocation,
        mode: data.mode || existingQuotation.mode || 'SIMPLE',
        Section: {
          create: (sections || []).map((section: any, sectionIndex: number) => {
            const sectionData: any = {
              sectionType: section.sectionType || 'PRICING',
              title: section.title || null,
              isEnabled: section.isEnabled !== undefined ? section.isEnabled : true,
              displayOrder: section.displayOrder ?? section.sortOrder ?? sectionIndex,
              metadata: section.metadata || null,
              note: section.note || null,
              discount: section.discount ? new Prisma.Decimal(section.discount) : new Prisma.Decimal(0),
              total: section.total ? new Prisma.Decimal(section.total) : new Prisma.Decimal(0),
              grandTotal: section.grandTotal ? new Prisma.Decimal(section.grandTotal) : new Prisma.Decimal(0),
              sortOrder: section.sortOrder ?? sectionIndex,
              categoryId: section.categoryId || null,
              preparedById: section.preparedById || session.user.id,
            };

            // Only add relations if their arrays are non-empty
            if (section.groups && Array.isArray(section.groups) && section.groups.length > 0) {
              sectionData.ItemGroup = {
                create: section.groups.map((group: any, groupIndex: number) => ({
                  code: group.code || null,
                  description: group.description || '',
                  quantity: group.quantity ? new Prisma.Decimal(group.quantity) : new Prisma.Decimal(0),
                  number: group.number || null,
                  sortOrder: group.sortOrder ?? groupIndex,
                  moduleGroupId: group.moduleGroupId && group.moduleGroupId !== '' ? group.moduleGroupId : null,
                  baseUnit: group.baseUnit || null,
                  baseUnitPrice: group.baseUnitPrice ? new Prisma.Decimal(group.baseUnitPrice) : null,
                  QuotationItem: {
                    create: (group.items || []).map((item: any, itemIndex: number) => ({
                      sl: item.sl ?? itemIndex + 1,
                      no: item.no != null && item.no !== '' ? String(item.no) : null,
                      code: item.code || null,
                      description: item.description || null,
                      unit: item.unit || null,
                      unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                      quantity: new Prisma.Decimal(item.quantity || 0),
                      discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                      amount: new Prisma.Decimal(item.amount || 0),
                      sortOrder: item.sortOrder ?? itemIndex,
                      itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                      moduleGroupItemId: item.moduleGroupItemId && item.moduleGroupItemId !== '' ? item.moduleGroupItemId : null,
                    })),
                  },
                })),
              };
            }

            if (section.items && Array.isArray(section.items) && section.items.length > 0) {
              sectionData.QuotationItem = {
                create: section.items.map((item: any, itemIndex: number) => ({
                  sl: item.sl ?? itemIndex + 1,
                  no: item.no != null && item.no !== '' ? String(item.no) : null,
                  code: item.code || null,
                  description: item.description || null,
                  unit: item.unit || null,
                  unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                  quantity: new Prisma.Decimal(item.quantity || 0),
                  discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                  amount: new Prisma.Decimal(item.amount || 0),
                  sortOrder: item.sortOrder ?? itemIndex,
                  itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                })),
              };
            }

            if (section.categoryGroups && Array.isArray(section.categoryGroups) && section.categoryGroups.length > 0) {
              sectionData.CategoryGroup = {
                create: section.categoryGroups.map((categoryGroup: any, categoryGroupIndex: number) => ({
                  categoryId: categoryGroup.categoryId || null,
                  sortOrder: categoryGroup.sortOrder ?? categoryGroupIndex,
                  QuotationItem: {
                    create: (categoryGroup.items || []).map((item: any, itemIndex: number) => ({
                      sl: item.sl ?? itemIndex + 1,
                      no: item.no != null && item.no !== '' ? String(item.no) : null,
                      code: item.code || null,
                      description: item.description || null,
                      unit: item.unit || null,
                      unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                      quantity: new Prisma.Decimal(item.quantity || 0),
                      discount: item.discount ? new Prisma.Decimal(item.discount) : null,
                      amount: new Prisma.Decimal(item.amount || 0),
                      sortOrder: item.sortOrder ?? itemIndex,
                      itemId: item.itemId && item.itemId !== '' ? item.itemId : null,
                    })),
                  },
                })),
              };
            }

            return sectionData;
          }),
        },
      },
      // Selective includes: Only fetch essential relations, not everything
      include: {
        Client: {
          select: { id: true, name: true },
        },
        User_Quotation_submittedByIdToUser: {
          select: { id: true, name: true, email: true },
        },
        User_Quotation_updatedByIdToUser: {
          select: { id: true, name: true, email: true },
        },
        Section: {
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
    // Transitional step: Creating Order record while keeping legacy sales voucher and inventory logic
    if (data.status === 'ACCEPTED' && existingQuotation.status !== 'ACCEPTED') {
      try {
        // DISABLED: Legacy auto-revenue recognition removed in favor of Advanced Billing Flow (Revenue on Invoice)
        // const { createSalesVoucherForQuotation } = await import('./quotation-accounting-integration');
        // const voucherResult = await createSalesVoucherForQuotation(
        //   quotation.id,
        //   quotation.quotationNumber,
        //   quotation.clientId,
        //   Number(quotation.grandTotal || quotation.total || 0),
        //   session.user.id,
        //   quotation.date
        // );

        // if (voucherResult.success) {
        //   console.log(`Sales voucher created and posted for quotation ${quotation.quotationNumber}: ${voucherResult.voucherId}`);
        // } else {
        //   console.error(`Failed to create sales voucher for quotation ${quotation.quotationNumber}:`, voucherResult.error);
        //   // Don't fail the quotation update if voucher creation fails
        //   // Log error but continue
        // }

        // Create Order from accepted quotation
        const { createOrderFromQuotation } = await import('./orders');
        const orderResult = await createOrderFromQuotation(quotation.id);
        if (orderResult.success) {
          console.log(`Order created for quotation ${quotation.quotationNumber}: ${orderResult.orderId}`);
        } else {
          console.error(`Failed to create order for quotation ${quotation.quotationNumber}:`, orderResult.error);
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
      data: serializeData(quotation),
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
      'DRAFT': ['REVIEW', 'SENT', 'APPROVED', 'CANCELLED'],
      'REVIEW': ['APPROVED', 'SENT', 'CANCELLED'],
      'APPROVED': ['SENT', 'ACCEPTED', 'CANCELLED'], // Approved internally, can be sent or directly accepted
      'SENT': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      'ACCEPTED': ['CANCELLED'], // Can cancel an order?
      'REJECTED': ['CANCELLED', 'DRAFT'],
      'CANCELLED': ['DRAFT'], // Restart
      'EXPIRED': ['DRAFT', 'CANCELLED'],
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
    });

    // Integration: Create Order when quotation is ACCEPTED
    // Transitional step: Parallel run of new Order model with legacy systems
    if (finalStatus === 'ACCEPTED' && quotation.status !== 'ACCEPTED') {
      try {
        const { createOrderFromQuotation } = await import('./orders');
        const orderResult = await createOrderFromQuotation(id);
        if (orderResult.success) {
          console.log(`Order created for quotation ${quotation.quotationNumber}: ${orderResult.orderId}`);
        } else {
          console.error(`Failed to create order for quotation ${quotation.quotationNumber}:`, orderResult.error);
        }
      } catch (error) {
        console.error('Error in order integration:', error);
      }
    }

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


// ── Template Mode Actions ─────────────────────────────────────────────────────

/**
 * Fetch all quotations marked as templates (isTemplate = true).
 * Used by the TemplatePicker modal.
 */
export async function getTemplateQuotations() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized', templates: [] };

    const templates = await prisma.quotation.findMany({
      where: { isTemplate: true, isTrash: false },
      select: {
        id: true,
        quotationNumber: true,
        subject: true,
        date: true,
        mode: true,
        Client: { select: { id: true, name: true } },
        Organization: { select: { id: true, name: true } },
        _count: { select: { Section: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return { success: true, templates: serializeData(templates) };
  } catch (error) {
    console.error('Error fetching template quotations:', error);
    return { success: false, error: 'Failed to fetch templates', templates: [] };
  }
}

/**
 * Return a deep clone of sections from a template quotation.
 * All IDs are replaced with fresh cuid-like strings so they don't
 * conflict with the existing quotation's sections.
 */
export async function getQuotationSectionsForTemplate(quotationId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized', sections: [] };

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId, isTemplate: true, isTrash: false },
      select: {
        Section: {
          select: {
            sectionType: true,
            title: true,
            note: true,
            isEnabled: true,
            displayOrder: true,
            metadata: true,
            discount: true,
            total: true,
            grandTotal: true,
            QuotationItem: {
              select: {
                sl: true, no: true, code: true, description: true,
                unit: true,
                unitPrice: true, quantity: true, discount: true, amount: true,
                itemId: true,
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!quotation) return { success: false, error: 'Template not found', sections: [] };

    // Clone sections with fresh IDs and sort them safely
    const cloned = sortSectionsByDisplayOrder(quotation.Section).map((s, idx) => ({
      id: `section-clone-${s.sectionType?.toLowerCase() ?? 'custom'}-${Date.now()}-${idx}`,
      sectionType: s.sectionType,
      title: s.title,
      note: s.note,
      isEnabled: s.isEnabled,
      displayOrder: s.displayOrder ?? idx,
      metadata: s.metadata ?? {},
      discount: Number(s.discount ?? 0),
      total: Number(s.total ?? 0),
      grandTotal: Number(s.grandTotal ?? 0),
      items: s.QuotationItem.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        discount: Number(item.discount),
        amount: Number(item.amount),
      })),
      groups: [],
      categoryGroups: [],
    }));

    return serializeData({ success: true, sections: cloned });
  } catch (error) {
    console.error('Error cloning template sections:', error);
    return { success: false, error: 'Failed to load template', sections: [] };
  }
}

/**
 * Tag or untag a quotation as a template.
 * Called from the quotation list or detail pages.
 */
export async function toggleQuotationTemplate(id: string, isTemplate: boolean) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    await prisma.quotation.update({
      where: { id },
      data: { isTemplate },
    });

    revalidateBothPaths('/dashboard/quotations');
    return { success: true };
  } catch (error) {
    console.error('Error toggling template status:', error);
    return { success: false, error: 'Failed to update template status' };
  }
}
