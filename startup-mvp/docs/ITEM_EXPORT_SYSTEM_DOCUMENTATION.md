# Item Export System Documentation

## 1. System Overview

The **Item Export System** provides functionality to export filtered items catalog data directly from the Items Master module (`/dashboard/master/items`) into **CSV** and **Excel (.xlsx)** formats.

The system is designed with client-side UI triggers, server-side data fetching & security checks, and utility-driven file generation.

---

## 2. File & Component Architecture

```
startup-mvp/
├── app/(dashboard)/dashboard/master/items/
│   ├── page.tsx                             ← Embeds ExportItemsButton in header
│   ├── _actions/
│   │   └── item.action.tsx                  ← Contains getAllItemsForExport() server action
│   └── _components/
│       └── ExportItemsButton.tsx            ← Client UI component for export dropdown button
└── lib/utils/
    ├── export-csv.ts                        ← Utility function for CSV generation and browser download
    └── export-excel.ts                      ← Utility function for Excel (.xlsx) generation via SheetJS (xlsx)
```

---

## 3. Component Details & Workflow

### 3.1 UI Component (`ExportItemsButton.tsx`)

**Location:** `app/(dashboard)/dashboard/master/items/_components/ExportItemsButton.tsx`

- **Type:** React Client Component (`"use client"`)
- **Props**:
  - `search?: string` — Active search query string.
  - `tab?: string` — Active view tab (`"all"` or `"trash"`).
  - `itemType?: ItemType | "all"` — Active item type filter enum.
- **UI Elements**:
  - `DropdownMenu` trigger button labeled **"Export"** with a download icon.
  - Dropdown options:
    - **Export as CSV** (Icon: `FiFileText`)
    - **Export as Excel** (Icon: `FiFile`)
- **State & User Feedback**:
  - Displays `"Exporting..."` loading state on the button while fetching and processing data.
  - Uses `useToast` to notify the user of export status (success count or failure messages).

---

### 3.2 Server Action (`getAllItemsForExport`)

**Location:** `app/(dashboard)/dashboard/master/items/_actions/item.action.tsx`

```typescript
export async function getAllItemsForExport(
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all",
  itemType?: ItemType | "all",
  itemIds?: string[]
): Promise<{ success: boolean; error?: string; items?: any[] }>
```

- **Security & Authorization**:
  - Validates user session via `auth()`.
  - Enforces `master.items -> view` permission check via `hasPermission()`.
- **Filtering Logic**:
  - **Selected Items (`itemIds`)**: If an array of item IDs is provided, fetches only those specific items (`where.id = { in: itemIds }`).
  - **Search Query (`search`)**: Performs case-insensitive `contains` search across `name`, `code`, and `description`.
  - **Status/Tab Filter (`status`)**:
    - `"trash"`: Filters `isTrash = true`, `status = "trash"`.
    - `"active"`: Filters `isTrash = false`, `status = "active"`.
    - `"inactive"`: Filters `isTrash = false`, `status = "inactive"`.
    - `"all"`: Filters `isTrash = false` (returns all active/inactive items, excluding trash).
  - **Item Type Filter (`itemType`)**:
    - Ignores `"all"`.
    - Filters by exact enum value (`RAW_MATERIAL`, `READY_PRODUCT`, `RETAIL`, `WHOLESALE`).
- **Data Serialization**:
  - Converts all Prisma `Decimal` types (`costPrice`, `salesPrice`, `wholesalePrice`, `vatPercentage`, etc.) to standard Javascript `Number` types to ensure safe client-side serialization.

---

### 3.3 Export Utilities

1. **CSV Export Utility (`lib/utils/export-csv.ts`)**:
   - Converts formatted JSON objects to escaped CSV strings.
   - Triggers automatic browser file download using `Blob` and dynamic `<a>` download element.
2. **Excel Export Utility (`lib/utils/export-excel.ts`)**:
   - Utilizes `xlsx` library to create binary `.xlsx` workbooks.
   - Formats column widths and sheet names (`Items`).

---

## 4. Export Field Mapping

When items are exported, the system maps internal database records into human-readable columns:

| Exported Column Name | Source Field / Expression | Example Output |
|---|---|---|
| **Item Code** | `item.code` | `RM-2026-0001` |
| **Item Name** | `item.name` | `Cotton Yarn 40s` |
| **Item Type** | `item.itemType` | `RAW_MATERIAL` |
| **Category** | `item.category.name` | `Fabrics & Yarns` |
| **Sub Category** | `item.subCategory.name` | `Yarn` |
| **Brand** | `item.brand.name` | `Apex` |
| **Unit** | `item.unit.symbol` | `KG` |
| **Cost Price** | `item.costPrice` | `450.00` |
| **Sales Price** | `item.salesPrice` | `550.00` |
| **Wholesale Price** | `item.wholesalePrice` | `500.00` |
| **Track Inventory** | `item.trackInventory` | `Yes` / `No` |
| **E-Commerce Enabled** | `item.isEnableEcom` | `Yes` / `No` |
| **Barcode** | `item.barcode` | `20014892` |
| **VAT Enabled** | `item.isVatEnabled` | `Yes` / `No` |
| **VAT Percentage** | `item.vatPercentage` | `5.5%` / `0%` |
| **Status** | `item.status` | `active` / `inactive` / `trash` |
| **Created At** | `item.createdAt` | `2026-08-01` |

---

## 5. Usage Example

To invoke export functionality programmatically in any client component:

```tsx
import { getAllItemsForExport } from "../_actions/item.action";
import { exportToCSV } from "@/lib/utils/export-csv";
import { exportToExcel } from "@/lib/utils/export-excel";

// Fetch filtered items
const result = await getAllItemsForExport("cotton", "all", "RAW_MATERIAL");

if (result.success && result.items) {
  const exportData = result.items.map((item) => ({
    "Item Code": item.code,
    "Item Name": item.name,
    "Cost Price": item.costPrice,
    "Sales Price": item.salesPrice,
  }));

  // Download CSV
  exportToCSV(exportData, { filename: "items-filtered.csv" });

  // Download Excel
  exportToExcel(exportData, { filename: "items-filtered.xlsx", sheetName: "Items" });
}
```
