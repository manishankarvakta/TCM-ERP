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
import { Separator } from "@/components/ui/separator";

interface TpnDetailsProps {
  tpn: any;
  organization?: {
    name: string;
    details?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export default function TpnDetails({ tpn, organization }: TpnDetailsProps) {
  const router = useRouter();
  const [printMode, setPrintMode] = React.useState<"tpn" | "challan">("tpn");

  const totalQuantity = tpn.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handlePrint = (mode: "tpn" | "challan") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only Invoice Header */}
      <div className="hidden print:block border-b border-slate-300 pb-2 mb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="w-1/3 text-left">
            <h1 className="text-sm font-bold uppercase tracking-wide text-slate-500">From:</h1>
            <p className="text-base font-bold text-slate-900">{tpn.sourceWarehouse?.name}</p>
            {tpn.sourceWarehouse?.address && (
              <p className="text-xs text-slate-600">{tpn.sourceWarehouse.address}</p>
            )}
            {(tpn.sourceWarehouse?.city || tpn.sourceWarehouse?.state || tpn.sourceWarehouse?.zip || tpn.sourceWarehouse?.country) && (
              <p className="text-xs text-slate-600">
                {[
                  tpn.sourceWarehouse.city,
                  tpn.sourceWarehouse.state,
                  tpn.sourceWarehouse.zip,
                  tpn.sourceWarehouse.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
          <div className="w-1/3 text-center self-center">
            <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">{organization?.name || "Ferrari Fashion"}</h2>
            {organization?.details && <p className="text-[11px] text-slate-600 font-semibold">{organization.details}</p>}
            {organization?.address && <p className="text-[10px] text-slate-500 mt-0.5">{organization.address}</p>}
            {(organization?.phone || organization?.email) && (
              <p className="text-[10px] text-slate-500">
                {[organization.phone && `Phone: ${organization.phone}`, organization.email && `Email: ${organization.email}`].filter(Boolean).join(" | ")}
              </p>
            )}
          </div>
          <div className="w-1/3 text-right">
            <h1 className="text-sm font-bold uppercase tracking-wide text-slate-500">To:</h1>
            <p className="text-base font-bold text-slate-900">{tpn.destinationWarehouse?.name}</p>
            {tpn.destinationWarehouse?.address && (
              <p className="text-xs text-slate-600">{tpn.destinationWarehouse.address}</p>
            )}
            {(tpn.destinationWarehouse?.city || tpn.destinationWarehouse?.state || tpn.destinationWarehouse?.zip || tpn.destinationWarehouse?.country) && (
              <p className="text-xs text-slate-600">
                {[
                  tpn.destinationWarehouse.city,
                  tpn.destinationWarehouse.state,
                  tpn.destinationWarehouse.zip,
                  tpn.destinationWarehouse.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-between items-end border-t pt-2 border-slate-200">
          <div>
            <h2 className="text-lg font-bold uppercase text-slate-800">
              {printMode === "challan" ? "Delivery Challan" : "Transfer Purchase Note"}
            </h2>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <p><span className="font-semibold">TPN Number:</span> {tpn.tpnNumber}</p>
            <p><span className="font-semibold">Date:</span> {format(new Date(tpn.date), "dd MMM yyyy")}</p>
            <p><span className="font-semibold">Status:</span> {tpn.status}</p>
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
        <div className="flex items-center gap-2 print:hidden">
           <Button variant="outline" onClick={() => handlePrint("tpn")}>
              <Printer className="mr-2 h-4 w-4" /> Print TPN
           </Button>
           <Button variant="outline" onClick={() => handlePrint("challan")}>
              <Printer className="mr-2 h-4 w-4" /> Print Challan
           </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 print:gap-2">
        <Card className="print:shadow-none print:border-0 print:bg-transparent">
          <CardHeader className="print:p-1.5 print:pb-0">
            <CardTitle className="print:text-xs">Transfer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 print:space-y-2 print:p-1.5">
            <div className="grid grid-cols-2 gap-4 print:gap-2">
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
            </div>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-4 print:gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Source Warehouse</p>
                <p className="print:text-xs font-semibold">{tpn.sourceWarehouse.name}</p>
                {tpn.sourceWarehouse.address && (
                  <p className="text-xs text-muted-foreground print:text-[9px] mt-0.5">
                    {tpn.sourceWarehouse.address}
                    {(tpn.sourceWarehouse.city || tpn.sourceWarehouse.state || tpn.sourceWarehouse.zip || tpn.sourceWarehouse.country) && (
                      <span>
                        , {[
                          tpn.sourceWarehouse.city,
                          tpn.sourceWarehouse.state,
                          tpn.sourceWarehouse.zip,
                          tpn.sourceWarehouse.country
                        ].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div>
                 <p className="text-sm font-medium text-muted-foreground print:text-[10px]">Destination Warehouse</p>
                 <p className="print:text-xs font-semibold">{tpn.destinationWarehouse.name}</p>
                 {tpn.destinationWarehouse.address && (
                   <p className="text-xs text-muted-foreground print:text-[9px] mt-0.5">
                     {tpn.destinationWarehouse.address}
                     {(tpn.destinationWarehouse.city || tpn.destinationWarehouse.state || tpn.destinationWarehouse.zip || tpn.destinationWarehouse.country) && (
                       <span>
                         , {[
                           tpn.destinationWarehouse.city,
                           tpn.destinationWarehouse.state,
                           tpn.destinationWarehouse.zip,
                           tpn.destinationWarehouse.country
                         ].filter(Boolean).join(", ")}
                       </span>
                     )}
                   </p>
                 )}
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
                  <TableHead className={`text-right print:py-1 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>Rate</TableHead>
                  <TableHead className={`text-right print:py-1 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tpn.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium print:py-1.5 print:px-2 print:text-xs">{item.item.code}</TableCell>
                    <TableCell className="print:py-1.5 print:px-2 print:text-xs">
                      <div>
                        <p className="font-semibold">
                          {item.variant ? `${item.variant.sku}${item.variant.size ? `, ${item.variant.size}` : ''}${item.variant.color ? `, ${item.variant.color}` : ''}` : item.item.name}
                        </p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground print:text-[10px]">{item.item.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium print:py-1.5 print:px-2 print:text-xs">
                      {Number(item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono print:py-1.5 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>
                      ৳{Number(item.unitRate || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold print:py-1.5 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>
                      ৳{Number(item.amount || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={2} className="print:py-1.5 print:px-2 print:text-xs">Total</TableCell>
                  <TableCell className="text-right font-mono print:py-1.5 print:px-2 print:text-xs">
                    {totalQuantity.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right print:py-1.5 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}></TableCell>
                  <TableCell className={`text-right font-mono font-bold text-indigo-600 print:py-1.5 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>
                    {formatCurrency(tpn.grandTotal || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Financial Summary Cards */}
            <div className="mt-6 print:mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
              <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
                <CardContent className="pt-6 print:p-1">
                  <div className="space-y-1 print:space-y-0">
                    <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Items</p>
                    <p className="text-2xl font-bold print:text-sm">
                      {tpn.items.length}
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
              <Card className={`bg-primary/5 border-primary/20 print:bg-transparent print:shadow-none print:border-0 ${printMode === "challan" ? "print:hidden" : ""}`}>
                <CardContent className="pt-6 print:p-1">
                  <div className="space-y-1 print:space-y-0">
                    <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Estimated Value</p>
                    <p className="text-2xl font-bold text-primary print:text-slate-900 print:text-base">
                      {formatCurrency(tpn.grandTotal || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Amount In Words */}
            <div className={`border-t border-b border-slate-200 py-3 mt-6 print:py-1.5 print:mt-2 ${printMode === "challan" ? "print:hidden" : ""}`}>
              <p className="text-sm print:text-[11px] text-slate-800 text-left">
                <span className="font-bold italic">In Words: </span>
                <span className="italic text-primary font-medium">{numberToWords(tpn.grandTotal || 0)}</span>
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
