import { NextResponse } from "next/server";
import { validateCartItems } from "@/lib/ecommerce/cart-validation";

// POST /api/ecommerce/cart/validate
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

    const { items } = body;

    // 2. Schema Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Request must contain a non-empty 'items' array"
      }, { status: 400 });
    }

    if (items.length > 100) {
      return NextResponse.json({
        success: false,
        message: "Cart validation is limited to a maximum of 100 items per request"
      }, { status: 400 });
    }

    // Validate structure of each item in array
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
      if (item.variantId !== undefined && item.variantId !== null && typeof item.variantId !== "string") {
        return NextResponse.json({
          success: false,
          message: `Item at index ${i} has an invalid 'variantId' (must be a string or null)`
        }, { status: 400 });
      }
    }

    // 3. Perform Validation
    const validationResult = await validateCartItems(items);

    return NextResponse.json({
      success: true,
      isValid: validationResult.isValid,
      items: validationResult.items,
      summary: validationResult.summary
    });

  } catch (error) {
    console.error("POST /api/ecommerce/cart/validate error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
