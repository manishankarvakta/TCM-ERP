"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuotation } from "@/app/actions/quotations";
import { getGroupById } from "@/app/(dashboard)/dashboard/items/groups/_actions/group.action";
import { getItemById } from "@/app/(dashboard)/dashboard/items/_actions/item.action";
import { getWorkOrder } from "@/app/actions/work-orders";
import { getDelivery } from "@/app/actions/deliveries";
import { getOrder } from "@/app/actions/orders";
import { getInvoice } from "@/app/actions/invoices";
import { getVoucherById } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { getLeadById } from "@/app/actions/crm/lead.action";


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
    const isQuotationIdSegment = i === 2 && segments[0] === "dashboard" && segments[1] === "quotations" && 
      !["quotations", "delivery-schedule", "invoices", "orders"].includes(segment) && 
      !segment.includes("edit");
    
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
  const [deliveryLabel, setDeliveryLabel] = useState<string | null>(null);
  const [invoiceLabel, setInvoiceLabel] = useState<string | null>(null);
  const [orderLabel, setOrderLabel] = useState<string | null>(null);
  const [voucherLabel, setVoucherLabel] = useState<string | null>(null);
  const [percentage, setPercentage] = useState<number>(0); // Unused but keeping for consistency if needed? No, just add opportunityNumber
  const [leadNumber, setLeadNumber] = useState<string | null>(null);
  const [opportunityNumber, setOpportunityNumber] = useState<string | null>(null);
  const items = getBreadcrumbItems(pathname);

  // Fetch quotation number if we're on a quotation detail or edit page
  useEffect(() => {
    // Exclude static routes from matching as quotation ID
    const isReserved = ["delivery-schedule", "invoices", "orders"].some(path => pathname.startsWith(`/dashboard/quotations/${path}`));
    if (isReserved) return;

    const quotationMatch = pathname.match(/^\/dashboard\/quotations\/([^\/]+)(?:\/edit)?$/);
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
    const groupMatch = pathname.match(/^\/dashboard\/items\/groups\/([^\/]+)(?:\/edit)?$/);
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

  // Fetch item label if we're on an item edit page (/dashboard/items/:id)
  useEffect(() => {
    const itemMatch = pathname.match(/^\/dashboard\/items\/([^\/]+)$/);
    if (!itemMatch) {
      return;
    }

    // Ignore non-item subroutes under /dashboard/items/*
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
    const workOrderMatch = pathname.match(/^\/dashboard\/work-orders\/([^\/]+)(?:\/edit)?$/);
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

  // Fetch delivery label
  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/quotations\/delivery-schedule\/([^\/]+)$/);
    if (!match) return;
    
    const id = match[1];
    let cancelled = false;
    
    getDelivery(id)
      .then((result) => {
        if (!cancelled && result.success && result.delivery) {
          // Format as Challan ID (last 8 chars)
          setDeliveryLabel(result.delivery.id.slice(-8).toUpperCase());
        }
      })
      .catch(() => {});
    
    return () => { cancelled = true; setDeliveryLabel(null); };
  }, [pathname]);

  // Fetch invoice label
  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/quotations\/invoices\/([^\/]+)$/);
    if (!match) return;
    
    const id = match[1];
    let cancelled = false;
    
    getInvoice(id)
        .then((result) => {
            if (!cancelled && result.success && result.invoice) {
                setInvoiceLabel(result.invoice.invoiceNumber);
            }
        })
        .catch(() => {});

    return () => { cancelled = true; setInvoiceLabel(null); };
  }, [pathname]);

  // Fetch order label
  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/quotations\/orders\/([^\/]+)$/);
    if (!match) return;
    
    const id = match[1];
    let cancelled = false;
    
    getOrder(id)
        .then((result) => {
            if (!cancelled && result.success && result.order) {
                setOrderLabel(result.order.orderNumber);
            }
        })
        .catch(() => {});

    return () => { cancelled = true; setOrderLabel(null); };
  }, [pathname]);

  // Fetch voucher label
  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/accounts\/vouchers\/([^\/]+)$/);
    if (!match) return;
    
    // Ignore static sub-paths if any exist (e.g. /add, but that shouldn't match the regex anyway if strictly ID)
    const id = match[1];
    if (id === "add" || id === "settings") return;

    let cancelled = false;
    
    getVoucherById(id)
        .then((result) => {
            if (!cancelled && result.success && result.voucher) {
                setVoucherLabel(result.voucher.voucherNumber);
            }
        })
        .catch(() => {});

    return () => { cancelled = true; setVoucherLabel(null); };
  }, [pathname]);

  // Fetch lead number
  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/crm\/leads\/([^\/]+)$/);
    if (!match) return;
    
    const id = match[1];
    if (id === "add") return;

    let cancelled = false;
    
    getLeadById(id)
        .then((result) => {
            if (!cancelled && result.success && result.lead) {
                const lead = result.lead as any;
                setLeadNumber(lead.leadNumber);
            }
        })
        .catch(() => {});

    return () => { cancelled = true; setLeadNumber(null); };
  }, [pathname]);

  // Fetch opportunity number
  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/crm\/opportunities\/([^\/]+)$/);
    if (!match) return;
    
    const id = match[1];
    if (id === "add") return;

    let cancelled = false;
    
    import("@/app/actions/crm/opportunity.action").then(({ getOpportunityById }) => {
        getOpportunityById(id)
            .then((result) => {
                if (!cancelled && result.success && result.opportunity) {
                    setOpportunityNumber(result.opportunity.opportunityNumber || "Opportunity");
                }
            })
            .catch(() => {});
    });

    return () => { cancelled = true; setOpportunityNumber(null); };
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
  
  // Handlers for specific routes
  const isReservedPath = ["delivery-schedule", "invoices", "orders"].some(path => pathname.startsWith(`/dashboard/quotations/${path}`));
  
  const isQuotationDetail = !isReservedPath && pathname.match(/^\/dashboard\/quotations\/([^\/]+)$/);
  const isQuotationEdit = !isReservedPath && pathname.match(/^\/dashboard\/quotations\/([^\/]+)\/edit$/);
  
  const isDeliveryDetail = pathname.match(/^\/dashboard\/quotations\/delivery-schedule\/([^\/]+)$/);
  const isInvoiceDetail = pathname.match(/^\/dashboard\/quotations\/invoices\/([^\/]+)$/);

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

  else if (isDeliveryDetail) {
     const deliveryListItem = items.find(item => item.path === "/dashboard/quotations/delivery-schedule");
     parentItem = deliveryListItem || { path: "/dashboard/quotations/delivery-schedule", label: "Delivery Schedule" };
     currentLabel = deliveryLabel ? deliveryLabel : "Delivery Details";
  }

  else if (isInvoiceDetail) {
     const invoiceListItem = items.find(item => item.path === "/dashboard/quotations/invoices");
     parentItem = invoiceListItem || { path: "/dashboard/quotations/invoices", label: "Invoices" };
     currentLabel = invoiceLabel ? invoiceLabel : "Invoice Details";
  }

  else if (isInvoiceDetail) {
     const invoiceListItem = items.find(item => item.path === "/dashboard/quotations/invoices");
     parentItem = invoiceListItem || { path: "/dashboard/quotations/invoices", label: "Invoices" };
     currentLabel = invoiceLabel ? invoiceLabel : "Invoice Details";
  }
  
  const isOrderDetail = pathname.match(/^\/dashboard\/quotations\/orders\/([^\/]+)$/);
  if (isOrderDetail) {
     const orderListItem = items.find(item => item.path === "/dashboard/quotations/orders");
     parentItem = orderListItem || { path: "/dashboard/quotations/orders", label: "Orders" };
     currentLabel = orderLabel ? orderLabel : "Order Details";
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
  // Handle Voucher Details
  const isVoucherDetail = pathname.match(/^\/dashboard\/accounts\/vouchers\/([^\/]+)$/);
  if (isVoucherDetail) {
     const id = isVoucherDetail[1];
     if (id !== "add") {
        const voucherListItem = items.find(item => item.path === "/dashboard/accounts/vouchers");
        parentItem = voucherListItem || { path: "/dashboard/accounts/vouchers", label: "Vouchers" };
        currentLabel = voucherLabel ? voucherLabel : "Voucher Details";
     }
  }

  // Handle Lead Details
  const isLeadDetail = pathname.match(/^\/dashboard\/crm\/leads\/([^\/]+)$/);
  if (isLeadDetail) {
     const id = isLeadDetail[1];
     if (id !== "add") {
        const leadListItem = items.find(item => item.path === "/dashboard/crm/leads");
        parentItem = leadListItem || { path: "/dashboard/crm/leads", label: "Leads" };
        currentLabel = leadNumber ? leadNumber : "Lead Details";
     }
  }

  // Handle Opportunity Details
  const isOpportunityDetail = pathname.match(/^\/dashboard\/crm\/opportunities\/([^\/]+)$/);
  if (isOpportunityDetail) {
     const id = isOpportunityDetail[1];
     if (id !== "add") {
        const opportunityListItem = items.find(item => item.path === "/dashboard/crm/opportunities");
        parentItem = opportunityListItem || { path: "/dashboard/crm/opportunities", label: "Opportunities" };
        // Use opportunityNumber state if available, otherwise fallback
        currentLabel = opportunityNumber ? opportunityNumber : "Opportunity Details";
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
