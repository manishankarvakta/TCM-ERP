"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminAlertsExceptions } from "@/app/actions/admin-dashboard.action";
import { FiAlertTriangle, FiShield, FiClock } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function AlertsExceptions() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAdminAlertsExceptions();
      if (result.success) setData(result.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <Skeleton className="h-[300px] w-full" />;
  if (!data) return null;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2 text-rose-600">
          <FiAlertTriangle className="h-5 w-5" />
          <div>
            <CardTitle className="text-xl font-bold">System Health & Risk</CardTitle>
            <CardDescription>Critical exceptions and pending tasks</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border-2 border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/10">
            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter">Negative Stock Points</p>
            <h4 className="text-3xl font-black text-rose-700 dark:text-rose-400">{data.negativeStockCount}</h4>
          </div>
          <div className="p-4 rounded-xl border-2 border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Draft Vouchers</p>
            <h4 className="text-3xl font-black text-amber-700 dark:text-amber-400">{data.unpostedVouchers}</h4>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2 flex items-center gap-2">
            <FiShield className="text-primary" /> Security & Modification Logs
          </h5>
          <div className="space-y-2">
            {data.criticalLogs.length > 0 ? (
              data.criticalLogs.map((log: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground">User: {log.user || 'System'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <FiClock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(log.time), { addSuffix: true })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-4 italic">No critical events in last 24 hours</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
