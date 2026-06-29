"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  displayValue: boolean;
  pageSizeMm?: { width: number; height: number };
  options?: {
    showCompany: boolean;
    showName: boolean;
    showVariant: boolean;
    showPrice: boolean;
    showBarcodeText: boolean;
    showImage: boolean;
    layout: "1col" | "2col" | "3col" | "sheet";
    companyName: string;
  };
  hasVariant?: boolean;
}

export function BarcodeSvg({ value, displayValue = false, pageSizeMm, options, hasVariant = false }: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      // Determine dynamic barcode settings based on page size and barcode value length
      let width = 1.3;
      let height = 40;
      let fontSize = 10;
      let margin = 2;

      // 1. Calculate dynamic width scale based on label width and character length (prevents clipping)
      if (pageSizeMm) {
        const { width: pW } = pageSizeMm;
        const padMm = pW === 38 ? 4.4 : (pW === 45 ? 6.4 : 6);
        const availWidthPx = (pW - padMm) * 3.78;
        const estimatedModules = value.length === 13 && /^\d+$/.test(value) ? 95 : (35 + 11 * value.length);
        const calculatedWidth = availWidthPx / estimatedModules;
        width = Math.max(0.7, Math.min(1.3, calculatedWidth));
      } else {
        const availWidthPx = (62 - 6) * 3.78;
        const estimatedModules = value.length === 13 && /^\d+$/.test(value) ? 95 : (35 + 11 * value.length);
        const calculatedWidth = availWidthPx / estimatedModules;
        width = Math.max(0.7, Math.min(1.35, calculatedWidth));
      }

      // 2. Adjust height dynamically based on label physical height and options config
      if (pageSizeMm) {
        const { height: pH } = pageSizeMm;
        const padMm = pH === 25 ? 2.2 : (pH === 35 ? 3.2 : 2.5);
        const padPx = 2 * padMm * 3.78;
        const totalHeightPx = pH * 3.78;
        
        let reservedPx = padPx + 8; // start with padding + safety margin
        if (options) {
          if (options.showCompany) reservedPx += 14;
          if (options.showName) reservedPx += 16;
          if (options.showVariant && hasVariant) reservedPx += 12;
          if (options.showPrice) reservedPx += 16;
        }
        if (displayValue) reservedPx += 10; // barcode text space
        
        const remainingPx = totalHeightPx - reservedPx;
        
        // Clamp height between 12px (min readable) and 70% of total label height
        height = Math.max(12, Math.min(totalHeightPx * 0.7, remainingPx));
        
        // Scale font size based on height
        fontSize = Math.max(7, Math.min(10, height * 0.4));
        margin = height < 20 ? 1 : 2;
      } else {
        // Fallback default sheet size height calculations
        let reservedPx = 20; // safety margin
        if (options) {
          if (options.showCompany) reservedPx += 16;
          if (options.showName) reservedPx += 20;
          if (options.showVariant && hasVariant) reservedPx += 14;
          if (options.showPrice) reservedPx += 20;
        }
        if (displayValue) reservedPx += 12;
        
        // A4 sheet height defaults to 42mm (~158px) per cell
        const remainingPx = 158 - reservedPx;
        height = Math.max(20, Math.min(60, remainingPx));
        fontSize = Math.max(8, Math.min(10, height * 0.3));
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
  }, [value, displayValue, pageSizeMm, options, hasVariant]);

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
    const isSmallLabel = options.pageSizeMm && (options.pageSizeMm.width <= 40 || options.pageSizeMm.height <= 30);

    // Determine CSS layout based on settings
    let gridClass = "grid gap-2 ";
    let labelClass = `label-item bg-white text-black border border-slate-300 rounded-md shadow-sm flex flex-col justify-center items-center ${isSmallLabel ? "gap-y-0.5" : "gap-y-1"} text-center overflow-hidden page-break-inside-avoid print:border-transparent print:shadow-none `;

    let labelStyle: React.CSSProperties = {};

    if (options.pageSizeMm) {
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
                <div className={`${isSmallLabel ? "text-[8px] pb-0.5 w-full" : "text-[10px] pb-0.5 w-full"} font-bold tracking-wider uppercase text-slate-800 border-b border-dashed border-slate-200 truncate`}>
                  {options.companyName}
                </div>
              )}

              {/* Product Info */}
              <div className="w-full flex flex-col justify-center min-h-0">
                {options.showImage && item.image ? (
                  <div className="flex items-center gap-2 justify-center w-full">
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
                        <div className={`${isSmallLabel ? "text-[7px]" : "text-[9px]"} text-slate-600 font-medium truncate`}>
                          {item.color && <span>Col: {item.color}</span>}
                          {item.color && item.size && <span className="mx-1">|</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    {options.showName && (
                      <div className={`${isSmallLabel ? "text-[8.5px] leading-none font-bold" : "text-xs leading-tight font-semibold"} text-slate-900 truncate`}>
                        {item.name}
                      </div>
                    )}

                    {options.showVariant && (item.color || item.size) && (
                      <div className={`${isSmallLabel ? "text-[7.5px]" : "text-[9px]"} text-slate-600 font-medium truncate`}>
                        {item.color && <span>Col: {item.color}</span>}
                        {item.color && item.size && <span className="mx-1">|</span>}
                        {item.size && <span>Size: {item.size}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Product Code removed as requested */}
              </div>

              {/* Barcode Render */}
              <div className="shrink-0 w-full">
                <BarcodeSvg
                  value={item.barcode}
                  displayValue={options.showBarcodeText}
                  pageSizeMm={options.pageSizeMm}
                  options={options}
                  hasVariant={!!(item.color || item.size)}
                />
              </div>

              {/* Price Details */}
              {options.showPrice && item.price && (
                <div className={`${isSmallLabel ? "text-[9px] pt-0.5 w-full" : "text-xs pt-0.5 w-full"} font-black text-slate-950 border-t border-dashed border-slate-200`}>
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
