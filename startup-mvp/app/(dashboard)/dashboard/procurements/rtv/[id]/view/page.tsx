import React from "react";
import { getReturnToVendorById } from "../../_actions/rtv.action";
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
import { FiArrowLeft, FiEdit, FiFileText, FiTruck, FiPackage, FiCalendar, FiClock, FiHome } from "react-icons/fi";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import type { ReturnToVendorStatus } from "@prisma/client";

interface RTVDetailsPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<ReturnToVendorStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function RTVDetailsPage({ params }: RTVDetailsPageProps) {
  const { id } = await params;

  const result = await getReturnToVendorById(id);

  if (!result.success || !result.rtv) {
    notFound();
  }

  const rtv = result.rtv;

  const getStatusBadgeVariant = (status: ReturnToVendorStatus) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "COMPLETED":
        return "default";
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{rtv.rtvNumber}</h1>
            <Badge variant={getStatusBadgeVariant(rtv.status)} className="text-sm px-3 py-1">
              {STATUS_LABELS[rtv.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Return to Vendor Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/procurements/rtv">
              <FiArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </Button>
          {rtv.status === "DRAFT" && (
            <Button asChild>
              <Link href={`/dashboard/procurements/rtv/${rtv.id}/edit`}>
                <FiEdit className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RTV Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiFileText className="h-5 w-5" aria-hidden="true" />
              Return Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">RTV Number</p>
              <p className="font-mono text-lg font-semibold">{rtv.rtvNumber}</p>
            </div>
            {rtv.purchase && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Original Purchase</p>
                  <Link 
                    href={`/dashboard/procurements/purchases/${rtv.purchase.id}/view`}
                    className="font-mono hover:underline block"
                  >
                    {rtv.purchase.purchaseNumber}
                  </Link>
                </div>
              </>
            )}
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusBadgeVariant(rtv.status)} className="text-sm">
                {STATUS_LABELS[rtv.status]}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Return Date</p>
              <p className="font-medium">
                {format(new Date(rtv.date), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(rtv.date), "EEEE, h:mm a")}
              </p>
            </div>
            {rtv.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{rtv.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiTruck className="h-5 w-5" aria-hidden="true" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Supplier Name</p>
              <Link
                href={`/dashboard/suppliers/${rtv.supplier.id}`}
                className="font-semibold text-lg hover:underline block"
              >
                {rtv.supplier.name || rtv.supplier.email}
              </Link>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{rtv.supplier.email}</p>
            </div>
            {rtv.supplier.phone && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{rtv.supplier.phone}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Warehouse & Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiHome className="h-5 w-5" aria-hidden="true" />
              Warehouse & Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
              <Link
                href={`/dashboard/master/warehouses/${rtv.warehouse.id}`}
                className="font-semibold hover:underline block"
              >
                {rtv.warehouse.name}
              </Link>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(rtv.grandTotal)}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(rtv.subTotal)}</span>
              </div>
              {rtv.tax && rtv.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(rtv.tax)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RTV Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPackage className="h-5 w-5" aria-hidden="true" />
            Return Items
          </CardTitle>
          <CardDescription>
            {rtv.items.length} item{rtv.items.length !== 1 ? "s" : ""} in this return
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rtv.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FiPackage className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items in this return</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rtv.items.map((item: any) => (
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
                          {item.variant && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Variant: SKU {item.variant.sku}
                              {item.variant.size && ` | Size: ${item.variant.size}`}
                              {item.variant.color && ` | Color: ${item.variant.color}`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.reason || "-"}
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
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Subtotal</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(rtv.subTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tax</p>
                  <p className="text-2xl font-bold">
                    {rtv.tax && rtv.tax > 0 ? formatCurrency(rtv.tax) : formatCurrency(0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(rtv.grandTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Audit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiClock className="h-5 w-5" aria-hidden="true" />
            Audit Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FiCalendar className="h-4 w-4" />
              Created At
            </p>
            <p>{format(new Date(rtv.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FiClock className="h-4 w-4" />
              Last Updated
            </p>
            <p>{format(new Date(rtv.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
