"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategoryById } from "@/app/(dashboard)/dashboard/master/categories/_actions/category.action";
// import { getQuotation } from "@/app/actions/quotations";
// import { getGroupById } from "@/app/(dashboard)/dashboard/items/groups/_actions/group.action";
// import { getItemById } from "@/app/(dashboard)/dashboard/items/_actions/item.action";
// import { getWorkOrder } from "@/app/actions/work-orders";

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
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const items = getBreadcrumbItems(pathname);

  // Check if we're on a category detail or edit page
  const isCategoryDetailMatch = pathname.match(/^\/dashboard\/category\/([^\/]+)$/);
  const isCategoryEditMatch = pathname.match(/^\/dashboard\/category\/([^\/]+)\/edit$/);
  const isCategoryDetailsPage = pathname.match(/^\/dashboard\/category\/details$/);
  
  // For admin category, the ID might be in the query param for details page
  const searchParams = useSearchParams();
  const categoryIdFromParam = searchParams.get("id");
  const categoryId = isCategoryDetailMatch?.[1] || isCategoryEditMatch?.[1] || categoryIdFromParam || null;

  // Fetch category name when on category detail/edit page
  useEffect(() => {
    if (!categoryId || categoryId === "add" || categoryId === "details") {
      return;
    }
    
    let cancelled = false;
    const id = categoryId;
    
    async function fetchCategoryName() {
      try {
        const result = await getCategoryById(id);
        if (!cancelled && result.success && result.category) {
          setCategoryName(result.category.name);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching category name:", error);
        }
      }
    }
    
    fetchCategoryName();
    
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

 

  // If we're at the root admin dashboard, show just "Dashboard"
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

  // If we're on a group detail or edit page, use group code
  const isGroupDetail = pathname.match(/^\/dashboard\/items\/groups\/([^\/]+)$/);
  const isGroupEdit = pathname.match(/^\/dashboard\/items\/groups\/([^\/]+)\/edit$/);
  
  // For group routes, replace the ID segment with "Groups" as parent
  if (isGroupDetail || isGroupEdit) {
    // Find the "Groups" item (should be before the ID)
    const groupsItem = items.find(item => item.path === "/dashboard/items/groups");
    if (groupsItem) {
      parentItem = groupsItem;
    } else {
      // If not found, create a parent item pointing to groups list
      parentItem = { path: "/dashboard/items/groups", label: "Groups" };
    }
    
    // Update current label with group code
    if (groupCode) {
      currentLabel = isGroupEdit ? `Edit ${groupCode}` : groupCode;
    } else {
      // Show loading state or default while fetching
      currentLabel = isGroupEdit ? "Edit Group" : "Group Details";
    }
  }

  // If we're on a category detail or edit page, use category name instead of ID
  // For category routes, replace the ID segment with "Categories" as parent
  if (isCategoryDetailMatch || isCategoryEditMatch || isCategoryDetailsPage) {
    // Find the "Categories" item (should be before the ID)
    const categoriesItem = items.find(item => item.path === "/dashboard/category");
    if (categoriesItem) {
      parentItem = categoriesItem;
    } else {
      // If not found, create a parent item pointing to categories list
      parentItem = { path: "/dashboard/category", label: "Categories" };
    }
    
    // Update current label with category name
    if (categoryName) {
      currentLabel = isCategoryEditMatch ? `Edit ${categoryName}` : categoryName;
    } else if (isCategoryDetailsPage) {
      currentLabel = categoryName || "Category Details";
    } else {
      // Show loading state or default while fetching
      currentLabel = isCategoryEditMatch ? "Edit Category" : "Category Details";
    }
  }

  // If we're on an item edit page, use item code/description instead of ID
  const isItemEdit = pathname.match(/^\/dashboard\/items\/([^\/]+)$/);
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
  const isWorkOrderDetail = pathname.match(/^\/dashboard\/work-orders\/([^\/]+)$/);
  const isWorkOrderEdit = pathname.match(/^\/dashboard\/work-orders\/([^\/]+)\/edit$/);
  
  // For work order routes, replace the ID segment with "Work Orders" as parent
  if (isWorkOrderDetail || isWorkOrderEdit) {
    // Find the "Work Orders" item (should be before the ID)
    const workOrdersItem = items.find(item => item.path === "/dashboard/work-orders");
    if (workOrdersItem) {
      parentItem = workOrdersItem;
    } else {
      // If not found, create a parent item pointing to work orders list
      parentItem = { path: "/dashboard/work-orders", label: "Work Orders" };
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

