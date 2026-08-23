"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { getWorkManagementDashboardData } from "@/app/actions/projects/work-management-dashboard.action";
import {
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiClock,
  FiAlertTriangle,
  FiAlertOctagon,
  FiActivity,
  FiSearch,
  FiFilter,
  FiCheck,
  FiPlay,
  FiCoffee,
  FiSquare,
  FiInbox,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
  initialData: any;
  currentUser: any;
}

export default function WorkManagementDashboard({ initialData, currentUser }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { socket, isConnected } = useSocket();

  // Fetch updated dashboard aggregates from Server Action
  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getWorkManagementDashboardData();
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to update dashboard data");
    }
    setLoading(false);
  }, []);

  // Set up realtime Socket.IO listener
  useEffect(() => {
    if (!socket) return;

    // Join room for work management dashboard
    socket.emit("join_room", { room: "work-management:dashboard" });
    console.log("[Command Center] Joined work-management:dashboard room");

    const handleRealtimeEvent = (eventData: any) => {
      console.log("[Command Center] Realtime update event:", eventData);
      refreshData(true); // Smooth silent updates in background
    };

    socket.on("WORK_SESSION_STARTED", handleRealtimeEvent);
    socket.on("WORK_SESSION_BREAK", handleRealtimeEvent);
    socket.on("WORK_SESSION_RESUMED", handleRealtimeEvent);
    socket.on("WORK_SESSION_ENDED", handleRealtimeEvent);
    socket.on("DAILY_UPDATE_SUBMITTED", handleRealtimeEvent);
    socket.on("TASK_CREATED", handleRealtimeEvent);
    socket.on("TASK_UPDATED", handleRealtimeEvent);

    return () => {
      socket.emit("leave_room", { room: "work-management:dashboard" });
      socket.off("WORK_SESSION_STARTED", handleRealtimeEvent);
      socket.off("WORK_SESSION_BREAK", handleRealtimeEvent);
      socket.off("WORK_SESSION_RESUMED", handleRealtimeEvent);
      socket.off("WORK_SESSION_ENDED", handleRealtimeEvent);
      socket.off("DAILY_UPDATE_SUBMITTED", handleRealtimeEvent);
      socket.off("TASK_CREATED", handleRealtimeEvent);
      socket.off("TASK_UPDATED", handleRealtimeEvent);
    };
  }, [socket, refreshData]);

  // Client-side timer ticker to update active working durations dynamically every second
  const [secondsTicker, setSecondsTicker] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format milliseconds into HH:MM:SS
  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return "00:00:00";
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // Filter today's work list based on quick filters and search query
  const filteredWorkList = useMemo(() => {
    if (!data?.todayTeamWork) return [];

    return data.todayTeamWork.filter((item: any) => {
      // 1. Search Query Filter
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // 2. Quick Filters
      switch (activeFilter) {
        case "in_progress":
          return (
            item.status === "in_progress" ||
            item.status === "doing" ||
            item.status === "active" ||
            item.status === "review"
          );
        case "blocked":
          return item.status === "blocked" || item.status === "waiting";
        case "completed":
          return item.status === "completed" || item.status === "done";
        case "unassigned":
          return item.employee.toLowerCase() === "unassigned";
        case "overdue":
          // filter overdue tasks (this section shows today's overdue tasks if list contains it)
          if (data.needsAttention?.overdueTasks) {
            return data.needsAttention.overdueTasks.some((ot: any) => ot.id === item.id);
          }
          return false;
        default:
          return true;
      }
    });
  }, [data, searchQuery, activeFilter]);

  if (!data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <FiRefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p>Loading command center data...</p>
      </div>
    );
  }

  const { summary, needsAttention, teamLiveStatus, projectProgress, dailyUpdateStatus, recentActivity, businessDate } = data;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Work Management Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Realtime Operational Dashboard &bull; Dhaka Time: <span className="font-semibold text-foreground">{businessDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
            <span className="text-muted-foreground">{isConnected ? "Realtime Active" : "Realtime Offline"}</span>
          </div>

          <button
            onClick={() => refreshData()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent transition"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Grid Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* Team Members */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Team Members</span>
            <FiUsers className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.totalTeamMembers}</span>
            <span className="text-xs text-muted-foreground">Active Profiles</span>
          </div>
        </div>

        {/* Active Projects */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Projects</span>
            <FiFolder className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.activeProjects}</span>
            <span className="text-xs text-muted-foreground">In Progress</span>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Today's Tasks</span>
            <FiCheckSquare className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.todayTasks}</span>
            <span className="text-xs text-muted-foreground">Allocated</span>
          </div>
        </div>

        {/* Completed Today */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Completed Today</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <FiCheck className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">{summary.completedToday}</span>
            <span className="text-xs text-muted-foreground">Tasks Completed</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">In Progress</span>
            <FiPlay className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">{summary.inProgress}</span>
            <span className="text-xs text-muted-foreground">Active Tasks</span>
          </div>
        </div>

        {/* Blocked */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Blocked</span>
            <FiAlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600">{summary.blocked}</span>
            <span className="text-xs text-muted-foreground">Attention Needed</span>
          </div>
        </div>

        {/* Overdue */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Overdue</span>
            <FiAlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600">{summary.overdue}</span>
            <span className="text-xs text-muted-foreground">Outstanding</span>
          </div>
        </div>

        {/* Missing Updates */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Missing Updates</span>
            <FiClock className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-600">{summary.missingUpdates}</span>
            <span className="text-xs text-muted-foreground">No Daily Report</span>
          </div>
        </div>
      </div>

      {/* Needs Attention & Recent Activity */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Needs Attention Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold tracking-tight">🔴 Needs Attention</h2>
          
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {/* Blocked Tasks List */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <FiAlertOctagon className="h-4 w-4" /> Blocked Tasks ({needsAttention.blockedTasks.length})
              </h3>

              {needsAttention.blockedTasks.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                  <FiCheck className="h-5 w-5 text-emerald-500 mb-1" />
                  <p>Great! No blocked tasks.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {needsAttention.blockedTasks.map((t: any) => (
                    <div key={t.id} className="text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                      <Link href={`/dashboard/projects/tasks`} className="font-semibold text-foreground hover:underline block truncate">
                        {t.title}
                      </Link>
                      <div className="flex items-center justify-between text-muted-foreground mt-1">
                        <span>Project: {t.project}</span>
                        <span>Owner: {t.assignee}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue Tasks List */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                <FiAlertTriangle className="h-4 w-4" /> Overdue Tasks ({needsAttention.overdueTasks.length})
              </h3>

              {needsAttention.overdueTasks.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                  <FiCheck className="h-5 w-5 text-emerald-500 mb-1" />
                  <p>All tasks are on schedule.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {needsAttention.overdueTasks.map((t: any) => (
                    <div key={t.id} className="text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                      <Link href={`/dashboard/projects/tasks`} className="font-semibold text-foreground hover:underline block truncate">
                        {t.title}
                      </Link>
                      <div className="flex items-center justify-between text-muted-foreground mt-1">
                        <span className="text-rose-600 font-semibold">Due: {t.dueDate}</span>
                        <span>Assignee: {t.assignee}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Daily Updates */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-zinc-500 flex items-center gap-1.5">
                <FiClock className="h-4 w-4" /> Missing Today's Updates ({needsAttention.missingUpdates.length})
              </h3>

              {needsAttention.missingUpdates.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                  <FiCheck className="h-5 w-5 text-emerald-500 mb-1" />
                  <p>All updates submitted today!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {needsAttention.missingUpdates.map((emp: any) => (
                    <div key={emp.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="font-semibold">{emp.name}</span>
                      <Link href={`/dashboard/employees`} className="text-primary hover:underline text-[10px]">
                        View Profile
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High Workload Alerts */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                <FiActivity className="h-4 w-4" /> High Workload ({needsAttention.highWorkload.length})
              </h3>

              {needsAttention.highWorkload.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                  <FiCheck className="h-5 w-5 text-emerald-500 mb-1" />
                  <p>Workloads balanced.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {needsAttention.highWorkload.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="font-semibold">{w.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-rose-600 font-bold">{w.workloadRatio}% Capacity</span>
                        {w.burnoutRisk && <span className="bg-rose-100 text-rose-700 text-[9px] px-1 rounded">Burnout Risk</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Realtime Activity Feed Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight">⚡ Realtime Activity</h2>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4 h-[252px] overflow-y-auto shadow-sm">
            {recentActivity.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
                <FiInbox className="h-6 w-6 mb-2" />
                <p>No recent activity logs.</p>
              </div>
            ) : (
              <div className="relative border-l border-zinc-200 pl-4 space-y-4 text-xs">
                {recentActivity.map((act: any) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full border border-card bg-primary" />
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <p className="mt-0.5 font-medium text-foreground">
                      {act.subject}
                    </p>
                    {act.description && <p className="text-muted-foreground text-[10px]">{act.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Live Status */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">🟢 Team Live Status</h2>

        {teamLiveStatus.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No team members are currently working.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {teamLiveStatus.map((emp: any) => {
              // Live ticker offset logic
              let activeDurationMs = emp.activeDurationMs;
              return (
                <div key={emp.id} className="rounded-xl border border-border bg-card p-4 space-y-3 relative overflow-hidden shadow-sm hover:shadow transition">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold text-sm text-foreground">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} className="h-full w-full object-cover" />
                      ) : (
                        emp.name.split(" ").map((n: string) => n[0]).join("")
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate">{emp.name}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.designation}</p>
                    </div>
                  </div>

                  {/* Status Indicator Bar */}
                  <div className="flex items-center justify-between border-t border-border pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          emp.status === "WORKING"
                            ? "bg-emerald-500 animate-pulse"
                            : emp.status === "ON BREAK"
                            ? "bg-amber-500"
                            : emp.status === "COMPLETED"
                            ? "bg-blue-500"
                            : "bg-zinc-400"
                        }`}
                      />
                      <span className="text-xs font-bold">
                        {emp.status === "WORKING"
                          ? "Working"
                          : emp.status === "ON BREAK"
                          ? "On Break"
                          : emp.status === "COMPLETED"
                          ? "Completed"
                          : "Not Started"}
                      </span>
                    </div>

                    {/* Clock timer */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                      <FiClock className="h-3 w-3" />
                      <span>{formatDuration(activeDurationMs)}</span>
                    </div>
                  </div>

                  {/* Active Context */}
                  <div className="text-xs space-y-1 pt-1.5 border-t border-border/50">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>PROJECT</span>
                      <span className="font-medium text-foreground max-w-[120px] truncate">
                        {emp.currentProject || "No project"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>TASK</span>
                      <span className="font-medium text-foreground max-w-[120px] truncate">
                        {emp.currentTask || "No task selected"}
                      </span>
                    </div>
                  </div>

                  {/* Task counts */}
                  <div className="flex items-center justify-between text-[10px] bg-accent/30 rounded px-2 py-1 mt-1 text-muted-foreground">
                    <span>Tasks: {emp.completedTasksCount} Done</span>
                    <span>{emp.remainingTasksCount} Pending</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Team Work Checklist */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold tracking-tight">📝 Today's Team Work</h2>

          {/* Quick Filters and Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-60">
              <FiSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employee, project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 border-l border-border pl-3">
              {["all", "in_progress", "blocked", "overdue", "completed", "unassigned"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                    activeFilter === filter
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {filter.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-accent/20 text-muted-foreground font-semibold">
                <th className="p-3">Employee</th>
                <th className="p-3">Task</th>
                <th className="p-3">Project</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No matching work items found.
                  </td>
                </tr>
              ) : (
                filteredWorkList.map((item: any) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-accent/10 transition">
                    <td className="p-3 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold text-[10px]">
                        {item.employeeImage ? (
                          <img src={item.employeeImage} alt={item.employee} />
                        ) : (
                          item.employee[0]
                        )}
                      </div>
                      <span className="font-medium text-foreground">{item.employee}</span>
                    </td>
                    <td className="p-3">
                      <Link href={`/dashboard/projects/tasks`} className="font-semibold text-foreground hover:underline">
                        {item.title}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{item.project}</td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.priority?.toLowerCase() === "high"
                            ? "bg-rose-50 text-rose-700"
                            : item.priority?.toLowerCase() === "medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.status === "completed" || item.status === "done"
                              ? "bg-emerald-500"
                              : item.status === "blocked" || item.status === "waiting"
                              ? "bg-rose-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <span className="capitalize">{item.status.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{item.dueDate || "N/A"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Progress & Daily Updates Status */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Compact Project Progress Overview */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight">📊 Active Project Progress</h2>

          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {projectProgress.length === 0 ? (
              <div className="text-center p-8 text-sm text-muted-foreground">
                No active projects.
              </div>
            ) : (
              projectProgress.map((proj: any) => (
                <div key={proj.id} className="border-b border-border pb-3 last:border-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <Link href={`/dashboard/projects/all`} className="font-bold text-foreground hover:underline text-sm">
                        {proj.title}
                      </Link>
                      <span className="text-[10px] text-muted-foreground ml-2">#{proj.projectNumber}</span>
                    </div>
                    <span className="text-muted-foreground">Manager: <span className="font-semibold text-foreground">{proj.projectManager}</span></span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${proj.progress}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold">{proj.progress}%</span>
                  </div>

                  {/* Task breakdowns */}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>Tasks: {proj.completedTasksCount} Done</span>
                    <span>{proj.activeTasksCount} Active</span>
                    <span className="text-rose-600 font-bold">{proj.blockedTasksCount} Blocked</span>
                    <span className="text-amber-600 font-bold">{proj.overdueTasksCount} Overdue</span>
                    <span>Milestones: {proj.milestonesSummary}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Daily Updates Status Widget */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight">Today's Daily Updates</h2>

          <div className="space-y-3">
            {/* Aggregate Progress Banner */}
            <div className="bg-accent/40 rounded-lg p-3 flex items-center justify-between text-xs">
              <span className="font-semibold">Submission Ratio</span>
              <span className="font-bold font-mono">
                {dailyUpdateStatus.submittedCount} / {dailyUpdateStatus.totalCount} Updates
              </span>
            </div>

            {/* Grid of employees */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Submitted</div>
              {dailyUpdateStatus.submissions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic pl-1">No submissions yet.</p>
              ) : (
                dailyUpdateStatus.submissions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between text-xs border-b border-border py-1 last:border-0">
                    <span className="font-medium text-foreground">{sub.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                      <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1 rounded">Submitted</span>
                    </div>
                  </div>
                ))
              )}

              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-4">Missing Updates</div>
              {dailyUpdateStatus.missing.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic pl-1">No updates missing!</p>
              ) : (
                dailyUpdateStatus.missing.map((miss: any) => (
                  <div key={miss.id} className="flex items-center justify-between text-xs border-b border-border py-1 last:border-0">
                    <span className="font-medium text-foreground">{miss.name}</span>
                    <span className="bg-rose-100 text-rose-700 text-[8px] font-bold px-1 rounded">Missing</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
