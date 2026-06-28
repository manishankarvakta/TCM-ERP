"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";
import LeaveApplicationPrintTemplate from "@/components/hr/print/leave-application-print-template";

export default function LeaveFormPrintButton() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Leave-Application-Form",
  });

  return (
    <>
      <div style={{ display: "none" }}>
        <LeaveApplicationPrintTemplate ref={componentRef} />
      </div>
      <Button variant="outline" onClick={() => handlePrint()}>
        <FiPrinter className="mr-2 h-4 w-4" />
        Print Leave Form
      </Button>
    </>
  );
}
