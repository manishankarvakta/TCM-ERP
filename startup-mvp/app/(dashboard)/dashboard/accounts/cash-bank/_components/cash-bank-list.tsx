"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FiSmartphone, FiDollarSign, FiCreditCard, FiEdit, FiTrash2 } from "react-icons/fi";
import CashBankFormDialog from "./cash-bank-form-dialog";
import { deleteCashBankAccount } from "../_actions/cash-bank.action";
import { useToast } from "@/hooks/use-toast";

interface CashBankAccount {
  id: string;
  type: "CASH" | "BANK" | "MFS";
  status: string;
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
  };
}

interface CashBankListProps {
  cashAccounts: CashBankAccount[];
  bankAccounts: CashBankAccount[];
  mfsAccounts?: CashBankAccount[];
}

export default function CashBankList({
  cashAccounts,
  bankAccounts,
  mfsAccounts = [],
}: CashBankListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingAccount, setEditingAccount] = useState<CashBankAccount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<{ id: string; name: string } | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const handleEdit = (account: CashBankAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingAccount) return;

    setLoadingDelete(true);
    const res = await deleteCashBankAccount(deletingAccount.id);
    setLoadingDelete(false);

    if (res.success) {
      toast({
        title: "Account Removed",
        description: `"${deletingAccount.name}" removed successfully.`,
      });
      setDeletingAccount(null);
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to remove account",
        variant: "destructive",
      });
    }
  };

  const renderTableRows = (accounts: CashBankAccount[], emptyText: string) => {
    if (accounts.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
            {emptyText}
          </TableCell>
        </TableRow>
      );
    }

    return accounts.map((account) => (
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
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEdit(account)}
            >
              <FiEdit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeletingAccount({ id: account.id, name: account.chartOfAccount.name })}
            >
              <FiTrash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Cash Accounts Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FiDollarSign className="w-5 h-5 text-green-600" />
            Cash Accounts
          </CardTitle>
          <Badge variant="outline">{cashAccounts.length} Accounts</Badge>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Linked COA Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableRows(cashAccounts, "No cash accounts found")}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Commercial Bank Accounts Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FiCreditCard className="w-5 h-5 text-blue-600" />
            Commercial Bank Accounts
          </CardTitle>
          <Badge variant="outline">{bankAccounts.length} Accounts</Badge>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Linked COA Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableRows(bankAccounts, "No bank accounts found")}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MFS Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FiSmartphone className="w-5 h-5 text-purple-600" />
            Mobile Financial Services (MFS) & Digital Wallets
          </CardTitle>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {mfsAccounts.length} Accounts
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider / Account Name</TableHead>
                  <TableHead>Linked COA Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderTableRows(mfsAccounts, "No MFS accounts registered yet")}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CashBankFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingAccount}
      />

      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deletingAccount?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loadingDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
