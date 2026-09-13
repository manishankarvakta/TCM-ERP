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
  | "hr"
  | "ceo-command-center"
  | "integrations"
  | "marketing"
  | "creatives"
  | "qa"
  | "support"
  | "billing"
  | "governance"
  | "productivity"
  | "system"
  | "admin";

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
  | "sync"
  | "confirm"
  | "ready-for-estimation"
  | "review"
  | "ready-for-quotation"
  | "view-cost"
  | "view-margin"
  | "acceptance"
  | "sign"
  | "activate"
  | "terminate"
  | "fulfillment"
  | "billing-eligibility"
  | "handover-ready"
  | "submit"
  | "accept"
  | "reject"
  | "create-project"
  | "cancel";

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
      { id: "requirements", label: "Requirements", path: "/dashboard/crm/requirements", module: "crm", permissionKey: "crm.requirements" },
      { id: "estimations", label: "Estimations", path: "/dashboard/crm/estimations", module: "crm", permissionKey: "crm.estimations" },
      { id: "agreements", label: "Agreements", path: "/dashboard/crm/agreements", module: "crm", permissionKey: "crm.agreements" },
      { id: "service-sales", label: "Service Sales", path: "/dashboard/crm/service-sales", module: "crm", permissionKey: "crm.service-sales" },
      { id: "project-handovers", label: "Project Handovers", path: "/dashboard/crm/project-handovers", module: "crm", permissionKey: "crm.project-handovers" },
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
      { id: "timeline", label: "Timeline", path: "/dashboard/projects/timeline", module: "projects", permissionKey: "projects.timeline" },
      { id: "calendar", label: "Calendar", path: "/dashboard/projects/calendar", module: "projects", permissionKey: "projects.calendar" },
      { id: "notes", label: "Notes", path: "/dashboard/projects/notes", module: "projects", permissionKey: "projects.notes" },
      { id: "docs", label: "Documents", path: "/dashboard/projects/docs", module: "projects", permissionKey: "projects.docs" },
      { id: "files", label: "Files", path: "/dashboard/projects/files", module: "projects", permissionKey: "projects.files" },
      { id: "activities", label: "Activities", path: "/dashboard/projects/activities", module: "projects", permissionKey: "projects.activities" },
      { id: "team", label: "Team", path: "/dashboard/projects/team", module: "projects", permissionKey: "projects.team" },
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
      { id: "roster", label: "Duty Roster", path: "/dashboard/hr/roster", module: "hr", permissionKey: "hr.roster" },
      { id: "shifts", label: "Shifts", path: "/dashboard/hr/shifts", module: "hr", permissionKey: "hr.shifts" },
      { id: "holidays", label: "Holidays", path: "/dashboard/hr/holidays", module: "hr", permissionKey: "hr.holidays" },
      { id: "leave", label: "Leave", path: "/dashboard/hr/leave", module: "hr", permissionKey: "hr.leave" },
      { id: "loans", label: "Loans", path: "/dashboard/hr/loans", module: "hr", permissionKey: "hr.loans" },
      { id: "payroll", label: "Payroll", path: "/dashboard/hr/payroll", module: "hr", permissionKey: "hr.payroll" },
      { id: "calendar", label: "Calendar", path: "/dashboard/hr/calendar", module: "hr", permissionKey: "hr.calendar" },
      { id: "devices", label: "Biometric Devices", path: "/dashboard/hr/attendance/devices", module: "hr", permissionKey: "hr.devices" },
    ],
  },
  "ceo-command-center": {
    id: "ceo-command-center",
    label: "CEO Command Center",
    description: "Executive Operational Command Center",
  },
  integrations: {
    id: "integrations",
    label: "Integrations & Automation",
    description: "Manage integration connections, webhooks, and automation rules",
    subModules: [
      { id: "connections", label: "Connections", path: "/dashboard/integrations/connections", module: "integrations", permissionKey: "integrations.connections" },
      { id: "webhooks", label: "Webhooks", path: "/dashboard/integrations/webhooks", module: "integrations", permissionKey: "integrations.webhooks" },
      { id: "automations", label: "Automations", path: "/dashboard/integrations/automations", module: "integrations", permissionKey: "integrations.automations" },
      { id: "logs", label: "Event Logs", path: "/dashboard/integrations/logs", module: "integrations", permissionKey: "integrations.logs" }
    ]
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    description: "Marketing campaigns, leads, and analytics",
  },
  creatives: {
    id: "creatives",
    label: "Creatives",
    description: "Design requests, UI/UX, and brand assets",
  },
  qa: {
    id: "qa",
    label: "QA",
    description: "Quality assurance test plans, cases, and release approvals",
  },
  support: {
    id: "support",
    label: "Customer Success",
    description: "Support tickets, SLA tracking, and escalations",
  },
  billing: {
    id: "billing",
    label: "Billing",
    description: "Billing plans, milestones, and invoicing readiness",
  },
  governance: {
    id: "governance",
    label: "Governance",
    description: "Approvals, change requests, and audit logs",
  },
  productivity: {
    id: "productivity",
    label: "Productivity",
    description: "Files, notes, documents, and notifications",
  },
  system: {
    id: "system",
    label: "System Operations",
    description: "Queue jobs, workers, storage, redis, and system health",
  },
  admin: {
    id: "admin",
    label: "Administration",
    description: "User management, profile, and administrative settings",
  },
};

// Default operations configuration
export const OPERATIONS: Partial<Record<Operation, OperationMetadata>> = {
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
  // 1. Executive
  {
    id: "ceo-command-center",
    label: "Executive",
    pages: [
      { permissionKey: "dashboard", path: "/dashboard", label: "Dashboard", operations: ["view"] },
      { permissionKey: "ceo-command-center", path: "/dashboard/ceo-command-center", label: "CEO Command Center", operations: ["view"] },
      { permissionKey: "ceo-command-center.profitability", path: "/dashboard/profitability", label: "Profitability", operations: ["view"] },
      { permissionKey: "ceo-command-center.alerts", path: "/dashboard/executive/alerts", label: "Alerts", operations: ["view"] },
      { permissionKey: "ceo-command-center.reports", path: "/dashboard/executive/reports", label: "Reports", operations: ["view"] },
    ],
  },
  // 2. Marketing
  {
    id: "marketing",
    label: "Marketing",
    pages: [
      { permissionKey: "marketing.dashboard", path: "/dashboard/marketing", label: "Dashboard", operations: ["view"] },
      { permissionKey: "marketing.marketing-funnel", path: "/dashboard/marketing/marketing-funnel", label: "Marketing Funnel", operations: ["create", "view", "edit", "delete-permanently"] },
      { permissionKey: "marketing.campaigns", path: "/dashboard/marketing/campaigns", label: "Campaigns", operations: ["create", "view", "edit", "delete-permanently"] },
      { permissionKey: "marketing.paid-ads", path: "/dashboard/marketing/paid-ads", label: "Paid Ads", operations: ["view", "edit"] },
      { permissionKey: "marketing.sms-campaign", path: "/dashboard/marketing/sms-campaign", label: "SMS Campaign", operations: ["create", "view", "edit"] },
      { permissionKey: "marketing.wa-campaign", path: "/dashboard/marketing/wa-campaign", label: "WA Campaign", operations: ["create", "view", "edit"] },
      { permissionKey: "marketing.email-campaigns", path: "/dashboard/marketing/email-campaigns", label: "Email Campaigns", operations: ["create", "view", "edit"] },
      { permissionKey: "marketing.physical-campaign", path: "/dashboard/marketing/physical-campaign", label: "Physical Campaign", operations: ["create", "view", "edit"] },
      { permissionKey: "marketing.seo", path: "/dashboard/marketing/seo", label: "SEO", operations: ["view", "edit"] },
      { permissionKey: "marketing.social-media", path: "/dashboard/marketing/social-media", label: "Social Media", operations: ["view", "edit"] },
      { permissionKey: "marketing.content-calendar", path: "/dashboard/marketing/content-calendar", label: "Content Calendar", operations: ["view", "edit"] },
      { permissionKey: "marketing.landing-pages", path: "/dashboard/marketing/landing-pages", label: "Landing Pages", operations: ["view", "edit"] },
      { permissionKey: "marketing.lead-sources", path: "/dashboard/marketing/lead-sources", label: "Lead Sources", operations: ["view", "edit"] },
      { permissionKey: "marketing.budget", path: "/dashboard/marketing/budget", label: "Campaign Budget", operations: ["view", "edit"] },
      { permissionKey: "marketing.expenses", path: "/dashboard/marketing/expenses", label: "Marketing Expenses", operations: ["view", "edit"] },
      { permissionKey: "marketing.attribution", path: "/dashboard/marketing/attribution", label: "Attribution", operations: ["view"] },
      { permissionKey: "marketing.roi-reports", path: "/dashboard/marketing/roi-reports", label: "ROI Reports", operations: ["view"] },
    ],
  },
  // 3. Creatives
  {
    id: "creatives",
    label: "Creatives",
    pages: [
      { permissionKey: "creatives.dashboard", path: "/dashboard/creatives", label: "Creative Dashboard", operations: ["view"] },
      { permissionKey: "creatives.design-requests", path: "/dashboard/creatives/design-requests", label: "Design Requests", operations: ["create", "view", "edit"] },
      { permissionKey: "creatives.ui-ux-tasks", path: "/dashboard/creatives/ui-ux-tasks", label: "UI/UX Tasks", operations: ["view", "edit"] },
      { permissionKey: "creatives.graphics-tasks", path: "/dashboard/creatives/graphics-tasks", label: "Graphics Tasks", operations: ["view", "edit"] },
      { permissionKey: "creatives.video-motion-tasks", path: "/dashboard/creatives/video-motion-tasks", label: "Video/Motion Tasks", operations: ["view", "edit"] },
      { permissionKey: "creatives.brand-assets", path: "/dashboard/creatives/brand-assets", label: "Brand Assets", operations: ["view", "edit"] },
      { permissionKey: "creatives.revisions", path: "/dashboard/creatives/revisions", label: "Revision Management", operations: ["view", "edit"] },
      { permissionKey: "creatives.internal-approval", path: "/dashboard/creatives/internal-approval", label: "Internal Approval", operations: ["view", "approve"] },
      { permissionKey: "creatives.client-approval", path: "/dashboard/creatives/client-approval", label: "Client Approval", operations: ["view", "approve"] },
      { permissionKey: "creatives.library", path: "/dashboard/creatives/library", label: "Creative Library", operations: ["view"] },
    ],
  },
  // 4. CRM
  {
    id: "crm",
    label: "CRM",
    pages: [
      { permissionKey: "crm.dashboard", path: "/dashboard/crm", label: "CRM Dashboard", operations: ["view"] },
      { permissionKey: "crm.leads", path: "/dashboard/crm/leads", label: "Leads", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "crm.opportunities", path: "/dashboard/crm/opportunities", label: "Opportunities", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "crm.contacts", path: "/dashboard/crm/contacts", label: "Contacts", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "crm.activities", path: "/dashboard/crm/activities", label: "Activities", operations: ["create", "view", "edit", "delete-permanently"] },
      { permissionKey: "crm.follow-ups", path: "/dashboard/crm/follow-ups", label: "Follow-ups", operations: ["view", "edit"] },
      { permissionKey: "crm.pipeline", path: "/dashboard/crm/pipeline", label: "Pipeline", operations: ["view", "edit"] },
    ],
  },
  // 5. Sales
  {
    id: "quotations",
    label: "Sales",
    pages: [
      { permissionKey: "sales.dashboard", path: "/dashboard/sales", label: "Sales Dashboard", operations: ["view"] },
      { permissionKey: "crm.requirements", path: "/dashboard/crm/requirements", label: "Requirements", operations: ["create", "view", "edit", "confirm", "ready-for-estimation", "move-to-trash", "delete-permanently"] },
      { permissionKey: "crm.estimations", path: "/dashboard/crm/estimations", label: "Internal Estimations", operations: ["create", "view", "edit", "review", "approve", "ready-for-quotation", "move-to-trash", "delete-permanently", "view-cost", "view-margin"] },
      { permissionKey: "quotations.quotations", path: "/dashboard/quotations", label: "Quotations", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "crm.agreements", path: "/dashboard/crm/agreements", label: "Agreements", operations: ["create", "view", "edit", "review", "approve", "send", "acceptance", "sign", "activate", "terminate", "move-to-trash", "delete-permanently", "print", "export"] },
      { permissionKey: "crm.service-sales", path: "/dashboard/crm/service-sales", label: "Service Sales", operations: ["create", "view", "edit", "review", "approve", "confirm", "fulfillment", "billing-eligibility", "handover-ready", "move-to-trash", "delete-permanently", "print", "export"] },
      { permissionKey: "quotations.orders", path: "/dashboard/quotations/orders", label: "Work Orders", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "crm.project-handovers", path: "/dashboard/crm/project-handovers", label: "Project Handovers", operations: ["create", "view", "edit", "submit", "accept", "reject", "create-project", "cancel", "move-to-trash", "delete-permanently", "print", "export"] },
    ],
  },
  // 6. Clients
  {
    id: "peoples",
    label: "Clients",
    pages: [
      { permissionKey: "peoples.clients", path: "/dashboard/crm/clients", label: "All Clients", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "peoples.client-360", path: "/dashboard/clients/details", label: "Client 360", operations: ["view", "edit"] },
      { permissionKey: "peoples.portal-users", path: "/dashboard/clients/portal-users", label: "Portal Users", operations: ["create", "view", "edit"] },
      { permissionKey: "peoples.client-activity", path: "/dashboard/clients/activity", label: "Client Activity", operations: ["view"] },
    ],
  },
  // 7. Projects
  {
    id: "projects",
    label: "Projects",
    pages: [
      { permissionKey: "projects.projects", path: "/dashboard/projects", label: "PM Dashboard", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "projects.intake", path: "/dashboard/projects/intake", label: "Project Intake", operations: ["create", "view", "edit"] },
      { permissionKey: "projects.planning", path: "/dashboard/projects/planning", label: "Project Planning", operations: ["view", "edit"] },
      { permissionKey: "projects.milestones", path: "/dashboard/projects/milestone", label: "Milestones", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "projects.resource-allocation", path: "/dashboard/projects/resource-allocation", label: "Resource Allocation", operations: ["view", "edit"] },
      { permissionKey: "projects.wbs", path: "/dashboard/projects/wbs", label: "Work Breakdown", operations: ["view", "edit"] },
      { permissionKey: "projects.gantt", path: "/dashboard/projects/gantt", label: "Timeline/Gantt", operations: ["view", "edit"] },
      { permissionKey: "projects.dependencies", path: "/dashboard/projects/dependencies", label: "Dependencies", operations: ["view", "edit"] },
      { permissionKey: "projects.risks", path: "/dashboard/projects/risks", label: "Risk Register", operations: ["create", "view", "edit"] },
      { permissionKey: "projects.meetings", path: "/dashboard/projects/meetings", label: "Client Meetings", operations: ["create", "view", "edit"] },
      { permissionKey: "projects.change-requests", path: "/dashboard/projects/change-requests", label: "Change Requests", operations: ["create", "view", "edit"] },
      { permissionKey: "projects.client-approvals", path: "/dashboard/projects/client-approvals", label: "Client Approvals", operations: ["view", "approve"] },
      { permissionKey: "projects.billing-readiness", path: "/dashboard/projects/billing-readiness", label: "Billing Readiness", operations: ["view", "edit"] },
      { permissionKey: "projects.closure", path: "/dashboard/projects/closure", label: "Project Closure", operations: ["view", "edit"] },
      { permissionKey: "projects.all", path: "/dashboard/projects/all", label: "Projects", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "projects.work-management-tasks", path: "/dashboard/work-management/tasks", label: "Task Center", operations: ["view", "manage"] },
      { permissionKey: "projects.issues", path: "/dashboard/projects/issues", label: "Issues Board", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "projects.work-management-myday", path: "/dashboard/work-management/my-day", label: "My Day", operations: ["view", "manage"] },
      { permissionKey: "projects.work-management-team", path: "/dashboard/work-management/team", label: "My Team", operations: ["view", "manage"] },
    ],
  },
  // 8. QA
  {
    id: "qa",
    label: "QA",
    pages: [
      { permissionKey: "qa.dashboard", path: "/dashboard/qa", label: "QA Dashboard", operations: ["view"] },
      { permissionKey: "qa.test-plans", path: "/dashboard/qa/test-plans", label: "Test Plans", operations: ["create", "view", "edit"] },
      { permissionKey: "qa.test-cases", path: "/dashboard/qa/test-cases", label: "Test Cases", operations: ["create", "view", "edit"] },
      { permissionKey: "qa.test-suites", path: "/dashboard/qa/test-suites", label: "Test Suites", operations: ["create", "view", "edit"] },
      { permissionKey: "qa.test-runs", path: "/dashboard/qa/test-runs", label: "Test Runs", operations: ["create", "view", "edit"] },
      { permissionKey: "qa.bugs", path: "/dashboard/qa/bugs", label: "Bugs", operations: ["create", "view", "edit"] },
      { permissionKey: "qa.regression", path: "/dashboard/qa/regression", label: "Regression", operations: ["view", "edit"] },
      { permissionKey: "qa.uat", path: "/dashboard/qa/uat", label: "UAT", operations: ["view", "edit"] },
      { permissionKey: "qa.release-checklist", path: "/dashboard/qa/release-checklist", label: "Release Checklist", operations: ["view", "edit"] },
      { permissionKey: "qa.release-approval", path: "/dashboard/qa/release-approval", label: "Release Approval", operations: ["view", "approve"] },
    ],
  },
  // 9. Customer Success
  {
    id: "support",
    label: "Customer Success",
    pages: [
      { permissionKey: "support.dashboard", path: "/dashboard/support", label: "Support Dashboard", operations: ["view"] },
      { permissionKey: "support.tickets", path: "/dashboard/support/tickets", label: "All Tickets", operations: ["create", "view", "edit"] },
      { permissionKey: "support.my-tickets", path: "/dashboard/support/my-tickets", label: "My Tickets", operations: ["view", "edit"] },
      { permissionKey: "support.sla-warnings", path: "/dashboard/support/sla-warnings", label: "SLA Warnings", operations: ["view"] },
      { permissionKey: "support.sla-breaches", path: "/dashboard/support/sla-breaches", label: "SLA Breaches", operations: ["view"] },
      { permissionKey: "support.escalations", path: "/dashboard/support/escalations", label: "Escalations", operations: ["view", "edit"] },
      { permissionKey: "support.renewals", path: "/dashboard/support/renewals", label: "Renewals", operations: ["view", "edit"] },
      { permissionKey: "support.upsell-opportunities", path: "/dashboard/support/upsell-opportunities", label: "Upsell Opportunities", operations: ["view"] },
    ],
  },
  // 10. Billing
  {
    id: "billing",
    label: "Billing",
    pages: [
      { permissionKey: "billing.dashboard", path: "/dashboard/billing", label: "Billing Dashboard", operations: ["view"] },
      { permissionKey: "billing.plans", path: "/dashboard/billing/plans", label: "Billing Plans", operations: ["view", "edit"] },
      { permissionKey: "billing.milestones", path: "/dashboard/billing/milestones", label: "Billing Milestones", operations: ["view", "edit"] },
      { permissionKey: "billing.billable", path: "/dashboard/billing/billable", label: "Billable", operations: ["view"] },
      { permissionKey: "billing.invoiced-milestones", path: "/dashboard/billing/invoiced-milestones", label: "Invoiced Milestones", operations: ["view"] },
    ],
  },
  // 11. Finance
  {
    id: "accounts",
    label: "Finance",
    pages: [
      { permissionKey: "accounts.dashboard", path: "/dashboard/accounts", label: "Overview", operations: ["view"] },
      { permissionKey: "accounts.invoices", path: "/dashboard/accounts/invoices", label: "Invoices", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "quotations.invoices", path: "/dashboard/quotations/invoices", label: "Invoices", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "accounts.accounts-receivable", path: "/dashboard/accounts/accounts-receivable", label: "Accounts Receivable", operations: ["view", "create", "edit"] },
      { permissionKey: "accounts.collections", path: "/dashboard/accounts/collections", label: "Collections", operations: ["view", "create", "edit"] },
      { permissionKey: "accounts.accounts-payable", path: "/dashboard/accounts/accounts-payable", label: "Accounts Payable", operations: ["view", "create", "edit"] },
      { permissionKey: "accounts.chart-of-accounts", path: "/dashboard/accounts/chart-of-accounts", label: "Chart of Accounts", operations: ["view", "create", "edit"] },
      { permissionKey: "accounts.vouchers", path: "/dashboard/accounts/vouchers", label: "Vouchers", operations: ["view", "create", "edit", "approve"] },
      { permissionKey: "accounts.journal-entries", path: "/dashboard/accounts/journal-entries", label: "Journal Entries", operations: ["view", "create", "edit"] },
      { permissionKey: "accounts.ledgers", path: "/dashboard/accounts/ledgers", label: "Ledgers", operations: ["view"] },
      { permissionKey: "accounts.cash-bank", path: "/dashboard/accounts/cash-bank", label: "Cash & Bank", operations: ["view", "create", "edit"] },
      { permissionKey: "accounts.fixed-assets", path: "/dashboard/accounts/fixed-assets", label: "Asset Register", operations: ["view", "create", "edit"] },
      { permissionKey: "accounts.capitalization", path: "/dashboard/accounts/fixed-assets/capitalization", label: "Capitalization", operations: ["view", "edit"] },
      { permissionKey: "accounts.depreciation", path: "/dashboard/accounts/fixed-assets/depreciation", label: "Depreciation", operations: ["view", "edit"] },
      { permissionKey: "accounts.transfers", path: "/dashboard/accounts/fixed-assets/transfers", label: "Transfers", operations: ["view", "edit"] },
      { permissionKey: "accounts.disposals", path: "/dashboard/accounts/fixed-assets/disposals", label: "Disposals", operations: ["view", "edit"] },
      { permissionKey: "accounts.trial-balance", path: "/dashboard/accounts/trial-balance", label: "Trial Balance", operations: ["view"] },
      { permissionKey: "accounts.profit-loss", path: "/dashboard/accounts/profit-loss", label: "Profit & Loss", operations: ["view"] },
      { permissionKey: "accounts.balance-sheet", path: "/dashboard/accounts/balance-sheet", label: "Balance Sheet", operations: ["view"] },
    ],
  },
  // 12. Services & Catalog
  {
    id: "items",
    label: "Services & Catalog",
    pages: [
      { permissionKey: "items.items", path: "/dashboard/items", label: "Services", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "items.groups", path: "/dashboard/items/groups", label: "Groups", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "items.category", path: "/dashboard/items/category", label: "Categories", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "items.units", path: "/dashboard/items/units", label: "Units", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
    ],
  },
  // 13. People & HR
  {
    id: "hr",
    label: "People & HR",
    pages: [
      { permissionKey: "peoples.employees", path: "/dashboard/employees", label: "Employees", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "hr.departments", path: "/dashboard/employees/departments", label: "Departments", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "hr.designations", path: "/dashboard/employees/designations", label: "Designations", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "hr.employee-types", path: "/dashboard/employees/types", label: "Employee Types", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "hr.attendance", path: "/dashboard/hr/attendance", label: "Attendance", operations: ["view", "create", "edit", "sync"] },
      { permissionKey: "hr.roster", path: "/dashboard/hr/roster", label: "Duty Roster", operations: ["view", "create", "edit"] },
      { permissionKey: "hr.shifts", path: "/dashboard/hr/shifts", label: "Shifts", operations: ["view", "create", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "hr.holidays", path: "/dashboard/hr/holidays", label: "Holidays", operations: ["view", "create", "edit", "move-to-trash", "delete-permanently"] },
      { permissionKey: "hr.leave", path: "/dashboard/hr/leave", label: "Leave", operations: ["view", "create", "edit", "approve"] },
      { permissionKey: "hr.payroll", path: "/dashboard/hr/payroll", label: "Payroll", operations: ["view", "create", "edit", "post"] },
      { permissionKey: "hr.loans", path: "/dashboard/hr/loans", label: "Loans", operations: ["view", "create", "edit", "approve"] },
      { permissionKey: "hr.calendar", path: "/dashboard/hr/calendar", label: "HR Calendar", operations: ["view"] },
      { permissionKey: "hr.devices", path: "/dashboard/hr/attendance/devices", label: "Biometric", operations: ["view", "create", "edit", "delete-permanently"] },
    ],
  },
  // 14. Governance
  {
    id: "governance",
    label: "Governance",
    pages: [
      { permissionKey: "governance.approvals", path: "/dashboard/approvals", label: "Approval Inbox", operations: ["view", "approve"] },
      { permissionKey: "governance.my-requests", path: "/dashboard/approvals/my-requests", label: "My Requests", operations: ["view"] },
      { permissionKey: "governance.policies", path: "/dashboard/settings/approval-policies", label: "Approval Policies", operations: ["view", "edit"] },
      { permissionKey: "governance.change-requests", path: "/dashboard/governance/change-requests", label: "Change Requests", operations: ["view", "edit"] },
      { permissionKey: "governance.commercial-amendments", path: "/dashboard/governance/commercial-amendments", label: "Commercial Amendments", operations: ["view", "edit"] },
      { permissionKey: "governance.audit-logs", path: "/dashboard/system/logs", label: "Audit Logs", operations: ["view"] },
    ],
  },
  // 15. Productivity
  {
    id: "productivity",
    label: "Productivity",
    pages: [
      { permissionKey: "files", path: "/dashboard/files", label: "Files", operations: ["create", "view", "edit", "delete-permanently"] },
      { permissionKey: "notes", path: "/dashboard/notes", label: "Notes", operations: ["create", "view", "edit", "delete-permanently"] },
      { permissionKey: "docs", path: "/dashboard/docs", label: "Docs", operations: ["create", "view", "edit", "delete-permanently"] },
      { permissionKey: "notifications", path: "/dashboard/notifications", label: "Notifications", operations: ["view"] },
    ],
  },
  // 16. System Operations
  {
    id: "system",
    label: "System Operations",
    pages: [
      { permissionKey: "system.queue-jobs", path: "/dashboard/system/tasks", label: "Queue Jobs", operations: ["view", "manage"] },
      { permissionKey: "system.workers", path: "/dashboard/system/workers", label: "Workers", operations: ["view", "manage"] },
      { permissionKey: "system.storage", path: "/dashboard/system/storage", label: "Storage", operations: ["view", "manage"] },
      { permissionKey: "system.redis", path: "/dashboard/system/redis", label: "Redis", operations: ["view", "manage"] },
      { permissionKey: "system.backups", path: "/dashboard/admin/settings", label: "Backups", operations: ["view", "manage"] },
      { permissionKey: "system.health", path: "/dashboard/system/health", label: "Health", operations: ["view"] },
    ],
  },
  // 17. Administration
  {
    id: "admin",
    label: "Administration",
    pages: [
      { permissionKey: "peoples.users", path: "/dashboard/users", label: "Users", operations: ["create", "view", "edit", "move-to-trash", "delete-permanently"] },
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
        permissionKey: "settings.tex",
        path: "/dashboard/settings?section=tex",
        label: "Tex",
        operations: ["view", "edit"],
      },
      {
        permissionKey: "settings.paymentMethods",
        path: "/dashboard/settings?section=paymentMethods",
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

