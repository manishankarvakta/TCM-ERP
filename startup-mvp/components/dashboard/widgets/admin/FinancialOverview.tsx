"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminFinancialOverview } from "@/app/actions/admin-dashboard.action";
import { FiLoader, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinancialOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAdminFinancialOverview();
      if (result.success) setData(result.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatCurrency = (val: number) => 
    `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(val)}`;

  if (loading) return <Skeleton className="h-[300px] w-full" />;
  if (!data) return null;

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FiPieChart className="text-primary" /> Financial Health
            </CardTitle>
            <CardDescription>Consolidated revenue and expenses overview</CardDescription>
          </div>
          <Badge variant={data.netProfit >= 0 ? "default" : "secondary"}>
            {data.netProfit >= 0 ? "In Profit" : "In Loss"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Monthly Revenue</p>
            <div className="flex items-center gap-2 text-emerald-600">
              <FiTrendingUp />
              <h4 className="text-2xl font-black">{formatCurrency(data.revenue.month)}</h4>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Today: {formatCurrency(data.revenue.today)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Monthly Expenses</p>
            <div className="flex items-center gap-2 text-rose-600">
              <FiTrendingDown />
              <h4 className="text-2xl font-black">{formatCurrency(data.expenses.month)}</h4>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Today: {formatCurrency(data.expenses.today)}</p>
          </div>
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Available Liquidity</p>
            <h4 className="text-2xl font-black mt-1">{formatCurrency(data.totalLiquidity)}</h4>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Account Balances</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.cashBankBalances.map((acc: any) => (
              <div key={acc.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <FiDollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{acc.type}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatCurrency(acc.balance)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
