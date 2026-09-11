# 🏦 02. Cash & Bank Accounts Management Guide

The **Cash & Bank Accounts** module manages liquid asset accounts including physical cash tills, commercial bank accounts, and mobile financial service (MFS) digital wallets (e.g. bKash, Nagad, Rocket).

---

## 📍 Navigation
* **URL**: `/dashboard/accounts/cash-bank`
* **Sidebar**: `Finance` ➔ `Cash & Bank`

---

## 🏷️ Liquid Account Types

| Account Type | Enum Code | Target COA Parent Code | Description & Examples |
| :--- | :--- | :--- | :--- |
| **Cash on Hand** | `CASH` | `1110` (Cash on Hand) / `1120` (Petty Cash) | Physical cash registers, office petty cash boxes, vault cash. |
| **Bank Account** | `BANK` | `1200` (Bank Accounts) | Commercial bank checking, savings, and current accounts. |
| **MFS / Digital Wallet** | `MFS` | `1300` (Digital Wallets) | Mobile financial services (bKash Merchant, Nagad, Rocket Wallet). |

---

## 📝 Form Field Details: Create Cash/Bank Account Dialog

When registering a new cash or bank account, the user can choose to **Create New COA Account** or **Link Existing COA Account**:

| Field Name | Component Type | Required | Validation & Options | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Creation Mode** | Tab Selection | **Yes** | `Create New COA` / `Link Existing` | Determines whether to create a new GL account or link to an unlinked asset COA. |
| **Account Type** | Dropdown | **Yes** | `CASH`, `BANK`, `MFS` | Classifies liquid account behavior and auto-selects COA parent. |
| **Account Name** | Text Input | **Yes** | String (2–100 chars) | Title of the account (e.g. *Standard Chartered Corporate*). |
| **Account Code** | Text Input | Optional | Unique Alphanumeric | GL code. Auto-generated if left blank (e.g. `1020-6044`). |
| **Parent COA** | Searchable Select | Optional | Valid GL Account ID | Parent GL category. Auto-resolves to `1110` (Cash), `1200` (Bank), `1300` (MFS) if unassigned. |
| **Opening Balance** | Numeric Input | Optional | Positive Decimal ($\ge 0$) | Initial starting balance when introducing the account into the ERP. |
| **Description** | Textarea | Optional | String | Account details, bank branch name, routing number, or account numbers. |

---

## ⚡ Opening Balance Auto-Voucher Workflow

When an account is created with an **Opening Balance** $> 0$:
1. The system automatically creates a **Posted Receipt Voucher** (`VCH-OP-...`) and **Journal Entry** (`JE-OP-...`).
2. **Debit Line**: The newly created Cash/Bank/MFS Account ($\text{Debit} = \text{Opening Balance}$).
3. **Credit Line**: `3110 Owner's Capital` (or `3120 Retained Earnings`) ($\text{Credit} = \text{Opening Balance}$).
4. This ensures total ledger balance integrity from day one.

---

## 🛠️ Step-by-Step Workflows

### 1. Adding a New Bank Account
1. Navigate to `/dashboard/accounts/cash-bank`.
2. Click **"+ Add Cash/Bank Account"**.
3. Select Type: **BANK**.
4. Enter Account Name: *DBBL Operating Account*.
5. Enter Opening Balance (e.g. `$50,000.00`).
6. Click **Save & Create**.

### 2. Monitoring Real-Time Balances
1. The Cash & Bank dashboard displays total liquid assets divided by type (Cash vs Bank vs MFS).
2. Click **View Ledger** on any account card to inspect historical deposits and withdrawals.
