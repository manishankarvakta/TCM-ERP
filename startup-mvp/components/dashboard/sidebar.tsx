"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FiHome,
  FiUsers,
  FiSettings,
  FiBarChart,
  FiFileText,
  FiUser,
  FiFolder,
  FiBell,
  FiArchive,
  FiChevronDown,
  FiChevronRight,
  FiPackage,
  FiLayers,
  FiDollarSign,
  FiShoppingCart,
  FiBook,
  FiActivity,
  FiTrendingUp,
  FiCreditCard,
  FiArrowDownRight,
  FiArrowUpRight,
  FiFile,
} from "react-icons/fi";
import Logo from "@/components/layout/logo";
import { SlCalculator } from "react-icons/sl";
import { MdOutlineCategory } from "react-icons/md";
import { NAVIGATION_STRUCTURE } from "@/types/permissions";
import type { Module } from "@/types/permissions";

interface SubMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: Module; // Module this submenu item belongs to
}

interface MenuItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subMenu?: SubMenuItem[];
  module?: Module; // Module this menu item belongs to
}

interface DashboardSidebarProps {
  visibleNavigations?: Set<string>;
  accessiblePages?: Map<string, boolean>;
}

const menuItems: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: FiHome, module: "dashboard" },
  {
    label: "Items",
    icon: FiArchive,
    module: "items",
    subMenu: [
      { href: "/dashboard/items/groups", label: "Groups", icon: FiLayers, module: "items" },
      { href: "/dashboard/items", label: "All Items", icon: FiPackage, module: "items" },
      { href: "/dashboard/items/category", label: "Categories", icon: MdOutlineCategory, module: "items" },
      { href: "/dashboard/items/units", label: "Units", icon: FiLayers, module: "items" },
    ],
  },
  {
    label: "Quotations",
    icon: FiFileText,
    module: "quotations",
    subMenu: [
      { href: "/dashboard/quotations", label: "Quotations", icon: FiFileText, module: "quotations" },
      { href: "/dashboard/quotations/invoices", label: "Invoices", icon: FiDollarSign, module: "quotations" },
      { href: "/dashboard/quotations/orders", label: "Orders", icon: FiShoppingCart, module: "quotations" },
    ],
  },
  {
    label: "Accounts",
    icon: SlCalculator,
    module: "accounts",
    subMenu: [
      { href: "/dashboard/accounts/chart-of-accounts", label: "Chart of Accounts", icon: FiBarChart, module: "accounts" },
      { href: "/dashboard/accounts/ledgers", label: "Ledgers", icon: FiBook, module: "accounts" },
      { href: "/dashboard/accounts/vouchers", label: "Vouchers", icon: FiFile, module: "accounts" },
      { href: "/dashboard/accounts/trial-balance", label: "Trial Balance", icon: FiActivity, module: "accounts" },
      { href: "/dashboard/accounts/balance-sheet", label: "Balance Sheet", icon: FiFileText, module: "accounts" },
      { href: "/dashboard/accounts/profit-loss", label: "Profit & Loss", icon: FiTrendingUp, module: "accounts" },
      { href: "/dashboard/accounts/cash-bank", label: "Cash & Bank", icon: FiCreditCard, module: "accounts" },
      { href: "/dashboard/accounts/accounts-receivable", label: "Accounts Receivable", icon: FiArrowDownRight, module: "accounts" },
      { href: "/dashboard/accounts/accounts-payable", label: "Accounts Payable", icon: FiArrowUpRight, module: "accounts" },
    ],
  },
  {
    label: "Peoples",
    icon: FiUsers,
    module: "peoples",
    subMenu: [
      { href: "/dashboard/users", label: "Users", icon: FiUser, module: "peoples" },
      { href: "/dashboard/clients", label: "Clients", icon: FiUser, module: "peoples" },
      { href: "/dashboard/suppliers", label: "Suppliers", icon: FiUser, module: "peoples" },
    ],
  },
  
  { href: "/dashboard/files", label: "Files", icon: FiFolder, module: "files" },
  { href: "/dashboard/notifications", label: "Notifications", icon: FiBell, module: "notifications" },
  { href: "/dashboard/analytics", label: "Analytics", icon: FiBarChart, module: "analytics" },
  { href: "/dashboard/reports", label: "Reports", icon: FiFileText, module: "reports" },
];

const bottomMenuItems = [
  { href: "/dashboard/profile", label: "Profile", icon: FiUser },
  { href: "/dashboard/settings", label: "Settings", icon: FiSettings },
];

// Map menu items to navigation IDs
function getNavigationIdForMenuItem(item: MenuItem): string | null {
  // Map menu items to navigation structure IDs
  const navMap: Record<string, string> = {
    "/dashboard": "dashboard",
    "items": "items",
    "quotations": "quotations",
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

// Map sub-menu href path to permission key
function getPermissionKeyFromPath(path: string): string | null {
  // Normalize path (remove query params, trailing slashes)
  const normalizedPath = path.split("?")[0].replace(/\/$/, "") || "/";
  
  // Search through NAVIGATION_STRUCTURE to find matching page
  // Try exact match first
  for (const navItem of NAVIGATION_STRUCTURE) {
    for (const page of navItem.pages) {
      const pagePath = page.path.split("?")[0].replace(/\/$/, "") || "/";
      // Exact match
      if (pagePath === normalizedPath) {
        return page.permissionKey;
      }
      // Check if path starts with page path (for nested routes like /dashboard/items/add)
      if (normalizedPath.startsWith(pagePath + "/")) {
        return page.permissionKey;
      }
    }
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
          // Find the page that matches this path
          const matchingPage = navItem.pages.find((p) => {
            const pPath = p.path.split("?")[0].replace(/\/$/, "") || "/";
            return pPath === normalizedPath || normalizedPath.startsWith(pPath + "/");
          });
          if (matchingPage) return matchingPage.permissionKey;
          // If no exact match, return the first page (main page)
          if (navItem.pages.length > 0) {
            return navItem.pages[0].permissionKey;
          }
        }
      }
    }
  } else if (normalizedPath === "/dashboard" || normalizedPath === "/dashboard/") {
    return "dashboard";
  }
  
  return null;
}

export default function DashboardSidebar({
  visibleNavigations = new Set(),
  accessiblePages = new Map(),
}: DashboardSidebarProps) {
  const pathname = usePathname();
  
  // Check if user has no permissions (only dashboard and profile accessible)
  // User has no permissions if:
  // 1. Only dashboard and profile are in visibleNavigations
  // 2. Only dashboard and profile are in accessiblePages
  const hasNoPermissions = 
    visibleNavigations.size === 2 &&
    visibleNavigations.has("dashboard") &&
    visibleNavigations.has("profile") &&
    accessiblePages.size === 2 &&
    accessiblePages.has("dashboard") &&
    accessiblePages.has("profile");
  
  // Filter menu items based on navigation visibility and page access
  let filteredMenuItems: MenuItem[];
  let filteredBottomMenuItems = bottomMenuItems;
  
  if (hasNoPermissions) {
    // User has no permissions - show only Dashboard and Profile
    filteredMenuItems = menuItems.filter((item) => {
      const navId = getNavigationIdForMenuItem(item);
      return navId === "dashboard" || navId === "profile";
    });
    
    // Bottom menu: only show Profile (hide Settings)
    filteredBottomMenuItems = bottomMenuItems.filter(
      (item) => item.href === "/dashboard/profile"
    );
  } else {
    // User has permissions - use normal filtering
    filteredMenuItems = menuItems.map((item) => {
      // Create a copy of the item to avoid mutating the original
      const itemCopy = { ...item };
      
      const navId = getNavigationIdForMenuItem(item);
      if (!navId) return itemCopy; // Return copy if can't map
      
      // Check if navigation is visible
      const navItem = NAVIGATION_STRUCTURE.find((nav) => nav.id === navId);
      if (navItem?.alwaysVisible) {
          // For always visible items, still filter sub-menu items based on permissions
          if (itemCopy.subMenu) {
            itemCopy.subMenu = itemCopy.subMenu.filter((subItem) => {
              const permissionKey = getPermissionKeyFromPath(subItem.href);
              if (!permissionKey) {
                // If we can't map the path to a permission key, hide it
                return false;
              }
              // Check if page is accessible
              // accessiblePages map should contain all pages from NAVIGATION_STRUCTURE
              // If permission doesn't exist or has no operations, it's set to false
              // Only pages with hasAccess === true should be shown
              const hasAccess = accessiblePages.get(permissionKey);
              // Explicitly check for true - undefined or false means hide
              if (hasAccess !== true) {
                return false;
              }
              return true;
            });
          }
        return itemCopy;
      }
      
      // Check if navigation is visible
      if (!visibleNavigations.has(navId)) return null;
      
        // Filter sub-menu items based on page access
        // This ensures sub-pages without permissions are hidden from navigation
        if (itemCopy.subMenu) {
          itemCopy.subMenu = itemCopy.subMenu.filter((subItem) => {
            const permissionKey = getPermissionKeyFromPath(subItem.href);
            if (!permissionKey) {
              // If we can't map the path to a permission key, hide it
              return false;
            }
            // Check if page is accessible
            // accessiblePages map should contain all pages from NAVIGATION_STRUCTURE
            // If permission doesn't exist or has no operations, it's set to false
            // Only pages with hasAccess === true should be shown
            const hasAccess = accessiblePages.get(permissionKey);
            
            // CRITICAL: Only show if explicitly set to true
            // undefined or false means the permission doesn't exist or has no operations
            // This ensures unselected permissions are hidden
            if (hasAccess !== true) {
              return false;
            }
            return true;
          });
          // Only show parent navigation item if it has at least one accessible sub-item
          if (itemCopy.subMenu.length === 0) return null;
        }
      
      // For items without sub-menu, check page access
      if (itemCopy.href) {
        const permissionKey = getPermissionKeyFromPath(itemCopy.href);
        if (permissionKey) {
          // Check if page is accessible
          const hasAccess = accessiblePages.get(permissionKey);
          if (hasAccess !== true) return null;
        }
      }
      
      return itemCopy;
    }).filter((item): item is MenuItem => item !== null);
  }
  
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    // Auto-expand menus if current path matches any sub-menu
    const expanded = new Set<string>();
    menuItems.forEach((item) => {
      if (item.subMenu) {
        const hasActiveChild = item.subMenu.some((subItem) => {
          // Exact match or pathname starts with subItem.href followed by / or end of string
          if (pathname === subItem.href) return true;
          if (pathname?.startsWith(subItem.href)) {
            const nextChar = pathname[subItem.href.length];
            return nextChar === '/' || nextChar === undefined;
          }
          return false;
        });
        if (hasActiveChild) {
          expanded.add(item.label);
        }
      }
    });
    return expanded;
  });

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isMenuExpanded = (label: string) => expandedMenus.has(label);

  const isSubMenuActive = (subMenu: SubMenuItem[]) => {
    return subMenu.some((subItem) => {
      // Exact match only - this ensures parent highlights when child is active
      return pathname === subItem.href;
    });
  };

  return (
    <aside className="hidden w-64 border-r bg-background lg:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Logo width={150} height={100} />
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            
            if (item.subMenu) {
              const isExpanded = isMenuExpanded(item.label);
              const hasActiveChild = isSubMenuActive(item.subMenu);
              
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      hasActiveChild
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {isExpanded ? (
                      <FiChevronDown className="h-4 w-4" />
                    ) : (
                      <FiChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                      {item.subMenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        // Only exact match for sub-menu items to avoid false positives
                        // e.g., /dashboard/items should not be active when on /dashboard/items/units
                        const isActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <SubIcon className="h-4 w-4" />
                            <span>{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (!item.href) return null;
            
            // For exact match or check if pathname starts with href
            // Special handling for /dashboard to only match exactly
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 space-y-1">
          {filteredBottomMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}