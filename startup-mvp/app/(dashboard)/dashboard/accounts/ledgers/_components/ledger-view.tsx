"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiSearch, FiPrinter, FiDownload } from "react-icons/fi";
import Link from "next/link";
import { format } from "date-fns";
import PrintHeader, { PrintStyle } from "@/app/(dashboard)/dashboard/procurements/_components/print-header";
import { exportToCSV } from "@/lib/utils/export-csv";

interface LedgerEntry {
  id: string;
  lineNumber: number;
  debitAmount: number;
  creditAmount: number;
  description: string | null;
  journalEntry: {
    id: string;
    entryNumber: string;
    date: Date;
    description: string | null;
    status: string;
    postedAt: Date;
    voucher: {
      id: string;
      voucherNumber: string;
      type: string;
      reference: string | null;
      description: string | null;
      status: string;
    } | null;
  };
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  createdAt: Date;
}

interface LedgerViewProps {
  ledger: LedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
  accounts: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  selectedAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  organization?: {
    name?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    logo?: string | null;
  } | null;
}

export default function LedgerView({
  ledger,
  summary,
  accounts,
  selectedAccountId,
  dateFrom,
  dateTo,
  organization,
}: LedgerViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountSearch, setAccountSearch] = useState("");

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const handleAccountChange = (accountId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (accountId === "none") {
      params.delete("accountId");
    } else {
      params.set("accountId", accountId);
    }
    params.set("page", "1");
    router.push(`/dashboard/accounts/ledgers?${params.toString()}`);
  };

  const handleDateFromChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("dateFrom", value);
    } else {
      params.delete("dateFrom");
    }
    router.push(`/dashboard/accounts/ledgers?${params.toString()}`);
  };

  const handleDateToChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("dateTo", value);
    } else {
      params.delete("dateTo");
    }
    router.push(`/dashboard/accounts/ledgers?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return amount < 0 ? `-৳${formatted}` : `৳${formatted}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!selectedAccountId || ledger.length === 0) return;

    const accountCodeName = selectedAccount
      ? `${selectedAccount.code}-${selectedAccount.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`
      : "account";

    const csvData = ledger.map((entry, index) => {
      const runningBalance = ledger
        .slice(index)
        .reduce((sum, e) => sum + e.debitAmount - e.creditAmount, 0);

      return {
        "Date": format(new Date(entry.journalEntry.date), "yyyy-MM-dd"),
        "Entry Number": entry.journalEntry.entryNumber,
        "Voucher Number": entry.journalEntry.voucher?.voucherNumber || "-",
        "Voucher Type": entry.journalEntry.voucher?.type || "-",
        "Description": entry.description || entry.journalEntry.description || "-",
        "Debit (BDT)": entry.debitAmount > 0 ? entry.debitAmount.toFixed(2) : "0.00",
        "Credit (BDT)": entry.creditAmount > 0 ? entry.creditAmount.toFixed(2) : "0.00",
        "Balance (BDT)": runningBalance.toFixed(2),
      };
    });

    exportToCSV(csvData, {
      filename: `account-ledger-${accountCodeName}-${dateFrom || "start"}-to-${dateTo || "present"}.csv`,
    });
  };

  // Filter accounts based on search term
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const searchLower = accountSearch.toLowerCase();
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, accountSearch]);

  return (
    <div className="space-y-4">
      {/* Multi-page Print Styles & Branded Header */}
      <PrintStyle />
      <PrintHeader
        docTitle="ACCOUNT LEDGER STATEMENT"
        docNumber={selectedAccount ? selectedAccount.code : "LEDGER"}
        organizationName={organization?.name}
        organizationAddress={organization?.address}
        organizationEmail={organization?.email}
        organizationPhone={organization?.phone}
        organizationLogo={organization?.logo}
        hideBarcode={true}
      />

      {/* Screen Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Account Ledger</h1>
          <p className="text-sm text-muted-foreground">
            View individual account ledgers and transaction history
          </p>
        </div>

        {selectedAccountId && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={ledger.length === 0}
            >
              <FiDownload className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow"
            >
              <FiPrinter className="mr-2 h-4 w-4" />
              Print Ledger
            </Button>
          </div>
        )}
      </div>

      {/* Print-only Account Overview & Statement Summary */}
      {selectedAccount && (
        <div className="hidden print:block mb-4">
          <div className="grid grid-cols-2 text-[11px] border border-gray-300 rounded overflow-hidden">
            <div className="p-3 space-y-1 border-r border-gray-300">
              <div className="font-semibold text-gray-500 uppercase text-[9px] tracking-widest mb-1.5">
                Account Information
              </div>
              <div>
                <span className="font-semibold">Account Code:</span> {selectedAccount.code}
              </div>
              <div>
                <span className="font-semibold">Account Name:</span> {selectedAccount.name}
              </div>
              {(dateFrom || dateTo) && (
                <div>
                  <span className="font-semibold">Period:</span>{" "}
                  {dateFrom ? format(new Date(dateFrom), "dd MMM yyyy") : "Start"} to{" "}
                  {dateTo ? format(new Date(dateTo), "dd MMM yyyy") : "Present"}
                </div>
              )}
            </div>

            <div className="p-3 space-y-1">
              <div className="font-semibold text-gray-500 uppercase text-[9px] tracking-widest mb-1.5">
                Summary Overview
              </div>
              <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                <span className="text-gray-600">Total Debit:</span>
                <span className="font-mono font-medium">
                  {formatCurrency(summary.totalDebit)}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                <span className="text-gray-600">Total Credit:</span>
                <span className="font-mono font-medium">
                  {formatCurrency(summary.totalCredit)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold uppercase text-[9px] tracking-wide">Net Balance:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(summary.balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters (Hidden during print) */}
      <div className="flex items-center gap-4 print:hidden">
        <div className="w-[300px]">
          <Select
            value={selectedAccountId || "none"}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="h-8 text-xs text-left">
              <SelectValue placeholder="Select account">
                {selectedAccountId
                  ? (selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "Select account")
                  : "Select account"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="p-2">
                <div className="relative">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                  <Input
                    placeholder="Search accounts..."
                    value={accountSearch}
                    onChange={(e) => {
                      setAccountSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                    className="pl-8 h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                <SelectItem value="none" className="text-left">
                  None
                </SelectItem>
                {filteredAccounts.map((account) => (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                    className="text-left"
                  >
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            placeholder="From Date"
            value={dateFrom || ""}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            placeholder="To Date"
            value={dateTo || ""}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Summary (Hidden during print since print overview replaces it) */}
      {selectedAccountId && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg print:hidden">
          <div>
            <p className="text-sm text-muted-foreground">Total Debit</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.totalDebit)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Credit</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.totalCredit)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className={`text-lg font-semibold ${summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {selectedAccountId ? (
        <div className="border rounded-lg print:border-none">
          <Table className="print-bordered">
            <TableHeader className="bg-muted/50 print:bg-transparent">
              <TableRow className="print:border-b print:border-slate-300">
                <TableHead className="print:text-black print:text-[10px] print:font-semibold print:px-1 whitespace-nowrap">Date</TableHead>
                <TableHead className="print:text-black print:text-[10px] print:font-semibold print:px-1 whitespace-nowrap">Entry Number</TableHead>
                <TableHead className="print:text-black print:text-[10px] print:font-semibold print:px-1 whitespace-nowrap">Voucher</TableHead>
                <TableHead className="print:text-black print:text-[10px] print:font-semibold print:px-1">Description</TableHead>
                <TableHead className="text-right print:text-black print:text-[10px] print:font-semibold print:px-1 whitespace-nowrap">Debit</TableHead>
                <TableHead className="text-right print:text-black print:text-[10px] print:font-semibold print:px-1 whitespace-nowrap">Credit</TableHead>
                <TableHead className="text-right print:text-black print:text-[10px] print:font-semibold print:px-1 whitespace-nowrap">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No ledger entries found
                  </TableCell>
                </TableRow>
              ) : (
                ledger.map((entry, index) => {
                  const runningBalance = ledger
                    .slice(index)
                    .reduce((sum, e) => sum + e.debitAmount - e.creditAmount, 0);
                  
                  return (
                    <TableRow key={entry.id} className="print:border-b print:border-slate-200">
                      <TableCell className="print:text-black print:text-[10px] print:px-1 whitespace-nowrap">
                        {format(new Date(entry.journalEntry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-sm print:text-black print:text-[10px] print:px-1 whitespace-nowrap">
                        {entry.journalEntry.entryNumber}
                      </TableCell>
                      <TableCell className="print:text-black print:text-[10px] print:px-1 whitespace-nowrap">
                        {entry.journalEntry.voucher ? (
                          <>
                            <Link
                              href={`/dashboard/accounts/vouchers/${entry.journalEntry.voucher.id}`}
                              className="text-blue-600 hover:underline print:hidden"
                            >
                              {entry.journalEntry.voucher.voucherNumber}
                            </Link>
                            <span className="hidden print:inline font-mono">
                              {entry.journalEntry.voucher.voucherNumber}
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate print:max-w-none print:whitespace-normal print:text-black print:text-[10px] print:px-1">
                        {entry.description || entry.journalEntry.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium print:text-black print:text-[10px] print:font-normal print:px-1 whitespace-nowrap">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium print:text-black print:text-[10px] print:font-normal print:px-1 whitespace-nowrap">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-semibold print:text-black print:text-[10px] print:font-bold print:px-1 whitespace-nowrap ${runningBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(runningBalance)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Please select an account to view ledger
        </div>
      )}
    </div>
  );
}


