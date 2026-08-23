"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import {
  getMyDayData,
  addTaskToMyDay,
  removeTaskFromMyDay,
  reorderMyDayTasks,
  generateDailyUpdateDraftText,
} from "@/app/actions/projects/work-management-myday.action";
import {
  startWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  endWorkSession,
  switchWorkSessionTask,
} from "@/app/actions/projects/work-session.action";
import { createTask, updateTask } from "@/app/actions/system/task.action";
import { createDailyUpdateDraft } from "@/app/actions/projects/activity-report.action";
import {
  FiCheckSquare,
  FiClock,
  FiPlay,
  FiPause,
  FiPlus,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiAlertCircle,
  FiCornerDownRight,
  FiTrendingUp,
  FiFileText,
  FiStar,
  FiCalendar,
} from "react-icons/fi";
import { toast } from "sonner";
import Link from "next/link";

interface Props {
  initialData: any;
  currentUser: any;
}

export default function MyDayView({ initialData, currentUser }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Dialogs / Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  // New Task Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProjId, setTaskProjId] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Daily Update Form Prefill
  const [updateCompleted, setUpdateCompleted] = useState("");
  const [updatePending, setUpdatePending] = useState("");
  const [updateBlocked, setUpdateBlocked] = useState("");
  const [updateNewWork, setUpdateNewWork] = useState("");
  const [updateSummary, setUpdateSummary] = useState("");

  const { socket, isConnected } = useSocket();

  // Active Session Counter state
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const refreshMyDay = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getMyDayData();
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to load My Day data");
    }
    setLoading(false);
  }, []);

  // Sync state over WebSocket
  useEffect(() => {
    if (!socket) return;
    socket.emit("join_room", { room: `user:${currentUser.id}` });
    socket.emit("join_room", { room: "work-management:dashboard" });

    const handleSync = () => {
      refreshMyDay(true);
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
      socket.emit("leave_room", { room: `user:${currentUser.id}` });
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
  }, [socket, currentUser.id, refreshMyDay]);

  // Session timer ticker
  useEffect(() => {
    if (!data?.workSession || data.workSession.status !== "ACTIVE") {
      setSecondsElapsed(0);
      return;
    }

    // Find the latest start/resume timestamp in logs
    const activeLogs = data.workSession.logs.filter(
      (log: any) => log.actionType === "START" || log.actionType === "RESUME"
    );

    if (activeLogs.length === 0) return;

    const latestActiveLog = activeLogs[activeLogs.length - 1];
    const startTimeMs = new Date(latestActiveLog.timestamp).getTime();
    
    // Accumulate past active millisecond slices
    let pastActiveMs = data.workSession.totalActiveMs;

    const interval = setInterval(() => {
      const liveSlice = Date.now() - startTimeMs;
      const totalSec = Math.floor((pastActiveMs + liveSlice) / 1000);
      setSecondsElapsed(totalSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.workSession]);

  if (!data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <FiClock className="h-8 w-8 animate-spin text-primary" />
        <p>Loading your My Day desk...</p>
      </div>
    );
  }

  const { plannedTasks, availableToPlan, newWorkToday, stats, workSession, dateStr } = data;

  // Find currently active task from session logs
  const getCurrentlyWorkingTask = () => {
    if (!workSession || workSession.status !== "ACTIVE") return null;
    const activeLogs = workSession.logs.filter(
      (log: any) => log.actionType === "START" || log.actionType === "RESUME"
    );
    if (activeLogs.length === 0) return null;
    const latest = activeLogs[activeLogs.length - 1];
    if (!latest.taskId) return null;
    return plannedTasks.find((t: any) => t.id === latest.taskId) || { id: latest.taskId, title: "Context Focus Work" };
  };

  const currentTask = getCurrentlyWorkingTask();

  // Session Handlers
  const handleStartSession = async (taskId?: string, projectId?: string) => {
    const res = await startWorkSession(taskId, projectId);
    if (res.success) {
      toast.success("Work session started!");
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to start session");
    }
  };

  const handlePauseSession = async () => {
    const res = await pauseWorkSession();
    if (res.success) {
      toast.success("Work session paused (On Break).");
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to pause session");
    }
  };

  const handleResumeSession = async (taskId?: string, projectId?: string) => {
    const res = await resumeWorkSession(taskId, projectId);
    if (res.success) {
      toast.success("Work session resumed.");
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to resume session");
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to end today's work session? This action is final.")) return;
    const res = await endWorkSession();
    if (res.success) {
      toast.success("Work session completed!");
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to end session");
    }
  };

  const handleSwitchFocusTask = async (taskId: string, projectId: string | null) => {
    if (!workSession) {
      // If no session started yet, start it with this task context
      await handleStartSession(taskId, projectId || undefined);
      return;
    }

    if (workSession.status === "BREAK") {
      // Resume session with new task context
      await handleResumeSession(taskId, projectId || undefined);
      return;
    }

    if (workSession.status === "ACTIVE") {
      const res = await switchWorkSessionTask(taskId, projectId);
      if (res.success) {
        toast.success(`Focused current work to task context.`);
        refreshMyDay();
      } else {
        toast.error(res.error || "Failed to switch task focus");
      }
    }
  };

  // Plan modifiers
  const handleAddToPlan = async (taskId: string) => {
    const res = await addTaskToMyDay(taskId);
    if (res.success) {
      toast.success("Task added to today's plan");
      setIsAddOpen(false);
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to add task");
    }
  };

  const handleRemoveFromPlan = async (taskId: string) => {
    const res = await removeTaskFromMyDay(taskId);
    if (res.success) {
      toast.success("Task removed from today's plan");
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to remove task");
    }
  };

  const handleShiftPriorityOrder = async (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= plannedTasks.length) return;

    const reordered = [...plannedTasks];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;

    const taskIds = reordered.map((t) => t.id);
    const res = await reorderMyDayTasks(taskIds);
    if (res.success) {
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to save reorder priority");
    }
  };

  // Task Status modifier
  const handleTaskStatusUpdate = async (taskId: string, status: string) => {
    const res = await updateTask(taskId, { status });
    if (res.success) {
      toast.success("Task status updated");
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to update task status");
    }
  };

  // Create Task Drawer Form
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    startTransition(async () => {
      const res = await createTask({
        title: taskTitle,
        description: taskDesc || undefined,
        projectId: taskProjId || undefined,
        priority: taskPriority,
        dueDate: taskDueDate ? new Date(taskDueDate) : undefined,
        assigneeId: currentUser.id,
        status: "todo",
      });

      if (res.success && res.task) {
        // Automatically add newly created task to today's plan
        await addTaskToMyDay(res.task.id);
        toast.success("Task created and planned for today!");
        setIsCreateOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        setTaskProjId("");
        setTaskPriority("medium");
        setTaskDueDate("");
        refreshMyDay();
      } else {
        toast.error(res.error || "Failed to create task");
      }
    });
  };

  // Prefill Suggestions & Open Daily Update Dialog Modal
  const handlePrefillDailyReport = async () => {
    const res = await generateDailyUpdateDraftText();
    if (res.success && res.draft) {
      setUpdateCompleted(res.draft.completed);
      setUpdatePending(res.draft.pending);
      setUpdateBlocked(res.draft.blocked);
      setUpdateNewWork(res.draft.newWork);
      setUpdateSummary(res.draft.summary);
      setIsUpdateOpen(true);
    } else {
      toast.error("Failed to generate draft details from My Day");
    }
  };

  const handleDailyUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createDailyUpdateDraft({
        completedTasks: updateCompleted,
        pendingTasks: updatePending,
        blockedTasks: updateBlocked,
        newTasksToday: updateNewWork,
        summary: updateSummary,
      });

      if (res.success) {
        toast.success("Daily report submitted successfully!");
        setIsUpdateOpen(false);
        refreshMyDay();
      } else {
        toast.error(res.error || "Failed to submit daily report");
      }
    });
  };

  // Helper formatting session clock string
  const formatSeconds = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Desk Row */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            My Day Workspace
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 font-semibold">
            <FiCalendar className="text-primary" />
            <span>Today: {dateStr} (Dhaka Standard Time)</span>
          </div>
        </div>

        {/* Live Work Session Status Controls */}
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Session Timer</span>
            <span className="font-mono text-base font-extrabold text-foreground tracking-tight">
              {workSession && workSession.status === "ACTIVE"
                ? formatSeconds(secondsElapsed)
                : workSession
                ? formatSeconds(Math.floor(workSession.totalActiveMs / 1000))
                : "00:00:00"}
            </span>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex items-center gap-2">
            {!workSession && (
              <button
                onClick={() => handleStartSession()}
                className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
              >
                <FiPlay /> Start Work
              </button>
            )}

            {workSession && workSession.status === "ACTIVE" && (
              <>
                <button
                  onClick={handlePauseSession}
                  className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
                >
                  <FiPause /> Pause Break
                </button>
                <button
                  onClick={handleEndSession}
                  className="inline-flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
                >
                  Stop Session
                </button>
              </>
            )}

            {workSession && workSession.status === "BREAK" && (
              <>
                <button
                  onClick={() => handleResumeSession()}
                  className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
                >
                  <FiPlay /> Resume Work
                </button>
                <button
                  onClick={handleEndSession}
                  className="inline-flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
                >
                  Stop Session
                </button>
              </>
            )}

            {workSession && workSession.status === "COMPLETED" && (
              <span className="text-xs bg-accent/25 text-muted-foreground font-bold px-3 py-1.5 rounded-lg border border-border">
                Session Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Currently Working Focus Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-blue-500/5 to-indigo-500/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentTask ? "bg-emerald-400" : "bg-zinc-400"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentTask ? "bg-emerald-500" : "bg-zinc-500"}`} />
            </span>
            <span className="text-[10px] text-primary uppercase font-extrabold tracking-wider">Currently Focused Work Item</span>
          </div>
          <h2 className="text-sm font-extrabold text-foreground">
            {currentTask ? currentTask.title : "No task started. Click Focus in today's plan to start working."}
          </h2>
          {currentTask && (
            <p className="text-[11px] text-muted-foreground">
              Project: <span className="font-semibold text-foreground">{currentTask.projectName || "General"}</span>
            </p>
          )}
        </div>

        {currentTask && workSession && workSession.status === "ACTIVE" && (
          <button
            onClick={handlePauseSession}
            className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold py-1.5 px-3.5 rounded-lg transition self-start md:self-center"
          >
            <FiPause /> Pause Work
          </button>
        )}
      </div>

      {/* Main Split Body: Today's Plan Checklist vs Stats Overview */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Today's Plan Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight uppercase">Today's Focus List</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/80 text-foreground text-[11px] font-bold px-3 py-1.5 rounded-lg border border-border shadow-xs transition"
              >
                <FiPlus /> Add Task
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs transition"
              >
                <FiPlus /> Create Task
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
            {plannedTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground italic text-xs">
                You haven't planned any work for today. Click Add Task or Create Task above to get started.
              </div>
            ) : (
              plannedTasks.map((t: any, index: number) => {
                const isCurrent = currentTask?.id === t.id;
                return (
                  <div key={t.id} className={`p-4 flex items-center justify-between gap-4 transition ${isCurrent ? "bg-primary/5" : ""}`}>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Status workflow dropdown */}
                        <select
                          value={t.status}
                          onChange={(e) => handleTaskStatusUpdate(t.id, e.target.value)}
                          className="rounded border border-border bg-background py-0.5 px-2 text-[10px] font-bold"
                        >
                          <option value="new">New</option>
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>

                        <span className="text-xs font-bold text-foreground truncate">{t.title}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{t.projectName}</span>
                        <span>•</span>
                        <span className="capitalize">Priority: {t.priority}</span>
                        {t.dueDate && (
                          <>
                            <span>•</span>
                            <span className={new Date(t.dueDate) < new Date() && t.status !== "completed" ? "text-rose-500 font-semibold" : ""}>
                              Due: {t.dueDate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Focus working selector button */}
                      {workSession && workSession.status === "ACTIVE" && !isCurrent && (
                        <button
                          onClick={() => handleSwitchFocusTask(t.id, t.projectId)}
                          className="inline-flex items-center gap-1 bg-accent hover:bg-accent/80 text-foreground text-[10px] font-bold py-1 px-2.5 rounded-lg border border-border shadow-xs transition"
                        >
                          <FiPlay className="text-emerald-500" /> Focus
                        </button>
                      )}

                      {/* Priority Ordering buttons */}
                      <button
                        disabled={index === 0}
                        onClick={() => handleShiftPriorityOrder(index, "up")}
                        className="p-1 rounded hover:bg-accent disabled:opacity-40"
                      >
                        <FiArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={index === plannedTasks.length - 1}
                        onClick={() => handleShiftPriorityOrder(index, "down")}
                        className="p-1 rounded hover:bg-accent disabled:opacity-40"
                      >
                        <FiArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Remove from My Day */}
                      <button
                        onClick={() => handleRemoveFromPlan(t.id)}
                        className="p-1 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-600"
                        title="Remove from My Day"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Stats Summary & End of Day Form trigger */}
        <div className="space-y-6">
          {/* Progress indicators */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Progress Status</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-accent/30 rounded-lg p-3 text-center">
                <span className="block text-xl font-extrabold text-foreground">{stats.totalPlanned}</span>
                <span className="text-[10px] text-muted-foreground">Total Planned</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center text-emerald-800">
                <span className="block text-xl font-extrabold">{stats.completed}</span>
                <span className="text-[10px] text-emerald-600">Completed</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center text-blue-850">
                <span className="block text-xl font-extrabold">{stats.inProgress}</span>
                <span className="text-[10px] text-blue-600">In Progress</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-center text-rose-800">
                <span className="block text-xl font-extrabold">{stats.blocked}</span>
                <span className="text-[10px] text-rose-600">Blocked</span>
              </div>
            </div>

            {/* End of day Daily Update CTA */}
            {workSession && (
              <button
                onClick={handlePrefillDailyReport}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-primary-foreground text-xs font-bold py-2.5 px-4 rounded-lg shadow-md transition"
              >
                <FiFileText /> Generate Daily Report
              </button>
            )}
          </div>

          {/* New Work Arrived Section */}
          {newWorkToday.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FiAlertCircle className="text-amber-500" /> New Work Arrived Today
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                  Action Need
                </span>
              </div>

              <div className="divide-y divide-border text-xs">
                {newWorkToday.map((t: any) => (
                  <div key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{t.projectName}</p>
                    </div>
                    <button
                      onClick={() => handleAddToPlan(t.id)}
                      className="bg-accent hover:bg-accent/80 text-[10px] font-bold py-1 px-2.5 rounded-lg border border-border whitespace-nowrap"
                    >
                      Add to Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog 1: Add existing task popup */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Select Tasks for Today's Plan</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-border text-xs">
              {availableToPlan.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground italic">No assigned tasks left to plan.</p>
              ) : (
                availableToPlan.map((t: any) => (
                  <div key={t.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.projectName} • Priority: <span className="capitalize">{t.priority}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToPlan(t.id)}
                      className="bg-primary text-primary-foreground text-[10px] font-bold py-1 px-3 rounded-lg hover:bg-primary/95 transition"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog 2: Create new task drawer modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Create Task & Add to Plan</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Description</label>
                <textarea
                  placeholder="Task context description..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Project Relation</label>
                <select
                  value={taskProjId}
                  onChange={(e) => setTaskProjId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">General Work (No Project)</option>
                  {initialData.projects?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 hover:bg-accent font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 font-semibold"
                >
                  {isPending ? "Creating..." : "Create & Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog 3: Prefill Suggestions & Daily Update submission */}
      {isUpdateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Prepare Daily Update Report</h3>
              <button
                onClick={() => setIsUpdateOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDailyUpdateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Completed Tasks</label>
                <textarea
                  value={updateCompleted}
                  onChange={(e) => setUpdateCompleted(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Pending / Carry-over Tasks</label>
                <textarea
                  value={updatePending}
                  onChange={(e) => setUpdatePending(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Blocked Tasks</label>
                <textarea
                  value={updateBlocked}
                  onChange={(e) => setUpdateBlocked(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Summary Explanation *</label>
                <textarea
                  required
                  value={updateSummary}
                  onChange={(e) => setUpdateSummary(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUpdateOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 hover:bg-accent font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 font-semibold"
                >
                  {isPending ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
