"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiPrinter, FiX, FiCheckCircle } from "react-icons/fi";
import { getAppointmentLetterById } from "../_actions/appointment-letter.action";
import { useToast } from "@/hooks/use-toast";

interface AppointmentLetterPrintModalProps {
  letterId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentLetterPrintModal({
  letterId,
  open,
  onOpenChange,
}: AppointmentLetterPrintModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [letterData, setLetterData] = useState<any>(null);

  useEffect(() => {
    if (open && letterId) {
      setLoading(true);
      getAppointmentLetterById(letterId)
        .then((res) => {
          if (res.success && res.letter) {
            setLetterData(res.letter);
          } else {
            toast({
              title: "Error",
              description: res.error || "Failed to load letter details",
              variant: "destructive",
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, letterId, toast]);

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-none bg-slate-100 dark:bg-slate-950">
        {/* Modal Action Header (Hidden on print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Appointment Letter Preview
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <FiPrinter className="w-4 h-4" />
              <span>Print Letter</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <FiX className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Container */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading appointment letter...</div>
        ) : !letterData ? (
          <div className="p-12 text-center text-red-500">Letter data unavailable.</div>
        ) : (
          <div className="p-6 md:p-10 bg-white text-slate-900 print-light-schema mx-auto max-w-3xl my-4 rounded-lg shadow-lg print:shadow-none print:m-0 print:p-8 print:w-full print:max-w-none font-sans leading-relaxed" data-print-light="true">
            {/* Header / Letterhead */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
                  {letterData.organization?.name || "FF ERP ENTERPRISE"}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-md">
                  {letterData.organization?.address || "Corporate Head Office, Bangladesh"}
                </p>
                <p className="text-xs text-slate-600">
                  Phone: {letterData.organization?.phone || "+880 1700-000000"} | Email: {letterData.organization?.email || "hr@enterprise.com"}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-bold text-xs px-3 py-1 rounded">
                  APPOINTMENT LETTER
                </span>
                <p className="text-xs font-mono font-semibold mt-2 text-slate-800">
                  Ref: {letterData.letterNumber}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Date: {letterData.issueDate}
                </p>
              </div>
            </div>

            {/* Candidate / Employee Address */}
            <div className="mb-6 space-y-1 text-sm">
              <p className="font-semibold">To,</p>
              <p className="font-bold text-base text-slate-900">{letterData.employee?.name}</p>
              {letterData.employee?.employeeCode && (
                <p className="text-xs text-slate-600">Employee Code: {letterData.employee.employeeCode}</p>
              )}
              {letterData.employee?.phone && (
                <p className="text-xs text-slate-600">Phone: {letterData.employee.phone}</p>
              )}
              {letterData.employee?.email && (
                <p className="text-xs text-slate-600">Email: {letterData.employee.email}</p>
              )}
            </div>

            {/* Subject Line */}
            <div className="my-6 py-2 px-3 bg-slate-100 border-l-4 border-slate-900 font-semibold text-sm">
              Subject: Letter of Appointment for the Position of &quot;{letterData.designation}&quot;
            </div>

            {/* Letter Body */}
            <div className="space-y-4 text-sm text-slate-800">
              <p>Dear <strong>{letterData.employee?.name}</strong>,</p>

              <p>
                With reference to your application and subsequent interview for employment, we are pleased to offer you the position of{" "}
                <strong>{letterData.designation}</strong> in our{" "}
                <strong>{letterData.department || "General"}</strong> Department at{" "}
                <strong>{letterData.organization?.name || "the Management"}</strong>.
              </p>

              <p>
                Your employment will be effective from <strong>{letterData.joiningDate}</strong> under the following terms and conditions:
              </p>

              <ol className="list-decimal list-inside space-y-2 pl-2 text-slate-800">
                <li>
                  <strong>Probationary Period:</strong> You will be placed on a probationary period of <strong>{letterData.probationMonths} months</strong> starting from your date of joining. Upon successful completion of probation, your service will be confirmed in writing.
                </li>
                <li>
                  <strong>Work Location & Designation:</strong> You will be posted at our <strong>{letterData.workLocation || "Head Office"}</strong> office. The Management reserves the right to transfer your services to any department or location as deemed necessary.
                </li>
                <li>
                  <strong>Employment Category:</strong> Your category of employment is <strong>{letterData.employmentType}</strong>.
                </li>
              </ol>

              {/* Compensation Breakdown Table */}
              <div className="my-6">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700 mb-2">
                  Compensation & Remuneration Structure (Monthly)
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold">
                      <th className="border border-slate-300 p-2 text-left">Salary Component</th>
                      <th className="border border-slate-300 p-2 text-right">Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2">Basic Salary</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">
                        {letterData.basicSalary.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2">House Rent Allowance</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">
                        {letterData.houseRent.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2">Medical Allowance</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">
                        {letterData.medicalAllowance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2">Conveyance Allowance</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">
                        {letterData.conveyanceAllowance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2">Food Allowance</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">
                        {letterData.foodAllowance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                      <td className="border border-slate-300 p-2">Total Monthly Gross Salary</td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-slate-900">
                        BDT {letterData.grossSalary.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Additional Terms */}
              {letterData.termsAndConditions && (
                <div className="my-4 text-xs space-y-1">
                  <h4 className="font-semibold uppercase tracking-wider text-slate-700">
                    Standard Rules & Terms of Service
                  </h4>
                  <div className="whitespace-pre-line text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                    {letterData.termsAndConditions}
                  </div>
                </div>
              )}

              <p className="pt-2">
                We welcome you to our organization and look forward to a mutually beneficial working association.
              </p>

              <p className="pt-2">Sincerely,</p>
            </div>

            {/* Dual Signature Block */}
            <div className="grid grid-cols-2 gap-8 pt-16 mt-8 border-t border-slate-200">
              <div>
                <div className="w-40 border-b border-slate-900 mb-2"></div>
                <p className="font-bold text-xs uppercase text-slate-900">Authorized Signatory</p>
                <p className="text-xs text-slate-600">Human Resources Department</p>
                <p className="text-xs text-slate-500">{letterData.organization?.name || "Company Management"}</p>
              </div>

              <div className="text-right">
                <div className="w-40 border-b border-slate-900 mb-2 ml-auto"></div>
                <p className="font-bold text-xs uppercase text-slate-900">Candidate Acceptance</p>
                <p className="text-xs text-slate-600">{letterData.employee?.name}</p>
                <p className="text-xs text-slate-500">Date: ________________________</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
