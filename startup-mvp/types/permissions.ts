// Permission system type definitions

// Module names
export type Module =
  | "dashboard"
  | "master"
  | "purchases"
  | "accounts"
  | "peoples"
  | "files"
  | "notifications"
  | "analytics"
  | "reports"
  | "inventory"
  | "production";

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
  | "approve";

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
      { id: "categories", label: "Categories", path: "/dashboard/master/categories", module: "master", permissionKey: "master.categories" },
      { id: "units", label: "Units", path: "/dashboard/master/units", module: "master", permissionKey: "master.units" },
      { id: "items", label: "Items", path: "/dashboard/master/items", module: "master", permissionKey: "master.items" },
      { id: "warehouses", label: "Warehouses", path: "/dashboard/master/warehouses", module: "master", permissionKey: "master.warehouses" },
    ],
  },
  purchases: {
    id: "purchases",
    label: "Purchases",
    description: "Manage purchase orders and receipts",
    subModules: [
      { id: "purchases", label: "Purchases", path: "/dashboard/purchases", module: "purchases", permissionKey: "purchases.purchases" },
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
  notifications: {
    id: "notifications",
    label: "Notifications",
    description: "System notifications",
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    description: "Analytics and reports",
  },
  reports: {
    id: "reports",
    label: "Reports",
    description: "Generate and view reports",
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    description: "Stock and inventory management",
    subModules: [
      { id: "stock", label: "Stock", path: "/dashboard/inventory/stock", module: "inventory", permissionKey: "inventory.stock" },
    ],
  },
  production: {
    id: "production",
    label: "Production",
    description: "Production and manufacturing",
    subModules: [
      { id: "boms", label: "Bill of Materials", path: "/dashboard/production/boms", module: "production", permissionKey: "production.boms" },
      { id: "orders", label: "Production Orders", path: "/dashboard/production/orders", module: "production", permissionKey: "production.orders" },
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
        label: "Dashboard",
        operations: ["view"],
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
    ],
  },
  {
    id: "purchases",
    label: "Purchases",
    pages: [
      {
        permissionKey: "purchases.purchases",
        path: "/dashboard/purchases",
        label: "Purchases",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
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
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
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
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "peoples.suppliers",
        path: "/dashboard/suppliers",
        label: "Suppliers",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "peoples.employees",
        path: "/dashboard/employees",
        label: "Employees",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
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
    id: "analytics",
    label: "Analytics",
    pages: [
      {
        permissionKey: "analytics",
        path: "/dashboard/analytics",
        label: "Analytics",
        operations: ["view", "export"],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    pages: [
      {
        permissionKey: "reports",
        path: "/dashboard/reports",
        label: "Reports",
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
        path: "/admin/settings",
        label: "Settings",
        operations: ["view", "edit"],
      },
      // Settings category
      {
        permissionKey: "settings.organization",
        path: "/admin/settings?section=organization",
        label: "Organization",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.experience",
        path: "/admin/settings?section=experience",
        label: "Experience",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.accounts",
        path: "/admin/settings?section=accounts",
        label: "Accounts",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.emails",
        path: "/admin/settings?section=emails",
        label: "Emails",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.calendars",
        path: "/admin/settings?section=calendars",
        label: "Calendars",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.whatsapp",
        path: "/admin/settings?section=whatsapp",
        label: "WhatsApp",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.telegram",
        path: "/admin/settings?section=telegram",
        label: "Telegram",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.sms",
        path: "/admin/settings?section=sms",
        label: "SMS",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.backup",
        path: "/admin/settings?section=backup",
        label: "Backup",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.permissions",
        path: "/admin/settings?section=permissions",
        label: "Permissions",
        operations: ["view", "edit"],
      },
      // Accounts category
      {
        permissionKey: "settings.tex",
        path: "/admin/settings?section=tex",
        label: "Tex",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.paymentMethods",
        path: "/admin/settings?section=paymentMethods",
        label: "Payment Methods",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.preferences",
        path: "/admin/settings?section=preferences",
        label: "Preferences",
        operations: ["view", "edit"],
      },
      // Quotations category
      {
        permissionKey: "settings.coverLetter",
        path: "/admin/settings?section=coverLetter",
        label: "Cover Letter",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.tos",
        path: "/admin/settings?section=tos",
        label: "TOS",
        operations: ["view", "edit"],
      },
      // Notifications category
      {
        permissionKey: "settings.general",
        path: "/admin/settings?section=general",
        label: "General",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.members",
        path: "/admin/settings?section=members",
        label: "Members",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.security",
        path: "/admin/settings?section=security",
        label: "Security",
        operations: ["view", "edit"],
      },
      // Developers category
      {
        permissionKey: "settings.apis",
        path: "/admin/settings?section=apis",
        label: "APIs",
        operations: ["view", "edit", "create", "delete-permanently"],
      },
      {
        permissionKey: "settings.webhooks",
        path: "/admin/settings?section=webhooks",
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

  for (const key of allKeys) {
    const templateOps = templatePermissions[key] || [];
    const currentOps = currentPermissions[key] || [];

    // Normalize arrays for comparison (sort and remove duplicates)
    const templateOpsSorted = [...new Set(templateOps)].sort().join(",");
    const currentOpsSorted = [...new Set(currentOps)].sort().join(",");

    // If current differs from template, include as override
    if (templateOpsSorted !== currentOpsSorted) {
      overrides[key] = currentOps;
    }
    // If they match, don't include (will delete existing override if any)
  }

  return overrides;
}

