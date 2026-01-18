import React from "react";
import { getPurchaseById } from "../_actions/purchase.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiEdit } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import type { PurchaseStatus } from "@prisma/client";

interface PurchaseDetailsPageProps {
  searchParams: Promise<{ id?: string }>;
}

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export default async function PurchaseDetailsPage({ searchParams }: PurchaseDetailsPageProps) {
  const params = await searchParams;
  const purchaseId = params.id;

  if (!purchaseId) {
    notFound();
  }

  const result = await getPurchaseById(purchaseId);

  if (!result.success || !result.purchase) {
    notFound();
  }

  const purchase = result.purchase;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/admin/purchases">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/admin/purchases/${purchase.id}`}>
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Purchase
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Details</CardTitle>
          <CardDescription>View complete information about this purchase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purchase Number</label>
              <p className="text-sm font-medium">{purchase.purchaseNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Supplier</label>
              <p className="text-sm">
                {purchase.supplier.name || purchase.supplier.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <p className="text-sm">{format(new Date(purchase.date), "MMM d, yyyy")}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                <Badge variant={purchase.status === "CANCELLED" ? "destructive" : "secondary"}>
                  {STATUS_LABELS[purchase.status]}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total</label>
              <p className="text-sm font-medium">{purchase.grandTotal.toFixed(2)}</p>
            </div>
          </div>

          {purchase.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <p className="text-sm">{purchase.notes}</p>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Unit Price</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">
                      {item.item?.code || "-"}
                    </td>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right">{item.quantity.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{purchase.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>{(purchase.discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{(purchase.tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Grand Total</span>
                <span>{purchase.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


