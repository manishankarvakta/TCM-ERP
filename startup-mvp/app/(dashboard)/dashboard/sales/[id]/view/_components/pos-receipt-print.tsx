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

    const iframe = document.createElement('iframe');
    iframe.id = 'print-invoice-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = `/print/invoice/${sale.id}`;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
      setIsPrinting(false);
    };
  };

  return (
    <Button variant="outline" onClick={printInvoiceDirect} disabled={isPrinting}>
      <FiPrinter className="mr-2 h-4 w-4" />
      {isPrinting ? "Printing..." : "Print POS"}
    </Button>
  );
}
