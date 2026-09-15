# Accounts System End-to-End Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the accounts system integration with inventory and sales flow.

## Prerequisites

- Database migrated and seeded
- Chart of Accounts seeded (including inventory accounts)
- User logged in with admin permissions
- Test data available:
  - At least one supplier
  - At least one client
  - At least one warehouse
  - Items: RAW_MATERIAL, READY_PRODUCT, RETAIL types with costPrice

---

## Phase 1: Pre-Check Verification

### 1.1 Verify Chart of Accounts

**Location**: `/dashboard/accounts/chart-of-accounts`

**Steps**:
1. Navigate to Chart of Accounts page
2. Search for each required account:
   - Raw Material Inventory (code: 1620)
   - Ready Products Inventory (code: 1630)
   - Retail Inventory (code: 1640)
   - Accounts Receivable (code: 1410)
   - Accounts Payable (code: 2110)
   - Sales Revenue (code: 4110)
   - Cost of Goods Sold (code: 5110)

**Expected**: All accounts exist and are active

**Alternative**: Run test script:
```bash
npx tsx scripts/test-accounts-system.ts
```

### 1.2 Verify Permissions

**Location**: `/admin/permissions` or check user permissions

**Steps**:
1. Verify user has permissions for:
   - `accounts.vouchers` with operations: create, view, update, edit
   - `accounts.trial-balance` with operation: view
   - `accounts.balance-sheet` with operation: view
   - `accounts.profit-loss` with operation: view
   - `accounts.accounts-receivable` with operation: view
   - `accounts.accounts-payable` with operation: view

**Expected**: Permissions exist and user has access

---

## Phase 2: Purchase Accounting Testing

### Test 2.1: Create Purchase A - Raw Material

**Steps**:
1. Navigate to `/dashboard/procurements/purchases/add`
2. Select a supplier
3. Select a warehouse
4. Add item:
   - Item: Select a RAW_MATERIAL item (e.g., Steel)
   - Quantity: 10
   - Unit Price: 10
   - Amount should auto-calculate to 100
5. Save as DRAFT
6. Navigate to purchase list
7. Find the purchase and change status to RECEIVED

**Verification**:
1. Check purchase details page - should show `voucherId` is set
2. Navigate to `/dashboard/accounts/vouchers`
3. Find voucher with reference = purchase number
4. Verify voucher:
   - Type = PURCHASE
   - Status = posted
   - Supplier linked
5. Click on voucher to view details
6. Verify journal entry lines:
   - Line 1: Raw Material Inventory, Debit 100, Credit 0
   - Line 2: Accounts Payable, Debit 0, Credit 100
   - Total Debits = Total Credits = 100
7. Check stock: Navigate to `/dashboard/inventory/stock` - Steel quantity should increase by 10

### Test 2.2: Create Purchase B - Ready Products

**Steps**: Same as 2.1, but:
- Item: Select a READY_PRODUCT item (e.g., T-shirt)
- Quantity: 50
- Unit Price: 20
- Total: 1000

**Verification**:
- Journal entry: Ready Products Inventory Debit 1000, Accounts Payable Credit 1000

### Test 2.3: Create Purchase C - Retail

**Steps**: Same as 2.1, but:
- Item: Select a RETAIL item (e.g., Pen)
- Quantity: 100
- Unit Price: 2
- Total: 200

**Verification**:
- Journal entry: Retail Inventory Debit 200, Accounts Payable Credit 200

---

## Phase 3: Production Accounting Testing

### Test 3.1: Create and Complete Production Order

**Prerequisites**:
- BOM exists with raw materials
- Raw material stock available (from Purchase A)

**Steps**:
1. Navigate to `/dashboard/production/orders/add`
2. Select BOM (e.g., Steel Rods BOM)
3. Select warehouse
4. Set production quantity: 1
5. Save as PLANNED
6. Start production (status → IN_PROGRESS)
7. Complete production (status → COMPLETED)

**Verification**:
1. Check production order details - should show `voucherId` is set
2. Navigate to `/dashboard/accounts/vouchers`
3. Find voucher with reference = production order code
4. Verify voucher:
   - Type = JOURNAL
   - Status = posted
5. Verify journal entry lines:
   - Line 1: Ready Products Inventory, Debit = raw material cost, Credit 0
   - Line 2: Raw Material Inventory, Debit 0, Credit = raw material cost
   - Total Debits = Total Credits
6. Check stock:
   - Raw Material quantity decreased
   - Ready Product quantity increased

---

## Phase 4: Sales Accounting Testing

### Test 4.1: Create and Complete Sale

**Prerequisites**:
- Ready Product stock available (from Production or Purchase B)
- Client exists

**Steps**:
1. Navigate to `/dashboard/sales/add`
2. Select client
3. Select warehouse
4. Add item:
   - Item: Select a READY_PRODUCT item (e.g., Steel Rods or T-shirt)
   - Quantity: 2
   - Unit Price: 30
   - Amount should auto-calculate to 60
5. Save as DRAFT
6. Complete sale (click "Complete Sale" button)

**Verification**:
1. Check sale details page - should show `voucherId` is set, status = COMPLETED
2. Navigate to `/dashboard/accounts/vouchers`
3. Find voucher with reference = sale number
4. Verify voucher:
   - Type = SALES
   - Status = posted
   - Client linked
5. Verify journal entry lines:
   - Line 1: Accounts Receivable, Debit 60, Credit 0, clientId set
   - Line 2: Sales Revenue, Debit 0, Credit 60
   - Line 3: COGS, Debit = (2 × costPrice), Credit 0
   - Line 4: Ready Products Inventory, Debit 0, Credit = (2 × costPrice)
   - Total Debits = Total Credits
6. Check stock: Ready Product quantity decreased by 2

---

## Phase 5: Cash/Bank Payment Testing

### Test 5.1: Customer Payment (Receipt Voucher)

**Prerequisites**: Sale completed (from Phase 4)

**Steps**:
1. Navigate to `/dashboard/accounts/vouchers/receipt/add`
2. Select date
3. First line: Select Cash/Bank account (e.g., "Bank – Primary Account")
   - Debit: 60
   - Credit: 0
4. Second line: Select "Accounts Receivable"
   - Debit: 0
   - Credit: 60
   - Link to client (select client from sale)
5. Add description: "Payment for sale [sale number]"
6. Create voucher
7. Post voucher (click "Post" button)

**Verification**:
1. Voucher status = posted
2. Journal entry lines:
   - Cash/Bank: Debit 60
   - Accounts Receivable: Credit 60, clientId set
3. Navigate to `/dashboard/accounts/accounts-receivable`
4. Client's AR balance should decrease by 60

### Test 5.2: Supplier Payment (Payment Voucher)

**Prerequisites**: Purchase completed (from Phase 2)

**Steps**:
1. Navigate to `/dashboard/accounts/vouchers/payment/add`
2. Select date
3. First line: Select "Accounts Payable"
   - Debit: 100
   - Credit: 0
   - Link to supplier
4. Second line: Select Cash/Bank account
   - Debit: 0
   - Credit: 100
5. Add description: "Payment for purchase [purchase number]"
6. Create and post voucher

**Verification**:
1. Voucher status = posted
2. Journal entry lines:
   - Accounts Payable: Debit 100, supplierId set
   - Cash/Bank: Credit 100
3. Navigate to `/dashboard/accounts/accounts-payable`
4. Supplier's AP balance should decrease by 100

---

## Phase 6: Reports Verification

### Test 6.1: Trial Balance

**Location**: `/dashboard/accounts/trial-balance`

**Steps**:
1. Navigate to Trial Balance page
2. Select date (today or after all transactions)
3. View report

**Verification**:
- All accounts with transactions appear
- Total Debits = Total Credits
- Inventory accounts show correct balances
- AR and AP show correct balances
- Sales Revenue and COGS show correct amounts

### Test 6.2: Balance Sheet

**Location**: `/dashboard/accounts/balance-sheet`

**Steps**:
1. Navigate to Balance Sheet page
2. Select date
3. View report

**Verification**:
- Assets = Liabilities + Equity
- Inventory accounts in Assets section
- AR in Assets section
- AP in Liabilities section

### Test 6.3: Profit & Loss

**Location**: `/dashboard/accounts/profit-loss`

**Steps**:
1. Navigate to P&L page
2. Select date range
3. View report

**Verification**:
- Sales Revenue in Income section
- COGS in Expense section
- Net Profit = Income - Expenses

### Test 6.4: Accounts Receivable Summary

**Location**: `/dashboard/accounts/accounts-receivable`

**Verification**:
- Client list shows correct balances
- Aging buckets correct
- Total AR matches Trial Balance

### Test 6.5: Accounts Payable Summary

**Location**: `/dashboard/accounts/accounts-payable`

**Verification**:
- Supplier list shows correct balances
- Aging buckets correct
- Total AP matches Trial Balance

---

## Phase 7: Permissions Verification

### Test 7.1: Test Without Permissions

**Steps**:
1. Create test user without accounts permissions
2. Login as test user
3. Attempt to:
   - Create voucher → Should fail with permission error
   - Post voucher → Should fail with permission error
   - View Trial Balance → Should fail or show empty

**Expected**: All actions blocked

### Test 7.2: Test With Permissions

**Steps**:
1. Grant test user accounts permissions
2. Login as test user
3. Attempt same actions

**Expected**: All actions succeed

---

## SQL Verification Queries

Run these queries in your database to verify accounting entries:

### Check all vouchers created today:
```sql
SELECT v."voucherNumber", v.type, v.status, v."reference", 
       p."purchaseNumber", po.code, s."saleNumber"
FROM "Voucher" v
LEFT JOIN "Purchase" p ON p."voucherId" = v.id
LEFT JOIN "ProductionOrder" po ON po."voucherId" = v.id
LEFT JOIN "Sale" s ON s."voucherId" = v.id
WHERE v."createdAt" >= CURRENT_DATE
ORDER BY v."createdAt" DESC;
```

### Verify double-entry for all vouchers:
```sql
SELECT v."voucherNumber", 
       SUM(jel."debitAmount") as total_debit,
       SUM(jel."creditAmount") as total_credit,
       ABS(SUM(jel."debitAmount") - SUM(jel."creditAmount")) as difference
FROM "Voucher" v
JOIN "JournalEntry" je ON je."voucherId" = v.id
JOIN "JournalEntryLine" jel ON jel."journalEntryId" = je.id
WHERE v.status = 'posted'
GROUP BY v.id, v."voucherNumber"
HAVING ABS(SUM(jel."debitAmount") - SUM(jel."creditAmount")) > 0.01;
-- Should return 0 rows (all vouchers balanced)
```

### Check account balances:
```sql
SELECT coa.code, coa.name, 
       SUM(jel."debitAmount") as total_debit,
       SUM(jel."creditAmount") as total_credit,
       SUM(jel."debitAmount") - SUM(jel."creditAmount") as balance
FROM "ChartOfAccount" coa
LEFT JOIN "JournalEntryLine" jel ON jel."chartOfAccountId" = coa.id
LEFT JOIN "JournalEntry" je ON je.id = jel."journalEntryId"
WHERE coa.code IN ('1620', '1630', '1640', '1410', '2110', '4110', '5110')
AND (je.id IS NULL OR je.status = 'posted')
GROUP BY coa.id, coa.code, coa.name
ORDER BY coa.code;
```

---

## Automated Test Script

Run the automated test script to verify system state:

```bash
npx tsx scripts/test-accounts-system.ts
```

This script checks:
- Chart of Accounts existence
- Permission templates
- Existing vouchers and their balances
- Account balances
- Transaction safety (code review)

---

## Success Criteria

After completing all tests:

- [ ] All required accounts exist
- [ ] Purchase vouchers auto-created and posted
- [ ] Production vouchers auto-created and posted
- [ ] Sales vouchers auto-created and posted
- [ ] All vouchers balanced (Debits = Credits)
- [ ] Stock updated correctly
- [ ] Reports show correct balances
- [ ] Permissions enforced
- [ ] All operations use transactions
- [ ] Activity logs recorded

---

## Troubleshooting

### Voucher not created on purchase receipt
- Check: Purchase status is RECEIVED
- Check: Items have itemId and costPrice
- Check: Control accounts exist
- Check: Server logs for errors

### Journal entries not balanced
- Check: Voucher lines validation
- Check: Decimal precision
- Check: All lines created

### Stock not updated
- Check: Items have trackInventory = true
- Check: Warehouse exists
- Check: Stock update function called

### Reports show incorrect balances
- Check: Reports use JournalEntryLine (not VoucherLine)
- Check: Date filtering correct
- Check: Account grouping correct
