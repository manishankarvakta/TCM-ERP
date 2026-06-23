import React from "react";
import { getSaleById } from "../../_actions/sale.action";
import { prisma } from "@/lib/prisma";
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
import { FiArrowLeft, FiEdit, FiFileText, FiUser, FiCalendar, FiClock, FiHome, FiCheckCircle } from "react-icons/fi";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import type { SaleStatus } from "@prisma/client";
import PageGuard from "@/components/permissions/page-guard";
import PosReceiptPrint from "./_components/pos-receipt-print";

interface SaleDetailsPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: "Draft",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURN: "Return",
};

export default async function SaleDetailsPage({ params }: SaleDetailsPageProps) {
  const { id } = await params;

  const result = await getSaleById(id);

  if (!result.success || !result.sale) {
    notFound();
  }

  const sale = result.sale;

  const notesStr = sale.notes || "";
  let extractedMembershipDiscount = 0;
  const match = notesStr.match(/Includes Membership Discount of ৳([\d.]+)/);
  if (match && match[1]) {
    extractedMembershipDiscount = Number(match[1]);
  }

  const paymentDetails = (sale as any).paymentDetails as {
    cashAmount?: number;
    cashAccountId?: string;
    cardAmount?: number;
    cardAccountId?: string;
    mfsAmount?: number;
    mfsAccountId?: string;
  } | null;

  let cashAccount = null;
  let cardAccount = null;
  let mfsAccount = null;

  if (paymentDetails) {
    if (paymentDetails.cashAccountId) {
      cashAccount = await prisma.chartOfAccount.findUnique({
        where: { id: paymentDetails.cashAccountId },
        select: { code: true, name: true }
      });
    }
    if (paymentDetails.cardAccountId) {
      cardAccount = await prisma.chartOfAccount.findUnique({
        where: { id: paymentDetails.cardAccountId },
        select: { code: true, name: true }
      });
    }
    if (paymentDetails.mfsAccountId) {
      mfsAccount = await prisma.chartOfAccount.findUnique({
        where: { id: paymentDetails.mfsAccountId },
        select: { code: true, name: true }
      });
    }
  }

  const getStatusBadgeVariant = (status: SaleStatus) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "COMPLETED":
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
    <PageGuard permissionKey="sales.sales" requiredOperation="view">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{sale.saleNumber}</h1>
            <Badge variant={getStatusBadgeVariant(sale.status)} className="text-sm px-3 py-1">
              {STATUS_LABELS[sale.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Sale Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/sales">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <PosReceiptPrint sale={sale} />
          {sale.status === "DRAFT" && (
            <Button asChild>
              <Link href={`/dashboard/sales/${sale.id}/edit`}>
                <FiEdit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiFileText className="h-5 w-5" />
              Sale Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Sale Number</p>
              <p className="font-mono text-lg font-semibold">{sale.saleNumber}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusBadgeVariant(sale.status)} className="text-sm">
                {STATUS_LABELS[sale.status]}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Sale Date</p>
              <p className="font-medium">
                {format(new Date(sale.date), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(sale.date), "EEEE, h:mm a")}
              </p>
            </div>
            {sale.completedAt && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                  <p className="font-medium">
                    {format(new Date(sale.completedAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(sale.completedAt), "EEEE, h:mm a")}
                  </p>
                </div>
              </>
            )}
            {sale.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{sale.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiUser className="h-5 w-5" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Client Name</p>
              <Link
                href={`/dashboard/clients/${sale.client.id}`}
                className="font-semibold text-lg hover:underline block"
              >
                {sale.client.name || sale.client.email}
              </Link>
              {sale.client.company && (
                <p className="text-xs text-muted-foreground">{sale.client.company}</p>
              )}
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{sale.client.email}</p>
            </div>
            {sale.client.phone && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{sale.client.phone}</p>
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
            {sale.warehouse ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
                  <Link
                    href={`/dashboard/master/warehouses/${sale.warehouse.id}`}
                    className="font-semibold hover:underline block"
                  >
                    {sale.warehouse.name}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono">{sale.warehouse.code}</p>
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
                {formatCurrency(sale.grandTotal)}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(sale.subTotal)}</span>
              </div>
              {sale.discount && Number(sale.discount) > 0 && (Number(sale.discount) - extractedMembershipDiscount) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount {(sale as any).coupon ? `(${(sale as any).coupon.code})` : ""}
                  </span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(Number(sale.discount) - extractedMembershipDiscount)}
                  </span>
                </div>
              )}
              {extractedMembershipDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Membership Discount
                  </span>
                  <span className="font-medium text-amber-600">
                    -{formatCurrency(extractedMembershipDiscount)}
                  </span>
                </div>
              )}
              {sale.tax && sale.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(sale.tax)}</span>
                </div>
              )}
              {paymentDetails && (Number(paymentDetails.cashAmount || 0) > 0 || Number(paymentDetails.cardAmount || 0) > 0 || Number(paymentDetails.mfsAmount || 0) > 0) && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Payment Split Details</p>
                    {Number(paymentDetails.cashAmount || 0) > 0 && (
                      <div className="flex justify-between items-start text-xs gap-2">
                        <span className="text-muted-foreground text-left leading-normal">
                          Cash {cashAccount ? `(${cashAccount.code} - ${cashAccount.name})` : ""}
                        </span>
                        <span className="font-semibold shrink-0">{formatCurrency(Number(paymentDetails.cashAmount))}</span>
                      </div>
                    )}
                    {Number(paymentDetails.cardAmount || 0) > 0 && (
                      <div className="flex justify-between items-start text-xs gap-2">
                        <span className="text-muted-foreground text-left leading-normal">
                          Card {cardAccount ? `(${cardAccount.code} - ${cardAccount.name})` : ""}
                        </span>
                        <span className="font-semibold shrink-0">{formatCurrency(Number(paymentDetails.cardAmount))}</span>
                      </div>
                    )}
                    {Number(paymentDetails.mfsAmount || 0) > 0 && (
                      <div className="flex justify-between items-start text-xs gap-2">
                        <span className="text-muted-foreground text-left leading-normal">
                          MFS {mfsAccount ? `(${mfsAccount.code} - ${mfsAccount.name})` : ""}
                        </span>
                        <span className="font-semibold shrink-0">{formatCurrency(Number(paymentDetails.mfsAmount))}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sale Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiFileText className="h-5 w-5" />
            Sale Items
          </CardTitle>
          <CardDescription>
            {sale.items.length} item{sale.items.length !== 1 ? "s" : ""} in this sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sale.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FiFileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items in this sale</p>
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
                  {sale.items.map((item) => (
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
                    {formatCurrency(sale.subTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {sale.discount && sale.discount > 0 ? "Discount" : "Tax"}
                  </p>
                  <p className="text-2xl font-bold">
                    {sale.discount && sale.discount > 0
                      ? `-${formatCurrency(sale.discount)}`
                      : sale.tax && sale.tax > 0
                      ? formatCurrency(sale.tax)
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
                    {formatCurrency(sale.grandTotal)}
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
                  sale.status === "DRAFT" || sale.status === "COMPLETED" || sale.status === "CANCELLED"
                    ? "bg-blue-600" : "bg-muted"
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Draft</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sale.createdAt), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">Sale created</p>
                </div>
              </div>

              {sale.status === "COMPLETED" && sale.completedAt && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-green-600">Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.completedAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sale completed, stock deducted, and accounting entries created
                    </p>
                  </div>
                </div>
              )}

              {sale.status === "CANCELLED" && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-red-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-red-600">Cancelled</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.updatedAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">Sale cancelled</p>
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
            {sale.createdByUser && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FiUser className="h-4 w-4" />
                    Created By
                  </p>
                  <p className="font-medium">
                    {sale.createdByUser.name || sale.createdByUser.email}
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
              <p>{format(new Date(sale.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                Last Updated
              </p>
              <p>{format(new Date(sale.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </PageGuard>
  );
}
