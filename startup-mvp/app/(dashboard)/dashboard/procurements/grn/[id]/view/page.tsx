import React from "react";
import { getGRNById } from "../../_actions/grn.action";
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
import { FiArrowLeft, FiFileText, FiPackage, FiUser, FiCalendar, FiClock, FiHome } from "react-icons/fi";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import type { GRNStatus } from "@prisma/client";
import PrintButton from "@/app/(dashboard)/dashboard/procurements/purchases/_components/print-button";
import GRNStatusActions from "../../_components/grn-status-actions";
import { numberToWords } from "@/lib/utils/number-to-words";
import PrintHeader, { PrintStyle } from "@/app/(dashboard)/dashboard/procurements/_components/print-header";
import { prisma } from "@/lib/prisma";

interface GRNDetailsPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<GRNStatus, string> = {
  DRAFT: "Draft",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function GRNDetailsPage({ params }: GRNDetailsPageProps) {
  const { id } = await params;

  const [result, org] = await Promise.all([
    getGRNById(id),
    prisma.organization.findFirst({ where: { status: "active" } }).catch(() => null),
  ]);

  if (!result.success || !result.grn) {
    notFound();
  }

  const grn = result.grn;

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalAmount = grn.items.reduce((sum, item) => {
    const unitPrice = item.purchaseItem 
      ? Number(item.purchaseItem.unitPrice) 
      : (item.variant?.costPrice 
          ? Number(item.variant.costPrice) 
          : (item.item?.costPrice ? Number(item.item.costPrice) : 0));
    return sum + (Number(item.receivedQuantity) * unitPrice);
  }, 0);

  const totalReceivedQuantity = grn.items.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);

  const getStatusBadgeVariant = (status: GRNStatus) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "COMPLETED":
        return "default";
      default:
        return "secondary";
    }
  };

  const sourceType = grn.purchaseId ? "Purchase" : grn.tpnId ? "TPN" : "Unknown";
  const sourceNumber = grn.purchase?.purchaseNumber || grn.tpn?.tpnNumber || "N/A";

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only: multi-page print fix + page numbering */}
      <PrintStyle />

      {/* Print-only Invoice Header */}
      <PrintHeader
        docNumber={grn.grnNumber}
        docTitle="Goods Receipt Note"
        organizationName={org?.name}
        organizationAddress={org?.address}
        organizationEmail={org?.email}
        organizationPhone={org?.phone}
      />

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{grn.grnNumber}</h1>
            <Badge variant={getStatusBadgeVariant(grn.status)} className="text-sm px-3 py-1">
              {STATUS_LABELS[grn.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Goods Receipt Note Details</p>
        </div>
        <div className="flex items-center gap-2">
          <GRNStatusActions grnId={grn.id} status={grn.status} />
          <PrintButton />
          <Button variant="ghost" asChild>
            <Link href="/dashboard/procurements/grn">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Information Grid (Single Card 4-Column Layout) */}
      <Card className="print:shadow-none print:border-0 print:bg-transparent">
        <CardContent className="pt-6 print:p-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3">
            {/* Col 1: Source Document */}
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Source Document</p>
              {grn.purchase ? (
                <div className="space-y-1 text-xs print:text-[9px]">
                  <p>
                    <span className="text-muted-foreground">Type: </span>
                    <span className="font-semibold text-slate-800">Purchase Order</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">PO No: </span>
                    <Link
                      href={`/dashboard/procurements/purchases/${grn.purchase.id}/view`}
                      className="font-bold text-slate-900 hover:underline print:no-underline"
                    >
                      {grn.purchase.purchaseNumber}
                    </Link>
                  </p>
                  <p>
                    <span className="text-muted-foreground">PO Date: </span>
                    <span className="font-medium text-slate-900">
                      {format(new Date(grn.purchase.date), "dd MMM yyyy")}
                    </span>
                  </p>
                </div>
              ) : grn.tpn ? (
                <div className="space-y-1 text-xs print:text-[9px]">
                  <p>
                    <span className="text-muted-foreground">Type: </span>
                    <span className="font-semibold text-slate-800">Transfer Note</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">TPN No: </span>
                    <Link
                      href={`/dashboard/procurements/tpn`}
                      className="font-bold text-slate-900 hover:underline print:no-underline"
                    >
                      {grn.tpn.tpnNumber}
                    </Link>
                  </p>
                  <p>
                    <span className="text-muted-foreground">TPN Date: </span>
                    <span className="font-medium text-slate-900">
                      {format(new Date(grn.tpn.date), "dd MMM yyyy")}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-sm font-bold print:text-xs text-slate-900">
                  {sourceType}: {sourceNumber}
                </p>
              )}
            </div>

            {/* Col 2: Supplier / Origin */}
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">
                {grn.purchase ? "Supplier Details" : grn.tpn ? "Source Warehouse" : "Origin Info"}
              </p>
              {grn.purchase?.supplier ? (
                <div>
                  <p className="text-base font-bold print:text-xs text-slate-900">
                    {grn.purchase.supplier.name || grn.purchase.supplier.company || grn.purchase.supplier.email}
                  </p>
                  <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                    {grn.purchase.supplier.phone && <p>Phone: {grn.purchase.supplier.phone}</p>}
                    {grn.purchase.supplier.email && <p>Email: {grn.purchase.supplier.email}</p>}
                  </div>
                </div>
              ) : grn.tpn?.sourceWarehouse ? (
                <div>
                  <p className="text-base font-bold print:text-xs text-slate-900">
                    {grn.tpn.sourceWarehouse.name}
                  </p>
                  {grn.tpn.sourceWarehouse.address && (
                    <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                      <p>{grn.tpn.sourceWarehouse.address}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground print:text-[9px]">N/A</p>
              )}
            </div>

            {/* Col 3: Destination Warehouse */}
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Destination Warehouse</p>
              <p className="text-base font-bold print:text-xs text-slate-900">{grn.warehouse.name}</p>
              {grn.warehouse.address ? (
                <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                  <p>{grn.warehouse.address}</p>
                  {(grn.warehouse.city || grn.warehouse.state || grn.warehouse.zip || grn.warehouse.country) && (
                    <p>
                      {[
                        grn.warehouse.city,
                        grn.warehouse.state,
                        grn.warehouse.zip,
                        grn.warehouse.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground print:text-[9px] mt-0.5">Code: {grn.warehouse.code}</p>
              )}
            </div>

            {/* Col 4: GRN Information (Right Aligned) */}
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">GRN Information</p>
              <div className="space-y-1 text-sm print:text-xs">
                <p>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium text-slate-900">{format(new Date(grn.date), "dd MMMM yyyy")}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-semibold uppercase text-slate-800">{STATUS_LABELS[grn.status]}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRN Items */}
      <Card className="print:shadow-none print:border-0 print:bg-transparent">
        <CardHeader className="print:p-1.5 print:pb-0">
          <CardTitle className="flex items-center gap-2 print:text-xs">
            <FiPackage className="h-5 w-5 print:h-4 print:w-4" />
            Received Items
          </CardTitle>
          <CardDescription className="print:hidden">
            {grn.items.length} item{grn.items.length !== 1 ? "s" : ""} in this receipt
          </CardDescription>
        </CardHeader>
        <CardContent className="print:p-1.5">
          {grn.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FiPackage className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items in this GRN</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 print:py-1 print:px-2 print:text-xs">#</TableHead>
                    <TableHead className="print:py-1 print:px-2 print:text-xs">Item Code</TableHead>
                    <TableHead className="print:py-1 print:px-2 print:text-xs">Item Details</TableHead>
                    <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Received Qty</TableHead>
                    <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Unit Price</TableHead>
                    <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grn.items.map((item, index) => {
                    const unitPrice = item.purchaseItem 
                      ? Number(item.purchaseItem.unitPrice) 
                      : (item.variant?.costPrice 
                          ? Number(item.variant.costPrice) 
                          : (item.item?.costPrice ? Number(item.item.costPrice) : 0));
                    const amount = Number(item.receivedQuantity) * unitPrice;

                    return (
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
                            <p className="font-medium print:text-xs">
                              {item.purchaseItem?.description || (item.variant ? `${item.variant.sku}${item.variant.size ? `, ${item.variant.size}` : ''}${item.variant.color ? `, ${item.variant.color}` : ''}` : item.item?.name || "Unknown Item")}
                            </p>
                            {item.item && (item.purchaseItem?.description || item.variant) && (
                              <p className="text-xs text-muted-foreground print:text-[10px]">{item.item.name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs">
                          {Number(item.receivedQuantity).toFixed(2)}
                          {item.item?.unit?.symbol && ` ${item.item.unit.symbol}`}
                        </TableCell>
                        <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                          {formatCurrency(unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs">
                          {formatCurrency(amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {grn.items.length > 0 && (
                    <TableRow className="font-bold bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={3} className="print:py-1.5 print:px-2">Total</TableCell>
                      <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                        {totalReceivedQuantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right print:py-1.5 print:px-2"></TableCell>
                      <TableCell className="text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Financial Summary Cards */}
          <div className="mt-6 print:mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Items</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {grn.items.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Quantity Received</p>
                  <p className="text-2xl font-bold print:text-sm">
                    {totalReceivedQuantity.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20 print:bg-transparent print:shadow-none print:border-0">
              <CardContent className="pt-6 print:p-1">
                <div className="space-y-1 print:space-y-0">
                  <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Receipt Value</p>
                  <p className="text-2xl font-bold text-primary print:text-slate-900 print:text-base">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Amount In Words */}
          <div className="border-t border-b border-slate-200 py-3 mt-6 print:py-1.5 print:mt-2">
            <p className="text-sm print:text-[11px] text-slate-800">
              <span className="font-bold italic">In Words: </span>
              <span className="italic text-primary font-medium">{numberToWords(totalAmount)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audit Information */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiUser className="h-5 w-5" />
            Audit Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiUser className="h-4 w-4" />
                Created By
              </p>
              <p className="font-medium">
                {grn.creator?.name || grn.creator?.email || "System"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                Created At
              </p>
              <p>{format(new Date(grn.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                Last Updated
              </p>
              <p>{format(new Date(grn.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print-only Signatures */}
      <div className="hidden print:block mt-12 pt-4">
        <div className="flex justify-between gap-8 text-center">
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <p className="text-xs font-medium mb-1 text-slate-700">
              {grn.creator?.name || grn.creator?.email || "System"}
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
