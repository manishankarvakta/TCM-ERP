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

interface TpnDetailsProps {
  tpn: any;
}

export default function TpnDetails({ tpn }: TpnDetailsProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only Invoice Header */}
      <div className="hidden print:block border-b border-slate-300 pb-2 mb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">Ferrari Fashion</h1>
            <p className="text-xs text-slate-600">House #14, Road #04, Sector #03</p>
            <p className="text-xs text-slate-600">Uttara, Dhaka-1230, Bangladesh</p>
            <p className="text-xs text-slate-600">Phone: +880 1841 556677</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-slate-800">Transfer Purchase Note</h2>
            <div className="mt-2 text-xs space-y-0.5">
              <p><span className="font-semibold">TPN Number:</span> {tpn.tpnNumber}</p>
              <p><span className="font-semibold">Date:</span> {format(new Date(tpn.date), "dd MMM yyyy")}</p>
              <p><span className="font-semibold">Status:</span> {tpn.status}</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Transfer Note {tpn.tpnNumber}</h1>
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
            <CardTitle className="print:text-xs">Transfer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 print:space-y-1 print:p-1.5">
            <div className="grid grid-cols-4 gap-4 print:gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Date</p>
                <p className="print:text-xs">{format(new Date(tpn.date), "dd MMMM yyyy")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Status</p>
                <Badge variant={
                  tpn.status === "RECEIVED" ? "default" : 
                  tpn.status === "SHIPPED" ? "secondary" : "outline"
                } className="print:text-[10px] print:px-1.5 print:py-0">
                  {tpn.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Source Warehouse</p>
                <p className="print:text-xs">{tpn.sourceWarehouse.name}</p>
              </div>
              <div>
                 <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Destination Warehouse</p>
                 <p className="print:text-xs">{tpn.destinationWarehouse.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-0 print:bg-transparent">
          <CardHeader className="print:p-1.5 print:pb-0">
             <CardTitle className="flex justify-between print:text-xs">
                <span>Items ({tpn.items.length})</span>
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
                {tpn.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium print:py-1.5 print:px-2 print:text-xs">{item.item.code}</TableCell>
                    <TableCell className="print:py-1.5 print:px-2 print:text-xs">{item.item.name}</TableCell>
                    <TableCell className="text-right font-medium print:py-1.5 print:px-2 print:text-xs">
                      {Number(item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                      ৳{Number(item.unitRate || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs">
                      ৳{Number(item.amount || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={4} className="text-right font-semibold print:py-1.5 print:px-2 print:text-xs">Total Value:</TableCell>
                  <TableCell className="text-right font-bold text-indigo-600 print:py-1.5 print:px-2 print:text-xs">
                    ৳{Number(tpn.grandTotal || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Amount In Words */}
            <div className="border-t border-b border-slate-200 py-3 mt-6 print:py-1.5 print:mt-2">
              <p className="text-sm print:text-[11px] text-slate-800 text-left">
                <span className="font-bold italic">In Words: </span>
                <span className="italic">{numberToWords(tpn.grandTotal || 0)}</span>
              </p>
            </div>

            {/* Note / Terms */}
            {tpn.notes && (
              <div className="mt-4 print:mt-2 text-left">
                <p className="text-xs font-semibold uppercase text-slate-500">Note / Terms:</p>
                <p className="text-sm print:text-xs text-slate-700 mt-1 whitespace-pre-wrap">{tpn.notes}</p>
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
              {tpn.createdByUser?.name || tpn.createdByUser?.email || "System"}
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
