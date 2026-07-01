import { prisma } from "@/lib/prisma";
import { validateCartItems, CartInputItem } from "./cart-validation";

export interface ValidateCouponInput {
  code: string;
  items?: CartInputItem[] | null;
  subTotal?: number | null;
  clientId?: string | null;
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  coupon?: {
    id: string;
    code: string;
    discountType: string;
    value: number;
  } | null;
  subTotal: number;
  subtotalSource: "server_calculated" | "client_provided";
  discountAmount: number;
  totalAfterDiscount: number;
  cart?: {
    isValid: boolean;
    items: any[];
  } | null;
}

/**
 * Validates e-commerce coupon codes, calculating subtotals dynamically if item lists are provided.
 */
export async function validateEcomCoupon(input: ValidateCouponInput): Promise<CouponValidationResult> {
  if (!input.code || !input.code.trim()) {
    return {
      valid: false,
      message: "No coupon code provided",
      subTotal: 0,
      subtotalSource: "client_provided",
      discountAmount: 0,
      totalAfterDiscount: 0
    };
  }

  const code = input.code.trim().toUpperCase();
  
  // 1. Determine subtotal source and check cart validity
  let subTotal = 0;
  let subtotalSource: "server_calculated" | "client_provided" = "client_provided";
  let cartResult: any = null;

  if (input.items && input.items.length > 0) {
    const cartVal = await validateCartItems(input.items);
    cartResult = {
      isValid: cartVal.isValid,
      items: cartVal.items
    };
    if (!cartVal.isValid) {
      return {
        valid: false,
        message: "Cart is not valid for coupon validation",
        subTotal: 0,
        subtotalSource: "server_calculated",
        discountAmount: 0,
        totalAfterDiscount: 0,
        cart: cartResult
      };
    }
    subTotal = cartVal.summary.subTotal;
    subtotalSource = "server_calculated";
  } else if (input.subTotal !== undefined && input.subTotal !== null) {
    subTotal = Math.max(0, input.subTotal);
    subtotalSource = "client_provided";
  } else {
    return {
      valid: false,
      message: "Either items array or subTotal must be provided",
      subTotal: 0,
      subtotalSource: "client_provided",
      discountAmount: 0,
      totalAfterDiscount: 0
    };
  }

  // 2. Fetch coupon from database
  const coupon = await prisma.coupon.findUnique({
    where: { code }
  });

  if (!coupon) {
    return {
      valid: false,
      message: "Invalid or expired coupon",
      subTotal,
      subtotalSource,
      discountAmount: 0,
      totalAfterDiscount: subTotal,
      cart: cartResult
    };
  }

  if (coupon.status !== "ACTIVE") {
    return {
      valid: false,
      message: "This coupon is no longer active",
      subTotal,
      subtotalSource,
      discountAmount: 0,
      totalAfterDiscount: subTotal,
      cart: cartResult
    };
  }

  if (coupon.expiryDate && coupon.expiryDate < new Date()) {
    return {
      valid: false,
      message: "This coupon has expired",
      subTotal,
      subtotalSource,
      discountAmount: 0,
      totalAfterDiscount: subTotal,
      cart: cartResult
    };
  }

  // 3. Check usage limit (global total uses)
  if (coupon.usageLimit !== null) {
    const totalUses = await prisma.sale.count({
      where: {
        couponId: coupon.id,
        status: { not: "CANCELLED" }
      }
    });
    if (totalUses >= coupon.usageLimit) {
      return {
        valid: false,
        message: "This coupon's total usage limit has been reached",
        subTotal,
        subtotalSource,
        discountAmount: 0,
        totalAfterDiscount: subTotal,
        cart: cartResult
      };
    }
  }

  // 4. Check client usage limit (restricted per user)
  if (coupon.userLimit !== null) {
    // If a coupon has user limit constraints, anonymous guest checkouts are blocked
    if (!input.clientId) {
      return {
        valid: false,
        message: "Please login to use this coupon",
        subTotal,
        subtotalSource,
        discountAmount: 0,
        totalAfterDiscount: subTotal,
        cart: cartResult
      };
    }

    const clientUses = await prisma.sale.count({
      where: {
        couponId: coupon.id,
        clientId: input.clientId,
        status: { not: "CANCELLED" }
      }
    });

    if (clientUses >= coupon.userLimit) {
      return {
        valid: false,
        message: `You have reached the maximum usage limit of ${coupon.userLimit} times for this coupon`,
        subTotal,
        subtotalSource,
        discountAmount: 0,
        totalAfterDiscount: subTotal,
        cart: cartResult
      };
    }
  }

  // 5. Calculate Discount Value
  const value = Number(coupon.value);
  let discountAmount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = Math.round(subTotal * (value / 100));
  } else if (coupon.discountType === "FLAT") {
    discountAmount = Math.min(value, subTotal);
  } else {
    return {
      valid: false,
      message: "Unknown coupon discount type",
      subTotal,
      subtotalSource,
      discountAmount: 0,
      totalAfterDiscount: subTotal,
      cart: cartResult
    };
  }

  // Ensure discount amount does not exceed the subtotal
  discountAmount = Math.min(discountAmount, subTotal);
  const totalAfterDiscount = subTotal - discountAmount;

  return {
    valid: true,
    message: "Coupon applied successfully",
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      value: Number(coupon.value)
    },
    subTotal,
    subtotalSource,
    discountAmount,
    totalAfterDiscount,
    cart: cartResult
  };
}
