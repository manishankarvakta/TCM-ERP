import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function ConnectionsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const connections = await prisma.integrationConnection.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageGuard permissionKey="integrations.connections">
      <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integration Connections</h1>
          <p className="text-slate-500 text-sm">Configure secure external credentials and third-party provider accounts.</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Credentials</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Connected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {connections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No integration connections configured yet.
                  </td>
                </tr>
              ) : (
                connections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-6 py-4 text-slate-500">{c.provider}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {c.encryptedCredentials ? "•••••••••••••••• (Encrypted)" : "None"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "ACTIVE" 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {c.lastConnectedAt ? new Date(c.lastConnectedAt).toLocaleString() : "Never"}
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
