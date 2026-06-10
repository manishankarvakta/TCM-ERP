"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInventoryDashboardData } from "@/app/actions/dashboard.action";
import { FiLoader, FiAlertTriangle, FiBox, FiArrowRight, FiArrowDown, FiArrowUp } from "react-icons/fi";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function InventoryWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getInventoryDashboardData();
      if (result.success) {
        setData(result.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-full md:col-span-1">
        <CardContent className="h-[300px] flex items-center justify-center">
          <FiLoader className="animate-spin h-6 w-6 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="col-span-full md:col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
              <FiBox className="text-primary" /> Store Operations
            </CardTitle>
            <CardDescription>Real-time stock tracking and alerts</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-black">
            {data.lowStockItems.length} Warnings
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Links for Storekeepers */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" className="text-[10px] font-bold uppercase tracking-widest" asChild>
            <Link href="/dashboard/procurements/purchases">
              <FiArrowDown className="mr-1 h-3 w-3" /> Receive
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="text-[10px] font-bold uppercase tracking-widest" asChild>
            <Link href="/dashboard/inventory/stock/adjust">
              <FiArrowUp className="mr-1 h-3 w-3" /> Issue
            </Link>
          </Button>
        </div>

        {/* Low Stock Section */}
        <div className="space-y-2">
          <h5 className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-1">
            <FiAlertTriangle className="h-3 w-3" /> Low Stock Items
          </h5>
          <div className="space-y-1.5">
            {data.lowStockItems.length > 0 ? (
              data.lowStockItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/10 group hover:bg-destructive/10 transition-colors">
                  <div>
                    <p className="text-xs font-bold leading-none">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-destructive">
                      {Number(item.stocks[0]?.quantity || 0)} {item.unit.symbol}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-2 border rounded border-dashed italic">All stock levels healthy</p>
            )}
          </div>
        </div>

        {/* Recent Movements Section */}
        <div className="space-y-2">
          <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            Recent Movements
          </h5>
          <div className="space-y-1.5">
            {data.recentMovements.length > 0 ? (
              data.recentMovements.map((movement: any) => (
                <div key={movement.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${Number(movement.quantity) > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div>
                      <p className="text-xs font-medium leading-none">{movement?.item?.name}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {movement.warehouse.name} • {formatDistanceToNow(new Date(movement.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xs font-black tabular-nums ${Number(movement.quantity) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(movement.quantity) > 0 ? '+' : ''}{Number(movement.quantity)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-2 italic">No recent movements</p>
            )}
          </div>
        </div>

        <Link 
          href="/dashboard/inventory/stock" 
          className="block text-center text-[10px] font-black uppercase text-primary hover:underline"
        >
          Open Stock Ledger <FiArrowRight className="inline h-2 w-2" />
        </Link>
      </CardContent>
    </Card>
  );
}
