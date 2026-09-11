"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceViewProps {
  accounts: Account[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    difference: number;
  };
  date: Date;
  dateParam?: string;
}

export default function TrialBalanceView({
  accounts,
  totals,
  date,
  dateParam,
}: TrialBalanceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("date", value);
    } else {
      params.delete("date");
    }
    router.push(`/dashboard/accounts/trial-balance?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "ASSET":
        return "bg-blue-100 text-blue-800";
      case "LIABILITY":
        return "bg-red-100 text-red-800";
      case "EQUITY":
        return "bg-green-100 text-green-800";
      case "REVENUE":
        return "bg-purple-100 text-purple-800";
      case "EXPENSE":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Filter */}
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
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No accounts found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {accounts.map((account) => (
                  <TableRow key={account.id} className="hover:bg-muted/60 transition-colors">
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      <Link
                        href={`/dashboard/accounts/ledgers?accountId=${account.id}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        {account.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/accounts/ledgers?accountId=${account.id}`}
                        className="hover:underline font-medium hover:text-primary"
                      >
                        {account.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={getAccountTypeColor(account.type)}>
                        {account.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {account.debit > 0 ? formatCurrency(account.debit) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {account.credit > 0 ? formatCurrency(account.credit) : "-"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${account.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(account.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3} className="text-right">
                    Totals:
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.totalDebit)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.totalCredit)}</TableCell>
                  <TableCell className="text-right">
                    {totals.difference === 0 ? (
                      <span className="text-green-600">Balanced</span>
                    ) : (
                      <span className="text-red-600">Difference: {formatCurrency(totals.difference)}</span>
                    )}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

