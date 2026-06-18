"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSalesDashboardData } from "@/app/actions/dashboard.action";
import { FiLoader, FiTrendingUp, FiShoppingBag, FiStar, FiPlus, FiArrowRight } from "react-icons/fi";
import Link from "next/link";

export default function SalesWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getSalesDashboardData();
      if (result.success) {
        setData(result.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatCurrency = (val: number) => 
    `৳ ${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(val)}`;

  if (loading) {
    return (
      <Card className="col-span-full md:col-span-1 lg:col-span-2">
        <CardContent className="h-[300px] flex items-center justify-center">
          <FiLoader className="animate-spin h-6 w-6 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="col-span-full md:col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
              <FiTrendingUp className="text-primary" /> Front Desk Sales
            </CardTitle>
            <CardDescription>Daily revenue and menu performance</CardDescription>
          </div>
          <Badge variant="default" className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-2 text-emerald-600">
              <FiTrendingUp className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Today's Revenue</span>
            </div>
            <h4 className="text-3xl font-black mt-1 text-emerald-700">
              {formatCurrency(data.todayRevenue)}
            </h4>
          </div>
          <div className="flex flex-col gap-1 p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20 group hover:border-blue-500/40 transition-all">
            <div className="flex items-center gap-2 text-blue-600">
              <FiShoppingBag className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Completed Bills</span>
            </div>
            <h4 className="text-3xl font-black mt-1 text-blue-700">{data.todaySales}</h4>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <FiStar className="text-amber-500 fill-amber-500" /> Daily Top Sellers
            </h5>
            <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest" asChild>
              <Link href="/dashboard/sales/pos">
                <FiPlus className="mr-1 h-3 w-3" /> POS Sale
              </Link>
            </Button>
          </div>
          <div className="space-y-1.5">
            {data.topItems.length > 0 ? (
              data.topItems.map((item: any, index: number) => (
                <div key={item.itemId} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-muted-foreground w-4">#{index + 1}</span>
                    <span className="text-sm font-bold text-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-black text-foreground">{Number(item._sum.quantity)} Qty</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">{formatCurrency(Number(item._sum.amount))}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-8 italic border rounded border-dashed bg-muted/5">No sales recorded yet today</p>
            )}
          </div>
        </div>

        <Link 
          href="/dashboard/sales" 
          className="block text-center text-[10px] font-black uppercase text-primary hover:underline pt-2"
        >
          Open Full Sales Registry <FiArrowRight className="inline h-2 w-2" />
        </Link>
      </CardContent>
    </Card>
  );
}
