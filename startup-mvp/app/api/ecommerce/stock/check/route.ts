import { NextResponse } from "next/server";
import { checkItemStock } from "@/lib/ecommerce/cart-validation";

// POST /api/ecommerce/stock/check
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

    const { itemId, variantId, quantity } = body;

    // 2. Schema Validation
    if (!itemId || typeof itemId !== "string" || !itemId.trim()) {
      return NextResponse.json({
        success: false,
        message: "Request requires a non-empty string 'itemId'"
      }, { status: 400 });
    }

    if (quantity !== undefined && (typeof quantity !== "number" || quantity <= 0)) {
      return NextResponse.json({
        success: false,
        message: "Quantity must be a positive number greater than 0"
      }, { status: 400 });
    }

    if (variantId !== undefined && variantId !== null && typeof variantId !== "string") {
      return NextResponse.json({
        success: false,
        message: "variantId must be a string or null"
      }, { status: 400 });
    }

    // 3. Perform Stock Check
    const result = await checkItemStock({
      itemId: itemId.trim(),
      variantId: variantId ? variantId.trim() : null,
      quantity: quantity
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: "Product not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      itemId: result.itemId,
      variantId: result.variantId,
      requestedQuantity: result.requestedQuantity,
      availableStock: result.availableStock,
      isAvailable: result.isAvailable,
      outOfStock: result.outOfStock
    });

  } catch (error) {
    console.error("POST /api/ecommerce/stock/check error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
