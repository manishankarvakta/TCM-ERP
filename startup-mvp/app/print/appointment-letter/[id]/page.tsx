import React from "react";
import { getAppointmentLetterById } from "@/app/(dashboard)/dashboard/hr/appointment-letters/_actions/appointment-letter.action";
import { notFound } from "next/navigation";
import { format } from "date-fns";

interface PrintAppointmentLetterPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintAppointmentLetterPage({ params }: PrintAppointmentLetterPageProps) {
  const { id } = await params;
  const res = await getAppointmentLetterById(id);

  if (!res.success || !res.letter) {
    notFound();
  }

  const letter = res.letter;

  return (
    <div className="min-h-screen bg-white text-black p-12 max-w-4xl mx-auto space-y-8 font-serif leading-relaxed">
      {/* Header Letterhead */}
      <div className="border-b-2 border-black pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider">Enterprise ERP Systems Ltd.</h1>
          <p className="text-sm">HR & Corporate Affairs Division • Corporate Head Office</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono font-bold text-sm">{letter.letterNumber}</p>
          <p>Date: {format(new Date(letter.issueDate), "MMMM dd, yyyy")}</p>
        </div>
      </div>

      {/* Recipient Details */}
      <div className="space-y-1">
        <p className="font-bold">To,</p>
        <p className="font-bold text-lg">{letter.employee?.name}</p>
        <p>Employee ID: {letter.employee?.employeeCode}</p>
        <p>Email: {letter.employee?.email || "N/A"} | Phone: {letter.employee?.phone || "N/A"}</p>
      </div>

      {/* Subject */}
      <div className="font-bold text-lg underline">
        Subject: Letter of Appointment for the position of {letter.designation}
      </div>

      {/* Body Content */}
      <div className="space-y-4 text-sm leading-6">
        <p>Dear {letter.employee?.name},</p>
        <p>
          We are pleased to offer you employment with <strong>Enterprise ERP Systems Ltd.</strong> in the capacity of{" "}
          <strong>{letter.designation}</strong> under the <strong>{letter.department}</strong> Department, effective from your joining date on{" "}
          <strong>{format(new Date(letter.joiningDate), "MMMM dd, yyyy")}</strong>.
        </p>

        <h3 className="font-bold underline text-base pt-2">Salary & Compensation Breakdown</h3>
        <p>Your total Gross Monthly Compensation will be <strong>৳{Number(letter.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })} BDT</strong>, distributed as follows:</p>
        
        <table className="w-full border-collapse border border-gray-400 text-xs my-3">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-left">Salary Component</th>
              <th className="border border-gray-400 p-2 text-right">Monthly Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 p-2 font-medium">Basic Salary</td>
              <td className="border border-gray-400 p-2 text-right">৳{Number(letter.basicSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-2 font-medium">Allowances (House Rent, Medical, Transport, Food)</td>
              <td className="border border-gray-400 p-2 text-right">৳{(Number(letter.grossSalary) - Number(letter.basicSalary)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-gray-400 p-2">Total Gross Pay</td>
              <td className="border border-gray-400 p-2 text-right">৳{Number(letter.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="font-bold underline text-base pt-2">Terms & Conditions of Employment</h3>
        <p>1. <strong>Probation Period:</strong> You will be on probation for a period of {letter.probationMonths} months from your joining date.</p>
        <p>2. <strong>Code of Conduct:</strong> You agree to abide by company policies, non-disclosure agreements, and standard working hours.</p>
        <p>3. {letter.terms || "Standard employment and company policy terms apply."}</p>
      </div>

      {/* Signatures */}
      <div className="pt-16 flex justify-between items-end text-sm">
        <div className="text-center">
          <div className="border-t border-black w-48 pt-1">Authorized Signatory</div>
          <p className="text-xs text-gray-600">Head of Human Resources</p>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-48 pt-1">Employee Acceptance</div>
          <p className="text-xs text-gray-600">Signature & Date</p>
        </div>
      </div>
    </div>
  );
}
