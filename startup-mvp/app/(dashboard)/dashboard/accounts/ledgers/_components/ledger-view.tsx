"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
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
import { FiSearch } from "react-icons/fi";
import Link from "next/link";
import { format } from "date-fns";

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
}

export default function LedgerView({
  ledger,
  summary,
  accounts,
  selectedAccountId,
  dateFrom,
  dateTo,
}: LedgerViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountSearch, setAccountSearch] = useState("");

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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
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
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-[300px]">
          <Select
            value={selectedAccountId || "none"}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="h-8 text-xs text-left">
              <SelectValue placeholder="Select account">
                {selectedAccountId
                  ? (() => {
                      const selectedAccount = accounts.find(
                        (a) => a.id === selectedAccountId
                      );
                      return selectedAccount
                        ? `${selectedAccount.code} - ${selectedAccount.name}`
                        : "Select account";
                    })()
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

      {/* Summary */}
      {selectedAccountId && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entry Number</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
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
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.journalEntry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.journalEntry.entryNumber}
                      </TableCell>
                      <TableCell>
                        {entry.journalEntry.voucher ? (
                          <Link
                            href={`/dashboard/accounts/vouchers/${entry.journalEntry.voucher.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {entry.journalEntry.voucher.voucherNumber}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {entry.description || entry.journalEntry.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${runningBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
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

