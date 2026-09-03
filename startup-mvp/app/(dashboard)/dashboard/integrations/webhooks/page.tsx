import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function WebhooksPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const webhooks = await prisma.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageGuard permissionKey="integrations.webhooks">
      <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outbound Webhooks</h1>
          <p className="text-slate-500 text-sm">Manage external target endpoints receiving secure real-time ERP events.</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Secret</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscribed Events</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No webhook endpoints configured yet.
                  </td>
                </tr>
              ) : (
                webhooks.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{w.name}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{w.url}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono">•••••••••••••••• (HMAC Secret)</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {w.subscribedEvents.map((ev, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        w.status === "ACTIVE" 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        {w.status}
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
