import React from "react";
import { getPayrollById } from "@/app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action";
import { notFound } from "next/navigation";

interface PrintPayrollPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPayrollPage({ params }: PrintPayrollPageProps) {
  const { id } = await params;
  const res = await getPayrollById(id);

  if (!res.success || !res.payroll) {
    notFound();
  }

  const payroll = res.payroll;

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString("default", { month: "long" });
  };

  return (
    <div className="min-h-screen bg-white text-black p-8 font-sans">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Enterprise ERP Systems Ltd.</h1>
          <h2 className="text-lg font-semibold text-gray-700">
            Master Salary Sheet — {getMonthName(payroll.month)} {payroll.year}
          </h2>
        </div>
        <div className="text-right text-sm font-mono">
          <p className="font-bold">{payroll.payrollNumber}</p>
          <p>Status: {payroll.status}</p>
          <p>Total Payout: ৳{Number(payroll.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* High Density Master Table */}
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead>
          <tr className="bg-gray-200 text-center font-bold">
            <th className="border border-black p-1">SL</th>
            <th className="border border-black p-1 text-left">Code & Employee</th>
            <th className="border border-black p-1">Basic</th>
            <th className="border border-black p-1">House Rent</th>
            <th className="border border-black p-1">Medical</th>
            <th className="border border-black p-1">Transport</th>
            <th className="border border-black p-1">Food</th>
            <th className="border border-black p-1">OT Amount</th>
            <th className="border border-black p-1">Tiffin/Night/Holi</th>
            <th className="border border-black p-1">Gross</th>
            <th className="border border-black p-1 text-red-700">Absent Cut</th>
            <th className="border border-black p-1 text-red-700">Loan Cut</th>
            <th className="border border-black p-1 font-bold">Net Pay</th>
            <th className="border border-black p-1 w-24">Signature</th>
          </tr>
        </thead>
        <tbody>
          {payroll.items.map((item: any, idx: number) => {
            const shiftAllowances = Number(item.tiffinBill || 0) + Number(item.nightBill || 0) + Number(item.holidayBill || 0);
            return (
              <tr key={item.id} className="text-center">
                <td className="border border-black p-1">{idx + 1}</td>
                <td className="border border-black p-1 text-left font-medium">
                  {item.employee?.name} <span className="text-gray-500">({item.employee?.employeeCode})</span>
                </td>
                <td className="border border-black p-1">৳{Number(item.basic).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1">৳{Number(item.houseRent).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1">৳{Number(item.medical).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1">৳{Number(item.transport).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1">৳{Number(item.foodAllowance).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1">৳{Number(item.otAmount).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1">৳{shiftAllowances.toLocaleString("en-IN")}</td>
                <td className="border border-black p-1 font-semibold">৳{Number(item.grossPay).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1 text-red-700">৳{Number(item.absentDeduction).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1 text-red-700">৳{Number(item.loanDeduction).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1 font-bold">৳{Number(item.netPay).toLocaleString("en-IN")}</td>
                <td className="border border-black p-1"></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Signature Blocks */}
      <div className="pt-16 flex justify-between text-xs font-semibold">
        <div className="text-center">
          <div className="border-t border-black w-36 pt-1">Prepared By</div>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-36 pt-1">Checked By (HR)</div>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-36 pt-1">Accounts Audit</div>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-36 pt-1">Managing Director</div>
        </div>
      </div>
    </div>
  );
}
