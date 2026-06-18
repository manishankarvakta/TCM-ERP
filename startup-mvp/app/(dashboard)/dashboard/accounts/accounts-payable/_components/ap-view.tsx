"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiDownload, FiFileText, FiFile } from "react-icons/fi";
import { exportToCSV } from "@/lib/utils/export-csv";
import { exportToExcel } from "@/lib/utils/export-excel";
import { format } from "date-fns";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface APViewProps {
  initialSuppliers: Array<{
    supplier: Supplier;
    balance: number;
    totalDebit: number;
    totalCredit: number;
    entryCount: number;
    aging?: {
      "0-30": number;
      "31-60": number;
      "61-90": number;
      "90+": number;
    };
  }>;
  initialTotal: number;
  asOfDate: Date;
  dateParam?: string;
  initialIncludeAging?: boolean;
}

export default function APView({
  initialSuppliers,
  initialTotal,
  asOfDate,
  dateParam,
  initialIncludeAging = false,
}: APViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [includeAging, setIncludeAging] = useState(initialIncludeAging);
  const [isPending, startTransition] = useTransition();

  const handleDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("date", value);
    } else {
      params.delete("date");
    }
    router.push(`/dashboard/accounts/accounts-payable?${params.toString()}`);
  };

  const handleAgingToggle = (checked: boolean) => {
    setIncludeAging(checked);
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("aging", "true");
    } else {
      params.delete("aging");
    }
    startTransition(() => {
      router.push(`/dashboard/accounts/accounts-payable?${params.toString()}`);
    });
  };

  const formatCurrency = (amount: number) => {
    return `৳ ${new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const handleExportCSV = () => {
    const csvData = initialSuppliers.map((item) => {
      const base = {
        Supplier: item.supplier.name || item.supplier.email || "Unknown",
        Company: item.supplier.company || "",
        Email: item.supplier.email || "",
        Phone: item.supplier.phone || "",
        Balance: item.balance,
        "Total Debit": item.totalDebit,
        "Total Credit": item.totalCredit,
        "Entry Count": item.entryCount,
      };
      if (includeAging && item.aging) {
        return {
          ...base,
          "0-30 Days": item.aging["0-30"],
          "31-60 Days": item.aging["31-60"],
          "61-90 Days": item.aging["61-90"],
          "90+ Days": item.aging["90+"],
        };
      }
      return base;
    });
    exportToCSV(csvData, { filename: `accounts-payable-${format(asOfDate, "yyyy-MM-dd")}.csv` });
  };

  const handleExportExcel = () => {
    const excelData = initialSuppliers.map((item) => {
      const base = {
        Supplier: item.supplier.name || item.supplier.email || "Unknown",
        Company: item.supplier.company || "",
        Email: item.supplier.email || "",
        Phone: item.supplier.phone || "",
        Balance: item.balance,
        "Total Debit": item.totalDebit,
        "Total Credit": item.totalCredit,
        "Entry Count": item.entryCount,
      };
      if (includeAging && item.aging) {
        return {
          ...base,
          "0-30 Days": item.aging["0-30"],
          "31-60 Days": item.aging["31-60"],
          "61-90 Days": item.aging["61-90"],
          "90+ Days": item.aging["90+"],
        };
      }
      return base;
    });
    exportToExcel(excelData, {
      filename: `accounts-payable-${format(asOfDate, "yyyy-MM-dd")}.xlsx`,
      columnWidths: [25, 25, 25, 15, 15, 15, 15, 12, 15, 15, 15, 15],
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters and Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">As of Date:</label>
            <Input
              type="date"
              value={dateParam || new Date().toISOString().split("T")[0]}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-[200px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="aging"
              checked={includeAging}
              onCheckedChange={handleAgingToggle}
              disabled={isPending}
            />
            <Label htmlFor="aging" className="cursor-pointer">
              Show Aging Analysis
            </Label>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FiDownload className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FiFileText className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel}>
              <FiFile className="h-4 w-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Accounts Payable</p>
            <p className="text-2xl font-bold">{formatCurrency(initialTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{initialSuppliers.length} Suppliers</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              {includeAging && (
                <>
                  <TableHead className="text-right">0-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">90+ Days</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={includeAging ? 8 : 3} className="text-center py-8 text-muted-foreground">
                  No accounts payable found
                </TableCell>
              </TableRow>
            ) : (
              initialSuppliers.map((item) => (
                <TableRow key={item.supplier.id}>
                  <TableCell className="font-medium">{item.supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.supplier.company || "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.balance)}
                  </TableCell>
                  {includeAging && item.aging && (
                    <>
                      <TableCell className="text-right">
                        {item.aging["0-30"] > 0 ? formatCurrency(item.aging["0-30"]) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.aging["31-60"] > 0 ? formatCurrency(item.aging["31-60"]) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.aging["61-90"] > 0 ? formatCurrency(item.aging["61-90"]) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.aging["90+"] > 0 ? formatCurrency(item.aging["90+"]) : "-"}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

