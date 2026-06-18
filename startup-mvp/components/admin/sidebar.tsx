"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setSidebarOpen } from "@/lib/redux/slices/uiSlice";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
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
  FiBriefcase,
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

interface SubMenuGroup {
  label: string;
  items: SubMenuItem[];
}

interface MenuItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subMenu?: SubMenuItem[];
  subMenuGroups?: SubMenuGroup[];
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
    module: "items" as any,
    subMenu: [
      { href: "/dashboard/items/groups", label: "Groups", icon: FiLayers, module: "items" as any },
      { href: "/dashboard/items", label: "All Items", icon: FiPackage, module: "items" as any },
      { href: "/dashboard/items/category", label: "Categories", icon: MdOutlineCategory, module: "items" as any },
      { href: "/dashboard/items/units", label: "Units", icon: FiLayers, module: "items" as any },
    ],
  },
  { href: "/dashboard/procurements/purchases", label: "Purchases", icon: FiShoppingCart, module: "procurements" as any },
  {
    label: "Accounts",
    icon: SlCalculator,
    module: "accounts",
    subMenuGroups: [
      {
        label: "Setup",
        items: [
          { href: "/dashboard/accounts/chart-of-accounts", label: "Chart of Accounts", icon: FiBarChart, module: "accounts" },
          { href: "/dashboard/accounts/cash-bank", label: "Cash & Bank", icon: FiCreditCard, module: "accounts" },
        ],
      },
      {
        label: "Transactions",
        items: [
          { href: "/dashboard/accounts/vouchers", label: "Vouchers", icon: FiFile, module: "accounts" },
        ],
      },
      {
        label: "Ledgers",
        items: [
          { href: "/dashboard/accounts/ledgers", label: "Account Ledger", icon: FiBook, module: "accounts" },
        ],
      },
      {
        label: "Reports",
        items: [
          { href: "/dashboard/accounts/trial-balance", label: "Trial Balance", icon: FiActivity, module: "accounts" },
          { href: "/dashboard/accounts/balance-sheet", label: "Balance Sheet", icon: FiFileText, module: "accounts" },
          { href: "/dashboard/accounts/profit-loss", label: "Profit & Loss", icon: FiTrendingUp, module: "accounts" },
        ],
      },
      {
        label: "Receivables",
        items: [
          { href: "/dashboard/accounts/accounts-receivable", label: "Accounts Receivable", icon: FiArrowDownRight, module: "accounts" },
        ],
      },
      {
        label: "Payables",
        items: [
          { href: "/dashboard/accounts/accounts-payable", label: "Accounts Payable", icon: FiArrowUpRight, module: "accounts" },
        ],
      },
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
      { href: "/dashboard/employees", label: "Employees", icon: FiUser, module: "peoples" },
    ],
  },
  
  { href: "/dashboard/files", label: "Files", icon: FiFolder, module: "files" },
  { href: "/dashboard/notifications", label: "Notifications", icon: FiBell, module: "notifications" },
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
    const pathWithoutAdmin = normalizedPath.replace("/dashboard/", "");
    const pathParts = pathWithoutAdmin.split("/").filter(Boolean);
    
    if (pathParts.length >= 2) {
      // e.g., ["items", "groups"] -> "items.groups"
      const moduleName = pathParts[0];
      const subModule = pathParts[1];
      return `${moduleName}.${subModule}`;
    } else if (pathParts.length === 1) {
      const moduleName = pathParts[0];
      // Check if it's a direct module page
      if (["files", "notifications", "reports", "profile", "settings"].includes(moduleName)) {
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

  const dispatch = useAppDispatch();
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  
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
          // Filter sub-menu groups based on permissions
          if (itemCopy.subMenuGroups) {
            itemCopy.subMenuGroups = itemCopy.subMenuGroups.map((group) => {
              // Filter items within each group
              const filteredItems = group.items.filter((subItem) => {
                const permissionKey = getPermissionKeyFromPath(subItem.href);
                if (!permissionKey) {
                  return false;
                }
                const hasAccess = accessiblePages.get(permissionKey);
                if (hasAccess !== true) {
                  return false;
                }
                return true;
              });
              return {
                ...group,
                items: filteredItems,
              };
            }).filter((group) => group.items.length > 0); // Remove empty groups
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
        
        // Filter sub-menu groups based on page access
        if (itemCopy.subMenuGroups) {
          itemCopy.subMenuGroups = itemCopy.subMenuGroups.map((group) => {
            // Filter items within each group
            const filteredItems = group.items.filter((subItem) => {
              const permissionKey = getPermissionKeyFromPath(subItem.href);
              if (!permissionKey) {
                return false;
              }
              const hasAccess = accessiblePages.get(permissionKey);
              if (hasAccess !== true) {
                return false;
              }
              return true;
            });
            return {
              ...group,
              items: filteredItems,
            };
          }).filter((group) => group.items.length > 0); // Remove empty groups
          
          // Only show parent navigation item if it has at least one accessible group
          if (itemCopy.subMenuGroups.length === 0) return null;
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
      if (item.subMenuGroups) {
        const hasActiveChild = item.subMenuGroups.some((group) =>
          group.items.some((subItem) => {
            if (pathname === subItem.href) return true;
            if (pathname?.startsWith(subItem.href)) {
              const nextChar = pathname[subItem.href.length];
              return nextChar === '/' || nextChar === undefined;
            }
            return false;
          })
        );
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

  const isSubMenuGroupsActive = (subMenuGroups: SubMenuGroup[]) => {
    return subMenuGroups.some((group) =>
      group.items.some((subItem) => {
        return pathname === subItem.href;
      })
    );
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        dispatch(setSidebarOpen(false));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dispatch]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isSidebarOpen]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-6 lg:justify-center">
        <div className="flex-1 lg:flex-none">
          <Logo width={150} height={100} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        >
          <FiX className="h-5 w-5" />
        </Button>
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
                          onClick={() => dispatch(setSidebarOpen(false))}
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

          if (item.subMenuGroups) {
            const isExpanded = isMenuExpanded(item.label);
            const hasActiveChild = isSubMenuGroupsActive(item.subMenuGroups);
            
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
                  <div className="ml-4 mt-1 space-y-2 border-l pl-4">
                    {item.subMenuGroups.map((group, groupIndex) => (
                      <div key={groupIndex} className="space-y-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.label}
                        </div>
                        {group.items.map((subItem) => {
                          const SubIcon = subItem.icon;
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
                              onClick={() => dispatch(setSidebarOpen(false))}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (!item.href) return null;
          
          // For exact match or check if pathname starts with href
          // Special handling for /admin to only match exactly
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
              onClick={() => dispatch(setSidebarOpen(false))}
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
              onClick={() => dispatch(setSidebarOpen(false))}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-background lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => dispatch(setSidebarOpen(false))}
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-0 h-full w-64 border-r bg-background z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
