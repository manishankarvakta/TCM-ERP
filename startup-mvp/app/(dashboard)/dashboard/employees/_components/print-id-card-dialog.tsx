"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiPrinter, FiUser } from "react-icons/fi";
import { format } from "date-fns";

interface PrintIDCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    name: string;
    employeeCode: string | null;
    designation: string | null;
    department: string | null;
    photo: string | null;
    joiningDate: Date | string | null;
    gender: string | null;
    phone: string | null;
    nationalId: string | null;
    emergencyContact?: any;
    address?: any;
  } | null;
}

export default function PrintIDCardDialog({
  open,
  onOpenChange,
  employee,
}: PrintIDCardDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!employee) return null;

  const handlePrint = () => {
    const printContent = cardRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ID Card - ${employee.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-container {
              display: flex;
              gap: 20mm;
              justify-content: center;
              align-items: flex-start;
            }
            .id-card {
              width: 54mm;
              height: 85.6mm;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              position: relative;
              background: #ffffff;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header-banner {
              background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
              color: #ffffff;
              padding: 8px 6px;
              text-align: center;
            }
            .company-name {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .company-sub {
              font-size: 7px;
              opacity: 0.85;
            }
            .avatar-section {
              margin: 8px auto 4px auto;
              width: 24mm;
              height: 28mm;
              border-radius: 4px;
              border: 2px solid #3b82f6;
              overflow: hidden;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .avatar-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .info-section {
              text-align: center;
              padding: 0 6px;
            }
            .emp-name {
              font-size: 11px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 2px;
            }
            .emp-designation {
              font-size: 8px;
              font-weight: 600;
              color: #2563eb;
            }
            .emp-dept {
              font-size: 7.5px;
              color: #6b7280;
            }
            .card-footer-badge {
              margin-top: auto;
              background: #f8fafc;
              border-top: 1px dashed #e2e8f0;
              padding: 4px 6px;
              display: flex;
              justify-content: space-between;
              font-size: 7px;
              color: #334155;
            }
            .back-body {
              padding: 8px;
              font-size: 7.5px;
              color: #374151;
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .back-title {
              font-size: 8px;
              font-weight: 700;
              color: #1e3a8a;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 2px;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .barcode-placeholder {
              height: 12mm;
              background: repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px);
              margin: 6px 0;
            }
            .sign-line {
              border-top: 1px solid #9ca3af;
              width: 70%;
              margin: 12px auto 2px auto;
              text-align: center;
              font-size: 6.5px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formattedJoinDate = employee.joiningDate
    ? format(new Date(employee.joiningDate), "dd-MMM-yyyy")
    : "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Employee ID Card Canvas</span>
            <Button size="sm" onClick={handlePrint} className="gap-2">
              <FiPrinter className="h-4 w-4" />
              Print ID Card
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 flex justify-center bg-muted/20 rounded-lg p-6">
          <div ref={cardRef} className="flex flex-wrap gap-8 justify-center">
            {/* FRONT SIDE */}
            <div className="w-[54mm] h-[85.6mm] border rounded-lg shadow-md bg-white overflow-hidden flex flex-col justify-between text-xs select-none">
              <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-2 text-center">
                <div className="text-[11px] font-extrabold uppercase tracking-wide">ffERP Enterprise</div>
                <div className="text-[7px] opacity-80 uppercase">Employee Identity Card</div>
              </div>

              <div className="mx-auto w-[24mm] h-[28mm] border-2 border-blue-600 rounded bg-slate-100 flex items-center justify-center overflow-hidden my-1">
                {employee.photo ? (
                  <img
                    src={employee.photo}
                    alt={employee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser size={36} className="text-slate-400" />
                )}
              </div>

              <div className="text-center px-1">
                <div className="text-[11px] font-bold text-slate-900 leading-tight">
                  {employee.name}
                </div>
                <div className="text-[8px] font-semibold text-blue-600 mt-0.5">
                  {employee.designation || "Staff Member"}
                </div>
                <div className="text-[7.5px] text-slate-500">
                  {employee.department || "General"}
                </div>
              </div>

              <div className="bg-slate-50 border-t border-dashed border-slate-200 px-2 py-1 flex justify-between text-[7.5px] text-slate-700 font-mono">
                <div>
                  <span className="text-slate-400">ID: </span>
                  <span className="font-bold">{employee.employeeCode || employee.id.slice(-6)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Join: </span>
                  <span>{formattedJoinDate}</span>
                </div>
              </div>
            </div>

            {/* BACK SIDE */}
            <div className="w-[54mm] h-[85.6mm] border rounded-lg shadow-md bg-white overflow-hidden flex flex-col justify-between text-[7.5px] p-2 text-slate-700 select-none">
              <div>
                <div className="text-[8px] font-bold text-blue-900 border-b pb-0.5 mb-1 uppercase">
                  Return Info & Emergency
                </div>
                <p className="leading-snug text-slate-600">
                  If found, please return this card to ffERP Corporate Office.
                </p>
                <div className="mt-2 space-y-1">
                  <div>
                    <span className="font-semibold">Phone:</span> {employee.phone || "+880 1700-000000"}
                  </div>
                  <div>
                    <span className="font-semibold">Emergency:</span>{" "}
                    {employee.emergencyContact?.phone || employee.phone || "N/A"}
                  </div>
                  <div>
                    <span className="font-semibold">National ID:</span> {employee.nationalId || "N/A"}
                  </div>
                </div>
              </div>

              <div>
                <div className="h-[10mm] bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 my-1 rounded" />
                <div className="border-t border-slate-400 w-3/4 mx-auto mt-4 pt-0.5 text-center text-[6.5px] text-slate-500">
                  Authorized Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
