import React from "react";
import { getPurchaseById } from "../../_actions/purchase.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { FiArrowLeft, FiEdit, FiFileText, FiTruck, FiPackage, FiUser, FiCalendar, FiClock, FiHome, FiAlertCircle } from "react-icons/fi";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import type { PurchaseStatus } from "@prisma/client";

interface PurchaseDetailsPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export default async function PurchaseDetailsPage({ params }: PurchaseDetailsPageProps) {
  const { id } = await params;

  const result = await getPurchaseById(id);

  if (!result.success || !result.purchase) {
    notFound();
  }

  const purchase = result.purchase;

  const getStatusBadgeVariant = (status: PurchaseStatus) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "APPROVED":
        return "default";
      case "PARTIALLY_RECEIVED":
        return "default";
      case "RECEIVED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{purchase.purchaseNumber}</h1>
            <Badge variant={getStatusBadgeVariant(purchase.status)} className="text-sm px-3 py-1">
              {STATUS_LABELS[purchase.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Purchase Order Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/purchases">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {purchase.status === "DRAFT" && (
            <Button asChild>
              <Link href={`/dashboard/purchases/${purchase.id}/edit`}>
                <FiEdit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {purchase.status === "PARTIALLY_RECEIVED" && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Partially Received
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  This purchase order has been partially received. Some items may still be pending.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiFileText className="h-5 w-5" />
              Purchase Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Purchase Number</p>
              <p className="font-mono text-lg font-semibold">{purchase.purchaseNumber}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusBadgeVariant(purchase.status)} className="text-sm">
                {STATUS_LABELS[purchase.status]}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
              <p className="font-medium">
                {format(new Date(purchase.date), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(purchase.date), "EEEE, h:mm a")}
              </p>
            </div>
            {purchase.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{purchase.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiTruck className="h-5 w-5" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Supplier Name</p>
              <Link
                href={`/dashboard/suppliers/${purchase.supplier.id}`}
                className="font-semibold text-lg hover:underline block"
              >
                {purchase.supplier.name || purchase.supplier.company || purchase.supplier.email}
              </Link>
              {purchase.supplier.company && purchase.supplier.name && (
                <p className="text-xs text-muted-foreground">{purchase.supplier.company}</p>
              )}
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{purchase.supplier.email}</p>
            </div>
            {purchase.supplier.phone && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{purchase.supplier.phone}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Warehouse & Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiHome className="h-5 w-5" />
              Warehouse & Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {purchase.warehouse ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
                  <Link
                    href={`/dashboard/master/warehouses/${purchase.warehouse.id}`}
                    className="font-semibold hover:underline block"
                  >
                    {purchase.warehouse.name}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono">{purchase.warehouse.code}</p>
                </div>
                <Separator />
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
                <p className="text-sm text-muted-foreground">Not assigned</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(purchase.grandTotal)}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(purchase.subTotal)}</span>
              </div>
              {purchase.discount && purchase.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(purchase.discount)}
                  </span>
                </div>
              )}
              {purchase.tax && purchase.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(purchase.tax)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPackage className="h-5 w-5" />
            Purchase Items
          </CardTitle>
          <CardDescription>
            {purchase.items.length} item{purchase.items.length !== 1 ? "s" : ""} in this purchase order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchase.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FiPackage className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items in this purchase order</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.item ? (
                          <Link
                            href={`/dashboard/master/items/${item.item.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {item.item.code}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.item && (
                            <p className="text-xs text-muted-foreground">{item.item.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantity.toFixed(2)}
                        {item.item?.unit?.symbol && ` ${item.item.unit.symbol}`}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Financial Summary Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(purchase.subTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {purchase.discount && purchase.discount > 0 ? "Discount" : "Tax"}
                  </p>
                  <p className="text-2xl font-bold">
                    {purchase.discount && purchase.discount > 0
                      ? `-${formatCurrency(purchase.discount)}`
                      : purchase.tax && purchase.tax > 0
                      ? formatCurrency(purchase.tax)
                      : formatCurrency(0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(purchase.grandTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline & Audit Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiClock className="h-5 w-5" />
              Status Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-2 w-2 rounded-full ${
                  purchase.status === "DRAFT" || purchase.status === "APPROVED" || 
                  purchase.status === "PARTIALLY_RECEIVED" || purchase.status === "RECEIVED"
                    ? "bg-blue-600" : "bg-muted"
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Draft</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(purchase.createdAt), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">Purchase order created</p>
                </div>
              </div>

              {purchase.status === "APPROVED" || purchase.status === "PARTIALLY_RECEIVED" || purchase.status === "RECEIVED" ? (
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    purchase.status === "PARTIALLY_RECEIVED" || purchase.status === "RECEIVED"
                      ? "bg-blue-600" : "bg-muted"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Approved</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(purchase.updatedAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">Purchase order approved</p>
                  </div>
                </div>
              ) : null}

              {(purchase.status === "PARTIALLY_RECEIVED" || purchase.status === "RECEIVED") && (
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    purchase.status === "RECEIVED" ? "bg-green-600" : "bg-orange-600"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${
                        purchase.status === "RECEIVED" ? "text-green-600" : "text-orange-600"
                      }`}>
                        {purchase.status === "RECEIVED" ? "Received" : "Partially Received"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(purchase.updatedAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {purchase.status === "RECEIVED" 
                        ? "All items received and inventory updated" 
                        : "Some items received"}
                    </p>
                  </div>
                </div>
              )}

              {purchase.status === "CANCELLED" && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-red-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-red-600">Cancelled</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(purchase.updatedAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">Purchase order cancelled</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUser className="h-5 w-5" />
              Audit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {purchase.createdByUser && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FiUser className="h-4 w-4" />
                    Created By
                  </p>
                  <p className="font-medium">
                    {purchase.createdByUser.name || purchase.createdByUser.email}
                  </p>
                </div>
                <Separator />
              </>
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                Created At
              </p>
              <p>{format(new Date(purchase.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                Last Updated
              </p>
              <p>{format(new Date(purchase.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
