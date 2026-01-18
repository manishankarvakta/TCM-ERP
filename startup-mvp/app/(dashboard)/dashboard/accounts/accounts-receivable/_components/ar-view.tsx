"use client";

import { useState, useTransition } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface ARViewProps {
  initialClients: Array<{
    client: Client;
    balance: number;
    totalDebit: number;
    totalCredit: number;
    entryCount: number;
    aging?: {
      "0-30": number;
      "31-60": number;
      "61-90": number;
      "90+": number;
    };
  }>;
  initialTotal: number;
  asOfDate: Date;
  dateParam?: string;
  initialIncludeAging?: boolean;
}

export default function ARView({
  initialClients,
  initialTotal,
  asOfDate,
  dateParam,
  initialIncludeAging = false,
}: ARViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [includeAging, setIncludeAging] = useState(initialIncludeAging);
  const [isPending, startTransition] = useTransition();

  const handleDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("date", value);
    } else {
      params.delete("date");
    }
    router.push(`/dashboard/accounts/accounts-receivable?${params.toString()}`);
  };

  const handleAgingToggle = (checked: boolean) => {
    setIncludeAging(checked);
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("aging", "true");
    } else {
      params.delete("aging");
    }
    startTransition(() => {
      router.push(`/dashboard/accounts/accounts-receivable?${params.toString()}`);
    });
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
          <label className="text-sm font-medium">As of Date:</label>
          <Input
            type="date"
            value={dateParam || new Date().toISOString().split("T")[0]}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="aging"
            checked={includeAging}
            onCheckedChange={handleAgingToggle}
            disabled={isPending}
          />
          <Label htmlFor="aging" className="cursor-pointer">
            Show Aging Analysis
          </Label>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Accounts Receivable</p>
            <p className="text-2xl font-bold">{formatCurrency(initialTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{initialClients.length} Clients</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              {includeAging && (
                <>
                  <TableHead className="text-right">0-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">90+ Days</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={includeAging ? 8 : 3} className="text-center py-8 text-muted-foreground">
                  No accounts receivable found
                </TableCell>
              </TableRow>
            ) : (
              initialClients.map((item) => (
                <TableRow key={item.client.id}>
                  <TableCell className="font-medium">{item.client.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.client.company || "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.balance)}
                  </TableCell>
                  {includeAging && item.aging && (
                    <>
                      <TableCell className="text-right">
                        {item.aging["0-30"] > 0 ? formatCurrency(item.aging["0-30"]) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.aging["31-60"] > 0 ? formatCurrency(item.aging["31-60"]) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.aging["61-90"] > 0 ? formatCurrency(item.aging["61-90"]) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.aging["90+"] > 0 ? formatCurrency(item.aging["90+"]) : "-"}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

