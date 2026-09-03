import React from "react";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { calculateProjectProfitability } from "@/lib/profitability/profitability-engine";

const prisma = new PrismaClient();

export default async function ProjectProfitabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const org = await prisma.organization.findFirst({ where: { status: "active" } });
  const organizationId = org ? org.id : "";

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    include: { Client: true }
  });

  if (!project) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl">
          Project not found or tenant boundary violated.
        </div>
      </div>
    );
  }

  const metrics = await calculateProjectProfitability(projectId, organizationId);
  const snapshots = await prisma.projectProfitabilitySnapshot.findMany({
    where: { organizationId, projectId },
    orderBy: { version: "desc" },
    take: 10
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard/profitability" className="hover:underline">Portfolio Profitability</Link>
            <span>/</span>
            <span className="font-medium text-gray-900">{project.title}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Project Financial Performance & Profitability
          </h1>
          <p className="text-sm text-gray-500">
            Client: {project.Client?.company || project.Client?.name || "N/A"} | Health: {metrics.status}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/profitability"
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            ← Back to Portfolio
          </Link>
        </div>
      </div>

      {/* Main Financial KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Contract Value</p>
          <p className="text-xl font-bold text-gray-900 mt-1">TK {metrics.contractValue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Invoiced</p>
          <p className="text-xl font-bold text-gray-800 mt-1">TK {metrics.invoicedAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Recognized Revenue</p>
          <p className="text-xl font-bold text-blue-600 mt-1">TK {metrics.recognizedRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Collected Cash</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">TK {metrics.collectedAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Actual Cost</p>
          <p className="text-xl font-bold text-amber-600 mt-1">TK {metrics.totalActualCost.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Gross Profit</p>
          <p className={`text-xl font-extrabold mt-1 ${metrics.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            TK {metrics.grossProfit.toLocaleString()} ({metrics.grossMarginPercent}%)
          </p>
        </div>
      </div>

      {/* Financial Structure & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Collections */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Revenue & Commercial Breakdown</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Contract Basis</span>
              <span className="font-semibold text-gray-900">{metrics.revenueBreakdown.contractSource}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Billable Milestone Amount</span>
              <span className="font-semibold text-gray-900">TK {metrics.billableAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Invoiced Line Items Count</span>
              <span className="font-semibold text-gray-900">{metrics.revenueBreakdown.invoicedCount} line item(s)</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Recognized Revenue Entries</span>
              <span className="font-semibold text-blue-600">TK {metrics.recognizedRevenue.toLocaleString()} ({metrics.revenueBreakdown.recognizedCount} entry/entries)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Outstanding Uncollected Receivables</span>
              <span className="font-semibold text-amber-700">TK {(metrics.invoicedAmount - metrics.collectedAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Costs & Projections */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Cost & Projection Breakdown</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Actual Labor Cost ({metrics.costBreakdown.laborHoursApproved} approved hrs)</span>
              <span className="font-semibold text-gray-900">TK {metrics.costBreakdown.laborCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Procurement & Purchases</span>
              <span className="font-semibold text-gray-900">TK {metrics.costBreakdown.procurementCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Expenses & Vouchers</span>
              <span className="font-semibold text-gray-900">TK {metrics.costBreakdown.expenseCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-600">Committed Remaining Cost</span>
              <span className="font-semibold text-amber-600">TK {metrics.committedCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Projected Final Cost</span>
              <span className="font-bold text-gray-900">TK {metrics.projectedFinalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Snapshots Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Captured Historical Profitability Snapshots</h3>
        </div>
        {snapshots.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No historical snapshots captured yet. Live metrics above represent real-time canonical truth.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold">Version</th>
                  <th className="py-3 px-4 font-semibold">Calculated At</th>
                  <th className="py-3 px-4 font-semibold text-right">Contract</th>
                  <th className="py-3 px-4 font-semibold text-right">Recognized</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Cost</th>
                  <th className="py-3 px-4 font-semibold text-right">Gross Profit</th>
                  <th className="py-3 px-4 font-semibold text-center">Margin %</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {snapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">v{s.version}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(s.calculatedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium">TK {Number(s.contractValue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-600">TK {Number(s.recognizedRevenue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium text-amber-700">TK {Number(s.totalActualCost).toLocaleString()}</td>
                    <td className={`py-3 px-4 text-right font-bold ${Number(s.grossProfit) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      TK {Number(s.grossProfit).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{s.grossMarginPercent}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
