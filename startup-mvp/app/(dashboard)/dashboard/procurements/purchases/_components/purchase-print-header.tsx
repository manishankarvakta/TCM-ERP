"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface PurchasePrintHeaderProps {
  purchaseNumber: string;
  organizationName?: string | null;
  organizationAddress?: string | null;
  organizationEmail?: string | null;
  organizationPhone?: string | null;
}

function PurchaseBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.2,
          height: 36,
          displayValue: false,
          margin: 0,
          background: "transparent",
        });
      } catch (err) {
        console.error("Failed to render purchase barcode:", err);
      }
    }
  }, [value]);
  return <svg ref={svgRef} />;
}

export function PurchasePrintStyle() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        :root, html, body, .dark, [data-theme='dark'] {
          color-scheme: light !important;
          background-color: white !important;
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .dark table, .dark tr, .dark td, .dark th, .dark div, .dark span, .dark p {
          color: #000000 !important;
        }

        /* Override Next.js dashboard layout containers that clip content to viewport height */
        div.flex.h-screen.overflow-hidden,
        div.flex.flex-1.flex-col.overflow-hidden,
        main.flex-1.overflow-y-auto {
          display: block !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }

        @page {
          size: A4 portrait;
          margin: 10mm 12mm 18mm 12mm;

          @bottom-center {
            content: "Page " counter(page) " / " counter(pages);
            font-size: 9pt;
            color: #64748b;
            font-family: sans-serif;
          }
        }
      }
    ` }} />
  );
}

export default function PurchasePrintHeader({
  purchaseNumber,
  organizationName,
  organizationAddress,
  organizationEmail,
  organizationPhone,
}: PurchasePrintHeaderProps) {
  return (
    <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
      <div className="flex justify-between items-start gap-4">

        {/* Left: Logo + Organization Info */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-16 h-16 shrink-0">
            <img
              src="/main_logo.png"
              alt={organizationName || "TCM Logo"}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-tight text-slate-900 leading-tight">
              {organizationName || "TCM"}
            </h1>
            {organizationAddress && (
              <p className="text-xs italic text-slate-600 mt-0.5">
                {organizationAddress}
              </p>
            )}
            {organizationEmail && (
              <p className="text-xs italic text-slate-600">
                {organizationEmail}
              </p>
            )}
            {organizationPhone && (
              <p className="text-xs italic text-slate-600">
                {organizationPhone}
              </p>
            )}
          </div>
        </div>

        {/* Right: Document Title + PO Number + Barcode */}
        <div className="text-right">
          <h2 className="text-lg font-bold uppercase text-slate-900 tracking-wide mb-0 leading-tight">
            Purchase Order
          </h2>
          <div className="text-xs text-slate-700 text-right">
            <p className="mb-0 leading-none">
              <span className="italic text-slate-600">PO Number: </span>
              <span className="font-bold text-slate-900">{purchaseNumber}</span>
            </p>
            <div className="flex justify-end">
              <PurchaseBarcode value={purchaseNumber} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
