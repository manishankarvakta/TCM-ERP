import React from "react";
import Link from "next/link";
import { getServiceSales } from "@/app/actions/crm/service-sale.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Search, Plus, Filter, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function ServiceSalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const status = params.status || "all";

  const { success, serviceSales, total, totalPages, error } = await getServiceSales(page, 10, search, status);

  if (!success) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">{error || "Failed to load service sales"}</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">DRAFT</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">APPROVED</Badge>;
      case "CONFIRMED":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">CONFIRMED</Badge>;
      case "IN_FULFILLMENT":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">IN FULFILLMENT</Badge>;
      case "FULFILLED":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">FULFILLED</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Commercial Service Sales</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Operational commercial fulfillment orders generated from Active Agreements.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Service Sales</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Commercial orders across organization</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Pipeline</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {serviceSales?.filter(s => s.status === "CONFIRMED" || s.status === "IN_FULFILLMENT").length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Orders currently in commercial fulfillment</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fulfilled Orders</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">
              {serviceSales?.filter(s => s.status === "FULFILLED").length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Commercially completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <form method="GET" action="/dashboard/crm/service-sales">
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search by order number or title..."
              className="pl-9 bg-white border-slate-200"
            />
          </form>
        </div>
      </div>

      {/* List Directory Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Order Number</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Agreement</th>
                <th className="px-6 py-4 text-right">Order Value</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Billing Eligible</th>
                <th className="px-6 py-4">Handover Ready</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceSales && serviceSales.length > 0 ? (
                serviceSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600">
                      <Link href={`/dashboard/crm/service-sales/${sale.id}`} className="hover:underline">
                        {sale.serviceSaleNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{sale.title}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {sale.Client?.name || sale.Client?.company || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {sale.Agreement?.agreementNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 font-mono">
                      {sale.currency} {Number(sale.orderValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sale.status)}</td>
                    <td className="px-6 py-4">
                      {sale.billingEligibleAt ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">YES</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200">NO</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {sale.handoverReadyAt ? (
                        <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">YES</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200">NO</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/crm/service-sales/${sale.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-slate-600 hover:text-indigo-600">
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No commercial service sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
