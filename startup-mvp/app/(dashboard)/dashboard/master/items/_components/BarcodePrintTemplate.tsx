"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  displayValue: boolean;
  pageSizeMm?: { width: number; height: number };
}

export function BarcodeSvg({ value, displayValue = false, pageSizeMm }: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      // Determine dynamic barcode settings based on page size
      let width = 1.3;
      let height = 40;
      let fontSize = 10;
      let margin = 2;

      if (pageSizeMm) {
        const { width: pW, height: pH } = pageSizeMm;
        
        // Adjust height based on label physical height
        if (pH <= 26) {
          height = 15; // ultra-compact height for Zebra 38x25
          fontSize = 7.5;
          margin = 1;
        } else if (pH <= 36) {
          height = 26;
          fontSize = 9;
          margin = 1;
        }

        // Adjust width scale based on label physical width to prevent clipping
        if (pW <= 40) {
          width = 0.85; // narrow scale for Zebra 38x25
        } else if (pW <= 50) {
          width = 1.05;
        }
      }

      try {
        // Try EAN-13 if it looks like a valid 13 digit number
        if (value.length === 13 && /^\d+$/.test(value)) {
          JsBarcode(svgRef.current, value, {
            format: "EAN13",
            width: Math.max(width - 0.1, 0.9), // EAN-13 has fixed modules, scale down a bit more
            height,
            displayValue,
            fontSize,
            margin,
          });
        } else {
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            width,
            height,
            displayValue,
            fontSize,
            margin,
          });
        }
      } catch (err) {
        // Fallback to CODE128 if EAN13 check fails or crashes
        try {
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            width,
            height,
            displayValue,
            fontSize,
            margin,
          });
        } catch (innerErr) {
          console.error("Barcode generation failed completely:", innerErr);
        }
      }
    }
  }, [value, displayValue, pageSizeMm]);

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
    let gridClass = "grid gap-2 ";
    let labelClass = "label-item bg-white text-black border border-slate-300 rounded-md shadow-sm flex flex-col justify-between text-center overflow-hidden page-break-inside-avoid print:border-transparent print:shadow-none ";

    let labelStyle: React.CSSProperties = {};
    const isSmallLabel = options.layout !== "sheet" && options.pageSizeMm && (options.pageSizeMm.width <= 40 || options.pageSizeMm.height <= 30);

    if (options.layout !== "sheet" && options.pageSizeMm) {
      // Keep clear safe spacing (padding) around the design to prevent printing cutoffs
      let pad = "2.5mm";
      if (options.pageSizeMm.width === 38 && options.pageSizeMm.height === 25) {
        pad = "2.2mm"; // Zebra 38x25mm
      } else if (options.pageSizeMm.width === 45 && options.pageSizeMm.height === 35) {
        pad = "3.2mm"; // Rongta 45x35mm
      }

      labelStyle = {
        width: `${options.pageSizeMm.width}mm`,
        height: `${options.pageSizeMm.height}mm`,
        padding: pad,
      };
    }

    if (options.layout === "1col") {
      gridClass += "grid-cols-1 mx-auto";
      if (!options.pageSizeMm) {
        labelClass += "w-[50mm] h-[35mm] mx-auto my-2";
      } else {
        labelClass += "mx-auto my-1";
      }
    } else if (options.layout === "2col") {
      gridClass += "grid-cols-2 max-w-[140mm] mx-auto";
      if (!options.pageSizeMm) {
        labelClass += "w-[65mm] h-[40mm]";
      }
    } else if (options.layout === "3col") {
      gridClass += "grid-cols-3 max-w-[210mm] mx-auto";
      if (!options.pageSizeMm) {
        labelClass += "w-[60mm] h-[40mm]";
      }
    } else {
      // standard sheet layout (3 columns per row, aligned for A4)
      gridClass += "grid-cols-3 p-4 max-w-[210mm] mx-auto";
      if (!options.pageSizeMm) {
        labelClass += "w-[64mm] h-[42mm] m-1.5 shadow-sm";
      } else {
        labelClass += "m-1 shadow-sm";
      }
    }

    let pageSizeCss = "62mm 29mm";
    let printMargin = "0";
    if (options.layout === "sheet") {
      pageSizeCss = "210mm 297mm"; // A4
      printMargin = "6mm";
    } else if (options.pageSizeMm) {
      pageSizeCss = `${options.pageSizeMm.width}mm ${options.pageSizeMm.height}mm`;
      printMargin = "0";
    }

    return (
      <div
        ref={ref}
        className="barcode-print-wrapper w-full bg-transparent print:bg-white p-2 print:p-0 print:m-0"
        style={{ color: "black", fontFamily: "system-ui, sans-serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              color: black !important;
              overflow: visible !important;
              height: auto !important;
            }
            body > div {
              display: block !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
            .barcode-print-wrapper {
              display: block !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: ${pageSizeCss};
              margin: ${printMargin};
            }
            .page-break-inside-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            ${options.layout !== "sheet" ? `
            /* Collapse CSS grid to blocks to ensure Chrome/Safari respect page breaks */
            .grid {
              display: block !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
            .label-item {
              display: block !important;
              margin: 0 auto !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .label-item:not(:last-child) {
              break-after: page !important;
              page-break-after: always !important;
            }
            ` : ""}
          }
        `}} />

        <div className={gridClass}>
          {items.map((item, idx) => (
            <div key={idx} className={labelClass} style={labelStyle}>
              {/* Company Title */}
              {options.showCompany && (
                <div className={`${isSmallLabel ? "text-[8px] pb-0.5 mb-0.5" : "text-[10px] pb-0.5 mb-1"} font-bold tracking-wider uppercase text-slate-800 border-b border-dashed border-slate-200 truncate`}>
                  {options.companyName}
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 flex flex-col justify-center min-h-0">
                {options.showImage && item.image ? (
                  <div className={`flex items-center gap-2 justify-center ${isSmallLabel ? "mb-0.5" : "mb-1"}`}>
                    <div className={`${isSmallLabel ? "w-6 h-6" : "w-8 h-8"} rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      {options.showName && (
                        <div className={`${isSmallLabel ? "text-[8px] leading-none font-bold" : "text-xs leading-tight font-semibold"} text-slate-900 truncate`}>
                          {item.name}
                        </div>
                      )}

                      {options.showVariant && (item.color || item.size) && (
                        <div className={`${isSmallLabel ? "text-[7px]" : "text-[9px]"} text-slate-600 font-medium mt-0.5 truncate`}>
                          {item.color && <span>Col: {item.color}</span>}
                          {item.color && item.size && <span className="mx-1">|</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`text-center ${isSmallLabel ? "mb-0.5" : "mb-1"}`}>
                    {options.showName && (
                      <div className={`${isSmallLabel ? "text-[8.5px] leading-none font-bold" : "text-xs leading-tight font-semibold"} text-slate-900 truncate`}>
                        {item.name}
                      </div>
                    )}

                    {options.showVariant && (item.color || item.size) && (
                      <div className={`${isSmallLabel ? "text-[7.5px]" : "text-[9px]"} text-slate-600 font-medium mt-0.5 truncate`}>
                        {item.color && <span>Col: {item.color}</span>}
                        {item.color && item.size && <span className="mx-1">|</span>}
                        {item.size && <span>Size: {item.size}</span>}
                      </div>
                    )}
                  </div>
                )}

                <div className={`${isSmallLabel ? "text-[7px] mt-0" : "text-[8px] mt-0.5"} font-mono text-slate-500 truncate`}>
                  Code: {item.code}
                </div>
              </div>

              {/* Barcode Render */}
              <div className={`${isSmallLabel ? "my-0.5" : "my-1"} shrink-0`}>
                <BarcodeSvg
                  value={item.barcode}
                  displayValue={options.showBarcodeText}
                  pageSizeMm={options.pageSizeMm}
                />
              </div>

              {/* Price Details */}
              {options.showPrice && item.price && (
                <div className={`${isSmallLabel ? "text-[9px] mt-0.5 pt-0.5" : "text-xs mt-1 pt-0.5"} font-black text-slate-950 border-t border-dashed border-slate-200`}>
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
