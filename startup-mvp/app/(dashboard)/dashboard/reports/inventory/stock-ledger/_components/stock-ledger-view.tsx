"use client";

import { useRouter } from "next/navigation";
import ReportFilters from "@/components/reports/report-filters";
import ReportTable from "@/components/reports/report-table";
import { format } from "date-fns";
import { StockTransactionType } from "@prisma/client";

interface StockLedgerViewProps {
  data: Array<{
    date: Date;
    itemCode: string;
    itemName: string;
    warehouse: string;
    warehouseCode: string;
    transactionType: StockTransactionType;
    quantity: number;
    rate: number;
    amount: number;
    referenceType: string;
    referenceId: string;
    notes: string;
    createdBy: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  warehouses: Array<{ id: string; name: string; code: string }>;
  items: Array<{ id: string; code: string; name: string }>;
  transactionTypeOptions: Array<{ value: string; label: string }>;
  referenceTypeOptions: Array<{ value: string; label: string }>;
  filters: {
    itemId?: string;
    warehouseId?: string;
    transactionType?: StockTransactionType | "all";
    dateFrom?: string;
    dateTo?: string;
    referenceType?: string;
    referenceId?: string;
  };
}

export default function StockLedgerView({
  data,
  pagination,
  warehouses,
  items,
  transactionTypeOptions,
  referenceTypeOptions,
  filters,
}: StockLedgerViewProps) {
  const router = useRouter();

  const columns = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      format: (value: Date) => format(new Date(value), "MMM dd, yyyy HH:mm"),
    },
    {
      key: "itemCode",
      label: "Item Code",
      sortable: true,
    },
    {
      key: "itemName",
      label: "Item Name",
      sortable: true,
    },
    {
      key: "warehouse",
      label: "Warehouse",
      sortable: true,
    },
    {
      key: "transactionType",
      label: "Type",
      sortable: true,
    },
    {
      key: "quantity",
      label: "Quantity",
      sortable: true,
      align: "right" as const,
      format: (value: number) => (value >= 0 ? "+" : "") + value.toFixed(2),
    },
    {
      key: "rate",
      label: "Rate",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right" as const,
      format: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value),
    },
    {
      key: "referenceType",
      label: "Reference Type",
      sortable: true,
    },
    {
      key: "referenceId",
      label: "Reference ID",
      sortable: true,
    },
    {
      key: "notes",
      label: "Notes",
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
      <ReportFilters
        config={{
          warehouses,
          items,
          transactionTypes: transactionTypeOptions,
        }}
        showDateRange={true}
        showWarehouse={true}
        showItem={true}
        showTransactionType={true}
        showSearch={true}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        warehouseId={filters.warehouseId}
        itemId={filters.itemId}
        transactionType={filters.transactionType || "all"}
      />

      <ReportTable
        title="Stock Ledger"
        columns={columns}
        data={data}
        pagination={{
          ...pagination,
          onPageChange: handlePageChange,
        }}
        exportFilename={`stock-ledger-${format(new Date(), "yyyy-MM-dd")}`}
        emptyMessage="No stock ledger entries found"
      />
    </div>
  );
}
