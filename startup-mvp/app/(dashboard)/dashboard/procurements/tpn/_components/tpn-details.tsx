"use client";

import React, { useEffect, useRef } from "react";
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
import JsBarcode from "jsbarcode";

function TpnBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.2,
          height: 36,
          displayValue: false,
          margin: 0,
          background: "transparent",
        });
      } catch (err) {
        console.error("Failed to render TPN barcode:", err);
      }
    }
  }, [value]);
  return <svg ref={svgRef} />;
}

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
      {/* Print-only: override dashboard layout overflow clipping for multi-page print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Override Next.js dashboard layout containers that clip content to viewport height */
          div.flex.h-screen.overflow-hidden,
          div.flex.flex-1.flex-col.overflow-hidden,
          main.flex-1.overflow-y-auto {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm 12mm 18mm 12mm;

            @bottom-center {
              content: "Page " counter(page) " / " counter(pages);
              font-size: 9pt;
              color: #64748b;
              font-family: sans-serif;
            }
          }
        }
      ` }} />

      {/* Print-only Invoice Header */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
        <div className="flex justify-between items-start gap-4">
          {/* Left Side: Logo + Organization Info */}
          <div className="flex items-start gap-3">
            <div className="border border-slate-800 p-1 bg-white flex items-center justify-center w-16 h-16 shrink-0">
              <img
                src="/main_logo.png"
                alt="Ferrari Fashion Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold uppercase tracking-tight text-slate-900 leading-tight">
                {organization?.name || "FERRARI FASHION"}
              </h1>
              <p className="text-xs italic text-slate-600 mt-0.5">
                {organization?.address || "Unique, Ashulia, Dhaka"}
              </p>
              <p className="text-xs italic text-slate-600">
                {organization?.email || "msferrarifashion4475@gmail.com"}
              </p>
              <p className="text-xs italic text-slate-600">
                {organization?.phone || "01956-582108, 01745-645502"}
              </p>
            </div>
          </div>

          {/* Right Side: Document Title + Meta */}
          <div className="text-right">
            <h2 className="text-lg font-bold uppercase text-slate-900 tracking-wide mb-0 leading-tight">
              {printMode === "challan" ? "DELIVERY CHALLAN" : "TRANSFER PURCHASE NOTE"}
            </h2>
            <div className="text-xs text-slate-700 text-right">
              <p className="mb-0 leading-none">
                <span className="italic text-slate-600">TPN Number: </span>
                <span className="font-bold text-slate-900">{tpn.tpnNumber}</span>
              </p>
              <div className="flex justify-end">
                <TpnBarcode value={tpn.tpnNumber} />
              </div>
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
          <CardContent className="pt-6 print:p-1.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
              {/* Col 1: Source Warehouse */}
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Source Warehouse</p>
                <p className="text-base font-bold print:text-xs text-slate-900">{tpn.sourceWarehouse.name}</p>
                {tpn.sourceWarehouse.address && (
                  <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                    <p>{tpn.sourceWarehouse.address}</p>
                    {(tpn.sourceWarehouse.city || tpn.sourceWarehouse.state || tpn.sourceWarehouse.zip || tpn.sourceWarehouse.country) && (
                      <p>
                        {[
                          tpn.sourceWarehouse.city,
                          tpn.sourceWarehouse.state,
                          tpn.sourceWarehouse.zip,
                          tpn.sourceWarehouse.country
                        ].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Col 2: Destination Warehouse */}
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Destination Warehouse</p>
                <p className="text-base font-bold print:text-xs text-slate-900">{tpn.destinationWarehouse.name}</p>
                {tpn.destinationWarehouse.address && (
                  <div className="text-xs text-muted-foreground print:text-[9px] mt-0.5 space-y-0.5">
                    <p>{tpn.destinationWarehouse.address}</p>
                    {(tpn.destinationWarehouse.city || tpn.destinationWarehouse.state || tpn.destinationWarehouse.zip || tpn.destinationWarehouse.country) && (
                      <p>
                        {[
                          tpn.destinationWarehouse.city,
                          tpn.destinationWarehouse.state,
                          tpn.destinationWarehouse.zip,
                          tpn.destinationWarehouse.country
                        ].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Col 3: Transfer Information (Right Aligned) */}
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground print:text-[10px] mb-1">Transfer Information</p>
                <div className="space-y-1 text-sm print:text-xs">
                  <p>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium text-slate-900">{format(new Date(tpn.date), "dd MMMM yyyy")}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Status: </span>
                    <span className="font-semibold uppercase text-slate-800">{tpn.status}</span>
                  </p>
                </div>
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
                  <TableHead className="print:py-1 print:px-2 print:text-xs w-8">#</TableHead>
                  <TableHead className="print:py-1 print:px-2 print:text-xs">Item Code</TableHead>
                  <TableHead className="print:py-1 print:px-2 print:text-xs">Item Name</TableHead>
                  <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Quantity</TableHead>
                  <TableHead className={`text-right print:py-1 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>Rate</TableHead>
                  <TableHead className={`text-right print:py-1 print:px-2 print:text-xs ${printMode === "challan" ? "print:hidden" : ""}`}>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tpn.items.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="print:py-1.5 print:px-2 print:text-xs text-muted-foreground">{index + 1}</TableCell>
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
                  <TableCell colSpan={3} className="print:py-1.5 print:px-2 print:text-xs">Total</TableCell>
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
