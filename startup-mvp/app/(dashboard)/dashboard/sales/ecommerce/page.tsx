import React from "react";
import Link from "next/link";
import { getEcomOrders } from "./_actions/ecom-order.action";
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    deliveryStatus?: string;
    paymentStatus?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function EcomOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const status = params.status || "ALL";
  const deliveryStatus = params.deliveryStatus || "ALL";
  const paymentStatus = params.paymentStatus || "ALL";
  const search = params.search || "";
  const fromDate = params.fromDate || "";
  const toDate = params.toDate || "";

  const result = await getEcomOrders({
    page,
    status,
    deliveryStatus,
    paymentStatus,
    search,
    fromDate,
    toDate
  });

  const orders = result.success ? result.orders : [];
  const pagination = result.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">E-commerce Orders</h1>
          <p className="text-muted-foreground mt-1">Manage, verify, and complete online customer checkouts.</p>
        </div>
      </div>

      {/* Filter and Search Form */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Search Order / Client</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="SAL-2026-0001 or Client Name/Phone"
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Order Status</label>
            <select
              name="status"
              defaultValue={status}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">DRAFT (Pending)</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery Status</label>
            <select
              name="deliveryStatus"
              defaultValue={deliveryStatus}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
            >
              <option value="ALL">All Delivery Statuses</option>
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
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Status</label>
            <select
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div className="sm:col-span-2 md:col-span-4 flex items-center justify-end space-x-3 pt-2">
            <Link
              href="/dashboard/sales/ecommerce"
              className="h-10 px-4 flex items-center text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
            >
              Clear Filters
            </Link>
            <button
              type="submit"
              className="h-10 px-6 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/95 shadow-sm transition-colors"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b font-semibold text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Order Number</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Grand Total</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Delivery</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No e-commerce orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => {
                  const payDetails = order.paymentDetails && typeof order.paymentDetails === "object" ? order.paymentDetails : {};
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">
                        <Link href={`/dashboard/sales/ecommerce/${order.id}`}>
                          {order.saleNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{order.client?.name || "Regular Customer"}</div>
                        <div className="text-xs text-muted-foreground">{order.client?.phone || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        ৳{Number(order.grandTotal).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground uppercase">{payDetails.paymentMethod || "COD"}</span>
                          <span className={`inline-flex items-center text-xs font-bold ${
                            payDetails.paymentStatus === "PAID" ? "text-emerald-500" : "text-amber-500"
                          }`}>
                            {payDetails.paymentStatus || "UNPAID"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          order.deliveryStatus === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : order.deliveryStatus === "SHIPPED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : order.deliveryStatus === "CANCELLED"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {order.deliveryStatus || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/sales/ecommerce/${order.id}`}
                          className="inline-flex items-center h-8 px-3 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
            <div className="text-xs text-muted-foreground">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={`/dashboard/sales/ecommerce?page=${pagination.page - 1}&status=${status}&deliveryStatus=${deliveryStatus}&paymentStatus=${paymentStatus}&search=${search}`}
                className={`inline-flex items-center h-8 px-3 rounded text-xs border bg-background font-medium hover:bg-muted transition-colors ${
                  pagination.page === 1 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/dashboard/sales/ecommerce?page=${pagination.page + 1}&status=${status}&deliveryStatus=${deliveryStatus}&paymentStatus=${paymentStatus}&search=${search}`}
                className={`inline-flex items-center h-8 px-3 rounded text-xs border bg-background font-medium hover:bg-muted transition-colors ${
                  pagination.page === pagination.totalPages ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
