"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const applyCampaignSchema = z.object({
  promoStartsAt: z.string().optional().nullable(),
  promoEndsAt: z.string().min(1, "Promotion expiration date is required"),
  items: z.array(
    z.object({
      id: z.string().min(1),
      discountType: z.enum(["PERCENT", "AMOUNT"]),
      discountValue: z.number().min(0, "Discount value must be non-negative"),
    })
  ).min(1, "Select at least one product"),
});

/**
 * Fetch filter options (Categories and Companies/Brands)
 */
export async function getCampaignFilterOptions() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, categories: [], brands: [] };
    }

    const [categories, brands] = await Promise.all([
      prisma.category.findMany({
        where: { status: "active" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.brand.findMany({
        where: { status: "active" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true,
      categories,
      brands,
    };
  } catch (error) {
    console.error("getCampaignFilterOptions error:", error);
    return { success: false, categories: [], brands: [] };
  }
}

/**
 * Search products for campaign builder with Category & Company/Brand filters
 */
export async function searchProductsForCampaign(
  query: string = "",
  categoryId?: string,
  brandId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const trimmed = query.trim();

    const where: Prisma.ItemWhereInput = {
      isTrash: false,
      status: "active",
      ...(categoryId && categoryId !== "ALL" ? { categoryId } : {}),
      ...(brandId && brandId !== "ALL" ? { brandId } : {}),
      ...(trimmed
        ? {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { code: { contains: trimmed, mode: "insensitive" } },
              { barcode: { contains: trimmed, mode: "insensitive" } },
              { category: { name: { contains: trimmed, mode: "insensitive" } } },
              { brand: { name: { contains: trimmed, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const items = await prisma.item.findMany({
      where,
      take: 100,
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        barcode: true,
        salesPrice: true,
        costPrice: true,
        discount: true,
        isPromo: true,
        promoStartsAt: true,
        promoEndsAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        unit: { select: { symbol: true } },
      },
    });

    return {
      success: true,
      items: items.map((item) => ({
        ...item,
        salesPrice: item.salesPrice ? Number(item.salesPrice) : 0,
        costPrice: item.costPrice ? Number(item.costPrice) : 0,
        discount: item.discount ? Number(item.discount) : 0,
        promoStartsAt: item.promoStartsAt ? item.promoStartsAt.toISOString() : null,
        promoEndsAt: item.promoEndsAt ? item.promoEndsAt.toISOString() : null,
      })),
    };
  } catch (error) {
    console.error("searchProductsForCampaign error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search products",
      items: [],
    };
  }
}

/**
 * Apply Promotional Campaign to selected items
 */
export async function applyPromotionalCampaign(input: z.infer<typeof applyCampaignSchema>) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canEdit = await hasPermission(session.user.id, "sales.campaigns", "edit");
    const canCreate = await hasPermission(session.user.id, "sales.campaigns", "create");
    if (!canEdit && !canCreate) {
      return { success: false, error: "You do not have permission to manage promotional campaigns" };
    }

    const validated = applyCampaignSchema.parse(input);
    const promoStartDate = validated.promoStartsAt ? new Date(validated.promoStartsAt) : null;
    const promoEndDate = new Date(validated.promoEndsAt);

    // Fetch item details to calculate retail discount correctly
    const itemIds = validated.items.map((i) => i.id);
    const dbItems = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, salesPrice: true, name: true },
    });

    const itemMap = new Map(dbItems.map((item) => [item.id, item]));

    // Process each update transactionally
    let updatedCount = 0;
    await prisma.$transaction(
      validated.items.map((entry) => {
        const item = itemMap.get(entry.id);
        const salesPrice = item?.salesPrice ? Number(item.salesPrice) : 0;
        
        let calculatedDiscount = 0;
        if (entry.discountType === "PERCENT") {
          calculatedDiscount = (salesPrice * entry.discountValue) / 100;
        } else {
          calculatedDiscount = entry.discountValue;
        }

        // Round to 2 decimal places and cap at sales price
        calculatedDiscount = Math.min(salesPrice, Math.max(0, Math.round(calculatedDiscount * 100) / 100));

        updatedCount++;
        return prisma.item.update({
          where: { id: entry.id },
          data: {
            discount: calculatedDiscount,
            isPromo: true,
            promoStartsAt: promoStartDate,
            promoEndsAt: promoEndDate,
          },
        });
      })
    );

    revalidatePath("/dashboard/sales/campaigns");
    revalidatePath("/dashboard/master/items");
    revalidatePath("/dashboard/sales/pos");

    return {
      success: true,
      message: `Successfully applied promotional campaign to ${updatedCount} products.`,
      updatedCount,
    };
  } catch (error) {
    console.error("applyPromotionalCampaign error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply promotional campaign",
    };
  }
}

/**
 * Fetch all active promotional items
 */
export async function getActivePromotions() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const items = await prisma.item.findMany({
      where: {
        isTrash: false,
        isPromo: true,
      },
      orderBy: { promoEndsAt: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        barcode: true,
        salesPrice: true,
        costPrice: true,
        discount: true,
        isPromo: true,
        promoStartsAt: true,
        promoEndsAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        unit: { select: { symbol: true } },
      },
    });

    return {
      success: true,
      items: items.map((item) => ({
        ...item,
        salesPrice: item.salesPrice ? Number(item.salesPrice) : 0,
        costPrice: item.costPrice ? Number(item.costPrice) : 0,
        discount: item.discount ? Number(item.discount) : 0,
        promoStartsAt: item.promoStartsAt ? item.promoStartsAt.toISOString() : null,
        promoEndsAt: item.promoEndsAt ? item.promoEndsAt.toISOString() : null,
      })),
    };
  } catch (error) {
    console.error("getActivePromotions error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch active promotions",
      items: [],
    };
  }
}

/**
 * Clear promotional pricing for selected items
 */
export async function clearPromotions(itemIds: string[]) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!itemIds || itemIds.length === 0) {
      return { success: false, error: "No items selected to clear" };
    }

    await prisma.item.updateMany({
      where: { id: { in: itemIds } },
      data: {
        isPromo: false,
        promoStartsAt: null,
        promoEndsAt: null,
        discount: 0,
      },
    });

    revalidatePath("/dashboard/sales/campaigns");
    revalidatePath("/dashboard/master/items");
    revalidatePath("/dashboard/sales/pos");

    return {
      success: true,
      message: `Cleared promotional expiry for ${itemIds.length} items.`,
    };
  } catch (error) {
    console.error("clearPromotions error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear promotions",
    };
  }
}
