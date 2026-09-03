import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function AutomationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageGuard permissionKey="integrations.automations">
      <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation Rules</h1>
          <p className="text-slate-500 text-sm">Configure event-driven and scheduled automation logic mapped to canonical ERP actions.</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trigger</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No automation rules configured yet.
                  </td>
                </tr>
              ) : (
                rules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{r.name}</div>
                      {r.description && <div className="text-xs text-slate-400 mt-0.5">{r.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium">{r.triggerType}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{JSON.stringify(r.triggerConfig)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium">{r.actionType}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{JSON.stringify(r.actionConfig)}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">v{r.version}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "ACTIVE" 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageGuard>
  );
}
