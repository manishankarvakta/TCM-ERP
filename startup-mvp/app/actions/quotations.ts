'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';

/**
 * Get all quotations with relations
 */
export async function getQuotations() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
        data: [],
      };
    }

    const quotations = await prisma.quotation.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
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
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: quotations,
    };
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quotations',
      data: [],
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
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
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

    return {
      success: true,
      data: quotation,
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
        const newClient = await prisma.client.create({
          data: {
            name: data.clientName,
            address: data.clientAddress || null,
            phone: data.clientContact || null,
            email: data.clientContact?.includes('@') ? data.clientContact : null,
            status: 'active',
            createdBy: session.user.id,
          },
        });
        clientId = newClient.id;
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Client is required',
        data: null,
      };
    }

    // Handle user (submittedBy)
    let submittedById = data.submittedById || session.user.id;
    if (!submittedById && data.submittedBy) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.submittedByContact || '' },
            { name: data.submittedBy },
          ],
        },
      });

      if (existingUser) {
        submittedById = existingUser.id;
      } else {
        const email = data.submittedByContact?.includes('@')
          ? data.submittedByContact
          : `${data.submittedBy.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        
        const newUser = await prisma.user.create({
          data: {
            name: data.submittedBy,
            email: email,
            password: 'temp', // Should be handled properly in production
            role: 'user',
          },
        });
        submittedById = newUser.id;
      }
    }

    // Map modules to sections (form uses "modules", Prisma uses "sections")
    const sections = data.sections || data.modules || [];
    
    // Calculate total from sections
    let total = 0;
    if (sections && Array.isArray(sections)) {
      sections.forEach((section: any) => {
        let sectionTotal = 0;

        // Sum direct items
        if (section.items && Array.isArray(section.items)) {
          section.items.forEach((item: any) => {
            sectionTotal += Number(item.amount || 0);
          });
        }

        // Sum items in groups
        if (section.groups && Array.isArray(section.groups)) {
          section.groups.forEach((group: any) => {
            if (group.items && Array.isArray(group.items)) {
              group.items.forEach((item: any) => {
                sectionTotal += Number(item.amount || 0);
              });
            }
          });
        }

        // Apply discount
        if (section.discount) {
          sectionTotal = sectionTotal * (1 - Number(section.discount) / 100);
        }

        total += sectionTotal;
      });
    }

    // Create quotation
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: data.quotationNumber || `QT-${Date.now()}`,
        subject: data.subject || '',
        submittedTo: data.submittedTo || '',
        date: data.date ? new Date(data.date) : new Date(),
        coverLetter: data.coverLetter || null,
        financialStatement: data.financialStatement || null,
        tos: data.tos || null,
        attachments: data.attachments || null,
        total: new Prisma.Decimal(total),
        status: data.status || 'DRAFT',
        clientId: clientId,
        submittedById: submittedById,
        section: {
          create: (sections || []).map((section: any, sectionIndex: number) => ({
            title: section.title || `Section ${sectionIndex + 1}`,
            note: section.note || null,
            discount: section.discount ? new Prisma.Decimal(section.discount) : null,
            sortOrder: section.sortOrder ?? sectionIndex,
            preparedById: section.preparedById || session.user.id,
            groups: {
              create: (section.groups || []).map((group: any, groupIndex: number) => ({
                code: group.code || null,
                description: group.description || '',
                quantity: group.quantity ? new Prisma.Decimal(group.quantity) : null,
                sortOrder: group.sortOrder ?? groupIndex,
                items: {
                  create: (group.items || []).map((item: any, itemIndex: number) => ({
                    sl: item.sl ?? itemIndex + 1,
                    code: item.code || null,
                    description: item.description || null,
                    height: item.height ? new Prisma.Decimal(item.height) : null,
                    width: item.width ? new Prisma.Decimal(item.width) : null,
                    depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                    unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                    quantity: new Prisma.Decimal(item.quantity || 0),
                    unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                    totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                    amount: new Prisma.Decimal(item.amount || 0),
                    note: item.note || null,
                    sortOrder: item.sortOrder ?? itemIndex,
                    itemId: item.itemId || null,
                  })),
                },
              })),
            },
            items: {
              create: (section.items || []).map((item: any, itemIndex: number) => ({
                sl: item.sl ?? itemIndex + 1,
                code: item.code || null,
                description: item.description || null,
                height: item.height ? new Prisma.Decimal(item.height) : null,
                width: item.width ? new Prisma.Decimal(item.width) : null,
                depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                quantity: new Prisma.Decimal(item.quantity || 0),
                unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                amount: new Prisma.Decimal(item.amount || 0),
                note: item.note || null,
                sortOrder: item.sortOrder ?? itemIndex,
                itemId: item.itemId || null,
              })),
            },
          })),
        },
      },
      include: {
        client: true,
        submittedBy: true,
        section: {
          include: {
            preparedBy: true,
            groups: {
              include: {
                items: {
                  include: {
                    item: true,
                  },
                },
              },
            },
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    revalidatePath('/dashboard/quotations');
    
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
        const newClient = await prisma.client.create({
          data: {
            name: data.clientName,
            address: data.clientAddress || null,
            phone: data.clientContact || null,
            email: data.clientContact?.includes('@') ? data.clientContact : null,
            status: 'active',
            createdBy: session.user.id,
          },
        });
        clientId = newClient.id;
      }
    }

    if (!clientId) {
      return {
        success: false,
        error: 'Client is required',
        data: null,
      };
    }

    // Handle user (submittedBy)
    let submittedById = data.submittedById || session.user.id;
    if (!submittedById && data.submittedBy) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.submittedByContact || '' },
            { name: data.submittedBy },
          ],
        },
      });

      if (existingUser) {
        submittedById = existingUser.id;
      } else {
        const email = data.submittedByContact?.includes('@')
          ? data.submittedByContact
          : `${data.submittedBy.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        
        const newUser = await prisma.user.create({
          data: {
            name: data.submittedBy,
            email: email,
            password: 'temp',
            role: 'user',
          },
        });
        submittedById = newUser.id;
      }
    }

    // Map modules to sections (form uses "modules", Prisma uses "sections")
    const sections = data.sections || data.modules || [];
    
    // Calculate total from sections
    let total = 0;
    if (sections && Array.isArray(sections)) {
      sections.forEach((section: any) => {
        let sectionTotal = 0;

        if (section.items && Array.isArray(section.items)) {
          section.items.forEach((item: any) => {
            sectionTotal += Number(item.amount || 0);
          });
        }

        if (section.groups && Array.isArray(section.groups)) {
          section.groups.forEach((group: any) => {
            if (group.items && Array.isArray(group.items)) {
              group.items.forEach((item: any) => {
                sectionTotal += Number(item.amount || 0);
              });
            }
          });
        }

        if (section.discount) {
          sectionTotal = sectionTotal * (1 - Number(section.discount) / 100);
        }

        total += sectionTotal;
      });
    }

    // Delete existing sections (cascade will handle items and groups)
    await prisma.section.deleteMany({
      where: { quotationId: id },
    });

    // Update quotation with new sections
    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        quotationNumber: data.quotationNumber || existingQuotation.quotationNumber,
        subject: data.subject || existingQuotation.subject,
        submittedTo: data.submittedTo || existingQuotation.submittedTo,
        date: data.date ? new Date(data.date) : existingQuotation.date,
        coverLetter: data.coverLetter !== undefined ? (data.coverLetter || null) : existingQuotation.coverLetter,
        financialStatement: data.financialStatement !== undefined ? (data.financialStatement || null) : existingQuotation.financialStatement,
        tos: data.tos !== undefined ? (data.tos || null) : existingQuotation.tos,
        attachments: data.attachments !== undefined ? data.attachments : existingQuotation.attachments,
        total: new Prisma.Decimal(total),
        status: data.status || existingQuotation.status,
        clientId: clientId,
        submittedById: submittedById,
        section: {
          create: (sections || []).map((section: any, sectionIndex: number) => ({
            title: section.title || `Section ${sectionIndex + 1}`,
            note: section.note || null,
            discount: section.discount ? new Prisma.Decimal(section.discount) : null,
            sortOrder: section.sortOrder ?? sectionIndex,
            preparedById: section.preparedById || session.user.id,
            groups: {
              create: (section.groups || []).map((group: any, groupIndex: number) => ({
                code: group.code || null,
                description: group.description || '',
                quantity: group.quantity ? new Prisma.Decimal(group.quantity) : null,
                sortOrder: group.sortOrder ?? groupIndex,
                items: {
                  create: (group.items || []).map((item: any, itemIndex: number) => ({
                    sl: item.sl ?? itemIndex + 1,
                    code: item.code || null,
                    description: item.description || null,
                    height: item.height ? new Prisma.Decimal(item.height) : null,
                    width: item.width ? new Prisma.Decimal(item.width) : null,
                    depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                    unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                    quantity: new Prisma.Decimal(item.quantity || 0),
                    unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                    totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                    amount: new Prisma.Decimal(item.amount || 0),
                    note: item.note || null,
                    sortOrder: item.sortOrder ?? itemIndex,
                    itemId: item.itemId || null,
                  })),
                },
              })),
            },
            items: {
              create: (section.items || []).map((item: any, itemIndex: number) => ({
                sl: item.sl ?? itemIndex + 1,
                code: item.code || null,
                description: item.description || null,
                height: item.height ? new Prisma.Decimal(item.height) : null,
                width: item.width ? new Prisma.Decimal(item.width) : null,
                depth: item.depth ? new Prisma.Decimal(item.depth) : null,
                unitPrice: new Prisma.Decimal(item.unitPrice || 0),
                quantity: new Prisma.Decimal(item.quantity || 0),
                unitShutter: item.unitShutter ? new Prisma.Decimal(item.unitShutter) : null,
                totalShutter: item.totalShutter ? new Prisma.Decimal(item.totalShutter) : null,
                amount: new Prisma.Decimal(item.amount || 0),
                note: item.note || null,
                sortOrder: item.sortOrder ?? itemIndex,
                itemId: item.itemId || null,
              })),
            },
          })),
        },
      },
      include: {
        client: true,
        submittedBy: true,
        section: {
          include: {
            preparedBy: true,
            groups: {
              include: {
                items: {
                  include: {
                    item: true,
                  },
                },
              },
            },
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    revalidatePath('/dashboard/quotations');
    revalidatePath(`/dashboard/quotations/${id}`);
    
    return {
      success: true,
      data: quotation,
    };
  } catch (error) {
    console.error('Error updating quotation:', error);
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

    // Delete quotation (cascade will handle sections, groups, items)
    await prisma.quotation.delete({
      where: { id },
    });

    revalidatePath('/dashboard/quotations');
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete quotation',
    };
  }
}

