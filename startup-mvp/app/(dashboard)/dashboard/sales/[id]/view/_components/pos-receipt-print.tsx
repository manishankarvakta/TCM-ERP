"use client";

import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";
import { useState } from "react";

export default function PosReceiptPrint({ sale }: { sale: any }) {
  const [isPrinting, setIsPrinting] = useState(false);

  const printInvoiceDirect = () => {
    setIsPrinting(true);
    const oldIframe = document.getElementById('print-invoice-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    // Register callback for child iframe
    (window as any).triggerIframePrint = () => {
      const iframeElement = document.getElementById('print-invoice-iframe') as HTMLIFrameElement;
      if (iframeElement && iframeElement.contentWindow) {
        iframeElement.contentWindow.focus();
        iframeElement.contentWindow.print();
      }
      setIsPrinting(false);
    };

    const iframe = document.createElement('iframe');
    iframe.id = 'print-invoice-iframe';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = '600px';
    iframe.style.border = '0';
    iframe.src = `/print/invoice/${sale.id}`;

    document.body.appendChild(iframe);

    // Fallback print triggers in case child script fails to call triggerIframePrint
    iframe.onload = () => {
      setTimeout(() => {
        const iframeElement = document.getElementById('print-invoice-iframe') as HTMLIFrameElement;
        if (iframeElement && iframeElement.contentWindow && (window as any).triggerIframePrint) {
          // If triggerIframePrint is still defined, it means it hasn't fired yet
          iframeElement.contentWindow.focus();
          iframeElement.contentWindow.print();
          delete (window as any).triggerIframePrint;
          setIsPrinting(false);
        }
      }, 3000);
    };
  };

  return (
    <Button variant="outline" onClick={printInvoiceDirect} disabled={isPrinting}>
      <FiPrinter className="mr-2 h-4 w-4" />
      {isPrinting ? "Printing..." : "Print POS"}
    </Button>
  );
}
