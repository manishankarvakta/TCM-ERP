"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface PrintHeaderProps {
  docNumber: string;
  docTitle: string;
  organizationName?: string | null;
  organizationAddress?: string | null;
  organizationEmail?: string | null;
  organizationPhone?: string | null;
  organizationLogo?: string | null;
  hideBarcode?: boolean;
}

function DocBarcode({ value }: { value: string }) {
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
        console.error("Failed to render barcode:", err);
      }
    }
  }, [value]);
  return <svg ref={svgRef} />;
}

export function PrintStyle() {
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

        /* Eliminate print-only scrollbars and overflow indicators */
        .overflow-x-auto,
        .overflow-auto,
        div.overflow-x-auto,
        div.overflow-auto {
          overflow: visible !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .overflow-x-auto::-webkit-scrollbar,
        .overflow-auto::-webkit-scrollbar {
          display: none !important;
        }

        /* Force tables to wrap text and stretch full width without horizontal clipping */
        table {
          width: 100% !important;
          table-layout: auto !important;
        }
        th, td {
          word-break: break-word !important;
          white-space: normal !important;
        }

        /* Repeat table headers on subsequent pages */
        thead {
          display: table-header-group !important;
        }

        /* Prevent table rows from splitting awkwardly across pages */
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Boxed grid layout for financial tables */
        table.print-bordered {
          border: 1px solid #94a3b8 !important; /* slate-400 outline */
          border-collapse: collapse !important;
        }
        table.print-bordered th,
        table.print-bordered td {
          border: 1px solid #94a3b8 !important; /* slate-400 cell borders */
          padding: 6px 8px !important; /* Professional cell spacing */
        }
        table.print-bordered th {
          background-color: #f1f5f9 !important; /* slate-100 header background */
        }

        /* Force hidden elements to display none and collapse borders */
        .print\:hidden,
        th.print\:hidden,
        td.print\:hidden,
        th.print\:!hidden,
        td.print\:!hidden {
          display: none !important;
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

export default function PrintHeader({
  docNumber,
  docTitle,
  organizationName,
  organizationAddress,
  organizationEmail,
  organizationPhone,
  organizationLogo,
  hideBarcode = false,
}: PrintHeaderProps) {
  return (
    <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
      <div className="flex justify-between items-start gap-4">

        {/* Left: Logo + Organization Info */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-16 h-16 shrink-0">
            <img
              src={organizationLogo || "/main_logo.png"}
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

        {/* Right: Document Title + Number + Barcode */}
        <div className="text-right">
          <h2 className="text-lg font-bold uppercase text-slate-900 tracking-wide mb-0 leading-tight">
            {docTitle}
          </h2>
          <div className="text-xs text-slate-700 text-right">
            {!hideBarcode && (
              <>
                <p className="mb-0 leading-none">
                  <span className="italic text-slate-600">Number: </span>
                  <span className="font-bold text-slate-900">{docNumber}</span>
                </p>
                <div className="flex justify-end">
                  <DocBarcode value={docNumber} />
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
