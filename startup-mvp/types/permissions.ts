// Permission system type definitions

// Module names
export type Module =
  | "dashboard"
  | "master"
  | "sales"
  | "accounts"
  | "peoples"
  | "files"
  | "notifications"
  | "reports"
  | "inventory"
  | "analytics"
  | "production"
  | "settings"
  | "hr"
  | "procurements";

// Basic operations
export type BasicOperation = "create" | "read" | "update" | "delete" | "export" | "import";

// Custom operations per module
export type CustomOperation =
  | "approve"
  | "send"
  | "duplicate"
  | "print"
  | "download"
  | "archive"
  | "restore"
  | "view"
  | "edit"
  | "manage"
  | "adjust"
  | "start"
  | "complete"
  | "cancel"
  | "view_scanner"
  | "view_entries"
  | "view_adjustment"
  | "view_sales_widget"
  | "view_inventory_widget"
  | "view_production_widget"
  | "view_accounts_widget"
  | "view_quick_actions_widget"
  | "view_recent_activity_widget"
  | "wholesale"
  | "sync"
  | "create-expense"
  | "create-deposit"
  | "create-payment"
  | "ledger";

// Standard operations for pages (as per requirements)
export type StandardOperation = "create" | "view" | "edit" | "move-to-trash" | "delete-permanently";

// Combined operation type (includes standard operations)
export type Operation = BasicOperation | CustomOperation | StandardOperation;

// Page permission structure with navigation, page access, and operations
export interface PagePermission {
  navigationVisible: boolean; // Show in sidebar navigation
  pageAccess: boolean; // Can access the page
  operations: Operation[]; // Available operations on the page
}

// New permission structure: permissionKey -> PagePermission
// Examples: "items.items" -> { navigationVisible: true, pageAccess: true, operations: ["create", "view"] }
export type EnhancedPermissions = Record<string, PagePermission>;

// Legacy permission structure: module or module.subModule -> operations array
// Examples: "items" -> ["create", "read"] or "items.groups" -> ["create", "read"]
export type Permissions = Record<string, Operation[]>;

// Partial permissions - supports both old and new formats for backward compatibility
export type PartialPermissions = Partial<Permissions> | Partial<EnhancedPermissions>;

// Sub-module identifier (e.g., "items.groups", "peoples.users")
export type SubModuleId = `${Module}.${string}` | Module;

// Permission template structure
export interface PermissionTemplateData {
  id: string;
  name: string;
  description?: string;
  permissions: PartialPermissions;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User permission override structure
export interface UserPermissionData {
  id: string;
  userId: string;
  module: Module;
  operations: Operation[];
  createdAt: Date;
  updatedAt: Date;
}

// Module operation definition
export interface ModuleOperationData {
  id: string;
  module: Module;
  operation: Operation;
  label: string;
  description?: string;
  isActive: boolean;
}

// Module metadata for UI
export interface ModuleMetadata {
  id: Module;
  label: string;
  description?: string;
  icon?: string;
  subModules?: SubModuleMetadata[];
}

export interface SubModuleMetadata {
  id: string; // Sub-module ID (e.g., "groups", "category")
  label: string;
  path: string;
  module: Module;
  permissionKey: string; // Full permission key (e.g., "items.groups")
}

// Operation metadata for UI
export interface OperationMetadata {
  id: Operation;
  label: string;
  description?: string;
  category: "basic" | "custom";
}

// Default modules configuration
export const MODULES: Record<Module, ModuleMetadata> = {
  dashboard: {
    id: "dashboard",
    label: "Dashboard",
    description: "Main dashboard overview",
  },
  master: {
    id: "master",
    label: "Master Data",
    description: "Manage categories and units",
    subModules: [
      { id: "items", label: "Items", path: "/dashboard/master/items", module: "master", permissionKey: "master.items" },
      { id: "categories", label: "Categories", path: "/dashboard/master/categories", module: "master", permissionKey: "master.categories" },
      { id: "brands", label: "Brands", path: "/dashboard/master/brands", module: "master", permissionKey: "master.brands" },
      { id: "units", label: "Units", path: "/dashboard/master/units", module: "master", permissionKey: "master.units" },
      { id: "warehouses", label: "Warehouses", path: "/dashboard/master/warehouses", module: "master", permissionKey: "master.warehouses" },
      { id: "import", label: "Data Import", path: "/dashboard/import", module: "master", permissionKey: "master.import" },
    ],
  },
  procurements: {
    id: "procurements",
    label: "Procurements",
    description: "Manage purchases, transfers, and returns",
    subModules: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard/procurements", module: "procurements", permissionKey: "procurements.dashboard" },
      { id: "purchases", label: "Purchases", path: "/dashboard/procurements/purchases", module: "procurements", permissionKey: "procurements.purchases" },
      { id: "grn", label: "Goods Receipt", path: "/dashboard/procurements/grn", module: "procurements", permissionKey: "procurements.grn" },
      { id: "tpn", label: "Transfer Notes", path: "/dashboard/procurements/tpn", module: "procurements", permissionKey: "procurements.tpn" },
      { id: "rtv", label: "Returns (RTV)", path: "/dashboard/procurements/rtv", module: "procurements", permissionKey: "procurements.rtv" },
    ],
  },
  sales: {
    id: "sales",
    label: "Sales",
    description: "Sales and point of sale",
    subModules: [
      { id: "sales", label: "Sales", path: "/dashboard/sales", module: "sales", permissionKey: "sales.sales" },
      { id: "pos", label: "POS", path: "/dashboard/sales/pos", module: "sales", permissionKey: "sales.pos" },
    ],
  },
  accounts: {
    id: "accounts",
    label: "Accounts",
    description: "Financial accounts and reporting",
    subModules: [
      { id: "chart-of-accounts", label: "Chart of Accounts", path: "/dashboard/accounts/chart-of-accounts", module: "accounts", permissionKey: "accounts.chart-of-accounts" },
      { id: "ledgers", label: "Ledgers", path: "/dashboard/accounts/ledgers", module: "accounts", permissionKey: "accounts.ledgers" },
      { id: "vouchers", label: "Vouchers", path: "/dashboard/accounts/vouchers", module: "accounts", permissionKey: "accounts.vouchers" },
      { id: "trial-balance", label: "Trial Balance", path: "/dashboard/accounts/trial-balance", module: "accounts", permissionKey: "accounts.trial-balance" },
      { id: "balance-sheet", label: "Balance Sheet", path: "/dashboard/accounts/balance-sheet", module: "accounts", permissionKey: "accounts.balance-sheet" },
      { id: "profit-loss", label: "Profit & Loss", path: "/dashboard/accounts/profit-loss", module: "accounts", permissionKey: "accounts.profit-loss" },
      { id: "cash-bank", label: "Cash & Bank", path: "/dashboard/accounts/cash-bank", module: "accounts", permissionKey: "accounts.cash-bank" },
      { id: "accounts-receivable", label: "Accounts Receivable", path: "/dashboard/accounts/accounts-receivable", module: "accounts", permissionKey: "accounts.accounts-receivable" },
      { id: "accounts-payable", label: "Accounts Payable", path: "/dashboard/accounts/accounts-payable", module: "accounts", permissionKey: "accounts.accounts-payable" },
    ],
  },
  peoples: {
    id: "peoples",
    label: "Peoples",
    description: "Manage users, clients, and suppliers",
    subModules: [
      { id: "users", label: "Users", path: "/dashboard/users", module: "peoples", permissionKey: "peoples.users" },
      { id: "clients", label: "Clients", path: "/dashboard/clients", module: "peoples", permissionKey: "peoples.clients" },
      { id: "suppliers", label: "Suppliers", path: "/dashboard/suppliers", module: "peoples", permissionKey: "peoples.suppliers" },
      { id: "employees", label: "Employees", path: "/dashboard/employees", module: "peoples", permissionKey: "peoples.employees" },
    ],
  },
  files: {
    id: "files",
    label: "Files",
    description: "File management",
  },
  hr: {
    id: "hr",
    label: "HR & Payroll",
    description: "Human resources, attendance, and payroll",
    subModules: [
      { id: "shifts", label: "Shifts", path: "/dashboard/hr/shifts", module: "hr", permissionKey: "hr.shifts" },
      { id: "holidays", label: "Holidays", path: "/dashboard/hr/holidays", module: "hr", permissionKey: "hr.holidays" },
      { id: "attendance", label: "Attendance", path: "/dashboard/hr/attendance", module: "hr", permissionKey: "hr.attendance" },
      { id: "leave", label: "Leave Applications", path: "/dashboard/hr/leave", module: "hr", permissionKey: "hr.leave" },
      { id: "resignation", label: "Resignation Applications", path: "/dashboard/hr/resignation", module: "hr", permissionKey: "hr.resignation" },
      { id: "payroll", label: "Payroll", path: "/dashboard/hr/payroll", module: "hr", permissionKey: "hr.payroll" },
      { id: "loans", label: "Loans", path: "/dashboard/hr/loans", module: "hr", permissionKey: "hr.loans" },
      { id: "fines", label: "Fines & Penalties", path: "/dashboard/hr/fines", module: "hr", permissionKey: "hr.fines" },
      { id: "bonuses", label: "Bonuses & Rewards", path: "/dashboard/hr/bonuses", module: "hr", permissionKey: "hr.bonuses" },
    ],
  },
  notifications: {
    id: "notifications",
    label: "Notifications",
    description: "System notifications",
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    description: "Analytics and reporting",
  },
  reports: {
    id: "reports",
    label: "Reports",
    description: "Generate and view reports",
    subModules: [
      { id: "reports", label: "Reports", path: "/dashboard/reports", module: "reports", permissionKey: "reports.view" },
      { id: "inventory-stock-summary", label: "Stock Summary", path: "/dashboard/reports/inventory/stock-summary", module: "reports", permissionKey: "reports.view" },
      { id: "inventory-stock-ledger", label: "Stock Ledger", path: "/dashboard/reports/inventory/stock-ledger", module: "reports", permissionKey: "reports.view" },

      { id: "inventory-raw-material-consumption", label: "Raw Material Consumption", path: "/dashboard/reports/inventory/raw-material-consumption", module: "reports", permissionKey: "reports.view" },
      { id: "production-order-summary", label: "Production Order Summary", path: "/dashboard/reports/production/production-order-summary", module: "reports", permissionKey: "reports.view" },
      { id: "production-cost-per-batch", label: "Cost Per Batch", path: "/dashboard/reports/production/cost-per-batch", module: "reports", permissionKey: "reports.view" },
      { id: "sales-revenue-by-client", label: "Revenue by Client", path: "/dashboard/reports/sales/revenue-by-client", module: "reports", permissionKey: "reports.view" },
      { id: "sales-revenue-by-item", label: "Revenue by Item", path: "/dashboard/reports/sales/revenue-by-item", module: "reports", permissionKey: "reports.view" },
      { id: "sales-trends", label: "Sales Trends", path: "/dashboard/reports/sales/sales-trends", module: "reports", permissionKey: "reports.view" },
      { id: "analytics", label: "Analytics", path: "/dashboard/reports/analytics", module: "reports", permissionKey: "reports.view" },
    ],
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    description: "Stock and inventory management",
    subModules: [
      { id: "stock", label: "Stock", path: "/dashboard/inventory/stock", module: "inventory", permissionKey: "inventory.stock" },
      { id: "adjustments", label: "Adjustments", path: "/dashboard/inventory/adjustments", module: "inventory", permissionKey: "inventory.adjustments" },
      { id: "damage", label: "Damage", path: "/dashboard/inventory/damage", module: "inventory", permissionKey: "inventory.damage" },
      { id: "count-scanner", label: "Count Scanner", path: "/dashboard/inventory/count", module: "inventory", permissionKey: "inventory.count.scanner" },
      { id: "count-entries", label: "All Count Entries", path: "/dashboard/inventory/count/entries", module: "inventory", permissionKey: "inventory.count.entries" },
      { id: "count-adjustment", label: "Auto Adjustment", path: "/dashboard/inventory/count/adjustment", module: "inventory", permissionKey: "inventory.count.adjustment" },
      { id: "inventory-stock-movements", label: "Stock Movements", path: "/dashboard/reports/inventory/stock-movements", module: "inventory", permissionKey: "inventory.stock-movements" },
    ],
  },
  production: {
    id: "production",
    label: "Production",
    description: "Production and manufacturing",
    subModules: [
      { id: "boms", label: "Bill of Materials", path: "/dashboard/production/boms", module: "production", permissionKey: "production.boms" },
      { id: "orders", label: "Production Orders", path: "/dashboard/production/orders", module: "production", permissionKey: "production.orders" },
      { id: "cutting", label: "Cutting Room", path: "/dashboard/production/cutting", module: "production", permissionKey: "production.orders" },
      { id: "sewing", label: "Sewing Tracker", path: "/dashboard/production/sewing", module: "production", permissionKey: "production.orders" },
      { id: "quality", label: "Quality Check", path: "/dashboard/production/quality", module: "production", permissionKey: "production.orders" },
    ],
  },
  settings: {
    id: "settings",
    label: "Settings",
    description: "Application settings and preferences",
    subModules: [
      { id: "accounts", label: "Accounts", path: "/dashboard/settings/accounts", module: "settings", permissionKey: "settings.accounts" },
      { id: "accounts-default", label: "Accounts Default", path: "/dashboard/settings/accounts?section=default", module: "settings", permissionKey: "settings.accounts.default" },
      { id: "tax", label: "Tax", path: "/dashboard/settings/accounts?section=tax", module: "settings", permissionKey: "settings.accounts.tax" },
      { id: "payment-methods", label: "Payment Methods", path: "/dashboard/settings/accounts?section=payment-methods", module: "settings", permissionKey: "settings.accounts.payment-methods" },
      { id: "preferences", label: "Preferences", path: "/dashboard/settings?section=preferences", module: "settings", permissionKey: "settings.preferences" },
    ],
  },
};

// Default operations configuration
export const OPERATIONS: Record<Operation, OperationMetadata> = {
  // Basic operations
  create: {
    id: "create",
    label: "Create",
    description: "Create new records",
    category: "basic",
  },
  read: {
    id: "read",
    label: "Read",
    description: "View and list records",
    category: "basic",
  },
  update: {
    id: "update",
    label: "Update",
    description: "Edit existing records",
    category: "basic",
  },
  delete: {
    id: "delete",
    label: "Delete",
    description: "Delete records",
    category: "basic",
  },
  export: {
    id: "export",
    label: "Export",
    description: "Export data",
    category: "basic",
  },
  import: {
    id: "import",
    label: "Import",
    description: "Import data",
    category: "basic",
  },
  // Custom operations
  approve: {
    id: "approve",
    label: "Approve",
    description: "Approve records",
    category: "custom",
  },
  send: {
    id: "send",
    label: "Send",
    description: "Send records",
    category: "custom",
  },
  duplicate: {
    id: "duplicate",
    label: "Duplicate",
    description: "Duplicate records",
    category: "custom",
  },
  print: {
    id: "print",
    label: "Print",
    description: "Print records",
    category: "custom",
  },
  download: {
    id: "download",
    label: "Download",
    description: "Download files",
    category: "custom",
  },
  archive: {
    id: "archive",
    label: "Archive",
    description: "Archive records",
    category: "custom",
  },
  restore: {
    id: "restore",
    label: "Restore",
    description: "Restore archived records",
    category: "custom",
  },
  view: {
    id: "view",
    label: "View",
    description: "View details",
    category: "custom",
  },
  edit: {
    id: "edit",
    label: "Edit",
    description: "Edit records",
    category: "custom",
  },
  manage: {
    id: "manage",
    label: "Manage",
    description: "Full management access",
    category: "custom",
  },
  "move-to-trash": {
    id: "move-to-trash",
    label: "Move to Trash",
    description: "Move records to trash (soft delete)",
    category: "custom",
  },
  "delete-permanently": {
    id: "delete-permanently",
    label: "Delete Permanently",
    description: "Permanently delete records",
    category: "custom",
  },
  adjust: {
    id: "adjust",
    label: "Adjust",
    description: "Adjust records (e.g. stock)",
    category: "custom",
  },
  start: {
    id: "start",
    label: "Start",
    description: "Start a process (e.g. production)",
    category: "custom",
  },
  complete: {
    id: "complete",
    label: "Complete",
    description: "Complete a process",
    category: "custom",
  },
  cancel: {
    id: "cancel",
    label: "Cancel",
    description: "Cancel an ongoing process",
    category: "custom",
  },
  view_scanner: { id: "view_scanner", label: "View Count Scanner", category: "custom" },
  view_entries: { id: "view_entries", label: "View All Count Entries", category: "custom" },
  view_adjustment: { id: "view_adjustment", label: "View Auto Adjustment", category: "custom" },
  view_sales_widget: { id: "view_sales_widget", label: "Sales Widget", category: "custom" },
  view_inventory_widget: { id: "view_inventory_widget", label: "Inventory Widget", category: "custom" },
  view_production_widget: { id: "view_production_widget", label: "Production Widget", category: "custom" },
  view_accounts_widget: { id: "view_accounts_widget", label: "Accounts Widget", category: "custom" },
  view_quick_actions_widget: { id: "view_quick_actions_widget", label: "Quick Actions Widget", category: "custom" },
  view_recent_activity_widget: { id: "view_recent_activity_widget", label: "Recent Activity Widget", category: "custom" },
  wholesale: { id: "wholesale", label: "Wholesale", description: "Enable wholesale mode", category: "custom" },
  sync: { id: "sync", label: "Sync", description: "Sync data from external devices", category: "custom" },
  "create-expense": { id: "create-expense", label: "Create Expense", description: "Create expense vouchers via dashboard", category: "custom" },
  "create-deposit": { id: "create-deposit", label: "Create Deposit", description: "Create deposit (contra) vouchers via dashboard", category: "custom" },
  "create-payment": { id: "create-payment", label: "Create Payment", description: "Create payment vouchers via dashboard", category: "custom" },
  ledger: { id: "ledger", label: "View Ledger", description: "View ledger statement and transaction history", category: "custom" },
};

// Helper function to get all modules
export function getAllModules(): ModuleMetadata[] {
  return Object.values(MODULES);
}

// Helper function to get all operations
export function getAllOperations(): OperationMetadata[] {
  return Object.values(OPERATIONS);
}

// Helper function to get basic operations
export function getBasicOperations(): OperationMetadata[] {
  return Object.values(OPERATIONS).filter((op) => op.category === "basic");
}

// Helper function to get custom operations
export function getCustomOperations(): OperationMetadata[] {
  return Object.values(OPERATIONS).filter((op) => op.category === "custom");
}

// Standard operations for pages
export const STANDARD_OPERATIONS: StandardOperation[] = [
  "create",
  "view",
  "edit",
  "move-to-trash",
  "delete-permanently",
];

// Navigation structure mapping sidebar items to pages and operations
export interface NavigationPage {
  permissionKey: string; // e.g., "items.items"
  path: string; // e.g., "/dashboard/items"
  label: string; // e.g., "Items"
  operations: Operation[]; // Available operations for this page
}

export interface NavigationItem {
  id: string; // Navigation ID (e.g., "items")
  label: string; // Display label
  icon?: string;
  alwaysVisible?: boolean; // Dashboard, Profile, Settings are always visible
  pages: NavigationPage[];
}

export const NAVIGATION_STRUCTURE: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    alwaysVisible: true,
    pages: [
      {
        permissionKey: "dashboard",
        path: "/dashboard",
        label: "Dashboard Overview",
        operations: [
          "view",
          "view_sales_widget",
          "view_inventory_widget",
          "view_production_widget",
          "view_accounts_widget",
          "view_quick_actions_widget",
          "view_recent_activity_widget"
        ],
      },
    ],
  },
  {
    id: "master",
    label: "Master Data",
    pages: [
      {
        permissionKey: "master.categories",
        path: "/dashboard/master/categories",
        label: "Categories",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "master.brands",
        path: "/dashboard/master/brands",
        label: "Brands",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "master.units",
        path: "/dashboard/master/units",
        label: "Units",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "master.items",
        path: "/dashboard/master/items",
        label: "Items",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "master.warehouses",
        path: "/dashboard/master/warehouses",
        label: "Warehouses",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "master.import",
        path: "/dashboard/import",
        label: "Data Import",
        operations: ["view", "create", "import"],
      },
    ],
  },
  {
    id: "procurements",
    label: "Procurements",
    pages: [
      {
        permissionKey: "procurements.dashboard",
        path: "/dashboard/procurements",
        label: "Dashboard",
        operations: ["view"],
      },
      {
        permissionKey: "procurements.purchases",
        path: "/dashboard/procurements/purchases",
        label: "Purchases",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "procurements.grn",
        path: "/dashboard/procurements/grn",
        label: "Goods Receipt Note",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "procurements.tpn",
        path: "/dashboard/procurements/tpn",
        label: "Transfer Notes",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "procurements.rtv",
        path: "/dashboard/procurements/rtv",
        label: "Returns (RTV)",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    pages: [
      {
        permissionKey: "sales.sales",
        path: "/dashboard/sales",
        label: "Sales",
        operations: ["view", "create", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "sales.pos",
        path: "/dashboard/sales/pos",
        label: "POS",
        operations: ["view", "create", "wholesale"],
      },
      {
        permissionKey: "sales.coupons",
        path: "/dashboard/sales/coupons",
        label: "Coupons",
        operations: ["view", "create", "edit", "delete"],
      },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    pages: [
      {
        permissionKey: "accounts.chart-of-accounts",
        path: "/dashboard/accounts/chart-of-accounts",
        label: "Chart of Accounts",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "accounts.ledgers",
        path: "/dashboard/accounts/ledgers",
        label: "Ledgers",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "accounts.vouchers",
        path: "/dashboard/accounts/vouchers",
        label: "Vouchers",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently", "create-expense", "create-deposit", "create-payment"],
      },
      {
        permissionKey: "accounts.trial-balance",
        path: "/dashboard/accounts/trial-balance",
        label: "Trial Balance",
        operations: ["view", "export"],
      },
      {
        permissionKey: "accounts.balance-sheet",
        path: "/dashboard/accounts/balance-sheet",
        label: "Balance Sheet",
        operations: ["view", "export"],
      },
      {
        permissionKey: "accounts.profit-loss",
        path: "/dashboard/accounts/profit-loss",
        label: "Profit & Loss",
        operations: ["view", "export"],
      },
      {
        permissionKey: "accounts.cash-bank",
        path: "/dashboard/accounts/cash-bank",
        label: "Cash & Bank",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "accounts.accounts-receivable",
        path: "/dashboard/accounts/accounts-receivable",
        label: "Accounts Receivable",
        operations: ["view", "export"],
      },
      {
        permissionKey: "accounts.accounts-payable",
        path: "/dashboard/accounts/accounts-payable",
        label: "Accounts Payable",
        operations: ["view", "export"],
      },
    ],
  },
  {
    id: "peoples",
    label: "Peoples",
    pages: [
      {
        permissionKey: "peoples.users",
        path: "/dashboard/users",
        label: "Users",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "peoples.clients",
        path: "/dashboard/clients",
        label: "Clients",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently", "ledger"],
      },
      {
        permissionKey: "peoples.suppliers",
        path: "/dashboard/suppliers",
        label: "Suppliers",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently", "ledger"],
      },
      {
        permissionKey: "peoples.employees",
        path: "/dashboard/employees",
        label: "Employees",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently", "ledger"],
      },
    ],
  },
  {
    id: "files",
    label: "Files",
    pages: [
      {
        permissionKey: "files",
        path: "/dashboard/files",
        label: "Files",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
    ],
  },
  {
    id: "hr",
    label: "HR & Payroll",
    pages: [
      {
        permissionKey: "hr.shifts",
        path: "/dashboard/hr/shifts",
        label: "Shifts",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.holidays",
        path: "/dashboard/hr/holidays",
        label: "Holidays",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.attendance",
        path: "/dashboard/hr/attendance",
        label: "Attendance",
        operations: ["create", "view", "edit", "manage"],
      },
      {
        permissionKey: "hr.leave",
        path: "/dashboard/hr/leave",
        label: "Leave",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.resignation",
        path: "/dashboard/hr/resignation",
        label: "Resignation",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.payroll",
        path: "/dashboard/hr/payroll",
        label: "Payroll",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.loans",
        path: "/dashboard/hr/loans",
        label: "Loans",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.fines",
        path: "/dashboard/hr/fines",
        label: "Fines & Penalties",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.bonuses",
        path: "/dashboard/hr/bonuses",
        label: "Bonuses & Rewards",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.biometric.view",
        path: "/dashboard/hr/biometric/devices",
        label: "Biometric Devices",
        operations: ["view", "create", "edit", "delete"],
      },
      {
        permissionKey: "hr.biometric.manage",
        path: "/dashboard/hr/biometric/mapping",
        label: "Employee Device Mapping",
        operations: ["view", "manage"],
      },
      {
        permissionKey: "hr.biometric.view",
        path: "/dashboard/hr/biometric/raw-logs",
        label: "Raw Biometric Logs",
        operations: ["view"],
      },
      {
        permissionKey: "hr.biometric.manage",
        path: "/dashboard/hr/biometric/unmapped-logs",
        label: "Unmapped Logs",
        operations: ["view", "manage"],
      },
      {
        permissionKey: "hr.biometric.view",
        path: "/dashboard/hr/biometric/sync-history",
        label: "Sync History",
        operations: ["view"],
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    pages: [
      {
        permissionKey: "notifications",
        path: "/dashboard/notifications",
        label: "Notifications",
        operations: ["view", "edit"],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    pages: [
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports",
        label: "Reports",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/inventory/stock-summary",
        label: "Stock Summary",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/inventory/stock-ledger",
        label: "Stock Ledger",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/inventory/raw-material-consumption",
        label: "Raw Material Consumption",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/production/production-order-summary",
        label: "Production Order Summary",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/production/cost-per-batch",
        label: "Cost Per Batch",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/sales/revenue-by-client",
        label: "Revenue by Client",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/sales/revenue-by-item",
        label: "Revenue by Item",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/sales/sales-trends",
        label: "Sales Trends",
        operations: ["view", "export"],
      },
      {
        permissionKey: "reports.view",
        path: "/dashboard/reports/analytics",
        label: "Analytics",
        operations: ["view", "export"],
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    pages: [
      {
        permissionKey: "inventory.stock",
        path: "/dashboard/inventory/stock",
        label: "Stock",
        operations: ["view", "adjust"],
      },
      {
        permissionKey: "inventory.stock",
        path: "/dashboard/inventory/stock/ledger",
        label: "Stock Ledger",
        operations: ["view"],
      },
      {
        permissionKey: "inventory.stock-movements",
        path: "/dashboard/reports/inventory/stock-movements",
        label: "Stock Movements Page",
        operations: ["view", "export"],
      },
      {
        permissionKey: "inventory.adjustments",
        path: "/dashboard/inventory/adjustments",
        label: "Adjustments",
        operations: ["create", "view", "approve"],
      },
      {
        permissionKey: "inventory.damage",
        path: "/dashboard/inventory/damage",
        label: "Damage",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "inventory.count.scanner",
        path: "/dashboard/inventory/count",
        label: "Count Scanner Page",
        operations: ["view_scanner", "create"],
      },
      {
        permissionKey: "inventory.count.entries",
        path: "/dashboard/inventory/count/entries",
        label: "All Count Entries Page",
        operations: ["view_entries", "delete"],
      },
      {
        permissionKey: "inventory.count.adjustment",
        path: "/dashboard/inventory/count/adjustment",
        label: "Auto Adjustment Page",
        operations: ["view_adjustment", "approve"],
      },
    ],
  },
  {
    id: "production",
    label: "Production",
    pages: [
      {
        permissionKey: "production.boms",
        path: "/dashboard/production/boms",
        label: "Bill of Materials",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "production.orders",
        path: "/dashboard/production/orders",
        label: "Production Orders",
        operations: ["view", "create", "edit", "start", "complete", "cancel"],
      },
      {
        permissionKey: "production.orders",
        path: "/dashboard/production/cutting",
        label: "Cutting Room",
        operations: ["view", "create"],
      },
      {
        permissionKey: "production.orders",
        path: "/dashboard/production/sewing",
        label: "Sewing Tracker",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "production.orders",
        path: "/dashboard/production/quality",
        label: "Quality Check",
        operations: ["view"],
      },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    alwaysVisible: true,
    pages: [
      {
        permissionKey: "profile",
        path: "/dashboard/profile",
        label: "Profile",
        operations: ["view", "edit"],
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    alwaysVisible: true,
    pages: [
      {
        permissionKey: "settings",
        path: "/dashboard/settings",
        label: "Settings",
        operations: ["view", "edit"],
      },
      // Settings category
      {
        permissionKey: "settings.organization",
        path: "/dashboard/settings?section=organization",
        label: "Organization",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.experience",
        path: "/dashboard/settings?section=experience",
        label: "Experience",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.accounts",
        path: "/dashboard/settings?section=accounts",
        label: "Accounts",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.emails",
        path: "/dashboard/settings?section=emails",
        label: "Emails",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.calendars",
        path: "/dashboard/settings?section=calendars",
        label: "Calendars",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.whatsapp",
        path: "/dashboard/settings?section=whatsapp",
        label: "WhatsApp",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.telegram",
        path: "/dashboard/settings?section=telegram",
        label: "Telegram",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.sms",
        path: "/dashboard/settings?section=sms",
        label: "SMS",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.backup",
        path: "/dashboard/settings?section=backup",
        label: "Backup",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.permissions",
        path: "/dashboard/settings?section=permissions",
        label: "Permissions",
        operations: ["view", "edit"],
      },
      // Accounts category
      {
        permissionKey: "settings.accounts.default",
        path: "/dashboard/settings/accounts",
        label: "Accounts Default",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.accounts.tax",
        path: "/dashboard/settings/accounts?section=tax",
        label: "Tax",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.accounts.payment-methods",
        path: "/dashboard/settings/accounts?section=payment-methods",
        label: "Payment Methods",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.preferences",
        path: "/dashboard/settings?section=preferences",
        label: "Preferences",
        operations: ["view", "edit"],
      },
      // Quotations category
      {
        permissionKey: "settings.coverLetter",
        path: "/dashboard/settings?section=coverLetter",
        label: "Cover Letter",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.tos",
        path: "/dashboard/settings?section=tos",
        label: "TOS",
        operations: ["view", "edit"],
      },
      // Notifications category
      {
        permissionKey: "settings.general",
        path: "/dashboard/settings?section=general",
        label: "General",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.membership",
        path: "/dashboard/settings?section=membership",
        label: "Membership Settings",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.members",
        path: "/dashboard/settings?section=members",
        label: "Members",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.security",
        path: "/dashboard/settings?section=security",
        label: "Security",
        operations: ["view", "edit"],
      },
      // Developers category
      {
        permissionKey: "settings.apis",
        path: "/dashboard/settings?section=apis",
        label: "APIs",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.webhooks",
        path: "/dashboard/settings?section=webhooks",
        label: "Webhooks",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
    ],
  },
];

// Helper function to check if permission structure is enhanced format
export function isEnhancedPermissions(
  permissions: PartialPermissions
): permissions is Partial<EnhancedPermissions> {
  if (!permissions || typeof permissions !== "object") return false;
  const firstKey = Object.keys(permissions)[0];
  if (!firstKey) return false;
  const firstValue = permissions[firstKey];
  return (
    typeof firstValue === "object" &&
    firstValue !== null &&
    !Array.isArray(firstValue) &&
    ("navigationVisible" in firstValue || "pageAccess" in firstValue || "operations" in firstValue)
  );
}

// Helper function to convert legacy permissions to enhanced format
export function convertToEnhancedPermissions(
  legacyPermissions: Partial<Permissions>
): Partial<EnhancedPermissions> {
  const enhanced: Partial<EnhancedPermissions> = {};
  
  for (const [key, operations] of Object.entries(legacyPermissions)) {
    if (Array.isArray(operations)) {
      // Include even if empty (for display of removed permissions)
      enhanced[key] = {
        navigationVisible: operations.length > 0,
        pageAccess: operations.length > 0,
        operations: operations,
      };
    }
  }
  
  return enhanced;
}

// Helper function to convert enhanced permissions to legacy format
export function convertToLegacyPermissions(
  enhancedPermissions: Partial<EnhancedPermissions>
): Partial<Permissions> {
  const legacy: Partial<Permissions> = {};
  
  for (const [key, pagePermission] of Object.entries(enhancedPermissions)) {
    if (pagePermission) {
      // Include permission key even if operations are empty
      // This ensures that removed permissions are explicitly deleted
      legacy[key] = pagePermission.operations || [];
    }
  }
  
  return legacy;
}

/**
 * Calculate permission overrides (differences from template)
 * Only returns permissions that differ from the template
 * @param templatePermissions - Permissions from the template (legacy format)
 * @param currentPermissions - Current permissions (legacy format)
 * @returns Only the differences that need to be saved as overrides
 */
export function calculatePermissionOverrides(
  templatePermissions: Partial<Record<string, Operation[]>>,
  currentPermissions: Partial<Record<string, Operation[]>>
): Partial<Record<string, Operation[]>> {
  const overrides: Partial<Record<string, Operation[]>> = {};
  const allKeys = new Set([
    ...Object.keys(templatePermissions),
    ...Object.keys(currentPermissions),
  ]);

  Array.from(allKeys).forEach((key) => {
    const templateOps = templatePermissions[key] || [];
    const currentOps = currentPermissions[key] || [];

    // Normalize arrays for comparison (sort and remove duplicates)
    const templateOpsSorted = Array.from(new Set(templateOps)).sort().join(",");
    const currentOpsSorted = Array.from(new Set(currentOps)).sort().join(",");

    // If current differs from template, include as override
    if (templateOpsSorted !== currentOpsSorted) {
      overrides[key] = currentOps;
    }
    // If they match, don't include (will delete existing override if any)
  });

  return overrides;
}
