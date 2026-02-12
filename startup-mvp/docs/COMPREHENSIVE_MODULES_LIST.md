
# COMPREHENSIVE MODULES LIST

**Generated Date**: 2026-02-11
**Source**: Codebase Analysis (Prisma Schema, File Structure, Permission Definitions)

This document provides a complete inventory of all functional modules within the system, mapping their logical definitions to underlying database models and application routes.

---

## 1. DASHBOARD
**Description**: The central landing page providing an overview of system metrics.
- **Route**: `/dashboard`
- **Prisma Models**: None (Aggregates data from other models)
- **Sub-modules**:
    - **Overview**: Standard dashboard view.

---

## 2. INVENTORY MANAGEMENT (Items)
**Description**: Core module for managing products, services, and their classifications.
- **Base Route**: `/dashboard/items`
- **Prisma Models**: `Item`, `Category`, `Unit`, `ModuleGroup`, `ModuleGroupItem`, `ItemCategory`, `InventoryTransaction`

### Sub-Modules:
| Sub-Module | Route | Description | Key Models |
| :--- | :--- | :--- | :--- |
| **Items** | `/dashboard/items` | Main product/service catalog. | `Item` |
| **Groups** | `/dashboard/items/groups` | Groupings for composite items/modules. | `ModuleGroup` |
| **Categories** | `/dashboard/items/category` | Hierarchical categorization of items. | `Category` |
| **Units** | `/dashboard/items/units` | Measurement units (e.g., pcs, kg). | `Unit` |

---

## 3. SALES & ORDER MANAGEMENT (Quotations)
**Description**: Manages the entire sales lifecycle from estimation to invoicing.
- **Base Route**: `/dashboard/quotations`
- **Prisma Models**: `Quotation`, `QuotationItem`, `Order`, `Invoice`, `WorkOrder`, `Section`, `ItemGroup`, `CategoryGroup`

### Sub-Modules:
| Sub-Module | Route | Description | Key Models |
| :--- | :--- | :--- | :--- |
| **Quotations** | `/dashboard/quotations` | Create and manage price estimates/proposals. | `Quotation` |
| **Invoices** | `/dashboard/quotations/invoices` | Tax invoices generated from orders/quotations. | `Invoice` |
| **Orders** | `/dashboard/orders` | Confirmed sales orders. | `Order` |

---

## 4. PROCUREMENT (Purchases)
**Description**: Manages outgoing purchase orders to suppliers.
- **Base Route**: `/dashboard/purchases`
- **Prisma Models**: `Purchase`, `PurchaseItem`

### Sub-Modules:
| Sub-Module | Route | Description | Key Models |
| :--- | :--- | :--- | :--- |
| **Purchases** | `/dashboard/purchases` | Manage supplier purchase orders and receipts. | `Purchase` |

---

## 5. FINANCIAL ACCOUNTING (Accounts)
**Description**: A full double-entry accounting system integrated with Sales and Purchase modules.
- **Base Route**: `/dashboard/accounts`
- **Prisma Models**: `Account`, `ChartOfAccount`, `JournalEntry`, `JournalEntryLine`, `Voucher`, `VoucherLine`, `CashBankAccount`

### Sub-Modules:
| Sub-Module | Route | Description | Key Models |
| :--- | :--- | :--- | :--- |
| **Chart of Accounts** | `.../chart-of-accounts` | Master list of all GL accounts. | `ChartOfAccount` |
| **Ledgers** | `.../ledgers` | Detailed transaction history per account. | `JournalEntry` |
| **Vouchers** | `.../vouchers` | Entry point for manual journals (Contra, Payment, etc.). | `Voucher` |
| **Trial Balance** | `.../trial-balance` | Report: Closing balances of all accounts. | (Derived) |
| **Balance Sheet** | `.../balance-sheet` | Report: Assets, Liabilities, Equity. | (Derived) |
| **Profit & Loss** | `.../profit-loss` | Report: Revenue vs Expenses. | (Derived) |
| **Cash & Bank** | `.../cash-bank` | Management of cash and bank specific accounts. | `CashBankAccount` |
| **AR / AP** | `.../accounts-receivable` | Accounts Receivable & Payable aging/tracking. | (Derived) |
| **Project Ledger** | `.../project-ledger` | Job/Project specific financial tracking. | (Derived) |

---

## 6. STAKEHOLDER MANAGEMENT (Peoples)
**Description**: Central directory for all human and organizational entities interacting with the system.
- **Base Route**: `/dashboard` (Split across multiple paths)
- **Prisma Models**: `User`, `Client`, `Supplier`, `Employee`

### Sub-Modules:
| Sub-Module | Route | Description | Key Models |
| :--- | :--- | :--- | :--- |
| **Users** | `/dashboard/users` | System administrators and operators. | `User` |
| **Clients** | `/dashboard/clients` | Customers (CRM entities). | `Client` |
| **Suppliers** | `/dashboard/suppliers` | Vendors and material providers. | `Supplier` |
| **Employees** | `/dashboard/employees` | Internal staff members. | `Employee` |

---

## 7. FILE MANAGEMENT (Files)
**Description**: Centralized digital asset management.
- **Base Route**: `/dashboard/files`
- **Prisma Models**: `File`

---

## 8. NOTIFICATIONS
**Description**: System Alerts and user notifications.
- **Base Route**: `/dashboard/notifications`
- **Prisma Models**: `Notification`

---

## 9. ANALYTICS & REPORTS
**Description**: High-level business intelligence and reporting.
- **Base Route**: `/dashboard/analytics`, `/dashboard/reports`
- **Prisma Models**: None (Aggregates data)

---

## 10. SYSTEM ADMINISTRATION (Settings)
**Description**: Configuration of system behaviors and permissions.
- **Base Route**: `/admin/settings`
- **Prisma Models**: `Settings`, `PermissionTemplate`, `UserPermission`, `CoverLetter`

### Key Settings Categories:
- **Organization**: Company profile settings.
- **Access Control**: Roles (`PermissionTemplate`) and Permissions.
- **Automation**: Email/SMS configurations.
- **Backup**: Database backup management.

---

## TECHNICAL MODULE SUMMARY

| Module ID | DB Tables | Frontend Route | Status |
| :--- | :--- | :--- | :--- |
| `items` | 7 | `/dashboard/items/*` | Active |
| `quotations` | 8 | `/dashboard/quotations/*` | Active |
| `purchases` | 2 | `/dashboard/purchases` | Active |
| `accounts` | 7 | `/dashboard/accounts/*` | Active; Complex |
| `peoples` | 4 | `/dashboard/[clients,users...]` | Active |
| `files` | 1 | `/dashboard/files` | Active |
| `notifications` | 1 | `/dashboard/notifications` | Active |
| `settings` | 4 | `/admin/settings` | Active |
| `crm` | 0 | `/dashboard/crm` | **INACTIVE / ZOMBIE** (See Audit Report) |

