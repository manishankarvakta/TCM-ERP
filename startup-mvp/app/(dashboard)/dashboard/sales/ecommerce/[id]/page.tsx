import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEcomOrderById, updateEcomDeliveryStatus, updateEcomPaymentStatus, completeEcomOrder, cancelEcomOrder } from "../_actions/ecom-order.action";
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EcomOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getEcomOrderById(id);

  if (!result.success || !result.order) {
    redirect("/dashboard/sales/ecommerce");
  }

  const order = result.order;
  const payDetails = order.paymentDetails && typeof order.paymentDetails === "object" ? order.paymentDetails : {};
  const delAddress = order.deliveryAddress && typeof order.deliveryAddress === "object" ? order.deliveryAddress : {};

  // Form action handlers using Server Actions
  async function handleUpdateDelivery(formData: FormData) {
    "use server";
    const status = formData.get("deliveryStatus") as string;
    const courier = formData.get("courierName") as string;
    const tracking = formData.get("trackingNumber") as string;
    await updateEcomDeliveryStatus(id, status, courier, tracking);
  }

  async function handleUpdatePayment(formData: FormData) {
    "use server";
    const status = formData.get("paymentStatus") as string;
    const method = formData.get("paymentMethod") as string;
    const ref = formData.get("paymentReference") as string;
    await updateEcomPaymentStatus(id, status, method, ref);
  }

  async function handleComplete(formData: FormData) {
    "use server";
    await completeEcomOrder(id);
  }

  async function handleCancel(formData: FormData) {
    "use server";
    await cancelEcomOrder(id);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb and Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            <Link href="/dashboard/sales/ecommerce" className="hover:underline">E-commerce Orders</Link> &gt; Detail
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{order.saleNumber}</h1>
          <p className="text-muted-foreground mt-1">Placed on {formatDate(order.createdAt)}</p>
        </div>
        
        {/* Order Status Badge */}
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
            order.status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : order.status === "CANCELLED"
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}>
            Status: {order.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Details Panel (Left / Col-Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Summary / Items Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 font-bold text-lg">
              Order Items Summary
            </div>
            <div className="divide-y">
              {order.items.map((saleItem: any) => {
                // Stock audit calculations
                let currentWarehouseStock = 0;
                let currentWarehouseReserved = 0;
                
                if (saleItem.item?.trackInventory) {
                  if (saleItem.variant) {
                    const varStock = saleItem.variant.stocks?.find((s: any) => s.warehouseId === order.warehouseId);
                    currentWarehouseStock = varStock ? Number(varStock.quantity) : 0;
                    currentWarehouseReserved = varStock ? Number(varStock.reservedQuantity) : 0;
                  } else {
                    const itemStock = saleItem.item.stocks?.find((s: any) => s.warehouseId === order.warehouseId);
                    currentWarehouseStock = itemStock ? Number(itemStock.quantity) : 0;
                    currentWarehouseReserved = itemStock ? Number(itemStock.reservedQuantity) : 0;
                  }
                }

                return (
                  <div key={saleItem.id} className="p-6 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-base text-foreground">{saleItem.item?.name || "Product"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">SKU/Code: {saleItem.variant?.sku || saleItem.item?.code || "N/A"}</div>
                        {saleItem.variant && (
                          <div className="text-xs font-medium text-primary mt-1">
                            Attributes: {saleItem.variant.color ? `Color: ${saleItem.variant.color} ` : ""}{saleItem.variant.size ? `Size: ${saleItem.variant.size}` : ""}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">৳{Number(saleItem.amount).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{Number(saleItem.quantity)} x ৳{Number(saleItem.unitPrice)}</div>
                      </div>
                    </div>

                    {/* Stock Audit details (Admin Only) */}
                    <div className="mt-2 p-3 bg-muted/40 rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 border">
                      <div>
                        <span className="text-muted-foreground block">Warehouse:</span>
                        <span className="font-semibold">{order.warehouse?.name || "Main Warehouse"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Warehouse Stock:</span>
                        <span className="font-bold">{saleItem.item?.trackInventory ? currentWarehouseStock : "Unlimited"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Stock Reserved:</span>
                        <span className={`font-bold ${currentWarehouseReserved > 0 ? "text-amber-500" : ""}`}>
                          {saleItem.item?.trackInventory ? currentWarehouseReserved : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Inventory Status:</span>
                        <span className={`font-bold ${
                          !saleItem.item?.trackInventory ? "text-emerald-500" :
                          (currentWarehouseStock - currentWarehouseReserved >= Number(saleItem.quantity)) ? "text-emerald-500" : "text-red-500"
                        }`}>
                          {!saleItem.item?.trackInventory ? "Always Available" :
                          (currentWarehouseStock - currentWarehouseReserved >= Number(saleItem.quantity)) ? "Ready" : "Stock Missing"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations Panel */}
            <div className="p-6 bg-muted/20 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">৳{Number(order.subTotal).toLocaleString()}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-amber-500 font-semibold">
                  <span>Coupon Discount {order.coupon ? `(${order.coupon.code})` : ""}:</span>
                  <span>- ৳{Number(order.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT/Tax:</span>
                <span className="font-medium">৳{Number(order.tax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Charge:</span>
                <span className="font-medium">৳{Number(order.deliveryCharge).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold border-t pt-2 text-foreground">
                <span>Grand Total:</span>
                <span>৳{Number(order.grandTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Client & Delivery Info Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg text-foreground border-b pb-2 mb-3">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{order.client?.name}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{order.client?.phone}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{order.client?.email || "N/A"}</span></div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground border-b pb-2 mb-3">Delivery Address Snapshot</h3>
              <div className="space-y-1.5 text-sm">
                <div><span className="text-muted-foreground">Recipient Name:</span> <span className="font-medium">{delAddress.recipientName}</span></div>
                <div><span className="text-muted-foreground">Contact Phone:</span> <span className="font-medium">{delAddress.phone}</span></div>
                <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{delAddress.addressLine}</span></div>
                <div><span className="text-muted-foreground">Area/City:</span> <span className="font-medium">{delAddress.area ? `${delAddress.area}, ` : ""}{delAddress.city}</span></div>
                <div><span className="text-muted-foreground">District/Division:</span> <span className="font-medium">{delAddress.district}, {delAddress.division}</span></div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          {order.notes && (
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-bold text-lg text-foreground border-b pb-2 mb-3">Customer Notes</h3>
              <p className="text-sm text-foreground italic">"{order.notes}"</p>
            </div>
          )}
        </div>

        {/* Sidebar Controls (Right / Col-Span 1) */}
        <div className="space-y-6">
          
          {/* Order Completion Card */}
          {order.status === "DRAFT" && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-lg text-primary">Order Status Actions</h3>
              <p className="text-xs text-muted-foreground">Complete this order to deduct stock and post accounting journals, or cancel it to release reserved stock.</p>
              
              <div className="flex flex-col gap-3 pt-2">
                <form action={handleComplete}>
                  <button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 shadow-sm transition-colors"
                  >
                    Confirm & Complete Order
                  </button>
                </form>
                <form action={handleCancel}>
                  <button
                    type="submit"
                    className="w-full h-11 bg-background text-red-500 hover:bg-red-50 border border-red-200 text-sm font-semibold rounded-lg transition-colors"
                  >
                    Cancel Order (Release Stock)
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Delivery Configuration Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg text-foreground border-b pb-2">Delivery Details</h3>
            <form action={handleUpdateDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery Status</label>
                <select
                  name="deliveryStatus"
                  defaultValue={order.deliveryStatus || "PENDING"}
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                  disabled={order.status === "CANCELLED"}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="RETURNED">RETURNED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Courier Name</label>
                <input
                  type="text"
                  name="courierName"
                  defaultValue={order.courierName || ""}
                  placeholder="e.g. Pathao, Steadfast"
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                  disabled={order.status === "CANCELLED"}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tracking Number</label>
                <input
                  type="text"
                  name="trackingNumber"
                  defaultValue={order.trackingNumber || ""}
                  placeholder="e.g. TRK123456"
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                  disabled={order.status === "CANCELLED"}
                />
              </div>

              {order.status !== "CANCELLED" && (
                <button
                  type="submit"
                  className="w-full h-10 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-colors"
                >
                  Save Delivery Settings
                </button>
              )}
            </form>
          </div>

          {/* Payment Status Card */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg text-foreground border-b pb-2">Payment Details</h3>
            <form action={handleUpdatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Status</label>
                <select
                  name="paymentStatus"
                  defaultValue={payDetails.paymentStatus || "UNPAID"}
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                  disabled={order.status === "CANCELLED"}
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="PARTIAL">PARTIAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</label>
                <select
                  name="paymentMethod"
                  defaultValue={payDetails.paymentMethod || "COD"}
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                  disabled={order.status === "CANCELLED"}
                >
                  <option value="COD">COD (Cash on Delivery)</option>
                  <option value="BKASH">BKASH</option>
                  <option value="NAGAD">NAGAD</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK">BANK</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Reference</label>
                <input
                  type="text"
                  name="paymentReference"
                  defaultValue={payDetails.paymentReference || ""}
                  placeholder="e.g. Transaction ID"
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                  disabled={order.status === "CANCELLED"}
                />
              </div>

              {order.status !== "CANCELLED" && (
                <button
                  type="submit"
                  className="w-full h-10 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-colors"
                >
                  Save Payment Settings
                </button>
              )}
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
