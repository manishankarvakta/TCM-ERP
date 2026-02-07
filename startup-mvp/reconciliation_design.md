# Reconciliation Test Design

## 1. Inventory Ledger Qty vs Stock Table
**Goal**: Verify that the sum of all inventory transactions matches the current stock quantity in the `Item` table.

- **Source A (Stock)**: `Item.quantity`
- **Source B (Ledger)**: Sum of `InventoryTransaction.quantity` grouped by `itemId`.
- **Logic**: 
  - Fetch all Items.
  - Fetch logical sum from transactions.
  - `Item.quantity == Sum(Transactions)`
- **Failure Indicator**: Discrepancy implies manual update of stock without recording a transaction logic gap.

## 2. Inventory Ledger Value vs GL Inventory Balance
**Goal**: Verify that the total value of physical inventory matches the General Ledger "Inventory Asset" balance.

- **Source A (GL)**: Balance of `ChartOfAccount` where `name = "Inventory Asset"`.
  - Balance = `Sum(Debit) - Sum(Credit)` from `JournalEntryLine` linked to this account.
- **Source B (Valuation)**: Sum of `(Item.quantity * Item.costPrice)` for all items.
- **Logic**:
  - `GL Balance == Sum(Item Value)`
- **Failure Indicator**: 
  - Discrepancy implies GL posted without stock update, or stock updated (cost/qty) without GL adjustment.
  - Note: Rounding errors may exist; tolerance of small amounts (e.g. < 1.00) might be needed.

## 3. AP Aging vs Supplier Balances
**Goal**: Verify that the AP Control Account balance equals the sum of individual Supplier balances.

- **Source A (GL Control)**: Balance of "Accounts Payable" account.
  - Balance = `Sum(Credit) - Sum(Debit)`
- **Source B (Sub-Ledger)**: Sum of balances from `JournalEntryLine` grouped by `supplierId`, filtered by AP account.
  - Per Supplier Balance = `Sum(Credit) - Sum(Debit)`
- **Logic**:
  - `GL Control Balance == Sum(Supplier Sub-Balances)`
- **Failure Indicator**:
  - Entries posted to AP account without a `supplierId`.
  - Manual journal entries affecting AP without proper sub-ledger assignment.

## 4. AR Aging vs Customer Balances
**Goal**: Verify that the AR Control Account balance equals the sum of individual Client balances.

- **Source A (GL Control)**: Balance of "Accounts Receivable" account.
  - Balance = `Sum(Debit) - Sum(Credit)`
- **Source B (Sub-Ledger)**: Sum of balances from `JournalEntryLine` grouped by `clientId`, filtered by AR account.
  - Per Client Balance = `Sum(Debit) - Sum(Credit)`
- **Logic**:
  - `GL Control Balance == Sum(Client Sub-Balances)`
- **Failure Indicator**:
  - Entries posted to AR account without a `clientId`.

## 5. Cash/Bank GL vs Payment Vouchers (CashBook)
**Goal**: Verify validity of Cash/Bank balances against `CashBankAccount` separate model.

- **Source A (GL)**: Balance of `ChartOfAccount` linked to a `CashBankAccount`.
  - Balance = `Sum(Debit) - Sum(Credit)`
- **Source B (CashBook)**: `CashBankAccount.balance` field.
- **Logic**:
  - `GL Balance == CashBook Balance`
- **Failure Indicator**:
  - Direct GL manipulation without updating the distinct `CashBankAccount` entity (or vice versa).
