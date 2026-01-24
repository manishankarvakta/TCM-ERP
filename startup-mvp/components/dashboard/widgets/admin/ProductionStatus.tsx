"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminProductionStatus } from "@/app/actions/admin-dashboard.action";
import { FiActivity, FiCheckCircle, FiPlayCircle } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function ProductionStatus() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAdminProductionStatus();
      if (result.success) setData(result.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <Skeleton className="h-[300px] w-full" />;
  if (!data) return null;

  return (
    <Card className="col-span-full md:col-span-1">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <FiActivity className="text-primary" /> Kitchen Control
        </CardTitle>
        <CardDescription>Live production throughput</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center">
              <FiPlayCircle className="mx-auto text-amber-600 mb-1 h-5 w-5" />
              <p className="text-sm font-black text-amber-700 dark:text-amber-400">{data.ongoing}</p>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">In Kitchen</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center">
              <FiCheckCircle className="mx-auto text-emerald-600 mb-1 h-5 w-5" />
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{data.completedToday}</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Finished Today</p>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Output Breakdown (Today)</h5>
            {data.producedToday.length > 0 ? (
              data.producedToday.map((item: any) => (
                <div key={item.name} className="flex justify-between items-center group">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.name}</span>
                  <span className="text-sm font-black tabular-nums">{item.qty} units</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-4 border rounded border-dashed bg-muted/5">No completed batches today</p>
            )}
          </div>

          <Link href="/dashboard/production/orders" className="block text-center text-[10px] font-bold uppercase text-primary hover:underline pt-2">
            View Production Logs
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
