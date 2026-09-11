import React from "react";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { getCashBankAccounts } from "./_actions/cash-bank.action";
import CashBankList from "./_components/cash-bank-list";
import { serializeData } from "@/lib/utils/serialization";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { FiDollarSign, FiCreditCard, FiSmartphone, FiRefreshCw, FiList } from "react-icons/fi";
import AddCashBankAccountModal from "./_components/add-cash-bank-modal";

export default async function CashBankPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const canView = userId
    ? (await hasPermission(userId, "accounts.cash-bank", "read") ||
       await hasPermission(userId, "accounts.cash-bank", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  const result = await getCashBankAccounts();
  const cashAccounts = result.success ? serializeData(result.accounts?.cash || []) : [];
  const bankAccounts = result.success ? serializeData(result.accounts?.bank || []) : [];
  const mfsAccounts = result.success ? serializeData(result.accounts?.mfs || []) : [];

  return (
    <PageGuard permissionKey="accounts.cash-bank">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cash, Bank & MFS Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage cash, bank accounts, MFS wallets, and transfers
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AddCashBankAccountModal />
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounts/cash-bank/cash-ledger">
                <FiList className="mr-2 h-4 w-4 text-green-600" />
                Cash Ledger
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounts/cash-bank/bank-ledger">
                <FiList className="mr-2 h-4 w-4 text-blue-600" />
                Bank Ledger
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounts/cash-bank/mfs-ledger">
                <FiList className="mr-2 h-4 w-4 text-purple-600" />
                MFS Ledger
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/accounts/vouchers/add?type=CONTRA">
                <FiRefreshCw className="mr-2 h-4 w-4" />
                Contra Transfer
              </Link>
            </Button>
          </div>
        </div>

        {/* Account Type Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cash Registers & Petty Cash</p>
                <p className="text-3xl font-bold mt-1">{cashAccounts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Physical cash accounts</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full text-green-600">
                <FiDollarSign className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commercial Bank Accounts</p>
                <p className="text-3xl font-bold mt-1">{bankAccounts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Corporate bank accounts</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-600">
                <FiCreditCard className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">MFS & Digital Wallets</p>
                <p className="text-3xl font-bold mt-1">{mfsAccounts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">bKash, Nagad, Rocket, Upay</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-full text-purple-600">
                <FiSmartphone className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Account Lists */}
        <CashBankList cashAccounts={cashAccounts} bankAccounts={bankAccounts} mfsAccounts={mfsAccounts} />
      </div>
    </PageGuard>
  );
}
