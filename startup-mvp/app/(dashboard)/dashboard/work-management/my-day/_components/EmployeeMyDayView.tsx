"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { 
  getEmployeeMyDayData, 
  addTaskToMyDay, 
  removeTaskFromMyDay 
} from "@/app/actions/projects/work-management-myday.action";
import { createTask, updateTask } from "@/app/actions/system/task.action";
import { getProjects, getProjectById } from "@/app/actions/projects/project.action";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Calendar,
  User,
  Play,
  Pause,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Tag,
  Milestone,
  PlusCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDateParam = searchParams.get("date") || "";

  const todayDateStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const isToday = !currentDateParam || currentDateParam === todayDateStr;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form Fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProjId, setTaskProjId] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskMilestoneId, setTaskMilestoneId] = useState("");
  const [taskParentId, setTaskParentId] = useState("");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Loaded lists
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);

  // Edit Task Form
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editProjId, setEditProjId] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editMilestoneId, setEditMilestoneId] = useState("");
  const [editMilestonesList, setEditMilestonesList] = useState<any[]>([]);

  const projectOptions = React.useMemo(() => {
    return [
      { label: "General Work (No Project)", value: "none" },
      ...projectsList.map((p: any) => ({
        label: p.title,
        value: p.id,
      })),
    ];
  }, [projectsList]);

  // Sync initialData to state on navigation
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleDateChange = (newDateStr: string) => {
    if (!newDateStr) return;
    router.push(`/dashboard/work-management/my-day/${employeeId}?date=${newDateStr}`);
  };

  const handlePrevDay = () => {
    const d = new Date(data.dateStr);
    d.setDate(d.getDate() - 1);
    const prevDateStr = d.toISOString().split("T")[0];
    router.push(`/dashboard/work-management/my-day/${employeeId}?date=${prevDateStr}`);
  };

  const handleNextDay = () => {
    const d = new Date(data.dateStr);
    d.setDate(d.getDate() + 1);
    const nextDateStr = d.toISOString().split("T")[0];
    router.push(`/dashboard/work-management/my-day/${employeeId}?date=${nextDateStr}`);
  };

  const refreshEmployeeMyDay = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getEmployeeMyDayData(employeeId, currentDateParam || undefined);
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to update employee plan data");
    }
    setLoading(false);
  }, [employeeId]);

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

  // Fetch project-specific milestones dynamically for edit form
  useEffect(() => {
    async function loadEditMilestones() {
      if (!editProjId) {
        setEditMilestonesList([]);
        setEditMilestoneId("");
        return;
      }
      const res = await getProjectById(editProjId);
      if (res.success && res.project?.Milestones) {
        setEditMilestonesList(res.project.Milestones);
      } else {
        setEditMilestonesList([]);
      }
      if (editingTask && editingTask.projectId !== editProjId) {
        setEditMilestoneId("");
      }
    }
    loadEditMilestones();
  }, [editProjId, editingTask]);

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
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
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
        assigneeId: employeeId,
        status: "todo",
        milestoneId: taskMilestoneId || undefined,
        parentId: taskParentId || undefined,
        estimatedHours: taskEstimatedHours ? parseFloat(taskEstimatedHours) : undefined,
      });

      if (res.success && res.task) {
        await addTaskToMyDay(res.task.id, undefined, employeeId);
        toast.success(`Task created and planned for ${employeeName}!`);
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
        refreshEmployeeMyDay();
      } else {
        toast.error(res.error || "Failed to create task");
      }
    });
  };

  const handleOpenEditModal = (task: any) => {
    setEditingTask(task);
    setEditTitle(task.title || "");
    setEditDesc(task.description || "");
    setEditProjId(task.projectId || "");
    setEditPriority(task.priority || "medium");
    setEditDueDate(task.dueDate || "");
    setEditMilestoneId(task.milestoneId || "");
    setIsEditOpen(true);
  };

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const res = await updateTask(editingTask.id, {
        title: editTitle,
        description: editDesc,
        projectId: editProjId || null,
        priority: editPriority,
        dueDate: editDueDate ? new Date(editDueDate) : null,
        milestoneId: editMilestoneId || null,
      });

      if (res.success) {
        toast.success("Task updated successfully");
        setIsEditOpen(false);
        refreshEmployeeMyDay(true);
      } else {
        toast.error(res.error || "Failed to update task");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  return (
    <div className="max-w-full w-full px-6 pt-0 pb-6 space-y-6 animate-fade-in text-sm">
      
      {/* Past Date Banner */}
      {!isToday && (
        <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-800 dark:text-amber-300 text-xs font-semibold animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-sm text-foreground">Viewing Past Workspace Logs</p>
              <p className="mt-0.5 text-muted-foreground">
                You are currently viewing {employeeName}'s workspace history for <span className="font-extrabold text-amber-600 dark:text-amber-400">{data.dateStr}</span>. Administrative modifications are restricted on past logs.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/work-management/my-day/${employeeId}`)}
            className="border-amber-500/30 hover:bg-amber-500/10 text-xs h-8 px-4 rounded-xl font-bold cursor-pointer shrink-0 self-start sm:self-center"
          >
            Return to Today
          </Button>
        </div>
      )}
      {/* Header Banner */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" /> {employeeName}'s Workspace Plan
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manager monitoring viewport. Administrative control enabled.
          </p>
        </div>

        {/* Live Work Session Status Summary */}
        <div className="flex items-center gap-3">
          {/* Date Selector Navigation */}
          <div className="flex items-center gap-1 bg-muted/30 border border-border rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              title="Previous Day"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            
            <div className="flex items-center gap-1.5 px-2 text-xs font-extrabold text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={data.dateStr}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer focus:ring-0 w-24 p-0"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              title="Next Day"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

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
                {workSession ? formatMs(workSession.totalActiveMs) : "00h 00m 00s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3 items-start">
        {/* Planned checklist table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-foreground uppercase tracking-wider">Today's Focus List</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Work schedule chosen by employee for today.</p>
            </div>
            {isToday && (
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 h-10 shadow-sm rounded-xl transition duration-200 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Plan Task
              </Button>
            )}
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
                    className="py-3.5 px-4 border border-border rounded-2xl bg-card flex items-center justify-between gap-4 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground w-4">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={`font-bold text-sm text-foreground truncate block max-w-sm ${t.status === "completed" || t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {t.title}
                        </span>
                        {t.projectName && (
                          <span className="shrink-0 bg-secondary text-secondary-foreground border border-border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            {t.projectName}
                          </span>
                        )}
                      </div>

                      {/* Priorities */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-5 font-semibold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${priorityInfo.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${priorityInfo.dot}`} />
                          {priorityInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="shrink-0 flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-extrabold ${statusInfo.bg} ${statusInfo.border} ${statusInfo.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>

                      {/* Edit Button for Admin */}
                      {isToday && (
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                          title="Edit Task"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {/* Remove Button for Admin */}
                      {isToday && (
                        <button
                          onClick={async () => {
                            const res = await removeTaskFromMyDay(t.id, undefined, employeeId);
                            if (res.success) {
                              toast.success("Task removed from daily plan.");
                              refreshEmployeeMyDay();
                            } else {
                              toast.error(res.error || "Failed to remove task");
                            }
                          }}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-500 transition"
                          title="Remove from Daily Plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Workspace details sidebar panel */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs transition hover:border-slate-350 dark:hover:border-zinc-700 text-sm">
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider border-b border-border pb-2">
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
              <Link href={`/dashboard/work-management/team`}>
                <Button variant="secondary" className="w-full font-bold h-10 text-sm rounded-xl">
                  Return to Work Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* dialog: Edit Task for target employee */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border overflow-hidden rounded-2xl p-0">
          <DialogHeader className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-6 pb-5">
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Edit className="h-5 w-5 animate-pulse" /> Edit Task
            </DialogTitle>
            <DialogDescription className="text-xs text-purple-100 font-medium">
              Modify the details of this planned task.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditTaskSubmit} className="space-y-4 text-xs p-6">
            {/* Title */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Task Title *</label>
              <input
                type="text"
                required
                placeholder="What needs to be done?"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Description</label>
              <textarea
                placeholder="Add context or notes..."
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition resize-none"
              />
            </div>

            {/* Grid: Project & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Project Relation</label>
                <SearchableSelect
                  options={projectOptions}
                  value={editProjId || "none"}
                  onValueChange={(val) => setEditProjId(val === "none" || !val ? "" : val)}
                  placeholder="Select project"
                  searchPlaceholder="Search project..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Priority</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="w-full bg-background border border-input rounded-lg h-9 text-xs justify-between">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid: Due Date & Milestone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground flex items-center gap-1">
                  <Milestone className="h-3 w-3" /> Milestone
                </label>
                <Select value={editMilestoneId || "none"} onValueChange={(val) => setEditMilestoneId(val === "none" ? "" : val)}>
                  <SelectTrigger className="w-full bg-background border border-input rounded-lg h-9 text-xs justify-between" disabled={!editProjId}>
                    <SelectValue placeholder="Select milestone" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="none">No Milestone</SelectItem>
                    {editMilestonesList.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="font-semibold h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground font-semibold h-8"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog: Quick Create Task for target employee */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border overflow-hidden rounded-2xl p-0">
          <DialogHeader className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-6 pb-5">
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <PlusCircle className="h-5 w-5 animate-pulse" /> Plan Task for {employeeName}
            </DialogTitle>
            <DialogDescription className="text-xs text-purple-100 font-medium">
              Create a new task and automatically add it to this employee's active checklist.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs p-6">
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
                <SearchableSelect
                  options={projectOptions}
                  value={taskProjId || "none"}
                  onValueChange={(val) => setTaskProjId(val === "none" || !val ? "" : val)}
                  placeholder="Select project"
                  searchPlaceholder="Search project..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Priority</label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger className="w-full bg-background border border-input rounded-lg h-9 text-xs justify-between">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
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
                  <span>{employeeName}</span>
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
                      <Select value={taskMilestoneId} onValueChange={(val) => setTaskMilestoneId(val === "none" ? "" : val)} disabled={!taskProjId}>
                        <SelectTrigger className="w-full bg-background border border-input rounded-lg h-9 text-xs justify-between disabled:opacity-50">
                          <SelectValue placeholder="Select milestone" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="none">None</SelectItem>
                          {milestonesList.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Select value={taskParentId} onValueChange={(val) => setTaskParentId(val === "none" ? "" : val)}>
                      <SelectTrigger className="w-full bg-background border border-input rounded-lg h-9 text-xs justify-between">
                        <SelectValue placeholder="Select parent task" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="none">None (Standalone Task)</SelectItem>
                        {plannedTasks.map((pt: any) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            {pt.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                {isPending ? "Planning..." : "Plan Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
