"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminSalesReceivables } from "@/app/actions/admin-dashboard.action";
import { FiTrendingUp, FiArrowDownLeft } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function SalesReceivables() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAdminSalesReceivables();
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
    <Card className="col-span-full md:col-span-1">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <FiTrendingUp className="text-primary" /> Sales & AR
        </CardTitle>
        <CardDescription>Front desk performance and credit</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Total Accounts Receivable</p>
              <h4 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(data.accountsReceivable)}</h4>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FiArrowDownLeft className="h-6 w-6" />
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2 flex justify-between items-center">
              <span>Recent Major Sales</span>
              <Badge variant="outline" className="text-[10px]">{data.todaySalesCount} Today</Badge>
            </h5>
            {data.recentSales.length > 0 ? (
              data.recentSales.map((s: any) => (
                <div key={s.number} className="flex justify-between items-center group p-2 hover:bg-muted/5 rounded-md transition-all">
                  <div>
                    <p className="text-sm font-semibold">{s.client}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{s.number}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{formatCurrency(s.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-4 italic">No sales recorded yet</p>
            )}
          </div>

          <Link href="/dashboard/sales" className="block text-center text-[10px] font-bold uppercase text-primary hover:underline pt-2">
            Open Sales Dashboard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
