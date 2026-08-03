import { NAVIGATION_STRUCTURE } from "@/types/permissions";

// Menu item structure with icon as string (to be mapped on client side)
export interface MenuItemData {
  href?: string;
  label: string;
  icon: string;
  subMenu?: SubMenuItemData[];
  subMenuGroups?: SubMenuGroup[];
  module?: string;
}

export interface SubMenuItemData {
  href: string;
  label: string;
  icon: string;
  module?: string;
}

export interface SubMenuGroup {
  label: string;
  items: SubMenuItemData[];
}

// Master menu template - the complete menu structure
// This is the single source of truth for menu items
export const MENU_TEMPLATE: MenuItemData[] = [
  { href: "/dashboard", label: "Dashboard", icon: "FiHome", module: "dashboard" },
  {
    label: "Master Data",
    icon: "FiDatabase",
    module: "master",
    subMenu: [
      { href: "/dashboard/master/items", label: "Items", icon: "FiPackage", module: "master" },
      { href: "/dashboard/master/categories", label: "Categories", icon: "MdOutlineCategory", module: "master" },
      { href: "/dashboard/master/brands", label: "Brands", icon: "FiTag", module: "master" },
      { href: "/dashboard/master/units", label: "Units", icon: "FiLayers", module: "master" },
      { href: "/dashboard/master/warehouses", label: "Warehouses", icon: "FiHome", module: "master" },
      { href: "/dashboard/import", label: "Data Import", icon: "FiUploadCloud", module: "master" },
    ],
  },
  {
    label: "Procurements",
    icon: "FiShoppingCart",
    module: "procurements",
    subMenu: [
      { href: "/dashboard/procurements", label: "Dashboard", icon: "FiPieChart", module: "procurements" },
      { href: "/dashboard/procurements/purchases", label: "Purchases", icon: "FiShoppingCart", module: "procurements" },
      { href: "/dashboard/procurements/grn", label: "Goods Receipt", icon: "FiTruck", module: "procurements" },
      { href: "/dashboard/procurements/tpn", label: "Transfer Notes", icon: "FiNavigation", module: "procurements" },
      { href: "/dashboard/procurements/rtv", label: "Returns (RTV)", icon: "FiCornerUpLeft", module: "procurements" },
    ],
  },
  {
    label: "Sales",
    icon: "FiDollarSign",
    module: "sales",
    subMenu: [
      { href: "/dashboard/sales", label: "Sales", icon: "FiDollarSign", module: "sales" },
      { href: "/dashboard/sales/pos", label: "POS", icon: "FiShoppingBag", module: "sales" },
      { href: "/dashboard/sales/ecommerce", label: "E-commerce Orders", icon: "FiShoppingBag", module: "sales" },
      { href: "/dashboard/sales/coupons", label: "Coupons", icon: "FiTag", module: "sales" },
      { href: "/dashboard/sales/daybook", label: "Daybook / closing", icon: "FiBookOpen", module: "sales" },
    ],
  },
  {
    label: "Accounts",
    icon: "SlCalculator",
    module: "accounts",
    subMenuGroups: [
      {
        label: "Setup",
        items: [
          { href: "/dashboard/accounts/chart-of-accounts", label: "Chart of Accounts", icon: "FiBarChart", module: "accounts" },
          { href: "/dashboard/accounts/cash-bank", label: "Cash & Bank", icon: "FiCreditCard", module: "accounts" },
        ],
      },
      {
        label: "Transactions",
        items: [
          { href: "/dashboard/accounts/vouchers", label: "Vouchers", icon: "FiFile", module: "accounts" },
        ],
      },
      {
        label: "Ledgers",
        items: [
          { href: "/dashboard/accounts/ledgers", label: "Account Ledger", icon: "FiBook", module: "accounts" },
        ],
      },
      {
        label: "Reports",
        items: [
          { href: "/dashboard/accounts/trial-balance", label: "Trial Balance", icon: "FiActivity", module: "accounts" },
          { href: "/dashboard/accounts/balance-sheet", label: "Balance Sheet", icon: "FiFileText", module: "accounts" },
          { href: "/dashboard/accounts/profit-loss", label: "Profit & Loss", icon: "FiTrendingUp", module: "accounts" },
        ],
      },
      {
        label: "Receivables",
        items: [
          { href: "/dashboard/accounts/accounts-receivable", label: "Accounts Receivable", icon: "FiArrowDownRight", module: "accounts" },
        ],
      },
      {
        label: "Payables",
        items: [
          { href: "/dashboard/accounts/accounts-payable", label: "Accounts Payable", icon: "FiArrowUpRight", module: "accounts" },
        ],
      },
    ],
  },
  {
    label: "Peoples",
    icon: "FiUsers",
    module: "peoples",
    subMenu: [
      { href: "/dashboard/users", label: "Users", icon: "FiUser", module: "peoples" },
      { href: "/dashboard/clients", label: "Clients", icon: "FiUser", module: "peoples" },
      { href: "/dashboard/suppliers", label: "Suppliers", icon: "FiUser", module: "peoples" },
      { href: "/dashboard/employees", label: "Employees", icon: "FiUser", module: "peoples" },
    ],
  },
  {
    label: "HR & Payroll",
    icon: "FiUsers",
    module: "hr",
    subMenu: [
      { href: "/dashboard/hr/shifts", label: "Shifts", icon: "FiBox", module: "hr" },
      { href: "/dashboard/hr/holidays", label: "Holidays", icon: "FiCalendar", module: "hr" },
      { href: "/dashboard/hr/attendance", label: "Attendance", icon: "FiClipboard", module: "hr" },
      { href: "/dashboard/hr/leave", label: "Leave", icon: "FiFileText", module: "hr" },
      { href: "/dashboard/hr/resignation", label: "Resignation", icon: "FiFileText", module: "hr" },
      { href: "/dashboard/hr/payroll", label: "Payroll", icon: "FiDollarSign", module: "hr" },
      { href: "/dashboard/hr/loans", label: "Loans", icon: "FiCreditCard", module: "hr" },
      { href: "/dashboard/hr/fines", label: "Fines & Penalties", icon: "FiAlertTriangle", module: "hr" },
      { href: "/dashboard/hr/bonuses", label: "Bonuses & Rewards", icon: "FiAward", module: "hr" },
      { href: "/dashboard/hr/biometric/devices", label: "Biometric Devices", icon: "FiCpu", module: "hr" },
      // The following routes are preserved for backward compatibility and admin direct access, 
      // but hidden from the normal HR user's sidebar to simplify the UI experience.
      // { href: "/dashboard/hr/biometric/mapping", label: "Device Mapping", icon: "FiLink", module: "hr" },
      // { href: "/dashboard/hr/biometric/raw-logs", label: "Raw Logs", icon: "FiDatabase", module: "hr" },
      // { href: "/dashboard/hr/biometric/unmapped-logs", label: "Unmapped Logs", icon: "FiAlertCircle", module: "hr" },
      // { href: "/dashboard/hr/biometric/sync-history", label: "Sync History", icon: "FiRefreshCw", module: "hr" },
    ],
  },
  {
    label: "Inventory",
    icon: "FiPackage",
    module: "inventory",
    subMenu: [
      { 
        href: "/dashboard/inventory/stock", 
        label: "Stock", 
        icon: "FiBox", 
        module: "inventory" 
      },
      { 
        href: "/dashboard/inventory/stock/ledger", 
        label: "Stock Ledger", 
        icon: "FiFileText", 
        module: "inventory" 
      },
      { 
        href: "/dashboard/reports/inventory/stock-movements", 
        label: "Stock Movements", 
        icon: "FiTrendingUp", 
        module: "inventory" 
      },
      { 
        href: "/dashboard/inventory/adjustments", 
        label: "Adjustments", 
        icon: "FiClipboard", 
        module: "inventory" 
      },
      { 
        href: "/dashboard/inventory/damage", 
        label: "Damage", 
        icon: "FiAlertTriangle", 
        module: "inventory" 
      },
      { 
        href: "/dashboard/inventory/count", 
        label: "Inventory Count", 
        icon: "FiCheckSquare", 
        module: "inventory" 
      },
    ],
  },
  {
    label: "Production",
    icon: "FiSettings",
    module: "production",
    subMenu: [
      { 
        href: "/dashboard/production/boms", 
        label: "Bill of Materials", 
        icon: "FiList", 
        module: "production" 
      },
      { 
        href: "/dashboard/production/orders", 
        label: "Production Orders", 
        icon: "FiPackage", 
        module: "production" 
      },
      { 
        href: "/dashboard/production/cutting", 
        label: "Cutting Room", 
        icon: "FiScissors", 
        module: "production" 
      },
      { 
        href: "/dashboard/production/sewing", 
        label: "Sewing Tracker", 
        icon: "FiActivity", 
        module: "production" 
      },
      { 
        href: "/dashboard/production/quality", 
        label: "Quality Check", 
        icon: "FiClipboard", 
        module: "production" 
      },
    ],
  },
  { href: "/dashboard/files", label: "Files", icon: "FiFolder", module: "files" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "FiBell", module: "notifications" },
  {
    label: "Reports",
    icon: "FiBarChart",
    module: "reports",
    subMenuGroups: [
      {
        label: "Inventory",
        items: [
          { href: "/dashboard/reports/inventory/stock-summary", label: "Stock Summary", icon: "FiPackage", module: "reports" },
          { href: "/dashboard/reports/inventory/stock-ledger", label: "Stock Ledger", icon: "FiFileText", module: "reports" },
          { href: "/dashboard/reports/inventory/raw-material-consumption", label: "Raw Material Consumption", icon: "FiBox", module: "reports" },
        ],
      },
      {
        label: "Production",
        items: [
          { href: "/dashboard/reports/production/production-order-summary", label: "Production Order Summary", icon: "FiList", module: "reports" },
          { href: "/dashboard/reports/production/cost-per-batch", label: "Cost Per Batch", icon: "FiDollarSign", module: "reports" },
        ],
      },
      {
        label: "Sales",
        items: [
          { href: "/dashboard/reports/sales/revenue-by-client", label: "Revenue by Client", icon: "FiUsers", module: "reports" },
          { href: "/dashboard/reports/sales/revenue-by-item", label: "Revenue by Item", icon: "FiPackage", module: "reports" },
          { href: "/dashboard/reports/sales/sales-trends", label: "Sales Trends", icon: "FiTrendingUp", module: "reports" },
        ],
      },
      {
        label: "Analytics",
        items: [
          { href: "/dashboard/reports/analytics", label: "Analytics Dashboard", icon: "FiBarChart", module: "reports" },
        ],
      },
    ],
  },
];

export const BOTTOM_MENU_TEMPLATE: MenuItemData[] = [
  { href: "/dashboard/profile", label: "Profile", icon: "FiUser" },
  { href: "/dashboard/settings", label: "Settings", icon: "FiSettings" },
];

/**
 * Map menu item href path to permission key
 * This function extracts the permission key from a menu item path
 */
export function getPermissionKeyFromPath(path: string): string | null {
  // Normalize path (remove query params, trailing slashes)
  const normalizedPath = path.split("?")[0].replace(/\/$/, "") || "/";
  
  if (normalizedPath === "/dashboard/inventory/count") {
    return "inventory.count.scanner";
  }

  // Handle dashboard root path first
  if (normalizedPath === "/dashboard") {
    return "dashboard";
  }
  
  // Search through NAVIGATION_STRUCTURE to find matching page
  // We need to check exact matches first, then prefix matches
  // IMPORTANT: Don't match /dashboard as a prefix for other paths
  let prefixMatch: string | null = null;
  let prefixMatchPath: string | null = null;
  
  for (const navItem of NAVIGATION_STRUCTURE) {
    for (const page of navItem.pages) {
      const pagePath = page.path.split("?")[0].replace(/\/$/, "") || "/";
      
      // Skip /dashboard when checking prefix matches (it would match everything)
      if (pagePath === "/dashboard") {
        continue;
      }
      
      // Exact match - return immediately
      if (pagePath === normalizedPath) {
        return page.permissionKey;
      }
      
      // Check if path starts with page path (for nested routes)
      // Keep track of the longest matching path to get the most specific match
      if (normalizedPath.startsWith(pagePath + "/")) {
        if (!prefixMatchPath || pagePath.length > prefixMatchPath.length) {
          prefixMatch = page.permissionKey;
          prefixMatchPath = pagePath;
        }
      }
    }
  }
  
  // If we found a prefix match, return it
  if (prefixMatch) {
    return prefixMatch;
  }
  
  // Fallback: try to extract from path structure
  // e.g., "/dashboard/items/groups" -> "items.groups"
  if (normalizedPath.startsWith("/dashboard/")) {
    const pathWithoutDashboard = normalizedPath.replace("/dashboard/", "");
    const pathParts = pathWithoutDashboard.split("/").filter(Boolean);
    
    if (pathParts.length >= 2) {
      // e.g., ["items", "groups"] -> "items.groups"
      const moduleName = pathParts[0];
      const subModule = pathParts[1];
      
      // Special case for HR biometric devices
      if (moduleName === "hr" && subModule === "biometric") {
        const pageName = pathParts[2];
        if (pageName === "devices") return "hr.biometric.view";
        if (pageName === "mapping") return "hr.biometric.manage";
        if (pageName === "raw-logs") return "hr.biometric.view";
        if (pageName === "unmapped-logs") return "hr.biometric.manage";
        if (pageName === "sync-history") return "hr.biometric.view";
      }
      
      return `${moduleName}.${subModule}`;
    } else if (pathParts.length === 1) {
      const moduleName = pathParts[0];
      
      // Check if it's a direct module page
      if (["files", "notifications", "analytics", "reports", "profile", "settings", "hr"].includes(moduleName)) {
        return moduleName;
      }
      
      // For items, quotations, accounts, peoples - find the main page
      for (const navItem of NAVIGATION_STRUCTURE) {
        if (navItem.id === moduleName) {
          const matchingPage = navItem.pages.find((p) => {
            const pPath = p.path.split("?")[0].replace(/\/$/, "") || "/";
            return pPath === normalizedPath || normalizedPath.startsWith(pPath + "/");
          });
          if (matchingPage) {
            return matchingPage.permissionKey;
          }
          if (navItem.pages.length > 0) {
            return navItem.pages[0].permissionKey;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Map menu items to navigation IDs
 */
function getNavigationIdForMenuItem(item: MenuItemData): string | null {
  const navMap: Record<string, string> = {
    "/dashboard": "dashboard",
    "master": "master",
    "procurements": "procurements",
    "sales": "sales",
    "accounts": "accounts",
    "peoples": "peoples",
    "hr": "hr",
    "inventory": "inventory",
    "production": "production",
    "/dashboard/files": "files",
    "/dashboard/notifications": "notifications",
    "/dashboard/reports": "reports.view",
    "/dashboard/hr": "hr",
  };
  
  if (item.href) {
    return navMap[item.href] || null;
  }
  if (item.module) {
    return navMap[item.module] || item.module;
  }
  return null;
}

/**
 * Build filtered menu structure based on user permissions
 * This is the main function that filters the menu template
 * 
 * @param accessiblePages - Map of permission keys to boolean (true = accessible)
 * @param visibleNavigations - Set of visible navigation IDs
 * @returns Object with filtered main menu and bottom menu items
 */
export function buildFilteredMenu(
  accessiblePages: Map<string, boolean>,
  visibleNavigations: Set<string>
): { mainMenu: MenuItemData[]; bottomMenu: MenuItemData[] } {
  
  // Check if user has no permissions (only dashboard and profile accessible)
  const hasNoPermissions = 
    visibleNavigations.size === 2 &&
    visibleNavigations.has("dashboard") &&
    visibleNavigations.has("profile") &&
    accessiblePages.size === 2 &&
    accessiblePages.has("dashboard") &&
    accessiblePages.has("profile");
  
  let filteredMainMenu: MenuItemData[];
  let filteredBottomMenu: MenuItemData[];
  
  if (hasNoPermissions) {
    // User has no permissions - only show Dashboard and Profile
    filteredMainMenu = MENU_TEMPLATE.filter((item) => {
      const navId = getNavigationIdForMenuItem(item);
      return navId === "dashboard";
    });
    
    filteredBottomMenu = BOTTOM_MENU_TEMPLATE.filter(
      (item) => item.href === "/dashboard/profile"
    );
  } else {
    // User has permissions - filter based on access
    filteredMainMenu = MENU_TEMPLATE.map((item) => {
      // Deep copy the item
      const itemCopy: MenuItemData = {
        ...item,
        subMenu: item.subMenu ? [...item.subMenu] : undefined,
        subMenuGroups: item.subMenuGroups ? item.subMenuGroups.map(group => ({
          ...group,
          items: [...group.items]
        })) : undefined,
      };
      
      const navId = getNavigationIdForMenuItem(item);
      
      // Filter submenus based on permissions
      if (itemCopy.subMenu) {
        itemCopy.subMenu = itemCopy.subMenu.filter((subItem) => {
          const permissionKey = getPermissionKeyFromPath(subItem.href);
          
          if (!permissionKey) {
            return false;
          }
          
          const hasAccess = accessiblePages.get(permissionKey);
          
          // Only show if explicitly set to true
          return hasAccess === true;
        });
        
        // If no accessible submenu items, hide the parent menu item
        if (itemCopy.subMenu.length === 0) {
          return null;
        }
      }
      
      // Filter submenu groups based on permissions
      if (itemCopy.subMenuGroups) {
        itemCopy.subMenuGroups = itemCopy.subMenuGroups.map((group) => {
          // Filter items within each group
          const filteredItems = group.items.filter((subItem) => {
            const permissionKey = getPermissionKeyFromPath(subItem.href);
            
            if (!permissionKey) {
              return false;
            }
            
            const hasAccess = accessiblePages.get(permissionKey);
            
            // Only show if explicitly set to true
            return hasAccess === true;
          });
          
          return {
            ...group,
            items: filteredItems,
          };
        }).filter((group) => group.items.length > 0); // Remove empty groups
        
        // If no accessible groups, hide the parent menu item
        if (itemCopy.subMenuGroups.length === 0) {
          return null;
        }
      }
      
      // Check navigation visibility
      if (!navId) {
        return itemCopy;
      }
      
      // Check if navigation is always visible
      const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === navId);
      if (navItem?.alwaysVisible) {
        return itemCopy;
      }
      
      // Check if navigation is in visible set
      if (!visibleNavigations.has(navId)) {
        return null;
      }
      
      // For items without sub-menu, check page access
      if (itemCopy.href) {
        const permissionKey = getPermissionKeyFromPath(itemCopy.href);
        if (permissionKey) {
          const hasAccess = accessiblePages.get(permissionKey);
          if (hasAccess !== true) {
            return null;
          }
        }
      }
      
      return itemCopy;
    }).filter((item): item is MenuItemData => item !== null);
    
    // Filter bottom menu (Settings requires permissions)
    filteredBottomMenu = BOTTOM_MENU_TEMPLATE;
  }
  
  return {
    mainMenu: filteredMainMenu,
    bottomMenu: filteredBottomMenu,
  };
}

