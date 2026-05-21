// Permission system type definitions

// Module names
export type Module =
  | "dashboard"
  | "crm"
  | "items"
  | "projects"
  | "quotations"
  | "purchases"
  | "accounts"
  | "peoples"
  | "files"
  | "notifications"
  | "tasks"
  | "notes"
  | "docs"
  | "work-orders"
  | "hr";

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
  | "post"
  | "sync";

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
  crm: {
    id: "crm",
    label: "CRM",
    description: "Customer Relationship Management",
    subModules: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard/crm", module: "crm", permissionKey: "crm.dashboard" },
      { id: "leads", label: "Leads", path: "/dashboard/crm/leads", module: "crm", permissionKey: "crm.leads" },
      { id: "contacts", label: "Contacts", path: "/dashboard/crm/contacts", module: "crm", permissionKey: "crm.contacts" },
      { id: "opportunities", label: "Opportunities", path: "/dashboard/crm/opportunities", module: "crm", permissionKey: "crm.opportunities" },
      { id: "clients", label: "Clients", path: "/dashboard/crm/clients", module: "peoples", permissionKey: "peoples.clients" }, // Linked to Peoples permissions
      { id: "activities", label: "Activities", path: "/dashboard/crm/activities", module: "crm", permissionKey: "crm.activities" },
    ],
  },
  items: {
    id: "items",
    label: "Service Catalog",
    description: "Manage items, categories, units, and groups",
    subModules: [
      { id: "items", label: "All Services", path: "/dashboard/items", module: "items", permissionKey: "items.items" },
      { id: "groups", label: "Groups", path: "/dashboard/items/groups", module: "items", permissionKey: "items.groups" },
      { id: "category", label: "Categories", path: "/dashboard/items/category", module: "items", permissionKey: "items.category" },
      { id: "units", label: "Units", path: "/dashboard/items/units", module: "items", permissionKey: "items.units" },
    ],
  },
  projects: {
    id: "projects",
    label: "Projects",
    description: "Manage projects and issues",
    subModules: [
      { id: "projects", label: "Dashboard", path: "/dashboard/projects", module: "projects", permissionKey: "projects.projects" },
      { id: "all", label: "Projects", path: "/dashboard/projects/all", module: "projects", permissionKey: "projects.all" },
      { id: "tasks", label: "My Tasks", path: "/dashboard/projects/tasks", module: "projects", permissionKey: "projects.tasks" },
      { id: "kanban", label: "Kanban Board", path: "/dashboard/projects/kanban", module: "projects", permissionKey: "projects.kanban" },
      { id: "milestones", label: "Milestones", path: "/dashboard/projects/milestone", module: "projects", permissionKey: "projects.milestones" },
      { id: "issues", label: "Issues", path: "/dashboard/projects/issues", module: "projects", permissionKey: "projects.issues" },
    ],
  },
  quotations: {
    id: "quotations",
    label: "Quotations",
    description: "Manage quotations, invoices, and orders",
    subModules: [
      { id: "quotations", label: "Quotations", path: "/dashboard/quotations", module: "quotations", permissionKey: "quotations.quotations" },
      { id: "invoices", label: "Invoices", path: "/dashboard/quotations/invoices", module: "quotations", permissionKey: "quotations.invoices" },
      { id: "orders", label: "Orders", path: "/dashboard/quotations/orders", module: "quotations", permissionKey: "quotations.orders" },
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
      { id: "project-ledger", label: "Project Ledger", path: "/dashboard/accounts/project-ledger", module: "accounts", permissionKey: "accounts.project-ledger" },
    ],
  },
  peoples: {
    id: "peoples",
    label: "Peoples",
    description: "Manage users, clients, and suppliers",
    subModules: [
      { id: "users", label: "Users", path: "/dashboard/users", module: "peoples", permissionKey: "peoples.users" },
      { id: "contacts", label: "Contacts", path: "/dashboard/contacts", module: "peoples", permissionKey: "peoples.contacts" },
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
  tasks: {
    id: "tasks",
    label: "Tasks",
    description: "Manage system tasks",
  },
  notes: {
    id: "notes",
    label: "Notes",
    description: "Manage system notes",
  },
  docs: {
    id: "docs",
    label: "Docs",
    description: "Manage system documents",
  },
  "work-orders": {
    id: "work-orders",
    label: "Work Orders",
    description: "Manage work orders",
  },
  hr: {
    id: "hr",
    label: "HR & Payroll",
    description: "Human Resource and Payroll Management",
    subModules: [
      { id: "attendance", label: "Attendance", path: "/dashboard/hr/attendance", module: "hr", permissionKey: "hr.attendance" },
      { id: "shifts", label: "Shifts", path: "/dashboard/hr/shifts", module: "hr", permissionKey: "hr.shifts" },
      { id: "holidays", label: "Holidays", path: "/dashboard/hr/holidays", module: "hr", permissionKey: "hr.holidays" },
      { id: "leave", label: "Leave", path: "/dashboard/hr/leave", module: "hr", permissionKey: "hr.leave" },
      { id: "loans", label: "Loans", path: "/dashboard/hr/loans", module: "hr", permissionKey: "hr.loans" },
      { id: "payroll", label: "Payroll", path: "/dashboard/hr/payroll", module: "hr", permissionKey: "hr.payroll" },
      { id: "calendar", label: "Calendar", path: "/dashboard/hr/calendar", module: "hr", permissionKey: "hr.calendar" },
      { id: "devices", label: "Biometric Devices", path: "/dashboard/hr/attendance/devices", module: "hr", permissionKey: "hr.devices" },
    ],
  },
  // analytics: {
  //   id: "analytics",
  //   label: "Analytics",
  //   description: "Analytics and reports (Deprecated)",
  // },
  // reports: {
  //   id: "reports",
  //   label: "Reports",
  //   description: "Generate and view reports (Deprecated)",
  // },
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
  post: {
    id: "post",
    label: "Post / Process",
    description: "Post vouchers or process payroll",
    category: "custom",
  },
  sync: {
    id: "sync",
    label: "Sync Biometric",
    description: "Sync biometric log data",
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
    id: "crm",
    label: "CRM",
    pages: [
      {
        permissionKey: "crm.dashboard",
        path: "/dashboard/crm",
        label: "Dashboard",
        operations: ["view"],
      },
      {
        permissionKey: "crm.leads",
        path: "/dashboard/crm/leads",
        label: "Leads",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "crm.opportunities",
        path: "/dashboard/crm/opportunities",
        label: "Opportunities",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "crm.contacts",
        path: "/dashboard/crm/contacts",
        label: "Contacts",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "peoples.clients", // Using existing permission key
        path: "/dashboard/crm/clients",
        label: "Clients",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "crm.activities",
        path: "/dashboard/crm/activities",
        label: "Activities",
        operations: ["create", "view", "edit", "delete-permanently"],
      },
    ],
  },
  {
    id: "hr",
    label: "HR & Payroll",
    pages: [
      {
        permissionKey: "hr.attendance",
        path: "/dashboard/hr/attendance",
        label: "Attendance",
        operations: ["view", "create", "edit", "sync"],
      },
      {
        permissionKey: "hr.shifts",
        path: "/dashboard/hr/shifts",
        label: "Shifts",
        operations: ["view", "create", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.holidays",
        path: "/dashboard/hr/holidays",
        label: "Holidays",
        operations: ["view", "create", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "hr.leave",
        path: "/dashboard/hr/leave",
        label: "Leave Applications",
        operations: ["view", "create", "edit", "approve"],
      },
      {
        permissionKey: "hr.loans",
        path: "/dashboard/hr/loans",
        label: "Loans",
        operations: ["view", "create", "edit", "approve"],
      },
      {
        permissionKey: "hr.payroll",
        path: "/dashboard/hr/payroll",
        label: "Payroll",
        operations: ["view", "create", "edit", "post"],
      },
      {
        permissionKey: "hr.calendar",
        path: "/dashboard/hr/calendar",
        label: "HR Calendar",
        operations: ["view"],
      },
      {
        permissionKey: "hr.devices",
        path: "/dashboard/hr/attendance/devices",
        label: "Biometric Devices",
        operations: ["view", "create", "edit", "delete-permanently"],
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    pages: [
      {
        permissionKey: "projects.projects",
        path: "/dashboard/projects",
        label: "Dashboard",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "projects.all",
        path: "/dashboard/projects/all",
        label: "Projects",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "projects.tasks",
        path: "/dashboard/projects/tasks",
        label: "My Tasks",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "projects.kanban",
        path: "/dashboard/projects/kanban",
        label: "Kanban Board",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "projects.milestones",
        path: "/dashboard/projects/milestone",
        label: "Milestones",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "projects.issues",
        path: "/dashboard/projects/issues",
        label: "Issues",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
    ],
  },
  {
    id: "items",
    label: "Service Catalog",
    pages: [
      {
        permissionKey: "items.items",
        path: "/dashboard/items",
        label: "All Services",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "items.groups",
        path: "/dashboard/items/groups",
        label: "Groups",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "items.category",
        path: "/dashboard/items/category",
        label: "Categories",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "items.units",
        path: "/dashboard/items/units",
        label: "Units",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
    ],
  },
  {
    id: "quotations",
    label: "Quotations",
    pages: [
      {
        permissionKey: "quotations.quotations",
        path: "/dashboard/quotations",
        label: "Quotations",
        operations: ["create", "view", "edit", "approve", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "quotations.orders",
        path: "/dashboard/quotations/orders",
        label: "Orders",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
      },
      {
        permissionKey: "quotations.delivery-schedule",
        path: "/dashboard/quotations/delivery-schedule",
        label: "Delivery Schedule",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "quotations.invoices",
        path: "/dashboard/quotations/invoices",
        label: "Invoices",
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
      {
        permissionKey: "accounts.project-ledger",
        path: "/dashboard/accounts/project-ledger",
        label: "Project Ledger",
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
        permissionKey: "peoples.contacts",
        path: "/dashboard/crm/contacts",
        label: "Contacts",
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
  // {
  //   id: "analytics",
  //   label: "Analytics",
  //   pages: [
  //     {
  //       permissionKey: "analytics",
  //       path: "/dashboard/analytics",
  //       label: "Analytics",
  //       operations: ["view", "export"],
  //     },
  //   ],
  // },
  // {
  //   id: "reports",
  //   label: "Reports",
  //   pages: [
  //     {
  //       permissionKey: "reports",
  //       path: "/dashboard/reports",
  //       label: "Reports",
  //       operations: ["view", "export"],
  //     },
  //   ],
  // },
  {
    id: "tasks",
    label: "Tasks",
    pages: [
      {
        permissionKey: "tasks",
        path: "/dashboard/tasks",
        label: "Tasks",
        operations: ["create", "view", "edit", "delete-permanently"],
      },
    ],
  },
  {
    id: "notes",
    label: "Notes",
    pages: [
      {
        permissionKey: "notes",
        path: "/dashboard/notes",
        label: "Notes",
        operations: ["create", "view", "edit", "delete-permanently"],
      },
    ],
  },
  {
    id: "docs",
    label: "Docs",
    pages: [
      {
        permissionKey: "docs",
        path: "/dashboard/docs",
        label: "Docs",
        operations: ["create", "view", "edit", "delete-permanently"],
      },
    ],
  },
  {
    id: "work-orders",
    label: "Work Orders",
    pages: [
      {
        permissionKey: "work-orders",
        path: "/dashboard/work-orders",
        label: "Work Orders",
        operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"],
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

