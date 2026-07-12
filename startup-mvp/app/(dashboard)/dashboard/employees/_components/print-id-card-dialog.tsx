"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiPrinter, FiLayers } from "react-icons/fi";
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

  // Safe parse emergency contact
  const getEmergencyContact = () => {
    if (!employee.emergencyContact) return null;
    if (typeof employee.emergencyContact === "string") {
      try {
        return JSON.parse(employee.emergencyContact);
      } catch (e) {
        return null;
      }
    }
    return employee.emergencyContact;
  };

  const emergency = getEmergencyContact();

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

        {/* CSS rules for printing and fonts */}
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

          .id-card-poppins {
            font-family: 'Poppins', sans-serif !important;
          }

          @media print {
            /* Force background graphics to print in all browsers */
            html, body {
              height: auto !important;
              overflow: visible !important;
              background-color: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Hide absolute everything in the application */
            body * {
              visibility: hidden !important;
            }
            
            /* Make only the capture area and its children visible */
            .id-card-print-capture,
            .id-card-print-capture * {
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Reset Radix UI Dialog parent containers positioning to prevent offset coordinate shifts */
            div[data-radix-portal],
            div[role="dialog"],
            div[role="dialog"] > * {
              position: static !important;
              transform: none !important;
              width: auto !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            
            /* Enforce printing in correct position and layout */
            .id-card-print-capture {
              position: absolute !important;
              left: 50% !important;
              top: 15mm !important;
              transform: translateX(-50%) !important;
              width: auto !important;
              height: auto !important;
              display: flex !important;
              flex-direction: row !important;
              justify-content: center !important;
              align-items: center !important;
              gap: 15mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: transparent !important;
              border: none !important;
              box-shadow: none !important;
            }

            /* Direct printer size controls */
            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
        `}} />

        {/* Dialog Body - Scrollable visual area */}
        <div className="flex flex-col items-center justify-center py-6 gap-6 md:gap-10 overflow-y-auto max-h-[60vh] px-2">
          
          <div className="id-card-print-capture flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-12 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            
            {/* ============================================================== */}
            {/* CARD FRONT                                                     */}
            {/* ============================================================== */}            <div className="relative w-[54mm] h-[86mm] bg-white rounded-[12px] border-2 border-slate-300 shadow-md overflow-hidden flex flex-col justify-between select-none box-border print:border-slate-300 print:rounded-[12px] print:shadow-none bg-no-repeat id-card-poppins pt-[8mm] pb-[8mm]">
              
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
                    <img src="/logo.png" alt="logo" className="h-[10mm] max-w-[42mm] object-contain" />
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
                    <h2 className="text-[11.5px] font-extrabold text-[#2b3b7c] tracking-tight line-clamp-2 max-w-[48mm]">
                      {toTitleCase(employee.name)}
                    </h2>
                    <p className="text-[7px] font-medium text-slate-700 uppercase tracking-wider mt-0.5 truncate max-w-[48mm]">
                      {employee.designation || "Job Position"}
                    </p>
                    
                    {/* Blood Group */}
                    <p className="text-[6px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                      Blood Group: <span className="text-rose-600 font-bold">{employee.bloodGroup || "-"}</span>
                    </p>
                  </div>

                </div>

                {/* Employee ID & Issue Date */}
                <div className="flex flex-col items-center text-slate-700 leading-tight">
                  <span className="text-[7.5px] font-semibold tracking-wide">{employee.employeeCode || "-"}</span>
                  <span className="text-[6.5px] font-medium tracking-wide mt-0.5">{formatJoinDate(employee.joiningDate)}</span>
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
                <div className="text-center">
                  <span className="text-[6px] text-slate-400 font-bold uppercase tracking-widest">
                    TERMS & CONDITIONS
                  </span>
                </div>

                {/* Terms body */}
                <div className="space-y-1 text-center font-medium leading-relaxed text-[6px] text-slate-600">
                  <p>This card is the property of the issuing organization and is non-transferable.</p>
                  <p>Must be worn visibly at all times while on company premises.</p>
                  <p>If found, please return to: {orgInfo?.name || "the office"}.</p>
                </div>

                {/* Emergency Contact section */}
                <div className="border-t border-slate-200 pt-1 w-full text-center space-y-1">
                  <span className="block text-[5px] font-bold text-slate-400 uppercase tracking-widest">
                    EMERGENCY CONTACT
                  </span>
                  {emergency ? (
                    <div className="flex flex-col items-center font-semibold text-slate-700">
                      <span className="truncate max-w-[45mm]">{emergency.name || "Contact Person"}</span>
                      <span className="font-mono text-[5.5px] leading-none">{emergency.phone || "-"}</span>
                      <span className="text-[4.5px] text-muted-foreground truncate max-w-[45mm]">({emergency.relation || "Emergency Contact"})</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center font-semibold text-slate-700">
                      <span>HR Department</span>
                      <span className="font-mono text-[5.5px] leading-none">{orgInfo?.phone || "-"}</span>
                      <span className="text-[4.5px] text-muted-foreground">({orgInfo?.email || "-"})</span>
                    </div>
                  )}
                </div>

                {/* Signature zone */}
                <div className="flex flex-col items-center w-full">
                  <div className="w-[28mm] h-[5mm] border-b border-slate-400 flex items-end justify-center relative">
                    <span className="absolute bottom-0 text-[4.5px] font-serif italic text-slate-400">Authorized Signature</span>
                  </div>
                  <span className="text-[4px] text-slate-400 uppercase tracking-wider mt-0.5">Card Issuer</span>
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
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
            <FiPrinter className="mr-2 h-4 w-4" />
            Print Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

