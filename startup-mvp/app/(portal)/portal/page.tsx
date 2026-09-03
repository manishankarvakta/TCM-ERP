import { getPortalDashboard } from "@/app/actions/portal.action";
import React from "react";

export default async function PortalDashboardPage() {
  const result = await getPortalDashboard();

  if (!result.success || !result.data) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        Error loading dashboard: {result.error || "Unknown error"}
      </div>
    );
  }

  const stats = [
    { name: "Active Projects", value: result.data.activeProjectsCount },
    { name: "Outstanding Invoices", value: result.data.outstandingInvoicesCount },
    { name: "Outstanding Balance", value: `৳${result.data.outstandingTotal.toFixed(2)}` },
    { name: "Total Paid", value: `৳${result.data.paidTotal.toFixed(2)}` },
    { name: "Open Support Tickets", value: result.data.openTicketsCount },
    { name: "SLA Breaches", value: result.data.openSlaBreachCount },
    { name: "Actions Required", value: result.data.pendingActionsCount },
    { name: "Change Requests", value: result.data.changeRequestsCount },
    { name: "Shared Files", value: result.data.sharedFilesCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500">Your commercial, project, and billing snapshot</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow border border-slate-200"
          >
            <dt className="truncate text-sm font-medium text-slate-500">{stat.name}</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {stat.value}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
}
