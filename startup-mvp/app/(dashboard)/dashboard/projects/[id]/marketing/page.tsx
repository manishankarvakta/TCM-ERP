import React from "react";
import Link from "next/link";
import { getProjectMarketingOperations, markProjectReadyForMarketingExecution, markMarketingHandoffReady } from "@/app/actions/crm/marketing-operations.action";
import { getProjectPlanning } from "@/app/actions/crm/project-management.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Target,
  BarChart2,
  Calendar,
  Layers,
  Sparkles,
  UserCheck,
  TrendingUp,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectMarketingPage({ params }: PageProps) {
  const { id } = await params;
  const { success: prjSuccess, project, error: prjError } = await getProjectPlanning(id);
  const mktOps = await getProjectMarketingOperations(id);

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
          <span>{prjError || "Project marketing operations data not found"}</span>
        </div>
      </div>
    );
  }

  const isMarketingReady = mktOps.marketingExecutionReadyAt != null;
  const isHandoffReady = mktOps.marketingCompletedAt != null;
  const plans = mktOps.plans || [];
  const campaigns = mktOps.campaigns || [];

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
              <Megaphone className="h-6 w-6 text-purple-600" />
              Marketing Operations: {project.title}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Manage Digital Marketing, SEO, SEM, Social Media, Content Campaigns, and Performance Reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHandoffReady ? (
            <Badge className="bg-emerald-600 text-white gap-1 px-3 py-1.5 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Marketing Handoff Ready
            </Badge>
          ) : isMarketingReady ? (
            <Badge className="bg-purple-600 text-white gap-1 px-3 py-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Marketing Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 px-3 py-1.5 text-sm font-semibold">
              <AlertCircle className="h-4 w-4" /> Requirement: {mktOps.marketingWorkRequirement || "NOT_REQUIRED"}
            </Badge>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-purple-100 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-4 w-4 text-purple-600" /> Requirement Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {mktOps.marketingWorkRequirement || "NOT_REQUIRED"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Phase 12 Marketing Gate State
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" /> Marketing Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {plans.length} Strategy Plan(s)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active Target Plans
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-indigo-600" /> Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {campaigns.length} Campaign(s)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              SEO / SEM / Social / Content
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-800">
              {campaigns.reduce((acc, c) => acc + (c.PerformanceSnapshots?.length || 0), 0)} Snapshots
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              0 Accounting Delta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Inventory */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-purple-600" /> Marketing Campaigns & Workstreams
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-3">
              <Megaphone className="h-10 w-10 mx-auto text-slate-300" />
              <p className="font-medium text-slate-600">No Marketing Campaigns recorded for this project yet.</p>
              <p className="text-xs text-slate-400">
                Create a Marketing Plan and Campaign to start tracking digital marketing, SEO, and paid ad execution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-4 rounded-lg border bg-white shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{camp.name}</span>
                      <Badge variant="outline" className="text-xs font-medium uppercase">
                        {camp.campaignType}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        {camp.status}
                      </Badge>
                    </div>
                    {camp.AssignedEmployee && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-purple-600" /> {camp.AssignedEmployee.name}
                      </span>
                    )}
                  </div>
                  {camp.objective && (
                    <p className="text-xs text-slate-600 line-clamp-2">{camp.objective}</p>
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
