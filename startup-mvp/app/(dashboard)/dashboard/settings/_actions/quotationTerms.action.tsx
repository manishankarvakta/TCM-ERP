"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";
import { serializeData } from "@/lib/utils/serialization";

/**
 * Get paginated list of quotation terms with search
 */
export async function getQuotationTerms(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        quotationTerms: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    const where: any = {
      createdBy: session.user.id
    };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      where.status = { not: "trash" };
    }

    console.log('getQuotationTerms where:', JSON.stringify(where));
    const total = await prisma.quotationTerms.count({ where });
    console.log('getQuotationTerms total:', total);

    const terms = await (prisma as any).quotationTerms.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        paymentTerms: true,
        refundPolicy: true,
        terminationPolicy: true,
        status: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
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
        createdAt: "desc",
      },
    });

    console.log('getQuotationTerms found:', terms.length, 'records');

    const totalPages = Math.ceil(total / limit);

    return serializeData({
      success: true,
      quotationTerms: terms.map((t: any) => ({
        ...t,
        creator: (t as any).User
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("getQuotationTerms error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch quotation terms",
      quotationTerms: [],
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
 * Get quotation terms by ID
 */
export async function getQuotationTermsById(termsId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        terms: null,
      };
    }

    const terms = await (prisma as any).quotationTerms.findFirst({
      where: { 
        id: termsId,
        createdBy: session.user.id 
      },
      include: {
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

    if (!terms) {
      return {
        success: false,
        error: "Terms not found",
        terms: null,
      };
    }

    return serializeData({
      success: true,
      terms: {
        ...terms,
        creator: (terms as any).User
      },
    });
  } catch (error) {
    console.error("getQuotationTermsById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch quotation terms",
      terms: null,
    };
  }
}

/**
 * Create a new set of quotation terms
 */
export async function createQuotationTerms(input: {
  title: string;
  content: string;
  paymentTerms: string;
  refundPolicy: string;
  terminationPolicy: string;
  status?: "active" | "inactive";
  isDefault?: boolean;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        terms: null,
      };
    }

    // If setting as default, unset others first
    if (input.isDefault) {
      await (prisma as any).quotationTerms.updateMany({
        where: { createdBy: session.user.id },
        data: { isDefault: false },
      });
    }

    const terms = await (prisma as any).quotationTerms.create({
      data: {
        title: input.title,
        content: input.content,
        paymentTerms: input.paymentTerms,
        refundPolicy: input.refundPolicy,
        terminationPolicy: input.terminationPolicy,
        status: input.status || "active",
        isDefault: !!input.isDefault,
        createdBy: session.user.id,
      },
      include: {
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

    await logItemCreated(
      session.user.id,
      "QuotationTerms",
      terms.id,
      terms.title,
      { title: terms.title, status: terms.status }
    );

    revalidateBothPaths("/dashboard/settings");

    return serializeData({
      success: true,
      terms: {
        ...terms,
        creator: (terms as any).User
      },
    });
  } catch (error) {
    console.error("createQuotationTerms error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create quotation terms",
      terms: null,
    };
  }
}

/**
 * Update quotation terms
 */
export async function updateQuotationTerms(
  termsId: string,
  input: {
    title?: string;
    content?: string;
    paymentTerms?: string;
    refundPolicy?: string;
    terminationPolicy?: string;
    status?: "active" | "inactive";
    isDefault?: boolean;
  }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        terms: null,
      };
    }

    const existingTerms = await prisma.quotationTerms.findUnique({
      where: { id: termsId },
    });

    if (!existingTerms) {
      return {
        success: false,
        error: "Terms not found",
        terms: null,
      };
    }

    // Handle isDefault logic
    if (input.isDefault && !existingTerms.isDefault) {
      await (prisma as any).quotationTerms.updateMany({
        where: { createdBy: session.user.id },
        data: { isDefault: false },
      });
    }

    const changes: string[] = [];
    if (input.title && input.title !== existingTerms.title) changes.push("title");
    if (input.content && input.content !== existingTerms.content) changes.push("content");
    if (input.status && input.status !== existingTerms.status) changes.push("status");

    const terms = await (prisma as any).quotationTerms.update({
      where: { id: termsId },
      data: {
        title: input.title ?? existingTerms.title,
        content: input.content ?? existingTerms.content,
        paymentTerms: input.paymentTerms ?? existingTerms.paymentTerms,
        refundPolicy: input.refundPolicy ?? existingTerms.refundPolicy,
        terminationPolicy: input.terminationPolicy ?? existingTerms.terminationPolicy,
        status: input.status ?? existingTerms.status,
        isDefault: input.isDefault ?? existingTerms.isDefault,
      },
      include: {
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

    await logItemUpdated(
      session.user.id,
      "QuotationTerms",
      terms.id,
      changes,
      terms.title,
      { title: terms.title, status: terms.status }
    );

    revalidateBothPaths("/dashboard/settings");

    return serializeData({
      success: true,
      terms: {
        ...terms,
        creator: (terms as any).User
      },
    });
  } catch (error) {
    console.error("updateQuotationTerms error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update quotation terms",
      terms: null,
    };
  }
}

/**
 * Soft delete quotation terms
 */
export async function deleteQuotationTerms(termsId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const terms = await (prisma as any).quotationTerms.findUnique({ where: { id: termsId } });
    if (!terms) return { success: false, error: "Terms not found" };

    await (prisma as any).quotationTerms.update({
      where: { id: termsId },
      data: { status: "trash" },
    });

    await logItemDeleted(session.user.id, "QuotationTerms", termsId, terms.title);
    revalidateBothPaths("/dashboard/settings");

    return { success: true };
  } catch (error) {
    console.error("deleteQuotationTerms error:", error);
    return { success: false, error: "Failed to delete" };
  }
}

/**
 * Restore from trash
 */
export async function restoreQuotationTerms(termsId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await (prisma as any).quotationTerms.update({
      where: { id: termsId },
      data: { status: "active" },
    });

    revalidateBothPaths("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("restoreQuotationTerms error:", error);
    return { success: false, error: "Failed to restore" };
  }
}

/**
 * Bulk actions
 */
export async function bulkUpdateQuotationTermsStatus(ids: string[], status: "active" | "inactive" | "trash") {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await (prisma as any).quotationTerms.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    revalidateBothPaths("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("bulkUpdateQuotationTermsStatus error:", error);
    return { success: false, error: "Failed bulk update" };
  }
}

/**
 * Permanent delete
 */
export async function deleteQuotationTermsPermanently(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await (prisma as any).quotationTerms.deleteMany({
      where: { id: { in: ids }, status: "trash" },
    });

    revalidateBothPaths("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("deleteQuotationTermsPermanently error:", error);
    return { success: false, error: "Failed permanent delete" };
  }
}
