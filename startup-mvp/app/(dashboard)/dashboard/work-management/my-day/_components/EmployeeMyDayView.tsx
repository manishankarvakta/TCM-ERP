"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { getEmployeeMyDayData } from "@/app/actions/projects/work-management-myday.action";
import {
  FiClock,
  FiCalendar,
  FiUser,
  FiPlay,
  FiPause,
  FiCornerDownRight,
} from "react-icons/fi";
import { toast } from "sonner";
import Link from "next/link";

interface Props {
  initialData: any;
  employeeId: string;
}

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
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <FiClock className="h-8 w-8 animate-spin text-primary" />
        <p>Loading employee workspace plan...</p>
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <FiUser /> {employeeName}'s Workspace Plan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manager monitoring viewport. Read-only access layout.
          </p>
        </div>

        {/* Live Work Session Status Summary */}
        <div className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-4 shadow-sm text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Session Status</span>
            <span className="font-extrabold capitalize text-foreground mt-0.5">
              {workSession ? workSession.status.replace("_", " ").toLowerCase() : "Not Started"}
            </span>
          </div>

          <div className="h-7 w-px bg-border" />

          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Time</span>
            <span className="font-semibold text-foreground mt-0.5">
              {workSession ? formatMs(workSession.totalActiveMs) : "0h 0m"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Planned checklist table */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Focus List</h3>

          <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border text-xs">
            {plannedTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground italic">
                No tasks planned for today.
              </div>
            ) : (
              plannedTasks.map((t: any, index: number) => (
                <div key={t.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 truncate min-w-0">
                    <p className="font-bold text-foreground truncate flex items-center gap-2">
                      <span className="text-muted-foreground font-mono font-semibold">#{index + 1}</span>
                      {t.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t.projectName} • Status: <span className="capitalize">{t.status.replace("_", " ")}</span>
                    </p>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      t.priority === "high" || t.priority === "urgent"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace details sidebar panel */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm text-xs">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Workspace Summary</h3>

          <div className="space-y-3 pt-2">
            <div>
              <span className="font-semibold text-muted-foreground block mb-0.5">Start Time</span>
              <p className="text-foreground">{workSession ? new Date(workSession.startTime).toLocaleTimeString() : "N/A"}</p>
            </div>

            <div>
              <span className="font-semibold text-muted-foreground block mb-0.5">Tasks planned today</span>
              <p className="text-foreground font-bold">{plannedTasks.length} items</p>
            </div>

            <div>
              <span className="font-semibold text-muted-foreground block mb-0.5 font-mono text-[10px] uppercase">Completed Today</span>
              <p className="text-emerald-600 font-bold">{plannedTasks.filter((t: any) => t.status === "completed" || t.status === "done").length} items</p>
            </div>

            <div className="border-t border-border pt-4">
              <Link
                href={`/dashboard/work-management/team/${employeeId}`}
                className="w-full inline-flex items-center justify-center bg-accent text-foreground hover:bg-accent/80 font-bold py-2 px-3 rounded-lg border border-border transition text-center"
              >
                Return to Work Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
