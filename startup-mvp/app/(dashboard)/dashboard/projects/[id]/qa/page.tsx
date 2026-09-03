import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectQAOperations } from "@/app/actions/crm/qa-operations.action";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, FileCheck, TestTube, Bug } from "lucide-react";

export default async function ProjectQAOperationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  const res = await getProjectQAOperations(projectId);

  if (!res.success) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
          <h2 className="font-semibold text-lg">Access Error</h2>
          <p className="mt-1">{res.error || "Failed to load QA operations."}</p>
          <Link href={`/dashboard/projects/${projectId}`} className="mt-4 inline-block text-sm font-medium underline">
            Return to Project Details
          </Link>
        </div>
      </div>
    );
  }

  const {
    qaExecutionReadyAt,
    qaWorkRequirement,
    qaCompletedAt,
    plans,
    testCycles,
    testCases,
  } = res;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Project
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Quality Assurance Operations Engine
          </h1>
          <p className="text-sm text-gray-500">
            Phase 14 — Traceable test planning, execution cycles, defect tracking, and UAT readiness.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              qaCompletedAt
                ? "bg-green-50 text-green-700 border-green-200"
                : qaExecutionReadyAt
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {qaCompletedAt
              ? "QA HANDOFF COMPLETED"
              : qaExecutionReadyAt
              ? "QA EXECUTION READY"
              : `REQUIREMENT: ${qaWorkRequirement}`}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>QA Readiness</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {qaExecutionReadyAt ? "Passed Gate" : "Pending"}
          </p>
          <p className="text-xs text-gray-500">
            {qaExecutionReadyAt ? new Date(qaExecutionReadyAt).toLocaleDateString() : "Upstream gates pending"}
          </p>
        </div>

        <div className="p-4 rounded-xl border bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>QA Plans</span>
            <FileCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{plans.length}</p>
          <p className="text-xs text-gray-500">{plans.filter((p) => p.status === "APPROVED").length} Approved</p>
        </div>

        <div className="p-4 rounded-xl border bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Test Cycles</span>
            <TestTube className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{testCycles.length}</p>
          <p className="text-xs text-gray-500">{testCycles.filter((c) => c.status === "COMPLETED").length} Completed</p>
        </div>

        <div className="p-4 rounded-xl border bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Test Cases</span>
            <Bug className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{testCases.length}</p>
          <p className="text-xs text-gray-500">{testCases.filter((tc) => tc.Executions[0]?.status === "PASSED").length} Passed</p>
        </div>
      </div>

      {/* Main Grid: Test Cycles & Test Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Cycles */}
        <div className="p-5 rounded-xl border bg-white shadow-sm space-y-4">
          <h2 className="font-semibold text-base text-gray-900 flex items-center gap-2">
            <TestTube className="w-4 h-4 text-purple-600" /> Test Execution Cycles ({testCycles.length})
          </h2>
          {testCycles.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No QA Test Cycles created for this project.</p>
          ) : (
            <div className="space-y-3">
              {testCycles.map((cycle) => (
                <div key={cycle.id} className="p-3 border rounded-lg hover:border-gray-300 transition-colors space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{cycle.name}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                      {cycle.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Build: {cycle.BuildRecord?.buildNumber || "N/A"} ({cycle.BuildRecord?.status || "None"})</span>
                    <span className="font-medium text-gray-700">Status: {cycle.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Cases */}
        <div className="p-5 rounded-xl border bg-white shadow-sm space-y-4">
          <h2 className="font-semibold text-base text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Test Cases & Executions ({testCases.length})
          </h2>
          {testCases.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No Test Cases registered for this project.</p>
          ) : (
            <div className="space-y-3">
              {testCases.map((tc) => {
                const latestExec = tc.Executions[0];
                return (
                  <div key={tc.id} className="p-3 border rounded-lg hover:border-gray-300 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{tc.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        latestExec?.status === "PASSED"
                          ? "bg-green-50 text-green-700"
                          : latestExec?.status === "FAILED"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {latestExec?.status || "NOT_RUN"}
                      </span>
                    </div>
                    {tc.expectedResult && (
                      <p className="text-xs text-gray-500 truncate">Expected: {tc.expectedResult}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
