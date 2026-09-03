import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function LogsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [inboundEvents, webhookDeliveries, queueJobs] = await Promise.all([
    prisma.integrationEvent.findMany({
      take: 10,
      orderBy: { receivedAt: "desc" },
    }),
    prisma.webhookDelivery.findMany({
      take: 10,
      include: { Endpoint: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.queueJob.findMany({
      take: 10,
      orderBy: { availableAt: "desc" },
    }),
  ]);

  return (
    <PageGuard permissionKey="integrations.logs">
      <div className="p-8 max-w-7xl mx-auto space-y-12 text-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Observability Hub & Event Logs</h1>
          <p className="text-slate-500 text-sm">Monitor inbound events, outbound deliveries, and system queue jobs in real-time.</p>
        </div>

        {/* Inbound Events */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Inbound Integration Events</h2>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event ID</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Received At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {inboundEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-400">
                      No inbound integration events recorded.
                    </td>
                  </tr>
                ) : (
                  inboundEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-800">{e.externalEventId}</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{e.eventType}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          e.status === "PROCESSED" || e.status === "VERIFIED"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(e.receivedAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outbound Webhook Deliveries */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Outbound Webhook Deliveries</h2>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Endpoint</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {webhookDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                      No webhook deliveries recorded.
                    </td>
                  </tr>
                ) : (
                  webhookDeliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{d.Endpoint.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{d.eventType}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          d.status === "SUCCEEDED"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{d.attemptCount}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(d.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Queue Jobs */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Background Queue Jobs</h2>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Type</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Available At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {queueJobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-400">
                      No background queue jobs found.
                    </td>
                  </tr>
                ) : (
                  queueJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{j.type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          j.status === "SUCCEEDED"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : j.status === "DEAD_LETTER"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : j.status === "CLAIMED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-50 text-slate-500 border border-slate-200"
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">
                        {j.attempts} / {j.maxAttempts}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(j.availableAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
