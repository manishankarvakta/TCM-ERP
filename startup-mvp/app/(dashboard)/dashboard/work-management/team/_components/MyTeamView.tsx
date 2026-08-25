"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { getTeamMembersWorkSummary } from "@/app/actions/projects/work-management-team.action";
import {
  Users,
  Search,
  Clock,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  Activity,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  initialTeam: any[];
}

export default function MyTeamView({ initialTeam }: Props) {
  const [team, setTeam] = useState<any[]>(initialTeam);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters state
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [updateFilter, setUpdateFilter] = useState("all");

  // Dynamically calculate departments from active team
  const departmentsList = useMemo(() => {
    const depts = new Set(team.map((emp) => emp.department).filter(Boolean));
    return Array.from(depts);
  }, [team]);

  const { socket, isConnected } = useSocket();

  // Fetch updated team summaries from Server Action
  const refreshTeam = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getTeamMembersWorkSummary();
    if (res.success && res.team) {
      setTeam(res.team);
    } else {
      toast.error(res.error || "Failed to update team summaries");
    }
    setLoading(false);
  }, []);

  // Set up realtime Socket.IO listener
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_room", { room: "work-management:dashboard" });

    const handleRealtimeUpdate = () => {
      refreshTeam(true); // Silent update in background
    };

    socket.on("WORK_SESSION_STARTED", handleRealtimeUpdate);
    socket.on("WORK_SESSION_BREAK", handleRealtimeUpdate);
    socket.on("WORK_SESSION_RESUMED", handleRealtimeUpdate);
    socket.on("WORK_SESSION_ENDED", handleRealtimeUpdate);
    socket.on("DAILY_UPDATE_SUBMITTED", handleRealtimeUpdate);
    socket.on("TASK_CREATED", handleRealtimeUpdate);
    socket.on("TASK_UPDATED", handleRealtimeUpdate);

    return () => {
      socket.emit("leave_room", { room: "work-management:dashboard" });
      socket.off("WORK_SESSION_STARTED", handleRealtimeUpdate);
      socket.off("WORK_SESSION_BREAK", handleRealtimeUpdate);
      socket.off("WORK_SESSION_RESUMED", handleRealtimeUpdate);
      socket.off("WORK_SESSION_ENDED", handleRealtimeUpdate);
      socket.off("DAILY_UPDATE_SUBMITTED", handleRealtimeUpdate);
      socket.off("TASK_CREATED", handleRealtimeUpdate);
      socket.off("TASK_UPDATED", handleRealtimeUpdate);
    };
  }, [socket, refreshTeam]);

  // Client-side timer ticker to update active durations dynamically
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSecs((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format milliseconds into HH:MM
  const formatDurationSimple = (ms: number) => {
    if (!ms || ms <= 0) return "0h 0m";
    const totalMins = Math.floor(ms / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };

  // Filter, Sort and Search logic
  const processedTeam = useMemo(() => {
    // 1. Search Query & Filters
    let result = team.filter((emp) => {
      // Search matches
      const matchSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // Status filter
      if (statusFilter !== "all" && emp.status !== statusFilter.toUpperCase()) {
        return false;
      }

      // Department filter
      if (deptFilter !== "all" && emp.department !== deptFilter) {
        return false;
      }

      // Workload filter
      if (workloadFilter !== "all") {
        if (workloadFilter === "overloaded" && emp.workloadRatio <= 80) return false;
        if (workloadFilter === "healthy" && (emp.workloadRatio < 50 || emp.workloadRatio > 80)) return false;
        if (workloadFilter === "underutilized" && emp.workloadRatio >= 50) return false;
      }

      // Daily Update filter
      if (updateFilter !== "all") {
        const submitted = emp.hasSubmittedUpdate;
        if (updateFilter === "submitted" && !submitted) return false;
        if (updateFilter === "missing" && submitted) return false;
      }

      return true;
    });

    // 2. Sort by Manager Attention Score (highest first)
    return result.sort((a, b) => {
      const getScore = (emp: any) => {
        let score = 0;
        if (emp.overdueCount > 0) score += 10;
        if (emp.blockedCount > 0) score += 10;
        if (emp.workloadRatio > 80) score += 5;
        if (!emp.hasSubmittedUpdate && emp.status !== "NOT STARTED") score += 5;
        return score;
      };

      const scoreA = getScore(a);
      const scoreB = getScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return a.name.localeCompare(b.name);
    });
  }, [team, searchQuery, statusFilter, deptFilter, workloadFilter, updateFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            Teams Member
            <span className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 font-black px-3.5 py-1 rounded-full text-sm border border-emerald-500/20">
              {processedTeam.length} Members
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational status, workloads, and task completions of all active team members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
            <span className="text-muted-foreground">{isConnected ? "Realtime Active" : "Realtime Offline"}</span>
          </div>

          <button
            onClick={() => refreshTeam()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters & Search Grid */}
      <div className="rounded-xl border border-border/60 bg-card p-3 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 shadow-xs text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-xs transition"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Status:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full h-8 bg-background border border-border rounded-lg text-xs justify-between">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="working">Working</SelectItem>
              <SelectItem value="on_break">On Break</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Dept:</label>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full h-8 bg-background border border-border rounded-lg text-xs justify-between">
              <SelectValue placeholder="All Depts" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Depts</SelectItem>
              {departmentsList.map((d: string) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Workload filter */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Load:</label>
          <Select value={workloadFilter} onValueChange={setWorkloadFilter}>
            <SelectTrigger className="w-full h-8 bg-background border border-border rounded-lg text-xs justify-between">
              <SelectValue placeholder="All Loads" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Loads</SelectItem>
              <SelectItem value="overloaded">Overloaded (&gt;80%)</SelectItem>
              <SelectItem value="healthy">Healthy (50%-80%)</SelectItem>
              <SelectItem value="underutilized">Underutilized (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Updates filter */}
        <div className="flex items-center gap-1.5 w-full">
          <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Report:</label>
          <Select value={updateFilter} onValueChange={setUpdateFilter}>
            <SelectTrigger className="w-full h-8 bg-background border border-border rounded-lg text-xs justify-between">
              <SelectValue placeholder="All Reports" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="missing">Missing Today</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters action */}
        <button
          onClick={() => {
            setSearchQuery("");
            setStatusFilter("all");
            setDeptFilter("all");
            setWorkloadFilter("all");
            setUpdateFilter("all");
          }}
          className="flex items-center justify-center gap-1.5 w-full bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-lg py-1.5 text-xs transition cursor-pointer"
        >
          <X className="h-3.5 w-3.5" /> Clear Filters
        </button>
      </div>

      {/* Team Directory Table */}
      {processedTeam.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">
          No team members match the search filters.
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-xs">
                  <th className="p-4 pl-6 text-center w-12">SL</th>
                  <th className="p-4">Team Member</th>
                  <th className="p-4 w-36">Status</th>
                  <th className="p-4 w-36">Active Time</th>
                  <th className="p-4 w-44">Tasks Status</th>
                  <th className="p-4 w-44">Workload Ratio</th>
                  <th className="p-4 w-36">Daily Update</th>
                  <th className="p-4 w-32 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/65">
                {processedTeam.map((emp: any, idx: number) => {
                  const hasOverdueOrBlocked = emp.overdueCount > 0 || emp.blockedCount > 0;
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        hasOverdueOrBlocked ? "bg-rose-50/10 dark:bg-rose-950/5" : ""
                      }`}
                    >
                      {/* Serial Number */}
                      <td className="p-4 pl-6 text-center font-mono text-xs text-muted-foreground font-bold">
                        {String(idx + 1).padStart(2, "0")}
                      </td>

                      {/* Member Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border/80 shadow-xs">
                            {emp.photo ? (
                              <img src={emp.photo} alt={emp.name} className="h-full w-full object-cover" />
                            ) : (
                              emp.name.split(" ").map((n: string) => n[0]).join("")
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/dashboard/work-management/team/${emp.id}`}
                                className="font-extrabold text-sm text-foreground hover:underline truncate"
                              >
                                {emp.name}
                              </Link>
                              {hasOverdueOrBlocked && (
                                <span className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider scale-90 shrink-0">
                                  Alert
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5 uppercase tracking-wide font-bold">
                              {emp.designation} • {emp.department}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold bg-background shadow-2xs">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              emp.status === "WORKING"
                                ? "bg-emerald-500 animate-pulse"
                                : emp.status === "ON BREAK"
                                ? "bg-amber-500"
                                : emp.status === "COMPLETED"
                                ? "bg-blue-500"
                                : "bg-zinc-400"
                            }`}
                          />
                          <span>
                            {emp.status === "WORKING"
                              ? "Working"
                              : emp.status === "ON BREAK"
                              ? "On Break"
                              : emp.status === "COMPLETED"
                              ? "Completed"
                              : "Not Started"}
                          </span>
                        </span>
                      </td>

                      {/* Active Time */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-sm text-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDurationSimple(emp.activeTimeMs)}
                        </span>
                      </td>

                      {/* Tasks status summary */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <span>{emp.completedCount}/{emp.tasksCount} Tasks Done</span>
                          </div>
                          <div className="flex gap-2 text-[10px] font-bold">
                            {emp.blockedCount > 0 && (
                              <span className="text-rose-600 dark:text-rose-400">⚠️ {emp.blockedCount} Blocked</span>
                            )}
                            {emp.overdueCount > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">🕒 {emp.overdueCount} Overdue</span>
                            )}
                            {emp.blockedCount === 0 && emp.overdueCount === 0 && (
                              <span className="text-emerald-600">✓ All Clear</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Workload Progress */}
                      <td className="p-4">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={
                              emp.workloadRatio > 80
                                ? "text-rose-600"
                                : emp.workloadRatio < 50
                                ? "text-yellow-600"
                                : "text-emerald-600"
                            }>
                              {emp.workloadRatio}%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {emp.workloadRatio > 80 ? "Heavy" : emp.workloadRatio < 50 ? "Low" : "Normal"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                emp.workloadRatio > 80
                                  ? "bg-rose-500"
                                  : emp.workloadRatio < 50
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(emp.workloadRatio, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Daily Update */}
                      <td className="p-4">
                        {emp.hasSubmittedUpdate ? (
                          <span className="text-emerald-600 font-extrabold text-xs uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 px-2 py-0.5 rounded-md">
                            Submitted
                          </span>
                        ) : (
                          <span className="text-rose-600 font-extrabold text-xs uppercase tracking-wider bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900 px-2 py-0.5 rounded-md">
                            Missing
                          </span>
                        )}
                      </td>

                      {/* Action monitor link */}
                      <td className="p-4 pr-6 text-right">
                        <Link
                          href={`/dashboard/work-management/team/${emp.id}`}
                          className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition duration-200 cursor-pointer"
                        >
                          Monitor <Users className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
