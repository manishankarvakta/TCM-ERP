"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductionDashboardData } from "@/app/actions/dashboard.action";
import { FiLoader, FiCheckCircle, FiClock, FiActivity, FiArrowRight, FiPlay } from "react-icons/fi";
import Link from "next/link";

export default function ProductionWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getProductionDashboardData();
      if (result.success) {
        setData(result.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

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
              <FiActivity className="text-primary" /> Kitchen Production
            </CardTitle>
            <CardDescription>Live production throughput and task control</CardDescription>
          </div>
          <Badge variant="default" className="text-[10px] uppercase font-black tracking-widest bg-emerald-500 hover:bg-emerald-600">
            {data.stats.completedToday} Done
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
              <FiClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Planned</p>
              <h4 className="text-2xl font-black">{data.stats.planned}</h4>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 animate-pulse">
              <FiPlay className="h-5 w-5 fill-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Cooking</p>
              <h4 className="text-2xl font-black">{data.stats.inProgress}</h4>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
              <FiCheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ready</p>
              <h4 className="text-2xl font-black">{data.stats.completedToday}</h4>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Batch List</h5>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold uppercase tracking-widest" asChild>
              <Link href="/dashboard/production/orders/add">
                <FiActivity className="mr-1 h-3 w-3" /> New Batch
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded flex items-center justify-center ${order.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                      <FiActivity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none group-hover:text-primary transition-colors">{order.item.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                        Target: {Number(order.quantity)} {order.item.unit.symbol} • {order.code}
                      </p>
                    </div>
                  </div>
                  <Badge variant={order.status === 'IN_PROGRESS' ? 'secondary' : 'outline'} className="text-[9px] uppercase font-black h-5">
                    {order.status === 'IN_PROGRESS' ? 'Cooking' : order.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-8 border rounded border-dashed italic bg-muted/5">No active production orders found</p>
            )}
          </div>
        </div>

        <Link 
          href="/dashboard/production/orders" 
          className="block text-center text-[10px] font-black uppercase text-primary hover:underline pt-2"
        >
          Kitchen Operations Dashboard <FiArrowRight className="inline h-2 w-2" />
        </Link>
      </CardContent>
    </Card>
  );
}
