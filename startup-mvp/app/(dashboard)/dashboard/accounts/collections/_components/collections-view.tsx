"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiSearch, FiDollarSign, FiPlus, FiFileText } from "react-icons/fi";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import Link from "next/link";

interface CollectionInvoice {
  id: string;
  invoiceNumber: string;
  date: Date | string;
  totalAmount: number;
  status: string;
  Order?: {
    Client?: {
      id: string;
      name: string;
      email?: string | null;
      company?: string | null;
    } | null;
  } | null;
}

interface CollectionsViewProps {
  invoices: CollectionInvoice[];
  totalOutstanding: number;
  totalCollected: number;
  unpaidCount: number;
}

export default function CollectionsView({
  invoices = [],
  totalOutstanding = 0,
  totalCollected = 0,
  unpaidCount = 0,
}: CollectionsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    router.push(`/dashboard/accounts/collections?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Collected
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {formatCurrency(totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Received Customer Payments</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Outstanding
            </CardTitle>
            <FiDollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending Collection Balance</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Pending Collections Count
            </CardTitle>
            <FiFileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{unpaidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Invoices Awaiting Payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex-1 max-w-md relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by client or invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch}>Search Collections</Button>
      </div>

      {/* Collections Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Grand Total</TableHead>
              <TableHead className="text-right">Paid Amount</TableHead>
              <TableHead className="text-right">Balance Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <FiDollarSign className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="font-medium">No collections records found</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const client = inv.Order?.Client;
                const total = Number(inv.totalAmount || 0);
                const isPaid = inv.status === "PAID" || inv.status === "paid";
                const paid = isPaid ? total : 0;
                const due = isPaid ? 0 : total;

                return (
                  <TableRow key={inv.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono font-medium text-primary">
                      <Link href={`/dashboard/accounts/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {client?.name || "N/A"}
                      {client?.company && (
                        <span className="block text-xs text-muted-foreground">
                          {client.company}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(inv.date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.date)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600 font-medium">
                      {formatCurrency(paid)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive font-semibold">
                      {formatCurrency(due)}
                    </TableCell>
                    <TableCell>
                      {inv.status === "PAID" ? (
                        <Badge className="bg-emerald-600">Paid</Badge>
                      ) : inv.status === "OVERDUE" ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge variant="secondary">{inv.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/accounts/vouchers/add">
                          <FiPlus className="mr-1 h-3.5 w-3.5" /> Record Receipt
                        </Link>
                      </Button>
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
