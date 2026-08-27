"use client";

import { useEffect, useState } from "react";
import { getTeamMembersWorkSummary } from "@/app/actions/projects/work-management-team.action";
import { getAllIssues, getAllMilestones } from "@/app/actions/projects/project.action";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  AlertTriangle,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Loader2,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const getSessionStatusDetails = (status: string) => {
  const s = status?.toUpperCase();
  switch (s) {
    case "WORKING":
      return {
        label: "Working",
        bg: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30",
        dot: "bg-blue-500 animate-pulse",
      };
    case "ON BREAK":
      return {
        label: "On Break",
        bg: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30",
        dot: "bg-amber-500",
      };
    case "COMPLETED":
      return {
        label: "Ended",
        bg: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30",
        dot: "bg-emerald-500",
      };
    default:
      return {
        label: "Not Started",
        bg: "bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30",
        dot: "bg-slate-400",
      };
  }
};

const getIssuePriorityDetails = (priority: string) => {
  const p = priority?.toUpperCase();
  switch (p) {
    case "CRITICAL":
    case "URGENT":
      return {
        label: "Urgent",
        bg: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200/65 dark:border-rose-900/30",
        dot: "bg-rose-500",
      };
    case "HIGH":
      return {
        label: "High",
        bg: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/65 dark:border-amber-900/30",
        dot: "bg-amber-500",
      };
    case "MEDIUM":
      return {
        label: "Medium",
        bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200/65 dark:border-blue-900/30",
        dot: "bg-blue-500",
      };
    default:
      return {
        label: "Low",
        bg: "bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-200/65 dark:border-slate-800/30",
        dot: "bg-slate-400",
      };
  }
};

const getIssueStatusDetails = (status: string) => {
  const s = status?.toUpperCase();
  switch (s) {
    case "OPEN":
    case "TODO":
      return {
        label: "Open",
        bg: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30",
      };
    case "IN_PROGRESS":
    case "ACTIVE":
      return {
        label: "In Progress",
        bg: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30",
      };
    case "RESOLVED":
    case "COMPLETED":
      return {
        label: "Resolved",
        bg: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30",
      };
    default:
      return {
        label: "Closed",
        bg: "bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30",
      };
  }
};

export default function OperationsCenter() {
  const [loading, setLoading] = useState(true);
  const [teamSummary, setTeamSummary] = useState<any[]>([]);
  const [issuesList, setIssuesList] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("team");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamRes, issuesRes, milestonesRes] = await Promise.all([
        getTeamMembersWorkSummary(),
        getAllIssues("all"),
        getAllMilestones("all"),
      ]);

      if (teamRes.success && teamRes.team) {
        setTeamSummary(teamRes.team);
      }
      if (issuesRes.success && issuesRes.issues) {
        setIssuesList(issuesRes.issues);
      }
      if (milestonesRes.success && milestonesRes.milestones) {
        setMilestonesList(milestonesRes.milestones);
      }
    } catch (err) {
      console.error("Operations Center load error:", err);
      toast.error("Failed to load operations control telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatActiveTime = (timeMs: number) => {
    const totalSec = Math.floor(timeMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    return `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`;
  };

  // Filter items based on active tab search query
  const getFilteredTeam = () => {
    return teamSummary.filter(
      (t) =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.currentTask?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredIssues = () => {
    return issuesList.filter(
      (i) =>
        i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.issueNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.Milestone?.Project?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredMilestones = () => {
    return milestonesList.filter(
      (m) =>
        m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.Project?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80 w-full border border-dashed rounded-2xl bg-card">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Gathering operations workspace telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Search and Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-2.5">
        
        {/* Search */}
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
          <input
            type="text"
            placeholder={
              activeTab === "team" ? "Search team by name, focus..." :
              activeTab === "issues" ? "Search issues by title, number..." : "Search milestones..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border/85 rounded-full py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm transition-all duration-200"
          />
        </div>

        {/* Console title */}
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Operations Control Board</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(""); }} className="space-y-4">
        
        <div className="flex justify-between items-center">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="team" className="rounded-lg text-xs font-bold gap-2">
              <Users className="h-3.5 w-3.5" /> Team Monitor
            </TabsTrigger>
            <TabsTrigger value="issues" className="rounded-lg text-xs font-bold gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Critical Issues
            </TabsTrigger>
            <TabsTrigger value="milestones" className="rounded-lg text-xs font-bold gap-2">
              <Calendar className="h-3.5 w-3.5" /> Milestones
            </TabsTrigger>
          </TabsList>

          <Button size="sm" onClick={fetchData} variant="outline" className="text-xs font-semibold h-8 rounded-lg">
            Refresh Monitor
          </Button>
        </div>

        {/* Tab 1: Team Work Session Status Monitor */}
        <TabsContent value="team" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredTeam().length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed rounded-2xl bg-card text-muted-foreground text-xs italic">
                No active team members matching query.
              </div>
            ) : (
              getFilteredTeam().map((emp) => {
                const statusDetails = getSessionStatusDetails(emp.status);
                return (
                  <Card key={emp.id} className="border border-border/60 hover:shadow-md hover:border-violet-500/35 transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between">
                    
                    {/* Card Header Profile */}
                    <div className="p-4 border-b border-border/40 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border shadow-xs">
                          <AvatarImage src={emp.user?.image} />
                          <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                            {emp.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{emp.name}</h4>
                          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">{emp.role || "Developer"}</p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <Badge variant="outline" className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg flex items-center gap-1.5 ${statusDetails.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dot}`} />
                        {statusDetails.label}
                      </Badge>
                    </div>

                    {/* Task Info & Active duration */}
                    <div className="p-4 flex-1 space-y-4">
                      
                      {/* Active Task */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Current Task Context</span>
                        <p className="text-xs font-semibold text-foreground leading-normal truncate">
                          {emp.currentTask ? emp.currentTask.title : "No active task context"}
                        </p>
                        {emp.currentTask?.projectName && (
                          <span className="inline-block bg-secondary text-secondary-foreground border border-border text-[8px] font-bold px-1.5 rounded uppercase mt-0.5">
                            {emp.currentTask.projectName}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3 text-[11px]">
                        <div>
                          <span className="text-muted-foreground font-semibold">Active Hours today</span>
                          <p className="font-mono font-bold text-foreground mt-0.5">{formatActiveTime(emp.activeTimeMs)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">Completed today</span>
                          <p className="font-bold text-foreground mt-0.5">{emp.completedCount || 0} items</p>
                        </div>
                      </div>

                    </div>

                    {/* Card Footer Link */}
                    <div className="bg-muted/10 p-3 px-4 border-t border-border/40 flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground">
                      <span>Workspace Viewport</span>
                      <Link href={`/dashboard/work-management/team/${emp.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        Monitor <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Critical Project Issues board */}
        <TabsContent value="issues" className="space-y-4 outline-none">
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-6 w-24">Issue</th>
                    <th className="p-4">Title</th>
                    <th className="p-4 w-32">Priority</th>
                    <th className="p-4 w-36">Project</th>
                    <th className="p-4 w-40">Assignee</th>
                    <th className="p-4 w-32 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/65">
                  {getFilteredIssues().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground italic text-xs">
                        No active issues found matching query.
                      </td>
                    </tr>
                  ) : (
                    getFilteredIssues().map((issue) => {
                      const priority = getIssuePriorityDetails(issue.priority);
                      const status = getIssueStatusDetails(issue.status);
                      const projectTitle = issue.Milestone?.Project?.title || "Independent";
                      return (
                        <tr key={issue.id} className="hover:bg-muted/20 transition-colors">
                          
                          {/* Issue ID */}
                          <td className="p-4 pl-6 font-mono font-bold text-muted-foreground">
                            {issue.issueNumber || `#${issue.id.slice(-4).toUpperCase()}`}
                          </td>

                          {/* Issue Title */}
                          <td className="p-4 font-bold text-foreground">
                            {issue.title}
                          </td>

                          {/* Priority Badge */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${priority.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
                              {priority.label}
                            </span>
                          </td>

                          {/* Project title */}
                          <td className="p-4 font-semibold text-muted-foreground">
                            {projectTitle}
                          </td>

                          {/* Assignee Avatar */}
                          <td className="p-4">
                            {issue.Assignee ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5.5 w-5.5 border shadow-xs">
                                  <AvatarImage src={issue.Assignee.image} />
                                  <AvatarFallback className="text-[8px] bg-primary text-primary-foreground font-bold">
                                    {issue.Assignee.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-foreground truncate max-w-[100px]">
                                  {issue.Assignee.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic font-semibold">Unassigned</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-4 pr-6">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-extrabold uppercase ${status.bg}`}>
                              {status.label}
                            </span>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Unified Milestone Tracker */}
        <TabsContent value="milestones" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredMilestones().length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed rounded-2xl bg-card text-muted-foreground text-xs italic">
                No project milestones found matching query.
              </div>
            ) : (
              getFilteredMilestones().map((m) => {
                const totalIssues = m.Issues?.length || 0;
                const completedIssues = m.Issues?.filter((i: any) => ["CLOSED", "COMPLETED", "RESOLVED", "DONE"].includes(i.status?.toUpperCase())).length || 0;
                const progressPercentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;
                
                return (
                  <Card key={m.id} className="border border-border/60 hover:shadow-md hover:border-violet-500/35 transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between">
                    
                    {/* Header */}
                    <div className="p-4 border-b border-border/40 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-primary tracking-wider">Milestone Deadline</span>
                      <h4 className="text-xs font-bold text-foreground leading-normal truncate">{m.title}</h4>
                      {m.Project && (
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">
                          Project: {m.Project.title}
                        </p>
                      )}
                    </div>

                    {/* Progress Content */}
                    <div className="p-4 space-y-4">
                      
                      {/* Dates */}
                      <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground">
                        <span>Target Due Date:</span>
                        <span className="text-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {m.dueDate ? new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                        </span>
                      </div>

                      {/* Metrics details */}
                      <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3 text-[11px]">
                        <div>
                          <span className="text-muted-foreground font-semibold">Active Issues</span>
                          <p className="font-bold text-foreground mt-0.5">{totalIssues} bugs</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">Milestone Status</span>
                          <p className="font-extrabold text-foreground mt-0.5 uppercase tracking-wide text-[10px]">{m.status.toLowerCase()}</p>
                        </div>
                      </div>

                      {/* Dynamic Progress Bar */}
                      {totalIssues > 0 && (
                        <div className="space-y-1.5 border-t border-border/40 pt-3">
                          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                            <span>Task Progress:</span>
                            <span className="text-violet-600 font-extrabold">{completedIssues}/{totalIssues} ({progressPercentage}%)</span>
                          </div>
                          <Progress value={progressPercentage} className="h-1.5 bg-muted/50" indicatorClassName="bg-violet-600" />
                        </div>
                      )}

                    </div>

                    {/* Card Footer Link to project */}
                    <div className="bg-muted/10 p-3 px-4 border-t border-border/40 flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground">
                      <span>Project Timeline</span>
                      <Link href={`/dashboard/projects/${m.projectId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        Timeline <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

      </Tabs>
      
    </div>
  );
}
