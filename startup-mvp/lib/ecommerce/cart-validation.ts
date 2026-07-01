import { prisma } from "@/lib/prisma";

export interface CartInputItem {
  itemId: string;
  variantId?: string | null;
  quantity: number;
}

export interface ValidatedCartItem {
  itemId: string;
  variantId: string | null;
  name: string;
  code: string;
  variant: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
  } | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  isPurchasable: boolean;
  messages: string[];
}

export interface CartValidationResult {
  isValid: boolean;
  items: ValidatedCartItem[];
  summary: {
    subTotal: number;
    totalQuantity: number;
    invalidItemCount: number;
    outOfStockItemCount: number;
  };
}

export interface StockCheckInput {
  itemId: string;
  variantId?: string | null;
  quantity?: number;
}

export interface StockCheckResult {
  success: boolean;
  itemId: string;
  variantId: string | null;
  requestedQuantity: number;
  availableStock: number;
  isAvailable: boolean;
  outOfStock: boolean;
}

/**
 * Validates a batch of cart items against current catalog status, pricing, and stock.
 */
export async function validateCartItems(inputItems: CartInputItem[]): Promise<CartValidationResult> {
  const validatedItems: ValidatedCartItem[] = [];
  let subTotal = 0;
  let totalQuantity = 0;
  let invalidItemCount = 0;
  let outOfStockItemCount = 0;

  for (const input of inputItems) {
    const qty = Math.max(1, Math.floor(input.quantity)); // Integer garment quantity
    totalQuantity += qty;

    const messages: string[] = [];
    
    // 1. Fetch Item with visibility filters
    const item = await prisma.item.findFirst({
      where: {
        id: input.itemId,
        isEnableEcom: true,
        isTrash: false,
        status: "active",
        OR: [
          { categoryId: null },
          { category: { status: "active" } }
        ]
      },
      include: {
        stocks: true,
        variants: {
          include: {
            stocks: true
          }
        }
      }
    });

    if (!item) {
      invalidItemCount++;
      outOfStockItemCount++;
      validatedItems.push({
        itemId: input.itemId,
        variantId: input.variantId || null,
        name: "Unknown Product",
        code: "N/A",
        variant: null,
        quantity: qty,
        unitPrice: 0,
        lineTotal: 0,
        availableStock: 0,
        isAvailable: false,
        isPurchasable: false,
        messages: ["Product not found or not available for e-commerce"]
      });
      continue;
    }

    // 2. Validate Variant if provided
    let matchedVariant: any = null;
    if (input.variantId) {
      matchedVariant = item.variants.find(v => v.id === input.variantId);
      if (!matchedVariant) {
        invalidItemCount++;
        outOfStockItemCount++;
        validatedItems.push({
          itemId: item.id,
          variantId: input.variantId,
          name: item.name,
          code: item.code,
          variant: null,
          quantity: qty,
          unitPrice: 0,
          lineTotal: 0,
          availableStock: 0,
          isAvailable: false,
          isPurchasable: false,
          messages: ["Selected variant does not belong to this product"]
        });
        continue;
      }
    }

    // 3. Resolve Pricing
    let unitPrice = 0;
    if (matchedVariant) {
      unitPrice = matchedVariant.salesPrice !== null && matchedVariant.salesPrice !== undefined
        ? Number(matchedVariant.salesPrice)
        : Number(item.salesPrice);
    } else {
      unitPrice = Number(item.salesPrice);
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      messages.push("Product has invalid e-commerce pricing");
    }

    // 4. Calculate Stock
    let availableStock = 0;
    if (matchedVariant) {
      const varStocks = matchedVariant.stocks || [];
      availableStock = varStocks.reduce((sum: number, s: any) => sum + (Number(s.quantity) - Number(s.reservedQuantity)), 0);
    } else {
      // If the parent item has variants but the customer queried the parent directly,
      // aggregate the total stock of all variants. Otherwise, pull item-level stock.
      if (item.variants.length > 0) {
        availableStock = item.variants.reduce((sum: number, v: any) => {
          const varStocks = v.stocks || [];
          const vAvail = varStocks.reduce((vSum: number, s: any) => vSum + (Number(s.quantity) - Number(s.reservedQuantity)), 0);
          return sum + vAvail;
        }, 0);
      } else {
        const itemStocks = item.stocks || [];
        availableStock = itemStocks.reduce((sum: number, s: any) => sum + (Number(s.quantity) - Number(s.reservedQuantity)), 0);
      }
    }

    availableStock = Math.max(0, availableStock);

    // 5. Stock Verification & Track Inventory settings
    let isAvailable = true;
    if (item.trackInventory) {
      if (availableStock <= 0) {
        isAvailable = false;
        messages.push("Out of stock");
        outOfStockItemCount++;
      } else if (availableStock < qty) {
        isAvailable = false;
        messages.push(`Insufficient stock. Only ${availableStock} items available.`);
        outOfStockItemCount++;
      }
    } else {
      // trackInventory = false behaves as always available
      isAvailable = true;
    }

    const isPurchasable = isAvailable && unitPrice > 0;
    const lineTotal = isPurchasable ? unitPrice * qty : 0;

    if (isPurchasable) {
      subTotal += lineTotal;
    } else if (unitPrice > 0 && !messages.includes("Out of stock") && !messages.some(m => m.startsWith("Insufficient stock"))) {
      invalidItemCount++;
    }

    validatedItems.push({
      itemId: item.id,
      variantId: matchedVariant ? matchedVariant.id : null,
      name: item.name,
      code: item.code,
      variant: matchedVariant ? {
        id: matchedVariant.id,
        sku: matchedVariant.sku,
        size: matchedVariant.size || null,
        color: matchedVariant.color || null,
      } : null,
      quantity: qty,
      unitPrice,
      lineTotal,
      availableStock,
      isAvailable,
      isPurchasable,
      messages
    });
  }

  const isValid = invalidItemCount === 0 && outOfStockItemCount === 0;

  return {
    isValid,
    items: validatedItems,
    summary: {
      subTotal: Math.round(subTotal * 100) / 100, // Round decimal precision
      totalQuantity,
      invalidItemCount,
      outOfStockItemCount
    }
  };
}

/**
 * Checks stock availability for a single item/variant.
 */
export async function checkItemStock(input: StockCheckInput): Promise<StockCheckResult> {
  const qty = input.quantity !== undefined ? Math.max(1, Math.floor(input.quantity)) : 1;

  // 1. Fetch Item with visibility filters
  const item = await prisma.item.findFirst({
    where: {
      id: input.itemId,
      isEnableEcom: true,
      isTrash: false,
      status: "active",
      OR: [
        { categoryId: null },
        { category: { status: "active" } }
      ]
    },
    include: {
      stocks: true,
      variants: {
        include: {
          stocks: true
        }
      }
    }
  });

  if (!item) {
    return {
      success: false,
      itemId: input.itemId,
      variantId: input.variantId || null,
      requestedQuantity: qty,
      availableStock: 0,
      isAvailable: false,
      outOfStock: true
    };
  }

  // 2. Validate Variant if provided
  let matchedVariant: any = null;
  if (input.variantId) {
    matchedVariant = item.variants.find(v => v.id === input.variantId);
    if (!matchedVariant) {
      return {
        success: false,
        itemId: item.id,
        variantId: input.variantId,
        requestedQuantity: qty,
        availableStock: 0,
        isAvailable: false,
        outOfStock: true
      };
    }
  }

  // 3. Calculate Stock
  let availableStock = 0;
  if (matchedVariant) {
    const varStocks = matchedVariant.stocks || [];
    availableStock = varStocks.reduce((sum: number, s: any) => sum + (Number(s.quantity) - Number(s.reservedQuantity)), 0);
  } else {
    if (item.variants.length > 0) {
      availableStock = item.variants.reduce((sum: number, v: any) => {
        const varStocks = v.stocks || [];
        const vAvail = varStocks.reduce((vSum: number, s: any) => vSum + (Number(s.quantity) - Number(s.reservedQuantity)), 0);
        return sum + vAvail;
      }, 0);
    } else {
      const itemStocks = item.stocks || [];
      availableStock = itemStocks.reduce((sum: number, s: any) => sum + (Number(s.quantity) - Number(s.reservedQuantity)), 0);
    }
  }

  availableStock = Math.max(0, availableStock);

  // 4. Resolve Availability based on Inventory Tracking
  let isAvailable = true;
  if (item.trackInventory) {
    isAvailable = availableStock >= qty;
  } else {
    isAvailable = true;
  }

  return {
    success: true,
    itemId: item.id,
    variantId: matchedVariant ? matchedVariant.id : null,
    requestedQuantity: qty,
    availableStock,
    isAvailable,
    outOfStock: availableStock <= 0
  };
}
