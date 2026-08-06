"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { notifyItemCreated, notifyItemUpdated, notifyItemDeleted } from "@/lib/notification";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma, ItemType } from "@prisma/client";

/**
 * Generate unique item code based on item type
 */
async function generateItemCode(itemType: ItemType): Promise<string> {
  const prefix = {
    RAW_MATERIAL: "RM",
    READY_PRODUCT: "RP",
    RETAIL: "RT",
    WHOLESALE: "WS",
  }[itemType];
  
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  
  // Find last code with this pattern
  const lastItem = await prisma.item.findFirst({
    where: { 
      code: { startsWith: pattern },
    },
    orderBy: { code: "desc" },
  });
  
  let sequence = 1;
  if (lastItem) {
    const parts = lastItem.code.split("-");
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[2] || "0");
      sequence = lastSeq + 1;
    }
  }
  
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Generate a unique EAN-13 barcode starting with prefix '200'
 */
async function generateUniqueBarcode(): Promise<string> {
  let unique = false;
  let barcode = "";
  while (!unique) {
    barcode = Math.floor(10000000 + Math.random() * 90000000).toString();

    // Check collision in database
    const existing = await prisma.productVariant.findFirst({
      where: { barcode },
      select: { id: true }
    });
    if (!existing) {
      unique = true;
    }
  }
  return barcode;
}

/**
 * Generate a unique 8-character random barcode for an Item (not variant)
 */
async function generateUniqueItemBarcode(): Promise<string> {
  let unique = false;
  let barcode = "";
  while (!unique) {
    barcode = Math.floor(10000000 + Math.random() * 90000000).toString();

    // Check collision in Item table
    const existingItem = await prisma.item.findFirst({
      where: { barcode },
      select: { id: true }
    });
    // Also check variant barcodes to avoid cross-collision
    const existingVariant = await prisma.productVariant.findFirst({
      where: { barcode },
      select: { id: true }
    });
    if (!existingItem && !existingVariant) {
      unique = true;
    }
  }
  return barcode;
}

/**
 * Convert a string into a clean URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")           // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "-")         // Replace multiple - with single -
    .replace(/^-+/, "")             // Trim - from start of text
    .replace(/-+$/, "");            // Trim - from end of text
}

/**
 * Generate a unique slug for an item, appending a numeric suffix if necessary
 */
async function generateUniqueSlug(name: string, excludeItemId?: string): Promise<string> {
  const baseSlug = slugify(name) || "item";
  
  const existingItems = await prisma.item.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
      id: excludeItemId ? { not: excludeItemId } : undefined,
    },
    select: {
      slug: true,
    },
  });

  const slugs = new Set(existingItems.map(item => item.slug).filter(Boolean) as string[]);
  
  if (!slugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  while (slugs.has(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}


/**
 * Get active categories for dropdown
 */
export async function getActiveCategories() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", categories: [] };
    }

    const categories = await prisma.category.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      categories,
    };
  } catch (error) {
    console.error("getActiveCategories error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch categories",
      categories: [],
    };
  }
}

/**
 * Get active units for dropdown
 */
export async function getActiveUnits() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", units: [] };
    }

    const units = await prisma.unit.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        symbol: true,
        details: true,
      },
      orderBy: {
        symbol: "asc",
      },
    });

    return {
      success: true,
      units,
    };
  } catch (error) {
    console.error("getActiveUnits error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch units",
      units: [],
    };
  }
}

/**
 * Get paginated list of items with search
 */
export async function getItems(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  itemType?: ItemType
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view items",
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause for search and status
    const where: Prisma.ItemWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status === "trash") {
      where.isTrash = true;
      where.status = "trash";
    } else if (status === "active") {
      where.isTrash = false;
      where.status = "active";
    } else if (status === "inactive") {
      where.isTrash = false;
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.isTrash = false;
    }

    // Filter by item type
    if (itemType) {
      where.itemType = itemType;
    }

    // Get total count
    const total = await prisma.item.count({ where });

    // Get items
    const items = await prisma.item.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        slug: true,
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        brandId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        wholesalePrice: true,
        wholesaleDiscountAmount: true,
        discount: true,
        trackInventory: true,
        images: true,
        featuredImage: true,
        sizes: true,
        colors: true,
        isEnableEcom: true,
        barcode: true,
        isPromo: true,
        promoEndsAt: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        subCategoryId: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getItems error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items",
      items: [],
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
 * Get item by ID
 */
export async function getItemById(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        item: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view items",
        item: null,
      };
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        code: true,
        slug: true,
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        brandId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        wholesalePrice: true,
        wholesaleDiscountAmount: true,
        discount: true,
        trackInventory: true,
        images: true,
        featuredImage: true,
        sizes: true,
        colors: true,
        isEnableEcom: true,
        barcode: true,
        isPromo: true,
        promoEndsAt: true,
        status: true,
        isTrash: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        isVatEnabled: true,
        vatPercentage: true,
        subCategoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            size: true,
            color: true,
            costPrice: true,
            salesPrice: true,
            image: true,
            stocks: {
              select: {
                id: true,
                warehouseId: true,
                quantity: true,
              }
            }
          },
        },
      },
    });

    if (!item) {
      return {
        success: false,
        error: "Item not found",
        item: null,
      };
    }

    console.log("getItemById - Item:", item.id, "Sizes:", item.sizes, "Colors:", item.colors);

    // Map Prisma Decimal fields to numbers to prevent Next.js Client serialization errors
    const serializedItem = {
      ...item,
      costPrice: Number(item.costPrice),
      salesPrice: item.salesPrice ? Number(item.salesPrice) : null,
      wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice) : null,
      wholesaleDiscountAmount: item.wholesaleDiscountAmount ? Number(item.wholesaleDiscountAmount) : null,
      discount: item.discount ? Number(item.discount) : null,
      vatPercentage: item.vatPercentage ? Number(item.vatPercentage) : 0,
      variants: item.variants ? item.variants.map((v) => ({
        ...v,
        costPrice: v.costPrice ? Number(v.costPrice) : null,
        salesPrice: v.salesPrice ? Number(v.salesPrice) : null,
        wholesalePrice: (v as any).wholesalePrice ? Number((v as any).wholesalePrice) : null,
        wholesaleDiscountAmount: (v as any).wholesaleDiscountAmount ? Number((v as any).wholesaleDiscountAmount) : null,
        stocks: v.stocks ? v.stocks.map((s) => ({
          ...s,
          quantity: Number(s.quantity),
        })) : [],
      })) : [],
    };

    return {
      success: true,
      item: serializedItem,
    };
  } catch (error) {
    console.error("getItemById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch item",
      item: null,
    };
  }
}

/**
 * Get stock information for an item
 * Calculates stock from purchase items (simplified - until proper inventory system is implemented)
 */
export async function getItemStock(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        stock: null,
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view items",
        stock: null,
      };
    }

    // Check if item exists and has inventory tracking enabled
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        trackInventory: true,
      },
    });

    if (!item) {
      return {
        success: false,
        error: "Item not found",
        stock: null,
      };
    }

    // If inventory tracking is disabled, return null
    if (!item.trackInventory) {
      return {
        success: true,
        stock: {
          quantity: null,
          totalValue: null,
          lastUpdated: null,
          message: "Inventory tracking is disabled for this item",
        },
      };
    }

    // Calculate stock from purchase items where purchase status is RECEIVED
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: {
        itemId: itemId,
        purchase: {
          status: "RECEIVED", // Only count received purchases
        },
      },
      select: {
        quantity: true,
        unitPrice: true,
        purchase: {
          select: {
            date: true,
          },
        },
      },
    });

    // Calculate total quantity and value
    let totalQuantity = 0;
    let totalValue = 0;
    let lastPurchaseDate: Date | null = null;

    for (const purchaseItem of purchaseItems) {
      const qty = Number(purchaseItem.quantity);
      const price = Number(purchaseItem.unitPrice);
      totalQuantity += qty;
      totalValue += qty * price;
      
      if (purchaseItem.purchase.date) {
        if (!lastPurchaseDate || purchaseItem.purchase.date > lastPurchaseDate) {
          lastPurchaseDate = purchaseItem.purchase.date;
        }
      }
    }

    // Calculate average cost
    const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

    return {
      success: true,
      stock: {
        quantity: totalQuantity,
        averageCost,
        totalValue,
        lastUpdated: lastPurchaseDate,
        message: null,
      },
    };
  } catch (error) {
    console.error("getItemStock error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stock",
      stock: null,
    };
  }
}

/**
 * Get warehouse-wise stock information for an item
 */
export async function getItemWarehouseStock(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        stocks: [],
      };
    }

    // Permission check
    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return {
        success: false,
        error: "You do not have permission to view items",
        stocks: [],
      };
    }

    // Check if item exists and has inventory tracking enabled
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { trackInventory: true },
    });

    if (!item) {
      return { success: false, error: "Item not found", stocks: [] };
    }

    if (!item.trackInventory) {
      return {
        success: true,
        stocks: [],
        message: "Inventory tracking is disabled for this item",
      };
    }

    // Fetch user to get role and defaultWarehouseId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, defaultWarehouseId: true }
    });

    if (!user) {
      return { success: false, error: "User not found", stocks: [] };
    }

    const isNormalUser = user.role === "user";

    // If normal user has no default warehouse, they can't see any stock
    if (isNormalUser && !user.defaultWarehouseId) {
      return {
        success: true,
        stocks: [],
        message: "No default warehouse assigned to your account."
      };
    }

    // Build the query where clause
    const whereClause: any = {
      OR: [
        { itemId: itemId },
        { variant: { itemId: itemId } }
      ]
    };

    if (isNormalUser && user.defaultWarehouseId) {
      whereClause.warehouseId = user.defaultWarehouseId;
    }

    // Query Stock table
    const stockRecords = await prisma.stock.findMany({
      where: whereClause,
      include: {
        warehouse: {
          select: { id: true, name: true, code: true }
        },
        variant: {
          select: { costPrice: true, salesPrice: true }
        },
        item: {
          select: { costPrice: true, salesPrice: true }
        }
      }
    });

    // Group by warehouse
    const warehouseStockMap = new Map<string, {
      warehouse: { id: string; name: string; code: string };
      quantity: number;
      totalValue: number;
      lastUpdated: Date;
    }>();

    for (const record of stockRecords) {
      const whId = record.warehouseId;
      const qty = Number(record.quantity);
      
      // Determine cost price for value calculation
      const costPrice = record.variant?.costPrice ? Number(record.variant.costPrice) : 
                        record.item?.costPrice ? Number(record.item.costPrice) : 0;
      
      const value = qty * costPrice;

      if (!warehouseStockMap.has(whId)) {
        warehouseStockMap.set(whId, {
          warehouse: record.warehouse,
          quantity: 0,
          totalValue: 0,
          lastUpdated: record.lastUpdated,
        });
      }

      const whStock = warehouseStockMap.get(whId)!;
      whStock.quantity += qty;
      whStock.totalValue += value;
      if (record.lastUpdated > whStock.lastUpdated) {
        whStock.lastUpdated = record.lastUpdated;
      }
    }

    const stocks = Array.from(warehouseStockMap.values()).map(ws => ({
      ...ws,
      averageCost: ws.quantity > 0 ? ws.totalValue / ws.quantity : 0
    }));

    // Sort by warehouse name
    stocks.sort((a, b) => a.warehouse.name.localeCompare(b.warehouse.name));

    return {
      success: true,
      stocks,
      message: null,
    };
  } catch (error) {
    console.error("getItemWarehouseStock error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch warehouse stock",
      stocks: [],
    };
  }
}

/**
 * Create a new item
 */
export async function createItem(input: {
  name: string;
  description?: string;
  itemType: ItemType;
  categoryId?: string | null;
  subCategoryId?: string | null;
  brandId?: string | null;
  unitId: string;
  costPrice: number;
  salesPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleDiscountAmount?: number | null;
  discount?: number | null;
  trackInventory?: boolean;
  images?: string[] | null;
  featuredImage?: string | null;
  sizes?: string[];
  colors?: string[];
  isEnableEcom?: boolean;
  status?: "active" | "inactive";
  isVatEnabled?: boolean;
  vatPercentage?: number;
  barcode?: string | null;
  isPromo?: boolean;
  promoEndsAt?: Date | string | null;
  variants?: Array<{
    sku: string;
    barcode?: string | null;
    size: string;
    color: string;
    costPrice?: number | null;
    salesPrice?: number | null;
    wholesalePrice?: number | null;
    wholesaleDiscountAmount?: number | null;
    initialStock?: number;
    image?: string | null;
  }>;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        item: null,
      };
    }

    // Permission check
    const canCreate = await hasPermission(session.user.id, "master.items", "create");
    if (!canCreate) {
      return {
        success: false,
        error: "You do not have permission to create items",
        item: null,
      };
    }

    // Validate: salesPrice required if itemType = READY_PRODUCT or RETAIL
    if ((input.itemType === "READY_PRODUCT" || input.itemType === "RETAIL") && (!input.salesPrice || input.salesPrice <= 0)) {
      return {
        success: false,
        error: "Sales price is required for Ready Products and Retail items",
        item: null,
      };
    }

    if (input.itemType === "WHOLESALE" && (!input.wholesalePrice || input.wholesalePrice <= 0)) {
      return {
        success: false,
        error: "Wholesale price is required for Wholesale items",
        item: null,
      };
    }

    // Validate: categoryId exists (if provided)
    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        return {
          success: false,
          error: "Category not found",
          item: null,
        };
      }
    }

    // Validate: brandId exists (if provided)
    if (input.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: input.brandId },
      });
      if (!brand) {
        return {
          success: false,
          error: "Brand not found",
          item: null,
        };
      }
    }

    // Validate: unitId exists
    const unit = await prisma.unit.findUnique({
      where: { id: input.unitId },
    });
    if (!unit) {
      return {
        success: false,
        error: "Unit not found",
        item: null,
      };
    }

    // Validate: subCategoryId exists (if provided)
    if (input.subCategoryId) {
      const subCategory = await prisma.category.findUnique({
        where: { id: input.subCategoryId },
      });
      if (!subCategory) {
        return {
          success: false,
          error: "Sub-category not found",
          item: null,
        };
      }
      if (input.categoryId && subCategory.parentId !== input.categoryId) {
        return {
          success: false,
          error: "Selected sub-category does not belong to the selected category",
          item: null,
        };
      }
    }

    // Generate code
    const code = await generateItemCode(input.itemType);

    // Generate unique slug from name
    const slug = await generateUniqueSlug(input.name);

    // Handle item base barcode
    let finalBarcode = input.barcode;
    if (!finalBarcode) {
      finalBarcode = await generateUniqueItemBarcode();
    } else {
      // Check collision in Item table
      const existingItem = await prisma.item.findFirst({
        where: { barcode: finalBarcode },
        select: { id: true }
      });
      // Also check variant barcodes to avoid cross-collision
      const existingVariant = await prisma.productVariant.findFirst({
        where: { barcode: finalBarcode },
        select: { id: true }
      });
      if (existingItem || existingVariant) {
        return {
          success: false,
          error: `Barcode '${finalBarcode}' is already assigned to another item or variant.`,
          item: null,
        };
      }
    }

    console.log("Creating Item - Sizes:", input.sizes, "Colors:", input.colors);

    // Create item
    const item = await prisma.item.create({
      data: {
        code,
        slug,
        name: input.name,
        description: input.description || null,
        itemType: input.itemType,
        categoryId: input.categoryId || null,
        subCategoryId: input.subCategoryId || null,
        brandId: input.brandId || null,
        unitId: input.unitId,
        costPrice: input.costPrice || 0,
        salesPrice: input.salesPrice || 0,
        wholesalePrice: input.wholesalePrice || 0,
        wholesaleDiscountAmount: input.wholesaleDiscountAmount || 0,
        discount: input.discount || 0,
        trackInventory: input.trackInventory ?? false,
        images: input.images || [],
        featuredImage: input.featuredImage || null,
        sizes: input.sizes || [],
        colors: input.colors || [],
        isEnableEcom: input.isEnableEcom ?? false,
        status: input.status || "active",
        isVatEnabled: input.isVatEnabled ?? false,
        vatPercentage: input.vatPercentage ?? 0,
        barcode: finalBarcode,
        isPromo: input.isPromo ?? false,
        promoEndsAt: input.promoEndsAt ? new Date(input.promoEndsAt) : null,
        isTrash: false,
        createdBy: session.user.id,
        variants: input.variants && input.variants.length > 0 ? {
          create: await Promise.all(input.variants.map(async (v) => ({
            sku: v.sku,
            barcode: v.barcode || await generateUniqueBarcode(),
            size: v.size,
            color: v.color,
            costPrice: v.costPrice || 0,
            salesPrice: v.salesPrice || 0,
            wholesalePrice: v.wholesalePrice || 0,
            wholesaleDiscountAmount: v.wholesaleDiscountAmount || 0,
            image: v.image || null,
          }))),
        } : undefined,
      },
      select: {
        id: true,
        code: true,
        slug: true,
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        subCategoryId: true,
        brandId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        wholesalePrice: true,
        wholesaleDiscountAmount: true,
        discount: true,
        trackInventory: true,
        images: true,
        sizes: true,
        colors: true,
        isEnableEcom: true,
        barcode: true,
        isPromo: true,
        promoEndsAt: true,
        featuredImage: true,
        status: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            size: true,
            color: true,
          }
        }
      },
    });

    // Seed initial stock for variants if specified and trackInventory is active
    if (input.variants && input.variants.length > 0 && input.trackInventory) {
      // Find the first active warehouse
      const warehouse = await prisma.warehouse.findFirst({
        where: { isTrash: false, status: "active" },
        select: { id: true }
      });
      if (warehouse) {
        for (const v of input.variants) {
          if (v.initialStock && v.initialStock > 0) {
            // Find created variant ID
            const createdVar = item.variants.find(cv => cv.sku === v.sku);
            if (createdVar) {
              await prisma.stock.create({
                data: {
                  variantId: createdVar.id,
                  warehouseId: warehouse.id,
                  quantity: v.initialStock,
                }
              });
            }
          }
        }
      }
    }

    // Log item creation
    await logItemCreated(
      session.user.id,
      "Item",
      item.id,
      item.name,
      { 
        code: item.code,
        name: item.name,
        itemType: item.itemType,
        costPrice: Number(item.costPrice),
        salesPrice: item.salesPrice ? Number(item.salesPrice) : null,
      }
    );

    // Notify user
    await notifyItemCreated(
      session.user.id,
      "Item",
      item.name
    );

    // Revalidate items page
    revalidateBothPaths("master/items");

    return {
      success: true,
      item,
    };
  } catch (error) {
    console.error("createItem error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create item",
      item: null,
    };
  }
}

/**
 * Update an item
 */
export async function updateItem(input: {
  id: string;
  name: string;
  description?: string;
  itemType: ItemType;
  categoryId?: string | null;
  subCategoryId?: string | null;
  brandId?: string | null;
  unitId: string;
  costPrice: number;
  salesPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleDiscountAmount?: number | null;
  discount?: number | null;
  trackInventory?: boolean;
  images?: string[] | null;
  featuredImage?: string | null;
  sizes?: string[];
  colors?: string[];
  isEnableEcom?: boolean;
  status?: "active" | "inactive";
  isVatEnabled?: boolean;
  vatPercentage?: number;
  barcode?: string | null;
  isPromo?: boolean;
  promoEndsAt?: Date | string | null;
  variants?: Array<{
    id?: string;
    sku: string;
    barcode?: string | null;
    size: string;
    color: string;
    costPrice?: number | null;
    salesPrice?: number | null;
    wholesalePrice?: number | null;
    wholesaleDiscountAmount?: number | null;
    initialStock?: number;
    image?: string | null;
  }>;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        item: null,
      };
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "master.items", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to edit items",
        item: null,
      };
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: input.id },
      select: { 
        id: true, 
        name: true, 
        description: true, 
        itemType: true,
        categoryId: true,
        brandId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        wholesalePrice: true,
        wholesaleDiscountAmount: true,
        discount: true,
        trackInventory: true,
        images: true,
        sizes: true,
        colors: true,
        isEnableEcom: true,
        featuredImage: true,
        status: true,
        barcode: true,
        slug: true,
      },
    });

    if (!existingItem) {
      return {
        success: false,
        error: "Item not found",
        item: null,
      };
    }

    // Validate: salesPrice required if itemType = READY_PRODUCT or RETAIL
    if ((input.itemType === "READY_PRODUCT" || input.itemType === "RETAIL") && (!input.salesPrice || input.salesPrice <= 0)) {
      return {
        success: false,
        error: "Sales price is required for Ready Products and Retail items",
        item: null,
      };
    }

    // Validate: categoryId exists (if provided)
    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        return {
          success: false,
          error: "Category not found",
          item: null,
        };
      }
    }
    // Validate: subCategoryId exists (if provided)
    if (input.subCategoryId) {
      const subCategory = await prisma.category.findUnique({
        where: { id: input.subCategoryId },
      });
      if (!subCategory) {
        return {
          success: false,
          error: "Sub-category not found",
          item: null,
        };
      }
      if (input.categoryId && subCategory.parentId !== input.categoryId) {
        return {
          success: false,
          error: "Selected sub-category does not belong to the selected category",
          item: null,
        };
      }
    }

    // Validate: brandId exists (if provided)
    if (input.brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: input.brandId },
      });
      if (!brand) {
        return {
          success: false,
          error: "Brand not found",
          item: null,
        };
      }
    }

    // Validate: unitId exists
    const unit = await prisma.unit.findUnique({
      where: { id: input.unitId },
    });
    if (!unit) {
      return {
        success: false,
        error: "Unit not found",
        item: null,
      };
    }

    // Handle item base barcode
    let finalBarcode = input.barcode;
    if (!finalBarcode) {
      finalBarcode = existingItem.barcode || await generateUniqueItemBarcode();
    } else if (finalBarcode !== existingItem.barcode) {
      // Check collision in Item table
      const collisionItem = await prisma.item.findFirst({
        where: { barcode: finalBarcode, id: { not: input.id } },
        select: { id: true }
      });
      // Also check variant barcodes to avoid cross-collision
      const collisionVariant = await prisma.productVariant.findFirst({
        where: { barcode: finalBarcode },
        select: { id: true }
      });
      if (collisionItem || collisionVariant) {
        return {
          success: false,
          error: `Barcode '${finalBarcode}' is already assigned to another item or variant.`,
          item: null,
        };
      }
    }

    // Generate unique slug from name
    const slug = await generateUniqueSlug(input.name, input.id);

    // Prepare update data
    const updateData: Prisma.ItemUpdateInput = {
      name: input.name,
      slug,
      description: input.description || null,
      itemType: input.itemType,
      category: input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true },
      subCategory: input.subCategoryId ? { connect: { id: input.subCategoryId } } : { disconnect: true },
      brand: input.brandId ? { connect: { id: input.brandId } } : { disconnect: true },
      unit: { connect: { id: input.unitId } },
      costPrice: input.costPrice || 0,
      salesPrice: input.salesPrice || 0,
      wholesalePrice: input.wholesalePrice || 0,
      wholesaleDiscountAmount: input.wholesaleDiscountAmount || 0,
      discount: input.discount || 0,
      trackInventory: input.trackInventory ?? false,
      images: input.images || [],
      featuredImage: input.featuredImage || null,
      sizes: input.sizes ? { set: input.sizes } : { set: [] },
      colors: input.colors ? { set: input.colors } : { set: [] },
      isEnableEcom: input.isEnableEcom ?? false,
      isVatEnabled: input.isVatEnabled ?? false,
      vatPercentage: input.vatPercentage ?? 0,
      barcode: finalBarcode,
      isPromo: input.isPromo ?? false,
      promoEndsAt: input.promoEndsAt ? new Date(input.promoEndsAt) : null,
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Process variants updates/creations
    if (input.variants) {
      // 1. Delete variants that are no longer present
      const activeVariantIds = input.variants.map(v => v.id).filter(Boolean) as string[];
      await prisma.productVariant.deleteMany({
        where: {
          itemId: input.id,
          id: { notIn: activeVariantIds }
        }
      });

      // 2. Upsert remaining variants
      const warehouse = await prisma.warehouse.findFirst({
        where: { isTrash: false, status: "active" },
        select: { id: true }
      });

      for (const v of input.variants) {
        if (v.id) {
          // Update
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              sku: v.sku,
              barcode: v.barcode || await generateUniqueBarcode(),
              size: v.size,
              color: v.color,
              costPrice: v.costPrice || 0,
              salesPrice: v.salesPrice || 0,
              wholesalePrice: v.wholesalePrice || 0,
              wholesaleDiscountAmount: v.wholesaleDiscountAmount || 0,
              image: v.image || null,
            }
          });
        } else {
          // Create
          const createdVar = await prisma.productVariant.create({
            data: {
              sku: v.sku,
              barcode: v.barcode || await generateUniqueBarcode(),
              size: v.size,
              color: v.color,
              costPrice: v.costPrice || 0,
              salesPrice: v.salesPrice || 0,
              wholesalePrice: v.wholesalePrice || 0,
              wholesaleDiscountAmount: v.wholesaleDiscountAmount || 0,
              image: v.image || null,
              itemId: input.id,
            }
          });
          
          // Seed stock
          if (v.initialStock && v.initialStock > 0 && warehouse && input.trackInventory) {
            await prisma.stock.create({
              data: {
                variantId: createdVar.id,
                warehouseId: warehouse.id,
                quantity: v.initialStock,
              }
            });
          }
        }
      }
    }

    // Debug logging
    console.log("Updating Item ID:", input.id);
    console.log("Input Sizes:", input.sizes);
    console.log("Input Colors:", input.colors);

    // Update item
    const item = await prisma.item.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        code: true,
        slug: true,
        name: true,
        description: true,
        itemType: true,
        categoryId: true,
        brandId: true,
        unitId: true,
        costPrice: true,
        salesPrice: true,
        wholesalePrice: true,
        wholesaleDiscountAmount: true,
        discount: true,
        trackInventory: true,
        images: true,
        sizes: true,
        colors: true,
        isEnableEcom: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        subCategoryId: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            symbol: true,
            details: true,
          },
        },
      },
    });

    // Log item update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingItem.name) changes.push("name");
    if (slug !== existingItem.slug) changes.push("slug");
    if (input.description !== existingItem.description) changes.push("description");
    if (input.itemType !== existingItem.itemType) changes.push("itemType");
    if (input.categoryId !== existingItem.categoryId) changes.push("categoryId");
    if (input.brandId !== existingItem.brandId) changes.push("brandId");
    if (input.unitId !== existingItem.unitId) changes.push("unitId");
    if (Number(input.costPrice) !== Number(existingItem.costPrice)) changes.push("costPrice");
    if ((input.salesPrice || null) !== (existingItem.salesPrice || null)) changes.push("salesPrice");
    if ((input.trackInventory ?? false) !== existingItem.trackInventory) changes.push("trackInventory");
    if (JSON.stringify(input.images || []) !== JSON.stringify(existingItem.images || [])) changes.push("images");
    if (JSON.stringify(input.sizes || []) !== JSON.stringify(existingItem.sizes || [])) changes.push("sizes");
    if (JSON.stringify(input.colors || []) !== JSON.stringify(existingItem.colors || [])) changes.push("colors");
    if (input.status !== undefined && input.status !== existingItem.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Item",
      item.id,
      changes,
      item.name,
      { 
        code: item.code,
        name: item.name,
        itemType: item.itemType,
        changes,
      }
    );

    // Notify user
    await notifyItemUpdated(
      session.user.id,
      "Item",
      item.name,
      changes
    );

    // Revalidate items pages
    revalidateBothPaths("master/items");
    revalidateBothPaths(`master/items/${item.id}`);
    revalidateBothPaths(`master/items/${item.id}/edit`);

    return {
      success: true,
      item,
    };
  } catch (error) {
    console.error("updateItem error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update item",
      item: null,
    };
  }
}

/**
 * Delete an item (moves to trash)
 */
export async function deleteItem(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canDelete = await hasPermission(session.user.id, "master.items", "move-to-trash");
    if (!canDelete) {
      return {
        success: false,
        error: "You do not have permission to delete items",
      };
    }

    // Get item info before moving to trash for logging
    const itemToDelete = await prisma.item.findUnique({
      where: { id: itemId },
      select: { name: true, code: true },
    });

    if (!itemToDelete) {
      return {
        success: false,
        error: "Item not found",
      };
    }

    // Move item to trash (soft delete)
    await prisma.item.update({
      where: { id: itemId },
      data: { 
        isTrash: true,
        status: "trash",
      },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Item",
      itemId,
      itemToDelete.name,
      { name: itemToDelete.name, code: itemToDelete.code }
    );

    // Notify user
    await notifyItemDeleted(
      session.user.id,
      "Item",
      itemToDelete.name
    );

    // Revalidate items page
    revalidateBothPaths("master/items");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteItem error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}

/**
 * Delete items permanently
 */
export async function deleteItemsPermanently(itemIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canDeletePermanently = await hasPermission(session.user.id, "master.items", "delete-permanently");
    if (!canDeletePermanently) {
      return {
        success: false,
        error: "You do not have permission to permanently delete items",
      };
    }

    if (itemIds.length === 0) {
      return {
        success: false,
        error: "No items selected",
      };
    }

    // Get items for logging and check stock
    const itemsToDelete = await prisma.item.findMany({
      where: {
        id: { in: itemIds },
        isTrash: true, // Only allow deleting items that are in trash
      },
      select: { 
        id: true, 
        name: true, 
        code: true,
        stocks: {
          select: { quantity: true }
        },
        variants: {
          select: {
            stocks: {
              select: { quantity: true }
            }
          }
        }
      },
    });

    // Validate that none of them have stock > 0
    const itemsWithStock = itemsToDelete.filter(item => {
      let totalStock = 0;
      item.stocks.forEach(s => {
        totalStock += Number(s.quantity);
      });
      item.variants.forEach(v => {
        v.stocks.forEach(s => {
          totalStock += Number(s.quantity);
        });
      });
      return totalStock > 0;
    });

    if (itemsWithStock.length > 0) {
      const names = itemsWithStock.map(i => i.name).join(", ");
      return {
        success: false,
        error: `Cannot permanently delete items with existing stock: ${names}`,
      };
    }

    // Delete items permanently
    await prisma.item.deleteMany({
      where: {
        id: { in: itemIds },
        isTrash: true, // Only allow deleting items that are in trash
      },
    });

    // Log deletions
    for (const item of itemsToDelete) {
      await logItemDeleted(
        session.user.id,
        "Item",
        item.id,
        item.name,
        { name: item.name, code: item.code, permanent: true }
      );
    }

    // Revalidate items page
    revalidateBothPaths("master/items");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteItemsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete items",
    };
  }
}

/**
 * Bulk update item status
 */
export async function bulkUpdateItemStatus(
  itemIds: string[],
  status: "active" | "inactive" | "trash"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Permission check
    const canEdit = await hasPermission(session.user.id, "master.items", "edit");
    if (!canEdit) {
      return {
        success: false,
        error: "You do not have permission to update items",
      };
    }

    if (itemIds.length === 0) {
      return {
        success: false,
        error: "No items selected",
      };
    }

    // Update items
    const updateData: Prisma.ItemUpdateManyMutationInput = {
      status,
    };

    if (status === "trash") {
      updateData.isTrash = true;
    } else {
      updateData.isTrash = false;
    }

    await prisma.item.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: updateData,
    });

    // Revalidate items page
    revalidateBothPaths("master/items");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateItemStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update items",
    };
  }
}

/**
 * Get variants for a specific item
 */
export async function getItemVariants(itemId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        variants: [],
      };
    }

    const [item, variants] = await Promise.all([
      prisma.item.findUnique({
        where: { id: itemId },
        select: { colors: true, sizes: true },
      }),
      prisma.productVariant.findMany({
        where: { itemId },
        select: {
          id: true,
          sku: true,
          barcode: true,
          size: true,
          color: true,
          costPrice: true,
          salesPrice: true,
          wholesalePrice: true,
          wholesaleDiscountAmount: true,
          image: true,
        },
        orderBy: { sku: 'asc' },
      }),
    ]);

    const serializedVariants = variants.map((v) => ({
      ...v,
      costPrice: v.costPrice ? Number(v.costPrice) : null,
      salesPrice: v.salesPrice ? Number(v.salesPrice) : null,
      wholesalePrice: v.wholesalePrice ? Number(v.wholesalePrice) : null,
      wholesaleDiscountAmount: v.wholesaleDiscountAmount ? Number(v.wholesaleDiscountAmount) : null,
    }));

    // Sort variants: grouped by color first (in the order defined in item.colors),
    // and then by size (in the order defined in item.sizes).
    const colorOrder = item?.colors || [];
    const sizeOrder = item?.sizes || [];

    serializedVariants.sort((a, b) => {
      const colorA = a.color || "";
      const colorB = b.color || "";
      const colorIndexA = colorOrder.indexOf(colorA);
      const colorIndexB = colorOrder.indexOf(colorB);

      const cA = colorIndexA !== -1 ? colorIndexA : 9999;
      const cB = colorIndexB !== -1 ? colorIndexB : 9999;

      if (cA !== cB) {
        return cA - cB;
      }

      if (cA === 9999 && colorA !== colorB) {
        return colorA.localeCompare(colorB);
      }

      const sizeA = a.size || "";
      const sizeB = b.size || "";
      const sizeIndexA = sizeOrder.indexOf(sizeA);
      const sizeIndexB = sizeOrder.indexOf(sizeB);

      const sA = sizeIndexA !== -1 ? sizeIndexA : 9999;
      const sB = sizeIndexB !== -1 ? sizeIndexB : 9999;

      if (sA !== sB) {
        return sA - sB;
      }

      if (sA === 9999 && sizeA !== sizeB) {
        return sizeA.localeCompare(sizeB, undefined, { numeric: true });
      }

      return (a.sku || "").localeCompare(b.sku || "");
    });

    return {
      success: true,
      variants: serializedVariants,
    };
  } catch (error) {
    console.error("getItemVariants error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch item variants",
      variants: [],
    };
  }
}

/**
 * Toggle e-commerce enabled state for an item
 */
export async function toggleItemEcom(itemId: string, enabled: boolean) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update item
    const item = await prisma.item.update({
      where: { id: itemId },
      data: { isEnableEcom: enabled },
      select: { id: true, name: true, isEnableEcom: true }
    });

    // Log the update
    await logItemUpdated(
      session.user.id,
      "Item",
      item.id,
      ["isEnableEcom"],
      item.name,
      { name: item.name, isEnableEcom: item.isEnableEcom, changes: ["isEnableEcom"] }
    );

    // Revalidate paths
    revalidateBothPaths("master/items");
    revalidateBothPaths(`master/items/${item.id}`);

    return { success: true, item };
  } catch (error) {
    console.error("toggleItemEcom error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle e-commerce status",
    };
  }
}

/**
 * Get all items matching filters for export (no pagination limit)
 */
export async function getAllItemsForExport(
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  itemType?: ItemType | "all",
  itemIds?: string[]
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", items: [] };
    }

    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return { success: false, error: "You do not have permission to view items", items: [] };
    }

    const where: Prisma.ItemWhereInput = {};

    if (itemIds && itemIds.length > 0) {
      where.id = { in: itemIds };
    } else {
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (status === "trash") {
        where.isTrash = true;
        where.status = "trash";
      } else if (status === "active") {
        where.isTrash = false;
        where.status = "active";
      } else if (status === "inactive") {
        where.isTrash = false;
        where.status = "inactive";
      } else if (status === "all") {
        where.isTrash = false;
      }

      if (itemType && itemType !== ("all" as any)) {
        where.itemType = itemType as ItemType;
      }
    }


    const items = await prisma.item.findMany({
      where,
      select: {
        id: true,
        code: true,
        slug: true,
        name: true,
        description: true,
        itemType: true,
        costPrice: true,
        salesPrice: true,
        wholesalePrice: true,
        wholesaleDiscountAmount: true,
        discount: true,
        trackInventory: true,
        isEnableEcom: true,
        isVatEnabled: true,
        vatPercentage: true,
        barcode: true,
        status: true,
        createdAt: true,
        category: { select: { name: true } },
        subCategory: { select: { name: true } },
        brand: { select: { name: true } },
        unit: { select: { symbol: true, details: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const serializedItems = items.map((item) => ({
      ...item,
      costPrice: Number(item.costPrice),
      salesPrice: item.salesPrice ? Number(item.salesPrice) : null,
      wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice) : null,
      wholesaleDiscountAmount: item.wholesaleDiscountAmount ? Number(item.wholesaleDiscountAmount) : null,
      discount: item.discount ? Number(item.discount) : null,
      vatPercentage: item.vatPercentage ? Number(item.vatPercentage) : 0,
    }));

    return { success: true, items: serializedItems };
  } catch (error) {
    console.error("getAllItemsForExport error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch items for export",
      items: [],
    };
  }
}

/**
 * Get Item Stock Ledger with running stock balance, transactions, and totals
 */
export async function getItemLedger(
  itemId: string,
  startDate?: string,
  endDate?: string,
  warehouseId?: string,
  variantId?: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canView = await hasPermission(session.user.id, "master.items", "view");
    if (!canView) {
      return { success: false, error: "Permission denied" };
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        unit: { select: { id: true, symbol: true, details: true } },
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            stocks: {
              select: {
                quantity: true,
                warehouseId: true,
              },
            },
          },
        },
        stocks: {
          select: {
            quantity: true,
            warehouseId: true,
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Item not found" };
    }

    const dateCondition: any = {};
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      dateCondition.gte = sDate;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      dateCondition.lte = eDate;
    }

    // Opening stock prior to start date
    let openingStock = 0;
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      const priorWhere: any = {
        createdAt: { lt: sDate },
      };

      if (variantId && variantId !== "all") {
        if (variantId === "base") {
          priorWhere.itemId = itemId;
          priorWhere.variantId = null;
        } else {
          priorWhere.variantId = variantId;
        }
      } else {
        priorWhere.OR = [
          { itemId },
          { variant: { itemId } },
        ];
      }

      if (warehouseId && warehouseId !== "all") {
        priorWhere.warehouseId = warehouseId;
      }
      const priorEntries = await prisma.stockLedger.findMany({
        where: priorWhere,
        select: { transactionType: true, quantity: true },
      });
      for (const entry of priorEntries) {
        const qty = Number(entry.quantity);
        if (["IN", "PURCHASE", "PRODUCTION", "ADJUSTMENT"].includes(entry.transactionType) && qty > 0) {
          openingStock += Math.abs(qty);
        } else if (["OUT", "SALE", "DAMAGE", "PURCHASE_RETURN"].includes(entry.transactionType) || qty < 0) {
          openingStock -= Math.abs(qty);
        }
      }
    }

    const ledgerWhere: any = {};
    if (variantId && variantId !== "all") {
      if (variantId === "base") {
        ledgerWhere.itemId = itemId;
        ledgerWhere.variantId = null;
      } else {
        ledgerWhere.variantId = variantId;
      }
    } else {
      ledgerWhere.OR = [
        { itemId },
        { variant: { itemId } },
      ];
    }

    if (warehouseId && warehouseId !== "all") {
      ledgerWhere.warehouseId = warehouseId;
    }
    if (Object.keys(dateCondition).length > 0) {
      ledgerWhere.createdAt = dateCondition;
    }

    const rawEntries = await prisma.stockLedger.findMany({
      where: ledgerWhere,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        creator: { select: { id: true, name: true } },
        variant: { select: { id: true, sku: true, size: true, color: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Collect reference IDs to batch fetch exact document numbers
    const grnIds = new Set<string>();
    const tpnIds = new Set<string>();
    const purchaseIds = new Set<string>();
    const saleIds = new Set<string>();
    const rtvIds = new Set<string>();
    const prodIds = new Set<string>();
    const adjIds = new Set<string>();
    const damageIds = new Set<string>();

    // Map of txId → referenceType for fallback party building
    const txRefTypeMap = new Map<string, string>();
    rawEntries.forEach((tx) => {
      const refId = tx.referenceId;
      if (!refId) return;
      const refType = (tx.referenceType || "").toUpperCase();
      txRefTypeMap.set(tx.id, refType);

      // Use exact equality to avoid PURCHASE_RETURN being miscategorised as PURCHASE
      if (refType === "GRN") grnIds.add(refId);
      else if (refType === "TPN" || refType === "TRANSFER") tpnIds.add(refId);
      else if (refType === "PURCHASE" || refType === "PO") purchaseIds.add(refId);
      else if (refType === "SALE" || refType === "SO" || refType === "POS" || refType === "SALE_VOID") saleIds.add(refId);
      else if (refType === "RTV" || refType === "PURCHASE_RETURN") rtvIds.add(refId);
      else if (refType === "PROD" || refType === "PRODUCTION" || tx.transactionType === "PRODUCTION") prodIds.add(refId);
      else if (refType === "DAMAGE" || tx.transactionType === "DAMAGE") damageIds.add(refId);
    });

    const [grns, tpns, purchases, sales, rtvs, prods, adjs, damages] = await Promise.all([
      grnIds.size > 0
        ? prisma.gRN.findMany({
            where: { id: { in: Array.from(grnIds) } },
            select: {
              id: true,
              grnNumber: true,
              warehouse: { select: { id: true, name: true, code: true } },
              purchase: { select: { id: true, supplier: { select: { id: true, name: true } } } },
              tpn: {
                select: {
                  id: true,
                  sourceWarehouse: { select: { id: true, name: true } },
                  destinationWarehouse: { select: { id: true, name: true } },
                },
              },
            },
          })
        : [],
      tpnIds.size > 0
        ? prisma.transferPurchaseNote.findMany({
            where: { id: { in: Array.from(tpnIds) } },
            select: {
              id: true,
              tpnNumber: true,
              sourceWarehouse: { select: { id: true, name: true, code: true } },
              destinationWarehouse: { select: { id: true, name: true, code: true } },
            },
          })
        : [],
      purchaseIds.size > 0
        ? prisma.purchase.findMany({
            where: { id: { in: Array.from(purchaseIds) } },
            select: {
              id: true,
              purchaseNumber: true,
              supplier: { select: { id: true, name: true } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })
        : [],
      saleIds.size > 0
        ? prisma.sale.findMany({
            where: { id: { in: Array.from(saleIds) } },
            select: {
              id: true,
              saleNumber: true,
              client: { select: { id: true, name: true } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })
        : [],
      rtvIds.size > 0
        ? prisma.returnToVendor.findMany({
            where: { id: { in: Array.from(rtvIds) } },
            select: {
              id: true,
              rtvNumber: true,
              supplier: { select: { id: true, name: true } },
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })
        : [],
      prodIds.size > 0
        ? prisma.productionOrder.findMany({
            where: { id: { in: Array.from(prodIds) } },
            select: {
              id: true,
              code: true,
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })
        : [],
      adjIds.size > 0
        ? prisma.inventoryAdjustment.findMany({
            where: { id: { in: Array.from(adjIds) } },
            select: {
              id: true,
              adjustmentNumber: true,
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })
        : [],
      damageIds.size > 0
        ? prisma.inventoryDamage.findMany({
            where: { id: { in: Array.from(damageIds) } },
            select: {
              id: true,
              damageNumber: true,
              warehouse: { select: { id: true, name: true, code: true } },
            },
          })
        : [],
    ]);

    const grnMap = new Map(grns.map((g) => [g.id, g]));
    const tpnMap = new Map(tpns.map((t) => [t.id, t]));
    const purchaseMap = new Map(purchases.map((p) => [p.id, p]));
    const saleMap = new Map(sales.map((s) => [s.id, s]));
    const rtvMap = new Map(rtvs.map((r) => [r.id, r]));
    const prodMap = new Map(prods.map((p) => [p.id, p]));
    const adjMap = new Map(adjs.map((a) => [a.id, a]));
    const damageMap = new Map(damages.map((d) => [d.id, d]));

    let opening = openingStock;
    let totalInQty = 0;
    let totalOutQty = 0;
    let totalAmount = 0;
    let totalProfitLoss = 0;

    const ledger: any[] = [];

    if (startDate && openingStock !== 0) {
      ledger.push({
        sl: 1,
        date: startDate,
        type: "Opening Stock",
        invoiceNo: "N/A",
        invoiceUrl: null,
        party: {
          type: "warehouse",
          label: "Opening Balance",
          link: null,
        },
        opening: 0,
        inQty: opening > 0 ? opening : 0,
        outQty: opening < 0 ? Math.abs(opening) : 0,
        closing: opening,
        rate: Number(item.costPrice || 0),
        total: Math.abs(opening) * Number(item.costPrice || 0),
        details: `${item.code} | Opening Balance`,
        variant: null,
      });
      if (opening > 0) totalInQty += opening;
      else totalOutQty += Math.abs(opening);
    }

    rawEntries.forEach((tx) => {
      const qty = Number(tx.quantity);
      let inQty = 0;
      let outQty = 0;

      const txType = tx.transactionType as string;
      const refType = (tx.referenceType || "").toUpperCase();
      const refId = tx.referenceId || "";
      let typeLabel = txType;

      if (txType === "IN") {
        inQty = Math.abs(qty);
        typeLabel = refType.includes("PURCHASE") || refType.includes("GRN") ? "Purchase / GRN" : refType.includes("PROD") ? "Production" : "Opening Stock";
      } else if (txType === "OUT") {
        outQty = Math.abs(qty);
        typeLabel = refType.includes("SALE") ? "Sale" : refType.includes("DAMAGE") ? "Damage" : "Out / Transfer";
      } else if (txType === "PRODUCTION") {
        inQty = Math.abs(qty);
        typeLabel = "Production";
      } else if (txType === "PURCHASE_RETURN") {
        outQty = Math.abs(qty);
        typeLabel = "Purchase Return";
      } else if (txType === "DAMAGE") {
        outQty = Math.abs(qty);
        typeLabel = "Damage";
      } else if (txType === "ADJUSTMENT") {
        if (qty >= 0) {
          inQty = qty;
          typeLabel = "Adjustment (+)";
        } else {
          outQty = Math.abs(qty);
          typeLabel = "Adjustment (-)";
        }
      } else if (txType === "TRANSFER") {
        if (qty >= 0) {
          inQty = qty;
          typeLabel = "Transfer In";
        } else {
          outQty = Math.abs(qty);
          typeLabel = "Transfer Out";
        }
      } else {
        if (qty >= 0) inQty = qty;
        else outQty = Math.abs(qty);
      }

      const rowOpening = ledger.length > 0 ? ledger[ledger.length - 1].closing : opening;
      const rowClosing = rowOpening + inQty - outQty;

      totalInQty += inQty;
      totalOutQty += outQty;

      const isSale = refType.includes("SALE") || txType === "OUT";
      const rate = tx.rate
        ? Number(tx.rate)
        : isSale
        ? Number(item.salesPrice || item.costPrice || 0)
        : Number(item.costPrice || 0);

      const total = (inQty || outQty) * rate;
      totalAmount += total;

      let profitLoss = 0;
      if (isSale && outQty > 0) {
        const cost = Number(item.costPrice || 0);
        profitLoss = (rate - cost) * outQty;
        totalProfitLoss += profitLoss;
      }

      // Construct exact invoiceNo and Party / Warehouse link details:
      let invoiceNo = "N/A";
      let invoiceUrl: string | null = null;

      let party: {
        type: "client" | "supplier" | "warehouse_transfer" | "warehouse";
        label: string;
        link: string | null;
        fromWarehouse?: string | null;
        toWarehouse?: string | null;
      } = {
        type: "warehouse",
        label: tx.warehouse ? tx.warehouse.name : "—",
        link: null,
      };

      const txRefType = (tx.referenceType || "").toUpperCase();
      if (txRefType === "ADJUSTMENT" || tx.transactionType === "ADJUSTMENT") {
        party = {
          type: "warehouse",
          label: tx.warehouse ? tx.warehouse.name : "—",
          link: null,
        };
      }

      if (refId) {
        if (grnMap.has(refId)) {
          const g = grnMap.get(refId)!;
          invoiceNo = g.grnNumber;
          invoiceUrl = `/dashboard/procurements/grn/${refId}`;
          if (g.purchase?.supplier) {
            party = {
              type: "supplier",
              label: g.purchase.supplier.name || "Supplier",
              link: `/dashboard/suppliers/details?id=${g.purchase.supplier.id}`,
            };
          } else if (g.tpn) {
            party = {
              type: "warehouse_transfer",
              label: g.tpn.destinationWarehouse.name,
              link: `/dashboard/procurements/tpn/${g.tpn.id}`,
              fromWarehouse: g.tpn.sourceWarehouse.name,
              toWarehouse: g.tpn.destinationWarehouse.name,
            };
          } else if (g.warehouse) {
            party = {
              type: "warehouse",
              label: g.warehouse.name,
              link: null,
            };
          }
        } else if (tpnMap.has(refId)) {
          const t = tpnMap.get(refId)!;
          invoiceNo = t.tpnNumber;
          invoiceUrl = `/dashboard/procurements/tpn/${refId}`;
          party = {
            type: "warehouse_transfer",
            label: t.sourceWarehouse.name,
            link: `/dashboard/procurements/tpn/${refId}`,
            fromWarehouse: t.sourceWarehouse.name,
            toWarehouse: t.destinationWarehouse.name,
          };
        } else if (purchaseMap.has(refId)) {
          const p = purchaseMap.get(refId)!;
          invoiceNo = p.purchaseNumber;
          invoiceUrl = `/dashboard/procurements/purchases/${refId}`;
          if (p.supplier) {
            party = {
              type: "supplier",
              label: p.supplier.name || "Supplier",
              link: `/dashboard/suppliers/details?id=${p.supplier.id}`,
            };
          }
        } else if (saleMap.has(refId)) {
          const s = saleMap.get(refId)!;
          invoiceNo = s.saleNumber;
          invoiceUrl = `/dashboard/sales/${refId}`;
          if (s.client) {
            party = {
              type: "client",
              label: s.client.name || "Client",
              link: `/dashboard/clients/details?id=${s.client.id}`,
            };
          }
        } else if (rtvMap.has(refId)) {
          const r = rtvMap.get(refId)!;
          invoiceNo = r.rtvNumber;
          invoiceUrl = `/dashboard/procurements/rtv/${refId}`;
          if (r.supplier) {
            party = {
              type: "supplier",
              label: r.supplier.name || "Supplier",
              link: `/dashboard/suppliers/details?id=${r.supplier.id}`,
            };
          }
        } else if (prodMap.has(refId)) {
          const pr = prodMap.get(refId)!;
          invoiceNo = pr.code;
          invoiceUrl = `/dashboard/production/orders/${refId}`;
          if (pr.warehouse) {
            party = {
              type: "warehouse",
              label: pr.warehouse.name,
              link: null,
            };
          }
        } else if (damageMap.has(refId)) {
          const d = damageMap.get(refId)!;
          invoiceNo = d.damageNumber;
          invoiceUrl = `/dashboard/inventory/damage`;
          if (d.warehouse) {
            party = {
              type: "warehouse",
              label: d.warehouse.name,
              link: null,
            };
          }
        } else {
          invoiceNo = refId;
          if (refType === "GRN") invoiceUrl = `/dashboard/procurements/grn/${refId}`;
          else if (refType === "TPN" || refType === "TRANSFER") invoiceUrl = `/dashboard/procurements/tpn/${refId}`;
          else if (refType === "PURCHASE" || refType === "PO") invoiceUrl = `/dashboard/procurements/purchases/${refId}`;
          else if (refType === "SALE" || refType === "SO" || refType === "POS") invoiceUrl = `/dashboard/sales/${refId}`;
          else if (refType === "RTV" || refType === "PURCHASE_RETURN") invoiceUrl = `/dashboard/procurements/rtv/${refId}`;
          else if (refType === "PROD" || refType === "PRODUCTION" || txType === "PRODUCTION") invoiceUrl = `/dashboard/production/orders/${refId}`;
          else if (refType === "DAMAGE" || txType === "DAMAGE") invoiceUrl = `/dashboard/inventory/damage`;
        }
      }

      ledger.push({
        sl: ledger.length + 1,
        date: tx.createdAt ? new Date(tx.createdAt).toISOString().split("T")[0] : "",
        type: typeLabel,
        invoiceNo,
        invoiceUrl,
        party,
        opening: rowOpening,
        inQty,
        outQty,
        closing: rowClosing,
        rate,
        total,
        profitLoss,
        details: tx.notes || `${item.code} | ${typeLabel}`,
        warehouse: tx.warehouse ? { name: tx.warehouse.name, code: tx.warehouse.code } : null,
        variant: tx.variant
          ? {
              id: tx.variant.id,
              sku: tx.variant.sku,
              size: tx.variant.size,
              color: tx.variant.color,
            }
          : null,
      });
    });

    const finalStock = ledger.length > 0 ? ledger[ledger.length - 1].closing : openingStock;

    const formattedVariants = (item.variants || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
    }));

    return {
      success: true,
      item: {
        id: item.id,
        code: item.code,
        name: item.name,
        unitSymbol: item.unit?.symbol || "Pcs",
        unitDetails: item.unit?.details || "",
        categoryName: item.category?.name || "-",
        subCategoryName: item.subCategory?.name || "-",
        brandName: item.brand?.name || "-",
        costPrice: Number(item.costPrice || 0),
        salesPrice: item.salesPrice ? Number(item.salesPrice) : 0,
        wholesalePrice: item.wholesalePrice ? Number(item.wholesalePrice) : 0,
        currentStockTotal: finalStock,
      },
      variants: formattedVariants,
      ledger,
      summary: {
        totalInQty,
        totalOutQty,
        currentStock: finalStock,
        totalAmount,
        totalProfitLoss,
        totalEntries: ledger.length,
      },
    };
  } catch (error) {
    console.error("getItemLedger error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch item ledger",
    };
  }
}



