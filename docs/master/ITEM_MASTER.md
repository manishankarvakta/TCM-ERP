# Item Master Module - Development Documentation

**Last Updated**: September 14, 2026  
**Module Path**: `/dashboard/master/items`  
**Permission Key**: `master.items`

---

## 📋 Overview

The **Item Master Module** manages all products and physical inventory master records within ffERP. It serves as the primary master data source for Inventory Control, Procurements, Sales & POS, E-commerce, and Garment Production.

---

## 🎯 Key Features & Requirements

- ✅ **Mandatory Master Data Fields**:
  - **Category**: Mandatory selection (`categoryId`).
  - **Sub-category**: Mandatory selection (`subCategoryId`), dependent on selected category.
  - **Brand**: Mandatory selection (`brandId`).
  - **Supplier(s)**: At least one supplier must be assigned (`supplierIds.length >= 1`).
  - **Unit**: Mandatory Unit of Measurement (`unitId`).
- ✅ **Pricing Protection (`salesPrice > costPrice`)**:
  - Enforces that Sales Price must be strictly greater than Cost Price (`salesPrice > costPrice`) whenever Sales Price is set or required.
- ✅ **Item Flags & Settings**:
  - **Disable Discount (`isDiscountable`)**: Setting checkbox disables item discounts during POS/Sales checkout.
  - **Disable Customer Points (`isCustomerPointAvailable`)**: Setting checkbox excludes product line item from earning customer loyalty points in POS.
  - **VAT / Tax Settings**: Custom VAT percentage control (`isVatEnabled`, `vatPercentage`).
  - **E-Commerce Storefront Toggle**: Controls storefront API visibility (`isEnableEcom`).
  - **Inventory Tracking**: Toggles stock ledger tracking (`trackInventory`).
- ✅ **Product Variant Matrix**: Size and color SKU variant generator (`sku-variant-matrix.tsx`).
- ✅ **Barcode Generation & Printing**: Automated barcode assignment and printable barcode sticker layout (`BarcodePrintModal.tsx`).
- ✅ **Stock Ledger Auditing**: Immutable stock history calculation with running balance, document links, and profit/loss calculations (`/dashboard/master/items/ledger`).
- ✅ **CSV / Excel Bulk Import**: Integrated import module (`/dashboard/import`) enforcing all required fields and price safeguards.

---

## 🗄️ Database Schema

### `Item` Model (`prisma/schema.prisma`)

```prisma
model Item {
  id                      String                    @id @default(cuid())
  code                    String                    @unique // Auto-generated: RAW-xxx, RP-xxx, RTL-xxx, WS-xxx
  slug                    String?                   @unique
  name                    String
  description             String?
  unitId                  String
  costPrice               Decimal                   @db.Decimal(12, 2)
  salesPrice              Decimal?                  @db.Decimal(12, 2)
  wholesalePrice          Decimal?                  @db.Decimal(12, 2)
  wholesaleDiscountAmount Decimal?                  @db.Decimal(12, 2)
  discount                Decimal?                  @db.Decimal(12, 2)
  status                  String                    @default("active") // active, inactive, trash
  itemType                ItemType                  // RAW_MATERIAL, READY_PRODUCT, RETAIL, WHOLESALE
  trackInventory          Boolean                   @default(false)
  isEnableEcom            Boolean                   @default(false)
  isVatEnabled            Boolean                   @default(false)
  vatPercentage           Decimal                   @default(0) @db.Decimal(5, 2)
  isDiscountable          Boolean                   @default(true)  // false when "Disable Discount" is checked
  isCustomerPointAvailable Boolean                  @default(true)  // false when "Disable Customer Points" is checked
  isTrash                 Boolean                   @default(false)
  barcode                 String?                   @unique
  images                  Json?
  featuredImage           String?
  sizes                   String[]
  colors                  String[]
  categoryId              String?
  subCategoryId           String?
  brandId                 String?
  createdBy               String
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt

  category                Category?                 @relation("ItemCategory", fields: [categoryId], references: [id])
  subCategory             Category?                 @relation("ItemSubCategory", fields: [subCategoryId], references: [id])
  brand                   Brand?                    @relation(fields: [brandId], references: [id])
  unit                    Unit                      @relation(fields: [unitId], references: [id])
  creator                 User                      @relation("ItemCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  variants                ProductVariant[]
  suppliers               Supplier[]                @relation("ItemSuppliers")
  stocks                  Stock[]
  stockLedgers            StockLedger[]
}
```

---

## 📁 File Structure

```
app/(dashboard)/dashboard/master/items/
├── page.tsx                             # Server page with Tabs (All Items / Trash) & permissions
├── add/
│   └── page.tsx                         # Add item page container
├── [id]/
│   ├── page.tsx                         # Item detail view page (with badges & variant matrix)
│   └── edit/
│       └── page.tsx                     # Edit item page container
├── ledger/
│   └── page.tsx                         # Item stock ledger view page
├── _actions/
│   └── item.action.tsx                  # Server actions (create, update, delete, ledger, export)
└── _components/
    ├── items.tsx                        # Client data table & filters
    ├── itemForm.tsx                     # Form component with validation & checkboxes
    ├── itemLedger.tsx                   # Stock ledger table & summary
    ├── item-photo-gallery.tsx           # Photo gallery manager
    ├── sku-variant-matrix.tsx           # Variant matrix generator
    ├── BarcodePrintModal.tsx            # Barcode printing modal
    └── ExportItemsButton.tsx            # Excel/CSV dataset export
```

---

## 🔌 Server Actions (`item.action.tsx`)

### Key Functions

#### `createItem(input)`
Creates a new item. Validates that Category, Sub-category, Brand, and at least 1 Supplier are provided. Enforces `salesPrice > costPrice`.

#### `updateItem(input)`
Updates existing item attributes, prices, supplier connections, and variants. Enforces mandatory fields and `salesPrice > costPrice`.

#### `getItems(page, limit, search, status, itemType)`
Paginated query with search across item name, code, barcode, and SKU variants.

#### `getItemLedger(itemId, startDate, endDate, warehouseId, variantId)`
Computes stock ledger running balances, document references (GRN, TPN, Sales, Purchases, Returns), and profit/loss.

---

## 📦 CSV / Excel Import System Integration

* **Configuration**: Defined in `lib/import-config.ts` under module `Products`.
* **Required Columns**: `Item Name`, `Sales Price`, `Purchase / Cost Price`, `Category Name`, `Sub-Category Name`, `Brand Name`, `Supplier Name / Code`.
* **Configurable Settings**:
  * `Disable Discount` (`isDiscountDisabled`): Set to `true` to disable discounts.
  * `Disable Customer Points` (`isCustomerPointDisabled`): Set to `true` to disable loyalty points.
* **Price Safeguard**: CSV validation fails rows where `Sales Price <= Cost Price`.

---

## 🛒 POS Checkout Screen & Sales Impact

1. **Disable Discount (`isDiscountable = false`)**:
   - POS cart calculation ignores line discounts, promotional pricing, and custom discounts for the item.
2. **Disable Customer Points (`isCustomerPointAvailable = false`)**:
   - Excludes the line item's price from calculating customer reward points.
3. **Sales Returns & Exchanges**:
   - Restocking and invoice refund values retain original sale price accuracy.
   - Replacement exchange items enforce current pricing safeguards and discount flags.
