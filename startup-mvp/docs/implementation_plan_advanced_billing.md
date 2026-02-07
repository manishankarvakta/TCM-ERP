# Implementation Plan - Advanced Billing & Project Reporting

This plan transitions the system from "Quotation-based Revenue" to "Invoice-based Revenue" (Advanced Billing) and enables Project-wise financial reporting.

## User Review Required
> [!IMPORTANT]
> **Breaking Change**: This will disable increased revenue recognition immediately upon Quotation Acceptance. Revenue will ONLY be recognized when an **Invoice** is posted.
> **Action**: Existing "Accepted" quotations with no invoices will effectively show 0 revenue in new reports until invoiced.

## Proposed Changes

### 1. Database & Seeding
#### [MODIFY] [seed-chart-of-accounts.ts](file:///Users/manishankarvakta/Desktop/APPS/espacio/startup-mvp/prisma/seed-chart-of-accounts.ts)
*   **Action**: Add "Customer Advance" (Liability) account.
    *   Code: `2150`
    *   Type: `LIABILITY`
    *   Parent: `2100` (Current Liabilities)
    *   Name: "Customer Advance"

### 2. Logic Adjustment (Disable Auto-Revenue)
#### [MODIFY] [quotations.ts](file:///Users/manishankarvakta/Desktop/APPS/espacio/startup-mvp/app/actions/quotations.ts)
*   **Action**: Locate lines ~1151 (call to `createSalesVoucherForQuotation`).
*   **Change**: Comment out or disable this call. This stops the double-counting of revenue.

### 3. New Features (Financial Actions)
#### [NEW] [advances.ts](file:///Users/manishankarvakta/Desktop/APPS/espacio/startup-mvp/app/actions/accounts/advances.ts)
*   **Action**: Implement `receiveOrderAdvance` server action.
*   **Logic**:
    *   Input: `orderId`, `amount`, `paymentAccountId` (Cash/Bank), `date`.
    *   Process: Create `RECEIPT` Voucher.
    *   Dr: Payment Account.
    *   Cr: Customer Advance (2150).
    *   Link: `orderId`, `clientId`.

#### [NEW] [project-reports.ts](file:///Users/manishankarvakta/Desktop/APPS/espacio/startup-mvp/app/actions/accounts/project-reports.ts)
*   **Action**: Implement `getClientProjectLedger` server action.
*   **Logic**:
    *   Input: `clientId`.
    *   Query: Group `Voucher` / `JournalEntryLine` by `orderId`.
    *   Output: List of Projects with `ContractValue`, `Invoiced`, `Paid`, `Due`.

## Verification Plan

### Automated Tests
*   Run the user's scenario:
    1.  Create Order (Status Check: Revenue = 0).
    2.  Receive Advance 500k (Status Check: Advance = 500k, Revenue = 0).
    3.  Deliver 600k (Status Check: Delivered = 600k).
    4.  Invoice 600k (Status Check: Revenue = 600k, Due = 600k).
    5.  Apply Advance 500k (Status Check: Due = 100k).

### Manual Verification
*   Check the "Client Project Ledger" report for the specific client to verify the project-wise breakdown matches the table above.
