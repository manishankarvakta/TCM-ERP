"use client";

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";
import VoucherPrintTemplate from "./voucher-print-template";

interface VoucherPrintActionProps {
  voucher: any;
}

export default function VoucherPrintAction({ voucher }: VoucherPrintActionProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [isPrintingPos, setIsPrintingPos] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Voucher-${voucher.voucherNumber}`,
  });

  const handlePrintPos = () => {
    if (!voucher?.id) return;
    setIsPrintingPos(true);

    const oldIframe = document.getElementById("print-due-receipt-iframe");
    if (oldIframe) {
      oldIframe.remove();
    }

    // Register callback for child iframe
    (window as any).triggerIframePrint = () => {
      const iframeElement = document.getElementById("print-due-receipt-iframe") as HTMLIFrameElement;
      if (iframeElement && iframeElement.contentWindow) {
        iframeElement.contentWindow.focus();
        iframeElement.contentWindow.print();
      }
      setIsPrintingPos(false);
    };

    const iframe = document.createElement("iframe");
    iframe.id = "print-due-receipt-iframe";
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "800px";
    iframe.style.height = "600px";
    iframe.style.border = "0";
    iframe.src = `/print/due-receipt/${voucher.id}`;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        const iframeElement = document.getElementById("print-due-receipt-iframe") as HTMLIFrameElement;
        if (iframeElement && iframeElement.contentWindow && (window as any).triggerIframePrint) {
          iframeElement.contentWindow.focus();
          iframeElement.contentWindow.print();
          delete (window as any).triggerIframePrint;
          setIsPrintingPos(false);
        }
      }, 1000);
    };
  };

  const isReceiptVoucher = voucher?.type === "RECEIPT";

  return (
    <>
      <div style={{ display: "none" }}>
        <VoucherPrintTemplate ref={componentRef} voucher={voucher} />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => handlePrint()}>
          <FiPrinter className="mr-2 h-4 w-4" />
          Print
        </Button>

        {isReceiptVoucher && (
          <Button
            variant="default"
            size="sm"
            onClick={handlePrintPos}
            disabled={isPrintingPos}
            className="gap-2"
          >
            <FiPrinter className="h-4 w-4" />
            {isPrintingPos ? "Printing POS..." : "Print POS"}
          </Button>
        )}
      </div>
    </>
  );
}
