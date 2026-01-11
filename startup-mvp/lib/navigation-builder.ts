import { NAVIGATION_STRUCTURE } from "@/types/permissions";

// Menu item structure with icon as string (to be mapped on client side)
export interface MenuItemData {
  href?: string;
  label: string;
  icon: string;
  subMenu?: SubMenuItemData[];
  module?: string;
}

export interface SubMenuItemData {
  href: string;
  label: string;
  icon: string;
  module?: string;
}

// Master menu template - the complete menu structure
// This is the single source of truth for menu items
export const MENU_TEMPLATE: MenuItemData[] = [
  { href: "/dashboard", label: "Dashboard", icon: "FiHome", module: "dashboard" },
  {
    label: "Items",
    icon: "FiArchive",
    module: "items",
    subMenu: [
      { href: "/dashboard/items/groups", label: "Groups", icon: "FiLayers", module: "items" },
      { href: "/dashboard/items", label: "All Items", icon: "FiPackage", module: "items" },
      { href: "/dashboard/items/category", label: "Categories", icon: "MdOutlineCategory", module: "items" },
      { href: "/dashboard/items/units", label: "Units", icon: "FiLayers", module: "items" },
    ],
  },
  {
    label: "Quotations",
    icon: "FiFileText",
    module: "quotations",
    subMenu: [
      { href: "/dashboard/quotations", label: "Quotations", icon: "FiFileText", module: "quotations" },
      { href: "/dashboard/quotations/invoices", label: "Invoices", icon: "FiDollarSign", module: "quotations" },
      { href: "/dashboard/quotations/orders", label: "Orders", icon: "FiShoppingCart", module: "quotations" },
      { href: "/dashboard/work-orders", label: "Work Orders", icon: "FiBriefcase", module: "work-orders" },
    ],
  },
  {
    label: "Accounts",
    icon: "SlCalculator",
    module: "accounts",
    subMenu: [
      { href: "/dashboard/accounts/chart-of-accounts", label: "Chart of Accounts", icon: "FiBarChart", module: "accounts" },
      { href: "/dashboard/accounts/ledgers", label: "Ledgers", icon: "FiBook", module: "accounts" },
      { href: "/dashboard/accounts/vouchers", label: "Vouchers", icon: "FiFile", module: "accounts" },
      { href: "/dashboard/accounts/trial-balance", label: "Trial Balance", icon: "FiActivity", module: "accounts" },
      { href: "/dashboard/accounts/balance-sheet", label: "Balance Sheet", icon: "FiFileText", module: "accounts" },
      { href: "/dashboard/accounts/profit-loss", label: "Profit & Loss", icon: "FiTrendingUp", module: "accounts" },
      { href: "/dashboard/accounts/cash-bank", label: "Cash & Bank", icon: "FiCreditCard", module: "accounts" },
      { href: "/dashboard/accounts/accounts-receivable", label: "Accounts Receivable", icon: "FiArrowDownRight", module: "accounts" },
      { href: "/dashboard/accounts/accounts-payable", label: "Accounts Payable", icon: "FiArrowUpRight", module: "accounts" },
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
    ],
  },
  { href: "/dashboard/files", label: "Files", icon: "FiFolder", module: "files" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "FiBell", module: "notifications" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "FiBarChart", module: "analytics" },
  { href: "/dashboard/reports", label: "Reports", icon: "FiFileText", module: "reports" },
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
      return `${moduleName}.${subModule}`;
    } else if (pathParts.length === 1) {
      const moduleName = pathParts[0];
      
      // Check if it's a direct module page
      if (["files", "notifications", "analytics", "reports", "profile", "settings"].includes(moduleName)) {
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
    "items": "items",
    "quotations": "quotations",
    "work-orders": "work-orders",
    "accounts": "accounts",
    "peoples": "peoples",
    "/dashboard/files": "files",
    "/dashboard/notifications": "notifications",
    "/dashboard/analytics": "analytics",
    "/dashboard/reports": "reports",
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

