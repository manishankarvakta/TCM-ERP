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
import { submitDailyUpdate } from "@/app/actions/crm/activity-report.action";
import { getProjects, getProjectById } from "@/app/actions/projects/project.action";
import {
  Play,
  Pause,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ChevronDown,
  PlusCircle,
  CheckSquare,
  AlertTriangle,
  FileText,
  Tag,
  Milestone,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  initialData: any;
  currentUser: any;
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
        text: "text-rose-700 dark:text-rose-455",
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
        bg: "bg-slate-50 dark:bg-slate-900/30 text-slate-650 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/40",
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
  const [taskMilestoneId, setTaskMilestoneId] = useState("");
  const [taskParentId, setTaskParentId] = useState("");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Loaded metadata for composer
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);

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

  // Fetch projects list for task composer
  useEffect(() => {
    async function loadProjects() {
      const res = await getProjects(1, 100);
      if (res.success && res.projects) {
        setProjectsList(res.projects);
      }
    }
    if (isCreateOpen) {
      loadProjects();
    }
  }, [isCreateOpen]);

  // Fetch project-specific milestones dynamically
  useEffect(() => {
    async function loadMilestones() {
      if (!taskProjId) {
        setMilestonesList([]);
        setTaskMilestoneId("");
        return;
      }
      const res = await getProjectById(taskProjId);
      if (res.success && res.project?.Milestones) {
        setMilestonesList(res.project.Milestones);
      } else {
        setMilestonesList([]);
      }
      setTaskMilestoneId("");
    }
    loadMilestones();
  }, [taskProjId]);

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

    const activeLogs = data.workSession.logs.filter(
      (log: any) => log.actionType === "START" || log.actionType === "RESUME"
    );

    if (activeLogs.length === 0) return;

    const latestActiveLog = activeLogs[activeLogs.length - 1];
    const startTimeMs = new Date(latestActiveLog.timestamp).getTime();
    
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
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade-in">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading workspace...</p>
      </div>
    );
  }

  const { plannedTasks, availableToPlan, newWorkToday, stats, workSession, dateStr } = data;

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
      await handleStartSession(taskId, projectId || undefined);
      return;
    }

    if (workSession.status === "BREAK") {
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

  const handleTaskStatusUpdate = async (taskId: string, status: string) => {
    const res = await updateTask(taskId, { status });
    if (res.success) {
      toast.success("Task status updated");
      refreshMyDay();
    } else {
      toast.error(res.error || "Failed to update task status");
    }
  };

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
        milestoneId: taskMilestoneId || undefined,
        parentId: taskParentId || undefined,
        estimatedHours: taskEstimatedHours ? parseFloat(taskEstimatedHours) : undefined,
      });

      if (res.success && res.task) {
        await addTaskToMyDay(res.task.id);
        toast.success("Task created and planned for today!");
        setIsCreateOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        setTaskProjId("");
        setTaskPriority("medium");
        setTaskDueDate("");
        setTaskMilestoneId("");
        setTaskParentId("");
        setTaskEstimatedHours("");
        setShowMoreOptions(false);
        refreshMyDay();
      } else {
        toast.error(res.error || "Failed to create task");
      }
    });
  };

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
      const res = await submitDailyUpdate(
        data?.dateStr || new Date().toISOString().split("T")[0],
        {
          completed: updateCompleted,
          pending: updatePending,
          blocked: updateBlocked,
          newWork: updateNewWork,
          summary: updateSummary,
        }
      );

      if (res.success) {
        toast.success("Daily report submitted successfully!");
        setIsUpdateOpen(false);
        refreshMyDay();
      } else {
        toast.error(res.error || "Failed to submit daily report");
      }
    });
  };

  const formatSecondsShort = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`;
  };

  // Filter Blocked and Completed tasks
  const blockedTasksList = plannedTasks.filter((t: any) => t.status === "blocked" || t.status === "waiting");
  const completedTasksList = plannedTasks.filter((t: any) => t.status === "completed" || t.status === "done");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-sm">
      
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Day</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Plan, organize and track your work for today.
          </p>
        </div>

        {/* Header Right Side Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Today Date */}
          <div className="bg-muted/50 border border-border rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Today: {dateStr}</span>
          </div>

          {/* Session Indicator & Clock */}
          <div className="bg-card border border-border rounded-lg p-1.5 px-3 flex items-center gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  workSession && workSession.status === "ACTIVE" ? "bg-blue-450" :
                  workSession && workSession.status === "BREAK" ? "bg-amber-400" : "bg-zinc-400"
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  workSession && workSession.status === "ACTIVE" ? "bg-blue-500" :
                  workSession && workSession.status === "BREAK" ? "bg-amber-500" : "bg-zinc-550"
                }`} />
              </span>
              <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                {workSession && workSession.status === "ACTIVE" ? "Working" :
                 workSession && workSession.status === "BREAK" ? "On Break" :
                 workSession && workSession.status === "COMPLETED" ? "Ended" : "Not Started"}
              </span>
            </div>

            <div className="h-4 w-px bg-border" />

            <span className="font-mono text-xs font-bold text-foreground">
              {workSession && workSession.status === "ACTIVE"
                ? formatSecondsShort(secondsElapsed)
                : workSession
                ? formatSecondsShort(Math.floor(workSession.totalActiveMs / 1000))
                : "00h 00m"}
            </span>
          </div>

          {/* Session Controller buttons */}
          <div className="flex items-center gap-1.5">
            {!workSession && (
              <Button
                size="sm"
                onClick={() => handleStartSession()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition animate-fade-in"
              >
                <Play className="h-3.5 w-3.5" /> Start Work
              </Button>
            )}

            {workSession && workSession.status === "ACTIVE" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePauseSession}
                  className="text-amber-600 border-amber-200 dark:border-amber-900 bg-amber-50/55 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold"
                >
                  <Pause className="h-3.5 w-3.5" /> Break
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleEndSession}
                  className="font-semibold"
                >
                  End Session
                </Button>
              </>
            )}

            {workSession && workSession.status === "BREAK" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleResumeSession()}
                  className="bg-emerald-600 hover:bg-emerald-505 text-white font-semibold"
                >
                  <Play className="h-3.5 w-3.5" /> Resume
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleEndSession}
                  className="font-semibold"
                >
                  End Session
                </Button>
              </>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary text-primary-foreground font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Create Task
          </Button>
        </div>
      </div>

      {/* 2. Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Planned", count: stats.totalPlanned, border: "border-l-amber-500", text: "text-amber-600 dark:text-amber-405" },
          { label: "In Progress", count: stats.inProgress, border: "border-l-blue-500", text: "text-blue-650 dark:text-blue-400" },
          { label: "Completed", count: stats.completed, border: "border-l-emerald-500", text: "text-emerald-650 dark:text-emerald-400" },
          { label: "Blocked", count: stats.blocked, border: "border-l-rose-500", text: "text-rose-600 dark:text-rose-450" },
        ].map((stat, i) => (
          <div
            key={i}
            className={`bg-card border border-border ${stat.border} border-l-2 rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition hover:border-slate-300 dark:hover:border-zinc-700`}
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
            <span className={`text-xl font-bold mt-1 ${stat.text}`}>
              {stat.count}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Currently Working focused banner */}
      <div className="bg-blue-50/40 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/30 border-l-blue-500 border-l-2 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentTask ? "bg-blue-400" : "bg-zinc-400"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentTask ? "bg-blue-500" : "bg-zinc-500"}`} />
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider">
              Currently Working Focus Item
            </span>
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            {currentTask ? currentTask.title : "No focus active. Click 'Focus' in the task list below to track time on a specific task."}
          </h2>
          {currentTask && currentTask.projectName && (
            <p className="text-[11px] text-muted-foreground">
              Project: <span className="font-semibold text-foreground">{currentTask.projectName}</span>
            </p>
          )}
        </div>

        {currentTask && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTaskStatusUpdate(currentTask.id, "completed")}
              className="text-emerald-600 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
            </Button>
            {workSession && workSession.status === "ACTIVE" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePauseSession}
                className="text-amber-600 border-amber-200 dark:border-amber-900 bg-amber-50/40 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold"
              >
                <Pause className="h-3.5 w-3.5" /> Pause focus
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 4. Main Split: Today's Plan vs Sidebar lists */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3 items-start">
        
        {/* Left Side: Today's Plan list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Today's Plan</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Your planned focus tasks for today.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddOpen(true)}
                className="h-8 text-[11px] font-semibold border-border bg-card text-foreground"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Task
              </Button>
            </div>
          </div>

          <div className="space-y-2.5">
            {plannedTasks.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-8 text-center bg-card text-muted-foreground flex flex-col items-center gap-2 justify-center shadow-xs">
                <CheckSquare className="h-6 w-6 text-muted-foreground/60 stroke-[1.5]" />
                <p className="text-xs font-medium">No tasks planned for today.</p>
                <p className="text-[10px] text-muted-foreground max-w-xs leading-normal">
                  Add an existing task or create a new one to establish today's focus list.
                </p>
                <Button size="sm" onClick={() => setIsAddOpen(true)} className="mt-2 text-[11px] h-7 px-3">
                  Select Tasks
                </Button>
              </div>
            ) : (
              plannedTasks.map((t: any, index: number) => {
                const isCurrent = currentTask?.id === t.id;
                const statusInfo = getStatusDetails(t.status);
                const priorityInfo = getPriorityDetails(t.priority);
                
                return (
                  <div
                    key={t.id}
                    className={`group py-2.5 px-3 border border-border rounded-xl bg-card flex items-center justify-between gap-3 transition-all duration-150 hover:bg-muted/30 hover:border-slate-300 dark:hover:border-zinc-700 ${
                      isCurrent ? "border-blue-500/30 ring-1 ring-blue-500/20" : ""
                    }`}
                  >
                    
                    {/* Shift Priority controllers & Index */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex flex-col">
                        <button
                          disabled={index === 0}
                          onClick={() => handleShiftPriorityOrder(index, "up")}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20 transition"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          disabled={index === plannedTasks.length - 1}
                          onClick={() => handleShiftPriorityOrder(index, "down")}
                          className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-20 transition"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground w-4 text-center">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Task Title & Project Tags */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-semibold text-xs text-foreground truncate block max-w-sm ${t.status === "completed" || t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {t.title}
                        </span>
                        {t.projectName && (
                          <span className="shrink-0 bg-secondary text-secondary-foreground border border-border px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            {t.projectName}
                          </span>
                        )}
                      </div>

                      {/* Priorities & Due Info */}
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border ${priorityInfo.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityInfo.dot}`} />
                          {priorityInfo.label}
                        </span>

                        {t.dueDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span className={new Date(t.dueDate) < new Date() && t.status !== "completed" ? "text-rose-500 font-bold" : "font-medium"}>
                              Due: {t.dueDate}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right action control stack */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      
                      {/* Custom dropdown styled picker */}
                      <div className="relative">
                        <select
                          value={t.status}
                          onChange={(e) => handleTaskStatusUpdate(t.id, e.target.value)}
                          className={`appearance-none bg-card border ${statusInfo.border} ${statusInfo.text} text-[10px] font-bold rounded-lg pl-6 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 select-none cursor-pointer`}
                        >
                          <option value="new">New</option>
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                        <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                      </div>

                      {/* Quick Focus Button */}
                      {workSession && workSession.status === "ACTIVE" && (
                        isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 px-2 py-1 rounded-lg">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Active Focus
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchFocusTask(t.id, t.projectId)}
                            className="inline-flex items-center gap-1 hover:bg-muted text-[10px] font-bold py-1 px-2 rounded-lg border border-border bg-card text-foreground transition"
                          >
                            <Play className="h-3 w-3 text-emerald-500" /> Focus
                          </button>
                        )
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFromPlan(t.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 text-muted-foreground hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                        title="Remove from My Day"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Sidebar Panels */}
        <div className="space-y-6">
          
          {/* New Work Arrived Section */}
          {newWorkToday.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs transition hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="text-blue-500 h-3.5 w-3.5" /> New Work Arrived
                </h3>
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  🆕 New Today
                </span>
              </div>

              <div className="divide-y divide-border text-xs">
                {newWorkToday.map((t: any) => (
                  <div key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t.projectName}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddToPlan(t.id)}
                      className="h-7 text-[10px] font-semibold px-2 py-0"
                    >
                      Add to Plan
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked / Needs Attention */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs transition hover:border-slate-300 dark:hover:border-zinc-700">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2">
              <AlertTriangle className="text-rose-500 h-3.5 w-3.5" /> Needs Attention
            </h3>
            
            {blockedTasksList.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-2">
                You're clear. No blocked tasks.
              </p>
            ) : (
              <div className="space-y-3">
                {blockedTasksList.map((t: any) => (
                  <div key={t.id} className="border border-border/80 rounded-lg p-2.5 bg-rose-50/5 dark:bg-rose-950/5 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-bold text-xs text-foreground truncate block max-w-[180px]">
                        {t.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium pl-3">
                      Status: Blocked / Waiting on dependency.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Today list */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs transition hover:border-slate-350 dark:hover:border-zinc-700">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2">
              <CheckCircle2 className="text-emerald-500 h-3.5 w-3.5" /> Completed Today
            </h3>

            {completedTasksList.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-2">
                No tasks completed yet today.
              </p>
            ) : (
              <div className="space-y-2">
                {completedTasksList.map((t: any) => (
                  <div key={t.id} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground line-through decoration-muted-foreground/60 truncate">
                        {t.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{t.projectName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Activity Update Form CTA */}
          {workSession && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs transition hover:border-slate-350 dark:hover:border-zinc-700">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="text-primary h-3.5 w-3.5" /> End of Day Update
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ready to wrap up? Prepare your daily work summary to submit for admin review.
              </p>
              <Button
                onClick={handlePrefillDailyReport}
                className="w-full bg-primary text-primary-foreground font-semibold text-xs py-2"
              >
                Generate Daily Report
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* dialog 1: Add existing task picker */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Select Tasks for Today's Plan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose from active outstanding tasks assigned to you.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto divide-y divide-border text-xs pr-1">
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
                  <Button
                    onClick={() => handleAddToPlan(t.id)}
                    size="sm"
                    className="text-[11px] h-7 px-3 font-semibold"
                  >
                    Add to My Day
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* dialog 2: Redesigned Task Composer */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Create Task & Add to Plan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Quickly compose a task and schedule it directly into today's My Day checklist.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
            
            {/* Title */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Task Title *</label>
              <input
                type="text"
                required
                placeholder="What needs to be done?"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Description</label>
              <textarea
                placeholder="Add context or notes..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition resize-none"
              />
            </div>

            {/* Grid: Project & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Project Relation</label>
                <select
                  value={taskProjId}
                  onChange={(e) => setTaskProjId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                >
                  <option value="">General Work (No Project)</option>
                  {projectsList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Grid: Due Date & Assignee info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Assignee</label>
                <div className="w-full rounded-lg border border-input bg-muted/35 py-2 px-3 text-xs font-semibold text-muted-foreground flex items-center gap-1.5 select-none">
                  <User className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>Assign to Myself ({currentUser.name || currentUser.email})</span>
                </div>
              </div>
            </div>

            {/* Collapsible + More options section */}
            <div className="border border-border rounded-lg bg-muted/10">
              <button
                type="button"
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="w-full flex items-center justify-between p-2.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition select-none"
              >
                <span>{showMoreOptions ? "− Hide options" : "+ More options (Milestone, Parent, Hours)"}</span>
                <ChevronDown className={`h-3.5 w-3.5 transform transition-transform duration-200 ${showMoreOptions ? "rotate-180" : ""}`} />
              </button>

              {showMoreOptions && (
                <div className="p-3 pt-0 border-t border-border/60 space-y-3 bg-card rounded-b-lg transition animate-fade-in">
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground flex items-center gap-1">
                        <Milestone className="h-3 w-3" /> Milestone
                      </label>
                      <select
                        disabled={!taskProjId}
                        value={taskMilestoneId}
                        onChange={(e) => setTaskMilestoneId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition disabled:opacity-50 disabled:bg-muted/10"
                      >
                        <option value="">None (Select Project first)</option>
                        {milestonesList.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Estimated Hours
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 4.5"
                        value={taskEstimatedHours}
                        onChange={(e) => setTaskEstimatedHours(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Parent Task
                    </label>
                    <select
                      value={taskParentId}
                      onChange={(e) => setTaskParentId(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                    >
                      <option value="">None (Standalone Task)</option>
                      {plannedTasks.map((pt: any) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>To set dependencies or links, please edit the task in the central Task Center.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="font-semibold h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground font-semibold h-8"
              >
                {isPending ? "Creating..." : "Create & Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog 3: Daily report modal */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Prepare Daily Update Report</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm your achievements, blocked items, and plans for tomorrow.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDailyUpdateSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Completed Tasks</label>
              <textarea
                value={updateCompleted}
                onChange={(e) => setUpdateCompleted(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Pending / Carry-over Tasks</label>
              <textarea
                value={updatePending}
                onChange={(e) => setUpdatePending(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Blocked Tasks</label>
              <textarea
                value={updateBlocked}
                onChange={(e) => setUpdateBlocked(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Summary Explanation *</label>
              <textarea
                required
                value={updateSummary}
                onChange={(e) => setUpdateSummary(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateOpen(false)}
                className="font-semibold h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground font-semibold h-8"
              >
                {isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
