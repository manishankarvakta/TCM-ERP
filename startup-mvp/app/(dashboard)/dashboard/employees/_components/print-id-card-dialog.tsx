"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface PrintIdCardDialogProps {
  employee: any;
  orgInfo: any;
}

export default function PrintIdCardDialog({ employee, orgInfo }: PrintIdCardDialogProps) {
  const [open, setOpen] = useState(false);

  // Format date safely
  const formatJoinDate = (dateString?: string | Date) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd-MMM-yyyy");
    } catch (e) {
      return "-";
    }
  };

  // Helper to extract initials safely
  const getInitials = (name?: string) => {
    if (!name) return "EM";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Helper to convert string to Title Case (Camel Case)
  const toTitleCase = (str?: string) => {
    if (!str) return "";
    return str
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handlePrint = () => {
    const cardElement = document.querySelector(".id-card-print-capture");
    if (!cardElement) return;

    // Open a clean print window
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    // Get all stylesheet link tags and custom style elements from current page
    const stylesheets = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((s) => s.outerHTML)
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print ID Card - ${employee.name}</title>
          ${stylesheets}
          <style>
            /* Force exact A4 portrait dimensions on page canvas */
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              background-color: #fff !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Reset container and position cards side-by-side at top center */
            .id-card-print-wrap {
              display: flex !important;
              flex-direction: row !important;
              flex-wrap: nowrap !important;
              justify-content: center !important;
              align-items: center !important;
              gap: 15mm !important;
              position: absolute !important;
              left: 50% !important;
              top: 1in !important;
              transform: translateX(-50%) !important;
              width: auto !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .id-card-print-wrap * {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            @page {
              size: A4 portrait;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="id-card-print-wrap">
            ${cardElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FiPrinter className="h-4 w-4" />
          Print ID Card
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl p-6 bg-slate-50 border-slate-200">
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FiPrinter className="text-indigo-600 h-5 w-5" />
            Employee ID Card Preview
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review the ID card design below. Clicking "Print Now" will print the layout on A4 paper preserving the standard CR80 size (54mm × 86mm).
          </p>
        </DialogHeader>

        {/* CSS rules for screen fonts */}
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

          .id-card-poppins {
            font-family: 'Poppins', sans-serif !important;
          }
        `}} />

        {/* Dialog Body - Scrollable visual area */}
        <div className="flex flex-col items-center justify-center py-6 gap-6 md:gap-10 overflow-y-auto max-h-[60vh] px-2">
          
          <div className="id-card-print-capture flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-12 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            
            {/* ============================================================== */}
            {/* CARD FRONT                                                     */}
            {/* ============================================================== */}
            <div className="relative w-[54mm] h-[86mm] bg-white rounded-[12px] border-2 border-slate-300 shadow-md overflow-hidden flex flex-col justify-between select-none box-border print:border-slate-300 print:rounded-[12px] print:shadow-none bg-no-repeat id-card-poppins pt-[8mm] pb-[8mm]">
              
              {/* Top Navy Block (Centered and Small) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[32mm] h-[4.5mm] bg-[#2b3b7c] rounded-b-full z-0"></div>
              
              {/* Bottom Navy Block (Centered and Small) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32mm] h-[4.5mm] bg-[#2b3b7c] rounded-t-full z-0"></div>

              {/* Lanyard Slot Placeholder */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white/20 rounded-full z-20 flex items-center justify-center">
                <div className="w-5 h-[2px] bg-[#2b3b7c]/40 rounded-full"></div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col justify-between items-center z-10 relative h-full">
                
                {/* Top Group: Logo, Avatar, Details with narrow gaps */}
                <div className="flex flex-col items-center justify-start gap-1 w-full">
                  
                  {/* Header section: Centered Logo */}
                  <div className="flex items-center justify-center">
                    <img src="/logo.png" alt="logo" className="h-[13mm] max-w-[42mm] object-contain" />
                  </div>

                  {/* Profile Avatar */}
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-[24mm] h-[24mm] rounded-full border-[2.5px] border-[#2b3b7c] shadow bg-white overflow-hidden flex items-center justify-center">
                      <Avatar className="w-full h-full rounded-none">
                        <AvatarImage src={employee.photo || undefined} className="object-cover w-full h-full" />
                        <AvatarFallback className="text-[16px] font-bold bg-slate-100 text-[#2b3b7c]">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Profile details */}
                  <div className="flex flex-col items-center text-center px-3 mt-1">
                    <h2 className="text-[13.5px] font-extrabold text-[#2b3b7c] tracking-tight line-clamp-2 max-w-[48mm] leading-tight">
                      {toTitleCase(employee.name)}
                    </h2>
                    <p className="text-[8.5px] font-medium text-slate-700 uppercase tracking-wider mt-0.5 truncate max-w-[48mm]">
                      {employee.designation || "Job Position"}
                    </p>
                    
                    {/* Blood Group Value */}
                    <p className="text-[7.5px] font-extrabold text-rose-600 uppercase tracking-wider mt-0.5">
                      {employee.bloodGroup || "-"}
                    </p>
                  </div>

                </div>

                {/* Employee ID & Issue Date */}
                <div className="flex flex-col items-center text-slate-700 leading-tight">
                  <span className="text-[9px] font-semibold tracking-wide">{employee.employeeCode || "-"}</span>
                  <span className="text-[8px] font-medium tracking-wide mt-0.5">{formatJoinDate(employee.joiningDate)}</span>
                </div>

              </div>

            </div>

            {/* ============================================================== */}
            {/* CARD BACK                                                      */}
            {/* ============================================================== */}
            <div className="relative w-[54mm] h-[86mm] bg-white rounded-[12px] border-2 border-slate-300 shadow-md overflow-hidden flex flex-col justify-between select-none box-border print:border-slate-300 print:rounded-[12px] print:shadow-none bg-no-repeat id-card-poppins pt-[8mm] pb-[8mm]">
              
              {/* Top Navy Block (Centered and Small) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[32mm] h-[4.5mm] bg-[#2b3b7c] rounded-b-full z-0"></div>
              
              {/* Bottom Navy Block (Centered and Small) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32mm] h-[4.5mm] bg-[#2b3b7c] rounded-t-full z-0"></div>

              {/* Lanyard Slot Placeholder */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-white/20 rounded-full z-20 flex items-center justify-center">
                <div className="w-5 h-[2px] bg-[#2b3b7c]/40 rounded-full"></div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col justify-between items-center z-10 relative h-full px-3.5">
                
                {/* Rules / Terms header */}
                <div className="text-center border-b border-slate-100 pb-1.5 w-full">
                  <span className="text-[7.5px] text-[#2b3b7c] font-bold uppercase tracking-widest">
                    TERMS & CONDITIONS
                  </span>
                </div>

                {/* Terms body */}
                <div className="space-y-2 text-center font-medium leading-relaxed text-[7px] text-slate-600 px-1">
                  <p className="tracking-wide">This card is the official property of the organization and is non-transferable.</p>
                  <p className="tracking-wide">It must be worn visibly at all times while on company premises.</p>
                  <div className="mt-2 space-y-0.5 font-bold text-[#2b3b7c]">
                    <p className="tracking-wide">
                      If found, please return to: <span className="underline">{orgInfo?.name || "the office"}</span>
                    </p>
                    <p className="tracking-wide text-[6.5px]">
                      Or contact: <span className="underline font-mono">{orgInfo?.phone || "Organization Phone"}</span>
                    </p>
                  </div>
                </div>

                {/* Signature zone */}
                <div className="flex flex-col items-center w-full">
                  <div className="w-[32mm] h-[8mm] border-b border-slate-300 relative flex items-end justify-center">
                  </div>
                  <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Authorized Signature
                  </span>
                </div>

                {/* Faux Barcode footer */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-[1px] h-[5mm] w-[34mm] bg-white overflow-hidden">
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                    <div className="w-[2px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[3px] h-full bg-black"></div>
                    <div className="w-[1px] h-full bg-black"></div>
                    <div className="w-[2px] h-full bg-black"></div>
                  </div>
                  <span className="text-[5px] font-mono text-slate-800 mt-0.5 uppercase leading-none">
                    *{employee.employeeCode || employee.id?.slice(-8) || "TEMP"}*
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-4 mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close Preview
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
            <FiPrinter className="mr-2 h-4 w-4" />
            Print Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
