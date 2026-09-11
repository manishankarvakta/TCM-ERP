"use client";
// Cache-bust: v5

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
  FiFilter,
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
  FiTarget,
  FiBriefcase,
  FiAlertCircle,
  FiClock,
  FiCalendar,
  FiServer,
  FiPieChart,
  FiShare2,
  FiMail,
  FiMessageSquare,
  FiImage,
  FiVideo,
  FiCheckCircle,
  FiUserCheck,
  FiKey,
  FiInbox,
  FiGrid,
  FiAlertTriangle,
  FiPlay,
  FiRefreshCw,
  FiList,
  FiHelpCircle,
  FiBookOpen,
  FiPlusSquare,
  FiTrendingDown,
  FiRepeat,
  FiTrash2,
  FiShield,
  FiSend,
  FiSliders,
  FiCpu,
  FiDatabase,
  FiZap,
  FiHardDrive,
  FiHeart,
  FiCheckSquare,
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
  FiFilter,
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
  FiTarget,
  FiBriefcase,
  FiAlertCircle,
  FiClock,
  FiCalendar,
  FiServer,
  FiPieChart,
  FiShare2,
  FiMail,
  FiMessageSquare,
  FiImage,
  FiVideo,
  FiCheckCircle,
  FiUserCheck,
  FiKey,
  FiInbox,
  FiGrid,
  FiAlertTriangle,
  FiPlay,
  FiRefreshCw,
  FiList,
  FiHelpCircle,
  FiBookOpen,
  FiPlusSquare,
  FiTrendingDown,
  FiRepeat,
  FiTrash2,
  FiShield,
  FiSend,
  FiSliders,
  FiCpu,
  FiDatabase,
  FiZap,
  FiHardDrive,
  FiHeart,
  FiCheckSquare,
  SlCalculator,
  MdOutlineCategory,
};

interface DashboardSidebarProps {
  menuItems: MenuItemData[];
  bottomMenuItems: MenuItemData[];
}

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

// Helper to recursively collect all hrefs from subMenu and its nested children
function getAllSubMenuHrefs(subMenu: SubMenuItemData[]): string[] {
  const hrefs: string[] = [];
  subMenu.forEach((item) => {
    if (item.href) hrefs.push(item.href);
    if (item.children) {
      item.children.forEach((child) => {
        if (child.href) hrefs.push(child.href);
      });
    }
  });
  return hrefs;
}

// Helper to find which menu should be expanded for a given pathname (returns null for /dashboard and /admin)
function findActiveMenu(pathname: string | null, menuItems: MenuItemData[]): string | null {
  if (!pathname || pathname === "/dashboard" || pathname === "/admin") {
    return null;
  }
  for (const item of menuItems) {
    if (item.subMenu) {
      const siblingHrefs = getAllSubMenuHrefs(item.subMenu);
      const hasActiveChild = item.subMenu.some((subItem) => {
        if (isRouteActive(pathname, subItem.href, siblingHrefs)) return true;
        if (subItem.children && subItem.children.length > 0) {
          return subItem.children.some((child) => isRouteActive(pathname, child.href, siblingHrefs));
        }
        return false;
      });
      if (hasActiveChild) return item.label;
    }
    if (item.subMenuGroups) {
      const allHrefs = item.subMenuGroups.flatMap((g) => g.items.map((i) => i.href));
      const hasActiveChild = item.subMenuGroups.some((group) =>
        group.items.some((subItem) => isRouteActive(pathname, subItem.href, allHrefs))
      );
      if (hasActiveChild) return item.label;
    }
  }
  return null;
}

export default function DashboardSidebar({
  menuItems,
  bottomMenuItems,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);

  const activeMenuFromRoute = findActiveMenu(pathname, menuItems);

  const [toggledMenu, setToggledMenu] = useState<{ path: string | null; label: string | null }>({
    path: null,
    label: null,
  });

  const openMenuLabel = toggledMenu.path === pathname ? toggledMenu.label : activeMenuFromRoute;

  const [expandedSubItems, setExpandedSubItems] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    menuItems.forEach((item) => {
      if (item.subMenu) {
        item.subMenu.forEach((subItem) => {
          if (subItem.children) {
            const hasActiveChild = subItem.children.some((child) =>
              isRouteActive(pathname, child.href)
            );
            if (hasActiveChild) {
              expanded.add(subItem.label);
            }
          }
        });
      }
    });
    return expanded;
  });

  useEffect(() => {
    const nextExpanded = new Set<string>();
    const siblingHrefs = menuItems.flatMap((item) => item.subMenu ? getAllSubMenuHrefs(item.subMenu) : []);
    menuItems.forEach((item) => {
      if (item.subMenu) {
        item.subMenu.forEach((subItem) => {
          if (subItem.children) {
            const hasActiveChild = subItem.children.some((child) =>
              isRouteActive(pathname, child.href, siblingHrefs)
            );
            if (hasActiveChild) {
              nextExpanded.add(subItem.label);
            }
          }
        });
      }
    });
    setExpandedSubItems(nextExpanded);
  }, [pathname, menuItems]);

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

  const isSubMenuActive = (subMenu: SubMenuItemData[]) => {
    const siblingHrefs = getAllSubMenuHrefs(subMenu);
    return subMenu.some((subItem) => {
      if (isRouteActive(pathname, subItem.href, siblingHrefs)) return true;
      if (subItem.children && subItem.children.length > 0) {
        return subItem.children.some((child) => isRouteActive(pathname, child.href, siblingHrefs));
      }
      return false;
    });
  };

  const isSubMenuGroupsActive = (subMenuGroups: SubMenuGroup[]) => {
    const allHrefs = subMenuGroups.flatMap((g) => g.items.map((i) => i.href));
    return subMenuGroups.some((group) =>
      group.items.some((subItem) => isRouteActive(pathname, subItem.href, allHrefs))
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
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  </div>
                  {isExpanded ? (
                    <FiChevronDown className="h-4 w-4" />
                  ) : (
                    <FiChevronRight className="h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                    {(() => {
                      const siblingHrefs = getAllSubMenuHrefs(item.subMenu);
                      return item.subMenu.map((subItem) => {
                        const SubIcon = ICON_MAP[subItem.icon] || FiFile;

                        if (subItem.children && subItem.children.length > 0) {
                          const isChildActive = subItem.children.some(
                            (child) => isRouteActive(pathname, child.href)
                          );
                          const isSubExpanded =
                            expandedSubItems.has(subItem.label) || isChildActive;

                          return (
                            <div key={subItem.label} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedSubItems((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(subItem.label)) {
                                      next.delete(subItem.label);
                                    } else {
                                      next.add(subItem.label);
                                    }
                                    return next;
                                  });
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                  isChildActive || (subItem.href && isRouteActive(pathname, subItem.href, siblingHrefs))
                                    ? "bg-accent/70 text-accent-foreground font-semibold"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.label}</span>
                                </div>
                                {isSubExpanded ? (
                                  <FiChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <FiChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {isSubExpanded && (
                                <div className="ml-3 space-y-1 border-l pl-3">
                                  {subItem.children.map((child) => {
                                    const ChildIcon =
                                      ICON_MAP[child.icon] || FiFile;
                                    const isActiveChild = isRouteActive(pathname, child.href, siblingHrefs);

                                    return (
                                      <Link
                                        key={child.href}
                                        href={child.href}
                                        className={cn(
                                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                                          isActiveChild
                                            ? "bg-accent text-accent-foreground font-semibold"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                        onClick={() =>
                                          dispatch(setSidebarOpen(false))
                                        }
                                      >
                                        <ChildIcon className="h-3.5 w-3.5" />
                                        <span>{child.label}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Standard single link item
                        if (!subItem.href) return null;
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
                            onClick={() => dispatch(setSidebarOpen(false))}
                          >
                            <SubIcon className="h-4 w-4" />
                            <span>{subItem.label}</span>
                          </Link>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            );
          }

          if (item.subMenuGroups) {
            const isExpanded = isMenuExpanded(item.label);
            const hasActiveChild = isSubMenuGroupsActive(item.subMenuGroups);
            const allGroupHrefs = item.subMenuGroups.flatMap((g) => g.items.map((i) => i.href));
            
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
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate whitespace-nowrap">{item.label}</span>
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
                          const isActive = isRouteActive(pathname, subItem.href, allGroupHrefs);
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
