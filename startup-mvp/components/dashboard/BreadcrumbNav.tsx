"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuotation } from "@/app/actions/quotations";

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
const getBreadcrumbItems = (pathname: string, quotationNumber?: string | null): Array<{ path: string; label: string }> => {
  const segments = pathname.split("/").filter(Boolean);
  const items: Array<{ path: string; label: string }> = [];
  
  // Always include Dashboard as first item
  items.push({ path: "/dashboard", label: "Dashboard" });
  
  // Build path segments
  let currentPath = "/dashboard";
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += "/" + segment;
    
    // Check if this is a quotation ID segment - if so, use "Quotations" as label
    const isQuotationIdSegment = i === 2 && segments[0] === "dashboard" && segments[1] === "quotations" && segment !== "quotations" && !segment.includes("edit");
    
    let label: string;
    if (isQuotationIdSegment) {
      // For quotation detail/edit pages, show "Quotations" as the parent
      label = "Quotations";
    } else {
      label = getSegmentDisplayName(segment, currentPath);
    }
    
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
  const [quotationNumber, setQuotationNumber] = useState<string | null>(null);
  const items = getBreadcrumbItems(pathname, quotationNumber);
  const parentRoute = getParentRoute(pathname);

  // Fetch quotation number if we're on a quotation detail or edit page
  useEffect(() => {
    const quotationMatch = pathname.match(/^\/dashboard\/quotations\/([^\/]+)(?:\/edit)?$/);
    if (quotationMatch) {
      const quotationId = quotationMatch[1];
      getQuotation(quotationId)
        .then((result) => {
          if (result.success && result.data) {
            setQuotationNumber(result.data.quotationNumber);
          }
        })
        .catch(() => {
          // Silently fail - will show default label
        });
    } else {
      setQuotationNumber(null);
    }
  }, [pathname]);

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
  let parentItem = items[items.length - 2];
  const currentItem = items[items.length - 1];

  // Determine the display label for the current item
  let currentLabel = currentItem.label;
  
  // If we're on a quotation detail or edit page, use quotation number
  const isQuotationDetail = pathname.match(/^\/dashboard\/quotations\/([^\/]+)$/);
  const isQuotationEdit = pathname.match(/^\/dashboard\/quotations\/([^\/]+)\/edit$/);
  
  // For quotation routes, replace the ID segment with "Quotations" as parent
  if (isQuotationDetail || isQuotationEdit) {
    // Find the "Quotations" item (should be before the ID)
    const quotationsItem = items.find(item => item.path === "/dashboard/quotations");
    if (quotationsItem) {
      parentItem = quotationsItem;
    } else {
      // If not found, create a parent item pointing to quotations list
      parentItem = { path: "/dashboard/quotations", label: "Quotations" };
    }
    
    // Update current label with quotation number
    if (quotationNumber) {
      currentLabel = isQuotationEdit ? `Edit ${quotationNumber}` : quotationNumber;
    } else {
      // Show loading state or default while fetching
      currentLabel = isQuotationEdit ? "Edit Quotation" : "Quotation Details";
    }
  }

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
        <span className="text-sm font-semibold">{currentLabel}</span>
      </div>
    </div>
  );
}

