"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CashBankAccount {
  id: string;
  type: "CASH" | "BANK";
  status: string;
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
  };
}

interface CashBankListProps {
  cashAccounts: CashBankAccount[];
  bankAccounts: CashBankAccount[];
  walletAccounts: CashBankAccount[];
}

function AccountTable({ accounts, emptyMessage }: { accounts: CashBankAccount[], emptyMessage: string }) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Name</TableHead>
            <TableHead>Linked COA</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">
                  {account.chartOfAccount.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {account.chartOfAccount.code} - {account.chartOfAccount.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      account.status === "active"
                        ? "default"
                        : account.status === "inactive"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {account.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function CashBankList({
  cashAccounts,
  bankAccounts,
  walletAccounts,
}: CashBankListProps) {
  return (
    <div className="space-y-6">
      {/* Cash Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountTable accounts={cashAccounts} emptyMessage="No cash accounts found" />
        </CardContent>
      </Card>

      {/* Bank Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
           <AccountTable accounts={bankAccounts} emptyMessage="No bank accounts found" />
        </CardContent>
      </Card>

      {/* Digital Wallets Section */}
      <Card>
        <CardHeader>
          <CardTitle>Digital Wallets</CardTitle>
        </CardHeader>
        <CardContent>
           <AccountTable accounts={walletAccounts} emptyMessage="No digital wallets found" />
        </CardContent>
      </Card>
    </div>
  );
}
