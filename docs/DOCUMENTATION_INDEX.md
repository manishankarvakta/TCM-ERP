# 🗂️ Complete TCM-ERP Documentation Sitemap & Index

This index contains a complete listing of all project documentation files located within the [`docs/`](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs) directory hierarchy.

---

## 🛠️ 1. Deployment & Server Infrastructure (`docs/deployment/`)

| Document Name | Description |
|---|---|
| [DOKPLOY_DEPLOYMENT_GUIDE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/DOKPLOY_DEPLOYMENT_GUIDE.md) | Primary production deployment guide using Dokploy |
| [DOKPLOY_SETUP.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/DOKPLOY_SETUP.md) | Technical setup details for Dokploy infrastructure |
| [DOCKER_SETUP.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/DOCKER_SETUP.md) | Standalone Docker and Docker Compose environment setup |
| [DEPLOYMENT_GUIDE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/DEPLOYMENT_GUIDE.md) | General application deployment guide |
| [ENV_SETUP.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/ENV_SETUP.md) | Environment configuration reference |
| [DATA_LOSS_PREVENTION_GUIDE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/DATA_LOSS_PREVENTION_GUIDE.md) | Database & volume persistence safety practices |
| [DATA_PERSISTENCE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/DATA_PERSISTENCE.md) | Volume bind mounts and persistence strategy |
| [CRITICAL_DATA_LOSS_FIX.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/CRITICAL_DATA_LOSS_FIX.md) | Data protection and volume fix details |
| [POSTGRES_TROUBLESHOOTING.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/POSTGRES_TROUBLESHOOTING.md) | PostgreSQL container troubleshooting & corruption fixes |
| [BACKUP_DEPLOYMENT.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/deployment/BACKUP_DEPLOYMENT.md) | Backup strategy deployment guide |

---

## 📦 2. Business Modules (`docs/modules/`)

### 💰 Accounts & Finance (`docs/modules/accounts/`)
- [ACCOUNTS_MODULE_DOCUMENTATION.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/accounts/ACCOUNTS_MODULE_DOCUMENTATION.md) - Financial module overview & features
- [ACCOUNTS_DEVELOPER_DOCUMENTATION.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/accounts/ACCOUNTS_DEVELOPER_DOCUMENTATION.md) - Technical developer specifications for Accounts
- [ACCOUNTS_MODULE_USER_MANUAL.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/accounts/ACCOUNTS_MODULE_USER_MANUAL.md) - User guide & accounting workflow manual
- [ACCOUNT_SEEDING_GUIDE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/accounts/ACCOUNT_SEEDING_GUIDE.md) - Chart of accounts initial seed guide
- [CUSTOMER_SUPPLIER_COA_ANALYSIS.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/accounts/CUSTOMER_SUPPLIER_COA_ANALYSIS.md) - Customer & Supplier ledger analysis

### 👥 HR, Payroll & Attendance (`docs/modules/payroll_hrm/`)
- [HR_PAYROLL_POLICY_SYSTEM_FINAL_GUIDE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/payroll_hrm/HR_PAYROLL_POLICY_SYSTEM_FINAL_GUIDE.md) - Comprehensive HR & Payroll Policy specification
- [Comprehensive_HR_and_Payroll_System_Report.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/payroll_hrm/Comprehensive_HR_and_Payroll_System_Report.md) - Full HR & Payroll module evaluation
- [Attendance_Module_Deep_Dive_Report.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/payroll_hrm/Attendance_Module_Deep_Dive_Report.md) - Attendance engine technical report
- [adms_cloud_sync_reference.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/payroll_hrm/adms_cloud_sync_reference.md) - Biometric device ADMS cloud integration reference

### 🏷️ Inventory & Master Data (`docs/modules/inventory/`)
- [WAREHOUSE_MODULE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/inventory/WAREHOUSE_MODULE.md) - Multi-warehouse storage implementation
- [ITEM_MASTER.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/inventory/ITEM_MASTER.md) - Product catalog & SKU management
- [CATEGORY_MODULE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/inventory/CATEGORY_MODULE.md) - Product categorization & taxonomy
- [UNIT_MODULE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/inventory/UNIT_MODULE.md) - Measurement units & conversions

### 🛒 Sales, POS & Returns (`docs/modules/sales/`)
- [SALES_MODULE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/sales/SALES_MODULE.md) - Core sales order & invoicing specification
- [SALES_RETURN_ENGINE_SYSTEM_DOCUMENTATION.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/sales/SALES_RETURN_ENGINE_SYSTEM_DOCUMENTATION.md) - Sales returns processing engine
- [POS_SESSION_DRAFT_AUTO_SAVE_DEV_DOCS.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/sales/POS_SESSION_DRAFT_AUTO_SAVE_DEV_DOCS.md) - POS session state auto-recovery

### 📥 Purchase & Procurement (`docs/modules/purchase/`)
- [PURCHASE_MODULE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/purchase/PURCHASE_MODULE.md) - Purchase order & supplier receiving workflows
- [stock_and_accounts_flow.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/purchase/stock_and_accounts_flow.md) - Procurement to inventory ledger integration

### 🏭 Production & BOM (`docs/modules/production/`)
- [PRODUCTION_MODULE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/production/PRODUCTION_MODULE.md) - Production batch processing & assembly
- [BOM_MODULE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/production/BOM_MODULE.md) - Bill of Materials structure & cost calculation
- [FOOD_PRODUCTION_DOMAIN_MODEL.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/modules/production/FOOD_PRODUCTION_DOMAIN_MODEL.md) - Food production domain rules

---

## ⚡ 3. Technical Architecture & System Features (`docs/technical/`)

- [PRISMA_WORKFLOW.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/technical/PRISMA_WORKFLOW.md) - Prisma ORM database migrations & workflow
- [USER_PERMISSION_SYSTEM.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/technical/USER_PERMISSION_SYSTEM.md) - RBAC permission enforcement rules
- [BACKUP_SYSTEM.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/technical/BACKUP_SYSTEM.md) - Database backup & encryption specification
- [FILE_MANAGER_SYSTEM.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/technical/FILE_MANAGER_SYSTEM.md) - Local & cloud file attachment manager
- [NOTIFICATION_SYSTEM.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/technical/NOTIFICATION_SYSTEM.md) - System notification architecture

---

## 📊 4. Reports & System Summaries (`docs/reports_and_summaries/`)

- [CURRENT_APPLICATION_STATUS.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/reports_and_summaries/CURRENT_APPLICATION_STATUS.md) - Current status of application features
- [COMPLETE_SYSTEM_ARCHITECTURE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/reports_and_summaries/COMPLETE_SYSTEM_ARCHITECTURE.md) - High-level system architecture blueprint
- [CODEBASE_ANALYSIS_REPORT.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/reports_and_summaries/CODEBASE_ANALYSIS_REPORT.md) - Code quality and structural analysis

---

## 📖 5. Manuals (`docs/manuals/`)

- [setup.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/manuals/setup.md) - Initial project installation & dev environment setup
- [QUICK_REFERENCE.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/manuals/QUICK_REFERENCE.md) - Common commands & development cheat sheet
- [CONTRIBUTING.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/manuals/CONTRIBUTING.md) - Project contribution guidelines
- [CHANGELOG.md](file:///Users/manishankarvakta/Desktop/APPS/TCM-ERP/docs/manuals/CHANGELOG.md) - Release history & version changelog
