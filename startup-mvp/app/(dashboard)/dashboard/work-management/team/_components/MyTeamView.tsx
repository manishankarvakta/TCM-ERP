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

interface Props {
  initialTeam: any[];
}

export default function MyTeamView({ initialTeam }: Props) {
  const [team, setTeam] = useState<any[]>(initialTeam);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters state
  const [statusFilter, setStatusFilter] = useState("all");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [updateFilter, setUpdateFilter] = useState("all");

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
    // Overdue/Blocked task = 10 pts, High workload (>80) = 5 pts, Missing Update = 5 pts
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
        return scoreB - scoreA; // descending order of score
      }
      return a.name.localeCompare(b.name); // alphabetical fallback
    });
  }, [team, searchQuery, statusFilter, workloadFilter, updateFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Team Directory
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
      <div className="rounded-xl border border-border/60 bg-card p-3 grid gap-4 grid-cols-1 md:grid-cols-4 shadow-xs text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, position, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase min-w-[50px]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All States</option>
            <option value="working">Working</option>
            <option value="on_break">On Break</option>
            <option value="not_started">Not Started</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Workload filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase min-w-[65px]">Workload:</label>
          <select
            value={workloadFilter}
            onChange={(e) => setWorkloadFilter(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Load Levels</option>
            <option value="overloaded">Overloaded (&gt;80%)</option>
            <option value="healthy">Healthy (50%-80%)</option>
            <option value="underutilized">Underutilized (&lt;50%)</option>
          </select>
        </div>

        {/* Updates filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase min-w-[70px]">Daily Report:</label>
          <select
            value={updateFilter}
            onChange={(e) => setUpdateFilter(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Submission States</option>
            <option value="submitted">Submitted</option>
            <option value="missing">Missing Today</option>
          </select>
        </div>
      </div>

      {/* Team Cards Grid */}
      {processedTeam.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">
          No team members match the search filters.
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {processedTeam.map((emp: any) => {
            const hasOverdueOrBlocked = emp.overdueCount > 0 || emp.blockedCount > 0;
            return (
              <div
                key={emp.id}
                className={`rounded-xl border bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition relative overflow-hidden ${
                  hasOverdueOrBlocked ? "border-rose-200" : "border-border"
                }`}
              >
                {/* Header Profile Info */}
                <div className="flex items-start justify-between min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold text-base text-foreground">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} className="h-full w-full object-cover" />
                      ) : (
                        emp.name.split(" ").map((n: string) => n[0]).join("")
                      )}
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/work-management/team/${emp.id}`}
                        className="font-bold text-base text-foreground hover:underline truncate block"
                      >
                        {emp.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">{emp.designation}</p>
                      <p className="text-[10px] text-muted-foreground truncate uppercase font-semibold mt-0.5">
                        {emp.department}
                      </p>
                    </div>
                  </div>

                  {/* Attention badge */}
                  {hasOverdueOrBlocked && (
                    <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      Needs Attention
                    </span>
                  )}
                </div>

                {/* State & Duration display */}
                <div className="flex items-center justify-between bg-accent/20 rounded-lg p-2.5">
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
                    <span className="text-xs font-bold capitalize">
                      {emp.status === "WORKING"
                        ? "Working"
                        : emp.status === "ON BREAK"
                        ? "On Break"
                        : emp.status === "COMPLETED"
                        ? "Completed"
                        : "Not Started"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDurationSimple(emp.activeTimeMs)}</span>
                  </div>
                </div>

                {/* Tasks Stats Grid */}
                <div className="grid grid-cols-2 gap-3.5 text-xs border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>Projects Assigned</span>
                      <span className="font-semibold text-foreground">{emp.projectsCount}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span>Today's Tasks</span>
                      <span className="font-semibold text-foreground">{emp.tasksCount}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pl-3.5 border-l border-border/60">
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Completed
                      </span>
                      <span className="font-semibold text-emerald-600">{emp.completedCount}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <PlayCircle className="h-3.5 w-3.5 text-blue-500" /> In Progress
                      </span>
                      <span className="font-semibold text-blue-600">{emp.inProgressCount}</span>
                    </div>
                  </div>
                </div>

                {/* Secondary counts: Blocked, Overdue */}
                <div className="flex items-center justify-between text-[11px] bg-accent/10 px-2 py-1 rounded">
                  <div className="flex items-center gap-1">
                    <AlertCircle className={`h-3.5 w-3.5 ${emp.blockedCount > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
                    <span className={emp.blockedCount > 0 ? "text-rose-600 font-bold" : "text-muted-foreground"}>
                      {emp.blockedCount} Blocked
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <AlertCircle className={`h-3.5 w-3.5 ${emp.overdueCount > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
                    <span className={emp.overdueCount > 0 ? "text-rose-600 font-bold" : "text-muted-foreground"}>
                      {emp.overdueCount} Overdue
                    </span>
                  </div>
                </div>

                {/* Workload Progress */}
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Workload Ratio</span>
                    <span
                      className={`font-semibold ${
                        emp.workloadRatio > 80
                          ? "text-rose-600"
                          : emp.workloadRatio < 50
                          ? "text-yellow-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {emp.workloadRatio}% ({emp.workloadRatio > 80 ? "Overloaded" : emp.workloadRatio < 50 ? "Underutilized" : "Healthy"})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
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

                {/* Daily Update Submission Flag */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                  <span>Daily Update:</span>
                  {emp.hasSubmittedUpdate ? (
                    <span className="text-emerald-600 font-bold">✓ Submitted</span>
                  ) : (
                    <span className="text-rose-600 font-bold">⚠️ Not Submitted</span>
                  )}
                </div>

                {/* Action CTA link */}
                <div className="border-t border-border pt-3.5 text-center">
                  <Link
                    href={`/dashboard/work-management/team/${emp.id}`}
                    className="inline-flex items-center justify-center gap-1.5 w-full bg-accent/50 hover:bg-accent text-xs font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Open Work Profile <Users className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
