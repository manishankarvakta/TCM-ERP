# 🏢 06. Fixed Assets Management Guide

The **Fixed Assets Management** module tracks long-term physical assets owned by the business (property, equipment, vehicles, IT hardware, furniture), records capital expenditures, manages monthly depreciation schedules, and handles asset disposals and transfers.

---

## 📍 Navigation & Submodule Sitemap

| Submodule Name | Path / Route | Core Function |
| :--- | :--- | :--- |
| **Fixed Assets Hub** | `/dashboard/accounts/fixed-assets` | Overview of all fixed asset accounts, total cost, net book values, accumulated depreciation. |
| **Asset Items** | `/dashboard/accounts/fixed-assets/items` | Registering individual physical assets (e.g. *MacBook Pro M4*, *Office Workstations*). |
| **Capitalization** | `/dashboard/accounts/fixed-assets/capitalization` | Recording capital expenditure vouchers (Debit: Asset Account, Credit: Cash/Bank/Payable). |
| **Depreciation** | `/dashboard/accounts/fixed-assets/depreciation` | Calculating and posting straight-line or declining balance monthly depreciation vouchers. |
| **Disposals** | `/dashboard/accounts/fixed-assets/disposals` | Asset retirement, sale, or write-off with Gain/Loss on Disposal recognition. |
| **Transfers** | `/dashboard/accounts/fixed-assets/transfers` | Transferring asset custody across departments, branches, or team members. |

---

## 🏗️ Fixed Asset Account Coding (`1700` Series)

Fixed assets reside under `1700 Fixed Assets` in the Chart of Accounts:

| Code | Account Name | Account Type | Description |
| :--- | :--- | :--- | :--- |
| **`1700`** | **Fixed Assets** | `ASSET` (Parent) | Parent header folder for all fixed assets. |
| **`1710`** | Furniture & Fixtures | `ASSET` | Desks, chairs, conference tables, shelving. |
| **`1720`** | Office Equipment | `ASSET` | Servers, networking hardware, printers, AV gear. |
| **`1730`** | Vehicles | `ASSET` | Company delivery vans, vehicles. |
| **`1741`** | IT Hardware & Laptops | `ASSET` | MacBooks, workstation PCs, laptops. |
| **`1790`** | **Accumulated Depreciation** | `ASSET` (Contra) | Contra-asset account recording cumulative depreciation (Credit balance). |

---

## 📝 Form Field Details

### 1. Create Fixed Asset Account / Item Form

| Field Name | Component | Required | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Asset Code** | Text Input | **Yes** | Alphanumeric (e.g. `1741`) | Unique GL account code under `1700` series. |
| **Asset Name** | Text Input | **Yes** | String (2–100 chars) | Descriptive asset title (e.g. *MacBook Pro M4 Black*). |
| **Category / Parent** | Select | **Yes** | Parent COA ID | Parent asset category (auto-defaults to `1700 Fixed Assets`). |
| **Description** | Textarea | Optional | String | Model number, serial number, warranty details, or specs. |

---

### 2. Capitalization Entry Form (Asset Purchase & In-Service)

| Field Name | Component | Required | Description |
| :--- | :--- | :--- | :--- |
| **Asset Account** | Searchable Select | **Yes** | Target Fixed Asset GL Account (e.g. `1741 MacBook Pro`). |
| **Payment / Funding Account** | Searchable Select | **Yes** | Funding source account (e.g. `1210 Primary Bank`, `2110 Accounts Payable`, `3110 Owner's Capital`). |
| **Capitalization Amount** | Numeric Input | **Yes** | Total purchase cost including installation & shipping ($\ge 0$). |
| **Capitalization Date** | Date Picker | **Yes** | Date asset was acquired and placed in service. |
| **Reference / PO #** | Text Input | Optional | Invoice number, PO number, or receipt reference. |

**Accounting Journal Entry Generated**:
* **Debit**: Fixed Asset Account (e.g. `1741 MacBook Pro`) $\rightarrow +\text{Assets}$
* **Credit**: Funding Account (e.g. `1210 Bank Account` / `3110 Capital`) $\rightarrow -\text{Cash / Equity}$

---

### 3. Monthly Depreciation Entry Form

| Field Name | Component | Required | Description |
| :--- | :--- | :--- | :--- |
| **Fixed Asset Account** | Select | **Yes** | Asset account being depreciated. |
| **Expense Account** | Select | **Yes** | Depreciation Expense GL Account (e.g. `6000 Operating Expenses`). |
| **Accumulated Depr Account** | Select | **Yes** | Target Contra-Asset Account (e.g. `1790 Accumulated Depreciation`). |
| **Depreciation Amount** | Numeric Input | **Yes** | Monthly depreciation charge ($\ge 0$). |
| **Posting Date** | Date Picker | **Yes** | End of month posting date (e.g. `2026-09-30`). |

**Accounting Journal Entry Generated**:
* **Debit**: Depreciation Expense (`6000`) $\rightarrow +\text{Expenses}$
* **Credit**: Accumulated Depreciation (`1790`) $\rightarrow -\text{Asset Net Book Value}$

---

## 📊 Net Book Value (NBV) Calculation

$$\mathbf{Net\ Book\ Value = Historical\ Cost - Accumulated\ Depreciation}$$

Example:
* **MacBook Pro Cost**: `$450,000.00`
* **Accumulated Depreciation**: `-$5,556.00`
* **Net Book Value on Balance Sheet**: **`$444,444.00`**

---

## 🛠️ Step-by-Step Workflows

### Registering and Capitalizing a New Asset
1. Go to `/dashboard/accounts/fixed-assets` and click **"+ Add Fixed Asset"**.
2. Enter Code: `1742`, Name: *Dell PowerEdge Server*.
3. Click **Save Account**.
4. Click **"Record Capitalization Entry"**.
5. Select Asset: `1742 Dell PowerEdge Server`.
6. Select Funding Account: `1210 Bank - Primary Account`.
7. Enter Amount: `$18,500.00`.
8. Click **Post Capitalization Voucher**.
