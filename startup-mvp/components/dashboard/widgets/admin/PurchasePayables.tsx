"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminPurchasePayables } from "@/app/actions/admin-dashboard.action";
import { FiShoppingCart, FiArrowUpRight } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function PurchasePayables() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAdminPurchasePayables();
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
          <FiShoppingCart className="text-primary" /> Procurement & AP
        </CardTitle>
        <CardDescription>Sourcing and supplier liability</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <div>
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Total Accounts Payable</p>
              <h4 className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">{formatCurrency(data.accountsPayable)}</h4>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
              <FiArrowUpRight className="h-6 w-6 rotate-45" />
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2 flex justify-between items-center">
              <span>Pending Receipts</span>
              <Badge variant="outline" className="text-[10px]">{data.pendingReceipts} Active</Badge>
            </h5>
            {data.recentPending.length > 0 ? (
              data.recentPending.map((p: any) => (
                <div key={p.number} className="flex justify-between items-center group p-2 hover:bg-muted/5 rounded-md transition-all">
                  <div>
                    <p className="text-sm font-semibold">{p.supplier}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{p.number}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{formatCurrency(p.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-4 italic">No pending purchases</p>
            )}
          </div>

          <Link href="/dashboard/procurements/purchases" className="block text-center text-[10px] font-bold uppercase text-primary hover:underline pt-2">
            Open Purchase Orders
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
