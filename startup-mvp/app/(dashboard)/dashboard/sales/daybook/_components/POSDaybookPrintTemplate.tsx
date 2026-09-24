"use client";

import React, { forwardRef } from "react";
import { format } from "date-fns";

export interface POSDaybookPrintTemplateProps {
  mode: "single" | "consolidated";
  dateStr: string;
  warehouseName: string;
  closing?: any;
  closings?: any[];
  printedBy?: string;
}

// Standard payment method rows matching company register sheet
const STANDARD_METHODS = [
  { key: "BRAC", label: "BRAC", aliases: ["brac", "brack"] },
  { key: "DBBL", label: "DBBL", aliases: ["dbbl", "dutch bangla"] },
  { key: "MTBL", label: "MTBL", aliases: ["mtb", "mtbl", "mutual trust"] },
  { key: "Amex/City", label: "Amex/City", aliases: ["city", "amex", "american express"] },
  { key: "Bkash", label: "Bkash", aliases: ["bkash"] },
  { key: "Rocket", label: "Rocket", aliases: ["rocket"] },
  { key: "Nagad", label: "Nagad", aliases: ["nagad"] },
  { key: "IBL", label: "IBL", aliases: ["ibl", "ibbl", "islami bank"] },
  { key: "UCB", label: "UCB", aliases: ["ucb", "upay"] },
  { key: "Upay", label: "Upay", aliases: ["upay"] },
  { key: "e-Commerce_Online", label: "e-Commerce_Online", aliases: ["ecom", "ecommerce", "online"] },
  { key: "iPay", label: "iPay", aliases: ["ipay"] },
];

const POSDaybookPrintTemplate = forwardRef<HTMLDivElement, POSDaybookPrintTemplateProps>(
  ({ mode, dateStr, warehouseName, closing, closings = [], printedBy }, ref) => {
    const formatNumber = (val: number | undefined | null) => {
      if (val === undefined || val === null || isNaN(val) || val === 0) return "-";
      return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatCurrency = (val: number | undefined | null) => {
      if (val === undefined || val === null || isNaN(val)) return "0.00";
      return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formattedDate = (() => {
      try {
        return format(new Date(dateStr), "dd-MMM-yy");
      } catch {
        return dateStr;
      }
    })();

    const printTimestamp = format(new Date(), "PPpp");

    // Render a single cashier closing matching the exact uploaded template
    const renderSingleSummary = (c: any) => {
      if (!c) return null;

      const billerName = c.biller?.name || "Cashier";
      const den = c.denominations || {};

      const denomRows = [
        { label: "1000", value: 1000, count: Number(den.note1000 || 0) },
        { label: "500", value: 500, count: Number(den.note500 || 0) },
        { label: "200", value: 200, count: Number(den.note200 || 0) },
        { label: "100", value: 100, count: Number(den.note100 || 0) },
        { label: "50", value: 50, count: Number(den.note50 || 0) },
        { label: "20", value: 20, count: Number(den.note20 || 0) },
        { label: "10", value: 10, count: Number(den.note10 || 0) },
        { label: "5", value: 5, count: Number(den.note5 || 0) },
        { label: "2", value: 2, count: Number(den.note2 || 0) },
        { label: "1", value: 1, count: Number(den.note1 || 0) },
      ].map(r => ({ ...r, total: r.value * r.count }));

      const totalPhysicalCash = denomRows.reduce((sum, r) => sum + r.total, 0);
      const cashOut = Number(c.cashOut || 0);
      const openingCash = Number(c.openingCash || 0);
      const totalCashAndOut = totalPhysicalCash + cashOut;
      const derivedCashSales = totalCashAndOut - openingCash;

      // Map collections to standard methods
      const collections = c.collections || [];
      const cashCol = collections.find((col: any) => col.paymentMethodName?.toLowerCase().includes("cash"));
      const systemCashSales = cashCol ? Number(cashCol.regularCollection || 0) : 0;
      const systemCashDues = cashCol ? Number(cashCol.duesCollection || 0) : 0;

      // Group collections by method
      const methodData = STANDARD_METHODS.map(m => {
        const found = collections.find((col: any) => {
          const name = col.paymentMethodName?.toLowerCase() || "";
          return m.aliases.some(alias => name.includes(alias));
        });
        const systemAmt = found ? Number(found.regularCollection || 0) : 0;
        const receivedAmt = found ? Number(found.totalReceived || 0) : 0;
        return {
          label: m.label,
          systemAmt,
          receivedAmt
        };
      });

      // Loyalty points
      const loyaltySystem = Number(c.loyaltyPoints || 0);

      // Totals
      const totalSystemSales = systemCashSales + methodData.reduce((sum, m) => sum + m.systemAmt, 0) + loyaltySystem;
      const totalReceivedSales = (derivedCashSales > 0 ? derivedCashSales : systemCashSales) + methodData.reduce((sum, m) => sum + m.receivedAmt, 0) + loyaltySystem;
      const difference = totalReceivedSales - totalSystemSales;

      return (
        <div className="space-y-4 max-w-[850px] mx-auto bg-white text-black font-sans text-xs">
          
          {/* Top Banner Header: Name of Pos */}
          <div className="bg-[#d8a4f0] border-2 border-black p-1.5 text-center font-bold text-sm tracking-wide">
            Name of Pos: {billerName}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* LEFT COLUMN: Cash & Denominations Table */}
            <div className="border-2 border-black">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#9ae6b4] font-bold border-b-2 border-black italic">
                    <th className="py-1 px-3 text-center border-r border-black">Particulars</th>
                    <th className="py-1 px-3 text-right">Total</th>
                  </tr>
                  <tr className="bg-[#90cdf4] font-bold border-b border-black italic">
                    <th colSpan={2} className="py-0.5 px-3 text-center">Cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-semibold">
                  {denomRows.map((r, idx) => (
                    <tr key={idx} className="h-6">
                      <td className="py-0.5 px-3 text-center border-r border-black italic font-bold">
                        <span className="inline-block w-16 text-center">{r.label}</span>
                        <span className="text-slate-500 font-normal ml-4">{r.count > 0 ? r.count : ""}</span>
                      </td>
                      <td className="py-0.5 px-3 text-right">
                        {r.total > 0 ? r.total.toLocaleString("en-US") : "-"}
                      </td>
                    </tr>
                  ))}
                  <tr className="h-6">
                    <td className="py-0.5 px-3 italic border-r border-black font-medium">Tear money</td>
                    <td className="py-0.5 px-3 text-right">-</td>
                  </tr>
                  <tr className="h-6">
                    <td className="py-0.5 px-3 italic border-r border-black font-bold">Cash Out</td>
                    <td className="py-0.5 px-3 text-right font-bold">{cashOut > 0 ? cashOut.toLocaleString("en-US") : "-"}</td>
                  </tr>
                  <tr className="h-6 bg-[#9ae6b4] border-t-2 border-b-2 border-black font-bold">
                    <td className="py-0.5 px-3 italic border-r border-black">Total cash</td>
                    <td className="py-0.5 px-3 text-right">{totalCashAndOut > 0 ? totalCashAndOut.toLocaleString("en-US") : "-"}</td>
                  </tr>
                  <tr className="h-6 bg-white font-bold border-b border-black">
                    <td className="py-0.5 px-3 italic border-r border-black">Opening Cash</td>
                    <td className="py-0.5 px-3 text-right">{openingCash > 0 ? openingCash.toLocaleString("en-US") : "-"}</td>
                  </tr>
                  <tr className="h-6 bg-[#90cdf4] font-bold border-t border-black">
                    <td className="py-0.5 px-3 italic border-r border-black">Total Cash Sales</td>
                    <td className="py-0.5 px-3 text-right font-black">
                      {derivedCashSales > 0 ? derivedCashSales.toLocaleString("en-US") : (systemCashSales > 0 ? systemCashSales.toLocaleString("en-US") : "-")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RIGHT COLUMN: Bank/Card + Date Summary (Matching Uploaded Screenshot!) */}
            <div className="border-2 border-black">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {/* Top Big Date Header */}
                  <tr className="bg-white border-b-2 border-black">
                    <th colSpan={3} className="py-2 text-center text-xl font-black italic tracking-wide">
                      {formattedDate}
                    </th>
                  </tr>
                  <tr className="bg-[#90cdf4] font-bold border-b border-black italic">
                    <th colSpan={3} className="py-0.5 px-3 text-center">Bank/Card & Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-semibold">
                  {/* Cash Sales Row */}
                  <tr className="h-6 font-bold">
                    <td className="py-0.5 px-2 italic border-r border-black">Cash sales</td>
                    <td className="py-0.5 px-2 text-right border-r border-black">{formatNumber(systemCashSales)}</td>
                    <td className="py-0.5 px-2 text-right">{formatNumber(derivedCashSales > 0 ? derivedCashSales : systemCashSales)}</td>
                  </tr>

                  {/* Standard Gateway Rows */}
                  {methodData.map((m, idx) => (
                    <tr key={idx} className="h-5">
                      <td className={`py-0.5 px-2 italic border-r border-black ${m.label === 'Upay' ? 'bg-[#702082] text-white font-bold' : m.label === 'e-Commerce_Online' ? 'bg-[#00b0f0] text-white font-bold' : ''}`}>
                        {m.label}
                      </td>
                      <td className="py-0.5 px-2 text-right border-r border-black">{formatNumber(m.systemAmt)}</td>
                      <td className="py-0.5 px-2 text-right">{formatNumber(m.receivedAmt)}</td>
                    </tr>
                  ))}

                  {/* Loyalty / Coupon Row */}
                  <tr className="h-5">
                    <td className="py-0.5 px-2 italic border-r border-black">Loyalty/Cupon/Others</td>
                    <td className="py-0.5 px-2 text-right border-r border-black">{formatNumber(loyaltySystem)}</td>
                    <td className="py-0.5 px-2 text-right">-</td>
                  </tr>

                  {/* Total Sales Row with Excess/Short Badge */}
                  <tr className="h-7 border-t-2 border-black font-black bg-white">
                    <td className="py-1 px-2 italic border-r border-black text-center font-bold">Total Sales</td>
                    <td className="py-1 px-2 text-right border-r border-black font-black">{formatCurrency(totalSystemSales)}</td>
                    <td className="py-1 px-2 text-right font-black">{totalReceivedSales.toLocaleString("en-US")}</td>
                  </tr>

                  {/* Difference Badge Row */}
                  <tr className="h-6 font-bold border-t border-black">
                    <td className="py-0.5 px-2 italic border-r border-black text-right pr-4" colSpan={2}>
                      <span className="text-xs italic">Difference / Variance:</span>
                    </td>
                    <td className={`py-0.5 px-2 text-center font-black text-xs ${difference > 0 ? 'bg-[#00b050] text-black' : difference < 0 ? 'bg-[#ff0000] text-white' : 'bg-slate-100'}`}>
                      {difference > 0 ? `${difference.toFixed(0)} (Excess)` : difference < 0 ? `${Math.abs(difference).toFixed(0)} (Short)` : "0 (Exact)"}
                    </td>
                  </tr>

                  {/* Due Collection Highlight Section */}
                  {systemCashDues > 0 && (
                    <tr className="h-7 bg-[#ffff00] border-t-2 border-black font-bold">
                      <td className="py-1 px-2 italic border-r border-black font-black">Due Collection</td>
                      <td className="py-1 px-2 text-right border-r border-black font-black">{formatCurrency(systemCashDues)}</td>
                      <td className="py-1 px-2 text-right font-black">{formatCurrency(systemCashDues)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Footer Metadata & Signatures */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="border-t border-black pt-1 text-center font-bold">
                Cashier's Signature: {billerName}
              </div>
              <div className="text-center text-[10px] text-slate-500">Branch: {warehouseName} | Date: {formattedDate}</div>
            </div>
            <div>
              <div className="border-t border-black pt-1 text-center font-bold">
                Branch Manager / Auditor Approval
              </div>
              <div className="text-center text-[10px] text-slate-500">Printed: {printTimestamp}</div>
            </div>
          </div>

        </div>
      );
    };

    // Render consolidated warehouse report
    const renderConsolidated = () => {
      return (
        <div className="space-y-8 max-w-[850px] mx-auto bg-white text-black font-sans text-xs">
          {/* Main Title */}
          <div className="border-b-2 border-black pb-2 text-center">
            <h1 className="text-xl font-black uppercase tracking-wide">Daily POS Daybook Summary Report</h1>
            <p className="font-semibold text-slate-600">Branch: {warehouseName} | Date: {formattedDate}</p>
          </div>

          {/* Render summary for each cashier */}
          {closings.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic border border-dashed border-slate-300">
              No cashier closing sessions found for {formattedDate}.
            </div>
          ) : (
            closings.map((c, idx) => (
              <div key={idx} className="page-break-inside-avoid">
                {renderSingleSummary(c)}
              </div>
            ))
          )}
        </div>
      );
    };

    return (
      <div 
        ref={ref} 
        className="p-6 bg-white text-black font-sans w-full max-w-[210mm] mx-auto min-h-[297mm] print:p-2 print:m-0 print:w-full print:max-w-none text-xs"
      >
        {mode === "single" ? renderSingleSummary(closing) : renderConsolidated()}
      </div>
    );
  }
);

POSDaybookPrintTemplate.displayName = "POSDaybookPrintTemplate";

export default POSDaybookPrintTemplate;
