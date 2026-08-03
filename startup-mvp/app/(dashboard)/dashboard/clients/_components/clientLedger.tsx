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
  FiMapPin,
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

interface ClientData {
  id: string;
  name: string | null;
  clientCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  company: string | null;
  openingBalance: number;
  status: string;
  clientType?: string | null;
  membershipTier?: string | null;
  membershipPoints?: number | null;
  ChartOfAccount?: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;
  createdAt: Date | string;
}

interface LedgerSummary {
  totalBilled: number;
  totalPaid: number;
  closingBalance: number;
  totalTransactions: number;
}

interface ClientLedgerProps {
  client: ClientData;
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

export default function ClientLedger({
  client,
  ledger,
  summary,
  initialStartDate = "",
  initialEndDate = "",
  organization,
}: ClientLedgerProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [search, setSearch] = useState("");

  const handleFilter = () => {
    const params = new URLSearchParams();
    params.set("id", client.id);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`/dashboard/clients/ledger?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    router.push(`/dashboard/clients/ledger?id=${client.id}`);
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
    const printOverride = "print:border-none print:bg-transparent print:text-black print:p-0 print:font-normal";
    switch (type) {
      case "SALE":
        return <Badge variant="outline" className={`border-blue-500/30 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 font-medium ${printOverride}`}>Sale</Badge>;
      case "RECEIPT":
        return <Badge variant="outline" className={`border-emerald-500/30 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 font-medium ${printOverride}`}>Receipt</Badge>;
      case "PAYMENT":
        return <Badge variant="outline" className={`border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30 font-medium ${printOverride}`}>Payment</Badge>;
      case "OPENING_BALANCE":
        return <Badge variant="outline" className={`border-purple-500/30 text-purple-600 bg-purple-50/50 dark:bg-purple-950/30 font-medium ${printOverride}`}>Opening Balance</Badge>;
      case "PRIOR_BALANCE":
        return <Badge variant="outline" className={`border-slate-500/30 text-slate-600 bg-slate-50/50 dark:bg-slate-950/30 font-semibold ${printOverride}`}>Balance Forward</Badge>;
      default:
        return <Badge variant="secondary" className={`font-medium ${printOverride}`}>{typeLabel}</Badge>;
    }
  };

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Print-only: multi-page print fix + page numbering */}
      <PrintStyle />

      {/* Print-only Branded Header */}
      <PrintHeader
        docNumber={client.clientCode || client.id.slice(-8).toUpperCase()}
        docTitle="CLIENT LEDGER STATEMENT"
        organizationName={organization?.name}
        organizationAddress={organization?.address}
        organizationEmail={organization?.email}
        organizationPhone={organization?.phone}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/clients">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Clients
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/clients/details?id=${client.id}`}>
              <FiFileText className="mr-2 h-4 w-4" />
              Client Details
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

      {/* Print-only Summary Section — 2-col: entity details + account overview */}
      <div className="hidden print:block mb-4">
        <div className="grid grid-cols-2 text-[11px] border border-gray-300 rounded overflow-hidden">
          {/* Left: Client Details */}
          <div className="p-3 space-y-1 border-r border-gray-300">
            <div className="font-semibold text-gray-500 uppercase text-[9px] tracking-widest mb-1.5">
              Client Details
            </div>
            <div>
              <span className="font-semibold">Name:</span> {client.name || "-"}
            </div>
            <div>
              <span className="font-semibold">Code:</span> {client.clientCode || "-"}
            </div>
            {client.company && (
              <div>
                <span className="font-semibold">Company:</span> {client.company}
              </div>
            )}
            {client.phone && (
              <div>
                <span className="font-semibold">Phone:</span> {client.phone}
              </div>
            )}
            {client.email && (
              <div>
                <span className="font-semibold">Email:</span> {client.email}
              </div>
            )}
            {(client.address || client.city) && (
              <div>
                <span className="font-semibold">Address:</span>{" "}
                {[client.address, client.city, client.country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          {/* Right: Account Overview Summary */}
          <div className="p-3 space-y-1">
            <div className="font-semibold text-gray-500 uppercase text-[9px] tracking-widest mb-1.5">
              Account Overview Summary
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
              <span className="text-gray-600 print:text-slate-700">Opening Balance:</span>
              <span className="font-mono font-medium print:text-slate-900">
                ৳{client.openingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
              <span className="text-gray-600 print:text-slate-700">Total Billed (Sales):</span>
              <span className="font-mono font-semibold text-blue-700 print:text-slate-900">
                ৳{summary.totalBilled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
              <span className="text-gray-600 print:text-slate-700">Total Paid (Received):</span>
              <span className="font-mono font-semibold text-emerald-700 print:text-slate-900">
                ৳{summary.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-bold uppercase text-[9px] tracking-wide print:text-slate-800">Net Outstanding Due:</span>
              <span
                className={`font-mono font-black text-sm print:text-slate-900 print:font-bold print:text-xs ${
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

      {/* Client Overview Header Card (Screen view) */}
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
                    <h1 className="text-2xl font-bold tracking-tight">{client.name || "Client"}</h1>
                    {client.clientCode && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {client.clientCode}
                      </Badge>
                    )}
                    <Badge variant={client.status === "active" ? "default" : "destructive"}>
                      {client.status}
                    </Badge>
                  </div>
                  {client.company && (
                    <p className="text-sm font-medium text-muted-foreground">{client.company}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-1">
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <FiPhone className="h-4 w-4 text-primary/70" />
                    {client.phone}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <FiMail className="h-4 w-4 text-primary/70" />
                    {client.email}
                  </span>
                )}
                {(client.address || client.city) && (
                  <span className="flex items-center gap-1.5">
                    <FiMapPin className="h-4 w-4 text-primary/70" />
                    {[client.address, client.city, client.state, client.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {client.ChartOfAccount && (
                  <span className="flex items-center gap-1.5 text-xs font-mono bg-muted px-2 py-0.5 rounded">
                    Account: {client.ChartOfAccount.code} ({client.ChartOfAccount.name})
                  </span>
                )}
              </div>
            </div>

            {/* Total Outstanding Balance Badge */}
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 min-w-[220px] text-right">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider block">
                Current Due Balance
              </span>
              <span className={`text-2xl font-black ${summary.closingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                ৳{summary.closingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground block mt-0.5">
                {summary.closingBalance > 0 ? "Receivable Amount Due" : summary.closingBalance < 0 ? "Advance Paid" : "Account Cleared"}
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
              <span>Total Billed (Sales)</span>
              <FiTrendingUp className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
              ৳{summary.totalBilled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total invoiced sales to client</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-200/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Total Received (Paid)</span>
              <FiTrendingDown className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              ৳{summary.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total payments collected</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/20 dark:to-violet-950/10 border-purple-200/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
              <span>Opening Balance</span>
              <FiDollarSign className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
              ৳{client.openingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Initial starting balance</p>
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
            <p className="text-xs text-muted-foreground mt-1">Net outstanding due balance</p>
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

      {/* Detailed Client Activity Ledger Table */}
      <Card className="shadow-sm print:border-none print:shadow-none">
        <CardHeader className="pb-3 border-b print:pb-1 print:border-none print:px-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold print:text-xs print:font-bold print:uppercase print:tracking-wider">Client Transaction Activity Ledger</CardTitle>
              <CardDescription className="print:hidden">
                Chronological record of sales, payments, vouchers, and running balance
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono print:hidden">
              {filteredLedger.length} Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 print:pt-0">
          <div className="overflow-x-auto print:overflow-visible">
            <Table className="print-bordered">
              <TableHeader className="bg-muted/50 print:bg-transparent">
                <TableRow className="print:border-b print:border-slate-300">
                  <TableHead className="w-[100px] print:w-[9%] font-semibold print:text-black print:text-[10px] print:px-1 whitespace-nowrap">Date</TableHead>
                  <TableHead className="w-[90px] print:w-[6%] font-semibold print:text-black print:text-[10px] print:px-1 whitespace-nowrap">Type</TableHead>
                  <TableHead className="w-[100px] font-semibold print:!hidden">Status</TableHead>
                  <TableHead className="w-[120px] print:w-[11%] font-semibold print:text-black print:text-[10px] print:px-1 whitespace-nowrap">Reference #</TableHead>
                  <TableHead className="min-w-[250px] print:w-[44%] font-semibold print:text-black print:text-[10px] print:px-1 print:whitespace-normal">Description / Notes</TableHead>
                  <TableHead className="text-right w-[110px] print:w-[10%] font-semibold text-blue-600 dark:text-blue-400 print:text-black print:text-[10px] print:px-1 whitespace-nowrap">
                    <span className="print:hidden">Billed (Debit)</span>
                    <span className="hidden print:inline">Debit</span>
                  </TableHead>
                  <TableHead className="text-right w-[110px] print:w-[10%] font-semibold text-emerald-600 dark:text-emerald-400 print:text-black print:text-[10px] print:px-1 whitespace-nowrap">
                    <span className="print:hidden">Paid (Credit)</span>
                    <span className="hidden print:inline">Credit</span>
                  </TableHead>
                  <TableHead className="text-right w-[120px] print:w-[10%] font-semibold print:text-black print:text-[10px] print:px-1 whitespace-nowrap">
                    <span className="print:hidden">Running Balance</span>
                    <span className="hidden print:inline">Balance</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No activity or ledger transactions found for this client.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors print:border-b print:border-slate-200">
                      <TableCell className="font-medium whitespace-nowrap text-xs py-2 print:text-black print:text-[10px] print:px-1 print:w-[9%]">
                        {format(new Date(item.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="py-2 print:text-black print:text-[10px] print:px-1 print:w-[6%] whitespace-nowrap">
                        {getTypeBadge(item.type, item.typeLabel)}
                      </TableCell>
                      <TableCell className="py-2 print:!hidden">
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-muted/30 px-1.5 py-0">
                          {item.status || "COMPLETED"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold py-2 whitespace-nowrap print:text-black print:text-[10px] print:px-1 print:w-[11%]">
                        {item.reference}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/90 min-w-[250px] leading-snug whitespace-normal break-words py-2 print:text-black print:text-[10px] print:px-1 print:w-[44%] print:whitespace-normal">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 py-2 print:text-black print:text-[10px] print:px-1 print:font-normal print:w-[10%] whitespace-nowrap">
                        {item.debit > 0 && item.type !== "PRIOR_BALANCE"
                          ? `৳${item.debit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 py-2 print:text-black print:text-[10px] print:px-1 print:font-normal print:w-[10%] whitespace-nowrap">
                        {item.credit > 0 && item.type !== "PRIOR_BALANCE"
                          ? `৳${item.credit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold py-2 print:text-black print:text-[10px] print:px-1 print:font-bold print:w-[10%] whitespace-nowrap">
                        <span
                          className={`print:text-black print:font-bold ${
                            item.runningBalance > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : item.runningBalance < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }`}
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
