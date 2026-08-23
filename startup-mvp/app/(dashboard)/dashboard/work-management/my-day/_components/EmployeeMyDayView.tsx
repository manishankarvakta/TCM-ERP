"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { getEmployeeMyDayData } from "@/app/actions/projects/work-management-myday.action";
import {
  Clock,
  Calendar,
  User,
  Play,
  Pause,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  initialData: any;
  employeeId: string;
}

const getStatusDetails = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "new":
    case "todo":
      return {
        label: "New",
        bg: "bg-slate-100 dark:bg-slate-900/50",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-800",
        dot: "bg-slate-400",
      };
    case "planned":
      return {
        label: "Planned",
        bg: "bg-amber-50 dark:bg-amber-950/20",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-900/30",
        dot: "bg-amber-500",
      };
    case "in_progress":
    case "doing":
    case "active":
      return {
        label: "In Progress",
        bg: "bg-blue-50 dark:bg-blue-950/20",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-900/30",
        dot: "bg-blue-500 animate-pulse",
      };
    case "review":
      return {
        label: "Review",
        bg: "bg-violet-50 dark:bg-violet-950/20",
        text: "text-violet-750 dark:text-violet-400",
        border: "border-violet-200 dark:border-violet-900/30",
        dot: "bg-violet-500",
      };
    case "completed":
    case "done":
      return {
        label: "Completed",
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-900/30",
        dot: "bg-emerald-500",
      };
    case "blocked":
    case "waiting":
      return {
        label: "Blocked",
        bg: "bg-rose-50 dark:bg-rose-950/20",
        text: "text-rose-700 dark:text-rose-450",
        border: "border-rose-200 dark:border-rose-900/30",
        dot: "bg-rose-500",
      };
    default:
      return {
        label: status || "Todo",
        bg: "bg-zinc-100 dark:bg-zinc-900/50",
        text: "text-zinc-700 dark:text-zinc-300",
        border: "border-zinc-200 dark:border-zinc-800",
        dot: "bg-zinc-400",
      };
  }
};

const getPriorityDetails = (priority: string) => {
  const p = priority?.toLowerCase();
  switch (p) {
    case "low":
      return {
        bg: "bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/40",
        dot: "bg-slate-400",
        label: "Low",
      };
    case "medium":
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/30",
        dot: "bg-blue-500",
        label: "Medium",
      };
    case "high":
      return {
        bg: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/30",
        dot: "bg-amber-500",
        label: "High",
      };
    case "urgent":
      return {
        bg: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/30",
        dot: "bg-rose-500",
        label: "Urgent",
      };
    default:
      return {
        bg: "bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/40",
        dot: "bg-slate-400",
        label: priority || "Medium",
      };
  }
};

export default function EmployeeMyDayView({ initialData, employeeId }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  const refreshEmployeeMyDay = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getEmployeeMyDayData(employeeId);
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to update employee plan data");
    }
    setLoading(false);
  }, [employeeId]);

  // Sync state over WebSocket
  useEffect(() => {
    if (!socket) return;
    socket.emit("join_room", { room: "work-management:dashboard" });

    const handleSync = () => {
      refreshEmployeeMyDay(true);
    };

    socket.on("MY_DAY_TASK_ADDED", handleSync);
    socket.on("MY_DAY_TASK_REMOVED", handleSync);
    socket.on("MY_DAY_TASK_REORDERED", handleSync);
    socket.on("CURRENT_TASK_CHANGED", handleSync);
    socket.on("WORK_SESSION_STARTED", handleSync);
    socket.on("WORK_SESSION_BREAK", handleSync);
    socket.on("WORK_SESSION_RESUMED", handleSync);
    socket.on("WORK_SESSION_ENDED", handleSync);

    return () => {
      socket.emit("leave_room", { room: "work-management:dashboard" });
      socket.off("MY_DAY_TASK_ADDED", handleSync);
      socket.off("MY_DAY_TASK_REMOVED", handleSync);
      socket.off("MY_DAY_TASK_REORDERED", handleSync);
      socket.off("CURRENT_TASK_CHANGED", handleSync);
      socket.off("WORK_SESSION_STARTED", handleSync);
      socket.off("WORK_SESSION_BREAK", handleSync);
      socket.off("WORK_SESSION_RESUMED", handleSync);
      socket.off("WORK_SESSION_ENDED", handleSync);
    };
  }, [socket, refreshEmployeeMyDay]);

  if (!data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade-in">
        <Clock className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading employee workspace plan...</p>
      </div>
    );
  }

  const { employeeName, plannedTasks, workSession } = data;

  const formatMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="max-w-7xl mx-auto pt-0 pb-6 space-y-6 animate-fade-in text-sm">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" /> {employeeName}'s Workspace Plan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manager monitoring viewport. Read-only access layout.
          </p>
        </div>

        {/* Live Work Session Status Summary */}
        <div className="rounded-xl border border-border bg-card p-2 px-4 flex items-center gap-4 shadow-xs text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Session Status</span>
            <span className="font-bold text-foreground mt-0.5 uppercase text-[10px]">
              {workSession ? workSession.status.replace("_", " ") : "Not Started"}
            </span>
          </div>

          <div className="h-7 w-px bg-border" />

          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Time</span>
            <span className="font-mono font-bold text-foreground mt-0.5">
              {workSession ? formatMs(workSession.totalActiveMs) : "0h 0m"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3 items-start">
        {/* Planned checklist table */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Today's Focus List</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Work schedule chosen by employee for today.</p>
          </div>

          <div className="space-y-2.5">
            {plannedTasks.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-8 text-center bg-card text-muted-foreground italic text-xs shadow-xs">
                No tasks planned for today.
              </div>
            ) : (
              plannedTasks.map((t: any, index: number) => {
                const statusInfo = getStatusDetails(t.status);
                const priorityInfo = getPriorityDetails(t.priority);
                return (
                  <div
                    key={t.id}
                    className="py-2.5 px-3 border border-border rounded-xl bg-card flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground w-4">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={`font-semibold text-xs text-foreground truncate block max-w-sm ${t.status === "completed" || t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {t.title}
                        </span>
                        {t.projectName && (
                          <span className="shrink-0 bg-secondary text-secondary-foreground border border-border px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            {t.projectName}
                          </span>
                        )}
                      </div>

                      {/* Priorities */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-5 font-semibold">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border ${priorityInfo.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityInfo.dot}`} />
                          {priorityInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${statusInfo.bg} ${statusInfo.border} ${statusInfo.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Workspace details sidebar panel */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs transition hover:border-slate-350 dark:hover:border-zinc-700 text-xs">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            Workspace Summary
          </h3>

          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-muted-foreground">Session Start Time</span>
              <p className="text-foreground font-medium">{workSession ? new Date(workSession.startTime).toLocaleTimeString() : "N/A"}</p>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-muted-foreground">Tasks Planned</span>
              <p className="text-foreground font-bold">{plannedTasks.length} items</p>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-muted-foreground">Completed Today</span>
              <p className="text-emerald-650 font-bold">{plannedTasks.filter((t: any) => t.status === "completed" || t.status === "done").length} items</p>
            </div>

            <div className="border-t border-border pt-4">
              <Link href={`/dashboard/work-management/team/${employeeId}`}>
                <Button variant="secondary" className="w-full font-bold h-9">
                  Return to Work Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
