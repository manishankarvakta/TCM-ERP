# Sales vs. Sales Return Architecture & Workflow Guide

## 1. Overview & Architecture

The **Sales** and **Sales Return** modules in **ffERP** provide an integrated dual-cycle framework. While Sales handle outward product billing, revenue recognition, and receivable creation, Sales Returns process reverse-cycle operations: inventory restocking, revenue/COGS reversal, and customer credit or cash refund payouts.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 1. SALES CYCLE                                  │
│  Billing ➔ Stock OUT ➔ Revenue Recognized ➔ AR Debited ➔ Cash Received (RECEIPT)│
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              2. SALES RETURN CYCLE                              │
│  Return ➔ Stock IN ➔ Revenue Reversed ➔ AR Credited ➔ Refund Paid (PAYMENT)     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Master Comparison Matrix

| Architectural Feature / Dimension | 🛒 Sales Module (`createSale`) | 🔄 Sales Return Module (`processSaleReturn`) |
| :--- | :--- | :--- |
| **Document Number Prefix** | `SAL-YYYY-XXXX` | `RET-YYYY-XXXX` |
| **Transaction Purpose** | Outward product billing & revenue creation | Product return, restock & refund processing |
| **Order Type Enum** | `RETAIL` or `WHOLESALE` | `RETURN` |
| **Status Enum** | `COMPLETED` | `COMPLETED` |
| **Quantity Representation** | Positive quantities (`+N`, e.g., `+2`) | Negative quantities (`-N`, e.g., `-2`) |
| **Grand Total & Subtotal** | Positive (e.g., `+৳11,080.00`) | Negative (e.g., `-৳2,500.00`) |
| **Stock Ledger Movement** | **`OUT`** (Outward Reduction) | **`IN`** (Inward Restock) |
| **Warehouse Stock Quantity** | Decremented (`Quantity = Quantity - N`) | Incremented (`Quantity = Quantity + N`) |
| **Primary Accounting Voucher** | **`VoucherType.SALES`** | **`VoucherType.RETURN`** |
| **Secondary Payment Voucher** | **`VoucherType.RECEIPT`** | **`VoucherType.PAYMENT`** (Refund Payout) |
| **Accounts Receivable (`AR`)** | **Debited** (Establishes customer debt) | **Credited** (Reduces customer debt) |
| **Sales Revenue Account** | **Credited** (Recognizes revenue) | **Debited** (Reduces revenue / Sales return) |
| **Cost of Goods Sold (`COGS`)** | **Debited** (Recognizes cost expense) | **Credited** (Reduces cost expense) |
| **Inventory Asset Account** | **Credited** (Reduces physical asset) | **Debited** (Restocks physical asset) |
| **Cash / Bank Asset Account** | **Debited** (Cash received into register) | **Credited** (Refund paid out to customer) |
| **Primary Server Action** | `createSale(input)` | `processSaleReturn(saleId, returnItems)` |
| **Accounting Generator** | `createSaleAccountingVoucher(id)` (`isReturn = false`) | `createSaleAccountingVoucher(id)` (`isReturn = true`) |

---

## 3. User Interface (UI) & Interaction Layer

### A. Sales Terminal UI (`POSComponent.tsx`)
- **Catalog Search**: Real-time product search with global `Esc` key focus shortcut and auto-focus after item or variant addition.
- **Mode Toggle**: Switches between **RETAIL** and **WHOLESALE** pricing modes.
- **Confirm Checkout Modal**:
  - Split payment tenders (`CASH`, `CARD`, `MFS`).
  - Real-time calculation of **Change Returned**, **Remaining Current Invoice Due**, **Previous Customer Due**, and **Total Due**.

### B. Sales Return UI (`POSComponent.tsx`)
- **Fixed Height Container**: Modal constrained to `h-[85vh] max-h-[85vh] overflow-y-auto`.
- **Mode Tabs**:
  1. **Invoice Return**: Search past sales by invoice number or customer.
  2. **Void Return**: Direct return search displaying item code `[Code: XXX]` and active warehouse stock `(Stock: N)`.
- **Validation Guardrails**:
  - Mode mismatch checking between active POS mode and invoice order type (`RETAIL` vs `WHOLESALE`), displaying interactive error banners (`FaExchangeAlt`, `FaExclamationTriangle`).
  - Default input quantity set to `0` to prevent accidental instant returns.

---

## 4. Operations & Pricing Engine

### A. Sales Pricing Mechanics
- Unit price resolved from tier:
  $$\text{Unit Price} = \begin{cases} \text{Wholesale Price} & \text{if } \text{WHOLESALE} \\ \text{Retail / Sales Price} & \text{if } \text{RETAIL} \end{cases}$$
- Deducts Item Discounts, Customer Membership Tier Discounts, and Coupon Discounts.

### B. Sales Return Mechanics
- Uses the historical unit price from the original sale invoice.
- **Max Returnable Quantity Formula**:
  $$\text{Already Returned Qty} = \sum \text{Previous Return Quantities}$$
  $$\text{Remaining Returnable Qty} = \max(0, \text{Original Invoice Billed Qty} - \text{Already Returned Qty})$$
- Rejects return entries exceeding `Remaining Returnable Qty`.

---

## 5. Stock Ledger & Inventory Movements

### A. Sales Transaction (`OUT`)
1. **Stock Table Update**:
   ```sql
   UPDATE "Stock" SET "quantity" = "quantity" - N WHERE "itemId" = X AND "warehouseId" = Y;
   ```
2. **Stock Ledger Entry**:
   - `movementType`: `OUT`
   - `quantity`: `N`
   - `reference`: `SAL-YYYY-XXXX`

### B. Sales Return Transaction (`IN`)
1. **Stock Table Update**:
   ```sql
   UPDATE "Stock" SET "quantity" = "quantity" + N WHERE "itemId" = X AND "warehouseId" = Y;
   ```
2. **Stock Ledger Entry**:
   - `movementType`: `IN`
   - `quantity`: `N`
   - `reference`: `RET-YYYY-XXXX`
   - `notes`: `"Return for sale SAL-YYYY-XXXX"` (or `"Standalone Void Return"`)

---

## 6. Double-Entry Accounting & Financial Vouchers

### A. Sales Vouchers (`isReturn = false`)

#### 1. Primary Invoice Voucher (`VoucherType.SALES`)
- **Debit**: `Accounts Receivable` (`clientId`) ➔ **Full Grand Total**
- **Credit**: `Sales Revenue & Tax Account` ➔ **Subtotal + Tax**
- **Debit**: `Cost of Goods Sold (COGS)` ➔ **Cost of Goods**
- **Credit**: `Finished Goods Inventory` ➔ **Cost of Goods** *(Reduces physical asset)*

#### 2. Immediate Receipt Voucher (`VoucherType.RECEIPT`)
- **Debit**: `Cash / Bank / Wallet Accounts` ➔ **Scaled Initial Paid Amount**
- **Credit**: `Accounts Receivable` (`clientId`) ➔ **Scaled Initial Paid Amount**

---

### B. Sales Return Vouchers (`isReturn = true`)

#### 1. Primary Return Voucher (`VoucherType.RETURN`)
- **Credit**: `Accounts Receivable` (`clientId`) ➔ **Return Amount** *(Reduces customer debt)*
- **Debit**: `Sales Revenue / Sales Return` Account ➔ **Return Amount** *(Reduces gross revenue)*
- **Credit**: `Cost of Goods Sold (COGS)` ➔ **Returned Items Cost** *(Reduces expense)*
- **Debit**: `Finished Goods Inventory` ➔ **Returned Items Cost** *(Restocks physical asset)*

#### 2. Immediate Refund Payout Voucher (`VoucherType.PAYMENT`)
- **Debit**: `Accounts Receivable` (`clientId`) ➔ **Refund Cash Payout**
- **Credit**: `Cash / Bank / Wallet Accounts` ➔ **Refund Cash Payout** *(Cash leaves register)*

---

## 7. Backend Execution Workflow

```
               ┌─────────────────────────────────────────┐
               │              CLIENT REQUEST             │
               └────────────────────┬────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────┐                         ┌───────────────────────┐
│     createSale()      │                         │  processSaleReturn()  │
└──────────┬────────────┘                         └──────────┬────────────┘
           │                                                 │
           ├─ Generate SAL-YYYY-XXXX                         ├─ Generate RET-YYYY-XXXX
           ├─ Validate negative sale settings                ├─ Fetch past return history
           ├─ Deduct Warehouse Stock (OUT)                   ├─ Validate max returnable qty
           ├─ Create Sale (Qty: +N)                          ├─ Restock Warehouse Stock (IN)
           │                                                 ├─ Create Sale (Qty: -N)
           ▼                                                 │
┌────────────────────────────────────────────────────────┐   │
│            createSaleAccountingVoucher()               │◀──┘
│  - isReturn=false ➔ SALES Voucher + RECEIPT Voucher    │
│  - isReturn=true  ➔ RETURN Voucher + PAYMENT Voucher   │
└────────────────────────────────────────────────────────┘
```
