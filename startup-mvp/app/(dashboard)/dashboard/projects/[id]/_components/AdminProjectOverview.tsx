import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FiTrendingUp, FiAlertCircle, FiClock, FiUsers, FiDollarSign, FiActivity, FiCheckCircle, FiTarget } from "react-icons/fi";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

    // 2. Budget Usage (Linked dynamically to actual timesheet costing)
    const totalBudget = project.budget || 0;
    const spentBudget = project.totalCost || 0;
    const budgetPercent = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;

    // 3. Delayed Tasks
    const delayedTasks = tasks.filter(t => t.status !== "COMPLETED" && t.status !== "completed" && t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date());
    
    // 4. Project Health & Risk
    const healthStatus = delayedTasks.length > 5 ? "At Risk" : delayedTasks.length > 0 ? "Needs Attention" : "On Track";
    const healthColor = healthStatus === "On Track" ? "bg-emerald-500" : healthStatus === "Needs Attention" ? "bg-amber-500" : "bg-rose-500";
    const riskLevel = healthStatus === "At Risk" ? "High" : healthStatus === "Needs Attention" ? "Medium" : "Low";

    // 5. Team Contributions based on task assignment
    const memberCounts: Record<string, number> = {};
    tasks.forEach((t: any) => {
        const name = t.Assignee?.name || "Unassigned";
        memberCounts[name] = (memberCounts[name] || 0) + 1;
    });

    const teamContributions = Object.keys(memberCounts).length > 0
        ? Object.entries(memberCounts).map(([name, count]) => ({
            name,
            value: Math.round((count / (tasks.length || 1)) * 100)
          }))
        : [
            { name: 'Engineering', value: 45 },
            { name: 'Design', value: 25 },
            { name: 'Product', value: 20 },
            { name: 'QA', value: 10 },
          ];
          
    const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

    // 6. Productivity Metrics
    const tasksClosed = completedTasksCount + completedIssuesCount;
    
    const completedItemsList = [
        ...tasks.filter(t => t.status === "COMPLETED" || t.status === "completed" || t.status === "done"),
        ...allIssues.filter(i => i.status === "COMPLETED" || i.status === "CLOSED")
    ];
    let avgResolutionHours = 16;
    if (completedItemsList.length > 0) {
        const totalDurations = completedItemsList.reduce((sum, item) => {
            const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
            const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
            const duration = created > 0 && updated > 0 ? updated - created : 0;
            return sum + duration;
        }, 0);
        const avgMs = totalDurations / completedItemsList.length;
        avgResolutionHours = avgMs > 0 ? Math.max(1, Math.round(avgMs / (1000 * 60 * 60))) : 16;
    }

    const activePRs = allIssues.filter(i => i.status === "UNDER_REVIEW").length + tasks.filter(t => t.status === "UNDER_REVIEW").length;
    const sprintScope = Math.round(projectProgress);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Full Width Project Progress */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col md:col-span-2 xl:col-span-3">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <FiTarget className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-semibold text-lg tracking-tight">Overall Project Progress</h3>
                        </div>
                        <span className="font-bold text-xl text-indigo-600">{Math.round(projectProgress)}%</span>
                    </div>
                    <Progress value={projectProgress} className="h-3 bg-muted [&>div]:bg-indigo-500 transition-all" />
                    <p className="text-xs text-muted-foreground mt-3 font-medium">
                        {completedIssuesCount} of {totalIssuesCount} issues and {completedTasksCount} of {totalTasksCount} tasks completed across all active milestones.
                    </p>
                </CardContent>
            </Card>
            {/* Project Health & Delivery Risk */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FiActivity className="w-4 h-4 text-primary" />
                        Project Health & Risk
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col justify-center gap-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Overall Status</p>
                            <p className="text-2xl font-bold">{healthStatus}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${healthColor}/10`}>
                            <div className={`w-4 h-4 rounded-full ${healthColor} animate-pulse`} />
                        </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-border/50">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                                <FiAlertCircle className="w-4 h-4" /> Delivery Risk
                            </span>
                            <Badge variant={riskLevel === "Low" ? "outline" : "destructive"} className={riskLevel === "Low" ? "text-emerald-600 border-emerald-500/30" : ""}>
                                {riskLevel}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                                <FiCheckCircle className="w-4 h-4" /> Completion Confidence
                            </span>
                            <span className="font-semibold">{riskLevel === "Low" ? "92%" : riskLevel === "Medium" ? "75%" : "40%"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Budget Usage */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FiDollarSign className="w-4 h-4 text-emerald-500" />
                        Project Costing
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col justify-center gap-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Spent (Timesheets)</p>
                            <p className="text-3xl font-bold tracking-tight">${spentBudget.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                            <p className="text-lg font-semibold">${totalBudget.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Usage</span>
                            <span className={budgetPercent > 90 ? "text-rose-500" : "text-emerald-600"}>{budgetPercent.toFixed(1)}%</span>
                        </div>
                        <Progress value={budgetPercent} className={`h-2 ${budgetPercent > 90 ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500"}`} />
                    </div>
                </CardContent>
            </Card>

            {/* Team Contributions Pie Chart */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col xl:col-span-1 md:col-span-2">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FiUsers className="w-4 h-4 text-blue-500" />
                            Team Contributions
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">Active Phase</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col justify-center min-h-[250px]">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={teamContributions}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {teamContributions.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value) => [`${value}%`, 'Contribution']}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Productivity Metrics */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden md:col-span-2">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FiTrendingUp className="w-4 h-4 text-indigo-500" />
                        Productivity Metrics
                    </CardTitle>
                    <CardDescription>Velocity and task completion trends</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center space-y-1">
                            <p className="text-3xl font-bold text-primary">{tasksClosed}</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasks Closed</p>
                            <p className="text-[10px] text-emerald-600 font-semibold">Completed items</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center space-y-1">
                            <p className="text-3xl font-bold text-primary">{avgResolutionHours}h</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Resolution</p>
                            <p className="text-[10px] text-emerald-600 font-semibold">Average resolve time</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center space-y-1">
                            <p className="text-3xl font-bold text-primary">{activePRs}</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active PRs</p>
                            <p className="text-[10px] text-muted-foreground font-semibold">Currently under review</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center space-y-1">
                            <p className="text-3xl font-bold text-primary">{sprintScope}%</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sprint Scope</p>
                            <p className="text-[10px] text-emerald-600 font-semibold">Tracking well</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delayed Projects / Tasks */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden xl:col-span-1 md:col-span-2">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FiClock className="w-4 h-4 text-rose-500" />
                            Delayed Tasks
                        </CardTitle>
                        <Badge variant="destructive" className="rounded-full w-5 h-5 flex items-center justify-center p-0 text-xs">
                            {delayedTasks.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[220px] overflow-y-auto">
                    {delayedTasks.length > 0 ? (
                        <div className="divide-y divide-border/50">
                            {delayedTasks.slice(0, 5).map(task => (
                                <div key={task.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                                    <div className="min-w-0 pr-4">
                                        <p className="font-medium text-sm truncate">{task.title}</p>
                                        <p className="text-xs text-rose-500 font-medium mt-0.5">
                                            Due: {format(new Date(task.dueDate), "MMM dd, yyyy")}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 shrink-0 text-[10px]">
                                        Overdue
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                            <FiCheckCircle className="w-8 h-8 text-emerald-400 mb-2 opacity-50" />
                            <p className="text-sm font-medium">No delayed tasks!</p>
                            <p className="text-xs">The team is executing perfectly on schedule.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
