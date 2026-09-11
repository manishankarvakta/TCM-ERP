# 🧾 07. Invoices & Collections Management Guide

The **Invoices & Collections** module handles customer sales invoicing, invoice status tracking, money receipt generation, and customer payment allocations.

---

## 📍 Navigation & Sitemap

| Submodule Name | Path / Route | Core Function |
| :--- | :--- | :--- |
| **Invoices List** | `/dashboard/accounts/invoices` | Sales invoice dashboard, status filter, payment status. |
| **Invoice Details** | `/dashboard/accounts/invoices/[id]` | Invoice breakdown, line items, taxes, linked customer payments. |
| **Collections** | `/dashboard/accounts/collections` | Customer payment receipts, collection entry, and AR ledger allocation. |

---

## 📝 Form Field Details: Invoicing & Billing

| Field Name | Component | Required | Description |
| :--- | :--- | :--- | :--- |
| **Client / Customer** | Searchable Select | **Yes** | Client receiving the invoice (links to Accounts Receivable). |
| **Invoice Date** | Date Picker | **Yes** | Date invoice is issued. |
| **Due Date** | Date Picker | **Yes** | Payment due date (calculates AR aging status). |
| **Line Items** | Dynamic Table | **Yes** | Service/product description, quantity, unit price, tax rate, discount. |
| **Tax Rate (%)** | Numeric Input | Optional | Applicable VAT / Tax rate percentage. |
| **Payment Status** | Badge / Status | System | `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`. |

---

## 💵 Customer Collections & Money Receipts

When a customer pays an invoice:
1. Navigate to `/dashboard/accounts/collections` or `/dashboard/accounts/vouchers/receipt/add`.
2. Select **Client** and **Payment Mode** (`CASH`, `BANK`, `MFS`).
3. Select **Deposit Account** (e.g. `1210 Bank Primary Account` or `1310 bKash Wallet`).
4. Enter **Receipt Amount** and allocate against unpaid invoice(s).
5. **Accounting Journal Entry**:
   * **Debit**: Cash / Bank / MFS Account ($\uparrow \text{Asset}$)
   * **Credit**: Accounts Receivable / Client GL Account ($\downarrow \text{AR Asset}$)
