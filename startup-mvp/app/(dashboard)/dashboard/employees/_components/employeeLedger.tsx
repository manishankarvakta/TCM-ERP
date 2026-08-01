"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FiArrowLeft,
  FiPrinter,
  FiSearch,
  FiCalendar,
  FiFileText,
  FiDollarSign,
  FiCreditCard,
  FiUser,
  FiPhone,
  FiMail,
  FiBriefcase,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import { format } from "date-fns";
import PrintHeader, { PrintStyle } from "@/app/(dashboard)/dashboard/procurements/_components/print-header";

interface LedgerItem {
  id: string;
  date: Date | string;
  type: string;
  typeLabel: string;
  reference: string;
  description: string;
  status?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface EmployeeData {
  id: string;
  name: string;
  employeeCode: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  salary: number;
  status: string;
  joiningDate: Date | string | null;
  salaryPayableAccount?: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;
  advanceAccount?: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;
  createdAt: Date | string;
}

interface LedgerSummary {
  totalEarned: number;
  totalPaid: number;
  closingBalance: number;
  totalTransactions: number;
}

interface EmployeeLedgerProps {
  employee: EmployeeData;
  ledger: LedgerItem[];
  summary: LedgerSummary;
  initialStartDate?: string;
  initialEndDate?: string;
  organization?: {
    name?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export default function EmployeeLedger({
  employee,
  ledger,
  summary,
  initialStartDate = "",
  initialEndDate = "",
  organization,
}: EmployeeLedgerProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [search, setSearch] = useState("");

  const handleFilter = () => {
    const params = new URLSearchParams();
    params.set("id", employee.id);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`/dashboard/employees/ledger?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    router.push(`/dashboard/employees/ledger?id=${employee.id}`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter transactions by search query locally
  const filteredLedger = ledger.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.reference.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.typeLabel.toLowerCase().includes(query)
    );
  });

  const getTypeBadge = (type: string, typeLabel: string) => {
    switch (type) {
      case "PAYROLL":
        return (
          <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-medium">
            Payroll
          </Badge>
        );
      case "PAYMENT":
        return (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 font-medium">
            Payment
          </Badge>
        );
      case "LOAN":
        return (
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30 font-medium">
            Loan Advance
          </Badge>
        );
      case "FINE":
        return (
          <Badge variant="outline" className="border-rose-500/30 text-rose-600 bg-rose-50/50 dark:bg-rose-950/30 font-medium">
            Fine
          </Badge>
        );
      case "BONUS":
        return (
          <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-50/50 dark:bg-purple-950/30 font-medium">
            Bonus
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="font-medium">{typeLabel}</Badge>;
    }
  };

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Print-only: multi-page print fix + page numbering */}
      <PrintStyle />

      {/* Print-only Branded Header */}
      <PrintHeader
        docNumber={employee.employeeCode || employee.id.slice(-8).toUpperCase()}
        docTitle="EMPLOYEE LEDGER STATEMENT"
        organizationName={organization?.name}
        organizationAddress={organization?.address}
        organizationEmail={organization?.email}
        organizationPhone={organization?.phone}
      />

      {/* Print-only Summary Section — 2-col: entity details + account overview */}
      <div className="hidden print:block mb-4">
        <div className="grid grid-cols-2 text-[11px] border border-gray-300 rounded overflow-hidden">
          {/* Left: Employee Details */}
          <div className="p-3 space-y-1 border-r border-gray-300">
            <div className="font-semibold text-gray-500 uppercase text-[9px] tracking-widest mb-1.5">
              Employee Details
            </div>
            <div>
              <span className="font-semibold">Name:</span> {employee.name}
            </div>
            <div>
              <span className="font-semibold">ID:</span> {employee.employeeCode || "-"}
            </div>
            {employee.designation && (
              <div>
                <span className="font-semibold">Designation:</span> {employee.designation}
              </div>
            )}
            {employee.department && (
              <div>
                <span className="font-semibold">Department:</span> {employee.department}
              </div>
            )}
            {employee.phone && (
              <div>
                <span className="font-semibold">Phone:</span> {employee.phone}
              </div>
            )}
            {employee.email && (
              <div>
                <span className="font-semibold">Email:</span> {employee.email}
              </div>
            )}
          </div>

          {/* Right: Account Overview Summary */}
          <div className="p-3 space-y-1">
            <div className="font-semibold text-gray-500 uppercase text-[9px] tracking-widest mb-1.5">
              Account Overview Summary
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
              <span className="text-gray-600">Base Monthly Salary:</span>
              <span className="font-mono font-medium">
                ৳{employee.salary.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
              <span className="text-gray-600">Total Earned / Accrued:</span>
              <span className="font-mono font-semibold text-blue-700">
                ৳{summary.totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
              <span className="text-gray-600">Total Paid / Disbursed:</span>
              <span className="font-mono font-semibold text-emerald-700">
                ৳{summary.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-bold uppercase text-[9px] tracking-wide">Net Outstanding Balance:</span>
              <span
                className={`font-mono font-black text-sm ${
                  summary.closingBalance > 0
                    ? "text-amber-600"
                    : summary.closingBalance < 0
                    ? "text-emerald-600"
                    : "text-gray-800"
                }`}
              >
                ৳{summary.closingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header Actions (hidden on print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/employees">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Employees
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/employees/details?id=${employee.id}`}>
              <FiFileText className="mr-2 h-4 w-4" />
              Employee Details
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow">
            <FiPrinter className="mr-2 h-4 w-4" />
            Print Ledger
          </Button>
        </div>
      </div>


      {/* Employee Overview Header Card (Screen View) */}
      <Card className="border-2 shadow-sm bg-card print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <FiUser className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
                    {employee.employeeCode && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {employee.employeeCode}
                      </Badge>
                    )}
                    <Badge variant={employee.status === "active" ? "default" : "destructive"}>
                      {employee.status}
                    </Badge>
                  </div>
                  {(employee.designation || employee.department) && (
                    <p className="text-sm font-medium text-muted-foreground">
                      {[employee.designation, employee.department].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-1">
                {employee.phone && (
                  <span className="flex items-center gap-1.5">
                    <FiPhone className="h-4 w-4 text-primary/70" />
                    {employee.phone}
                  </span>
                )}
                {employee.email && (
                  <span className="flex items-center gap-1.5">
                    <FiMail className="h-4 w-4 text-primary/70" />
                    {employee.email}
                  </span>
                )}
                {employee.salary > 0 && (
                  <span className="flex items-center gap-1.5">
                    <FiBriefcase className="h-4 w-4 text-primary/70" />
                    Base Salary: ৳{employee.salary.toLocaleString("en-US")}
                  </span>
                )}
                {employee.salaryPayableAccount && (
                  <span className="flex items-center gap-1.5 text-xs font-mono bg-muted px-2 py-0.5 rounded">
                    Payable AC: {employee.salaryPayableAccount.code}
                  </span>
                )}
              </div>
            </div>

            {/* Total Outstanding Payable Due Badge */}
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 min-w-[220px] text-right">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider block">
                Current Payable Due
              </span>
              <span
                className={`text-2xl font-black ${
                  summary.closingBalance > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                ৳{summary.closingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground block mt-0.5">
                {summary.closingBalance > 0
                  ? "Net Salary Owed to Employee"
                  : summary.closingBalance < 0
                  ? "Advance Owed by Employee"
                  : "Account Cleared"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Cards (Screen View) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-200/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Total Salary / Earned</span>
              <FiTrendingUp className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
              ৳{summary.totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total payroll & bonuses accrued</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-200/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Total Paid / Disbursed</span>
              <FiTrendingDown className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              ৳{summary.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total disbursements & loan advances</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/20 dark:to-violet-950/10 border-purple-200/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Base Monthly Salary</span>
              <FiDollarSign className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
              ৳{employee.salary.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Base monthly salary structure</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Ending Balance</span>
              <FiCreditCard className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
              ৳{summary.closingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filtering and Search Controls (hidden on print) */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FiCalendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date Range:</span>
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto h-9 text-sm"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto h-9 text-sm"
              />
              <Button size="sm" onClick={handleFilter}>
                Filter
              </Button>
              {(startDate || endDate) && (
                <Button size="sm" variant="ghost" onClick={handleResetFilter}>
                  Reset
                </Button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative w-full md:w-64">
              <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search reference / description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Employee Activity Ledger Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Employee Transaction Activity Ledger</CardTitle>
              <CardDescription>
                Chronological record of payroll, payments, loans, fines, bonuses, and running balance
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              {filteredLedger.length} Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px] font-semibold">Date</TableHead>
                  <TableHead className="w-[90px] font-semibold">Type</TableHead>
                  <TableHead className="w-[100px] font-semibold print:hidden">Status</TableHead>
                  <TableHead className="w-[120px] font-semibold">Reference #</TableHead>
                  <TableHead className="w-[230px] max-w-[230px] font-semibold">Description / Notes</TableHead>
                  <TableHead className="text-right w-[110px] font-semibold text-blue-600 dark:text-blue-400">
                    Earned (Credit)
                  </TableHead>
                  <TableHead className="text-right w-[110px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Paid/Deducted (Debit)
                  </TableHead>
                  <TableHead className="text-right w-[120px] font-semibold">
                    Running Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No activity or ledger transactions found for this employee.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap text-xs py-2">
                        {format(new Date(item.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="py-2">{getTypeBadge(item.type, item.typeLabel)}</TableCell>
                      <TableCell className="py-2 print:hidden">
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-muted/30 px-1.5 py-0">
                          {item.status || "POSTED"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold py-2 whitespace-nowrap">
                        {item.reference}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90 w-[230px] max-w-[230px] line-clamp-2 leading-snug whitespace-normal break-words py-2">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 py-2">
                        {item.credit > 0
                          ? `৳${item.credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 py-2">
                        {item.debit > 0
                          ? `৳${item.debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold py-2">
                        <span
                          className={
                            item.runningBalance > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : item.runningBalance < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }
                        >
                          ৳
                          {item.runningBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
