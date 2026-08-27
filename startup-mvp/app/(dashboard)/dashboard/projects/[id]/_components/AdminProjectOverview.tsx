import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FiClock, FiUsers, FiDollarSign, FiCheckCircle, FiTarget, FiCalendar } from "react-icons/fi";
import { format } from "date-fns";

export function AdminProjectOverview({ project, tasks }: { project: any; tasks: any[] }) {
    // 1. Core aggregates (Issues and Tasks)
    const allIssues: any[] = [];
    project.Milestones?.forEach((m: any) => {
        if (m.Issues) {
            allIssues.push(...m.Issues);
        }
    });

    const totalIssuesCount = allIssues.length;
    const completedIssuesCount = allIssues.filter((i: any) => i.status === "COMPLETED" || i.status === "CLOSED").length;

    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter((t: any) => t.status === "COMPLETED" || t.status === "completed" || t.status === "done").length;

    const totalItems = totalIssuesCount + totalTasksCount;
    const completedItems = completedIssuesCount + completedTasksCount;
    const projectProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // 2. Budget Usage
    const totalBudget = project.budget || 0;
    const spentBudget = project.totalCost || 0;
    const budgetPercent = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;

    // 3. Delayed Tasks
    const delayedTasks = tasks.filter(t => t.status !== "COMPLETED" && t.status !== "completed" && t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date());
    
    // 4. Project Health & Risk
    const healthStatus = delayedTasks.length > 5 ? "At Risk" : delayedTasks.length > 0 ? "Needs Attention" : "On Track";
    const healthColor = healthStatus === "On Track" 
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
        : healthStatus === "Needs Attention" 
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

    // 5. Team Contributions based on task assignment
    const memberCounts: Record<string, number> = {};
    tasks.forEach((t: any) => {
        const name = t.Assignee?.name || "Unassigned";
        memberCounts[name] = (memberCounts[name] || 0) + 1;
    });

    const teamContributions = Object.keys(memberCounts).length > 0
        ? Object.entries(memberCounts).map(([name, count]) => ({
            name,
            value: Math.round((count / (tasks.length || 1)) * 100),
            count
          })).sort((a, b) => b.value - a.value)
        : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-sm">
            
            {/* Top Row: Master Progress & Health Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Overall Progress Block */}
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Project Progress</span>
                            <span className="text-xl font-black text-primary font-mono">{Math.round(projectProgress)}%</span>
                        </div>
                        <Progress value={projectProgress} className="h-2.5 bg-muted [&>div]:bg-indigo-500 transition-all rounded-full" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/50 pt-4 mt-4 font-medium">
                        <span>{completedTasksCount} of {totalTasksCount} tasks completed</span>
                        <span>{completedIssuesCount} of {totalIssuesCount} issues resolved</span>
                    </div>
                </Card>

                {/* Status & Date Scope Banner */}
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Health</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${healthColor}`}>
                            {healthStatus}
                        </span>
                    </div>
                    <div className="space-y-2 mt-4 pt-4 border-t border-border/50 text-xs">
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="flex items-center gap-1.5"><FiCalendar className="w-3.5 h-3.5" /> Start Date</span>
                            <span className="font-bold text-foreground">
                                {project.startDate ? format(new Date(project.startDate), "MMM dd, yyyy") : "Not Set"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="flex items-center gap-1.5"><FiTarget className="w-3.5 h-3.5" /> Target End</span>
                            <span className="font-bold text-foreground">
                                {project.endDate ? format(new Date(project.endDate), "MMM dd, yyyy") : "Not Set"}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Key Performance Indicators (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Financial KPI */}
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project Costing</span>
                        <FiDollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-foreground">${spentBudget.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground font-semibold">of ${totalBudget.toLocaleString()}</span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-muted-foreground">Budget Spent</span>
                            <span className={budgetPercent > 90 ? "text-rose-500" : "text-emerald-600"}>{budgetPercent.toFixed(1)}%</span>
                        </div>
                        <Progress value={budgetPercent} className={`h-1.5 ${budgetPercent > 90 ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500"}`} />
                    </div>
                </Card>

                {/* Tasks Delivery KPI */}
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tasks Scope</span>
                        <FiCheckCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-foreground">{completedTasksCount}</span>
                        <span className="text-xs text-muted-foreground font-semibold">of {totalTasksCount} tasks closed</span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-muted-foreground">Completion Rate</span>
                            <span className="text-blue-500">{totalTasksCount > 0 ? ((completedTasksCount / totalTasksCount) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <Progress value={totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0} className="h-1.5 [&>div]:bg-blue-500" />
                    </div>
                </Card>

                {/* Milestones Target KPI */}
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Milestones</span>
                        <FiTarget className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-foreground">
                            {project.Milestones?.filter((m: any) => m.status === "COMPLETED" || m.status === "completed").length || 0}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">of {project.Milestones?.length || 0} milestones</span>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="text-indigo-500">
                                {project.Milestones?.length > 0 ? (((project.Milestones.filter((m: any) => m.status === "COMPLETED" || m.status === "completed").length) / project.Milestones.length) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <Progress value={project.Milestones?.length > 0 ? ((project.Milestones.filter((m: any) => m.status === "COMPLETED" || m.status === "completed").length) / project.Milestones.length) * 100 : 0} className="h-1.5 [&>div]:bg-indigo-500" />
                    </div>
                </Card>
            </div>

            {/* Detailed Analytics Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left: Team Contributions Progress list */}
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                    <CardHeader className="p-0 pb-4 border-b border-border/50">
                        <span className="text-sm font-extrabold flex items-center gap-2 uppercase tracking-wide text-foreground">
                            <FiUsers className="w-4 h-4 text-primary" /> Team Work Allocation
                        </span>
                    </CardHeader>
                    <CardContent className="p-0 pt-4 flex-1">
                        {teamContributions.length > 0 ? (
                            <div className="space-y-4">
                                {teamContributions.slice(0, 5).map((member, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-foreground">{member.name}</span>
                                            <span className="text-muted-foreground font-mono">{member.count} tasks ({member.value}%)</span>
                                        </div>
                                        <Progress value={member.value} className="h-1.5 bg-muted [&>div]:bg-blue-500" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-xs italic">
                                No task allocation logged for team members.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Delayed/Overdue Tasks actionable details */}
                <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                    <CardHeader className="p-0 pb-4 border-b border-border/50 flex flex-row items-center justify-between">
                        <span className="text-sm font-extrabold flex items-center gap-2 uppercase tracking-wide text-foreground">
                            <FiClock className="w-4 h-4 text-rose-500" /> Delayed Tasks
                        </span>
                        <Badge variant="destructive" className="rounded-full w-5 h-5 flex items-center justify-center p-0 text-xs font-mono">
                            {delayedTasks.length}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0 pt-4 flex-1">
                        {delayedTasks.length > 0 ? (
                            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                {delayedTasks.slice(0, 5).map(task => (
                                    <div key={task.id} className="p-2.5 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition duration-200 flex justify-between items-center gap-4">
                                        <div className="min-w-0 flex-1 leading-tight">
                                            <p className="font-semibold text-xs text-foreground truncate" title={task.title}>{task.title}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Assignee: <strong className="text-foreground">{task.Assignee?.name || "Unassigned"}</strong>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/25">
                                                {format(new Date(task.dueDate), "MMM dd")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                                <FiCheckCircle className="w-8 h-8 text-emerald-400 mb-2 opacity-50" />
                                <p className="text-xs font-bold text-foreground">No delayed tasks!</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Everything is running perfectly on schedule.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
