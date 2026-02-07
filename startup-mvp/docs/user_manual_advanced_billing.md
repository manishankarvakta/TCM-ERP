# User Manual: Advanced Billing Flow (Quotation to Receipt)

This manual guides you through the end-to-end process of selling goods/services, from the initial quotation to final payment settlement, following the Advanced Billing logic.

## 1. Flow Overview

The Advanced Billing Flow decouples revenue recognition from Order Creation. Revenue is only recognized when an **Invoice** is posted.

**Standard Workflow:**
1.  **Quotation**: Create and negotiate with customer.
2.  **Order**: Created automatically when Quotation is Accepted. (No Financial Impact yet).
3.  **Advance Receipt**: Receive advance payment (Liability).
4.  **Delivery**: Ship goods/services (Inventory update, no Revenue yet).
5.  **Invoice**: Bill the customer (Revenue Recognition).
6.  **Settlement**: Apply Advance or Receive Payment against Invoice.

---

## 2. Step-by-Step Instructions

### Step 1: Create Quotation
**Role:** Sales Officer / Admin
1.  Navigate to **Quotations** -> **Create New**.
2.  Select Client, add Items (Products/Services), set prices.
3.  Save as **Draft**.
4.  Send to Customer or Mark as **Reference/Sent**.

### Step 2: Accept Quotation & Create Order
**Role:** Sales Manager / Admin
1.  Open the specific Quotation.
2.  Change Status to **ACCEPTED**.
    *   *System Action*: This automatically creates a linked **Order**.
    *   *Check*: Verify the "Order Created" notification or link in the Quotation view.
    *   **Financial Impact**: None. Revenue is deferred.

### Step 3: Receive Advance Payment
**Role:** Accounts
> **Note**: UI Integration for this step is pending. Currently requires backend action or General Receipt Voucher.
*   **Action**: Record receipt of money (e.g., 500,000) from Customer.
*   **System Effect**:
    *   **Debit**: Cash/Bank (Asset)
    *   **Credit**: Customer Advance (Liability)
*   **Status Check**: Order Financial Summary will show "Advance Received".

### Step 4: Partial/Full Delivery
**Role:** Store Manager / Operations
1.  Navigate to **Orders** -> Open the Order.
2.  Go to **Delivery Schedule** tab.
3.  Click **Create Delivery**.
4.  Select items to deliver and enter quantities (e.g., delivered 6 items out of 10).
5.  **Post** the delivery.
    *   *System Action*: Updates Inventory (Deduced stock) and Delivery Ledger.
    *   **Financial Impact**: None (COGS/Inventory movement is recorded if configured, but Sales Revenue is not).
    *   *Status Check*: "Delivered Value" increases in Financial Summary.

### Step 5: Invoicing (Revenue Recognition)
**Role:** Accounts
1.  Navigate to **Orders** -> Open the Order.
2.  Go to **Invoices** tab.
3.  Click **Create Invoice**.
4.  Select items that have been delivered (Billable Qty). You cannot invoice more than delivered.
5.  **Post** the Invoice.
    *   **System Effect**:
        *   **Debit**: Accounts Receivable (Asset)
        *   **Credit**: Sales Revenue (Income)
        *   *Optional*: COGS/Inventory rebalancing if not done at delivery.
    *   **Financial Impact**: Revenue is now officially recognized on the Income Statement.
    *   *Status Check*: "Invoiced Value" increases. "Outstanding Due" increases.

### Step 6: Apply Advance / Settlement
**Role:** Accounts
> **Note**: UI Integration for this step is pending.
*   **Action**: Apply the previously received Advance (Liability) against the new Invoice (AR).
*   **System Effect**:
    *   **Debit**: Customer Advance (Liability) - *Reduces liability*
    *   **Credit**: Accounts Receivable (Asset) - *Reduces amount customer owes*
*   **Financial Impact**: None on P&L. Balance Sheet reclassification.
*   *Status Check*: "Outstanding Due" decreases. "Advance Applied" increases.

---

## 3. Financial Transaction Checks

To verify the system is working correctly, you can check the **Financial Summary** on the Order Page.

| Stage | Revenue | AR (Due) | Advance Liab. | Delivered Val |
| :--- | :--- | :--- | :--- | :--- |
| **1. Order Created** | 0 | 0 | 0 | 0 |
| **2. Advance Rx** | 0 | 0 | +500k | 0 |
| **3. Delivery** | 0 | 0 | +500k | +600k |
| **4. Invoice** | +600k | +600k | +500k | +600k |
| **5. Apply Adv** | +600k | +100k | 0 | +600k |

## 4. Troubleshooting
-   **Cannot Create Invoice?** Ensure you have posted a **Delivery** first. Invoicing is restricted to delivered items only.
-   **Revenue showing early?** Ensure legacy `createSalesVoucherForQuotation` is disabled (Verified as disabled).

