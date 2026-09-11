import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FiDollarSign,
  FiArrowDownRight,
  FiArrowUpRight,
  FiTrendingUp,
  FiPlus,
  FiBookOpen,
  FiFileText,
  FiBarChart2,
  FiCreditCard,
} from "react-icons/fi";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

export default async function FinanceOverviewPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const orgId = (session?.user as any)?.organizationId;

  const canView = userId
    ? (await hasPermission(userId, "accounts.vouchers", "view") ||
       await hasPermission(userId, "accounts.chart-of-accounts", "view"))
    : false;

  if (!canView) {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  // Fetch financial summary metrics from database
  const [
    journalLines,
    recentVouchers,
    totalVouchersCount,
    openInvoicesCount,
  ] = await Promise.all([
    prisma.journalEntryLine.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        ChartOfAccount: {
          select: { type: true },
        },
      },
    }),
    prisma.voucher.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      take: 5,
      orderBy: { date: "desc" },
      include: {
        Client: { select: { name: true } },
        Supplier: { select: { name: true } },
      },
    }),
    prisma.voucher.count({ where: orgId ? { organizationId: orgId } : undefined }),
    prisma.invoice.count({
      where: {
        status: { in: ["UNPAID", "OVERDUE", "PARTIALLY_PAID"] },
      },
    }),
  ]);

  // Aggregate metrics
  let totalAssets = 0;
  let totalAR = 0;
  let totalAP = 0;
  let totalRevenue = 0;
  let totalExpense = 0;

  for (const line of journalLines) {
    const debit = Number(line.debitAmount || 0);
    const credit = Number(line.creditAmount || 0);
    const type = line.ChartOfAccount?.type;

    if (type === "ASSET") {
      totalAssets += debit - credit;
    } else if (type === "LIABILITY") {
      totalAP += credit - debit;
    } else if (type === "REVENUE") {
      totalRevenue += credit - debit;
    } else if (type === "EXPENSE") {
      totalExpense += debit - credit;
    }

    if (line.clientId) {
      totalAR += debit - credit;
    }
  }

  const netIncome = totalRevenue - totalExpense;

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Finance Overview</h1>
            <p className="text-sm text-muted-foreground">
              Real-time double-entry financial performance metrics and ledger controls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/accounts/vouchers/add">
                <FiPlus className="mr-1.5 h-4 w-4" /> New Voucher
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/accounts/invoices">
                <FiFileText className="mr-1.5 h-4 w-4" /> Invoices & Billing
              </Link>
            </Button>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Asset Value
              </CardTitle>
              <FiDollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{formatCurrency(totalAssets)}</div>
              <p className="text-xs text-muted-foreground mt-1">General Ledger Asset Accounts</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Accounts Receivable (AR)
              </CardTitle>
              <FiArrowDownRight className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-emerald-600">
                {formatCurrency(totalAR)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding Customer Invoices</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Accounts Payable (AP)
              </CardTitle>
              <FiArrowUpRight className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-orange-600">
                {formatCurrency(totalAP)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding Supplier Bills</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Net Profit / Loss
              </CardTitle>
              <FiTrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold font-mono ${
                  netIncome >= 0 ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {formatCurrency(netIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Revenues minus Expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links & Submodules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Voucher Activity</CardTitle>
                <CardDescription>Latest financial transactions recorded in the system</CardDescription>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/accounts/vouchers">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentVouchers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No vouchers recorded yet. Click &quot;New Voucher&quot; to create your first entry.
                  </p>
                ) : (
                  recentVouchers.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-primary">
                            {v.voucherNumber}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {v.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(v.date)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {v.description || v.Client?.name || v.Supplier?.name || "Standard Transaction"}
                        </p>
                      </div>
                      <div>
                        {v.status === "posted" ? (
                          <Badge className="bg-emerald-600">Posted</Badge>
                        ) : (
                          <Badge variant="secondary">{v.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Submodule Navigator */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Financial Tools & Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/accounts/chart-of-accounts">
                  <FiBarChart2 className="h-4 w-4 text-blue-500" /> Chart of Accounts
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/accounts/journal-entries">
                  <FiBookOpen className="h-4 w-4 text-purple-500" /> Journal Entries Explorer
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/accounts/trial-balance">
                  <FiBarChart2 className="h-4 w-4 text-emerald-500" /> Trial Balance Report
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/accounts/cash-bank">
                  <FiCreditCard className="h-4 w-4 text-orange-500" /> Cash & Bank Ledgers
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/accounts/periods">
                  <FiBookOpen className="h-4 w-4 text-indigo-500" /> Fiscal Period Controls
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageGuard>
  );
}
