"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
    
    // Automatically open print dialog after a short delay to let fonts/styles/barcode load
    const timer = setTimeout(() => {
      if (isInsideIframe) {
        // Trigger the parent window's callback to print the iframe content
        if (window.parent && typeof (window.parent as any).triggerIframePrint === 'function') {
          (window.parent as any).triggerIframePrint();
          // Clean it up immediately to avoid duplicate triggering
          delete (window.parent as any).triggerIframePrint;
        }
      } else {
        // Standalone page print
        window.print();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => window.print()}
      className="print:hidden absolute top-4 right-4 bg-black text-white p-2 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm z-50"
    >
      <Printer size={16} /> Print
    </button>
  );
}
