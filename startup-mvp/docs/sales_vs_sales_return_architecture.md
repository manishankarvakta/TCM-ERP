# Sales vs. Sales Return vs. Exchange Architecture & Workflow Guide

## 1. Overview & Architecture

The **Sales**, **Sales Return**, and **Exchange** modules in **ffERP** provide an integrated 3-cycle framework. While Sales handle outward product billing and Sales Returns process reverse-cycle restocks and refunds, **Sales Exchange (`EXCHANGE`)** combines both cycles into a single unified transaction.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                  1. SALES CYCLE                                   │
│  Billing ➔ Stock OUT ➔ Revenue Recognized ➔ AR Debited ➔ Cash Received (RECEIPT)  │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                               2. SALES RETURN CYCLE                               │
│  Return ➔ Stock IN ➔ Revenue Reversed ➔ AR Credited ➔ Refund Paid (PAYMENT)       │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                3. EXCHANGE CYCLE                                  │
│  Dual Stock (IN/OUT) ➔ Net Revenue Adj ➔ Net AR/Cash Adj (RECEIPT or PAYMENT)    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Master 3-Way Comparison Matrix

| Architectural Feature / Dimension | 🛒 Sales Module (`createSale`) | 🔄 Sales Return Module (`processSaleReturn`) | 🔁 Exchange Module (`processSaleExchange`) |
| :--- | :--- | :--- | :--- |
| **Document Number Prefix** | `SAL-YYYY-XXXX` | `RET-YYYY-XXXX` | `EXC-YYYY-XXXX` |
| **Transaction Purpose** | Outward product billing | Product return & refund | Simultaneous return & new purchase |
| **Order Type Enum** | `RETAIL` or `WHOLESALE` | `RETURN` | `EXCHANGE` |
| **Status Enum** | `COMPLETED` | `COMPLETED` | `COMPLETED` |
| **Quantity Representation** | Positive (`+N`) | Negative (`-N`) | Mixed (`+N` new items, `-N` return items) |
| **Grand Total Formula** | $\sum \text{Items Price}$ | $-\sum \text{Return Items Price}$ | $\sum \text{New Items} - \sum \text{Returned Items}$ |
| **Net Price Result** | **Positive** | **Negative** | **Net Difference** (Positive, 0, or Negative) |
| **Customer Payout Scenarios** | Customer pays 100% | Business refunds 100% | 1. Customer pays diff<br>2. Net ৳0.00<br>3. Business refunds diff |
| **Stock Ledger Movement** | **`OUT`** (Inventory Reduction) | **`IN`** (Inventory Restock) | **Dual `IN` & `OUT`** (Per line item type) |
| **Warehouse Stock Impact** | Decremented (`Qty - N`) | Incremented (`Qty + N`) | Restocked for returned lines, decremented for new lines |
| **Primary Voucher Type** | `VoucherType.SALES` | `VoucherType.RETURN` | `VoucherType.SALES` / `EXCHANGE` |
| **Secondary Payment Voucher** | `VoucherType.RECEIPT` | `VoucherType.PAYMENT` | `RECEIPT` (if diff > 0) or `PAYMENT` (if diff < 0) |
| **Accounts Receivable (`AR`)** | Debited for Grand Total | Credited for Return Amount | Debited/Credited for Net Difference |
| **Sales Revenue Account** | Credited for Total Sales | Debited for Return Amount | Credited for Net Revenue Difference |
| **Cost of Goods Sold (`COGS`)** | Debited for Cost | Credited for Returned Cost | Net COGS Adjustment |
| **Inventory Asset Account** | Credited for Cost | Debited for Restocked Cost | Restocked for returned items, reduced for new items |
| **Primary Server Action** | `createSale(input)` | `processSaleReturn(...)` | `processSaleExchange(...)` |
| **Accounting Generator** | `createSaleAccountingVoucher()` | `createSaleAccountingVoucher()` | `createSaleAccountingVoucher()` |

---

## 3. User Interface (UI) & Interaction Layer

### A. Sales Terminal UI (`POSComponent.tsx`)
- **Catalog Search**: Real-time product search with global `Esc` key focus shortcut and auto-focus after item or variant addition.
- **Mode Toggle**: Switches between **RETAIL** and **WHOLESALE** pricing modes.
- **Confirm Checkout Modal**:
  - Split payment tenders (`CASH`, `CARD`, `MFS`).
  - Real-time calculation of **Change Returned**, **Remaining Current Invoice Due**, **Previous Customer Due**, and **Total Due**.

### B. Exchange Terminal UI (`POSComponent.tsx`)
- **Split Cart Display**:
  - 🔴 **Returned Items Section** (`isReturnItem: true`, red badge `-[Qty 1]`).
  - 🟢 **New Items Section** (`isReturnItem: false`, green badge `+[Qty 1]`).
- **Live Net Exchange Summary Card**:
  - Displays Returned Total, New Purchase Total, Net Balance, and 1 of 3 status badges (Customer Pays Diff / Even Exchange / Refund Due).

---

## 4. Operations & Pricing Engine

### A. Sales Pricing Mechanics
- Unit price resolved from tier:
  $$\text{Unit Price} = \begin{cases} \text{Wholesale Price} & \text{if } \text{WHOLESALE} \\ \text{Retail / Sales Price} & \text{if } \text{RETAIL} \end{cases}$$

### B. Exchange Mechanics
- Returned items are priced based on original invoice rate or current retail rate.
- New purchase items are priced based on active retail/wholesale tier.
- Net Exchange Amount is calculated as $\text{New Subtotal} - \text{Returned Subtotal}$.

---

## 5. Stock Ledger & Inventory Movements

### A. Dual Stock Movements for Exchange
For a single Exchange invoice `EXC-YYYY-XXXX`:
1. **Returned Lines (`IN`)**:
   ```sql
   UPDATE "Stock" SET "quantity" = "quantity" + N WHERE "itemId" = X AND "warehouseId" = Y;
   ```
2. **New Purchase Lines (`OUT`)**:
   ```sql
   UPDATE "Stock" SET "quantity" = "quantity" - N WHERE "itemId" = X AND "warehouseId" = Y;
   ```

---

## 6. Double-Entry Accounting & Financial Vouchers

Generating a unified `VoucherType.SALES` / `EXCHANGE` voucher:
- **Debit**: `Finished Goods Inventory` (Restocks cost of returned items)
- **Credit**: `Cost of Goods Sold (COGS)` (Reverses COGS of returned items)
- **Debit**: `Cost of Goods Sold (COGS)` (Recognizes COGS of new items)
- **Credit**: `Finished Goods Inventory` (Deducts asset cost of new items)
- **Debit/Credit**: `Accounts Receivable` / `Cash` (For the net price difference)
