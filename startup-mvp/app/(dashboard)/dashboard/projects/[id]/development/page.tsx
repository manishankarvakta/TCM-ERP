import React from "react";
import Link from "next/link";
import { getProjectDevelopmentOperations } from "@/app/actions/crm/development-operations.action";
import { getProjectPlanning } from "@/app/actions/crm/project-management.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Code2,
  Terminal,
  GitBranch,
  Layers,
  Sparkles,
  UserCheck,
  Cpu,
  FileCode,
  ShieldCheck,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDevelopmentPage({ params }: PageProps) {
  const { id } = await params;
  const { success: prjSuccess, project, error: prjError } = await getProjectPlanning(id);
  const devOps = await getProjectDevelopmentOperations(id);

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
          <span>{prjError || "Project development operations data not found"}</span>
        </div>
      </div>
    );
  }

  const isDevReady = devOps.developmentExecutionReadyAt != null;
  const isHandoffReady = devOps.developmentCompletedAt != null;
  const plans = devOps.plans || [];
  const workstreams = devOps.workstreams || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/dashboard/projects/${id}/planning`}>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Planning
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Code2 className="h-6 w-6 text-blue-600" />
              Software Engineering Operations: {project.title}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Technical Architecture, Frontend/Backend Workstreams, Code Review, Build Tracking, and QA Handoff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHandoffReady ? (
            <Badge className="bg-emerald-600 text-white gap-1 px-3 py-1.5 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> QA Handoff Ready
            </Badge>
          ) : isDevReady ? (
            <Badge className="bg-blue-600 text-white gap-1 px-3 py-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Development Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 px-3 py-1.5 text-sm font-semibold">
              <AlertCircle className="h-4 w-4" /> Requirement: {devOps.developmentWorkRequirement || "NOT_REQUIRED"}
            </Badge>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-blue-600" /> Requirement Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {devOps.developmentWorkRequirement || "NOT_REQUIRED"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Phase 13 Development Gate
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="h-4 w-4 text-indigo-600" /> Technical Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {plans.length} Plan(s)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Architecture & Repos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-sky-100 bg-sky-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-sky-600" /> Workstreams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {workstreams.length} Workstream(s)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Frontend / Backend / API / DB
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Code Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {workstreams.filter(w => w.codeReviewStatus === "APPROVED").length} Approved
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Code Quality Verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workstreams Inventory */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Terminal className="h-5 w-5 text-blue-600" /> Development Workstreams & Deliverables
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {workstreams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-3">
              <GitBranch className="h-10 w-10 mx-auto text-slate-300" />
              <p className="font-medium text-slate-600">No Development Workstreams recorded for this project yet.</p>
              <p className="text-xs text-slate-400">
                Create a Technical Plan and Workstreams to track Frontend, Backend, API, and Database development.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workstreams.map((ws) => (
                <div key={ws.id} className="p-4 rounded-lg border bg-white shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{ws.name}</span>
                      <Badge variant="outline" className="text-xs font-medium uppercase">
                        {ws.type}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {ws.status}
                      </Badge>
                      {ws.codeReviewStatus !== "NOT_REQUIRED" && (
                        <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50 text-xs">
                          CR: {ws.codeReviewStatus}
                        </Badge>
                      )}
                    </div>
                    {ws.AssignedEmployee && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" /> {ws.AssignedEmployee.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
