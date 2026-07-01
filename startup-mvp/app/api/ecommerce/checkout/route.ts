import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { validateCartItems } from "@/lib/ecommerce/cart-validation";
import { validateEcomCoupon } from "@/lib/ecommerce/coupon-validation";
import { generateSaleNumber } from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";
import { serializeEcomOrderSummary } from "@/lib/ecommerce/dto";
import { SaleStatus, OrderType } from "@prisma/client";

// POST /api/ecommerce/checkout
export async function POST(req: Request) {
  try {
    // 1. Authenticate customer
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    let body;
    try {
      body = await req.json();
    } catch (_) {
      return NextResponse.json({ success: false, message: "Invalid JSON request body" }, { status: 400 });
    }

    const {
      items,
      addressId,
      couponCode,
      paymentMethod,
      paymentStatus,
      paymentReference,
      customerNote
    } = body;

    // 3. Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "Request must contain a non-empty 'items' array" }, { status: 400 });
    }
    if (items.length > 100) {
      return NextResponse.json({ success: false, message: "Checkout is limited to a maximum of 100 items per request" }, { status: 400 });
    }
    if (!addressId || typeof addressId !== "string" || !addressId.trim()) {
      return NextResponse.json({ success: false, message: "Delivery address 'addressId' is required" }, { status: 400 });
    }
    if (!paymentMethod || typeof paymentMethod !== "string" || !paymentMethod.trim()) {
      return NextResponse.json({ success: false, message: "Payment method 'paymentMethod' is required" }, { status: 400 });
    }

    const trimmedAddressId = addressId.trim();
    const trimmedPaymentMethod = paymentMethod.trim().toUpperCase();
    const allowedPaymentMethods = ["COD", "BKASH", "NAGAD", "CARD", "BANK", "MANUAL"];
    if (!allowedPaymentMethods.includes(trimmedPaymentMethod)) {
      return NextResponse.json({ success: false, message: `Invalid payment method. Allowed: ${allowedPaymentMethods.join(", ")}` }, { status: 400 });
    }

    // Force UNPAID status for Cash On Delivery orders
    let finalPaymentStatus = (paymentStatus || "UNPAID").trim().toUpperCase();
    if (trimmedPaymentMethod === "COD") {
      finalPaymentStatus = "UNPAID";
    }

    if (finalPaymentStatus === "PAID" && trimmedPaymentMethod !== "COD") {
      if (!paymentReference || typeof paymentReference !== "string" || !paymentReference.trim()) {
        return NextResponse.json({ success: false, message: "Payment reference is required for pre-paid orders" }, { status: 400 });
      }
    }

    // 4. Validate shipping address ownership
    const clientAddress = await prisma.clientAddress.findFirst({
      where: {
        id: trimmedAddressId,
        clientId: client.id
      }
    });

    if (!clientAddress) {
      return NextResponse.json({ success: false, message: "Delivery address not found or does not belong to your account" }, { status: 400 });
    }

    // 5. Validate Cart Items (reads database pricing and stock limits)
    const cartVal = await validateCartItems(items);
    if (!cartVal.isValid) {
      return NextResponse.json({
        success: false,
        message: "Cart contains unavailable or out-of-stock items",
        cart: {
          isValid: cartVal.isValid,
          items: cartVal.items
        }
      }, { status: 400 });
    }

    const subTotal = cartVal.summary.subTotal;

    // 6. Validate Coupon if provided
    let couponId = null;
    let discount = 0;
    if (couponCode && couponCode.trim()) {
      const couponVal = await validateEcomCoupon({
        code: couponCode,
        items,
        clientId: client.id
      });
      if (!couponVal.valid) {
        return NextResponse.json({ success: false, message: couponVal.message }, { status: 400 });
      }
      couponId = couponVal.coupon ? couponVal.coupon.id : null;
      discount = couponVal.discountAmount;
    }

    // 7. Calculate Delivery Charge
    const city = (clientAddress.city || "").trim().toLowerCase();
    const district = (clientAddress.district || "").trim().toLowerCase();
    const division = (clientAddress.division || "").trim().toLowerCase();

    let deliveryCharge = 120; // default outside Dhaka
    if (city.includes("dhaka") || district.includes("dhaka") || division.includes("dhaka")) {
      deliveryCharge = 80;
    }

    // 8. Calculate VAT / Tax (proportional discount deduction)
    let tax = 0;
    for (const cartItem of cartVal.items) {
      const lineSubtotal = cartItem.quantity * cartItem.unitPrice;
      const proportion = subTotal > 0 ? (lineSubtotal / subTotal) : 0;
      const lineDiscount = discount * proportion;
      const taxableAmount = Math.max(0, lineSubtotal - lineDiscount);

      // Fetch VAT config for item
      const dbItem = await prisma.item.findUnique({
        where: { id: cartItem.itemId },
        select: { isVatEnabled: true, vatPercentage: true }
      });

      if (dbItem?.isVatEnabled && dbItem.vatPercentage) {
        const lineVat = taxableAmount * (Number(dbItem.vatPercentage) / 100);
        tax += lineVat;
      }
    }

    // Round calculations
    const roundedSubTotal = Math.round(subTotal * 100) / 100;
    const roundedDiscount = Math.round(discount * 100) / 100;
    const roundedTax = Math.round(tax * 100) / 100;
    const roundedDelivery = Math.round(deliveryCharge * 100) / 100;
    const grandTotal = Math.max(0, roundedSubTotal - roundedDiscount + roundedTax + roundedDelivery);
    const roundedGrandTotal = Math.round(grandTotal * 100) / 100;

    // 9. Execute database transaction for Order creation and Stock reservation
    const sale = await prisma.$transaction(async (tx) => {
      // Find first system user to satisfy creator foreign key constraints
      const systemUser = await tx.user.findFirst({
        orderBy: { createdAt: "asc" }
      });
      if (!systemUser) {
        throw new Error("System initialization pending. Creator user not found.");
      }
      const systemUserId = systemUser.id;

      // Find all active, non-trashed warehouses
      const activeWarehouses = await tx.warehouse.findMany({
        where: { status: "active", isTrash: false },
        orderBy: { createdAt: "asc" }
      });

      if (activeWarehouses.length === 0) {
        throw new Error("No active warehouse found in the system.");
      }

      // Find the first warehouse with sufficient stock for all track-inventory items
      let selectedWarehouseId = null;
      for (const wh of activeWarehouses) {
        let whIsSufficient = true;
        for (const cartItem of cartVal.items) {
          const dbItem = await tx.item.findUnique({
            where: { id: cartItem.itemId },
            select: { trackInventory: true }
          });

          if (dbItem?.trackInventory) {
            let stockRow: any = null;
            if (cartItem.variantId) {
              stockRow = await tx.stock.findUnique({
                where: { variantId_warehouseId: { variantId: cartItem.variantId, warehouseId: wh.id } }
              });
            } else {
              stockRow = await tx.stock.findUnique({
                where: { itemId_warehouseId: { itemId: cartItem.itemId, warehouseId: wh.id } }
              });
            }

            const avail = stockRow ? (Number(stockRow.quantity) - Number(stockRow.reservedQuantity)) : 0;
            if (avail < cartItem.quantity) {
              whIsSufficient = false;
              break;
            }
          }
        }

        if (whIsSufficient) {
          selectedWarehouseId = wh.id;
          break;
        }
      }

      // Default fallback if no single warehouse matches
      if (!selectedWarehouseId) {
        selectedWarehouseId = activeWarehouses[0].id;
      }

      // Perform Stock Row Locking and Reservations
      for (const cartItem of cartVal.items) {
        const dbItem = await tx.item.findUnique({
          where: { id: cartItem.itemId },
          select: { trackInventory: true, name: true }
        });

        if (dbItem?.trackInventory) {
          let lockedStocks: any[] = [];
          if (cartItem.variantId) {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${cartItem.itemId} 
                AND "variantId" = ${cartItem.variantId} 
                AND "warehouseId" = ${selectedWarehouseId} 
              FOR UPDATE
            `;
          } else {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${cartItem.itemId} 
                AND "variantId" IS NULL 
                AND "warehouseId" = ${selectedWarehouseId} 
              FOR UPDATE
            `;
          }

          const stockRow = lockedStocks[0];
          const availableStock = stockRow ? (Number(stockRow.quantity) - Number(stockRow.reservedQuantity)) : 0;

          if (availableStock < cartItem.quantity) {
            throw new Error(`Insufficient stock for product: ${dbItem.name}. Please adjust your cart.`);
          }

          if (stockRow) {
            await tx.stock.update({
              where: { id: stockRow.id },
              data: {
                reservedQuantity: {
                  increment: cartItem.quantity
                }
              }
            });
          } else {
            await tx.stock.create({
              data: {
                itemId: cartItem.itemId,
                variantId: cartItem.variantId || null,
                warehouseId: selectedWarehouseId,
                quantity: 0,
                reservedQuantity: cartItem.quantity
              }
            });
          }
        }
      }

      // Generate unique sale number inside transaction
      const saleNumber = await generateSaleNumber(tx);

      // Create e-commerce order (ERP Sale with status DRAFT and orderType ECOM)
      const createdSale = await tx.sale.create({
        data: {
          saleNumber,
          clientId: client.id,
          warehouseId: selectedWarehouseId,
          date: new Date(),
          status: SaleStatus.DRAFT,
          orderType: OrderType.ECOM,
          notes: customerNote ? String(customerNote).trim() : null,
          subTotal: roundedSubTotal,
          discount: roundedDiscount,
          tax: roundedTax,
          grandTotal: roundedGrandTotal,
          deliveryCharge: roundedDelivery,
          couponId,
          createdBy: systemUserId,
          deliveryStatus: "PENDING",
          deliveryAddress: {
            id: clientAddress.id,
            recipientName: clientAddress.recipientName,
            phone: clientAddress.phone,
            addressLine: clientAddress.addressLine,
            area: clientAddress.area || null,
            city: clientAddress.city || null,
            district: clientAddress.district || null,
            division: clientAddress.division || null,
            country: clientAddress.country
          },
          paymentDetails: {
            paymentMethod: trimmedPaymentMethod,
            paymentStatus: finalPaymentStatus,
            paymentReference: paymentReference ? String(paymentReference).trim() : null,
            source: "ECOM_FRONTEND"
          },
          items: {
            create: cartVal.items.map((cartItem) => {
              const description = cartItem.name + (cartItem.variant ? ` (${cartItem.variant.color ? cartItem.variant.color + " / " : ""}${cartItem.variant.size})` : "");
              return {
                itemId: cartItem.itemId,
                variantId: cartItem.variantId,
                description,
                quantity: cartItem.quantity,
                unitPrice: cartItem.unitPrice,
                amount: cartItem.quantity * cartItem.unitPrice
              };
            })
          }
        }
      });

      return createdSale;
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      order: serializeEcomOrderSummary(sale)
    });

  } catch (error) {
    console.error("POST /api/ecommerce/checkout error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 400 }); // validation/stock/coupon/address errors return 400
  }
}
