# User Manual: Sales Returns, Credits, and Accounting Ledger

This user manual describes the operations, workflows, and accounting behavior for processing sales returns, handling customer discounts, and understanding customer statements in the ERP.

---

## 1. How to Process a Sales Return in the POS

To return items from a previous sale:
1.  Navigate to the **Sales List** page or open the **POS** screen.
2.  Locate the completed sale invoice (e.g. `SAL-2026-0093`) and click **Return / Void**.
3.  In the return pop-up modal:
    *   Select the warehouse where the returned items are being restocked.
    *   Specify the quantity of each item being returned. The system will prevent you from returning more than the remaining returnable quantity.
4.  Click **Process Invoice Return**.

---

## 2. Refund Payout Rules: Cash Refund vs. Credit Note

The system automatically detects whether a return should result in a physical cash refund or a reduction of the client's outstanding debt (Credit Note) by analyzing the original invoice:

### Case A: Unpaid (Due/Credit) Sales
If the customer has **not yet paid** for the original sale:
*   **System Action**: The system issues a **Credit Note** (Voucher type: `RETURN`).
*   **Result**: The returned value is credited directly to the client's Accounts Receivable (AR) balance, reducing their outstanding dues.
*   **No Cash Payout**: No cash register or bank payout voucher is generated. The customer does **not** receive cash.

### Case B: Paid Sales (Cash/Card/Digital Wallet)
If the customer **paid cash/card** at checkout:
*   **System Action**: The system issues two vouchers:
    1.  A **Sales Return Invoice** (Voucher type: `RETURN`) to record the return.
    2.  A **Refund Payment** (Voucher type: `PAYMENT`) to represent the cash drawer payout.
*   **Result**: The returned value is handed back to the customer in cash, and their outstanding AR balance remains unaffected (nets to 0).

---

## 3. Understanding Client Ledger Statements

When auditing a client's statement (located under `/dashboard/clients/ledger?id=[client_id]`), the timeline displays exactly how client balances change.

### How the Ledger is Kept Clean
To prevent statement pollution, the ledger **only** displays lines directly impacting the client's Accounts Receivable (AR) balance. Internal accounts like *Sales Revenue*, *Cost of Goods Sold (COGS)*, *Inventory Asset*, and *Sales Discounts* are filtered out.

### Sample Statement Timeline (Cash Sale & Cash Return)

| Date | Transaction Ref | Voucher Type | Description | Debit (Dr) | Credit (Cr) | Running Balance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-07-28 | `SAL-2026-0093` | `SALES` | Accounts Receivable (Sale Debit) | ৳3,200.00 | — | **+৳3,200.00** |
| 2026-07-28 | `RET-2026-0007` | `RETURN` | Sales Return (Credit AR) | — | ৳3,200.00 | **৳0.00** |
| 2026-07-28 | `RET-2026-0007` | `PAYMENT` | Refund for Sales Return (Debit AR) | ৳3,200.00 | — | **+৳3,200.00** |

*Note: In the timeline above, the customer still owes ৳3,200.00 because they received a physical cash refund for the return. If it were a return of a due sale, there would be no `PAYMENT` line, leaving the final balance at ৳0.00.*

---

## 4. Handling Change Returned and Over-receipt Guards

*   **Cash Input Rule**: Cashiers can type the raw amount of cash handed by the customer (e.g. entering ৳3,250 cash for a ৳3,200 total to calculate ৳50 change).
*   **Proportional Scaling**: The system automatically scales down the recorded cash receipt to match the net grand total of the sale. This prevents the database's `Over-receipt Guard` from blocking checkout while ensuring receipt vouchers post correctly.

---

## 5. Frequently Asked Questions (FAQ)

#### Q: The client returned items, but they are still showing an outstanding balance. Why?
**A**: Check if a cash refund (`PAYMENT` voucher) was processed. If the client received cash back for their return instead of store credit, their outstanding debt remains due.

#### Q: Why is my dashboard's Top Customer widget count different from the client ledger?
**A**: The Top Customer widget and Sales Trend reports exclude return transactions to prevent metrics from being skewed. The client ledger, however, displays all accounts receivable actions including returns and refunds.
