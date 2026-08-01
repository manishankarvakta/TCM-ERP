# TPN Print — Developer Documentation

**Module:** Transfer Purchase Note (TPN)  
**File:** `startup-mvp/app/(dashboard)/dashboard/procurements/tpn/_components/tpn-details.tsx`  
**Date:** 2026-08-01  
**Commit:** `cc3aa0a`

---

## Overview

This document describes all changes made to the TPN print system during the August 2026 redesign sprint. The TPN module supports two print modes:

- **Print TPN** — Full internal transfer document with item rates and amounts.
- **Print Challan** — Delivery slip with rates/amounts hidden, used for warehouse handoff.

Both modes share the same print header and items table. Print is triggered via `window.print()` using `@media print` CSS to show/hide elements.

---

## 1. Print Header Redesign

### Before
The print header was a simple 2-column text layout:
- Left: Organization name (text only, no logo)
- Right: Document title, TPN Number, Date, Status

### After
A branded 2-column header matching the company invoice style:

#### Left Column — Logo + Company Info
```
┌────────┐  FERRARI FASHION
│  LOGO  │  Unique, Ashulia, Dhaka
└────────┘  msferrarifashion4475@gmail.com
            01956-582108, 01745-645502
```

- Logo rendered from `/main_logo.png` (public folder) inside a `64×64px` bordered box.
- Company name, address, email, and phone pulled from the `organization` prop passed from the server.
- If `organization` is null, hardcoded fallback values are used.

#### Right Column — Document Title + TPN Number + Barcode
```
TRANSFER PURCHASE NOTE   (or DELIVERY CHALLAN)
TPN Number: TPN-10007
████████████████████████   ← barcode
```

- Title switches between `TRANSFER PURCHASE NOTE` and `DELIVERY CHALLAN` based on `printMode` state.
- **Date and Status fields were removed** from the header.
- A **CODE128 barcode** of the TPN number is rendered directly below — no gap.

#### Header HTML Structure
```tsx
<div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
  <div className="flex justify-between items-start gap-4">

    {/* Left: Logo + org info */}
    <div className="flex items-start gap-3">
      <div className="border border-slate-800 p-1 bg-white w-16 h-16 shrink-0">
        <img src="/main_logo.png" className="max-h-full max-w-full object-contain" />
      </div>
      <div>
        <h1>{organization?.name || "FERRARI FASHION"}</h1>
        <p>{organization?.address}</p>
        <p>{organization?.email}</p>
        <p>{organization?.phone}</p>
      </div>
    </div>

    {/* Right: Title + TPN Number + Barcode */}
    <div className="text-right">
      <h2 className="mb-0 leading-tight">{title}</h2>
      <div className="text-xs text-right">
        <p className="mb-0 leading-none">TPN Number: {tpn.tpnNumber}</p>
        <div className="flex justify-end">
          <TpnBarcode value={tpn.tpnNumber} />
        </div>
      </div>
    </div>

  </div>
</div>
```

> **Note:** The header uses `hidden` on screen and `print:block` only during printing.

---

## 2. Barcode Integration

### Component: `TpnBarcode`
A local inline component defined at the top of `tpn-details.tsx`:

```tsx
function TpnBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.2,
        height: 36,
        displayValue: false,
        margin: 0,
        background: "transparent",
      });
    }
  }, [value]);

  return <svg ref={svgRef} />;
}
```

### Library
- **Package:** `jsbarcode` (already installed in the project)
- **Import:** `import JsBarcode from "jsbarcode";`
- **Format:** CODE128 — supports alphanumeric strings like `TPN-10007`

### Design Decisions
| Setting | Value | Reason |
|---|---|---|
| `displayValue` | `false` | TPN number already shown as text above |
| `height` | `36` | Compact for print header |
| `width` | `1.2` | Balanced bar width for CODE128 |
| `margin` | `0` | Tight flush to surrounding text |
| `background` | `transparent` | Works on white print background |

### Spacing Fix
- `mb-0 leading-none` on the TPN number `<p>` — removes default paragraph bottom margin.
- `leading-tight` + `mb-0` on the `<h2>` — removes default heading bottom margin.
- No `mt-*` on the SVG or wrapper `<div>` — zero gap between all elements.

---

## 3. Serial Number Column

A `#` (serial number) column was added as the **first column** of the items table.

### Header
```tsx
<TableHead className="print:py-1 print:px-2 print:text-xs w-8">#</TableHead>
```

### Row Cell
```tsx
{tpn.items.map((item: any, index: number) => (
  <TableRow key={item.id}>
    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
    ...
))}
```

### Total Row
The `Total` label `colSpan` was updated from `2` → `3` to span `#`, `Item Code`, and `Item Name`:
```tsx
<TableCell colSpan={3}>Total</TableCell>
```

---

## 4. Multi-Page Print Fix

### Problem
The dashboard layout (`layout.tsx`) uses CSS that clamps all content to viewport height:

```tsx
// layout.tsx
<div className="flex h-screen overflow-hidden">           // L28 — clips to screen height
  <div className="flex flex-1 flex-col overflow-hidden">  // L32 — clips again
    <main className="flex-1 overflow-y-auto ...">         // L36 — scrolls inside clipped box
```

When `window.print()` is called, the browser print engine captures only the **clipped viewport-height** portion — not the full document. This caused long TPNs to print on a single page.

### Solution
A `<style dangerouslySetInnerHTML>` block injected at the top of the component `return()`. It contains `@media print` rules that **only fire during printing** — zero effect on screen layout:

```tsx
<style dangerouslySetInnerHTML={{ __html: `
  @media print {
    html, body {
      overflow: visible !important;
      height: auto !important;
      background-color: white !important;
      color: black !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Override Next.js dashboard layout containers */
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
```

### CSS Selectors Explained
| Selector | Targets | What It Fixes |
|---|---|---|
| `div.flex.h-screen.overflow-hidden` | Root layout wrapper (L28) | Removes `h-screen` and `overflow-hidden` during print |
| `div.flex.flex-1.flex-col.overflow-hidden` | Content column wrapper (L32) | Removes second overflow clipping layer |
| `main.flex-1.overflow-y-auto` | Main scroll container (L36) | Allows full height to flow for print engine |

> **Prior art:** This exact pattern is already used in the payslip bulk print module at  
> `app/(dashboard)/dashboard/hr/payroll/[id]/payslips/print/_components/print-all-client.tsx`

---

## 5. Page Numbering

Automatic page numbering using CSS Paged Media spec inside `@page`:

```css
@page {
  size: A4 portrait;
  margin: 10mm 12mm 18mm 12mm;  /* 18mm bottom for page number space */

  @bottom-center {
    content: "Page " counter(page) " / " counter(pages);
    font-size: 9pt;
    color: #64748b;
    font-family: sans-serif;
  }
}
```

- `counter(page)` — current page (auto-incremented by print engine)
- `counter(pages)` — total page count
- Output: **`Page 1 / 3`**, **`Page 2 / 3`** etc. at bottom center of every page
- Bottom margin is `18mm` to reserve space (other sides `10mm`/`12mm`)

> **Browser support:** Chrome, Edge, Firefox ✅ — Safari has limited `@page` named margin area support.

---

## 6. File Reference

| File | Role |
|---|---|
| `startup-mvp/app/(dashboard)/dashboard/procurements/tpn/_components/tpn-details.tsx` | All print changes live here |
| `startup-mvp/app/(dashboard)/dashboard/procurements/tpn/_components/tpn-form.tsx` | TPN form — unchanged |
| `startup-mvp/app/(dashboard)/dashboard/procurements/tpn/_actions/tpn.action.ts` | Server actions — unchanged |
| `startup-mvp/app/(dashboard)/dashboard/layout.tsx` | Dashboard layout — read-only reference, not modified |
| `startup-mvp/public/main_logo.png` | Logo used in print header |

---

## 7. What Was NOT Changed

- `layout.tsx` — untouched, screen layout is completely unaffected
- `globals.css` — no global print rules added
- `tpn.action.ts` — no server-side logic changes
- `tpn-form.tsx` — form unchanged
- Any other print view (GRN, Purchase, Sales, Payslip, Voucher)
- Prisma schema / database

---

## 8. Testing Checklist

| Test | Expected Result |
|---|---|
| Open TPN with 10+ items → Print TPN | Content flows across multiple A4 pages |
| Open TPN with 10+ items → Print Challan | Same multi-page; rates/amounts hidden |
| Check page footer | `Page 1 / N` at bottom center of each page |
| Check print header | Logo + company info left; title + TPN number + barcode right |
| Check serial numbers | Items numbered 1, 2, 3... in first column |
| Return to screen after print | Sidebar, header, layout fully intact |
| Open any other print view | Unaffected by TPN changes |
