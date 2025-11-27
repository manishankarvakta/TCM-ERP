"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "react-icons/fi";
import Logo from "../common/logo";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: FiHome },
  { href: "/dashboard/users", label: "Users", icon: FiUsers },
  { href: "/dashboard/files", label: "Files", icon: FiFolder },
  { href: "/dashboard/notifications", label: "Notifications", icon: FiBell },
  { href: "/dashboard/analytics", label: "Analytics", icon: FiBarChart },
  { href: "/dashboard/reports", label: "Reports", icon: FiFileText },
];

const bottomMenuItems = [
  { href: "/dashboard/profile", label: "Profile", icon: FiUser },
  { href: "/dashboard/settings", label: "Settings", icon: FiSettings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r bg-background lg:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
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