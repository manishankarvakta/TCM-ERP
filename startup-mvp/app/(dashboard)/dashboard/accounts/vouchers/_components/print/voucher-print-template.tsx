"use client";

import React, { forwardRef } from "react";
import { format } from "date-fns";

export interface VoucherPrintTemplateProps {
  voucher: {
    voucherNumber: string;
    date: Date;
    type: string;
    description: string | null;
    reference: string | null;
    status: string;
    client?: {
      name: string | null;
      email: string;
    } | null;
    supplier?: {
      name: string | null;
      email: string;
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

const VoucherPrintTemplate = forwardRef<HTMLDivElement, VoucherPrintTemplateProps>(
  ({ voucher }, ref) => {
    
    // Calculate totals
    const totalDebit = voucher.lines.reduce((sum, line) => sum + Number(line.debitAmount), 0);
    const totalCredit = voucher.lines.reduce((sum, line) => sum + Number(line.creditAmount), 0);
    
    // Determine Party Name (Client or Supplier)
    let partyName = "N/A";
    if (voucher.client) {
        partyName = voucher.client.name || voucher.client.email;
    } else if (voucher.supplier) {
        partyName = voucher.supplier.name || voucher.supplier.email;
    }

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans print:p-8 w-full max-w-[210mm] mx-auto min-h-[297mm]">
         {/* -- Header -- */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">Ferrari Fashion </h1>
                <p className="text-sm text-slate-600">Company Address Line 1</p>
                <p className="text-sm text-slate-600">City, Country, ZIP</p>
                <p className="text-sm text-slate-600">Phone: +880 123 456 7890</p>
             </div>
             <div className="text-right">
                <h2 className="text-xl font-bold uppercase text-slate-800">{voucher.type} Voucher</h2>
                <div className="mt-2 text-sm">
                    <p><span className="font-semibold">Voucher No:</span> {voucher.voucherNumber}</p>
                    <p><span className="font-semibold">Date:</span> {format(new Date(voucher.date), "dd MMM yyyy")}</p>
                    <p><span className="font-semibold">Reference:</span> {voucher.reference || "N/A"}</p>
                    <p><span className="font-semibold">Status:</span> {voucher.status}</p>
                </div>
             </div>
          </div>
        </div>

        {/* -- Voucher Details -- */}
        <div className="mb-6">
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="font-semibold block text-slate-500 text-xs uppercase">Pay To / Receive From:</span>
                    <span className="text-base font-medium">{partyName}</span>
                </div>
                <div>
                     <span className="font-semibold block text-slate-500 text-xs uppercase">Description:</span>
                     <span>{voucher.description || "N/A"}</span>
                </div>
             </div>
        </div>

        {/* -- Table -- */}
        <div className="mb-8">
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
                     {/* Empty rows filler if needed for neatness, skipping for now */}
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
        
        {/* -- Amount in Words (Placeholder) -- */}
        <div className="mb-12 border-t pt-2">
            <p className="text-sm">
                <span className="font-semibold">In Words: </span> 
                 {/*  TODO: Implement number to words converter if needed */}
                <span className="italic text-slate-500 text-xs">(Functionality to be implemented)</span>
            </p>
        </div>


        {/* -- Signatures -- */}
        <div className="mt-20 pt-8">
            <div className="flex justify-between gap-8 text-center">
                <div className="flex-1">
                    <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">
                        <p className="text-xs font-semibold uppercase text-slate-600">Prepared By</p>
                    </div>
                </div>
                <div className="flex-1">
                     <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">
                        <p className="text-xs font-semibold uppercase text-slate-600">Verified By</p>
                    </div>
                </div>
                <div className="flex-1">
                     <div className="border-t border-slate-400 w-3/4 mx-auto pt-2">
                        <p className="text-xs font-semibold uppercase text-slate-600">Approved By</p>
                    </div>
                </div>
            </div>
        </div>

        {/* -- Footer -- */}
         <div className="mt-12 text-center text-xs text-slate-400 pt-4 border-t border-slate-100 print:fixed print:bottom-8 print:left-0 print:w-full">
            <p>Generated by Ferrari Fashion  ERP on {format(new Date(), "PPpp")}</p>
        </div>

      </div>
    );
  }
);

VoucherPrintTemplate.displayName = "VoucherPrintTemplate";

export default VoucherPrintTemplate;
