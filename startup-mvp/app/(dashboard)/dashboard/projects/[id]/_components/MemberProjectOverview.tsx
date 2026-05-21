import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FiCheckSquare, FiTarget, FiCalendar, FiBell, FiClock } from "react-icons/fi";
import { format } from "date-fns";

export function MemberProjectOverview({ project, tasks, userId, events }: { project: any; tasks: any[]; userId: string; events: any[] }) {
    // 1. My Tasks
    const myTasks = tasks.filter(t => t.assignedToId === userId);
    const myPendingTasks = myTasks.filter(t => t.status !== "COMPLETED");
    const myCompletedTasks = myTasks.filter(t => t.status === "COMPLETED");
    
    // 2. Sprint Progress (Mocked logic for UI)
    const sprintDaysTotal = 14;
    const sprintDaysElapsed = 5;
    const sprintPercent = (sprintDaysElapsed / sprintDaysTotal) * 100;

    // 3. Upcoming Deadlines (My tasks due soon)
    const upcomingDeadlines = [...myPendingTasks]
        .filter(t => new Date(t.dueDate) >= new Date())
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 4);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* My Tasks Snapshot */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col md:col-span-2 xl:col-span-1">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FiCheckSquare className="w-4 h-4 text-blue-500" />
                        My Workload
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col gap-6 justify-center">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-500/10 rounded-lg p-4 text-center border border-blue-500/20">
                            <p className="text-3xl font-bold text-blue-600">{myPendingTasks.length}</p>
                            <p className="text-xs font-semibold text-blue-600/80 uppercase tracking-wider mt-1">Pending</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-lg p-4 text-center border border-emerald-500/20">
                            <p className="text-3xl font-bold text-emerald-600">{myCompletedTasks.length}</p>
                            <p className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider mt-1">Done</p>
                        </div>
                    </div>
                    {myPendingTasks.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <FiClock className="w-3.5 h-3.5" /> Next up
                            </p>
                            <div className="p-3 border border-border/50 rounded-lg bg-muted/30 shadow-sm">
                                <p className="font-medium text-sm truncate">{myPendingTasks[0]?.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">Due {format(new Date(myPendingTasks[0]?.dueDate), "MMM dd")}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sprint Progress */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FiTarget className="w-4 h-4 text-indigo-500" />
                            Current Sprint
                        </CardTitle>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">Sprint 14</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col justify-center gap-5">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Time Elapsed</span>
                            <span className="text-muted-foreground">Day {sprintDaysElapsed} of {sprintDaysTotal}</span>
                        </div>
                        <Progress value={sprintPercent} className="h-2 [&>div]:bg-indigo-500" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Your Velocity</p>
                            <p className="text-xl font-bold tracking-tight">8 pts</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Team Goal</p>
                            <p className="text-xl font-bold tracking-tight">45 pts</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 text-amber-500" />
                        Upcoming Deadlines
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto max-h-[220px]">
                    {upcomingDeadlines.length > 0 ? (
                        <div className="divide-y divide-border/50">
                            {upcomingDeadlines.map((task) => (
                                <div key={task.id} className="p-4 hover:bg-muted/30 transition-colors">
                                    <p className="font-medium text-sm truncate">{task.title}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                                            {task.priority || "Normal"}
                                        </Badge>
                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                            <FiClock className="w-3 h-3" />
                                            {format(new Date(task.dueDate), "MMM dd")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                            <FiCheckSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                            <p className="text-sm font-medium">No upcoming deadlines</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notifications Feed */}
            <Card className="rounded-xl border border-border/50 shadow-sm overflow-hidden md:col-span-2 xl:col-span-3">
                <CardHeader className="bg-slate-50/50 border-b py-4 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FiBell className="w-4 h-4 text-rose-500" />
                        Recent Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {events && events.length > 0 ? (
                        <div className="divide-y divide-border/50">
                            {events.slice(0, 3).map((event: any) => (
                                <div key={event.id} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <FiActivity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm">
                                            <span className="font-semibold">{event.User?.name || "System"}</span>{" "}
                                            <span className="text-muted-foreground">{event.action}</span>{" "}
                                            <span className="font-medium">{event.entityType}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(event.createdAt), "MMM dd, h:mm a")}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <p className="text-sm">No recent activity on this project.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
