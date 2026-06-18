"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiPrinter, FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { format } from "date-fns";

export default function PayslipClient({ payrollItem, attendanceSummary, orgInfo }: any) {
  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: any) => {
    return `৳${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  const payrollTitle = `Salary Slip - ${getMonthName(payrollItem.payroll.month)} ${payrollItem.payroll.year}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Non-printable controls */}
      <div className="flex justify-between items-center print:hidden">
        <Link href={`/dashboard/hr/payroll/${payrollItem.payrollId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary">
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Payroll
        </Link>
        <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
          <FiPrinter className="mr-2 h-4 w-4" />
          Print Payslip
        </Button>
      </div>

      {/* Printable Area */}
      <Card className="print:border-0 print:shadow-none bg-white text-black p-8">
        {/* Header Section */}
        <div className="text-center border-b pb-6 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">{orgInfo?.name || "Company Name"}</h1>
          <p className="text-sm text-gray-500 mt-1">{orgInfo?.address || "Company Address"}</p>
          <p className="text-sm text-gray-500">{orgInfo?.phone && `Phone: ${orgInfo.phone} | `}{orgInfo?.email && `Email: ${orgInfo.email}`}</p>
          <div className="mt-4 bg-gray-100 py-2 rounded-md">
            <h2 className="text-lg font-semibold text-gray-800">{payrollTitle}</h2>
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-sm">
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-semibold text-gray-600">Employee Code:</span>
            <span className="text-gray-900">{payrollItem.employee.employeeCode || "N/A"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-semibold text-gray-600">Employee Name:</span>
            <span className="text-gray-900 font-medium">{payrollItem.employee.name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-semibold text-gray-600">Department:</span>
            <span className="text-gray-900">{payrollItem.employee.department?.name || "N/A"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-semibold text-gray-600">Designation:</span>
            <span className="text-gray-900">{payrollItem.employee.designation || "N/A"}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-semibold text-gray-600">Payment Status:</span>
            <span className="text-gray-900 capitalize">{payrollItem.status}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span className="font-semibold text-gray-600">Payroll Voucher:</span>
            <span className="text-gray-900">{payrollItem.payroll.voucherId || "Not Posted"}</span>
          </div>
        </div>

        {/* Attendance Summary Grid */}
        <div className="mb-8">
          <h3 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">Attendance Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">Working Days:</span>
              <span className="font-medium text-gray-900">{attendanceSummary.totalWorkingDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Present:</span>
              <span className="font-medium text-gray-900">{attendanceSummary.present}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Absent:</span>
              <span className="font-medium text-red-600">{attendanceSummary.absent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Late Days:</span>
              <span className="font-medium text-amber-600">{attendanceSummary.late}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Leave Days:</span>
              <span className="font-medium text-blue-600">{attendanceSummary.leave}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Overtime Hours:</span>
              <span className="font-medium text-emerald-600">{attendanceSummary.totalOtHours}</span>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Earnings */}
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">Earnings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Basic Salary</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.basic)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">House Rent</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.houseRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Medical Allowance</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.medical)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transport Allowance</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.transport)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Food Allowance</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.foodAllowance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bonus</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.bonus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overtime Amount</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.otAmount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200 font-semibold">
                <span className="text-gray-800">Gross Earnings</span>
                <span className="text-emerald-600">{formatCurrency(payrollItem.grossPay)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-1">Deductions</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Absent/Late Deduction</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.absentDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan/Advance Deduction</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.loanDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Deduction</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.taxDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PF Deduction</span>
                <span className="text-gray-900">{formatCurrency(payrollItem.pfDeduction)}</span>
              </div>
              <div className="flex justify-between pt-[104px] border-t border-gray-200 font-semibold">
                <span className="text-gray-800">Total Deductions</span>
                <span className="text-red-600">{formatCurrency(payrollItem.totalDeduction)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Pay Final */}
        <div className="bg-gray-100 p-4 rounded-md border border-gray-200 flex justify-between items-center mb-12">
          <span className="text-lg font-bold text-gray-800">Net Payable Amount</span>
          <span className="text-2xl font-bold text-emerald-700 border-b-2 border-emerald-700">{formatCurrency(payrollItem.netPay)}</span>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 gap-8 text-center pt-8 mt-12 text-sm text-gray-600">
          <div>
            <div className="w-48 mx-auto border-t border-gray-400 pt-2">
              Employee Signature
            </div>
          </div>
          <div>
            <div className="w-48 mx-auto border-t border-gray-400 pt-2">
              Authorized Signature
            </div>
          </div>
        </div>

        <div className="text-center mt-12 text-xs text-gray-400 italic">
          This is a system generated payslip on {format(new Date(), "PPP 'at' p")} and does not require a physical signature for validity.
        </div>
      </Card>
    </div>
  );
}
