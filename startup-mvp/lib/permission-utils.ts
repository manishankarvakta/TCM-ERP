import type { Operation } from "@/types/permissions";

/**
 * Map operation to equivalent operations for backward compatibility
 */
export function mapOperation(operation: Operation): Operation[] {
  const ops: Operation[] = [operation];
  if (operation === "read") ops.push("view");
  if (operation === "view") ops.push("read");
  if (operation === "update") ops.push("edit");
  if (operation === "edit") ops.push("update");
  if (operation === "delete") ops.push("move-to-trash", "delete-permanently");
  return ops;
}


/**
 * Map URL path to permission key
 */
export function getPathPermissionKey(pathname: string): string | null {
  // Dashboard is always accessible
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "dashboard";
  }

  // Map paths to permission keys
  const pathMappings: Record<string, string> = {
    // Items
    "/dashboard/items": "items.items",
    "/dashboard/items/groups": "items.groups",
    "/dashboard/items/category": "items.category",
    "/dashboard/items/units": "items.units",
    // Quotations
    "/dashboard/quotations": "quotations.quotations",
    "/dashboard/quotations/invoices": "quotations.invoices",
    "/dashboard/quotations/orders": "quotations.orders",
    // Accounts
    "/dashboard/accounts/chart-of-accounts": "accounts.chart-of-accounts",
    "/dashboard/accounts/ledgers": "accounts.ledgers",
    "/dashboard/accounts/vouchers": "accounts.vouchers",
    "/dashboard/accounts/trial-balance": "accounts.trial-balance",
    "/dashboard/accounts/balance-sheet": "accounts.balance-sheet",
    "/dashboard/accounts/profit-loss": "accounts.profit-loss",
    "/dashboard/accounts/cash-bank": "accounts.cash-bank",
    "/dashboard/accounts/accounts-receivable": "accounts.accounts-receivable",
    "/dashboard/accounts/accounts-payable": "accounts.accounts-payable",
    // Peoples
    "/dashboard/users": "peoples.users",
    "/dashboard/clients": "peoples.clients",
    "/dashboard/suppliers": "peoples.suppliers",
    "/dashboard/employees": "peoples.employees",
    // HR & Payroll
    "/dashboard/hr/attendance/devices": "hr.devices",
    "/dashboard/hr/attendance": "hr.attendance",
    "/dashboard/hr/shifts": "hr.shifts",
    "/dashboard/hr/holidays": "hr.holidays",
    "/dashboard/hr/leave": "hr.leave",
    "/dashboard/hr/loans": "hr.loans",
    "/dashboard/hr/payroll": "hr.payroll",
    "/dashboard/hr/calendar": "hr.calendar",
    // Other modules
    "/dashboard/files": "files",
    "/dashboard/notifications": "notifications",
    "/dashboard/analytics": "analytics",
    "/dashboard/reports": "reports",
    // Integrations & Automation
    "/dashboard/integrations/connections": "integrations.connections",
    "/dashboard/integrations/webhooks": "integrations.webhooks",
    "/dashboard/integrations/automations": "integrations.automations",
    "/dashboard/integrations/logs": "integrations.logs",
  };

  // Check exact match first
  if (pathMappings[pathname]) {
    return pathMappings[pathname];
  }

  // Check if path starts with any mapping (for nested routes)
  for (const [path, key] of Object.entries(pathMappings)) {
    if (pathname.startsWith(path + "/") || pathname === path) {
      return key;
    }
  }

  return null;
}

