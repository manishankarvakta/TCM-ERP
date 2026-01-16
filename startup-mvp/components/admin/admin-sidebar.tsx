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
  FiBriefcase,
} from "react-icons/fi";
import Logo from "@/components/layout/logo";
import { SlCalculator } from "react-icons/sl";
import { MdOutlineCategory } from "react-icons/md";

interface SubMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      { href: "/admin/quotations/invoices", label: "Invoices", icon: FiDollarSign },
      { href: "/admin/quotations/orders", label: "Orders", icon: FiShoppingCart },
      { href: "/admin/work-orders", label: "Work Orders", icon: FiBriefcase },
    ],
  },
  { href: "/admin/purchases", label: "Purchases", icon: FiShoppingCart },
  {
    label: "Accounts",
    icon: SlCalculator,
    subMenuGroups: [
      {
        label: "Setup",
        items: [
          { href: "/admin/accounts/chart-of-accounts", label: "Chart of Accounts", icon: FiBarChart },
          { href: "/admin/accounts/cash-bank", label: "Cash & Bank", icon: FiCreditCard },
        ],
      },
      {
        label: "Transactions",
        items: [
          { href: "/admin/accounts/vouchers", label: "Vouchers", icon: FiFile },
        ],
      },
      {
        label: "Ledgers",
        items: [
          { href: "/admin/accounts/ledgers", label: "Account Ledger", icon: FiBook },
        ],
      },
      {
        label: "Reports",
        items: [
          { href: "/admin/accounts/trial-balance", label: "Trial Balance", icon: FiActivity },
          { href: "/admin/accounts/balance-sheet", label: "Balance Sheet", icon: FiFileText },
          { href: "/admin/accounts/profit-loss", label: "Profit & Loss", icon: FiTrendingUp },
        ],
      },
      {
        label: "Receivables",
        items: [
          { href: "/admin/accounts/accounts-receivable", label: "Accounts Receivable", icon: FiArrowDownRight },
        ],
      },
      {
        label: "Payables",
        items: [
          { href: "/admin/accounts/accounts-payable", label: "Accounts Payable", icon: FiArrowUpRight },
        ],
      },
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

export default function AdminSidebar() {
  const pathname = usePathname();
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
                        // e.g., /admin/items should not be active when on /admin/items/units
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

