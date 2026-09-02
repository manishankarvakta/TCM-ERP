"use client";

import React, { forwardRef } from "react";
import { format } from "date-fns";
import { numberToWords } from "@/lib/utils/number-to-words";

export interface VoucherPrintTemplateProps {
  voucher: {
    voucherNumber: string;
    date: Date;
    type: string;
    description: string | null;
    reference: string | null;
    status: string;
    organization?: {
      name: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      logo?: string | null;
    } | null;
    client?: {
      name: string | null;
      email: string;
      phone?: string | null;
      address?: string | null;
    } | null;
    supplier?: {
      name: string | null;
      email: string;
      phone?: string | null;
      address?: string | null;
    } | null;
    creatorName?: string;
    postedByName?: string | null;
    dueSummary?: {
      previousDue: number;
      paidAmount: number;
      remainingDue: number;
    } | null;
    lines: Array<{
      lineNumber: number;
      description: string | null;
      debitAmount: number;
      creditAmount: number;
      account: {
        name: string;
        code: string;
      };
    }>;
  };
}

const DEFAULT_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHQAAAB/CAYAAAA+XebkAAAACXBIWXMAAAWJAAAFiQFtaJ36AAAXN0lAAAAM0lEQVR4nO2dW3LiOhCG/05V7gN20A+9/w3sA6T3AVb0A3tqD+wDG+gK/VABVpAC1jC2AwAAAP//AwDHNQE/p+yLpgAAAABJRU5ErkJggg==";

const VoucherPrintTemplate = forwardRef<HTMLDivElement, VoucherPrintTemplateProps>(
  ({ voucher }, ref) => {
    
    // Calculate totals
    const totalDebit = voucher.lines.reduce((sum, line) => sum + Number(line.debitAmount), 0);
    const totalCredit = voucher.lines.reduce((sum, line) => sum + Number(line.creditAmount), 0);
    
    // Determine Party Details (Client or Supplier)
    const party = voucher.client || voucher.supplier || null;
    const partyName = party ? (party.name || party.email) : "N/A";
    const partyPhone = party?.phone || null;
    const partyAddress = party?.address || null;

    const org = voucher.organization;
    const rawLogo = org?.logo;
    const logoUrl = (rawLogo && rawLogo.trim() !== "" && rawLogo !== "null" && rawLogo !== "undefined") ? rawLogo : "/main_logo.png";
    const orgName = org?.name || "FERRARI FASHION";
    const orgAddress = org?.address || "Unique, Ashulia, Dhaka";
    const orgEmail = org?.email || "msferrarifashion4475@gmail.com";
    const orgPhone = org?.phone || "+880 19 5658 2108";

    const formattedAmountInWords = numberToWords(totalDebit > 0 ? totalDebit : totalCredit);

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans print:p-8 w-full max-w-[210mm] mx-auto min-h-[297mm]">
         {/* -- Header -- */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
             <div className="flex items-start gap-3.5">
                <div className="border border-slate-700 p-1 rounded-sm bg-white flex-shrink-0">
                   <img
                     src={logoUrl}
                     alt="Logo"
                     className="w-16 h-16 object-contain"
                     onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       if (target.src !== "/main_logo.png") {
                         target.src = "/main_logo.png";
                       }
                     }}
                   />
                </div>
                <div className="space-y-0.5">
                   <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 leading-snug">{orgName}</h1>
                   {orgAddress && <p className="text-xs text-slate-700 italic">{orgAddress}</p>}
                   {orgEmail && <p className="text-xs text-slate-700 italic">{orgEmail}</p>}
                   {orgPhone && <p className="text-xs text-slate-700 italic">{orgPhone}</p>}
                </div>
             </div>
             <div className="text-right">
                <h2 className="text-xl font-bold uppercase text-slate-800">{voucher.type} Voucher</h2>
                <div className="mt-2 text-sm">
                    <p><span className="font-semibold">Voucher No:</span> {voucher.voucherNumber}</p>
                    <p><span className="font-semibold">Date:</span> {format(new Date(voucher.date), "dd MMM yyyy")}</p>
                    <p><span className="font-semibold">Reference:</span> {voucher.reference || "N/A"}</p>
                    <p><span className="font-semibold">Status:</span> <span className="uppercase font-medium">{voucher.status}</span></p>
                </div>
             </div>
          </div>
        </div>

        {/* -- Voucher Details -- */}
        <div className="mb-6">
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="font-semibold block text-slate-500 text-xs uppercase">Pay To / Receive From:</span>
                    <span className="text-base font-medium block">{partyName}</span>
                    {partyPhone && <span className="text-xs text-slate-600 block">Phone: {partyPhone}</span>}
                    {partyAddress && <span className="text-xs text-slate-600 block">Address: {partyAddress}</span>}
                </div>
                <div>
                     <span className="font-semibold block text-slate-500 text-xs uppercase">Description:</span>
                     <span className="block">{voucher.description || "N/A"}</span>
                </div>
             </div>
        </div>

        {/* -- Table -- */}
        <div className="mb-6">
            <table className="w-full text-sm border-collapse border border-slate-300">
                <thead>
                    <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-300 px-3 py-2 text-left w-12">#</th>
                        <th className="border border-slate-300 px-3 py-2 text-left">Account</th>
                        <th className="border border-slate-300 px-3 py-2 text-left">Description</th>
                        <th className="border border-slate-300 px-3 py-2 text-right w-32">Debit</th>
                        <th className="border border-slate-300 px-3 py-2 text-right w-32">Credit</th>
                    </tr>
                </thead>
                <tbody>
                    {voucher.lines.map((line, index) => (
                        <tr key={index} className="even:bg-slate-50">
                            <td className="border border-slate-300 px-3 py-2 text-center text-slate-500">{index + 1}</td>
                            <td className="border border-slate-300 px-3 py-2 font-medium">
                                {line.account.name} <span className="text-xs text-slate-400">({line.account.code})</span>
                            </td>
                            <td className="border border-slate-300 px-3 py-2 text-slate-600">{line.description || "-"}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right">
                                {Number(line.debitAmount) > 0 ? Number(line.debitAmount).toFixed(2) : "-"}
                            </td>
                            <td className="border border-slate-300 px-3 py-2 text-right">
                                {Number(line.creditAmount) > 0 ? Number(line.creditAmount).toFixed(2) : "-"}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                        <td className="border border-slate-300 px-3 py-2 text-right" colSpan={3}>Totals</td>
                        <td className="border border-slate-300 px-3 py-2 text-right">{totalDebit.toFixed(2)}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right">{totalCredit.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* -- Due Summary Box (Previous Due - Paid Amount - Remaining Due) -- */}
        {voucher.dueSummary && (
          <div className="mb-6 border border-slate-300 rounded-lg p-3.5 bg-slate-50 text-sm">
            <h3 className="font-semibold uppercase text-xs text-slate-500 mb-2 tracking-wider">Party Due Balance Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="border-r border-slate-200 pr-2">
                <span className="block text-[11px] text-slate-500 uppercase font-medium">Previous Due</span>
                <span className="text-sm font-bold font-mono">৳{voucher.dueSummary.previousDue.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-r border-slate-200 px-2">
                <span className="block text-[11px] text-slate-500 uppercase font-medium">Paid / Voucher Amount</span>
                <span className="text-sm font-bold font-mono text-emerald-700">৳{voucher.dueSummary.paidAmount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="pl-2">
                <span className="block text-[11px] text-slate-500 uppercase font-medium">Remaining Due</span>
                <span className="text-sm font-bold font-mono text-slate-900">৳{voucher.dueSummary.remainingDue.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* -- Amount in Words -- */}
        <div className="mb-10 border-t border-b border-slate-200 py-2.5">
            <p className="text-sm">
                <span className="font-semibold text-slate-700">In Words: </span> 
                <span className="font-medium text-slate-900">{formattedAmountInWords}</span>
            </p>
        </div>

        {/* -- Signatures -- */}
        <div className="mt-16 pt-6">
            <div className="flex justify-between gap-8 text-center">
                <div className="flex-1">
                    <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">
                        <p className="text-xs font-semibold uppercase text-slate-700">{voucher.creatorName || "Prepared By"}</p>
                        <p className="text-[10px] text-slate-400">Prepared By</p>
                    </div>
                </div>
                <div className="flex-1">
                     <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">
                        <p className="text-xs font-semibold uppercase text-slate-700">Verified By</p>
                        <p className="text-[10px] text-slate-400">Accountant / Auditor</p>
                    </div>
                </div>
                <div className="flex-1">
                     <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">
                        <p className="text-xs font-semibold uppercase text-slate-700">{voucher.postedByName || "Approved By"}</p>
                        <p className="text-[10px] text-slate-400">Authorised Signatory</p>
                    </div>
                </div>
            </div>
        </div>

        {/* -- Footer -- */}
        <div className="mt-12 text-center text-xs text-slate-400 pt-4 border-t border-slate-100 print:fixed print:bottom-8 print:left-0 print:w-full">
            <p>Generated by {orgName} ERP on {format(new Date(), "PPpp")}</p>
        </div>

      </div>
    );
  }
);

VoucherPrintTemplate.displayName = "VoucherPrintTemplate";

export default VoucherPrintTemplate;
