"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { getWarehouseById } from "@/app/(dashboard)/dashboard/master/warehouses/_actions/warehouse.action";
import { getItemById } from "@/app/(dashboard)/dashboard/master/items/_actions/item.action";
import { getBOMById } from "@/app/(dashboard)/dashboard/production/boms/_actions/bom.action";
import { getProductionOrderById } from "@/app/(dashboard)/dashboard/production/orders/_actions/production.action";
import { getPurchaseById } from "@/app/(dashboard)/dashboard/procurements/purchases/_actions/purchase.action";
import { getCategoryById } from "@/app/(dashboard)/dashboard/master/categories/_actions/category.action";
import { getUnitById } from "@/app/(dashboard)/dashboard/master/units/_actions/unit.action";
import { getVoucherById } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { getAdjustment } from "@/app/(dashboard)/dashboard/inventory/adjustments/_actions/adjustment.action";
import { getSaleById } from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";
import { getEmployeeById } from "@/app/(dashboard)/dashboard/employees/_actions/employee.action";
import { getClientById } from "@/app/(dashboard)/dashboard/clients/_actions/client.action";
import { getGRNById } from "@/app/(dashboard)/dashboard/procurements/grn/_actions/grn.action";
import { getTPNById } from "@/app/(dashboard)/dashboard/procurements/tpn/_actions/tpn.action";
import { getReturnToVendorById } from "@/app/(dashboard)/dashboard/procurements/rtv/_actions/rtv.action";
import { getDamage } from "@/app/(dashboard)/dashboard/inventory/damage/_actions/damage.action";


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
  const searchParams = useSearchParams();
  const [quotationNumber, setQuotationNumber] = useState<string | null>(null);
  const [groupCode, setGroupCode] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string | null>(null);
  const [warehouseName, setWarehouseName] = useState<string | null>(null);
  const [workOrderCode, setWorkOrderCode] = useState<string | null>(null);
  const [bomName, setBomName] = useState<string | null>(null);
  const [productionOrderCode, setProductionOrderCode] = useState<string | null>(null);
  const [purchaseCode, setPurchaseCode] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [unitSymbol, setUnitSymbol] = useState<string | null>(null);
  const [voucherNumber, setVoucherNumber] = useState<string | null>(null);
  const [adjustmentNumber, setAdjustmentNumber] = useState<string | null>(null);
  const [saleNumber, setSaleNumber] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [clientCode, setClientCode] = useState<string | null>(null);
  const [grnNumber, setGrnNumber] = useState<string | null>(null);
  const [tpnNumber, setTpnNumber] = useState<string | null>(null);
  const [rtvNumber, setRtvNumber] = useState<string | null>(null);
  const [damageNumber, setDamageNumber] = useState<string | null>(null);
  const items = getBreadcrumbItems(pathname);

  // Check if we're on an inventory adjustment detail page
  const isAdjustmentDetailMatch = pathname.match(/^\/dashboard\/inventory\/adjustments\/([^\/]+)$/);
  const adjustmentId = isAdjustmentDetailMatch?.[1] || null;

  // Fetch adjustment number
  useEffect(() => {
    if (!adjustmentId) return;

    let cancelled = false;
    async function fetchAdjustment() {
       try {
          const result = await getAdjustment(adjustmentId!);
          if (!cancelled && result.success && result.adjustment) {
             setAdjustmentNumber(result.adjustment.adjustmentNumber);
          }
       } catch (error) {
          if (!cancelled) console.error(error);
       }
    }
    fetchAdjustment();
    return () => { cancelled = true; };
  }, [adjustmentId]);

  // Check if we're on a GRN detail or view page
  const isGRNDetailMatch = pathname.match(/^\/dashboard\/procurements\/grn\/([^\/]+)$/);
  const isGRNViewMatch = pathname.match(/^\/dashboard\/procurements\/grn\/([^\/]+)\/view$/);
  const grnId = isGRNDetailMatch?.[1] || isGRNViewMatch?.[1] || null;

  // Fetch GRN number
  useEffect(() => {
    if (!grnId) return;

    let cancelled = false;
    async function fetchGRN() {
      try {
        const result = await getGRNById(grnId!);
        if (!cancelled && result.success && result.grn) {
          setGrnNumber(result.grn.grnNumber);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching GRN:", error);
      }
    }
    fetchGRN();
    return () => {
      cancelled = true;
    };
  }, [grnId]);

  // Check if we're on a TPN detail page
  const isTPNDetailMatch = pathname.match(/^\/dashboard\/procurements\/tpn\/([^\/]+)$/);
  const tpnId = isTPNDetailMatch?.[1] || null;

  // Fetch TPN number
  useEffect(() => {
    if (!tpnId) return;

    let cancelled = false;
    async function fetchTPN() {
      try {
        const result = await getTPNById(tpnId!);
        if (!cancelled && result.success && result.data) {
          setTpnNumber(result.data.tpnNumber);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching TPN:", error);
      }
    }
    fetchTPN();
    return () => {
      cancelled = true;
    };
  }, [tpnId]);

  // Check if we're on an RTV detail or view page
  const isRTVDetailMatch = pathname.match(/^\/dashboard\/procurements\/rtv\/([^\/]+)$/);
  const isRTVViewMatch = pathname.match(/^\/dashboard\/procurements\/rtv\/([^\/]+)\/view$/);
  const rtvId = isRTVDetailMatch?.[1] || isRTVViewMatch?.[1] || null;

  // Fetch RTV number
  useEffect(() => {
    if (!rtvId) return;

    let cancelled = false;
    async function fetchRTV() {
      try {
        const result = await getReturnToVendorById(rtvId!);
        if (!cancelled && result.success && result.rtv) {
          setRtvNumber(result.rtv.rtvNumber);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching RTV:", error);
      }
    }
    fetchRTV();
    return () => {
      cancelled = true;
    };
  }, [rtvId]);

  // Check if we're on a Damage detail page
  const isDamageDetailMatch = pathname.match(/^\/dashboard\/inventory\/damage\/([^\/]+)$/);
  const isDamageEditMatch = pathname.match(/^\/dashboard\/inventory\/damage\/([^\/]+)\/edit$/);
  const damageId = isDamageDetailMatch?.[1] || isDamageEditMatch?.[1] || null;

  // Fetch Damage number
  useEffect(() => {
    if (!damageId) return;

    let cancelled = false;
    async function fetchDamage() {
      try {
        const result = await getDamage(damageId!);
        if (!cancelled && result.success && result.damage) {
          setDamageNumber(result.damage.damageNumber);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching Damage:", error);
      }
    }
    fetchDamage();
    return () => {
      cancelled = true;
    };
  }, [damageId]);

  // Check if we're on a unit detail or edit page
  const isUnitDetailMatch = pathname.match(/^\/dashboard\/master\/units\/([^\/]+)$/);
  const isUnitEditMatch = pathname.match(/^\/dashboard\/master\/units\/([^\/]+)\/edit$/);
  const isUnitDetailsPageMatch = pathname.match(/^\/dashboard\/master\/units\/details$/);
  const unitId = isUnitDetailMatch?.[1] || isUnitEditMatch?.[1] || (isUnitDetailsPageMatch ? searchParams.get("id") : null);

  // Check if we're on a category detail or edit page
  const isCategoryDetailMatch = pathname.match(/^\/dashboard\/master\/categories\/([^\/]+)$/);
  const isCategoryEditMatch = pathname.match(/^\/dashboard\/master\/categories\/([^\/]+)\/edit$/);
  const categoryId = isCategoryDetailMatch?.[1] || isCategoryEditMatch?.[1] || null;

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

  // Check if we're on a production order detail or edit page
  const isProductionOrderDetailMatch = pathname.match(/^\/dashboard\/production\/orders\/([^\/]+)$/);
  const isProductionOrderEditMatch = pathname.match(/^\/dashboard\/production\/orders\/([^\/]+)\/edit$/);
  const productionOrderId = isProductionOrderDetailMatch?.[1] || isProductionOrderEditMatch?.[1] || null;

  // Check if we're on a purchase detail, edit, or view page
  const isPurchaseDetailMatch = pathname.match(/^\/dashboard\/procurements\/purchases\/([^\/]+)$/);
  const isPurchaseEditMatch = pathname.match(/^\/dashboard\/procurements\/purchases\/([^\/]+)\/edit$/);
  const isPurchaseViewMatch = pathname.match(/^\/dashboard\/procurements\/purchases\/([^\/]+)\/view$/);
  const purchaseId = isPurchaseDetailMatch?.[1] || isPurchaseEditMatch?.[1] || isPurchaseViewMatch?.[1] || null;

  // Check if we're on a voucher detail page
  const isVoucherDetailMatch = pathname.match(/^\/dashboard\/accounts\/vouchers\/([^\/]+)$/);
  const voucherId = isVoucherDetailMatch?.[1] || null;

  // Check if we're on a sale detail, edit, or view page
  const isSaleDetailMatch = pathname.match(/^\/dashboard\/sales\/([^\/]+)$/);
  const isSaleEditMatch = pathname.match(/^\/dashboard\/sales\/([^\/]+)\/edit$/);
  const isSaleViewMatch = pathname.match(/^\/dashboard\/sales\/([^\/]+)\/view$/);
  const saleId = isSaleDetailMatch?.[1] || isSaleEditMatch?.[1] || isSaleViewMatch?.[1] || null;
  
  // Check if we're on an employee detail or edit page
  const isEmployeeDetailMatch = pathname.match(/^\/dashboard\/employees\/([^\/]+)$/);
  const isEmployeeEditMatch = pathname.match(/^\/dashboard\/employees\/([^\/]+)\/edit$/);
  const isEmployeeDetailsPageMatch = pathname.match(/^\/dashboard\/employees\/details$/);
  const employeeId = isEmployeeDetailMatch?.[1] || isEmployeeEditMatch?.[1] || (isEmployeeDetailsPageMatch ? searchParams.get("id") : null);

  // Check if we're on a client detail or edit page
  const isClientDetailMatch = pathname.match(/^\/dashboard\/clients\/([^\/]+)$/);
  const isClientEditMatch = pathname.match(/^\/dashboard\/clients\/([^\/]+)\/edit$/);
  const isClientDetailsPageMatch = pathname.match(/^\/dashboard\/clients\/details$/);
  const clientId = isClientDetailMatch?.[1] || isClientEditMatch?.[1] || (isClientDetailsPageMatch ? searchParams.get("id") : null);

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

  // Fetch production order code when on production order detail/edit page
  useEffect(() => {
    if (!productionOrderId) {
      return;
    }
    
    let cancelled = false;
    const id: string = productionOrderId; // Type assertion since we've checked for null
    
    async function fetchProductionOrderCode() {
      try {
        const result = await getProductionOrderById(id);
        if (!cancelled && result.success && result.order) {
          setProductionOrderCode(result.order.code);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching production order code:", error);
        }
      }
    }
    
    fetchProductionOrderCode();
    
    return () => {
      cancelled = true;
    };
  }, [productionOrderId]);

  // Fetch purchase code when on purchase detail/edit/view page
  useEffect(() => {
    if (!purchaseId) {
      return;
    }
    
    let cancelled = false;
    const id: string = purchaseId; // Type assertion since we've checked for null
    
    async function fetchPurchaseCode() {
      try {
        const result = await getPurchaseById(id);
        if (!cancelled && result.success && result.purchase) {
          setPurchaseCode(result.purchase.purchaseNumber);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching purchase code:", error);
        }
      }
    }
    
    fetchPurchaseCode();
    
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  // Fetch category name when on category detail/edit page
  useEffect(() => {
    if (!categoryId || categoryId === "add") {
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

  // Fetch unit symbol when on unit detail/edit page
  useEffect(() => {
    if (!unitId || unitId === "add" || unitId === "details") {
      return;
    }
    
    let cancelled = false;
    const id = unitId;
    
    async function fetchUnitSymbol() {
      try {
        const result = await getUnitById(id);
        if (!cancelled && result.success && result.unit) {
          setUnitSymbol(result.unit.symbol);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching unit symbol:", error);
        }
      }
    }
    
    fetchUnitSymbol();
    
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  // Fetch voucher number when on voucher detail page
  useEffect(() => {
    if (!voucherId) {
      return;
    }
    
    let cancelled = false;
    const id = voucherId;
    
    async function fetchVoucherNumber() {
      try {
        const result = await getVoucherById(id);
        if (!cancelled && result.success && result.voucher) {
          setVoucherNumber(result.voucher.voucherNumber);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching voucher number:", error);
        }
      }
    }
    
    fetchVoucherNumber();
    
    return () => {
      cancelled = true;
    };
  }, [voucherId]);

  // Fetch sale number when on sale detail/edit/view page
  useEffect(() => {
    if (!saleId) return;
    
    let cancelled = false;
    async function fetchSaleNumber() {
      try {
        const result = await getSaleById(saleId!);
        if (!cancelled && result.success && result.sale) {
          setSaleNumber(result.sale.saleNumber);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching sale number:", error);
      }
    }
    fetchSaleNumber();
    return () => { cancelled = true; };
  }, [saleId]);

  // Fetch employee code when on employee detail/edit page
  useEffect(() => {
    if (!employeeId || employeeId === "add" || employeeId === "details") {
      return;
    }
    
    let cancelled = false;
    async function fetchEmployeeCode() {
      try {
        const result = await getEmployeeById(employeeId!);
        if (!cancelled && result.success && result.employee) {
          setEmployeeCode(result.employee.employeeCode);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching employee code:", error);
      }
    }
    fetchEmployeeCode();
    return () => { cancelled = true; };
  }, [employeeId]);

  // Fetch client code when on client detail/edit page
  useEffect(() => {
    if (!clientId || clientId === "add" || clientId === "details") {
      return;
    }
    
    let cancelled = false;
    async function fetchClientCode() {
      try {
        const result = await getClientById(clientId!);
        if (!cancelled && result.success && result.client) {
          setClientCode(result.client.clientCode);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching client code:", error);
      }
    }
    fetchClientCode();
    return () => { cancelled = true; };
  }, [clientId]);

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

  // If we're on a unit detail or edit page, use unit symbol instead of ID
  // For unit routes, replace the ID segment with "Units" as parent
  if (isUnitDetailMatch || isUnitEditMatch || isUnitDetailsPageMatch) {
    // Find the "Units" item (should be before the ID)
    const unitsItem = items.find(item => item.path === "/dashboard/master/units");
    if (unitsItem) {
      parentItem = unitsItem;
    } else {
      // If not found, create a parent item pointing to units list
      parentItem = { path: "/dashboard/master/units", label: "Units" };
    }
    
    // Update current label with unit symbol
    if (unitSymbol) {
      currentLabel = isUnitEditMatch ? `Edit ${unitSymbol}` : unitSymbol;
    } else if (isUnitDetailsPageMatch) {
      currentLabel = unitSymbol || "Unit Details";
    } else {
      // Show loading state or default while fetching
      currentLabel = isUnitEditMatch ? "Edit Unit" : "Unit Details";
    }
  }

  // If we're on a category detail or edit page, use category name instead of ID
  // For category routes, replace the ID segment with "Categories" as parent
  if (isCategoryDetailMatch || isCategoryEditMatch) {
    // Find the "Categories" item (should be before the ID)
    const categoriesItem = items.find(item => item.path === "/dashboard/master/categories");
    if (categoriesItem) {
      parentItem = categoriesItem;
    } else {
      // If not found, create a parent item pointing to categories list
      parentItem = { path: "/dashboard/master/categories", label: "Categories" };
    }
    
    // Update current label with category name
    if (categoryName) {
      currentLabel = isCategoryEditMatch ? `Edit ${categoryName}` : categoryName;
    } else {
      // Show loading state or default while fetching
      currentLabel = isCategoryEditMatch ? "Edit Category" : "Category Details";
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

  // If we're on a production order detail or edit page, use production order code instead of ID
  // For production order routes, replace the ID segment with "Production Orders" as parent
  if (isProductionOrderDetailMatch || isProductionOrderEditMatch) {
    // Find the "Production Orders" item (should be before the ID)
    const ordersItem = items.find(item => item.path === "/dashboard/production/orders");
    if (ordersItem) {
      parentItem = ordersItem;
    } else {
      // If not found, create a parent item pointing to production orders list
      parentItem = { path: "/dashboard/production/orders", label: "Production Orders" };
    }
    
    // Update current label with production order code
    if (productionOrderCode) {
      currentLabel = isProductionOrderEditMatch ? `Edit ${productionOrderCode}` : productionOrderCode;
    } else {
      // Show loading state or default while fetching
      currentLabel = isProductionOrderEditMatch ? "Edit Production Order" : "Production Order Details";
    }
  }

  // If we're on a purchase detail, edit, or view page, use purchase code instead of ID
  // For purchase routes, replace the ID segment with "Purchases" as parent
  if (isPurchaseDetailMatch || isPurchaseEditMatch || isPurchaseViewMatch) {
    // Find the "Purchases" item (should be before the ID)
    const purchasesItem = items.find(item => item.path === "/dashboard/procurements/purchases");
    if (purchasesItem) {
      parentItem = purchasesItem;
    } else {
      // If not found, create a parent item pointing to purchases list
      parentItem = { path: "/dashboard/procurements/purchases", label: "Purchases" };
    }
    
    // Update current label with purchase code
    if (purchaseCode) {
      if (isPurchaseEditMatch) {
        currentLabel = `Edit ${purchaseCode}`;
      } else if (isPurchaseViewMatch) {
        currentLabel = purchaseCode;
      } else {
        // For detail page (redirects to view)
        currentLabel = purchaseCode;
      }
    } else {
      // Show loading state or default while fetching
      if (isPurchaseEditMatch) {
        currentLabel = "Edit Purchase";
      } else {
        currentLabel = "Purchase Details";
      }
    }
  }

  // If we're on a voucher detail page, use voucher number instead of ID
  if (isVoucherDetailMatch) {
    // Find the "Vouchers" item (should be before the ID)
    const vouchersItem = items.find(item => item.path === "/dashboard/accounts/vouchers");
    if (vouchersItem) {
      parentItem = vouchersItem;
    } else {
      // If not found, create a parent item pointing to vouchers list
      parentItem = { path: "/dashboard/accounts/vouchers", label: "Vouchers" };
    }
    
    // Update current label with voucher number
    if (voucherNumber) {
      currentLabel = voucherNumber;
    } else {
      // Show loading state or default while fetching
      currentLabel = "Voucher Details";
    }
  }

  // If we're on a sale detail, edit, or view page, use sale number instead of ID
  if (isSaleDetailMatch || isSaleEditMatch || isSaleViewMatch) {
    const salesItem = items.find(item => item.path === "/dashboard/sales");
    if (salesItem) {
      parentItem = salesItem;
    } else {
      parentItem = { path: "/dashboard/sales", label: "Sales" };
    }
    
    if (saleNumber) {
      currentLabel = isSaleEditMatch ? `Edit ${saleNumber}` : saleNumber;
    } else {
      currentLabel = isSaleEditMatch ? "Edit Sale" : "Sale Details";
    }
  }

  // If we're on an employee detail or edit page, use employee code instead of ID
  if (isEmployeeDetailMatch || isEmployeeEditMatch || isEmployeeDetailsPageMatch) {
    const employeesItem = items.find(item => item.path === "/dashboard/employees");
    if (employeesItem) {
      parentItem = employeesItem;
    } else {
      parentItem = { path: "/dashboard/employees", label: "Employees" };
    }
    
    if (employeeCode) {
      currentLabel = isEmployeeEditMatch ? `Edit ${employeeCode}` : employeeCode;
    } else if (isEmployeeDetailsPageMatch) {
      currentLabel = employeeCode || "Employee Details";
    } else {
      currentLabel = isEmployeeEditMatch ? "Edit Employee" : "Employee Details";
    }
  }

  // If we're on a client detail or edit page, use client code instead of ID
  if (isClientDetailMatch || isClientEditMatch || isClientDetailsPageMatch) {
    const clientsItem = items.find(item => item.path === "/dashboard/clients");
    if (clientsItem) {
      parentItem = clientsItem;
    } else {
      parentItem = { path: "/dashboard/clients", label: "Clients" };
    }
    
    if (clientCode) {
      currentLabel = isClientEditMatch ? `Edit ${clientCode}` : clientCode;
    } else if (isClientDetailsPageMatch) {
      currentLabel = clientCode || "Client Details";
    } else {
      currentLabel = isClientEditMatch ? "Edit Client" : "Client Details";
    }
  }

  // Check if we're on an inventory adjustment detail page
  // Variables declared at top of component

  if (isAdjustmentDetailMatch) {
     const adjustmentsItem = items.find(item => item.path === "/dashboard/inventory/adjustments");
     if (adjustmentsItem) {
        parentItem = adjustmentsItem;
     } else {
        parentItem = { path: "/dashboard/inventory/adjustments", label: "Adjustments" };
     }

     if (adjustmentNumber) {
        currentLabel = adjustmentNumber;
     } else {
        currentLabel = "Adjustment Details";
     }
  }

  if (isGRNDetailMatch || isGRNViewMatch) {
     const grnItem = items.find(item => item.path === "/dashboard/procurements/grn");
     if (grnItem) {
        parentItem = grnItem;
     } else {
        parentItem = { path: "/dashboard/procurements/grn", label: "GRN" };
     }

     if (grnNumber) {
        currentLabel = grnNumber;
     } else {
        currentLabel = "GRN Details";
     }
  }

  if (isTPNDetailMatch) {
     const tpnItem = items.find(item => item.path === "/dashboard/procurements/tpn");
     if (tpnItem) {
        parentItem = tpnItem;
     } else {
        parentItem = { path: "/dashboard/procurements/tpn", label: "TPN" };
     }

     if (tpnNumber) {
        currentLabel = tpnNumber;
     } else {
        currentLabel = "TPN Details";
     }
  }

  if (isRTVDetailMatch || isRTVViewMatch) {
     const rtvItem = items.find(item => item.path === "/dashboard/procurements/rtv");
     if (rtvItem) {
        parentItem = rtvItem;
     } else {
        parentItem = { path: "/dashboard/procurements/rtv", label: "RTV" };
     }

     if (rtvNumber) {
        currentLabel = rtvNumber;
     } else {
        currentLabel = "RTV Details";
     }
  }

  if (isDamageDetailMatch || isDamageEditMatch) {
     const damageItem = items.find(item => item.path === "/dashboard/inventory/damage");
     if (damageItem) {
        parentItem = damageItem;
     } else {
        parentItem = { path: "/dashboard/inventory/damage", label: "Damage" };
     }

     if (damageNumber) {
        currentLabel = isDamageEditMatch ? `Edit ${damageNumber}` : damageNumber;
     } else {
        currentLabel = isDamageEditMatch ? "Edit Damage" : "Damage Details";
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

