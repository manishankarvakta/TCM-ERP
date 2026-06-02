"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Don't auto-print if loaded inside an iframe to prevent double-printing!
    const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (isInsideIframe) return;

    // Automatically open print dialog after a short delay to let fonts/styles load
    const timer = setTimeout(() => {
      window.print();
    }, 500);
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
