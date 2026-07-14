import type { Operation } from "@/types/permissions";

/**
 * Map operation to equivalent operations for backward compatibility
 */
export function mapOperation(operation: Operation): Operation[] {
  return [operation];
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
    // Master Data
    "/dashboard/master/categories": "master.categories",
    "/dashboard/master/brands": "master.brands",
    "/dashboard/master/units": "master.units",
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
    // Other modules
    "/dashboard/files": "files",
    "/dashboard/notifications": "notifications",
    "/dashboard/analytics": "analytics",
    "/dashboard/reports": "reports",
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

