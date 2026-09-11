"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiSearch, FiEye, FiBookOpen, FiCalendar, FiArrowRight } from "react-icons/fi";
import { format } from "date-fns";
import Link from "next/link";

interface JournalLine {
  id: string;
  lineNumber: number;
  debitAmount: number;
  creditAmount: number;
  description: string | null;
  chartOfAccountId: string;
  ChartOfAccount?: {
    code: string;
    name: string;
    type: string;
  } | null;
  Client?: {
    name: string;
  } | null;
  Supplier?: {
    name: string;
  } | null;
}

interface JournalEntryItem {
  id: string;
  entryNumber: string;
  date: Date | string;
  description: string | null;
  status: string;
  voucherId: string | null;
  Voucher?: {
    id: string;
    voucherNumber: string;
    type: string;
  } | null;
  JournalEntryLine: JournalLine[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface JournalEntriesListViewProps {
  initialEntries: JournalEntryItem[];
  initialPagination: Pagination;
  initialSearch: string;
  initialDateFrom?: string;
  initialDateTo?: string;
}

export default function JournalEntriesListView({
  initialEntries = [],
  initialPagination,
  initialSearch,
  initialDateFrom = "",
  initialDateTo = "",
}: JournalEntriesListViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryItem | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");

    if (dateFrom) params.set("dateFrom", dateFrom);
    else params.delete("dateFrom");

    if (dateTo) params.set("dateTo", dateTo);
    else params.delete("dateTo");

    params.set("page", "1");
    router.push(`/dashboard/accounts/journal-entries?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by Entry # or Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Entry Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source Voucher</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Total Debit</TableHead>
              <TableHead className="text-right">Total Credit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <FiBookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">No posted journal entries found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Journal entries are automatically created when draft vouchers are posted.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              initialEntries.map((entry) => {
                const totalDebit = entry.JournalEntryLine.reduce(
                  (sum, l) => sum + Number(l.debitAmount || 0),
                  0
                );
                const totalCredit = entry.JournalEntryLine.reduce(
                  (sum, l) => sum + Number(l.creditAmount || 0),
                  0
                );

                return (
                  <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono font-medium text-primary">
                      {entry.entryNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        <FiCalendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.Voucher ? (
                        <Link
                          href={`/dashboard/accounts/vouchers/${entry.Voucher.id}`}
                          className="font-mono text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded"
                        >
                          {entry.Voucher.voucherNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">Direct Entry</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">
                      {entry.description || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium font-mono text-sm">
                      {formatCurrency(totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-medium font-mono text-sm">
                      {formatCurrency(totalCredit)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-600">Posted</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <FiEye className="mr-1.5 h-3.5 w-3.5" /> View Lines
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Line Details Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FiBookOpen className="h-5 w-5 text-primary" />
              Journal Entry Details: {selectedEntry?.entryNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-3 rounded-lg">
                <div>
                  <span className="text-muted-foreground">Transaction Date: </span>
                  <span className="font-medium">
                    {format(new Date(selectedEntry.date), "MMMM d, yyyy")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Source Voucher: </span>
                  <span className="font-mono font-medium">
                    {selectedEntry.Voucher?.voucherNumber || "N/A"}
                  </span>
                </div>
                {selectedEntry.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description: </span>
                    <span className="font-medium">{selectedEntry.description}</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.JournalEntryLine.map((line, idx) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link
                            href={`/dashboard/accounts/ledgers?accountId=${line.chartOfAccountId}`}
                            className="hover:underline text-primary"
                          >
                            {line.ChartOfAccount?.code || "N/A"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {line.ChartOfAccount?.name || "Account Line"}
                          {line.Client && (
                            <span className="block text-xs text-muted-foreground">
                              Client: {line.Client.name}
                            </span>
                          )}
                          {line.Supplier && (
                            <span className="block text-xs text-muted-foreground">
                              Supplier: {line.Supplier.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(line.debitAmount || 0) > 0
                            ? formatCurrency(Number(line.debitAmount))
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(line.creditAmount || 0) > 0
                            ? formatCurrency(Number(line.creditAmount))
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
