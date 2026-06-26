"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FiPrinter, FiArrowLeft } from "react-icons/fi";
import Link from "next/link";

interface PrintAllClientProps {
  payroll: any;
  orgInfo: any;
}

export default function PrintAllClient({ payroll, orgInfo }: PrintAllClientProps) {
  const formatCurrency = (amount: any) => {
    return `৳${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString("default", { month: "long" });
  };

  const chunkArray = (arr: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // Chunk items into groups of 3 (for exactly 3 payslips per portrait A4 page)
  const itemChunks = chunkArray(payroll.items, 3);
  const periodStr = `${getMonthName(payroll.month)} ${payroll.year}`;

  return (
    <div className="print-root-wrapper space-y-6 max-w-5xl mx-auto my-4">
      {/* Control panel - hidden during print */}
      <div className="flex justify-between items-center print:hidden bg-muted/40 p-4 rounded-lg border border-slate-200">
        <Link
          href={`/dashboard/hr/payroll/${payroll.id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Payroll Details
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            A4 Portrait Layout • 3 Payslips per Page • Left 35% Office Copy | Right 65% Employee Copy
          </span>
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
            <FiPrinter className="mr-2 h-4 w-4" />
            Print Now
          </Button>
        </div>
      </div>

      {/* Global CSS for page break rules on A4 media */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force override overflow and height restrictions on html, body and layout wrapper divs */
          html, body {
            overflow: visible !important;
            height: auto !important;
            min-height: 100% !important;
          }
          
          /* Target Next.js dashboard template layout divs to let them flow naturally */
          div.flex.h-screen.overflow-hidden,
          div.flex.flex-1.flex-col.overflow-hidden,
          main.flex-1.overflow-y-auto {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          /* Reset page wrapper for print */
          .print-root-wrapper {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .main-content, header, nav, footer, sidebar, .no-print {
            display: none !important;
          }
          
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
          
          .print-page-container {
            display: block !important;
          }
          .print-page-container:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}} />

      {/* Printable Pages */}
      <div className="space-y-8 print:space-y-0">
        {itemChunks.map((chunk, chunkIdx) => (
          <div
            key={chunkIdx}
            className="print-page-container border border-slate-200 print:border-0 rounded-lg p-6 print:p-0 bg-white shadow-sm print:shadow-none flex flex-col justify-start h-auto print:h-[280mm] print:max-h-[280mm] overflow-hidden box-border"
          >
            {chunk.map((item, itemIdx) => {
              const baseGrossSalary =
                Number(item.basic || 0) +
                Number(item.houseRent || 0) +
                Number(item.medical || 0) +
                Number(item.transport || 0) +
                Number(item.foodAllowance || 0);

              const bonusAndOth = Number(item.bonus || 0) + Number(item.otherAllowance || 0);
              const taxAndPf = Number(item.taxDeduction || 0) + Number(item.pfDeduction || 0);

              return (
                <div
                  key={item.id}
                  className="h-auto print:h-[91mm] print:max-h-[91mm] border-b border-gray-300 print:border-b-2 print:border-dashed py-4 print:py-3 flex overflow-hidden box-border last:border-b-0"
                >
                  {/* Left Column - Office Copy (35% width) */}
                  <div className="w-[35%] pr-4 border-r border-dashed border-gray-400 flex flex-col justify-between h-full text-[10px] text-gray-800">
                    <div>
                      <div className="font-bold text-[11px] uppercase tracking-wide truncate">
                        {orgInfo?.name || "Office Copy"}
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-gray-500 font-medium mt-0.5">
                        <span>Office Copy</span>
                        <span>{periodStr}</span>
                      </div>
                      <div className="border-t border-gray-200 my-1"></div>

                      <div className="grid grid-cols-2 gap-y-0.5 text-[9px] mt-1 bg-slate-50 p-1.5 rounded">
                        <div className="font-semibold">Code:</div>
                        <div className="font-mono text-right truncate">{item.employee.employeeCode || "N/A"}</div>
                        <div className="font-semibold">Name:</div>
                        <div className="text-right truncate">{item.employee.name}</div>
                        <div className="font-semibold">Designation:</div>
                        <div className="text-right truncate">{item.employee.designation || "N/A"}</div>
                      </div>

                      <div className="mt-2 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Basic Salary:</span>
                          <span>{formatCurrency(item.basic)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-[9px]">
                          <span>House Rent:</span>
                          <span>{formatCurrency(item.houseRent)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-[9px]">
                          <span>Other Allowances:</span>
                          <span>{formatCurrency(item.medical + item.transport + item.foodAllowance)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-gray-100 pt-0.5">
                          <span>Base Gross:</span>
                          <span>{formatCurrency(baseGrossSalary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>OT & Extras:</span>
                          <span>{formatCurrency(item.otAmount + item.tiffinAllowance + item.nightAllowance + item.holidayAllowance + bonusAndOth)}</span>
                        </div>
                        <div className="flex justify-between text-destructive">
                          <span>Total Deductions:</span>
                          <span>-{formatCurrency(item.totalDeduction)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="bg-emerald-50/50 p-1.5 rounded border border-emerald-100 flex justify-between items-center font-bold text-[10px] text-emerald-800">
                        <span>Net Payable:</span>
                        <span className="font-mono text-[11px]">{formatCurrency(item.netPay)}</span>
                      </div>
                      <div className="mt-3 flex flex-col items-center">
                        <div className="w-full border-t border-gray-400 mt-2"></div>
                        <span className="text-[8px] text-gray-400 mt-0.5">Received By (Employee Signature)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Employee Copy (65% width) */}
                  <div className="w-[65%] pl-4 flex flex-col justify-between h-full text-[10px] text-gray-800">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-[12px] uppercase tracking-wide">
                            {orgInfo?.name || "Company Name"}
                          </div>
                          <div className="text-[8px] text-gray-400 truncate max-w-[280px]">
                            {orgInfo?.address || "Company Address"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[10px] text-gray-700">Salary Slip - Employee Copy</div>
                          <div className="text-[9px] text-gray-500 font-medium">{periodStr}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[9px] my-1.5 bg-slate-50/50 p-1.5 rounded border border-slate-100">
                        <span className="font-semibold text-gray-500">Employee Code:</span>
                        <span className="font-mono font-medium">{item.employee.employeeCode || "N/A"}</span>
                        <span className="font-semibold text-gray-500">Employee Name:</span>
                        <span className="font-medium truncate">{item.employee.name}</span>
                        <span className="font-semibold text-gray-500">Department:</span>
                        <span className="truncate">{item.employee.department || "N/A"}</span>
                        <span className="font-semibold text-gray-500">Designation:</span>
                        <span className="truncate">{item.employee.designation || "N/A"}</span>
                      </div>

                      {/* Main Financial breakdown - Grid style */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                        {/* Earnings Panel */}
                        <div className="space-y-0.5 border-r pr-2 border-gray-100">
                          <div className="font-bold text-gray-700 uppercase tracking-wide border-b pb-0.5 text-[8px]">Earnings</div>
                          <div className="flex justify-between">
                            <span>Base Gross Salary</span>
                            <span>{formatCurrency(baseGrossSalary)}</span>
                          </div>
                          <div className="flex justify-between text-gray-400 text-[8px] pl-1.5">
                            <span>• Basic (55%):</span>
                            <span>{formatCurrency(item.basic)}</span>
                          </div>
                          <div className="flex justify-between text-gray-400 text-[8px] pl-1.5">
                            <span>• House Rent (26%):</span>
                            <span>{formatCurrency(item.houseRent)}</span>
                          </div>
                          <div className="flex justify-between text-gray-400 text-[8px] pl-1.5">
                            <span>• Other Allowances:</span>
                            <span>{formatCurrency(item.medical + item.transport + item.foodAllowance)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overtime Pay (OT)</span>
                            <span>{formatCurrency(item.otAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Other Bills/Bonus</span>
                            <span>{formatCurrency(item.tiffinAllowance + item.nightAllowance + item.holidayAllowance + bonusAndOth)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-800 border-t pt-0.5 border-gray-100">
                            <span>Total Earnings</span>
                            <span>{formatCurrency(item.grossPay)}</span>
                          </div>
                        </div>

                        {/* Deductions Panel */}
                        <div className="space-y-0.5 flex flex-col justify-between">
                          <div>
                            <div className="font-bold text-gray-700 uppercase tracking-wide border-b pb-0.5 text-[8px]">Deductions</div>
                            <div className="flex justify-between">
                              <span>Absent Deduction</span>
                              <span>{formatCurrency(item.absentDeduction)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Late Deduction</span>
                              <span>{formatCurrency(item.lateDeduction)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Loan Deduction</span>
                              <span>{formatCurrency(item.loanDeduction)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax & PF</span>
                              <span>{formatCurrency(taxAndPf)}</span>
                            </div>
                            {Number(item.otherDeduction) > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>Other Deduction</span>
                                <span>{formatCurrency(item.otherDeduction)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between font-bold text-red-800 border-t pt-0.5 border-gray-100">
                            <span>Total Deductions</span>
                            <span>{formatCurrency(item.totalDeduction)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="bg-emerald-600 text-emerald-foreground p-1.5 rounded flex justify-between items-center font-bold text-[11px]">
                        <span className="uppercase tracking-wide font-sans">Net Payable Salary:</span>
                        <span className="font-mono text-[13px]">{formatCurrency(item.netPay)}</span>
                      </div>

                      {/* Footer Signatures */}
                      <div className="grid grid-cols-2 gap-4 text-center mt-3 text-[8px] text-gray-500">
                        <div className="flex flex-col items-center">
                          <div className="w-24 border-t border-gray-400 mt-2"></div>
                          <span className="mt-0.5">Employee Signature</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-24 border-t border-gray-400 mt-2"></div>
                          <span className="mt-0.5">Authorized Signature</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
