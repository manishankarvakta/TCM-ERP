"use client";

import { useRouter } from "next/navigation";
import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";
import { ProductionOrderStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductionOrderSummaryViewProps {
  data: Array<{
    productionOrderCode: string;
    bomName: string;
    bomCode: string;
    finishedGoodItem: string;
    finishedGoodItemCode: string;
    warehouse: string;
    warehouseCode: string;
    quantity: number;
    status: ProductionOrderStatus;
    createdDate: Date;
    completedDate: Date | null;
    rawMaterialCost: number;
    createdBy: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusBreakdown: Array<{ status: string; count: number }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  items: Array<{ id: string; code: string; name: string }>;
  boms: Array<{ id: string; name: string; code: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  filters: {
    status?: ProductionOrderStatus | "all";
    warehouseId?: string;
    itemId?: string;
    bomId?: string;
    dateFrom?: string;
    dateTo?: string;
    dateRangeType?: "created" | "completed";
  };
}

const statusColors: Record<ProductionOrderStatus, string> = {
  PLANNED: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

export default function ProductionOrderSummaryView({
  data,
  pagination,
  statusBreakdown,
  warehouses,
  items,
  boms,
  statusOptions,
  filters,
}: ProductionOrderSummaryViewProps) {
  const router = useRouter();

  const columns = [
    {
      key: "productionOrderCode",
      label: "Order Code",
      sortable: true,
    },
    {
      key: "bomName",
      label: "BOM",
      sortable: true,
    },
    {
      key: "finishedGoodItem",
      label: "Ready Product",
      sortable: true,
    },
    {
      key: "warehouse",
      label: "Warehouse",
      sortable: true,
    },
    {
      key: "quantity",
      label: "Quantity",
      sortable: true,
      align: "right" as const,
      format: (value: number) => value.toFixed(2),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      format: (value: ProductionOrderStatus) => value.replace("_", " "),
    },
    {
      key: "createdDate",
      label: "Created Date",
      sortable: true,
      format: (value: Date) => format(new Date(value), "MMM dd, yyyy"),
    },
    {
      key: "completedDate",
      label: "Completed Date",
      sortable: true,
      format: (value: Date | null) =>
        value ? format(new Date(value), "MMM dd, yyyy") : "-",
    },
    {
      key: "rawMaterialCost",
      label: "Raw Material Cost",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "createdBy",
      label: "Created By",
      sortable: true,
    },
  ];

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {statusBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <Badge
                    className={
                      statusColors[item.status as ProductionOrderStatus] || "bg-gray-500"
                    }
                  >
                    {item.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {item.count} orders
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ReportFilters
        config={{
          warehouses,
          items,
          statuses: statusOptions,
        }}
        showDateRange={true}
        showWarehouse={true}
        showItem={true}
        showStatus={true}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        warehouseId={filters.warehouseId}
        itemId={filters.itemId}
        status={filters.status || "all"}
      />

      <ReportTable
        title="Production Order Summary"
        columns={columns}
        data={data}
        pagination={{
          ...pagination,
          onPageChange: handlePageChange,
        }}
        exportFilename={`production-order-summary-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No production orders found"
      />
    </div>
  );
}
