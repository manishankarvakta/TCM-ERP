import React from "react";
import Link from "next/link";
import { getProjectPlanning, markProjectReadyForResourcePlanning } from "@/app/actions/crm/project-management.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FolderPlus,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  User,
  Users,
  Target,
  ListTodo,
  Sparkles,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPlanningPage({ params }: PageProps) {
  const { id } = await params;
  const { success, project, error } = await getProjectPlanning(id);

  if (!success || !project) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link href="/dashboard/crm/project-handovers">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Handovers
          </Button>
        </Link>
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{error || "Project planning data not found"}</span>
        </div>
      </div>
    );
  }

  const handover = project.Handovers && project.Handovers.length > 0 ? project.Handovers[0] : null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div>
        <Link href="/dashboard/crm/project-handovers">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Sales-to-Project Handovers
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
            {project.resourcePlanningReadyAt && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready for Resource Planning
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{project.title}</p>
        </div>

        {/* Business Gate Action */}
        <div>
          {!project.resourcePlanningReadyAt && (
            <form action={async () => {
              "use server";
              await markProjectReadyForResourcePlanning(project.id);
            }}>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                <Sparkles className="h-4 w-4" />
                Mark Ready for Resource Planning
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Planning Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Commercial Handover Traceability */}
          {handover && (
            <Card className="border-indigo-100 shadow-sm bg-indigo-50/30">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base font-semibold text-slate-900">Commercial Source Handover</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Handover Ref</p>
                    <p className="font-mono font-semibold text-indigo-600 mt-0.5">{handover.handoverNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Sale Ref</p>
                    <p className="font-mono font-semibold text-slate-800 mt-0.5">{handover.sourceServiceSaleNumberSnapshot}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Scope Summary</p>
                  <p className="text-slate-800 mt-0.5">{handover.deliveryScopeSummary || "Commercial scope transferred into project operations."}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestones Structure */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-slate-700" />
                  <CardTitle className="text-base font-semibold text-slate-900">Delivery Milestones</CardTitle>
                </div>
                <Badge variant="outline">{project.Milestones?.length || 0} Milestones</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Milestone</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Tasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.Milestones && project.Milestones.length > 0 ? (
                    project.Milestones.map((m) => (
                      <tr key={m.id}>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{m.title}</td>
                        <td className="px-6 py-3.5 text-slate-600">{m.Department?.name || "General"}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700">{m.status}</Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-800">
                          {m.Tasks?.length || 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No delivery milestones defined yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Planned Tasks */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-slate-700" />
                  <CardTitle className="text-base font-semibold text-slate-900">Planned Workstream Tasks</CardTitle>
                </div>
                <Badge variant="outline">{project.Tasks?.length || 0} Tasks</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Task Title</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.Tasks && project.Tasks.length > 0 ? (
                    project.Tasks.map((t) => (
                      <tr key={t.id}>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{t.title}</td>
                        <td className="px-6 py-3.5 text-slate-600">{t.Department?.name || "General"}</td>
                        <td className="px-6 py-3.5 capitalize text-slate-600">{t.priority}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700">{t.status}</Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No planned tasks created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Project Metadata</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</p>
                <p className="font-semibold text-slate-900 mt-0.5">{project.Client?.name || project.Client?.company}</p>
                <p className="text-xs text-slate-500 font-mono">{project.Client?.clientCode}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Manager</p>
                <p className="font-medium text-slate-800 mt-0.5">{project.ProjectManager?.name || "Not Assigned"}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Department</p>
                <p className="font-medium text-slate-800 mt-0.5">{project.Department?.name || "General Delivery"}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Health</p>
                <Badge className="bg-emerald-100 text-emerald-800 font-semibold mt-1">
                  {project.health || "ON_TRACK"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
