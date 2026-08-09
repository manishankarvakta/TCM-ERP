"use client";

import React, { useState } from "react";
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
import { FiArrowLeft, FiEdit, FiFileText, FiUser, FiCalendar, FiClock, FiHome, FiPrinter, FiBookOpen } from "react-icons/fi";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import type { SaleStatus } from "@prisma/client";
import PosReceiptPrint from "./pos-receipt-print";
import { numberToWords } from "@/lib/utils/number-to-words";
import PrintHeader, { PrintStyle } from "@/app/(dashboard)/dashboard/procurements/_components/print-header";

interface SaleDetailsClientProps {
  sale: any;
  organization?: any;
  cashAccount: any;
  cardAccount: any;
  mfsAccount: any;
  couponDiscountAccount?: { code: string; name: string } | null;
  salesDiscountAccount?: { code: string; name: string } | null;
  extractedMembershipDiscount: number;
  vouchers?: any[];
  isAdmin?: boolean;
}

const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: "Draft",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURN: "Return",
};

export default function SaleDetailsClient({
  sale,
  organization,
  cashAccount,
  cardAccount,
  mfsAccount,
  couponDiscountAccount,
  salesDiscountAccount,
  extractedMembershipDiscount,
  vouchers = [],
  isAdmin = false,
}: SaleDetailsClientProps) {
  const [printMode, setPrintMode] = useState<"a4" | "challan">("a4");

  // Calculate discount splits
  const totalSaleAmount = sale.items.reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const totalDiscount = Number(sale.discount || 0);
  const totalItems = sale.items.length;
  const totalQuantity = sale.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  let couponDiscount = 0;
  if (sale.coupon && totalDiscount > 0) {
    const couponVal = Number(sale.coupon.value);
    if (sale.coupon.discountType === "PERCENTAGE") {
      couponDiscount = Number((totalSaleAmount * (couponVal / 100)).toFixed(2));
    } else {
      couponDiscount = couponVal;
    }
    couponDiscount = Math.min(couponDiscount, totalDiscount);
  }
  const generalDiscount = Number((totalDiscount - couponDiscount).toFixed(2));

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

  const handlePrint = (mode: "a4" | "challan") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const paymentDetails = sale.paymentDetails as {
    cashAmount?: number;
    cashAccountId?: string;
    cardAmount?: number;
    cardAccountId?: string;
    mfsAmount?: number;
    mfsAccountId?: string;
    changeAmount?: number;
  } | null;

  const initialPaid = paymentDetails 
    ? (Number(paymentDetails.cashAmount || 0) + Number(paymentDetails.cardAmount || 0) + Number(paymentDetails.mfsAmount || 0) - Number(paymentDetails.changeAmount || 0))
    : 0;

  let dueCollectionsPaid = 0;
  if (paymentDetails && Array.isArray((paymentDetails as any).dueCollections)) {
    for (const col of (paymentDetails as any).dueCollections) {
      dueCollectionsPaid += Number(col.cashAmount || 0) + Number(col.cardAmount || 0) + Number(col.mfsAmount || 0);
    }
  }

  const grandTotalAmount = Number(sale.grandTotal || 0);
  const netPaid = initialPaid + dueCollectionsPaid;
  const remainingDue = Number((grandTotalAmount - netPaid).toFixed(2));

  let paymentStatus: "PAID" | "DUE" | "PARTIAL" = "PAID";
  if (remainingDue <= 0.01 || netPaid >= grandTotalAmount - 0.01) {
    paymentStatus = "PAID";
  } else if (netPaid <= 0.01 || initialPaid <= 0) {
    paymentStatus = "DUE";
  } else {
    paymentStatus = "PARTIAL";
  }

  const totalReceived = paymentDetails 
    ? (Number(paymentDetails.cashAmount || 0) + Number(paymentDetails.cardAmount || 0) + Number(paymentDetails.mfsAmount || 0))
    : 0;
  const changeAmount = paymentDetails ? Number(paymentDetails.changeAmount || 0) : 0;

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only: multi-page print fix + page numbering */}
      <PrintStyle />

      {/* Print-only Invoice/Challan Header */}
      <PrintHeader
        docNumber={sale.saleNumber}
        docTitle={printMode === "challan" ? "DELIVERY CHALLAN" : "SALES INVOICE"}
        organizationName={organization?.name}
        organizationAddress={organization?.address}
        organizationEmail={organization?.email}
        organizationPhone={organization?.phone}
      />

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{sale.saleNumber}</h1>
            <Badge variant={getStatusBadgeVariant(sale.status as SaleStatus)} className="text-sm px-3 py-1">
              {STATUS_LABELS[sale.status as SaleStatus]}
            </Badge>
            <Badge
              className={`text-sm px-3 py-1 border font-bold uppercase ${
                paymentStatus === "PAID"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : paymentStatus === "PARTIAL"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-600 border-rose-500/30"
              }`}
            >
              {paymentStatus === "PAID" ? "Paid" : paymentStatus === "PARTIAL" ? "Partial Paid" : "Due"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Sale Details</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/sales">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <PosReceiptPrint sale={sale} />
          
          <Button variant="outline" onClick={() => handlePrint("a4")}>
            <FiPrinter className="mr-2 h-4 w-4" /> Print A4
          </Button>
          
          <Button variant="outline" onClick={() => handlePrint("challan")}>
            <FiPrinter className="mr-2 h-4 w-4" /> Print Challan
          </Button>

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

      {/* Main Information Grid (Single Card 3-Column Layout matching TPN/GRN/RTV) */}
      <Card className="print:shadow-none print:border-0 print:bg-transparent">
        <CardContent className="pt-6 print:p-1.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            {/* Col 1: Customer Details */}
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Customer Details</p>
              {sale.client ? (
                <div>
                  <p className="text-base font-bold print:text-xs text-slate-900">
                    {sale.client.name || sale.client.company || sale.client.email}
                  </p>
                  <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                    {sale.client.company && sale.client.name && <p>{sale.client.company}</p>}
                    {sale.client.phone && <p>Phone: {sale.client.phone}</p>}
                    {sale.client.email && <p>Email: {sale.client.email}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground print:text-[9px]">Walk-in Customer</p>
              )}
            </div>

            {/* Col 2: Outlet / Warehouse */}
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Outlet / Warehouse</p>
              {sale.warehouse ? (
                <div>
                  <p className="text-base font-bold print:text-xs text-slate-900">{sale.warehouse.name}</p>
                  {sale.warehouse.address ? (
                    <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                      <p>{sale.warehouse.address}</p>
                      {(sale.warehouse.city || sale.warehouse.state || sale.warehouse.zip || sale.warehouse.country) && (
                        <p>
                          {[
                            sale.warehouse.city,
                            sale.warehouse.state,
                            sale.warehouse.zip,
                            sale.warehouse.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground print:text-[9px] mt-0.5">Code: {sale.warehouse.code}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground print:text-[9px]">Not assigned</p>
              )}
            </div>

            {/* Col 3: Sale Information (Right Aligned) */}
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Sale Information</p>
              <div className="space-y-1 text-sm print:text-xs">
                <p>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium text-slate-900">{format(new Date(sale.date), "dd MMMM yyyy")}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-semibold uppercase text-slate-800">{STATUS_LABELS[sale.status as SaleStatus]}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Payment: </span>
                  <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded border ${
                    paymentStatus === "PAID"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : paymentStatus === "PARTIAL"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                  }`}>
                    {paymentStatus === "PAID" ? "Paid" : paymentStatus === "PARTIAL" ? "Partial Paid" : "Due"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
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
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={getStatusBadgeVariant(sale.status as SaleStatus)} className="text-sm">
                  {STATUS_LABELS[sale.status as SaleStatus]}
                </Badge>
                <Badge
                  className={`text-sm border font-bold uppercase ${
                    paymentStatus === "PAID"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : paymentStatus === "PARTIAL"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                  }`}
                >
                  {paymentStatus === "PAID" ? "Paid" : paymentStatus === "PARTIAL" ? "Partial Paid" : "Due"}
                </Badge>
              </div>
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
            {sale.createdByUser && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Biller / Cashier</p>
                  <p className="text-sm font-medium">{sale.createdByUser.name}</p>
                </div>
              </>
            )}
            {sale.salesAssistant && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Sales Assistant</p>
                  <p className="text-sm font-semibold text-primary">{sale.salesAssistant.name}</p>
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
                    Discount {sale.coupon ? `(${sale.coupon.code})` : ""}
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
              {totalReceived > 0 && (
                <div className="flex items-center justify-between text-sm border-t pt-1.5 border-muted mt-1.5">
                  <span className="text-muted-foreground">Total Received</span>
                  <span className="font-medium">{formatCurrency(totalReceived)}</span>
                </div>
              )}
              {changeAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Change Amount</span>
                  <span className="font-medium">{formatCurrency(changeAmount)}</span>
                </div>
              )}
              {((paymentDetails && (Number(paymentDetails.cashAmount || 0) > 0 || Number(paymentDetails.cardAmount || 0) > 0 || Number(paymentDetails.mfsAmount || 0) > 0)) || totalDiscount > 0 || sale.orderType === "RETURN" || Number(sale.subTotal) < 0 || (vouchers && vouchers.length > 0)) && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {sale.orderType === "RETURN" || Number(sale.subTotal) < 0 ? "Return Refund & Account Details" : "Payment Split Details"}
                    </p>

                    {(sale.orderType === "RETURN" || Number(sale.subTotal) < 0) ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start text-xs gap-2">
                          <span className="text-muted-foreground text-left leading-normal">
                            Refund Account {cashAccount ? `(${cashAccount.code} - ${cashAccount.name})` : (sale.client?.name ? `(AR - ${sale.client.name})` : "")}
                          </span>
                          <span className="font-semibold shrink-0 text-red-600">
                            {formatCurrency(Math.abs(Number(sale.grandTotal)))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {paymentDetails && Number(paymentDetails.cashAmount || 0) > 0 && (
                          (() => {
                            const cashAmount = Number(paymentDetails.cashAmount || 0);
                            const changeAmt = Number(paymentDetails.changeAmount || 0);
                            const netCash = cashAmount - changeAmt;
                            return (
                              <div className="flex justify-between items-start text-xs gap-2">
                                <span className="text-muted-foreground text-left leading-normal">
                                  Cash {cashAccount ? `(${cashAccount.code} - ${cashAccount.name})` : ""}
                                </span>
                                <span className="font-semibold shrink-0">{formatCurrency(netCash)}</span>
                              </div>
                            );
                          })()
                        )}
                        {paymentDetails && Number(paymentDetails.cardAmount || 0) > 0 && (
                          <div className="flex justify-between items-start text-xs gap-2">
                            <span className="text-muted-foreground text-left leading-normal">
                              Card {cardAccount ? `(${cardAccount.code} - ${cardAccount.name})` : ""}
                            </span>
                            <span className="font-semibold shrink-0">{formatCurrency(Number(paymentDetails.cardAmount))}</span>
                          </div>
                        )}
                        {paymentDetails && Number(paymentDetails.mfsAmount || 0) > 0 && (
                          <div className="flex justify-between items-start text-xs gap-2">
                            <span className="text-muted-foreground text-left leading-normal">
                              MFS {mfsAccount ? `(${mfsAccount.code} - ${mfsAccount.name})` : ""}
                            </span>
                            <span className="font-semibold shrink-0">{formatCurrency(Number(paymentDetails.mfsAmount))}</span>
                          </div>
                        )}
                        {couponDiscount > 0 && (
                          <div className="flex justify-between items-start text-xs gap-2">
                            <span className="text-muted-foreground text-left leading-normal">
                              Coupon Discount {couponDiscountAccount ? `(${couponDiscountAccount.code} - ${couponDiscountAccount.name})` : ""}
                            </span>
                            <span className="font-semibold shrink-0 text-green-600">-{formatCurrency(couponDiscount)}</span>
                          </div>
                        )}
                        {generalDiscount > 0 && (
                          <div className="flex justify-between items-start text-xs gap-2">
                            <span className="text-muted-foreground text-left leading-normal">
                              Sales Discount {salesDiscountAccount ? `(${salesDiscountAccount.code} - ${salesDiscountAccount.name})` : ""}
                            </span>
                            <span className="font-semibold shrink-0 text-green-600">-{formatCurrency(generalDiscount)}</span>
                          </div>
                        )}
                        {remainingDue > 0.01 && (
                          <div className="flex justify-between items-start text-xs gap-2 pt-1.5 border-t border-dashed border-border text-rose-600 font-bold">
                            <span>Remaining Due Balance:</span>
                            <span>{formatCurrency(remainingDue)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sale Items */}
      <Card className="print:shadow-none print:border-0 print:pt-0">
        <CardHeader className="print:p-0 print:pb-2">
          <CardTitle className="flex items-center gap-2 print:text-base print:font-semibold">
            <FiFileText className="h-5 w-5 print:hidden" />
            Sale Items
          </CardTitle>
          <CardDescription className="print:hidden">
            {sale.items.length} item{sale.items.length !== 1 ? "s" : ""} in this sale
          </CardDescription>
        </CardHeader>
        <CardContent className="print:p-0">
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
                    <TableHead className="w-8 print:py-1 print:px-2 print:text-xs">#</TableHead>
                    <TableHead className="print:py-1 print:px-2 print:text-xs">Item Code</TableHead>
                    <TableHead className="print:py-1 print:px-2 print:text-xs">Description</TableHead>
                    <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Quantity</TableHead>
                    <TableHead className={`text-right print:py-1 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>Unit Price</TableHead>
                    <TableHead className={`text-right print:py-1 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item: any, index: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="print:py-1.5 print:px-2 print:text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="print:py-1.5 print:px-2">
                        {item.item ? (
                          <Link
                            href={`/dashboard/master/items/${item.item.id}`}
                            className="font-mono text-sm hover:underline print:text-slate-900 print:no-underline print:text-xs"
                          >
                            {item.item.code}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="print:py-1.5 print:px-2">
                        <div>
                          <p className="font-medium print:text-xs">{item.description}</p>
                          {item.item && (
                            <p className="text-xs text-muted-foreground print:text-[10px]">{item.item.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                        {item.quantity.toFixed(2)}
                        {item.item?.unit?.symbol && ` ${item.item.unit.symbol}`}
                      </TableCell>
                      <TableCell className={`text-right font-mono print:py-1.5 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {sale.items.length > 0 && (
                    <TableRow className="font-bold bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={3} className="print:py-1.5 print:px-2 print:text-xs">Total</TableCell>
                      <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                        {totalQuantity.toFixed(2)}
                      </TableCell>
                      <TableCell className={`print:py-1.5 print:px-2 ${printMode === "challan" ? "print:hidden" : ""}`}></TableCell>
                      <TableCell className={`text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>
                        {formatCurrency(totalSaleAmount)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Financial Summary Cards */}
          <div className={`mt-6 grid grid-cols-1 md:grid-cols-5 gap-4 print:grid-cols-5 print:gap-2 ${printMode === "challan" ? "print:hidden" : ""}`}>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Subtotal</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {formatCurrency(sale.subTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">
                    {sale.discount && sale.discount > 0 ? "Discount" : "Tax"}
                  </p>
                  <p className="text-2xl font-bold print:text-sm">
                    {sale.discount && sale.discount > 0
                      ? `-${formatCurrency(sale.discount)}`
                      : sale.tax && sale.tax > 0
                      ? formatCurrency(sale.tax)
                      : formatCurrency(0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Items</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {totalItems}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Quantity</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {totalQuantity.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Grand Total</p>
                  <p className="text-2xl font-bold text-primary print:text-slate-900 print:text-base">
                    {formatCurrency(sale.grandTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Amount In Words */}
          <div className={`border-t border-b border-slate-200 py-3 mt-6 print:py-1.5 print:mt-2 ${printMode === "challan" ? "print:hidden" : ""}`}>
            <p className="text-sm print:text-[11px] text-slate-800">
              <span className="font-bold italic">In Words: </span>
              <span className="italic">{numberToWords(sale.grandTotal)}</span>
            </p>
          </div>

          {/* Note / Terms */}
          {sale.notes && (
            <div className="mt-4 print:mt-2 text-left">
              <p className="text-xs font-semibold uppercase text-slate-500">Note / Terms:</p>
              <p className="text-sm print:text-xs text-slate-700 mt-1 whitespace-pre-wrap">{sale.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accounting Vouchers & Ledger Entries (Admin Only) */}
      {isAdmin && vouchers && vouchers.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FiBookOpen className="h-5 w-5 text-primary" />
              Accounting Vouchers & General Ledger Impact
            </CardTitle>
            <CardDescription>
              Double-entry journal vouchers posted for this transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {vouchers.map((v: any) => (
              <div key={v.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/accounts/vouchers/${v.id}`} className="font-mono text-sm font-bold text-primary hover:underline">
                      {v.voucherNumber}
                    </Link>
                    <Badge variant="outline" className="text-xs uppercase font-mono">{v.type}</Badge>
                    <Badge variant={v.status === "posted" ? "default" : "secondary"} className="text-xs uppercase">
                      {v.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{v.reference}</p>
                </div>
                <p className="text-xs text-muted-foreground">{v.description}</p>
                
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 text-xs">#</TableHead>
                        <TableHead className="text-xs">Account Code</TableHead>
                        <TableHead className="text-xs">Account Name & Description</TableHead>
                        <TableHead className="text-right text-xs">Debit (৳)</TableHead>
                        <TableHead className="text-right text-xs">Credit (৳)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {v.VoucherLine?.map((line: any) => (
                        <TableRow key={line.id || line.lineNumber}>
                          <TableCell className="text-xs text-muted-foreground font-mono">{line.lineNumber}</TableCell>
                          <TableCell className="text-xs font-mono font-medium">{line.ChartOfAccount?.code || "-"}</TableCell>
                          <TableCell className="text-xs">
                            <span className="font-semibold text-slate-800">{line.ChartOfAccount?.name || "-"}</span>
                            {line.ChartOfAccount?.type && (
                              <span className="ml-2 text-[10px] text-muted-foreground font-mono">({line.ChartOfAccount.type})</span>
                            )}
                            {line.description && <p className="text-[11px] text-muted-foreground">{line.description}</p>}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-medium">
                            {Number(line.debitAmount) > 0 ? formatCurrency(Number(line.debitAmount)) : "-"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-medium">
                            {Number(line.creditAmount) > 0 ? formatCurrency(Number(line.creditAmount)) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Status Timeline & Audit Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
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

      {/* Print-only Signatures */}
      <div className="hidden print:block mt-12 pt-4">
        <div className="flex justify-between gap-8 text-center">
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <p className="text-xs font-medium mb-1 text-slate-700">
              {sale.createdByUser?.name || sale.createdByUser?.email || "System"}
            </p>
            <div className="border-t border-slate-300 w-3/4 mx-auto pt-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Prepared By</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <div className="border-t border-slate-300 w-3/4 mx-auto pt-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Verified By</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <div className="border-t border-slate-300 w-3/4 mx-auto pt-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Approved By</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only Footer */}
      <div className="hidden print:block mt-6 text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
        <p>Generated by Ferrari Fashion ERP on {format(new Date(), "PPpp")}</p>
      </div>
    </div>
  );
}
