"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";
import ResignationPrintTemplate from "@/components/hr/print/resignation-print-template";

export default function ResignationFormPrintButton() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "Resignation-Form",
  });

  return (
    <>
      <div style={{ display: "none" }}>
        <ResignationPrintTemplate ref={componentRef} />
      </div>
      <Button variant="outline" onClick={() => handlePrint()}>
        <FiPrinter className="mr-2 h-4 w-4" />
        Print Resignation Form
      </Button>
    </>
  );
}
