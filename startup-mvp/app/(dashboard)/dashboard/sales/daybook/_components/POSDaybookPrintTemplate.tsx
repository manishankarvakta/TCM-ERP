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

    // ==========================================
    // 1. CONSOLIDATED ALL-BILLER TOTALS SUMMARY
    // ==========================================
    const renderConsolidatedSummaryTable = () => {
      // Aggregate across all closings
      let totalSystemCashSales = 0;
      let totalDerivedCashSales = 0;
      let totalSystemDueCollection = 0;
      let totalLoyalty = 0;

      // Aggregated method map
      const methodTotals: Record<string, { label: string; systemAmt: number; receivedAmt: number }> = {};
      STANDARD_METHODS.forEach(m => {
        methodTotals[m.key] = { label: m.label, systemAmt: 0, receivedAmt: 0 };
      });

      // Combined Denominations
      const combinedDenom: Record<string, number> = {
        note1000: 0, note500: 0, note200: 0, note100: 0, note50: 0,
        note20: 0, note10: 0, note5: 0, note2: 0, note1: 0
      };

      let totalPhysicalCash = 0;
      let totalCashOut = 0;
      let totalOpeningCash = 0;
      let totalCreditSales = 0;

      closings.forEach(c => {
        const den = c.denominations || {};
        Object.keys(combinedDenom).forEach(k => {
          combinedDenom[k] += Number(den[k] || 0);
        });

        const counted = Number(c.cashInHand || 0);
        const cashOut = Number(c.cashOut || 0);
        const opening = Number(c.openingCash || 0);
        const derivedCash = (counted + cashOut) - opening;

        totalPhysicalCash += counted;
        totalCashOut += cashOut;
        totalOpeningCash += opening;
        totalCreditSales += Number(c.todaysCreditSales || 0);
        totalLoyalty += Number(c.loyaltyPoints || 0);

        // Aggregate collections
        const cols = c.collections || [];
        const cashCol = cols.find((col: any) => col.paymentMethodName?.toLowerCase().includes("cash"));
        if (cashCol) {
          const sysCash = Number(cashCol.regularCollection || 0);
          totalSystemCashSales += sysCash;
          totalSystemDueCollection += Number(cashCol.duesCollection || 0);
          totalDerivedCashSales += (derivedCash > 0 ? derivedCash : sysCash);
        }

        STANDARD_METHODS.forEach(m => {
          const found = cols.find((col: any) => {
            const name = col.paymentMethodName?.toLowerCase() || "";
            return m.aliases.some(alias => name.includes(alias));
          });
          if (found) {
            methodTotals[m.key].systemAmt += Number(found.regularCollection || 0);
            methodTotals[m.key].receivedAmt += Number(found.totalReceived || 0);
          }
        });
      });

      const totalSystemSales = totalSystemCashSales + Object.values(methodTotals).reduce((sum, m) => sum + m.systemAmt, 0) + totalLoyalty;
      const totalReceivedSales = totalDerivedCashSales + Object.values(methodTotals).reduce((sum, m) => sum + m.receivedAmt, 0) + totalLoyalty;
      const difference = totalReceivedSales - totalSystemSales;

      return (
        <div className="space-y-6 max-w-[800px] mx-auto bg-white text-black font-sans">
          
          {/* Main Top Header */}
          <div className="text-center space-y-1 border-b-2 border-black pb-3">
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950">Daily Sales Summary Report</h1>
            <p className="text-xs font-bold text-slate-700">Branch: <span className="font-normal">{warehouseName}</span> | All Billers Consolidated</p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-4 gap-2.5 text-xs">
            <div className="border border-slate-300 p-2.5 rounded bg-slate-50 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total System Sales</span>
              <span className="text-base font-black text-slate-900">৳{formatCurrency(totalSystemSales)}</span>
            </div>
            <div className="border border-slate-300 p-2.5 rounded bg-slate-50 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Physical Cash In Hand</span>
              <span className="text-base font-black text-indigo-950">৳{formatCurrency(totalPhysicalCash)}</span>
            </div>
            <div className="border border-slate-300 p-2.5 rounded bg-slate-50 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Cash Out to Safe</span>
              <span className="text-base font-black text-slate-900">৳{formatCurrency(totalCashOut)}</span>
            </div>
            <div className={`border p-2.5 rounded text-center ${difference > 0 ? 'bg-emerald-50 border-emerald-300' : difference < 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-300'}`}>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Drawer Variance</span>
              <span className={`text-base font-black ${difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {difference > 0 ? `+৳${formatCurrency(difference)} (Excess)` : difference < 0 ? `-৳${formatCurrency(Math.abs(difference))} (Short)` : '৳0.00'}
              </span>
            </div>
          </div>

          {/* EXACT SPREADSHEET REPLICA TABLE */}
          <div className="border-2 border-black overflow-hidden shadow-sm">
            <table className="w-full text-xs border-collapse">
              <thead>
                {/* Big Date Header Row */}
                <tr className="bg-white border-b-2 border-black">
                  <th colSpan={3} className="py-2.5 text-center text-2xl font-black italic tracking-wide">
                    {formattedDate}
                  </th>
                </tr>
                <tr className="bg-[#90cdf4] font-bold border-b border-black text-slate-900 text-xs">
                  <th className="py-1 px-3 text-left border-r border-black italic">Particulars</th>
                  <th className="py-1 px-3 text-right border-r border-black italic">System Sales</th>
                  <th className="py-1 px-3 text-right italic">Realized / Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-semibold text-xs">
                {/* Cash Sales Row */}
                <tr className="h-6 font-bold bg-slate-50/40">
                  <td className="py-1 px-3 italic border-r border-black font-black text-slate-950">Cash sales</td>
                  <td className="py-1 px-3 text-right border-r border-black font-black text-slate-950">{formatNumber(totalSystemCashSales)}</td>
                  <td className="py-1 px-3 text-right font-black text-slate-950">{formatNumber(totalDerivedCashSales)}</td>
                </tr>

                {/* Gateway Rows */}
                {Object.values(methodTotals).map((m, idx) => (
                  <tr key={idx} className="h-5 hover:bg-slate-50">
                    <td className={`py-0.5 px-3 italic border-r border-black ${m.label === 'Upay' ? 'bg-[#702082] text-white font-bold' : m.label === 'e-Commerce_Online' ? 'bg-[#00b0f0] text-white font-bold' : 'text-slate-800'}`}>
                      {m.label}
                    </td>
                    <td className="py-0.5 px-3 text-right border-r border-black font-medium">{formatNumber(m.systemAmt)}</td>
                    <td className="py-0.5 px-3 text-right font-medium">{formatNumber(m.receivedAmt)}</td>
                  </tr>
                ))}

                {/* Loyalty / Coupon Row */}
                <tr className="h-5">
                  <td className="py-0.5 px-3 italic border-r border-black text-slate-700">Loyalty/Cupon/Others</td>
                  <td className="py-0.5 px-3 text-right border-r border-black font-medium">{formatNumber(totalLoyalty)}</td>
                  <td className="py-0.5 px-3 text-right">-</td>
                </tr>

                {/* Total Sales Row */}
                <tr className="h-8 border-t-2 border-black font-black bg-white">
                  <td className="py-1.5 px-3 italic border-r border-black font-black text-sm">Total Sales</td>
                  <td className="py-1.5 px-3 text-right border-r border-black font-black text-sm">{formatCurrency(totalSystemSales)}</td>
                  <td className="py-1.5 px-3 text-right font-black text-sm">{totalReceivedSales > 0 ? totalReceivedSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                </tr>

                {/* Difference Highlight Row */}
                <tr className="h-7 border-t border-black font-bold">
                  <td className="py-1 px-3 italic border-r border-black text-right pr-6" colSpan={2}>
                    <span className="text-xs font-bold italic">Difference / Variance:</span>
                  </td>
                  <td className={`py-1 px-3 text-center font-black text-xs ${difference > 0 ? 'bg-[#00b050] text-black font-black' : difference < 0 ? 'bg-[#ff0000] text-white font-black' : 'bg-slate-100 font-bold'}`}>
                    {difference > 0 ? `${difference.toFixed(2)} (Excess)` : difference < 0 ? `${Math.abs(difference).toFixed(2)} (Short)` : "0.00 (Exact)"}
                  </td>
                </tr>

                {/* Due Collection Row (Yellow Highlight) */}
                <tr className="h-7 bg-[#ffff00] border-t-2 border-black font-bold text-black">
                  <td className="py-1 px-3 italic border-r border-black font-black">Due Collection</td>
                  <td className="py-1 px-3 text-right border-r border-black font-black">{formatCurrency(totalSystemDueCollection)}</td>
                  <td className="py-1 px-3 text-right font-black">{formatCurrency(totalSystemDueCollection)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cashier Contribution Breakdown (if multiple billers exist) */}
          {closings.length > 0 && (
            <div className="space-y-2 pt-2 page-break-inside-avoid">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Cashier / Biller Breakdown</h3>
              <table className="w-full text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-700">
                    <th className="py-1.5 px-2 text-left">Cashier</th>
                    <th className="py-1.5 px-2 text-center">Status</th>
                    <th className="py-1.5 px-2 text-right">Opening Float</th>
                    <th className="py-1.5 px-2 text-right">Cash Out</th>
                    <th className="py-1.5 px-2 text-right">Counted Cash</th>
                    <th className="py-1.5 px-2 text-right">Credit Sales</th>
                    <th className="py-1.5 px-2 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {closings.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1 px-2 font-bold text-slate-900">{c.biller?.name || "Cashier"}</td>
                      <td className="py-1 px-2 text-center text-[10px] font-bold uppercase">{c.status}</td>
                      <td className="py-1 px-2 text-right">৳{formatCurrency(c.openingCash)}</td>
                      <td className="py-1 px-2 text-right">৳{formatCurrency(c.cashOut)}</td>
                      <td className="py-1 px-2 text-right font-bold text-indigo-950">৳{formatCurrency(c.cashInHand)}</td>
                      <td className="py-1 px-2 text-right">৳{formatCurrency(c.todaysCreditSales)}</td>
                      <td className={`py-1 px-2 text-right font-black ${c.difference > 0 ? 'text-emerald-700' : c.difference < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                        {c.difference > 0 ? `+৳${formatCurrency(c.difference)}` : c.difference < 0 ? `-৳${formatCurrency(Math.abs(c.difference))}` : '৳0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-10 text-xs mt-6">
            <div>
              <div className="border-t border-black pt-1 text-center font-bold">
                Prepared By: {printedBy || "Branch Cashier / Accountant"}
              </div>
              <div className="text-center text-[10px] text-slate-500">Date: {formattedDate}</div>
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

    // ==========================================
    // 2. INDIVIDUAL BILLER CLOSING SHEET
    // ==========================================
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

      const collections = c.collections || [];
      const cashCol = collections.find((col: any) => col.paymentMethodName?.toLowerCase().includes("cash"));
      const systemCashSales = cashCol ? Number(cashCol.regularCollection || 0) : 0;
      const systemCashDues = cashCol ? Number(cashCol.duesCollection || 0) : 0;

      const methodData = STANDARD_METHODS.map(m => {
        const found = collections.find((col: any) => {
          const name = col.paymentMethodName?.toLowerCase() || "";
          return m.aliases.some(alias => name.includes(alias));
        });
        const systemAmt = found ? Number(found.regularCollection || 0) : 0;
        const receivedAmt = found ? Number(found.totalReceived || 0) : 0;
        return { label: m.label, systemAmt, receivedAmt };
      });

      const loyaltySystem = Number(c.loyaltyPoints || 0);
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

    return (
      <div 
        ref={ref} 
        className="p-6 bg-white text-black font-sans w-full max-w-[210mm] mx-auto min-h-[297mm] print:p-2 print:m-0 print:w-full print:max-w-none text-xs"
      >
        {mode === "single" ? renderSingleSummary(closing) : renderConsolidatedSummaryTable()}
      </div>
    );
  }
);

POSDaybookPrintTemplate.displayName = "POSDaybookPrintTemplate";

export default POSDaybookPrintTemplate;
