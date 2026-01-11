"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuotation } from "@/app/actions/quotations";
import { getGroupById } from "@/app/(dashboard)/admin/items/groups/_actions/group.action";
import { getItemById } from "@/app/(dashboard)/admin/items/_actions/item.action";
import { getWorkOrder } from "@/app/actions/work-orders";

// Map route paths to display names
const routeMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/profile": "Profile",
  "/admin/settings": "Settings",
  "/admin/users": "Users",
  "/admin/users/add-user": "Add User",
  "/admin/users/edit-user": "Edit User",
  "/admin/files": "Files",
  "/admin/files/upload": "Upload",
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

  // Get breadcrumb items from pathname
const getBreadcrumbItems = (pathname: string): Array<{ path: string; label: string }> => {
  const segments = pathname.split("/").filter(Boolean);
  const items: Array<{ path: string; label: string }> = [];
  
  // Always include Dashboard as first item
  items.push({ path: "/admin", label: "Dashboard" });
  
  // Build path segments
  let currentPath = "/admin";
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += "/" + segment;
    
    // Check if this is a quotation ID segment - if so, use "Quotations" as label
    const isQuotationIdSegment = i === 2 && segments[0] === "admin" && segments[1] === "quotations" && segment !== "quotations" && !segment.includes("edit");
    
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
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState<string | null>(null);
  const [workOrderCode, setWorkOrderCode] = useState<string | null>(null);
  const items = getBreadcrumbItems(pathname);

  // Fetch quotation number if we're on a quotation detail or edit page
  useEffect(() => {
    const quotationMatch = pathname.match(/^\/admin\/quotations\/([^\/]+)(?:\/edit)?$/);
    if (!quotationMatch) {
      return;
    }
    
    const quotationId = quotationMatch[1];
    let cancelled = false;
    
    getQuotation(quotationId)
      .then((result) => {
        if (!cancelled && result.success && result.data) {
          setQuotationNumber(result.data.quotationNumber);
        }
      })
      .catch(() => {
        // Silently fail - will show default label
      });
    
    return () => {
      cancelled = true;
      setQuotationNumber(null);
    };
  }, [pathname]);

  // Fetch group code if we're on a group detail or edit page
  useEffect(() => {
    const groupMatch = pathname.match(/^\/admin\/items\/groups\/([^\/]+)(?:\/edit)?$/);
    if (!groupMatch) {
      return;
    }
    
    const groupId = groupMatch[1];
    let cancelled = false;
    
    getGroupById(groupId)
      .then((result) => {
        if (!cancelled && result.success && result.group) {
          setGroupCode(result.group.code || null);
        }
      })
      .catch(() => {
        // Silently fail - will show default label
      });
    
    return () => {
      cancelled = true;
      setGroupCode(null);
    };
  }, [pathname]);

  // Fetch item label if we're on an item edit page (/admin/items/:id)
  useEffect(() => {
    const itemMatch = pathname.match(/^\/admin\/items\/([^\/]+)$/);
    if (!itemMatch) {
      return;
    }

    // Ignore non-item subroutes under /admin/items/*
    const segment = itemMatch[1];
    if (segment === "groups" || segment === "units" || segment === "category" || segment === "details") {
      return;
    }

    const itemId = segment;
    let cancelled = false;

    getItemById(itemId)
      .then((result) => {
        if (!cancelled && result.success && result.item) {
          setItemLabel(result.item.code || result.item.description || null);
        }
      })
      .catch(() => {
        // Silently fail - will show default label
      });

    return () => {
      cancelled = true;
      setItemLabel(null);
    };
  }, [pathname]);

  // Fetch work order code if we're on a work order detail or edit page
  useEffect(() => {
    const workOrderMatch = pathname.match(/^\/admin\/work-orders\/([^\/]+)(?:\/edit)?$/);
    if (!workOrderMatch) {
      return;
    }
    
    const workOrderId = workOrderMatch[1];
    let cancelled = false;
    
    getWorkOrder(workOrderId)
      .then((result) => {
        if (!cancelled && result.success && result.data) {
          setWorkOrderCode(result.data.code);
        }
      })
      .catch(() => {
        // Silently fail - will show default label
      });
    
    return () => {
      cancelled = true;
      setWorkOrderCode(null);
    };
  }, [pathname]);

  // If we're at the root admin dashboard, show just "Dashboard"
  if (pathname === "/admin" || items.length === 1) {
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
  const isQuotationDetail = pathname.match(/^\/admin\/quotations\/([^\/]+)$/);
  const isQuotationEdit = pathname.match(/^\/admin\/quotations\/([^\/]+)\/edit$/);
  
  // For quotation routes, replace the ID segment with "Quotations" as parent
  if (isQuotationDetail || isQuotationEdit) {
    // Find the "Quotations" item (should be before the ID)
    const quotationsItem = items.find(item => item.path === "/admin/quotations");
    if (quotationsItem) {
      parentItem = quotationsItem;
    } else {
      // If not found, create a parent item pointing to quotations list
      parentItem = { path: "/admin/quotations", label: "Quotations" };
    }
    
    // Update current label with quotation number
    if (quotationNumber) {
      currentLabel = isQuotationEdit ? `Edit ${quotationNumber}` : quotationNumber;
    } else {
      // Show loading state or default while fetching
      currentLabel = isQuotationEdit ? "Edit Quotation" : "Quotation Details";
    }
  }

  // If we're on a group detail or edit page, use group code
  const isGroupDetail = pathname.match(/^\/admin\/items\/groups\/([^\/]+)$/);
  const isGroupEdit = pathname.match(/^\/admin\/items\/groups\/([^\/]+)\/edit$/);
  
  // For group routes, replace the ID segment with "Groups" as parent
  if (isGroupDetail || isGroupEdit) {
    // Find the "Groups" item (should be before the ID)
    const groupsItem = items.find(item => item.path === "/admin/items/groups");
    if (groupsItem) {
      parentItem = groupsItem;
    } else {
      // If not found, create a parent item pointing to groups list
      parentItem = { path: "/admin/items/groups", label: "Groups" };
    }
    
    // Update current label with group code
    if (groupCode) {
      currentLabel = isGroupEdit ? `Edit ${groupCode}` : groupCode;
    } else {
      // Show loading state or default while fetching
      currentLabel = isGroupEdit ? "Edit Group" : "Group Details";
    }
  }

  // If we're on an item edit page, use item code/description instead of ID
  const isItemEdit = pathname.match(/^\/admin\/items\/([^\/]+)$/);
  if (isItemEdit) {
    const segment = isItemEdit[1];
    if (segment !== "groups" && segment !== "units" && segment !== "category" && segment !== "details") {
      if (itemLabel) {
        currentLabel = `Edit ${itemLabel}`;
      } else {
        currentLabel = "Edit Item";
      }
    }
  }

  // If we're on a work order detail or edit page, use work order code
  const isWorkOrderDetail = pathname.match(/^\/admin\/work-orders\/([^\/]+)$/);
  const isWorkOrderEdit = pathname.match(/^\/admin\/work-orders\/([^\/]+)\/edit$/);
  
  // For work order routes, replace the ID segment with "Work Orders" as parent
  if (isWorkOrderDetail || isWorkOrderEdit) {
    // Find the "Work Orders" item (should be before the ID)
    const workOrdersItem = items.find(item => item.path === "/admin/work-orders");
    if (workOrdersItem) {
      parentItem = workOrdersItem;
    } else {
      // If not found, create a parent item pointing to work orders list
      parentItem = { path: "/admin/work-orders", label: "Work Orders" };
    }
    
    // Update current label with work order code
    if (workOrderCode) {
      currentLabel = isWorkOrderEdit ? `Edit ${workOrderCode}` : workOrderCode;
    } else {
      // Show loading state or default while fetching
      currentLabel = isWorkOrderEdit ? "Edit Work Order" : "Work Order Details";
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

