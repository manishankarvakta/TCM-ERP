"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { FiPlus, FiEdit } from "react-icons/fi";
import CashBankFormDialog from "./cash-bank-form-dialog";

interface CashBankAccount {
  id: string;
  type: "CASH" | "BANK" | "MFS";
  status: string;
  isVisible: boolean;
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
  };
  warehouses?: Array<{ id: string; name: string }>;
}

interface CashBankListProps {
  cashAccounts: CashBankAccount[];
  bankAccounts: CashBankAccount[];
  walletAccounts: CashBankAccount[];
  permissions?: {
    create: boolean;
    edit: boolean;
  };
}

function AccountTable({
  accounts,
  emptyMessage,
  onEdit,
  canEdit,
}: {
  accounts: CashBankAccount[];
  emptyMessage: string;
  onEdit: (account: CashBankAccount) => void;
  canEdit: boolean;
}) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Name</TableHead>
            <TableHead>Linked COA</TableHead>
            <TableHead>Linked Warehouses</TableHead>
            <TableHead>POS Status</TableHead>
            <TableHead>Status</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">
                  {account.chartOfAccount.name}
                  {account.id.startsWith("inferred-") && (
                    <span className="ml-2 text-xs text-muted-foreground italic font-normal bg-muted px-1.5 py-0.5 rounded">
                      Inferred
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {account.chartOfAccount.code} - {account.chartOfAccount.name}
                </TableCell>
                <TableCell>
                  {account.warehouses && account.warehouses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {account.warehouses.map((wh) => (
                        <span key={wh.id} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-semibold">
                          {wh.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">All Warehouses</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={account.isVisible ? "default" : "secondary"} className={account.isVisible ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none" : "shadow-none border-none"}>
                    {account.isVisible ? "Visible" : "Hidden"}
                  </Badge>
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
                {canEdit && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(account)}
                    >
                      <FiEdit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
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
  permissions = { create: true, edit: true },
}: CashBankListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CashBankAccount | null>(null);

  const handleEdit = (account: CashBankAccount) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedAccount(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {permissions.create && (
        <div className="flex justify-end">
          <Button onClick={handleAdd}>
            <FiPlus className="mr-2 h-4 w-4" />
            Add Cash/Bank Account
          </Button>
        </div>
      )}

      {/* Cash Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountTable
            accounts={cashAccounts}
            emptyMessage="No cash accounts found"
            onEdit={handleEdit}
            canEdit={permissions.edit}
          />
        </CardContent>
      </Card>

      {/* Bank Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountTable
            accounts={bankAccounts}
            emptyMessage="No bank accounts found"
            onEdit={handleEdit}
            canEdit={permissions.edit}
          />
        </CardContent>
      </Card>

      {/* Digital Wallets Section */}
      <Card>
        <CardHeader>
          <CardTitle>Digital Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountTable
            accounts={walletAccounts}
            emptyMessage="No digital wallets found"
            onEdit={handleEdit}
            canEdit={permissions.edit}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <CashBankFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedAccount}
      />
    </div>
  );
}
