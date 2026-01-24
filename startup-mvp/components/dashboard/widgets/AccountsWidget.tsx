"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAccountingDashboardData } from "@/app/actions/dashboard.action";
import { FiLoader, FiDollarSign, FiCreditCard, FiArrowUpRight, FiArrowDownLeft, FiFileText, FiArrowRight, FiPlus } from "react-icons/fi";
import Link from "next/link";

export default function AccountsWidget() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await getAccountingDashboardData();
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
      <Card className="col-span-full md:col-span-1">
        <CardContent className="h-[300px] flex items-center justify-center">
          <FiLoader className="animate-spin h-6 w-6 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalBalance = data.balances.reduce((sum: number, b: any) => sum + b.balance, 0);

  return (
    <Card className="col-span-full md:col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
              <FiDollarSign className="text-primary" /> Accounts & Cash
            </CardTitle>
            <CardDescription>Treasury and daily transactions</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">
            Today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 group hover:bg-primary/10 transition-colors">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Treasury Balance</p>
          <h4 className="text-3xl font-black text-foreground">
            {formatCurrency(totalBalance)}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Receipts</p>
            <p className="text-xl font-black text-emerald-700">{data.todayActivity.receipts}</p>
          </div>
          <div className="p-3 rounded-lg border border-rose-100 bg-rose-50/30">
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Payments</p>
            <p className="text-xl font-black text-rose-700">{data.todayActivity.payments}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pending Tasks</h5>
            <Badge variant="destructive" className="h-5 text-[9px] font-black uppercase">{data.pendingVouchers} Vouchers</Badge>
          </div>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-between h-9 group" asChild>
              <Link href="/dashboard/accounts/vouchers">
                <div className="flex items-center gap-2">
                  <FiFileText className="text-amber-500 h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter">Draft Vouchers</span>
                </div>
                <FiArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-between h-9 group" asChild>
              <Link href="/dashboard/accounts/vouchers/payment/add">
                <div className="flex items-center gap-2">
                  <FiArrowDownLeft className="text-rose-500 h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter">New Payment</span>
                </div>
                <FiPlus className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        <Link 
          href="/dashboard/accounts/ledgers" 
          className="block text-center text-[10px] font-black uppercase text-primary hover:underline pt-2"
        >
          View General Ledger <FiArrowRight className="inline h-2 w-2" />
        </Link>
      </CardContent>
    </Card>
  );
}
