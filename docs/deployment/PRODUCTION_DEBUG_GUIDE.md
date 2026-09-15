# Production Debug Guide - Custom Item Calculation

## 🎯 Purpose

This guide helps diagnose why custom item unitPrice calculation works in localhost but fails in production.

## 📊 Debug Logs Added

I've added comprehensive console logging to track the entire calculation flow. Deploy these changes and check your production console.

### 1. Edit Page Load Logs

**Location**: `/admin/quotations/[id]/edit/page.tsx`

**What to look for**:

```javascript
[Edit Page] Raw quotation data from DB: {...}
[Edit Page] Processing group: {
  id: "...",
  description: "...",
  moduleGroupId: "...",
  baseUnit: "sqft",           // ⚠️ Check if this is null
  baseUnitPrice: 50.00,       // ⚠️ Check if this is null
  baseUnitPriceType: "object", // ⚠️ Should be "number" or "object"
  rawBaseUnitPrice: {...},
  hasModuleGroup: true,
  itemCount: 5
}
```

**What to check**:
- ✅ `baseUnit` should have a value ("sqft", "sqm", or "sqin")
- ✅ `baseUnitPrice` should be a number (e.g., 50.00)
- ❌ If `baseUnit` is `null` → **Database migration issue**
- ❌ If `baseUnitPrice` is `null` → **Database migration issue**
- ❌ If `baseUnitPriceType` is "object" → **Decimal serialization issue**

---

### 2. Custom Item Detection Logs

**Location**: `QuotationItemsArea.tsx` - `updateItem()` function

**What to look for**:

```javascript
[QuotationItemsArea] updateItem - Custom item check: {
  itemId: "...",
  itemDescription: "Custom Cabinet",
  isCustomItem: true,          // ✅ Should be true for custom items
  hasModuleGroupItemId: false, // ✅ Should be false for custom items
  groupId: "...",
  groupDescription: "Kitchen Modules",
  groupModuleGroupId: "...",
  groupBaseUnit: "sqft",       // ⚠️ Check if null
  groupBaseUnitPrice: 50.00,   // ⚠️ Check if null
  hasBasePrice: true,          // ⚠️ Should be true
  isValidBaseUnit: true,       // ⚠️ Should be true
  itemDimensions: {
    height: 36,
    width: 24,
    depth: 12
  },
  willCalculate: true          // ⚠️ Should be true
}
```

**What to check**:
- ✅ `isCustomItem` = true
- ✅ `groupBaseUnit` has value
- ✅ `groupBaseUnitPrice` has value
- ✅ `hasBasePrice` = true
- ✅ `isValidBaseUnit` = true
- ✅ `willCalculate` = true
- ❌ If `willCalculate` = false → Check which condition failed

---

### 3. Calculation Process Logs

**What to look for**:

```javascript
[QuotationItemsArea] Starting unitPrice calculation for custom item

[QuotationItemsArea] shouldRecalculate = true, proceeding with calculation

[QuotationItemsArea] Calling calculateKitchenModule with: {
  baseUnit: "sqft",
  baseUnitPrice: 50,
  dimensions: { heightIn: 36, widthIn: 24, depthIn: 12 }
}

[QuotationItemsArea] calculateKitchenModule result: {
  result: {...},
  perModuleCost: 300,
  totalCost: 300
}

[QuotationItemsArea] ✅ Setting calculated unitPrice: 300
```

**What to check**:
- ✅ All logs appear in sequence
- ✅ `perModuleCost` has a valid number
- ❌ If calculation stops before "Setting calculated unitPrice" → Check error logs

---

### 4. Recalculation Loop Logs

**What to look for**:

```javascript
[QuotationItemsArea] Recalculation useEffect triggered

[QuotationItemsArea] Processing group for recalculation: {
  groupId: "...",
  description: "...",
  baseUnit: "sqft",
  baseUnitPrice: 50,
  itemCount: 5
}

[QuotationItemsArea] Recalc check for item: {
  itemId: "...",
  description: "...",
  hasValidDimensions: true,
  currentUnitPrice: 0,         // ⚠️ Check if 0
  needsRecalculation: true     // ⚠️ Should be true if unitPrice is 0
}

[QuotationItemsArea] Recalculating unitPrice for item: ...

[QuotationItemsArea] ✅ Recalculation complete: {
  itemId: "...",
  oldUnitPrice: 0,
  newUnitPrice: 300,
  newAmount: 1500
}
```

---

## 🔍 Common Issues & Solutions

### Issue 1: baseUnit/baseUnitPrice are NULL

**Symptoms**:
```javascript
groupBaseUnit: null
groupBaseUnitPrice: null
hasBasePrice: false
willCalculate: false
```

**Cause**: Database columns don't exist or data wasn't migrated.

**Solution**:
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ItemGroup' 
  AND column_name IN ('baseUnit', 'baseUnitPrice');

-- If missing, add them
ALTER TABLE "ItemGroup" 
ADD COLUMN IF NOT EXISTS "baseUnit" TEXT,
ADD COLUMN IF NOT EXISTS "baseUnitPrice" DECIMAL(10,2);

-- Populate from ModuleGroup
UPDATE "ItemGroup" ig
SET 
  "baseUnit" = mg."baseUnit",
  "baseUnitPrice" = mg."baseUnitPrice"
FROM "ModuleGroup" mg
WHERE ig."moduleGroupId" = mg.id
  AND ig."baseUnit" IS NULL;
```

---

### Issue 2: Decimal Serialization Problem

**Symptoms**:
```javascript
baseUnitPriceType: "object"
rawBaseUnitPrice: { s: 1, e: 1, d: [50], constructor: Decimal }
```

**Cause**: Prisma returns Decimal objects, not numbers.

**Solution**: Already handled in code with `Number(group.baseUnitPrice)`, but check if it's working:

```javascript
// In edit page.tsx - Should convert to number
baseUnitPrice: group.baseUnitPrice ? Number(group.baseUnitPrice) : null
```

---

### Issue 3: Calculation Not Triggered

**Symptoms**:
```javascript
willCalculate: false
// OR
shouldRecalculate: false
```

**Cause**: One of the conditions is failing.

**Check**:
1. Is `isCustomItem` true? (no `moduleGroupItemId`)
2. Is `isValidBaseUnit` true? (baseUnit is sqft/sqm/sqin)
3. Does item have valid dimensions? (height, width, depth > 0)
4. Is `baseUnitPrice` > 0?

---

### Issue 4: calculateKitchenModule Fails

**Symptoms**:
```javascript
[QuotationItemsArea] ❌ Error calculating custom item unit price: ...
```

**Cause**: Invalid input to calculation function.

**Check**:
- Are dimensions valid numbers?
- Is baseUnit valid ("sqft", "sqm", "sqin")?
- Is baseUnitPrice a valid number > 0?

---

## 📝 How to Use This Guide

### Step 1: Deploy Changes

```bash
# Build and deploy your app with the new logging
npm run build
# Deploy to production
```

### Step 2: Test in Production

1. Open production quotation edit page
2. Open browser DevTools → Console tab
3. Edit a custom item or change dimensions
4. Watch console logs

### Step 3: Copy Logs

Copy ALL console logs that start with:
- `[Edit Page]`
- `[QuotationItemsArea]`

### Step 4: Share Logs

Send me the logs and I'll identify the exact issue.

---

## 🎯 What to Send Me

### Format:

```
PRODUCTION LOGS:
================

Page Load:
----------
[Edit Page] Raw quotation data from DB: {...}
[Edit Page] Processing group: {...}

Item Update:
-----------
[QuotationItemsArea] updateItem - Custom item check: {...}
[QuotationItemsArea] Starting unitPrice calculation for custom item
[QuotationItemsArea] Calling calculateKitchenModule with: {...}
[QuotationItemsArea] calculateKitchenModule result: {...}

Recalculation:
-------------
[QuotationItemsArea] Recalculation useEffect triggered
[QuotationItemsArea] Processing group for recalculation: {...}
[QuotationItemsArea] Recalc check for item: {...}
```

### Include:

1. **Full console output** from page load to calculation attempt
2. **Network tab** → Find the `getQuotation` API response → Copy the JSON
3. **Any error messages** (red text in console)
4. **Database info**:
   - PostgreSQL version
   - Hosting provider (Vercel, AWS, etc.)
   - When was last migration run?

---

## 🔧 Quick Checks

### Check 1: Database Columns Exist

```sql
-- Run in production database
\d "ItemGroup"

-- Should show:
-- baseUnit      | text          |
-- baseUnitPrice | numeric(10,2) |
```

### Check 2: Data Exists

```sql
-- Check if groups have baseUnit/baseUnitPrice
SELECT 
  id,
  description,
  "moduleGroupId",
  "baseUnit",
  "baseUnitPrice"
FROM "ItemGroup"
WHERE "moduleGroupId" IS NOT NULL
LIMIT 5;

-- Should show values, not NULL
```

### Check 3: Prisma Client Updated

```bash
# In production server
npx prisma --version
# Should match local version

# Regenerate if needed
npx prisma generate
```

---

## 🚨 Emergency Fix

If you need a quick workaround while debugging:

### Option 1: Manual Unit Price Entry

Temporarily allow users to enter unitPrice manually for custom items.

### Option 2: Server-Side Calculation

Move calculation to server action (slower but more reliable).

### Option 3: Fetch ModuleGroup Data

If `baseUnit`/`baseUnitPrice` are missing from groups, fetch from `ModuleGroup`:

```typescript
// In QuotationItemsArea.tsx
if (!group.baseUnit && group.moduleGroupId) {
  // Fetch from ModuleGroup
  const moduleGroup = await getModuleGroupById(group.moduleGroupId);
  group.baseUnit = moduleGroup.baseUnit;
  group.baseUnitPrice = moduleGroup.baseUnitPrice;
}
```

---

## ✅ Success Indicators

You'll know it's working when you see:

```javascript
[QuotationItemsArea] updateItem - Custom item check: {
  ...
  willCalculate: true  // ✅
}

[QuotationItemsArea] ✅ Setting calculated unitPrice: 300

[QuotationItemsArea] ✅ Recalculation complete: {
  oldUnitPrice: 0,
  newUnitPrice: 300,
  newAmount: 1500
}
```

And the item shows the calculated price in the UI!

---

**Once you deploy and test, send me the console logs and I'll pinpoint the exact issue!** 🎯

