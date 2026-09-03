import { getProjectBillingSummaryAction } from "@/app/actions/crm/billing-operations.action";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Project Billing | ERP",
  description: "Manage billing milestones and invoicing for this project.",
};

export default async function ProjectBillingPage({ params }: Props) {
  const resolvedParams = await params;
  const summary = await getProjectBillingSummaryAction(resolvedParams.id).catch(() => null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Project Billing
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Billing plan, milestones & invoice management</p>
          </div>
          {!summary && (
            <button
              id="create-billing-plan-btn"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
            >
              + Create Billing Plan
            </button>
          )}
        </div>

        {!summary ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-10 text-center">
            <div className="text-slate-400 text-lg">No active billing plan for this project.</div>
            <p className="text-slate-500 text-sm mt-2">Create a billing plan linked to an Agreement or Service Sale to begin milestone billing.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Contract Value", value: `${summary.currency} ${Number(summary.contractValue).toLocaleString()}`, color: "text-slate-200" },
                { label: "Currently Billable", value: `${summary.currency} ${Number(summary.totalBillable).toLocaleString()}`, color: "text-emerald-400" },
                { label: "Already Invoiced", value: `${summary.currency} ${Number(summary.totalInvoiced).toLocaleString()}`, color: "text-sky-400" },
                { label: "Remaining Uninvoiced", value: `${summary.currency} ${Number(summary.remainingUninvoiced).toLocaleString()}`, color: "text-amber-400" },
              ].map((card) => (
                <div key={card.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-5">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">{card.label}</p>
                  <p className={`text-2xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Plan Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Plan Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                summary.status === "ACTIVE" ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50" :
                summary.status === "DRAFT" ? "bg-slate-700/50 text-slate-300 border border-slate-600/50" :
                "bg-amber-900/50 text-amber-300 border border-amber-700/50"
              }`}>{summary.status}</span>
            </div>

            {/* Milestones Table */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/40">
                <h2 className="text-lg font-semibold text-slate-100">Billing Milestones</h2>
              </div>
              <div className="divide-y divide-slate-700/30">
                {summary.milestones.map((m) => (
                  <div key={m.id} className="px-6 py-5 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                          {m.sequence}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100">{m.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{m.code} · {m.billingType.replace(/_/g, " ")}</p>
                          {m.staleReason && (
                            <p className="text-amber-400 text-xs mt-1">⚠ {m.staleReason}</p>
                          )}
                          {/* Conditions */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {m.conditions.map((c) => (
                              <span key={c.id} className={`px-2 py-0.5 rounded text-xs ${
                                c.satisfied ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"
                              }`}>
                                {c.satisfied ? "✓" : "✗"} {c.type.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-slate-100 font-semibold">{summary.currency} {Number(m.calculatedAmount).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs mt-0.5">Invoiced: {Number(m.invoicedAmount).toLocaleString()}</p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          m.status === "BILLABLE" ? "bg-emerald-900/50 text-emerald-300" :
                          m.status === "INVOICED" ? "bg-sky-900/50 text-sky-300" :
                          m.status === "BLOCKED" ? "bg-red-900/50 text-red-300" :
                          m.status === "STALE" ? "bg-amber-900/50 text-amber-300" :
                          "bg-slate-700/50 text-slate-300"
                        }`}>{m.status}</span>
                        {(m.status === "BILLABLE" || m.status === "PARTIALLY_INVOICED") && (
                          <div className="mt-2">
                            <button
                              id={`invoice-milestone-${m.id}`}
                              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-xs rounded-lg transition-colors"
                            >
                              Create Invoice
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Invoice Links */}
                    {m.invoices.length > 0 && (
                      <div className="mt-3 ml-12 space-y-1">
                        {m.invoices.map((inv) => (
                          <div key={inv.invoiceId} className="flex gap-3 text-xs text-slate-400">
                            <span className="text-sky-400">{inv.invoiceNumber}</span>
                            <span>{summary.currency} {Number(inv.amountApplied).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
