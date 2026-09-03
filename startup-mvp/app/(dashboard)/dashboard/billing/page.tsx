import { prisma } from "@/lib/prisma";
import { BillingMilestoneStatus, BillingPlanStatus } from "@prisma/client";

export const metadata = {
  title: "Billing Overview | ERP",
  description: "Central commercial billing overview across all projects.",
};

async function getBillingSummary(organizationId: string) {
  const plans = await prisma.projectBillingPlan.findMany({
    where: { organizationId, status: { in: [BillingPlanStatus.ACTIVE, BillingPlanStatus.DRAFT] } },
    include: {
      Project: { select: { id: true, title: true, projectNumber: true, clientId: true } },
      Milestones: { include: { InvoiceLinks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return plans;
}

export default async function BillingOverviewPage() {
  // Standalone billing overview page – loads without per-request tenant ctx for static display
  const plans: Awaited<ReturnType<typeof getBillingSummary>> = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Billing Overview
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Central view of all project billing plans, milestone status, and invoice progress</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Billing Plans", value: "—", color: "text-emerald-400" },
            { label: "Currently Billable", value: "—", color: "text-amber-400" },
            { label: "Total Invoiced (MTD)", value: "—", color: "text-sky-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-5">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">{s.label}</p>
              <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Projects Billing Table */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/40 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Project Billing Plans</h2>
            <span className="text-slate-400 text-sm">Showing active & draft plans</span>
          </div>
          <div className="p-12 text-center text-slate-500">
            Navigate to a specific project to view its billing plan and milestones.
            <br />
            <span className="text-slate-600 text-sm mt-2 block">
              Path: /dashboard/projects/[id]/billing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
