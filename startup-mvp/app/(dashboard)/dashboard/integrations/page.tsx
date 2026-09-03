import PageGuard from "@/components/permissions/page-guard";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Query summary statistics
  const [connectionsCount, activeConnections, webhooksCount, activeWebhooks, rulesCount, activeRules, jobsCount, deadLetterJobs] = await Promise.all([
    prisma.integrationConnection.count(),
    prisma.integrationConnection.count({ where: { status: "ACTIVE" } }),
    prisma.webhookEndpoint.count(),
    prisma.webhookEndpoint.count({ where: { status: "ACTIVE" } }),
    prisma.automationRule.count(),
    prisma.automationRule.count({ where: { status: "ACTIVE" } }),
    prisma.queueJob.count(),
    prisma.queueJob.count({ where: { status: "DEAD_LETTER" } }),
  ]);

  return (
    <PageGuard permissionKey="integrations.connections">
      <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-800">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Integrations & Automation Engine
            </h1>
            <p className="text-slate-500 mt-1">
              Configure secure external connections, sign outbound webhooks, and automate business workflows.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Connections</span>
            <div className="flex items-baseline space-x-2 mt-4">
              <span className="text-3xl font-black text-slate-800">{connectionsCount}</span>
              <span className="text-sm text-green-500 font-semibold">({activeConnections} Active)</span>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Webhooks</span>
            <div className="flex items-baseline space-x-2 mt-4">
              <span className="text-3xl font-black text-slate-800">{webhooksCount}</span>
              <span className="text-sm text-green-500 font-semibold">({activeWebhooks} Active)</span>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Automations</span>
            <div className="flex items-baseline space-x-2 mt-4">
              <span className="text-3xl font-black text-slate-800">{rulesCount}</span>
              <span className="text-sm text-green-500 font-semibold">({activeRules} Active)</span>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Queue Jobs</span>
            <div className="flex items-baseline space-x-2 mt-4">
              <span className="text-3xl font-black text-slate-800">{jobsCount}</span>
              <span className={`text-sm font-semibold ${deadLetterJobs > 0 ? "text-red-500" : "text-slate-400"}`}>
                ({deadLetterJobs} Dead Letters)
              </span>
            </div>
          </div>
        </div>

        {/* Modules/Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Connections Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all space-y-4">
            <h2 className="text-xl font-bold text-slate-800">1. Credentials & Identity</h2>
            <p className="text-slate-500 text-sm">
              Connect external services (CRMs, payment gateways, HR applications) securely. All keys are encrypted at rest and masked.
            </p>
            <div className="pt-4">
              <Link 
                href="/dashboard/integrations/connections"
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-blue-200"
              >
                Manage Connections →
              </Link>
            </div>
          </div>

          {/* Webhooks Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all space-y-4">
            <h2 className="text-xl font-bold text-slate-800">2. Outbound Webhooks</h2>
            <p className="text-slate-500 text-sm">
              Dispatch event-driven payloads to external endpoints securely. Subscriptions are signed with HMAC-SHA256 and feature replay protections.
            </p>
            <div className="pt-4">
              <Link 
                href="/dashboard/integrations/webhooks"
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-blue-200"
              >
                Configure Webhooks →
              </Link>
            </div>
          </div>

          {/* Automations Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all space-y-4">
            <h2 className="text-xl font-bold text-slate-800">3. Automation Rules</h2>
            <p className="text-slate-500 text-sm">
              Create rules triggered by system events or time schedules. Actions are safely routed to canonical system authorities.
            </p>
            <div className="pt-4">
              <Link 
                href="/dashboard/integrations/automations"
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-blue-200"
              >
                Configure Rules →
              </Link>
            </div>
          </div>

          {/* Logs Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all space-y-4">
            <h2 className="text-xl font-bold text-slate-800">4. Observability & Event Logs</h2>
            <p className="text-slate-500 text-sm">
              Monitor webhook deliveries, track inbound events, and manage background job queues or manual retries.
            </p>
            <div className="pt-4">
              <Link 
                href="/dashboard/integrations/logs"
                className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-blue-200"
              >
                View Event Logs →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
