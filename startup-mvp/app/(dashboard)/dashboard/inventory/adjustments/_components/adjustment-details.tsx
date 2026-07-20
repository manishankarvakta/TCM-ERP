"use client";

import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { numberToWords } from "@/lib/utils/number-to-words";

interface AdjustmentDetailsProps {
  adjustment: any;
}

export default function AdjustmentDetails({ adjustment }: AdjustmentDetailsProps) {
  const router = useRouter();
  const totalAmount = adjustment.items.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalItems = adjustment.items.length;
  const totalQuantity = adjustment.items.reduce((sum: number, item: any) => sum + Math.abs(Number(item.quantity || 0)), 0);
  const netQuantity = adjustment.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
  const netAdjustmentValue = adjustment.items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.unitRate || 0)), 0);

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only Invoice Header */}
      <div className="hidden print:block border-b border-slate-300 pb-2 mb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
              {adjustment.warehouse?.name || "Ferrari Fashion"}
            </h1>
            {adjustment.warehouse?.address ? (
              <>
                <p className="text-xs text-slate-600">{adjustment.warehouse.address}</p>
                {(adjustment.warehouse.city || adjustment.warehouse.state || adjustment.warehouse.zip || adjustment.warehouse.country) && (
                  <p className="text-xs text-slate-600">
                    {[
                      adjustment.warehouse.city,
                      adjustment.warehouse.state,
                      adjustment.warehouse.zip,
                      adjustment.warehouse.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs text-slate-600">House #14, Road #04, Sector #03</p>
                <p className="text-xs text-slate-600">Uttara, Dhaka-1230, Bangladesh</p>
              </>
            )}
            <p className="text-xs text-slate-600">Phone: +880 1841 556677</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-slate-800">Stock Adjustment</h2>
            <div className="mt-2 text-xs space-y-0.5">
              <p><span className="font-semibold">Adjustment #:</span> {adjustment.adjustmentNumber}</p>
              <p><span className="font-semibold">Date:</span> {format(new Date(adjustment.date), "dd MMM yyyy")}</p>
              <p><span className="font-semibold">Status:</span> {adjustment.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Adjustment {adjustment.adjustmentNumber}</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => window.print()} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" /> Print
           </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 print:gap-2">
        <Card className="print:shadow-none print:border-0 print:bg-transparent">
          <CardHeader className="print:p-1.5 print:pb-0">
            <CardTitle className="print:text-xs">General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 print:space-y-1 print:p-1.5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Date</p>
                <p className="text-sm font-semibold print:text-xs">{format(new Date(adjustment.date), "dd MMMM yyyy")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Status</p>
                <Badge variant={
                  adjustment.status === "COMPLETED" ? "default" : 
                  adjustment.status === "DRAFT" ? "secondary" : "destructive"
                } className="print:text-[10px] print:px-1.5 print:py-0">
                  {adjustment.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Warehouse</p>
                <p className="text-sm font-semibold print:text-xs">{adjustment.warehouse.name}</p>
              </div>
              <div className="print:hidden">
                 <p className="text-sm font-medium text-muted-foreground">Created By</p>
                 <p className="text-sm font-semibold">{adjustment.createdByUser.name}</p>
              </div>
              <div>
                 <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Voucher</p>
                 <p className="text-sm font-semibold print:text-xs">{adjustment.voucher?.voucherNumber || "N/A"}</p>
              </div>
              <div>
                 <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Total Value</p>
                 <p className="text-sm font-bold text-indigo-600 print:text-xs">৳{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-0 print:bg-transparent">
          <CardHeader className="print:p-1.5 print:pb-0">
             <CardTitle className="flex justify-between print:text-xs">
                <span>Items ({adjustment.items.length})</span>
             </CardTitle>
          </CardHeader>
          <CardContent className="print:p-1.5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="print:py-1 print:px-2 print:text-xs">Item Code</TableHead>
                  <TableHead className="print:py-1 print:px-2 print:text-xs">Item Name</TableHead>
                  <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Quantity</TableHead>
                  <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Rate</TableHead>
                  <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustment.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium print:py-1.5 print:px-2 print:text-xs">{item.item.code}</TableCell>
                    <TableCell className="print:py-1.5 print:px-2 print:text-xs">{item.item.name}</TableCell>
                    <TableCell className="text-right print:py-1.5 print:px-2 print:text-xs">
                       <span className={Number(item.quantity) > 0 ? "text-green-600" : "text-red-600"}>
                          {Number(item.quantity) > 0 ? "+" : ""}{Number(item.quantity)} {item.item.unit.symbol}
                       </span>
                    </TableCell>
                    <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">৳{Number(item.unitRate).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">৳{Number(item.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2} className="print:py-1.5 print:px-2 print:text-xs">Total</TableCell>
                  <TableCell className="text-right print:py-1.5 print:px-2 print:text-xs">
                     <span className={netQuantity > 0 ? "text-green-600" : "text-red-600"}>
                        {netQuantity > 0 ? "+" : ""}{netQuantity.toFixed(2)}
                     </span>
                  </TableCell>
                  <TableCell className="print:py-1.5 print:px-2"></TableCell>
                  <TableCell className="text-right font-bold text-indigo-600 print:py-1.5 print:px-2 print:text-xs">৳{totalAmount.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Summaries Cards */}
            <div className="mt-6 print:mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
              <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
                <CardContent className="pt-6 print:p-1">
                  <div className="space-y-1 print:space-y-0">
                    <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Items</p>
                    <p className="text-2xl font-bold print:text-sm">{totalItems}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
                <CardContent className="pt-6 print:p-1">
                  <div className="space-y-1 print:space-y-0">
                    <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Qty Adjusted</p>
                    <p className="text-2xl font-bold print:text-sm">{totalQuantity.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={netAdjustmentValue >= 0 ? "bg-emerald-500/5 border-emerald-500/20 print:bg-transparent print:shadow-none print:border-0" : "bg-destructive/5 border-destructive/20 print:bg-transparent print:shadow-none print:border-0"}>
                <CardContent className="pt-6 print:p-1">
                  <div className="space-y-1 print:space-y-0">
                    <p className="text-sm font-medium text-muted-foreground print:text-xs">Net Value Impact</p>
                    <p className={`text-2xl font-bold ${netAdjustmentValue >= 0 ? "text-emerald-600" : "text-destructive"} print:text-slate-900 print:text-base`}>
                      {netAdjustmentValue >= 0 ? "+" : ""}৳{netAdjustmentValue.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Amount In Words */}
            <div className="border-t border-b border-slate-200 py-3 mt-6 print:py-1.5 print:mt-2">
              <p className="text-sm print:text-[11px] text-slate-800 text-left">
                <span className="font-bold italic">In Words: </span>
                <span className="italic">{numberToWords(totalAmount)}</span>
              </p>
            </div>

            {/* Note / Terms */}
            {adjustment.notes && (
              <div className="mt-4 print:mt-2 text-left">
                <p className="text-xs font-semibold uppercase text-slate-500">Note / Terms:</p>
                <p className="text-sm print:text-xs text-slate-700 mt-1 whitespace-pre-wrap">{adjustment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print-only Signatures */}
      <div className="hidden print:block mt-12 pt-4">
        <div className="flex justify-between gap-8 text-center">
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <p className="text-xs font-medium mb-1 text-slate-700">
              {adjustment.createdByUser?.name || adjustment.createdByUser?.email || "System"}
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
