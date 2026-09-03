import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getServiceSale,
  approveServiceSale,
  confirmServiceSale,
  markServiceSaleInFulfillment,
  markServiceSaleFulfilled,
  markServiceSaleBillingEligible,
  markServiceSaleHandoverReady,
} from "@/app/actions/crm/service-sale.action";
import { createProjectHandoverFromServiceSale } from "@/app/actions/crm/project-handover.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  FileSignature,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  User,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceSaleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { success, serviceSale, error } = await getServiceSale(id);

  if (!success || !serviceSale) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link href="/dashboard/crm/service-sales">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Service Sales
          </Button>
        </Link>
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{error || "Service Sale not found"}</span>
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
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div>
        <Link href="/dashboard/crm/service-sales">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Service Sales
          </Button>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{serviceSale.title}</h1>
            {getStatusBadge(serviceSale.status)}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
            <span className="font-mono font-semibold text-indigo-600">{serviceSale.serviceSaleNumber}</span>
            <span>•</span>
            <span>Agreement Ref: {serviceSale.agreementNumberSnapshot} (v{serviceSale.agreementVersionSnapshot})</span>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {serviceSale.status === "DRAFT" && (
            <form action={async () => {
              "use server";
              await approveServiceSale(serviceSale.id);
            }}>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approve Order
              </Button>
            </form>
          )}

          {serviceSale.status === "APPROVED" && (
            <form action={async () => {
              "use server";
              await confirmServiceSale(serviceSale.id);
            }}>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                <ShieldCheck className="h-4 w-4" />
                Confirm Order
              </Button>
            </form>
          )}

          {serviceSale.status === "CONFIRMED" && (
            <form action={async () => {
              "use server";
              await markServiceSaleInFulfillment(serviceSale.id);
            }}>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-2">
                <Clock className="h-4 w-4" />
                Start Fulfillment
              </Button>
            </form>
          )}

          {serviceSale.status === "IN_FULFILLMENT" && (
            <form action={async () => {
              "use server";
              await markServiceSaleFulfilled(serviceSale.id);
            }}>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mark Fulfilled
              </Button>
            </form>
          )}

          {!serviceSale.billingEligibleAt && (serviceSale.status === "CONFIRMED" || serviceSale.status === "IN_FULFILLMENT" || serviceSale.status === "FULFILLED") && (
            <form action={async () => {
              "use server";
              await markServiceSaleBillingEligible(serviceSale.id);
            }}>
              <Button type="submit" variant="outline" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-medium gap-2">
                <CreditCard className="h-4 w-4" />
                Mark Billing Eligible
              </Button>
            </form>
          )}

          {!serviceSale.handoverReadyAt && (serviceSale.status === "CONFIRMED" || serviceSale.status === "IN_FULFILLMENT" || serviceSale.status === "FULFILLED") && (
            <form action={async () => {
              "use server";
              await markServiceSaleHandoverReady(serviceSale.id);
            }}>
              <Button type="submit" variant="outline" className="border-indigo-500 text-indigo-700 hover:bg-indigo-50 font-medium gap-2">
                <Layers className="h-4 w-4" />
                Mark Handover Ready
              </Button>
            </form>
          )}

          {serviceSale.handoverReadyAt && (
            <form action={async () => {
              "use server";
              const res = await createProjectHandoverFromServiceSale(serviceSale.id);
              if (res.success && res.handoverId) {
                redirect(`/dashboard/crm/project-handovers/${res.handoverId}`);
              }
            }}>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
                <Layers className="h-4 w-4" />
                Create Project Handover
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Commercial Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scope Summary</p>
                <p className="text-slate-800 text-sm mt-1">{serviceSale.scopeSummary || "No scope summary provided."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Value</p>
                  <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {serviceSale.currency} {Number(serviceSale.orderValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fulfillment Status</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{serviceSale.fulfillmentStatus}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ordered Scope Items */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Ordered Service Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3 text-right">Unit Rate</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceSale.Items && serviceSale.Items.length > 0 ? (
                    serviceSale.Items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-3 font-mono text-xs text-slate-500">{item.code || "-"}</td>
                        <td className="px-6 py-3 font-medium text-slate-900">{item.description}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-700">{Number(item.quantity)}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-700">
                          {serviceSale.currency} {Number(item.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900">
                          {serviceSale.currency} {Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No item breakdown available. Total contract value applies.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar References */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Upstream References</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</p>
                <p className="font-semibold text-slate-900 mt-1">{serviceSale.Client?.name || serviceSale.Client?.company}</p>
                <p className="text-xs text-slate-500 font-mono">{serviceSale.Client?.clientCode}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source Agreement</p>
                <Link href={`/dashboard/crm/agreements/${serviceSale.agreementId}`} className="font-mono font-semibold text-indigo-600 hover:underline mt-1 block">
                  {serviceSale.agreementNumberSnapshot} (v{serviceSale.agreementVersionSnapshot})
                </Link>
              </div>

              {serviceSale.Quotation && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quotation</p>
                  <p className="font-mono text-slate-700 mt-1">{serviceSale.Quotation.quotationNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Readiness Indicators */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">ERP Lifecycle Readiness</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Billing Eligible:</span>
                {serviceSale.billingEligibleAt ? (
                  <Badge className="bg-emerald-100 text-emerald-800">ELIGIBLE</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400">PENDING</Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Handover Ready:</span>
                {serviceSale.handoverReadyAt ? (
                  <Badge className="bg-indigo-100 text-indigo-800">READY</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400">PENDING</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
