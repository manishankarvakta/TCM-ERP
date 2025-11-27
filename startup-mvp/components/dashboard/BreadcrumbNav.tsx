"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Map route paths to display names
const routeMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
  "/dashboard/users": "Users",
  "/dashboard/users/add-user": "Add User",
  "/dashboard/users/edit-user": "Edit User",
  "/dashboard/files": "Files",
  "/dashboard/files/upload": "Upload",
};

// Check if a path segment is a dynamic route (e.g., [id])
const isDynamicSegment = (segment: string): boolean => {
  return segment.startsWith("[") && segment.endsWith("]");
};

// Get display name for a segment
const getSegmentDisplayName = (segment: string, path: string): string => {
  // Check if it's a known route
  if (routeMap[path]) {
    return routeMap[path];
  }
  
  // Check if it's a dynamic segment (like [id])
  if (isDynamicSegment(segment)) {
    // For user details, try to get user name from URL or show generic
    if (path.includes("/users/") && !path.includes("/add-user") && !path.includes("/edit-user")) {
      return "User Details";
    }
    return "Details";
  }
  
  // Convert kebab-case to Title Case
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Get parent route for navigation
const getParentRoute = (pathname: string): string | null => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  
  // Remove last segment
  segments.pop();
  return "/" + segments.join("/");
};

// Get breadcrumb items from pathname
const getBreadcrumbItems = (pathname: string): Array<{ path: string; label: string }> => {
  const segments = pathname.split("/").filter(Boolean);
  const items: Array<{ path: string; label: string }> = [];
  
  // Always include Dashboard as first item
  items.push({ path: "/dashboard", label: "Dashboard" });
  
  // Build path segments
  let currentPath = "/dashboard";
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += "/" + segment;
    const label = getSegmentDisplayName(segment, currentPath);
    items.push({ path: currentPath, label });
  }
  
  return items;
};

interface BreadcrumbNavProps {
  className?: string;
}

export default function BreadcrumbNav({ className }: BreadcrumbNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = getBreadcrumbItems(pathname);
  const parentRoute = getParentRoute(pathname);

  // If we're at the root dashboard, show just "Dashboard"
  if (pathname === "/dashboard" || items.length === 1) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">Dashboard</span>
        </div>
      </div>
    );
  }

  // If we have multiple items, show breadcrumb navigation
  const parentItem = items[items.length - 2];
  const currentItem = items[items.length - 1];

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Parent link */}
        {parentItem && (
          <>
            <Link
              href={parentItem.path}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {parentItem.label}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </>
        )}

        {/* Current page (bold) */}
        <span className="text-sm font-semibold">{currentItem.label}</span>
      </div>
    </div>
  );
}

