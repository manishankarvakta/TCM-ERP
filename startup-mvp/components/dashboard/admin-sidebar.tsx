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
  FiTruck,
} from "react-icons/fi";
import Logo from "@/components/layout/logo";
import { SlCalculator } from "react-icons/sl";
import { MdOutlineCategory } from "react-icons/md";

interface SubMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subMenu?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { href: "/admin", label: "Dashboard", icon: FiHome },
  {
    label: "Items",
    icon: FiArchive,
    subMenu: [
      { href: "/admin/items/groups", label: "Groups", icon: FiLayers },
      { href: "/admin/items", label: "All Items", icon: FiPackage },
      { href: "/admin/items/category", label: "Categories", icon: MdOutlineCategory },
      { href: "/admin/items/units", label: "Units", icon: FiLayers },
    ],
  },
  {
    label: "Quotations",
    icon: FiFileText,
    subMenu: [
      { href: "/admin/quotations", label: "Quotations", icon: FiFileText },
      { href: "/admin/quotations/orders", label: "Orders", icon: FiShoppingCart },
      { href: "/admin/quotations/delivery-schedule", label: "Delivery Schedule", icon: FiTruck },
      { href: "/admin/quotations/invoices", label: "Invoices", icon: FiDollarSign },
    ],
  },
  { href: "/admin/purchases", label: "Purchases", icon: FiShoppingCart },
  {
    label: "Accounts",
    icon: SlCalculator,
    subMenu: [
      { href: "/admin/accounts/chart-of-accounts", label: "Chart of Accounts", icon: FiBarChart },
      { href: "/admin/accounts/ledgers", label: "Ledgers", icon: FiBook },
      { href: "/admin/accounts/vouchers", label: "Vouchers", icon: FiFile },
      { href: "/admin/accounts/trial-balance", label: "Trial Balance", icon: FiActivity },
      { href: "/admin/accounts/balance-sheet", label: "Balance Sheet", icon: FiFileText },
      { href: "/admin/accounts/profit-loss", label: "Profit & Loss", icon: FiTrendingUp },
      { href: "/admin/accounts/cash-bank", label: "Cash & Bank", icon: FiCreditCard },
      { href: "/admin/accounts/accounts-receivable", label: "Accounts Receivable", icon: FiArrowDownRight },
      { href: "/admin/accounts/accounts-payable", label: "Accounts Payable", icon: FiArrowUpRight },
    ],
  },
  {
    label: "Peoples",
    icon: FiUsers,
    subMenu: [
      { href: "/admin/users", label: "Users", icon: FiUser },
      { href: "/admin/clients", label: "Clients", icon: FiUser },
      { href: "/admin/suppliers", label: "Suppliers", icon: FiUser },
      { href: "/admin/employees", label: "Employees", icon: FiUser },
    ],
  },
  
  { href: "/admin/files", label: "Files", icon: FiFolder },
  { href: "/admin/notifications", label: "Notifications", icon: FiBell },
  { href: "/admin/analytics", label: "Analytics", icon: FiBarChart },
  { href: "/admin/reports", label: "Reports", icon: FiFileText },
];

const bottomMenuItems = [
  { href: "/admin/profile", label: "Profile", icon: FiUser },
  { href: "/admin/settings", label: "Settings", icon: FiSettings },
];

// Helper to determine if a route is active (exact match or nested child match without matching siblings)
function isRouteActive(pathname: string | null, href?: string, siblingHrefs?: string[]): boolean {
  if (!pathname || !href) return false;
  if (pathname === href) return true;

  // Root paths (/dashboard, /admin) should only match exact path to avoid matching all sub-routes
  if (href === "/dashboard" || href === "/admin") {
    return false;
  }

  // Check if pathname starts with href + "/"
  if (pathname.startsWith(href + "/")) {
    if (siblingHrefs && siblingHrefs.length > 0) {
      // If there's another sibling that is a longer and more specific match, prefer that sibling
      const hasMoreSpecificSibling = siblingHrefs.some(
        (sibling) =>
          sibling !== href &&
          sibling.length > href.length &&
          (pathname === sibling || pathname.startsWith(sibling + "/"))
      );
      if (hasMoreSpecificSibling) return false;
    }
    return true;
  }
  return false;
}

// Helper to find which menu should be expanded for a given pathname (returns null for /dashboard and /admin)
function findActiveMenu(pathname: string | null): string | null {
  if (!pathname || pathname === "/dashboard" || pathname === "/admin") {
    return null;
  }
  for (const item of menuItems) {
    if (item.subMenu) {
      const siblingHrefs = item.subMenu.map((s) => s.href);
      const hasActiveChild = item.subMenu.some((subItem) =>
        isRouteActive(pathname, subItem.href, siblingHrefs)
      );
      if (hasActiveChild) return item.label;
    }
  }
  return null;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const activeMenuFromRoute = findActiveMenu(pathname);

  const [toggledMenu, setToggledMenu] = useState<{ path: string | null; label: string | null }>({
    path: pathname,
    label: null,
  });

  const openMenuLabel = toggledMenu.path === pathname ? toggledMenu.label : activeMenuFromRoute;

  const toggleMenu = (label: string) => {
    setToggledMenu((prev) => {
      const current = prev.path === pathname ? prev.label : activeMenuFromRoute;
      return {
        path: pathname,
        label: current === label ? null : label,
      };
    });
  };

  const isMenuExpanded = (label: string) => openMenuLabel === label;

  const isSubMenuActive = (subMenu: SubMenuItem[]) => {
    const siblingHrefs = subMenu.map((s) => s.href);
    return subMenu.some((subItem) =>
      isRouteActive(pathname, subItem.href, siblingHrefs)
    );
  };

  return (
    <aside className="hidden w-64 border-r bg-background lg:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Logo width={150} height={100} />
        </div>
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            if (item.subMenu) {
              const isExpanded = isMenuExpanded(item.label);
              const hasActiveChild = isSubMenuActive(item.subMenu);
              const siblingHrefs = item.subMenu.map((s) => s.href);
              
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
                        const isActive = isRouteActive(pathname, subItem.href, siblingHrefs);
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
            // Special handling for /admin to only match exactly
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname?.startsWith(item.href + "/"));
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
          {bottomMenuItems.map((item) => {
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

