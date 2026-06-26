"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface ReceiptBarcodeProps {
  value: string;
}

export default function ReceiptBarcode({ value }: ReceiptBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.1,
          height: 38,
          displayValue: true,
          fontSize: 9,
          margin: 0,
          background: "transparent",
        });
      } catch (err) {
        console.error("Failed to render barcode inside receipt:", err);
      }
    }
  }, [value]);

  return (
    <div className="flex justify-center my-4 print:my-3">
      <svg ref={svgRef} />
    </div>
  );
}
