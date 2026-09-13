"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FiBookOpen, FiArrowLeft, FiFilter, FiDownload, FiSearch } from "react-icons/fi";
import Link from "next/link";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
}

interface LedgerEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  type: "salary" | "advance" | "repayment" | "fine";
  debit: number;
  credit: number;
  balance: number;
}

interface EmployeeLedgerClientProps {
  employees: Employee[];
  selectedEmployeeId?: string;
}

export default function EmployeeLedgerClient({
  employees,
  selectedEmployeeId: initialSelectedId,
}: EmployeeLedgerClientProps) {
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedId || (employees.length > 0 ? employees[0].id : "")
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const currentEmployee = employees.find((e) => e.id === selectedId) || null;

  // Mock sample ledger transactions (Debits: salary disbursement/loan payout, Credits: advance adjustment/repayment)
  const sampleLedger: LedgerEntry[] = [
    {
      id: "leg-1",
      date: "2026-08-01",
      reference: "ADV-2026-001",
      description: "Emergency Salary Advance Payout",
      type: "advance",
      debit: 10000,
      credit: 0,
      balance: 10000,
    },
    {
      id: "leg-2",
      date: "2026-08-31",
      reference: "PAY-2026-08",
      description: "Monthly Salary Disbursement (August 2026)",
      type: "salary",
      debit: 45000,
      credit: 0,
      balance: 55000,
    },
    {
      id: "leg-3",
      date: "2026-08-31",
      reference: "PAY-2026-08-DED",
      description: "Advance Installment Adjustment (Aug Payroll)",
      type: "repayment",
      debit: 0,
      credit: 5000,
      balance: 50000,
    },
  ];

  const totalDebit = sampleLedger.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = sampleLedger.reduce((sum, item) => sum + item.credit, 0);
  const netBalance = totalDebit - totalCredit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/employees">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Directory
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employee Financial Ledger</h1>
            <p className="text-sm text-muted-foreground">
              Transaction history, salary disbursements, and advance repayments
            </p>
          </div>
        </div>
      </div>

      {/* Employee Selector & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Select Employee</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode || emp.id.slice(-6)}) - {emp.designation || "Staff"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {currentEmployee && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Debits (Disbursements)</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-xl font-bold text-foreground">
                  ৳{totalDebit.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Total Credits (Adjustments/Cuts)</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-xl font-bold text-emerald-600">
                  ৳{totalCredit.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Net Ledger Outstanding</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-xl font-bold text-primary">
                  ৳{netBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Financial Ledger Statement</CardTitle>
                <CardDescription>
                  Showing ledger records for <span className="font-semibold text-foreground">{currentEmployee.name}</span>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead className="w-36">Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-28 text-center">Type</TableHead>
                      <TableHead className="text-right">Debit (BDT)</TableHead>
                      <TableHead className="text-right">Credit (BDT)</TableHead>
                      <TableHead className="text-right">Balance (BDT)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleLedger.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-sm">{row.date}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-primary">{row.reference}</TableCell>
                        <TableCell className="text-sm font-medium">{row.description}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.debit > 0 ? `৳${row.debit.toLocaleString("en-BD", { minimumFractionDigits: 2 })}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-600 font-semibold">
                          {row.credit > 0 ? `৳${row.credit.toLocaleString("en-BD", { minimumFractionDigits: 2 })}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">
                          ৳{row.balance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
