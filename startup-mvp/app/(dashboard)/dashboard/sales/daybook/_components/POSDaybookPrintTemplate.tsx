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

const POSDaybookPrintTemplate = forwardRef<HTMLDivElement, POSDaybookPrintTemplateProps>(
  ({ mode, dateStr, warehouseName, closing, closings = [], printedBy }, ref) => {
    const formatCurrency = (val: number | undefined | null) => {
      if (val === undefined || val === null) return "0.00";
      return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formattedDate = (() => {
      try {
        return format(new Date(dateStr), "PPP");
      } catch {
        return dateStr;
      }
    })();

    const printTimestamp = format(new Date(), "PPpp");

    // Helper for single closing
    const renderSingleReport = (c: any) => {
      if (!c) return null;

      const billerName = c.biller?.name || "Cashier";
      const billerEmail = c.biller?.email || "";
      const verifierName = c.verifier?.name || null;
      const den = c.denominations || {};

      const denomRows = [
        { label: "1,000", value: 1000, count: Number(den.note1000 || 0) },
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

      const totalRegular = (c.collections || []).reduce((sum: number, col: any) => sum + Number(col.regularCollection || 0), 0);
      const totalDues = (c.collections || []).reduce((sum: number, col: any) => sum + Number(col.duesCollection || 0), 0);
      const totalSystem = (c.collections || []).reduce((sum: number, col: any) => sum + Number(col.totalCollection || 0), 0);
      const totalReceived = (c.collections || []).reduce((sum: number, col: any) => sum + Number(col.totalReceived || 0), 0);
      const totalDiff = (c.collections || []).reduce((sum: number, col: any) => sum + Number(col.difference || 0), 0);

      const cashCollectionItem = (c.collections || []).find((col: any) => 
        col.paymentMethodName?.toLowerCase().includes("cash")
      );
      const cashSales = cashCollectionItem ? Number(cashCollectionItem.regularCollection || 0) : 0;
      const cashDues = cashCollectionItem ? Number(cashCollectionItem.duesCollection || 0) : 0;
      const totalCashInflow = cashSales + cashDues;

      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">POS Daybook Closing Report</h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">Register Closing & Cash Drawer Settlement</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div className="font-bold text-slate-900">Branch: <span className="font-normal">{c.warehouse?.name || warehouseName}</span></div>
                <div className="font-bold text-slate-900">Business Date: <span className="font-normal">{formattedDate}</span></div>
                <div className="text-slate-500">Printed: {printTimestamp}</div>
              </div>
            </div>
          </div>

          {/* Cashier & Session Info Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded text-xs">
            <div>
              <span className="text-slate-500 block font-semibold">Cashier / Biller:</span>
              <span className="font-bold text-slate-900 text-sm">{billerName}</span>
              {billerEmail && <span className="text-slate-500 text-[10px] block">{billerEmail}</span>}
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Closing Status:</span>
              <span className="inline-block font-extrabold uppercase px-2 py-0.5 rounded text-[11px] bg-slate-200 text-slate-800 mt-0.5">
                {c.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Today's Credit Sales:</span>
              <span className="font-bold text-slate-900 text-sm">৳{formatCurrency(c.todaysCreditSales)}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold">Verified By:</span>
              <span className="font-bold text-slate-900 text-sm">{verifierName || "Pending Verification"}</span>
            </div>
          </div>

          {/* Summary Executive Metrics */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="border border-slate-200 p-2.5 rounded bg-white">
              <span className="text-slate-500 block font-semibold">Total Collections (Expected):</span>
              <span className="text-lg font-black text-slate-900">৳{formatCurrency(totalSystem)}</span>
            </div>
            <div className="border border-slate-200 p-2.5 rounded bg-white">
              <span className="text-slate-500 block font-semibold">Physical Cash Counted:</span>
              <span className="text-lg font-black text-indigo-900">৳{formatCurrency(c.cashInHand)}</span>
            </div>
            <div className={`border p-2.5 rounded ${c.difference > 0 ? 'bg-emerald-50 border-emerald-200' : c.difference < 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-600 block font-semibold">Drawer Variance / Discrepancy:</span>
              <span className={`text-lg font-black ${c.difference > 0 ? 'text-emerald-700' : c.difference < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                {c.difference > 0 ? `+৳${formatCurrency(c.difference)} (Surplus)` : c.difference < 0 ? `-৳${formatCurrency(Math.abs(c.difference))} (Shortage)` : '৳0.00 (Exact)'}
              </span>
            </div>
          </div>

          {/* Grid of Two Tables: Collections Matrix and Drawer Float/Denominations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left: Collections Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b pb-1">Payment Method Breakdown</h3>
              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="text-left py-1.5 px-2">Account / Method</th>
                    <th className="text-right py-1.5 px-2">Sales</th>
                    <th className="text-right py-1.5 px-2">Dues</th>
                    <th className="text-right py-1.5 px-2">Expected</th>
                    <th className="text-right py-1.5 px-2">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(c.collections || []).map((col: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1 px-2 font-semibold text-slate-900">{col.paymentMethodName}</td>
                      <td className="py-1 px-2 text-right">{formatCurrency(Number(col.regularCollection))}</td>
                      <td className="py-1 px-2 text-right">{formatCurrency(Number(col.duesCollection))}</td>
                      <td className="py-1 px-2 text-right font-medium">{formatCurrency(Number(col.totalCollection))}</td>
                      <td className="py-1 px-2 text-right font-bold text-slate-900">{formatCurrency(Number(col.totalReceived))}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                    <td className="py-1.5 px-2">Total</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(totalRegular)}</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(totalDues)}</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(totalSystem)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-950">{formatCurrency(totalReceived)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Drawer Cash Float Breakdown */}
              <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-1.5 text-xs mt-3">
                <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 uppercase tracking-wider">Drawer Float Reconciliation</h4>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Opening Cash Float:</span>
                  <span className="font-semibold text-slate-900">৳{formatCurrency(c.openingCash)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-emerald-700 font-medium">
                  <span>(+) Cash Collections (Sales + Dues):</span>
                  <span>+৳{formatCurrency(totalCashInflow)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-rose-700 font-medium">
                  <span>(-) Cash Out to Safe / Bank:</span>
                  <span>-৳{formatCurrency(c.cashOut)}</span>
                </div>
                {Number(c.officeBill || 0) > 0 && (
                  <div className="flex justify-between py-0.5 text-rose-700 font-medium">
                    <span>(-) Office Bill / Expenses:</span>
                    <span>-৳{formatCurrency(c.officeBill)}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-1 flex justify-between font-black text-slate-900">
                  <span>Expected Drawer Cash:</span>
                  <span>৳{formatCurrency(c.availableCash)}</span>
                </div>
                <div className="flex justify-between font-black text-indigo-950 bg-indigo-50/50 p-1 rounded">
                  <span>Physical Cash Counted:</span>
                  <span>৳{formatCurrency(c.cashInHand)}</span>
                </div>
              </div>
            </div>

            {/* Right: Cash Denomination Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b pb-1">Physical Cash Denominations</h3>
              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="text-left py-1.5 px-2">Note / Coin</th>
                    <th className="text-center py-1.5 px-2">Count</th>
                    <th className="text-right py-1.5 px-2">Subtotal (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {denomRows.map((row, idx) => (
                    <tr key={idx} className={row.count > 0 ? "bg-indigo-50/20 font-medium" : ""}>
                      <td className="py-1 px-2 text-slate-800">৳{row.label}</td>
                      <td className="py-1 px-2 text-center text-slate-700">{row.count > 0 ? row.count : "-"}</td>
                      <td className="py-1 px-2 text-right font-semibold text-slate-900">
                        {row.count > 0 ? `৳${formatCurrency(row.total)}` : "-"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                    <td className="py-1.5 px-2" colSpan={2}>Total Physical Cash</td>
                    <td className="py-1.5 px-2 text-right text-indigo-950 font-black">
                      ৳{formatCurrency(c.cashInHand)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Notes */}
              {c.notes && (
                <div className="border border-slate-200 rounded p-2.5 bg-slate-50 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">Closing Notes:</span>
                  <p className="text-slate-600 italic">{c.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-10 border-t border-slate-300 grid grid-cols-2 gap-10 text-xs mt-8">
            <div>
              <div className="border-t border-slate-400 pt-1.5 text-center font-bold text-slate-800">
                Cashier's Signature: {billerName}
              </div>
              <div className="text-center text-[10px] text-slate-500">Submitted at {c.createdAt ? format(new Date(c.createdAt), "PPp") : formattedDate}</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5 text-center font-bold text-slate-800">
                Verified / Approved By: {verifierName || "Manager"}
              </div>
              <div className="text-center text-[10px] text-slate-500">
                {c.verifiedAt ? `Verified at ${format(new Date(c.verifiedAt), "PPp")}` : "Signature & Seal"}
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Consolidated Warehouse Report
    const renderConsolidatedReport = () => {
      const totalWarehouseCashInHand = closings.reduce((sum, c) => sum + Number(c.cashInHand || 0), 0);
      const totalWarehouseAvailable = closings.reduce((sum, c) => sum + Number(c.availableCash || 0), 0);
      const totalWarehouseDiff = closings.reduce((sum, c) => sum + Number(c.difference || 0), 0);
      const totalWarehouseOpening = closings.reduce((sum, c) => sum + Number(c.openingCash || 0), 0);
      const totalWarehouseCashOut = closings.reduce((sum, c) => sum + Number(c.cashOut || 0), 0);
      const totalWarehouseCredit = closings.reduce((sum, c) => sum + Number(c.todaysCreditSales || 0), 0);

      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">Daily POS Daybook Summary Report</h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">Consolidated Branch Closing & Cashier Reconciliation</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div className="font-bold text-slate-900">Branch: <span className="font-normal">{warehouseName}</span></div>
                <div className="font-bold text-slate-900">Business Date: <span className="font-normal">{formattedDate}</span></div>
                <div className="text-slate-500">Printed: {printTimestamp}</div>
              </div>
            </div>
          </div>

          {/* Executive Summary Cards */}
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="border border-slate-200 p-2.5 rounded bg-slate-50">
              <span className="text-slate-500 block font-semibold">Total Active Closings:</span>
              <span className="text-lg font-black text-slate-900">{closings.length} Shift{closings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="border border-slate-200 p-2.5 rounded bg-slate-50">
              <span className="text-slate-500 block font-semibold">Total Physical Cash in Drawer:</span>
              <span className="text-lg font-black text-indigo-900">৳{formatCurrency(totalWarehouseCashInHand)}</span>
            </div>
            <div className="border border-slate-200 p-2.5 rounded bg-slate-50">
              <span className="text-slate-500 block font-semibold">Total Cash Out to Safe:</span>
              <span className="text-lg font-black text-slate-900">৳{formatCurrency(totalWarehouseCashOut)}</span>
            </div>
            <div className={`border p-2.5 rounded ${totalWarehouseDiff > 0 ? 'bg-emerald-50 border-emerald-200' : totalWarehouseDiff < 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-600 block font-semibold">Net Branch Discrepancy:</span>
              <span className={`text-lg font-black ${totalWarehouseDiff > 0 ? 'text-emerald-700' : totalWarehouseDiff < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                {totalWarehouseDiff > 0 ? `+৳${formatCurrency(totalWarehouseDiff)}` : totalWarehouseDiff < 0 ? `-৳${formatCurrency(Math.abs(totalWarehouseDiff))}` : '৳0.00'}
              </span>
            </div>
          </div>

          {/* Cashier Sessions Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Cashier Closing Summaries</h3>
            <table className="w-full text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="text-left py-2 px-2.5">Biller / Cashier</th>
                  <th className="text-center py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Opening Float</th>
                  <th className="text-right py-2 px-2">Cash Out</th>
                  <th className="text-right py-2 px-2">Expected Cash</th>
                  <th className="text-right py-2 px-2">Counted Cash</th>
                  <th className="text-right py-2 px-2.5">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400 italic">No closing records registered for this date.</td>
                  </tr>
                ) : (
                  closings.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-bold text-slate-900">
                        {c.biller?.name}
                        {c.biller?.email && <span className="text-[10px] text-slate-400 font-normal block">{c.biller.email}</span>}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-slate-100 text-slate-700">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-medium">৳{formatCurrency(c.openingCash)}</td>
                      <td className="py-2 px-2 text-right font-medium">৳{formatCurrency(c.cashOut)}</td>
                      <td className="py-2 px-2 text-right font-semibold text-slate-800">৳{formatCurrency(c.availableCash)}</td>
                      <td className="py-2 px-2 text-right font-bold text-indigo-950">৳{formatCurrency(c.cashInHand)}</td>
                      <td className={`py-2 px-2.5 text-right font-black ${c.difference > 0 ? 'text-emerald-700' : c.difference < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                        {c.difference > 0 ? `+৳${formatCurrency(c.difference)}` : c.difference < 0 ? `-৳${formatCurrency(Math.abs(c.difference))}` : '৳0.00'}
                      </td>
                    </tr>
                  ))
                )}
                {closings.length > 0 && (
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                    <td className="py-2 px-2.5" colSpan={2}>Grand Total</td>
                    <td className="py-2 px-2 text-right font-black">৳{formatCurrency(totalWarehouseOpening)}</td>
                    <td className="py-2 px-2 text-right font-black">৳{formatCurrency(totalWarehouseCashOut)}</td>
                    <td className="py-2 px-2 text-right font-black">৳{formatCurrency(totalWarehouseAvailable)}</td>
                    <td className="py-2 px-2 text-right font-black text-indigo-950">৳{formatCurrency(totalWarehouseCashInHand)}</td>
                    <td className={`py-2 px-2.5 text-right font-black ${totalWarehouseDiff > 0 ? 'text-emerald-700' : totalWarehouseDiff < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                      {totalWarehouseDiff > 0 ? `+৳${formatCurrency(totalWarehouseDiff)}` : totalWarehouseDiff < 0 ? `-৳${formatCurrency(Math.abs(totalWarehouseDiff))}` : '৳0.00'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Individual Shift Details if any */}
          {closings.map((c, idx) => (
            <div key={idx} className="border-t-2 border-dashed border-slate-200 pt-6 mt-6 page-break-inside-avoid">
              <h4 className="text-xs font-black uppercase text-indigo-950 mb-3">Shift Details: {c.biller?.name} ({c.status})</h4>
              {renderSingleReport(c)}
            </div>
          ))}

          {/* Signatures */}
          <div className="pt-10 border-t border-slate-300 grid grid-cols-2 gap-10 text-xs mt-8">
            <div>
              <div className="border-t border-slate-400 pt-1.5 text-center font-bold text-slate-800">
                Prepared By: {printedBy || "Branch Cashier / Operator"}
              </div>
              <div className="text-center text-[10px] text-slate-500">Date: {formattedDate}</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5 text-center font-bold text-slate-800">
                Branch Manager / Auditor Approval
              </div>
              <div className="text-center text-[10px] text-slate-500">Signature & Seal</div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div 
        ref={ref} 
        className="p-8 bg-white text-slate-900 font-sans w-full max-w-[210mm] mx-auto min-h-[297mm] print:p-6 print:m-0 print:w-full print:max-w-none text-xs"
      >
        {mode === "single" ? renderSingleReport(closing) : renderConsolidatedReport()}
      </div>
    );
  }
);

POSDaybookPrintTemplate.displayName = "POSDaybookPrintTemplate";

export default POSDaybookPrintTemplate;
