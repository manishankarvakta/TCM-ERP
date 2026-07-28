# ERP & Production Management System - Comprehensive Testing Checklist Analysis

We have analyzed the full application database models and routing pages. Below is the mapping of modules and operations, followed by instructions on how to use the generated CSV file.

The CSV file has been created in two locations:
1. Docs: [full_app_testing_checklist.csv](file:///Users/manishankarvakta/Desktop/APPS/ffERP/docs/test/full_app_testing_checklist.csv)
2. Chat Artifacts: [full_app_testing_checklist.csv](file:///Users/manishankarvakta/.gemini/antigravity/brain/401d0171-28c3-4618-98d9-356caa38604d/full_app_testing_checklist.csv)

---

## 1. Application Module Map

The application consists of the following key modules and database entities:

### 🔑 Authentication & Authorization
* **Routes**: `/dashboard/settings/permissions/templates`, `/dashboard/settings/permissions/users/[id]`
* **Models**: `User`, `Session`, `VerificationToken`, `PasswordReset`, `PermissionTemplate`, `UserPermission`, `ModuleOperation`
* **Core Operations**: User Authentication, Page Access Security, Role-Based Access Control (RBAC).

### 🏷️ Master Data
* **Routes**: `/dashboard/master/items`, `/dashboard/master/categories`, `/dashboard/master/brands`, `/dashboard/master/units`, `/dashboard/master/warehouses`
* **Models**: `Item`, `Category`, `Brand`, `Unit`, `Warehouse`, `Season`, `Collection`, `Fabric`, `ProductVariant`
* **Core Operations**: Create/Edit Items, Categorization, Brand Management, Multi-Warehouse setups, Unit of Measurement (UOM) configurations.

### 💰 Accounts (Double-Entry General Ledger)
* **Routes**: `/dashboard/accounts/chart-of-accounts`, `/dashboard/accounts/vouchers`, `/dashboard/accounts/balance-sheet`, `/dashboard/accounts/profit-loss`, `/dashboard/accounts/trial-balance`, `/dashboard/accounts/ledgers`
* **Models**: `ChartOfAccount`, `Account`, `Voucher`, `VoucherLine`, `JournalEntry`, `JournalEntryLine`, `AccountingPeriod`
* **Core Operations**: Chart of Accounts mapping, Journal Voucher postings, Cash/Bank Ledger tracking, Trial Balance, P&L, Balance Sheet generation.

### 👥 Contacts (Clients & Suppliers)
* **Routes**: `/dashboard/clients`, `/dashboard/suppliers`, `/dashboard/clients/ledger`, `/dashboard/suppliers/ledger`
* **Models**: `Client`, `ClientAddress`, `ClientItemDiscount`, `Supplier`
* **Core Operations**: Contact directories, Credit terms, Account Ledgers tracking.

### 👔 HR & Payroll
* **Routes**: `/dashboard/employees`, `/dashboard/hr/attendance`, `/dashboard/hr/biometric`, `/dashboard/hr/shifts`, `/dashboard/hr/leave`, `/dashboard/hr/loans`, `/dashboard/hr/payroll`
* **Models**: `Employee`, `Shift`, `Holiday`, `LeaveType`, `EmployeeType`, `Department`, `LeaveApplication`, `Resignation`, `AttendanceLog`, `Attendance`, `Overtime`, `EmployeeLoan`, `EmployeeSalary`, `Payroll`, `PayrollItem`, `EmployeeFine`, `EmployeeBonus`
* **Core Operations**: Roster Rostering, Shift Policies, Biometric Device Integration (syncing raw logs, employee mapping), Leave Approvings, Loans processing, Payroll computations, and Payslip prints.

### 📦 Inventory
* **Routes**: `/dashboard/inventory/stock`, `/dashboard/inventory/adjustments`, `/dashboard/inventory/count`, `/dashboard/inventory/damage`
* **Models**: `Stock`, `StockLedger`, `InventoryAdjustment`, `InventoryAdjustmentItem`, `InventoryDamage`, `InventoryDamageItem`, `InventoryCountEntry`
* **Core Operations**: Real-time stock levels, Inventory Count reconciliations, Damage logging, Adjustment audits.

### 🛒 Procurement
* **Routes**: `/dashboard/procurements/purchases`, `/dashboard/procurements/grn`, `/dashboard/procurements/rtv`, `/dashboard/procurements/tpn`
* **Models**: `Purchase`, `PurchaseItem`, `GRN`, `GRNItem`, `ReturnToVendor` (RTV), `ReturnToVendorItem`, `TransferPurchaseNote` (TPN)
* **Core Operations**: Purchase orders, Goods Receiving, Supplier Returns (RTV), Fabric notes (TPN).

### ⚙️ Production (Garment Manufacturing)
* **Routes**: `/dashboard/production/boms`, `/dashboard/production/orders`, `/dashboard/production/cutting`, `/dashboard/production/sewing`, `/dashboard/production/quality`
* **Models**: `BOM`, `BOMItem`, `ProductionOrder`, `GarmentProductionStage`, `CuttingJob`, `SewingLineTrack`, `WashingJob`, `CMTCostBreakdown`, `IndustrialEngineeringBreakdown`, `GarmentOperation`, `FabricRoll`, `CuttingJobFabricRoll`, `ProductionBundle`, `RFIDBundleScan`
* **Core Operations**: Bill of Materials recipes, CMT costings, Fabric Roll allocations, Cutting and Sewing tracking, Bundle tracking, Quality Control.

### 💳 Sales & POS
* **Routes**: `/dashboard/sales`, `/dashboard/sales/pos`, `/dashboard/sales/ecommerce`, `/dashboard/sales/coupons`
* **Models**: `Sale`, `SaleItem`, `Coupon`
* **Core Operations**: Sales invoicing, Coupons processing, POS interface (Cash register opening, closing, cash drawer reconciliation), E-commerce syncs.

### 📊 Reports
* **Routes**: `/dashboard/reports/sales/...`, `/dashboard/reports/inventory/...`, `/dashboard/reports/production/...`, `/dashboard/reports/analytics`
* **Core Operations**: Revenue analysis, Stock ledgers, Cost per production batch calculations.

---

## 📈 How to Set Up Checkboxes in Google Sheets / Excel

The generated CSV contains a `Select` column set to `FALSE` by default. This makes it easy to convert into checkable boxes:

### In Google Sheets:
1. Open [Google Sheets](https://sheets.google.com).
2. Go to **File > Import > Upload** and choose the CSV file.
3. Select the first column (**Column A**, "Select") from Row 2 down to the last row.
4. Click on the top menu: **Insert > Checkbox**.
5. *Google Sheets will automatically bind the checkbox to the `TRUE`/`FALSE` states in that column!* Checking a box changes its value to `TRUE`.

### In Microsoft Excel:
1. Open the CSV file in Excel.
2. Select **Column A** (excluding the header row).
3. Go to the **Developer** tab (enable it in Excel options if not visible).
4. Click **Insert > Check Box (Form Control)**, or format cells using the conditional formatting / checkbox toggle tool depending on your Excel version.

---

## 📝 Checklist Summary Table

Below is a preview of the tests structured in the CSV:

| Test ID | Module | Sub-Module | Operation | Description |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ATH-001** | Dashboard | Authentication | User Login | Log in with valid credentials; verify landing page redirection. |
| **TC-ATH-002** | Dashboard | Authentication | Authorization | Verify that unauthorized pages throw access-denied warnings. |
| **TC-MST-001** | Master Data | Items | Create Item | Add a new garment product and confirm database record. |
| **TC-ACC-001** | Accounts | Chart of Accounts | Add Account | Insert a new GL ledger under assets/liabilities. |
| **TC-ACC-003** | Accounts | Vouchers | Contra Voucher | Transfer cash to bank; confirm reciprocal ledger movements. |
| **TC-ACC-007** | Accounts | Vouchers | Double Entry Check | Attempt unequal debits/credits; confirm rejection. |
| **TC-HRP-003** | HR & Payroll | Biometric | Sync Logs | Fetch biometric log entries and verify employee maps. |
| **TC-HRP-008** | HR & Payroll | Payroll | Generate Payroll | Process salary and loans for a department. |
| **TC-PRO-002** | Procurements | GRN | Receive Goods | Create GRN against purchase order; check inventory levels. |
| **TC-PRD-001** | Production | BOM | Create BOM | Create recipe of fabric and trim quantities for a styling unit. |
| **TC-SAL-003** | Sales & POS | POS | Drawer Reconciliation | Open register, sell goods, close register, reconcile cash. |
| **TC-SET-003** | Settings | Backups | Encrypted Backups | Back up databases/files with GCM encryption and test restore. |

For the full list of 63 detailed test scenarios, open the [full_app_testing_checklist.csv](file:///Users/manishankarvakta/Desktop/APPS/ffERP/docs/test/full_app_testing_checklist.csv) file.
