"use client";
// Cache-bust: v4

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
  FiDatabase,
  FiShoppingBag,
  FiBox,
  FiClipboard,
  FiCpu,
  FiCalendar,
  FiLink,
  FiAlertCircle,
  FiRefreshCw,
  FiTag,
  FiAlertTriangle,
  FiAward,
} from "react-icons/fi";
import Logo from "@/components/layout/logo";
import { SlCalculator } from "react-icons/sl";
import { MdOutlineCategory } from "react-icons/md";
import type { MenuItemData, SubMenuItemData, SubMenuGroup } from "@/lib/navigation-builder";

// Icon mapping - converts icon name strings to React components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FiHome,
  FiUsers,
  FiSettings,
  FiBarChart,
  FiFileText,
  FiUser,
  FiFolder,
  FiBell,
  FiArchive,
  FiTag,
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
  FiDatabase,
  FiShoppingBag,
  FiBox,
  FiClipboard,
  FiCpu,
  FiCalendar,
  FiLink,
  FiAlertCircle,
  FiRefreshCw,
  FiAlertTriangle,
  FiAward,
  SlCalculator,
  MdOutlineCategory,
};

interface DashboardSidebarProps {
  menuItems: MenuItemData[];
  bottomMenuItems: MenuItemData[];
}

export default function DashboardSidebar({
  menuItems,
  bottomMenuItems,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);

  // Auto-expand menus if current path matches any sub-menu
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    menuItems.forEach((item) => {
      if (item.subMenu) {
        const hasActiveChild = item.subMenu.some((subItem) => {
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

  const isSubMenuActive = (subMenu: SubMenuItemData[]) => {
    return subMenu.some((subItem) => {
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
        {menuItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || FiFile;
          
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
                      const SubIcon = ICON_MAP[subItem.icon] || FiFile;
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
                          const SubIcon = ICON_MAP[subItem.icon] || FiFile;
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
              onClick={() => dispatch(setSidebarOpen(false))}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 space-y-1">
        {bottomMenuItems.map((item) => {
          if (!item.href) return null;
          const Icon = ICON_MAP[item.icon] || FiFile;
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
