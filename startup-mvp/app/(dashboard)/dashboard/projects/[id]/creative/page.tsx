import React from "react";
import Link from "next/link";
import { getProjectCreativeOperations, markProjectReadyForCreativeExecution, markCreativeHandoffReady } from "@/app/actions/crm/creative-operations.action";
import { getProjectPlanning } from "@/app/actions/crm/project-management.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Palette,
  FileText,
  Layers,
  Sparkles,
  UserCheck,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectCreativePage({ params }: PageProps) {
  const { id } = await params;
  const { success: prjSuccess, project, error: prjError } = await getProjectPlanning(id);
  const creativeOps = await getProjectCreativeOperations(id);

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
          <span>{prjError || "Project creative operations data not found"}</span>
        </div>
      </div>
    );
  }

  const isCreativeReady = creativeOps.creativeExecutionReadyAt != null;
  const isHandoffReady = creativeOps.creativeCompletedAt != null;
  const briefs = creativeOps.briefs || [];
  const deliverables = creativeOps.deliverables || [];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/projects/${id}/planning`}>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Project Planning
          </Button>
        </Link>
        <Link href={`/dashboard/projects/${id}/resources`}>
          <Button variant="outline" size="sm" className="gap-2">
            View Resource Allocations
          </Button>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{project.projectNumber || project.title}</h1>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 gap-1">
              <Palette className="h-3 w-3" /> Creative Operations
            </Badge>
            {isHandoffReady ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Creative Handoff Ready
              </Badge>
            ) : isCreativeReady ? (
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 gap-1">
                <Sparkles className="h-3 w-3" /> Ready for Creative Execution
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> Execution Gate Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Creative / UI / UX / Design Deliverables & Revision Management (Phase 11)</p>
        </div>

        {/* Gate Actions */}
        <div className="flex items-center gap-3">
          {!isCreativeReady && (
            <form action={async () => {
              "use server";
              await markProjectReadyForCreativeExecution(project.id);
            }}>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-medium gap-2">
                <Sparkles className="h-4 w-4" />
                Mark Ready for Creative Execution
              </Button>
            </form>
          )}

          {isCreativeReady && !isHandoffReady && (
            <form action={async () => {
              "use server";
              await markCreativeHandoffReady(project.id);
            }}>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mark Creative Handoff Ready
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Requirement State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">{creativeOps.creativeWorkRequirement || "NOT_REQUIRED"}</div>
            <p className="text-xs text-slate-500 mt-0.5">Canonical Project classification</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Creative Briefs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{briefs.length}</div>
            <p className="text-xs text-slate-500 mt-0.5">{briefs.filter((b) => b.status === "APPROVED").length} approved brief(s)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{deliverables.length}</div>
            <p className="text-xs text-slate-500 mt-0.5">{deliverables.filter((d) => d.status === "APPROVED" || d.status === "COMPLETED").length} approved deliverable(s)</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {deliverables.filter((d) => d.status === "SUBMITTED_FOR_REVIEW").length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Awaiting internal/client review</p>
          </CardContent>
        </Card>
      </div>

      {/* Creative Brief Section */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" /> Creative Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {briefs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-medium text-slate-700">No Creative Brief created yet</p>
              <p className="text-xs text-slate-500 mt-1">Create a structured brief after marking project ready for Creative execution.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {briefs.map((brief) => (
                <div key={brief.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-base">{brief.title} ({brief.briefNumber})</span>
                    <Badge variant={brief.status === "APPROVED" ? "default" : "secondary"}>
                      {brief.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{brief.objective}</p>
                  {brief.brandGuidelines && (
                    <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-200">
                      <strong>Brand Guidelines:</strong> {brief.brandGuidelines}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>Created by {brief.CreatedBy?.name || "User"}</span>
                    {brief.approvedAt && <span>Approved on {new Date(brief.approvedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deliverables List */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" /> Design Deliverables & Revisions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {deliverables.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Layers className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-medium text-slate-700">No Creative Deliverables found</p>
              <p className="text-xs text-slate-500 mt-1">Design deliverables can be assigned to designers with valid Phase 10 resource allocations.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {deliverables.map((deliv) => (
                <div key={deliv.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">{deliv.title}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {deliv.deliverableType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        deliv.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                        deliv.status === "SUBMITTED_FOR_REVIEW" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                      }>
                        {deliv.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      Designer: {deliv.AssignedEmployee ? `${deliv.AssignedEmployee.name} (${deliv.AssignedEmployee.employeeCode})` : "Unassigned"}
                    </span>
                    {deliv.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Due: {new Date(deliv.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {deliv.Task && (
                      <span className="flex items-center gap-1 text-indigo-600">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Task: {deliv.Task.title}
                      </span>
                    )}
                  </div>

                  {/* Versions History */}
                  {deliv.Versions && deliv.Versions.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 mt-2">
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Version History ({deliv.Versions.length} versions)</div>
                      <div className="space-y-1">
                        {deliv.Versions.map((ver) => (
                          <div key={ver.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none">
                            <span className="font-medium text-slate-800">Version v{ver.versionNumber} ({new Date(ver.createdAt).toLocaleDateString()})</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">Review: {ver.internalReviewStatus}</Badge>
                              {ver.File && <span className="text-indigo-600 hover:underline">{ver.File.name}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
