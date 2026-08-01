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
import PrintButton from "@/app/(dashboard)/dashboard/procurements/purchases/_components/print-button";
import { numberToWords } from "@/lib/utils/number-to-words";
import PrintHeader, { PrintStyle } from "@/app/(dashboard)/dashboard/procurements/_components/print-header";
import { prisma } from "@/lib/prisma";

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

  const [result, org] = await Promise.all([
    getReturnToVendorById(id),
    prisma.organization.findFirst({ where: { status: "active" } }).catch(() => null),
  ]);

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

  const totalQuantity = rtv.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only: multi-page print fix + page numbering */}
      <PrintStyle />

      {/* Print-only Invoice Header */}
      <PrintHeader
        docNumber={rtv.rtvNumber}
        docTitle="Return To Vendor"
        organizationName={org?.name}
        organizationAddress={org?.address}
        organizationEmail={org?.email}
        organizationPhone={org?.phone}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
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
          <PrintButton />
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

      {/* Main Information Grid (Single Card 3-Column Layout) */}
      <Card className="print:shadow-none print:border-0 print:bg-transparent">
        <CardContent className="pt-6 print:p-1.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
            {/* Col 1: Supplier Details */}
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Supplier Details</p>
              {rtv.supplier ? (
                <div>
                  <p className="text-base font-bold print:text-xs text-slate-900">
                    {rtv.supplier.name || rtv.supplier.company || rtv.supplier.email}
                  </p>
                  <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                    {rtv.supplier.phone && <p>Phone: {rtv.supplier.phone}</p>}
                    {rtv.supplier.email && <p>Email: {rtv.supplier.email}</p>}
                    {rtv.purchase && (
                      <p className="pt-0.5 font-medium text-slate-700">
                        PO Ref: {rtv.purchase.purchaseNumber}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground print:text-[9px]">N/A</p>
              )}
            </div>

            {/* Col 2: Warehouse Details */}
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Warehouse Details</p>
              <p className="text-base font-bold print:text-xs text-slate-900">{rtv.warehouse.name}</p>
              {rtv.warehouse.address ? (
                <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                  <p>{rtv.warehouse.address}</p>
                  {(rtv.warehouse.city || rtv.warehouse.state || rtv.warehouse.zip || rtv.warehouse.country) && (
                    <p>
                      {[
                        rtv.warehouse.city,
                        rtv.warehouse.state,
                        rtv.warehouse.zip,
                        rtv.warehouse.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground print:text-[9px] mt-0.5">Code: {rtv.warehouse.code}</p>
              )}
            </div>

            {/* Col 3: Return Information (Right Aligned) */}
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Return Information</p>
              <div className="space-y-1 text-sm print:text-xs">
                <p>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium text-slate-900">{format(new Date(rtv.date), "dd MMMM yyyy")}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-semibold uppercase text-slate-800">{STATUS_LABELS[rtv.status]}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RTV Items */}
      <Card className="print:shadow-none print:border-0 print:bg-transparent">
        <CardHeader className="print:p-1.5 print:pb-0">
          <CardTitle className="flex items-center gap-2 print:text-xs">
            <FiPackage className="h-5 w-5 print:h-4 print:w-4" aria-hidden="true" />
            Return Items
          </CardTitle>
          <CardDescription className="print:hidden">
            {rtv.items.length} item{rtv.items.length !== 1 ? "s" : ""} in this return
          </CardDescription>
        </CardHeader>
        <CardContent className="print:p-1.5">
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
                    <TableHead className="w-8 print:py-1 print:px-2 print:text-xs">#</TableHead>
                    <TableHead className="print:py-1 print:px-2 print:text-xs">Item Code</TableHead>
                    <TableHead className="print:py-1 print:px-2 print:text-xs">Description</TableHead>
                    <TableHead className="print:py-1 print:px-2 print:text-xs">Reason</TableHead>
                    <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Quantity</TableHead>
                    <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Unit Price</TableHead>
                    <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rtv.items.map((item: any, index: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="print:py-1.5 print:px-2 print:text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="print:py-1.5 print:px-2 print:text-xs">
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
                          {item.variant && (
                            <p className="text-xs text-muted-foreground mt-1 print:text-[10px]">
                              Variant: SKU {item.variant.sku}
                              {item.variant.size && ` | Size: ${item.variant.size}`}
                              {item.variant.color && ` | Color: ${item.variant.color}`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground print:py-1.5 print:px-2 print:text-xs">
                        {item.reason || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                        {item.quantity.toFixed(2)}
                        {item.item?.unit?.symbol && ` ${item.item.unit.symbol}`}
                      </TableCell>
                      <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rtv.items.length > 0 && (
                    <TableRow className="font-bold bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={4} className="print:py-1.5 print:px-2 print:text-xs">Total</TableCell>
                      <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                        {totalQuantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right print:py-1.5 print:px-2"></TableCell>
                      <TableCell className="text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs">
                        {formatCurrency(rtv.subTotal)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Financial Summary Cards */}
          <div className="mt-6 print:mt-2 grid grid-cols-1 md:grid-cols-5 gap-4 print:grid-cols-5 print:gap-2">
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Subtotal</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {formatCurrency(rtv.subTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Tax</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {rtv.tax && rtv.tax > 0 ? formatCurrency(rtv.tax) : formatCurrency(0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Items</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {rtv.items.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Quantity Returned</p>
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
                    {formatCurrency(rtv.grandTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Amount In Words */}
          <div className="border-t border-b border-slate-200 py-3 mt-6 print:py-1.5 print:mt-2">
            <p className="text-sm print:text-[11px] text-slate-800 text-left">
              <span className="font-bold italic">In Words: </span>
              <span className="italic">{numberToWords(rtv.grandTotal)}</span>
            </p>
          </div>

          {/* Note / Terms */}
          {rtv.notes && (
            <div className="mt-4 print:mt-2 text-left">
              <p className="text-xs font-semibold uppercase text-slate-500">Note / Terms:</p>
              <p className="text-sm print:text-xs text-slate-700 mt-1 whitespace-pre-wrap">{rtv.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Information */}
      <Card className="print:hidden">
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

      {/* Print-only Signatures */}
      <div className="hidden print:block mt-12 pt-4">
        <div className="flex justify-between gap-8 text-center">
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <p className="text-xs font-medium mb-1 text-slate-700">
              {rtv.creator?.name || rtv.creator?.email || "System"}
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
