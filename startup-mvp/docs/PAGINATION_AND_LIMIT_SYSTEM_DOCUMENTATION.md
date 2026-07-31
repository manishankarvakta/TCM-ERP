# Technical Documentation: Dual Pagination & Page-Size limit Selector System

This document outlines the architecture, component signatures, state management, and implementation guidelines for the custom **Google-style Pagination and Rows-per-Page Limit Selector System** in the `ffERP` application.

---

## 📌 1. Architecture Overview

To accommodate long reports with dynamic calculated metrics (e.g. point-in-time stock calculations), the application implements an **In-Memory Server-Sourced Pagination** pattern. 

The user interface presents **double navigation controls**:
1. **Top Pagination Panel**: Positioned beside the export dropdown button in the card header, allowing quick navigation without scrolling.
2. **Bottom Pagination Panel**: Located in the table footer, rendering along with result counts and the page-size limit controller.

```
┌──────────────────────────────────────────────────────────────┐
│ Card Header                                                  │
│ Title                     [Rows per page: 20] < ... 5 6 ... > [Export]
├──────────────────────────────────────────────────────────────┤
│ Report Table Content                                         │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│ Card Footer                                                  │
│ Showing 21 to 40 of 200    [Rows per page: 20] < ... 5 6 ... >
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 2. Component API Reference (`ReportTableProps`)

The shared `ReportTable` component ([report-table.tsx](file:///Users/manishankarvakta/Desktop/APPS/ffERP/startup-mvp/components/reports/report-table.tsx)) is fully backward-compatible. Pagination controls are populated through the `pagination` prop object.

### Prop Interface Definition
```typescript
interface ReportTableProps {
  title?: string;
  columns: ReportTableColumn[];
  data: Record<string, any>[];
  pagination?: {
    page: number;          // Active page number (1-indexed)
    limit: number;         // Active page size limit
    total: number;         // Total items matching search query in database
    totalPages: number;    // Calculated ceiling of total pages
    onPageChange: (page: number) => void;
    
    // Optional props (enables Rows-Per-Page Selector)
    onLimitChange?: (limit: number) => void;
    limitOptions?: number[]; // Custom page sizes (defaults to [20, 50, 100, 200])
  };
  exportFilename?: string;
  loading?: boolean;
  onExport?: (type: "csv" | "excel") => void | Promise<void>;
}
```

---

## 🧮 3. Google-style Pagination Window Algorithm

To prevent listing dozens of individual page buttons, `ReportTable` dynamically calculates a sliding button range centered around the active page, utilizing ellipsis elements (`...`) when page counts exceed the window limits.

### The Algorithm:
```typescript
const getPageNumbers = (currentPage: number, totalPages: number) => {
  const pages: (number | string)[] = [];
  const windowSize = 2; // Number of pages to render before and after current page
  
  pages.push(1); // Always include page 1
  
  const startRange = Math.max(2, currentPage - windowSize);
  const endRange = Math.min(totalPages - 1, currentPage + windowSize);
  
  if (startRange > 2) {
    pages.push("..."); // Leading ellipsis
  }
  
  for (let i = startRange; i <= endRange; i++) {
    pages.push(i); // Middle button range
  }
  
  if (endRange < totalPages - 1) {
    pages.push("..."); // Trailing ellipsis
  }
  
  if (totalPages > 1) {
    pages.push(totalPages); // Always include last page
  }
  
  return pages;
};
```

---

## 🔄 4. State Flow & Page Transitions

Pagination state is owned by the browser URL query params. This makes pages **shareable, bookmarkable, and refreshing-resistant**.

### Transition Sequence Diagram:
```typescript
User Interaction -> Click page link / Change Rows-Per-Page select dropdown
                         │
                         ▼
Update Browser URL (router.push -> ?page=2&limit=50)
                         │
                         ▼
Server Page Loader (page.tsx extracts searchParams.page & searchParams.limit)
                         │
                         ▼
Call Server Action (getStockMovements(filters, { page: 2, limit: 50 }))
                         │
                         ▼
Memory aggregation (filters database items, computes metrics, and slices array)
                         │
                         ▼
Render components (Client view layout re-populates grid and counts cards)
```

---

## 🚀 5. Extending Pagination to Other Report Views

To implement this Google-style pagination and Rows-per-page limit dropdown in any other dashboard report view:

1. **Extract Search Params**: In your route's `page.tsx`, extract the parameters:
   ```typescript
   const page = parseInt(searchParams.page || "1");
   const limit = parseInt(searchParams.limit || "20");
   ```
2. **Update Server Action Call**: Pass page and limit variables to the corresponding fetch server actions.
3. **Handle Limit Changes in Client View**:
   ```typescript
   const handleLimitChange = (newLimit: number) => {
     const params = new URLSearchParams(window.location.search);
     params.set("limit", newLimit.toString());
     params.set("page", "1"); // Reset index
     router.push(`?${params.toString()}`);
   };
   ```
4. **Pass Props to `ReportTable`**:
   ```typescript
   <ReportTable
     // ...
     pagination={{
       ...pagination,
       onPageChange: handlePageChange,
       onLimitChange: handleLimitChange,
       limitOptions: [20, 50, 100, 200]
     }}
   />
   ```
