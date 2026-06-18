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
import { Badge } from "@/components/ui/badge";
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
  balance: number;
}

interface BalanceSheetViewProps {
  assets: {
    accounts: Account[];
    total: number;
  };
  liabilities: {
    accounts: Account[];
    total: number;
  };
  equity: {
    accounts: Account[];
    netIncome: number;
    total: number;
  };
  validation: {
    assetsTotal: number;
    liabilitiesTotal: number;
    equityTotal: number;
    isBalanced: boolean;
    difference: number;
  };
  date: Date;
  dateParam?: string;
}

export default function BalanceSheetView({
  assets,
  liabilities,
  equity,
  validation,
  date,
  dateParam,
}: BalanceSheetViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("date", value);
    } else {
      params.delete("date");
    }
    router.push(`/dashboard/accounts/balance-sheet?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return `৳ ${new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const handleExportCSV = () => {
    const csvData = [
      ...assets.accounts.map((acc) => ({
        Section: "Assets",
        Code: acc.code,
        "Account Name": acc.name,
        Balance: acc.balance,
      })),
      ...liabilities.accounts.map((acc) => ({
        Section: "Liabilities",
        Code: acc.code,
        "Account Name": acc.name,
        Balance: acc.balance,
      })),
      ...equity.accounts.map((acc) => ({
        Section: "Equity",
        Code: acc.code,
        "Account Name": acc.name,
        Balance: acc.balance,
      })),
    ];
    exportToCSV(csvData, { filename: `balance-sheet-${format(date, "yyyy-MM-dd")}.csv` });
  };

  const handleExportExcel = () => {
    const excelData = [
      ...assets.accounts.map((acc) => ({
        Section: "Assets",
        Code: acc.code,
        "Account Name": acc.name,
        Balance: acc.balance,
      })),
      ...liabilities.accounts.map((acc) => ({
        Section: "Liabilities",
        Code: acc.code,
        "Account Name": acc.name,
        Balance: acc.balance,
      })),
      ...equity.accounts.map((acc) => ({
        Section: "Equity",
        Code: acc.code,
        "Account Name": acc.name,
        Balance: acc.balance,
      })),
    ];
    exportToExcel(excelData, {
      filename: `balance-sheet-${format(date, "yyyy-MM-dd")}.xlsx`,
      headers: ["Section", "Code", "Account Name", "Balance"],
      columnWidths: [15, 15, 40, 20],
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Filter and Export */}
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
          <Badge variant={validation.isBalanced ? "default" : "destructive"}>
            {validation.isBalanced ? "Balanced" : `Unbalanced: ${formatCurrency(validation.difference)}`}
          </Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">
                        No accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {assets.accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="text-sm">
                            {account.code} - {account.name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total Assets</TableCell>
                        <TableCell className="text-right">{formatCurrency(assets.total)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liabilities.accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">
                        No accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {liabilities.accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="text-sm">
                            {account.code} - {account.name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total Liabilities</TableCell>
                        <TableCell className="text-right">{formatCurrency(liabilities.total)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Equity */}
        <Card>
          <CardHeader>
            <CardTitle>Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equity.accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">
                        No accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {equity.accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="text-sm">
                            {account.code} - {account.name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(account.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {equity.netIncome !== 0 && (
                        <TableRow>
                          <TableCell className="text-sm">Net Income</TableCell>
                          <TableCell className={`text-right font-medium ${equity.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(equity.netIncome)}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total Equity</TableCell>
                        <TableCell className="text-right">{formatCurrency(equity.total)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-lg font-semibold">{formatCurrency(validation.assetsTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Liabilities + Equity</p>
              <p className="text-lg font-semibold">
                {formatCurrency(validation.liabilitiesTotal + validation.equityTotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Difference</p>
              <p className={`text-lg font-semibold ${validation.isBalanced ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(validation.difference)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

