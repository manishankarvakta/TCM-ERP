"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface CashBankLedgerViewProps {
  ledger: LedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
  };
  type: "cash" | "bank";
  dateFrom?: string;
  dateTo?: string;
}

export default function CashBankLedgerView({
  ledger,
  summary,
  type,
  dateFrom,
  dateTo,
}: CashBankLedgerViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateFromChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("dateFrom", value);
    } else {
      params.delete("dateFrom");
    }
    const basePath = type === "cash" ? "/dashboard/accounts/cash-bank/cash-ledger" : "/dashboard/accounts/cash-bank/bank-ledger";
    router.push(`${basePath}?${params.toString()}`);
  };

  const handleDateToChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("dateTo", value);
    } else {
      params.delete("dateTo");
    }
    const basePath = type === "cash" ? "/dashboard/accounts/cash-bank/cash-ledger" : "/dashboard/accounts/cash-bank/bank-ledger";
    router.push(`${basePath}?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
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
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Total Debit</p>
          <p className="text-lg font-semibold">{formatCurrency(summary.totalDebit)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Credit</p>
          <p className="text-lg font-semibold">{formatCurrency(summary.totalCredit)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Voucher Reference</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No ledger entries found
                </TableCell>
              </TableRow>
            ) : (
              ledger.map((entry) => {
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(new Date(entry.journalEntry.date), "MMM d, yyyy")}
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
                    <TableCell className="font-mono text-sm">
                      {entry.chartOfAccount.code} - {entry.chartOfAccount.name}
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

