import { NextResponse } from "next/server";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { validateEcomCoupon } from "@/lib/ecommerce/coupon-validation";

// POST /api/ecommerce/coupons/validate
export async function POST(req: Request) {
  try {
    // 1. JSON parsing check
    let body;
    try {
      body = await req.json();
    } catch (_) {
      return NextResponse.json({
        success: false,
        message: "Invalid JSON request body"
      }, { status: 400 });
    }

    const { code, items, subTotal } = body;

    // 2. Schema Validation
    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({
        success: false,
        message: "Request requires a non-empty string 'code'"
      }, { status: 400 });
    }

    if ((items === undefined || items === null) && (subTotal === undefined || subTotal === null)) {
      return NextResponse.json({
        success: false,
        message: "Request must provide either 'items' array or 'subTotal' value"
      }, { status: 400 });
    }

    if (items !== undefined && items !== null) {
      if (!Array.isArray(items)) {
        return NextResponse.json({
          success: false,
          message: "'items' must be a valid array"
        }, { status: 400 });
      }
      // Validate structure of items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== "object") {
          return NextResponse.json({
            success: false,
            message: `Item at index ${i} is not a valid object`
          }, { status: 400 });
        }
        if (!item.itemId || typeof item.itemId !== "string" || !item.itemId.trim()) {
          return NextResponse.json({
            success: false,
            message: `Item at index ${i} requires a non-empty string 'itemId'`
          }, { status: 400 });
        }
        if (item.quantity === undefined || typeof item.quantity !== "number" || item.quantity <= 0) {
          return NextResponse.json({
            success: false,
            message: `Item at index ${i} requires a positive numeric 'quantity' greater than 0`
          }, { status: 400 });
        }
      }
    }

    if (subTotal !== undefined && subTotal !== null) {
      if (typeof subTotal !== "number" || subTotal <= 0) {
        return NextResponse.json({
          success: false,
          message: "'subTotal' must be a positive number greater than 0"
        }, { status: 400 });
      }
    }

    // 3. Optional client auth lookup
    const client = await getClientFromRequest(req);
    const clientId = client ? client.id : null;

    // 4. Validate Coupon
    const result = await validateEcomCoupon({
      code,
      items,
      subTotal,
      clientId
    });

    // Determine final status
    const responsePayload: any = {
      success: true,
      valid: result.valid,
      message: result.message,
      subTotal: result.subTotal,
      subtotalSource: result.subtotalSource,
      discountAmount: result.discountAmount,
      totalAfterDiscount: result.totalAfterDiscount
    };

    if (result.coupon) {
      responsePayload.coupon = result.coupon;
    }

    if (result.cart) {
      responsePayload.cart = result.cart;
    }

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error("POST /api/ecommerce/coupons/validate error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
