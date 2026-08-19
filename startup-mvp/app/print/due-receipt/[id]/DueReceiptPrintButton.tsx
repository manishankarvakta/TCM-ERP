"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

export default function DueReceiptPrintButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;
    
    // Automatically trigger print after fonts/styles load
    const timer = setTimeout(() => {
      if (isInsideIframe) {
        if (window.parent && typeof (window.parent as any).triggerIframePrint === "function") {
          (window.parent as any).triggerIframePrint();
          delete (window.parent as any).triggerIframePrint;
        }
      } else {
        window.print();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => window.print()}
      className="print:hidden absolute top-4 right-4 bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs z-50 font-medium"
    >
      <Printer size={14} /> Print Receipt
    </button>
  );
}
