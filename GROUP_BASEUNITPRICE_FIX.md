# Group Custom Item baseUnitPrice Fix

## 🔴 The Problem

When editing a quotation, custom items in groups were **not calculating unit prices properly**, even though they worked correctly during creation.

**Issue**: Custom items should use `baseUnitPrice` from the group to calculate unit prices based on dimensions, but during updates/edits, this wasn't happening.

## 🔍 Root Cause

The **admin edit page** was not passing `baseUnit` and `baseUnitPrice` fields from the database to the form!

### What Was Happening

1. **During Create**:
   - ✅ `createQuotation` fetches `baseUnit` and `baseUnitPrice` from `ModuleGroup`
   - ✅ Enriches sections with these values
   - ✅ Saves to database
   - ✅ Form calculates custom item prices correctly

2. **During Edit**:
   - ✅ `getQuotation` correctly fetches groups with `baseUnit` and `baseUnitPrice` from database
   - ❌ **Admin edit page SKIPPED these fields when mapping data to form**
   - ❌ Form received groups without `baseUnit`/`baseUnitPrice`
   - ❌ Custom items couldn't calculate unit prices

### The Bug Location

In `/app/(dashboard)/admin/quotations/[id]/edit/page.tsx`:

```typescript
// ❌ BEFORE (lines 57-63)
groups: section.groups?.map((group: any) => ({
  id: group.id,
  code: group.code || '',
  description: group.description,
  quantity: group.quantity ? Number(group.quantity) : null,
  sortOrder: group.sortOrder,
  moduleGroupId: group.moduleGroupId || null,
  // ❌ MISSING: baseUnit and baseUnitPrice!
  items: group.items?.map((item: any) => ({
```

## ✅ The Fix

Added the missing `baseUnit` and `baseUnitPrice` fields to the groups mapping:

```typescript
// ✅ AFTER
groups: section.groups?.map((group: any) => ({
  id: group.id,
  code: group.code || '',
  description: group.description,
  quantity: group.quantity ? Number(group.quantity) : null,
  sortOrder: group.sortOrder,
  moduleGroupId: group.moduleGroupId || null,
  baseUnit: group.baseUnit || null,                           // ✅ ADDED
  baseUnitPrice: group.baseUnitPrice ? Number(group.baseUnitPrice) : null,  // ✅ ADDED
  items: group.items?.map((item: any) => ({
```

### How baseUnitPrice Works

When a group has `baseUnit` (e.g., "sqft", "sqm", "sqin") and `baseUnitPrice`, the `QuotationItemsArea` component:

1. **Detects custom items** (items without `moduleGroupItemId`)
2. **Checks for dimensions** (height, width, depth)
3. **Calculates area** using the dimensions
4. **Calls `calculateKitchenModule`** to compute unit price based on area
5. **Uses `baseUnitPrice`** as the cost per unit area
6. **Sets the calculated `unitPrice`** on the item

**Example**:
```typescript
// Group has:
baseUnit: "sqft"
baseUnitPrice: 50.00  // $50 per square foot

// Custom item with:
height: 36 inches
width: 24 inches  
depth: 12 inches

// Calculation:
1. Convert to inches: widthIn=24, heightIn=36, depthIn=12
2. Calculate area in sqft: (24 * 36) / 144 = 6 sqft
3. Calculate cost: 6 * $50 = $300
4. Set unitPrice: $300
```

## 🧪 How to Test

### Test 1: Edit Existing Quotation with Custom Group Items

1. **Create a quotation** with:
   - A group from ModuleGroup (has baseUnitPrice)
   - Add custom items with dimensions (height, width, depth)
   - Save

2. **Check that prices calculate correctly** ✅

3. **Edit the quotation**:
   - Open the quotation for editing
   - Check the custom items in groups
   - **Verify unit prices are displayed correctly** ✅
   - Try changing dimensions
   - **Verify unit prices recalculate** ✅

### Test 2: Verify Console Logs

Open browser console and watch for:

```
[QuotationItemsArea] Starting recalculation for custom items...
[QuotationItemsArea] Recalculating item in group [groupId] with baseUnit: sqft, baseUnitPrice: 50
[QuotationItemsArea] Calculated unitPrice: 300 for item with dimensions 24x36x12
```

If you see these logs, the calculation is working correctly!

## 📊 Status Check

| Route | Before Fix | After Fix |
|-------|------------|-----------|
| `/admin/quotations/new` | ✅ Works | ✅ Works |
| `/admin/quotations/[id]/edit` | ❌ **Broken** | ✅ **FIXED** |
| `/dashboard/quotations/new` | ✅ Works | ✅ Works |
| `/dashboard/quotations/[id]/edit` | ✅ Works | ✅ Works |

**Note**: The dashboard edit route was already working because it already had the `baseUnit` and `baseUnitPrice` fields included.

## 📝 Files Modified

1. `/app/(dashboard)/admin/quotations/[id]/edit/page.tsx`
   - Added `baseUnit: group.baseUnit || null`
   - Added `baseUnitPrice: group.baseUnitPrice ? Number(group.baseUnitPrice) : null`

## 🎯 Technical Details

### Where baseUnitPrice is Stored

1. **ModuleGroup table** (template):
   - `baseUnit`: string (e.g., "sqft", "sqm", "sqin")
   - `baseUnitPrice`: Decimal (cost per unit)

2. **Group table** (quotation instance):
   - `baseUnit`: string (copied from ModuleGroup when group is added)
   - `baseUnitPrice`: Decimal (copied from ModuleGroup when group is added)

### Data Flow

```
Create Quotation:
1. User selects ModuleGroup → group.moduleGroupId set
2. createQuotation fetches ModuleGroup.baseUnit/baseUnitPrice
3. Enriches group with these values
4. Saves to Group table ✅
5. Form renders with baseUnit/baseUnitPrice
6. Custom items calculate correctly ✅

Edit Quotation:
1. getQuotation fetches Group with baseUnit/baseUnitPrice from DB ✅
2. Edit page maps data to form
   - ❌ WAS: Skipping baseUnit/baseUnitPrice
   - ✅ NOW: Including baseUnit/baseUnitPrice
3. Form receives baseUnit/baseUnitPrice ✅
4. Custom items calculate correctly ✅
```

## 🚀 Expected Behavior Now

### When Editing a Quotation

1. **Open edit page** → Groups have `baseUnit` and `baseUnitPrice` ✅
2. **Custom items display** → Unit prices are calculated correctly ✅
3. **Change dimensions** → Unit prices recalculate automatically ✅
4. **Save quotation** → Updated prices are saved ✅

### When Adding Custom Items to Groups

1. **Select group with ModuleGroup** → baseUnit/baseUnitPrice available ✅
2. **Add custom item** → Item is marked as custom (no moduleGroupItemId)
3. **Enter dimensions** → Unit price calculates automatically ✅
4. **Change unit** → Unit price recalculates ✅

---

## ✅ Fix Complete!

The custom items in groups will now properly calculate unit prices based on `baseUnitPrice` during **both create AND update** operations!

**Test it now by editing an existing quotation with custom group items!** 🎉

