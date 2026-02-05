# Analysis: Advanced Billing & Delivery Flow Implementation

## 1. System Capability Verification

We have analyzed the documented scenario against the current system codebase.

| Step | User Requirement | Current System State | Gap / Action Required |
| :--- | :--- | :--- | :--- |
| **1. Order Creation** | `Quotation` → `Order`. **No Revenue**. | **Conflict**: Current `quotation-accounting-integration.ts` *automatically* creates a `SALES` voucher (Revenue) when Quotation is Accepted. | ❌ **CRITICAL**: Must disable auto-voucher creation on Quotation Acceptance. Only `createOrder` should run. |
| **2. Advance Receipt** | Receipt of 5,00,000. DR Bank / CR Customer Advance. | **Partial Table**: `Voucher` model supports this. `applyAdvanceToInvoice` exists in `invoices.ts`. | ⚠️ **Missing Account**: "Customer Advance" (Liability) account is missing in `seed-chart-of-accounts.ts`. Needs code `2150`.<br>⚠️ **Missing Action**: Need a specific `createAdvanceReceipt` server action. |
| **3. Partial Delivery** | Deliver 6,00,000. No financial entry. Update Delivered Qty. | **Ready**: `actions/deliveries.ts` -> `postDelivery` handles exactly this. It updates ledger and inventory but *does not* touch financial journals. | ✅ **Supported**: No changes needed. |
| **4. Invoice** | Invoice 6,00,000. DR AR / CR Revenue. | **Ready**: `actions/invoices.ts` -> `postInvoice` handles exactly this. It creates `SALES` voucher debiting AR and crediting Sales. | ✅ **Supported**: Validation logic exists to ensure Invoice Qty <= Delivered Qty. |
| **5. Apply Advance** | DR Customer Advance / CR AR. | **Ready**: `actions/invoices.ts` -> `applyAdvanceToInvoice` exists! It implements exactly this logic (DR Advance, CR AR). | ✅ **Supported**: Logic is already written. |

## 2. Implementation Roadmap

To achieve the "Clean Flow" you requested without major refactoring, we need to execute these specific updates:

### Step 2.1: Add "Customer Advance" Account
**File**: `prisma/seed-chart-of-accounts.ts`
*   Add new liability account:
    *   Code: `2150`
    *   Name: "Customer Advance"
    *   Type: `LIABILITY`
    *   Parent: `2100` (Current Liabilities)

### Step 2.2: Disable Auto-Revenue on Quotation
**File**: `app/actions/quotations.ts` (or wherever `updateStatus` is)
*   User is effectively switching model from "Quotation-based Revenue" to "Invoice-based Revenue".
*   We must **comment out or remove** the call to `createSalesVoucherForQuotation` inside the Quotation Acceptance workflow.
*   Only `createOrderFromQuotation` should run.

### Step 2.3: Implement "Receive Advance" Action
**File**: `app/actions/accounts/advances.ts` (New File)
*   Action: `receiveOrderAdvance(orderId: string, amount: number, accountId: string)`
*   Logic:
    1.  Create `RECEIPT` Voucher.
    2.  Line 1: DR Cash/Bank (`accountId`).
    3.  Line 2: CR "Customer Advance" (`2150`).
    4.  Link Voucher to `Order`.

## 3. Recommended Workflow for User

Once the above changes are made:
1.  **Quotation Accepted** -> System creates **Order** only. (Revenue = 0).
2.  **User records Advance** -> Uses new "Receive Advance" form. (Liability = +500k).
3.  **Delivery Team** -> Posts Partial Delivery of 600k. (Inventory moves, delivered value updates).
4.  **Finance Team** -> Creates Invoice for 600k (Draft).
5.  **Finance Team** -> Posts Invoice. (Revenue = +600k, AR = +600k).
6.  **Finance Team** -> Clicks "Apply Advance" on Invoice. (Liability = -500k, AR = -500k).
    *   **Final AR**: 100k.

This aligns 100% with your requested flow.
