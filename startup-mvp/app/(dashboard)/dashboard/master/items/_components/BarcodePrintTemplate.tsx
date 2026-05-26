"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  displayValue: boolean;
}

export function BarcodeSvg({ value, displayValue = false }: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        // Try EAN-13 if it looks like a valid 13 digit number
        if (value.length === 13 && /^\d+$/.test(value)) {
          JsBarcode(svgRef.current, value, {
            format: "EAN13",
            width: 1.6,
            height: 40,
            displayValue,
            fontSize: 10,
            margin: 2,
          });
        } else {
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            width: 1.3,
            height: 40,
            displayValue,
            fontSize: 10,
            margin: 2,
          });
        }
      } catch (err) {
        // Fallback to CODE128 if EAN13 check fails or crashes
        try {
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            width: 1.3,
            height: 40,
            displayValue,
            fontSize: 10,
            margin: 2,
          });
        } catch (innerErr) {
          console.error("Barcode generation failed completely:", innerErr);
        }
      }
    }
  }, [value, displayValue]);

  return <svg ref={svgRef} className="mx-auto" />;
}

export interface PrintableLabel {
  name: string;
  code: string;
  barcode: string;
  color: string | null;
  size: string | null;
  price: string | null;
  image: string | null;
}

interface BarcodePrintTemplateProps {
  items: PrintableLabel[];
  options: {
    showCompany: boolean;
    showName: boolean;
    showVariant: boolean;
    showPrice: boolean;
    showBarcodeText: boolean;
    showImage: boolean;
    layout: "1col" | "2col" | "3col" | "sheet";
    companyName: string;
    /** Page size for the @page CSS rule (mm). Defaults to 62x29mm if omitted. */
    pageSizeMm?: { width: number; height: number };
  };
}

const BarcodePrintTemplate = forwardRef<HTMLDivElement, BarcodePrintTemplateProps>(
  ({ items, options }, ref) => {
    // Determine CSS layout based on settings
    let gridClass = "grid gap-4 ";
    let labelClass = "bg-white text-black border border-slate-300 rounded-md p-3 flex flex-col justify-between text-center overflow-hidden page-break-inside-avoid print:border-slate-400 print:shadow-none ";

    if (options.layout === "1col") {
      gridClass += "grid-cols-1 max-w-[60mm] mx-auto";
      labelClass += "w-[50mm] h-[35mm] mx-auto my-2";
    } else if (options.layout === "2col") {
      gridClass += "grid-cols-2 max-w-[140mm] mx-auto";
      labelClass += "w-[65mm] h-[40mm]";
    } else if (options.layout === "3col") {
      gridClass += "grid-cols-3 max-w-[210mm] mx-auto";
      labelClass += "w-[60mm] h-[40mm]";
    } else {
      // standard sheet layout (3 columns per row, aligned for A4)
      gridClass += "grid-cols-3 p-6 max-w-[210mm] mx-auto";
      labelClass += "w-[64mm] h-[42mm] m-1.5 shadow-sm";
    }

    return (
      <div
        ref={ref}
        className="w-full bg-white p-6 print:p-0 print:m-0"
        style={{ color: "black", fontFamily: "system-ui, sans-serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: ${options.pageSizeMm ? `${options.pageSizeMm.width}mm ${options.pageSizeMm.height}mm` : "62mm 29mm"};
              margin: 2mm;
            }
            .page-break-inside-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}} />

        <div className={gridClass}>
          {items.map((item, idx) => (
            <div key={idx} className={labelClass}>
              {/* Company Title */}
              {options.showCompany && (
                <div className="text-[10px] font-bold tracking-wider uppercase text-slate-800 border-b border-dashed border-slate-200 pb-0.5 mb-1 truncate">
                  {options.companyName}
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 flex flex-col justify-center min-h-0">
                {options.showImage && item.image ? (
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      {options.showName && (
                        <div className="text-xs font-semibold leading-tight text-slate-900 truncate">
                          {item.name}
                        </div>
                      )}

                      {options.showVariant && (item.color || item.size) && (
                        <div className="text-[9px] text-slate-600 font-medium mt-0.5 truncate">
                          {item.color && <span>Col: {item.color}</span>}
                          {item.color && item.size && <span className="mx-1">|</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center mb-1">
                    {options.showName && (
                      <div className="text-xs font-semibold leading-tight text-slate-900 truncate">
                        {item.name}
                      </div>
                    )}

                    {options.showVariant && (item.color || item.size) && (
                      <div className="text-[9px] text-slate-600 font-medium mt-0.5 truncate">
                        {item.color && <span>Col: {item.color}</span>}
                        {item.color && item.size && <span className="mx-1">|</span>}
                        {item.size && <span>Size: {item.size}</span>}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[8px] font-mono text-slate-500 mt-0.5 truncate">
                  Code: {item.code}
                </div>
              </div>

              {/* Barcode Render */}
              <div className="my-1.5 shrink-0">
                <BarcodeSvg value={item.barcode} displayValue={options.showBarcodeText} />
              </div>

              {/* Price Details */}
              {options.showPrice && item.price && (
                <div className="text-xs font-black text-slate-950 mt-1 border-t border-dashed border-slate-200 pt-0.5">
                  Price: {item.price}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

BarcodePrintTemplate.displayName = "BarcodePrintTemplate";

export default BarcodePrintTemplate;
