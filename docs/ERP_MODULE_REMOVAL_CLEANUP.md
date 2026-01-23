# ERP Module Removal Cleanup Documentation

## Overview

This document describes the comprehensive cleanup and removal of Quotations, Invoices, Orders, Work Orders, Items, and Item Groups from the ERP system. Categories and Units have been preserved and moved to a new **Master Data** module structure.

**Date:** January 2026  
**Scope:** Complete removal of quotation and item-related modules while preserving core master data functionality

---

## What Was Removed

### Database Models (Prisma Schema)

The following models were completely removed from `prisma/schema.prisma`:

- `Quotation` - Quotation management
- `WorkOrder` - Work order tracking
- `Section` - Quotation sections
- `ItemGroup` - Item grouping
- `QuotationItem` - Items within quotations
- `Item` - Product/item catalog
- `ItemCategory` - Item-to-category mapping
- `CategoryGroup` - Category grouping for quotations
- `ModuleGroup` - Module grouping
- `ModuleGroupItem` - Module group items
- `CoverLetter` - Cover letter templates

### Database Enums

- `QuotationStatus` - Status values for quotations
- `WorkOrderStatus` - Status values for work orders

### Relations Cleaned

**User Model:**
- Removed: `quotations`, `updatedQuotations`, `sections`, `createdWorkOrders`, `createdCoverLetters`, `createdModuleGroups`

**Organization Model:**
- Removed: `quotations` relation

**Client Model:**
- Removed: `Quotation` relation

**Unit Model:**
- Removed: `items` relation (Unit is now standalone in Master Data)

**Category Model:**
- Removed: `items` relation via `ItemCategory`
- Removed: `categoryGroups` relation

**PurchaseItem Model:**
- Removed: `item` relation
- `itemId` field made nullable (optional) - purchases can now reference items by description only

---

## What Was Moved/Reorganized

### Categories & Units → Master Data Module

**Old Paths:**
- `/dashboard/items/category` → **New:** `/dashboard/master/categories`
- `/dashboard/items/units` → **New:** `/dashboard/master/units`
- `/admin/items/category` → **New:** `/admin/master/categories`
- `/admin/items/units` → **New:** `/admin/master/units`

**Permission Keys:**
- `items.category` → **New:** `master.categories`
- `items.units` → **New:** `master.units`

---

## Database Schema Changes

### PurchaseItem Model Update

The `PurchaseItem` model was modified to remove the Item relation:

```prisma
model PurchaseItem {
  id          String   @id @default(cuid())
  purchaseId  String
  itemId      String?  // Made nullable - no longer required
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Decimal  @db.Decimal(10, 2)
  amount      Decimal  @db.Decimal(12, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  purchase    Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  // item relation removed
}
```

**Impact:** Purchase items can now be created with just a description, without requiring an Item record.

---

## Permission System Changes

### Module Type Updates

**Removed from Module type:**
- `"items"`
- `"quotations"`

**Added to Module type:**
- `"master"` - New master data module

### Permission Keys Removed

- `items.items`
- `items.groups`
- `items.category` (moved to `master.categories`)
- `items.units` (moved to `master.units`)
- `quotations.quotations`
- `quotations.invoices`
- `quotations.orders`
- `work-orders.work-orders`

### Permission Keys Added

- `master.categories` - Manage categories
- `master.units` - Manage units

### Navigation Structure

**Removed Navigation Items:**
- Items menu (with sub-items: Items, Groups, Categories, Units)
- Quotations menu (with sub-items: Quotations, Invoices, Orders)
- Work Orders menu

**Added Navigation Item:**
- Master Data menu (with sub-items: Categories, Units)

---

## Route Changes

### Deleted Routes

**Dashboard Routes:**
- `/dashboard/quotations/*` - All quotation routes
- `/dashboard/work-orders/*` - All work order routes
- `/dashboard/items/*` - All item routes (except category/units which were moved)

**Admin Routes:**
- `/admin/quotations/*` - All quotation routes
- `/admin/work-orders/*` - All work order routes
- `/admin/items/*` - All item routes (except category/units which were moved)

### New Routes

**Master Data Routes:**
- `/dashboard/master/categories` - Categories listing
- `/dashboard/master/categories/add` - Add category
- `/dashboard/master/categories/[id]` - Category details
- `/dashboard/master/categories/[id]/edit` - Edit category
- `/dashboard/master/units` - Units listing
- `/dashboard/master/units/add` - Add unit
- `/dashboard/master/units/[id]` - Unit details
- `/dashboard/master/units/[id]/edit` - Edit unit

**Admin Routes:**
- `/admin/master/categories/*` - Same structure as dashboard
- `/admin/master/units/*` - Same structure as dashboard

---

## Server Actions Removed

### Deleted Action Files

- `app/actions/quotations.ts`
- `app/actions/quotation-helpers.ts`
- `app/actions/quotation-accounting-integration.ts`
- `app/actions/clear-quotations.ts`
- `app/(dashboard)/dashboard/items/_actions/item.action.tsx`
- `app/(dashboard)/admin/items/_actions/item.action.tsx`
- `app/(dashboard)/dashboard/items/groups/_actions/group.action.tsx`
- `app/(dashboard)/admin/items/groups/_actions/group.action.tsx`

### Dashboard Actions Updated

**File:** `app/actions/dashboard.action.ts`

**Removed Functions:**
- `getRecentQuotations()`
- `getQuotationStatusBreakdown()`
- `getRecentItems()`
- `getRevenueStats()`
- `getUserRecentQuotations()`
- `getUserRecentItems()`
- `getUserQuotationStatusBreakdown()`

**Updated Functions:**
- `getDashboardStats()` - Removed quotation, item, and moduleGroup queries
- `getUserDashboardStats()` - Removed quotation and item permission checks and queries
- `getRecentClients()` - Removed `Quotation` count from client data

### Purchase Actions Updated

**File:** `app/(dashboard)/dashboard/purchases/_actions/purchase.action.tsx`

**Removed:**
- `getItemsForPurchase()` function - No longer fetches Item records

**Updated:**
- Purchase item queries no longer include `item` relation
- Purchase items can be created without `itemId` (description-only items)

---

## Component Changes

### Deleted Component Directories

- `components/quotation/` - All quotation components
- `components/items/` - Item-specific components (shared utilities preserved)
- `components/work-orders/` - Work order components

### Dashboard Components Updated

**Files to Update:**
- `components/dashboard/user-dashboard-stats.tsx` - Remove quotation/item statistics
- `components/dashboard/admin-dashboard-stats.tsx` - Remove quotation/item statistics
- `components/dashboard/recent-quotations-table.tsx` - **DELETED**
- `components/dashboard/quotation-status-chart.tsx` - **DELETED**

### Settings Changes

**Removed Settings Sections:**
- Cover Letter settings
- Terms of Service (TOS) settings

**Deleted Files:**
- `app/(dashboard)/dashboard/settings/_components/coverLetter/`
- `app/(dashboard)/admin/settings/_components/coverLetter/`
- `app/(dashboard)/dashboard/settings/_components/Tos.tsx`
- `app/(dashboard)/admin/settings/_components/Tos.tsx`
- `app/(dashboard)/dashboard/settings/_actions/coverLetter.action.tsx`
- `app/(dashboard)/admin/settings/_actions/coverLetter.action.tsx`

---

## Type Definitions & Utilities

### Deleted Type Files

- `types/quotation.ts`
- `types/item.ts` (if existed)

### Redux/State Changes

- Removed `quotationSlice` from Redux store

### Utility Functions Removed

**File:** `lib/utils/pdf-generator.ts`
- Removed `generateQuotationPDF()` function

### Route Utils Updated

**File:** `lib/permission-utils.ts`
- Removed path mappings for `/dashboard/items/*` and `/dashboard/quotations/*`
- Added mappings for `/dashboard/master/categories` and `/dashboard/master/units`

**File:** `lib/navigation-builder.ts`
- Removed Items and Quotations menu items
- Added Master Data menu with Categories and Units

---

## Migration Instructions

### Prisma Migration

After schema changes, run:

```bash
npx prisma migrate dev --name remove_quotations_items_modules
```

This migration will:
- Drop all removed tables (Quotation, WorkOrder, Section, ItemGroup, QuotationItem, Item, ItemCategory, CategoryGroup, CoverLetter, ModuleGroup, ModuleGroupItem)
- Drop removed enums (QuotationStatus, WorkOrderStatus)
- Remove foreign key constraints
- Make `PurchaseItem.itemId` nullable

**⚠️ WARNING:** This is a **destructive operation**. All quotation and item data will be permanently lost. Ensure you have backups before running this migration.

### Post-Migration Steps

1. **Update Permission Seeds**
   - Run permission seed script to remove old permissions and add new master permissions
   - Update `prisma/seed-permissions.ts` if needed

2. **Clear Build Cache**
   ```bash
   rm -rf .next
   npm run build
   ```

3. **Verify Routes**
   - Test that removed routes return 404
   - Test that new master routes work correctly
   - Verify permission checks work for `master.categories` and `master.units`

---

## Breaking Changes

### For Developers

1. **Import Paths**
   - All imports referencing `@/app/actions/quotations`, `@/types/quotation`, `@/components/quotation/*` will fail
   - Update any remaining imports to use new paths

2. **Permission Checks**
   - Replace `items.category` with `master.categories`
   - Replace `items.units` with `master.units`
   - Remove checks for `quotations.*` and `items.*` (except master)

3. **Route References**
   - Update all hardcoded routes from `/dashboard/items/category` to `/dashboard/master/categories`
   - Update all hardcoded routes from `/dashboard/items/units` to `/dashboard/master/units`
   - Remove references to `/dashboard/quotations/*` and `/dashboard/work-orders/*`

4. **Database Queries**
   - Remove all Prisma queries referencing `prisma.quotation`, `prisma.item`, `prisma.workOrder`, etc.
   - Update `PurchaseItem` queries to handle nullable `itemId`

5. **TypeScript Types**
   - Remove imports of `Quotation`, `Item`, `WorkOrder`, `QuotationStatus`, `WorkOrderStatus` types
   - Update any custom types that reference these models

### For Users

1. **Lost Data**
   - All quotations, work orders, and items are permanently deleted
   - Categories and Units are preserved and accessible under Master Data

2. **Navigation Changes**
   - Items and Quotations menus removed from sidebar
   - New "Master Data" menu added with Categories and Units

3. **Purchase Module**
   - Purchase items can now be created without selecting an Item
   - Description-only purchase items are supported

---

## Verification Checklist

After migration, verify:

- [ ] Prisma schema validates: `npx prisma validate`
- [ ] TypeScript compiles: `npm run build` or `tsc --noEmit`
- [ ] Removed routes return 404
- [ ] `/dashboard/master/categories` works
- [ ] `/dashboard/master/units` works
- [ ] Dashboard loads without quotation/item references
- [ ] Permission system works for `master.categories` and `master.units`
- [ ] No broken imports or references to removed modules
- [ ] Purchase module works (without Item relation)
- [ ] All other modules (Accounts, Users, Clients, Suppliers) remain functional

---

## Rollback Plan

If rollback is needed:

1. **Database:** Restore from backup taken before migration
2. **Code:** Revert git commits related to this cleanup
3. **Permissions:** Re-run permission seed with old structure

**Note:** Rollback is complex and may require manual intervention. Ensure backups are available.

---

## Related Documentation

- [Development Guidelines](./DEVELOPMENT_GUIDELINE.md)
- [Permission System Documentation](./PERMISSION_SYSTEM_IMPLEMENTATION.md)
- [Master Data Implementation Tracker](./MASTER_DATA_IMPLEMENTATION_TRACKER.md)

---

## Questions or Issues

If you encounter issues after this cleanup:

1. Check the verification checklist above
2. Review error logs for broken imports or references
3. Verify Prisma schema is valid
4. Ensure all route references are updated
5. Check permission system configuration

---

**Last Updated:** January 2026  
**Version:** 1.0
