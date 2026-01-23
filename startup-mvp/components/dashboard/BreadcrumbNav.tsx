"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkOrder } from "@/app/actions/work-orders";
import { getWarehouseById } from "@/app/(dashboard)/dashboard/master/warehouses/_actions/warehouse.action";
import { getItemById } from "@/app/(dashboard)/dashboard/master/items/_actions/item.action";
import { getBOMById } from "@/app/(dashboard)/dashboard/production/boms/_actions/bom.action";

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
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string | null>(null);
  const [warehouseName, setWarehouseName] = useState<string | null>(null);
  const [workOrderCode, setWorkOrderCode] = useState<string | null>(null);
  const [bomName, setBomName] = useState<string | null>(null);
  const items = getBreadcrumbItems(pathname);

  // Check if we're on a warehouse detail or edit page
  const isWarehouseDetailMatch = pathname.match(/^\/dashboard\/master\/warehouses\/([^\/]+)$/);
  const isWarehouseEditMatch = pathname.match(/^\/dashboard\/master\/warehouses\/([^\/]+)\/edit$/);
  const warehouseId = isWarehouseDetailMatch?.[1] || isWarehouseEditMatch?.[1] || null;

  // Check if we're on an item detail or edit page
  const isItemDetailMatch = pathname.match(/^\/dashboard\/master\/items\/([^\/]+)$/);
  const isItemEditMatch = pathname.match(/^\/dashboard\/master\/items\/([^\/]+)\/edit$/);
  const itemId = isItemDetailMatch?.[1] || isItemEditMatch?.[1] || null;

  // Check if we're on a BOM detail or edit page
  const isBOMDetailMatch = pathname.match(/^\/dashboard\/production\/boms\/([^\/]+)$/);
  const isBOMEditMatch = pathname.match(/^\/dashboard\/production\/boms\/([^\/]+)\/edit$/);
  const bomId = isBOMDetailMatch?.[1] || isBOMEditMatch?.[1] || null;

  // Fetch warehouse name when on warehouse detail/edit page
  useEffect(() => {
    if (!warehouseId) {
      return;
    }
    
    let cancelled = false;
    const id = warehouseId; // Store in local variable for type narrowing
    
    async function fetchWarehouseName() {
      try {
        const result = await getWarehouseById(id);
        if (!cancelled && result.success && result.warehouse) {
          setWarehouseName(result.warehouse.name);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching warehouse name:", error);
        }
      }
    }
    
    fetchWarehouseName();
    
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  // Fetch item name when on item detail/edit page
  useEffect(() => {
    if (!itemId) {
      return;
    }
    
    let cancelled = false;
    const id: string = itemId; // Type assertion since we've checked for null
    
    async function fetchItemName() {
      try {
        const result = await getItemById(id);
        if (!cancelled && result.success && result.item) {
          setItemName(result.item.name);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching item name:", error);
        }
      }
    }
    
    fetchItemName();
    
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // Fetch BOM name when on BOM detail/edit page
  useEffect(() => {
    if (!bomId) {
      return;
    }
    
    let cancelled = false;
    const id: string = bomId; // Type assertion since we've checked for null
    
    async function fetchBOMName() {
      try {
        const result = await getBOMById(id);
        if (!cancelled && result.success && result.bom) {
          setBomName(result.bom.name);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching BOM name:", error);
        }
      }
    }
    
    fetchBOMName();
    
    return () => {
      cancelled = true;
    };
  }, [bomId]);

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

  // If we're on a warehouse detail or edit page, use warehouse name instead of ID
  // For warehouse routes, replace the ID segment with "Warehouses" as parent
  if (isWarehouseDetailMatch || isWarehouseEditMatch) {
    // Find the "Warehouses" item (should be before the ID)
    const warehousesItem = items.find(item => item.path === "/dashboard/master/warehouses");
    if (warehousesItem) {
      parentItem = warehousesItem;
    } else {
      // If not found, create a parent item pointing to warehouses list
      parentItem = { path: "/dashboard/master/warehouses", label: "Warehouses" };
    }
    
    // Update current label with warehouse name
    if (warehouseName) {
      currentLabel = isWarehouseEditMatch ? `Edit ${warehouseName}` : warehouseName;
    } else {
      // Show loading state or default while fetching
      currentLabel = isWarehouseEditMatch ? "Edit Warehouse" : "Warehouse Details";
    }
  }

  // If we're on an item detail or edit page, use item name instead of ID
  // For item routes, replace the ID segment with "Items" as parent
  if (isItemDetailMatch || isItemEditMatch) {
    // Find the "Items" item (should be before the ID)
    const itemsItem = items.find(item => item.path === "/dashboard/master/items");
    if (itemsItem) {
      parentItem = itemsItem;
    } else {
      // If not found, create a parent item pointing to items list
      parentItem = { path: "/dashboard/master/items", label: "Items" };
    }
    
    // Update current label with item name
    if (itemName) {
      currentLabel = isItemEditMatch ? `Edit ${itemName}` : itemName;
    } else {
      // Show loading state or default while fetching
      currentLabel = isItemEditMatch ? "Edit Item" : "Item Details";
    }
  }

  // If we're on a BOM detail or edit page, use BOM name instead of ID
  // For BOM routes, replace the ID segment with "Bill of Materials" as parent
  if (isBOMDetailMatch || isBOMEditMatch) {
    // Find the "Bill of Materials" item (should be before the ID)
    const bomsItem = items.find(item => item.path === "/dashboard/production/boms");
    if (bomsItem) {
      parentItem = bomsItem;
    } else {
      // If not found, create a parent item pointing to BOMs list
      parentItem = { path: "/dashboard/production/boms", label: "Bill of Materials" };
    }
    
    // Update current label with BOM name
    if (bomName) {
      currentLabel = isBOMEditMatch ? `Edit ${bomName}` : bomName;
    } else {
      // Show loading state or default while fetching
      currentLabel = isBOMEditMatch ? "Edit BOM" : "BOM Details";
    }
  }

  // Legacy item route handling (for old routes)
  const isLegacyItemEdit = pathname.match(/^\/dashboard\/items\/([^\/]+)$/);
  if (isLegacyItemEdit) {
    const segment = isLegacyItemEdit[1];
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

