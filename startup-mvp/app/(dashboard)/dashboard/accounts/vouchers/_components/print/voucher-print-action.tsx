"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";
import VoucherPrintTemplate from "./voucher-print-template";

interface VoucherPrintActionProps {
  voucher: any;
}

export default function VoucherPrintAction({ voucher }: VoucherPrintActionProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Voucher-${voucher.voucherNumber}`,
  });

  return (
    <>
      <div style={{ display: "none" }}>
        <VoucherPrintTemplate ref={componentRef} voucher={voucher} />
      </div>
      <Button variant="outline" size="sm" onClick={() => handlePrint()}>
        <FiPrinter className="mr-2 h-4 w-4" />
        Print
      </Button>
    </>
  );
}
