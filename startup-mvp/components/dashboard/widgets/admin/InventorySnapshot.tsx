"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminInventorySnapshot } from "@/app/actions/admin-dashboard.action";
import { FiBox, FiAlertCircle } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function InventorySnapshot() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAdminInventorySnapshot();
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
          <FiBox className="text-primary" /> Inventory Snapshot
        </CardTitle>
        <CardDescription>Asset value by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Category</span>
              <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Asset Value</span>
            </div>
            {Object.entries(data.stockValue).map(([type, value]: any) => (
              <div key={type} className="flex justify-between items-center group">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{type.replace('_', ' ')}</span>
                <span className="text-sm font-black">{formatCurrency(value)}</span>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-sm font-black text-primary">Total Inventory Value</span>
              <span className="text-sm font-black text-primary underline decoration-2 underline-offset-4">{formatCurrency(data.totalValue)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-destructive flex items-center gap-1 uppercase tracking-widest">
              <FiAlertCircle /> Low Stock Alerts
            </h5>
            {data.lowStockAlerts.length > 0 ? (
              data.lowStockAlerts.map((item: any) => (
                <div key={item.code} className="flex items-center justify-between p-2 rounded-md bg-destructive/5 border border-destructive/10">
                  <div>
                    <p className="text-[11px] font-bold">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.code}</p>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">{item.qty} units</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-2 border rounded border-dashed">No stock issues detected</p>
            )}
          </div>
          
          <Link href="/dashboard/inventory/stock" className="block text-center text-[10px] font-bold uppercase text-primary hover:underline pt-2">
            Open Inventory Manager
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
