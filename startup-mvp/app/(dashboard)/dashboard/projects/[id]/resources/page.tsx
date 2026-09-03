import React from "react";
import Link from "next/link";
import { getProjectResourceAllocations, markProjectReadyForDepartmentExecution } from "@/app/actions/crm/resource-allocation.action";
import { getProjectPlanning } from "@/app/actions/crm/project-management.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Users,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectResourcesPage({ params }: PageProps) {
  const { id } = await params;
  const { success: prjSuccess, project, error: prjError } = await getProjectPlanning(id);
  const { success: allocSuccess, allocations, error: allocError } = await getProjectResourceAllocations(id);

  if (!prjSuccess || !project) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link href={`/dashboard/projects/${id}/planning`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Project Planning
          </Button>
        </Link>
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{prjError || allocError || "Project resource allocation data not found"}</span>
        </div>
      </div>
    );
  }

  const activeAllocations = allocations.filter((a) => a.status === "PLANNED" || a.status === "ACTIVE");
  const isExecutionReady = project.departmentExecutionReadyAt != null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div>
        <Link href={`/dashboard/projects/${id}/planning`}>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Project Planning
          </Button>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{project.projectNumber || project.title}</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
              {project.status}
            </Badge>
            {isExecutionReady && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready for Department Execution
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Formal Resource Allocation & Capacity Planning (Phase 10)</p>
        </div>

        {/* Business Gate Action */}
        <div>
          {!isExecutionReady && (
            <form action={async () => {
              "use server";
              await markProjectReadyForDepartmentExecution(project.id);
            }}>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
                <Sparkles className="h-4 w-4" />
                Mark Ready for Department Execution
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{allocations.length}</div>
            <p className="text-xs text-slate-500 mt-0.5">{activeAllocations.length} active/planned commitments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resource Gate Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="h-4 w-4" /> Resource Planning Gate Passed
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Project ready for employee allocation</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Execution Gate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              {isExecutionReady ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Executed Ready
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <Briefcase className="h-4 w-4" /> Pending Execution Gate
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Consumable by Phases 11–14</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Allocation Table */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-700" />
              <CardTitle className="text-base font-semibold text-slate-900">Allocated Project Resources</CardTitle>
            </div>
            <Badge variant="outline">{allocations.length} Employees Allocated</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Project Role</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3 text-center">Allocation %</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.length > 0 ? (
                allocations.map((a) => (
                  <tr key={a.id}>
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {a.Employee?.name}
                      <span className="block text-xs font-mono text-slate-500">{a.Employee?.employeeCode}</span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-800">{a.projectRole || "Team Member"}</td>
                    <td className="px-6 py-3.5 text-slate-600">{a.Department?.name || "General"}</td>
                    <td className="px-6 py-3.5 text-center font-mono font-semibold text-indigo-600">{a.allocationPercent}%</td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">{a.status}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No resource allocations created for this project yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
