"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Account {
  id: string;
  code: string;
  name: string;
  amount: number;
}

interface ProfitLossViewProps {
  revenue: {
    accounts: Account[];
    total: number;
  };
  expenses: {
    accounts: Account[];
    total: number;
  };
  netIncome: number;
  startDate: Date;
  endDate: Date;
  startDateParam?: string;
  endDateParam?: string;
}

export default function ProfitLossView({
  revenue,
  expenses,
  netIncome,
  startDate,
  endDate,
  startDateParam,
  endDateParam,
}: ProfitLossViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleStartDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("startDate", value);
    } else {
      params.delete("startDate");
    }
    router.push(`/dashboard/accounts/profit-loss?${params.toString()}`);
  };

  const handleEndDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("endDate", value);
    } else {
      params.delete("endDate");
    }
    router.push(`/dashboard/accounts/profit-loss?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return `৳ ${new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const handleExportCSV = () => {
    const csvData = [
      ...revenue.accounts.map((acc) => ({
        Section: "Revenue",
        Code: acc.code,
        "Account Name": acc.name,
        Amount: acc.amount,
      })),
      ...expenses.accounts.map((acc) => ({
        Section: "Expenses",
        Code: acc.code,
        "Account Name": acc.name,
        Amount: acc.amount,
      })),
    ];
    exportToCSV(csvData, { filename: `profit-loss-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}.csv` });
  };

  const handleExportExcel = () => {
    const excelData = [
      ...revenue.accounts.map((acc) => ({
        Section: "Revenue",
        Code: acc.code,
        "Account Name": acc.name,
        Amount: acc.amount,
      })),
      ...expenses.accounts.map((acc) => ({
        Section: "Expenses",
        Code: acc.code,
        "Account Name": acc.name,
        Amount: acc.amount,
      })),
    ];
    exportToExcel(excelData, {
      filename: `profit-loss-${format(startDate, "yyyy-MM-dd")}-${format(endDate, "yyyy-MM-dd")}.xlsx`,
      headers: ["Section", "Code", "Account Name", "Amount"],
      columnWidths: [15, 15, 40, 20],
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Range Filter and Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">From:</label>
            <Input
              type="date"
              value={startDateParam || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-[200px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <Input
              type="date"
              value={endDateParam || new Date().toISOString().split("T")[0]}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-[200px]"
            />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">
                        No accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {revenue.accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="text-sm">
                            {account.code} - {account.name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total Revenue</TableCell>
                        <TableCell className="text-right">{formatCurrency(revenue.total)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">
                        No accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {expenses.accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="text-sm">
                            {account.code} - {account.name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total Expenses</TableCell>
                        <TableCell className="text-right">{formatCurrency(expenses.total)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Income */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(netIncome)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Revenue - Expenses</p>
              <p className="text-lg font-semibold">
                {formatCurrency(revenue.total)} - {formatCurrency(expenses.total)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

