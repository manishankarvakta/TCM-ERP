"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { getEmployeeWorkProfile } from "@/app/actions/projects/work-management-team.action";
import { createTask, updateTask } from "@/app/actions/system/task.action";
import {
  ArrowLeft,
  User,
  Clock,
  Folder,
  CheckCircle2,
  Play,
  AlertCircle,
  Calendar,
  Plus,
  Edit3,
  Activity,
  Briefcase,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
  profile: any;
  currentUser: any;
}

export default function EmployeeWorkProfileView({ profile: initialProfile, currentUser }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Task Creation Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskProject, setTaskProject] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Task Editing/Editing popup states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");

  const { socket } = useSocket();

  // Refetch employee work profile from Server Action
  const refreshProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getEmployeeWorkProfile(initialProfile.id);
    if (res.success && res.profile) {
      setProfile(res.profile);
    } else {
      toast.error(res.error || "Failed to reload profile data");
    }
    setLoading(false);
  }, [initialProfile.id]);

  // Set up realtime Socket.IO presence listener
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_room", { room: "work-management:dashboard" });

    const handleRealtimeUpdate = (eventData: any) => {
      // If event relates to this employee, trigger background update
      if (eventData?.userId === profile.userId || eventData?.assigneeId === profile.userId) {
        console.log("[Employee Profile] Realtime event received:", eventData);
        refreshProfile(true);
      }
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
  }, [socket, profile.userId, refreshProfile]);

  // Client-side timer ticker to dynamically increment the working clock
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format milliseconds into HH:MM:SS
  const formatDurationLong = (ms: number) => {
    if (!ms || ms <= 0) return "00:00:00";
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // Format milliseconds into HH:MM
  const formatDurationSimple = (ms: number) => {
    if (!ms || ms <= 0) return "0h 0m";
    const totalMins = Math.floor(ms / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const currentDuration = (() => {
    let base = profile.sessionState.activeDurationMs || 0;
    if (profile.sessionState.status === "WORKING" && profile.sessionState.startTime) {
      const activeLogs = profile.workSessionHistory
        .find((s: any) => s.date === new Date().toISOString().split("T")[0])
        ?.logs.filter((l: any) => l.actionType === "START" || l.actionType === "RESUME");

      if (activeLogs && activeLogs.length > 0) {
        const lastActiveLog = activeLogs[activeLogs.length - 1];
        const elapsed = new Date().getTime() - new Date(lastActiveLog.timestamp).getTime();
        base += Math.max(0, elapsed);
      } else {
        // Fallback offset
        const elapsed = new Date().getTime() - new Date(profile.sessionState.startTime).getTime();
        base = Math.max(base, elapsed);
      }
    }
    return base;
  })();

  // Handle task assignments from the workspace
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) {
      toast.error("Task title is required");
      return;
    }

    startTransition(async () => {
      const res = await createTask({
        title: taskTitle,
        description: taskDesc,
        status: "todo",
        priority: taskPriority,
        projectId: taskProject || undefined,
        assigneeId: profile.userId || undefined,
        dueDate: taskDueDate ? new Date(taskDueDate) : undefined,
      });

      if (res.success) {
        toast.success("Task created and assigned successfully");
        setIsTaskModalOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        setTaskPriority("medium");
        setTaskProject("");
        setTaskDueDate("");
        refreshProfile();
      } else {
        toast.error(res.error || "Failed to create task");
      }
    });
  };

  // Quick edit task priority or deadline
  const handleQuickUpdateTask = async (taskId: string, priority?: string, dueDate?: string) => {
    const updateInput: any = {};
    if (priority) updateInput.priority = priority;
    if (dueDate !== undefined) updateInput.dueDate = dueDate ? new Date(dueDate) : null;

    const res = await updateTask(taskId, updateInput);
    if (res.success) {
      toast.success("Task updated successfully");
      setEditingTaskId(null);
      refreshProfile();
    } else {
      toast.error(res.error || "Failed to update task");
    }
  };

  // Status-aware colors helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "WORKING":
        return "bg-emerald-500 text-emerald-700";
      case "ON BREAK":
        return "bg-amber-500 text-amber-700";
      case "COMPLETED":
        return "bg-blue-500 text-blue-700";
      default:
        return "bg-zinc-400 text-zinc-700";
    }
  };

  // Manager action authorization check
  const isManager =
    currentUser.role?.toLowerCase() === "admin" || currentUser.role?.toLowerCase() === "manager";

  return (
    <div className="space-y-6">
      {/* Back CTA button */}
      {isManager && (
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/work-management/team"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Team
          </Link>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold text-xl">
            {profile.photo ? (
              <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              profile.name.split(" ").map((n: string) => n[0]).join("")
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
            <p className="text-sm text-muted-foreground font-medium">{profile.designation}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="bg-accent text-accent-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                {profile.department}
              </span>
              <div className="flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${getStatusColor(profile.sessionState.status).split(" ")[0]} animate-pulse`} />
                <span className="text-xs font-bold capitalize">
                  {profile.sessionState.status === "WORKING"
                    ? "Working"
                    : profile.sessionState.status === "ON BREAK"
                    ? "On Break"
                    : profile.sessionState.status === "COMPLETED"
                    ? "Completed"
                    : "Not Started"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          {isManager && (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition"
            >
              <Plus className="h-4 w-4" /> Assign New Task
            </button>
          )}

          <div className="flex flex-col border border-border rounded-lg bg-accent/20 px-4 py-2 font-mono text-center">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Time</span>
            <span className="text-xl font-bold text-foreground mt-0.5">{formatDurationLong(currentDuration)}</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        {[
          { id: "overview", label: "Overview", icon: User },
          { id: "tasks", label: "Tasks & Work", icon: CheckCircle2 },
          { id: "projects", label: "Projects", icon: Folder },
          { id: "updates", label: "Daily Updates", icon: Calendar },
          { id: "sessions", label: "Sessions Log", icon: Clock },
          { id: "activity", label: "Activity Ledger", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Left overview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Needs Attention Alert List */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Operational Actions Needed
                </h3>

                <div className="space-y-2 text-xs">
                  {profile.taskStats.overdue > 0 && (
                    <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-100 rounded px-3 py-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Employee has <strong>{profile.taskStats.overdue}</strong> overdue task(s) on active projects.</span>
                    </div>
                  )}

                  {profile.taskStats.blocked > 0 && (
                    <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-100 rounded px-3 py-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Employee has <strong>{profile.taskStats.blocked}</strong> blocked task(s) waiting for clearances.</span>
                    </div>
                  )}

                  {!profile.todayUpdateSubmitted && profile.sessionState.status !== "NOT STARTED" && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>Employee has not submitted today's Daily Updates report.</span>
                    </div>
                  )}

                  {profile.taskStats.overdue === 0 && profile.taskStats.blocked === 0 && (profile.todayUpdateSubmitted || profile.sessionState.status === "NOT STARTED") && (
                    <div className="text-muted-foreground italic p-3 text-center">
                      No immediate issues requiring attention.
                    </div>
                  )}
                </div>
              </div>

              {/* Work Session Current Focus Details */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" /> Today's Session Progress
                </h3>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 text-xs font-mono text-center">
                  <div className="border border-border rounded p-2.5 bg-accent/10">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">State</span>
                    <span className="font-bold text-foreground capitalize">{profile.sessionState.status.replace("_", " ")}</span>
                  </div>

                  <div className="border border-border rounded p-2.5 bg-accent/10">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Start Time</span>
                    <span className="font-bold text-foreground">
                      {profile.sessionState.startTime ? new Date(profile.sessionState.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                    </span>
                  </div>

                  <div className="border border-border rounded p-2.5 bg-accent/10">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Active Duration</span>
                    <span className="font-bold text-foreground">{formatDurationLong(currentDuration)}</span>
                  </div>

                  <div className="border border-border rounded p-2.5 bg-accent/10">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Break Duration</span>
                    <span className="font-bold text-foreground">{formatDurationLong(profile.sessionState.breakDurationMs)}</span>
                  </div>
                </div>

                <div className="bg-accent/30 rounded-lg p-3 text-xs flex flex-col md:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">CURRENT PROJECT TARGET</span>
                    <span className="font-bold text-foreground">{profile.sessionState.currentProject || "No active project selection"}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px]">CURRENT FOCUS TASK</span>
                    <span className="font-bold text-foreground">{profile.sessionState.currentTask || "No active task focus"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Overview */}
            <div className="space-y-6">
              {/* Workload Capacity progress widget */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-primary" /> Active Workload Engine
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Workload Stress Ratio</span>
                    <span
                      className={`font-semibold ${
                        profile.workload.ratio > 80 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {profile.workload.ratio}%
                    </span>
                  </div>

                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        profile.workload.ratio > 80 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(profile.workload.ratio, 100)}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-muted-foreground pt-1.5">
                    {profile.workload.ratio > 80
                      ? "🚨 Employee is overloaded and at risk of burnout. Reassign outstanding tickets to prevent delivery delays."
                      : "✓ Employee workload is within healthy capacity limits."}
                  </p>
                </div>
              </div>

              {/* Today's Tasks completed metrics card */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Today's Task Metrics
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border border-border/60 rounded p-2 text-center bg-accent/20">
                    <span className="text-muted-foreground text-[10px] block">Completed Today</span>
                    <span className="text-lg font-bold text-emerald-600">{profile.taskStats.completedToday}</span>
                  </div>

                  <div className="border border-border/60 rounded p-2 text-center bg-accent/20">
                    <span className="text-muted-foreground text-[10px] block">In Progress</span>
                    <span className="text-lg font-bold text-blue-600">{profile.taskStats.inProgress}</span>
                  </div>

                  <div className="border border-border/60 rounded p-2 text-center bg-accent/20">
                    <span className="text-muted-foreground text-[10px] block">Blocked</span>
                    <span className="text-lg font-bold text-rose-600">{profile.taskStats.blocked}</span>
                  </div>

                  <div className="border border-border/60 rounded p-2 text-center bg-accent/20">
                    <span className="text-muted-foreground text-[10px] block">Overdue</span>
                    <span className="text-lg font-bold text-amber-600">{profile.taskStats.overdue}</span>
                  </div>
                </div>
              </div>

              {/* Today's My Day Plan overview card */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary" /> Today's My Day Plan
                  </span>
                  <Link
                    href={`/dashboard/work-management/my-day/${profile.id}`}
                    className="text-xs text-primary hover:underline font-bold"
                  >
                    View My Day
                  </Link>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">Planned Tasks</span>
                    <span className="font-bold text-foreground">{profile.taskStats.myDayPlanned || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">Completed Planned</span>
                    <span className="font-bold text-emerald-600">{profile.taskStats.myDayCompleted || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">Blocked Planned</span>
                    <span className="font-bold text-rose-600">{profile.taskStats.myDayBlocked || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Assigned Tasks List</h3>
              {isManager && (
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded"
                >
                  <Plus className="h-3.5 w-3.5" /> New Task
                </button>
              )}
            </div>

            {profile.tasks.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground italic">
                No tasks scheduled for this employee.
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-accent/20 text-muted-foreground font-semibold">
                      <th className="p-3">Task Title</th>
                      <th className="p-3">Project</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Due Date</th>
                      {isManager && <th className="p-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.tasks.map((task: any) => (
                      <tr key={task.id} className="border-b border-border last:border-0 hover:bg-accent/15 transition">
                        <td className="p-3 font-semibold text-foreground">
                          <Link href={`/dashboard/projects/tasks`} className="hover:underline">
                            {task.title}
                          </Link>
                        </td>
                        <td className="p-3 text-muted-foreground">{task.project}</td>
                        <td className="p-3">
                          {editingTaskId === task.id ? (
                            <select
                              value={editingPriority || task.priority}
                              onChange={(e) => {
                                setEditingPriority(e.target.value);
                                handleQuickUpdateTask(task.id, e.target.value);
                              }}
                              className="rounded border border-border bg-background py-1 px-1.5 text-[10px]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          ) : (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                task.priority?.toLowerCase() === "high"
                                  ? "bg-rose-50 text-rose-700"
                                  : task.priority?.toLowerCase() === "medium"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="capitalize">{task.status.replace("_", " ")}</span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {editingTaskId === task.id ? (
                            <input
                              type="date"
                              value={editingDueDate || task.dueDate || ""}
                              onChange={(e) => {
                                setEditingDueDate(e.target.value);
                                handleQuickUpdateTask(task.id, undefined, e.target.value);
                              }}
                              className="rounded border border-border bg-background py-0.5 px-1.5 text-[10px]"
                            />
                          ) : (
                            task.dueDate || "N/A"
                          )}
                        </td>
                        {isManager && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                if (editingTaskId === task.id) {
                                  setEditingTaskId(null);
                                } else {
                                  setEditingTaskId(task.id);
                                  setEditingPriority(task.priority);
                                  setEditingDueDate(task.dueDate || "");
                                }
                              }}
                              className="text-primary hover:underline text-[10px] font-bold"
                            >
                              {editingTaskId === task.id ? "Done" : "Manage"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === "projects" && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="text-base font-bold">Assigned Projects Overview</h3>

            {profile.projects.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground italic">
                No active projects assigned.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {profile.projects.map((proj: any) => (
                  <div key={proj.id} className="border-b border-border pb-3.5 last:border-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <Link href={`/dashboard/projects/all`} className="font-bold text-foreground hover:underline text-sm">
                          {proj.title}
                        </Link>
                      </div>
                      <span className="text-muted-foreground">Manager: <span className="font-semibold text-foreground">{proj.projectManager}</span></span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${proj.progress}%` }} />
                      </div>
                      <span className="text-xs font-bold">{proj.progress}%</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Tasks: {proj.empCompletedCount} Completed / {proj.empActiveCount} Active</span>
                      <span className="capitalize bg-accent px-1.5 py-0.5 rounded font-semibold text-accent-foreground">{proj.status.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DAILY UPDATES TAB */}
        {activeTab === "updates" && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="text-base font-bold">Today's Daily updates Status</h3>

            {/* Submission alert indicator banner */}
            <div className="bg-accent/40 rounded-lg p-3 flex items-center justify-between text-xs">
              <span className="font-semibold">Today's update Submission Status:</span>
              {profile.todayUpdateSubmitted ? (
                <span className="text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-100">✓ Submitted</span>
              ) : (
                <span className="text-rose-700 bg-rose-50 font-bold px-2 py-0.5 rounded border border-rose-100">⚠️ Not Submitted</span>
              )}
            </div>

            {/* List updates history */}
            <div className="space-y-4 mt-6">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submission History</h4>
              
              {profile.dailyUpdatesHistory.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground italic">
                  No Daily Update submitted yet.
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {profile.dailyUpdatesHistory.map((rep: any) => (
                    <div key={rep.id} className="border border-border rounded-xl p-4 bg-accent/5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{rep.date}</span>
                        <span className="bg-zinc-200 text-zinc-700 text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold">
                          {rep.status}
                        </span>
                      </div>

                      <div className="grid gap-3 grid-cols-1 md:grid-cols-3 text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Completed Work</span>
                          <p className="text-foreground mt-0.5 whitespace-pre-wrap">{rep.completed || "None"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Pending Work</span>
                          <p className="text-foreground mt-0.5 whitespace-pre-wrap">{rep.pending || "None"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-600 font-semibold uppercase block">Blocked Issues</span>
                          <p className="text-rose-700 mt-0.5 whitespace-pre-wrap">{rep.blocked || "None"}</p>
                        </div>
                      </div>

                      <div className="border-t border-border/60 pt-2.5 text-xs">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Summary comment</span>
                        <p className="text-foreground mt-0.5 italic">{rep.summary || "No comments"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WORK SESSIONS TIMELINE TAB */}
        {activeTab === "sessions" && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="text-base font-bold">Work Sessions History</h3>

            {profile.workSessionHistory.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground italic">
                No work session started today.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {profile.workSessionHistory.map((sess: any) => (
                  <div key={sess.id} className="border border-border rounded-xl p-4 bg-accent/5 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2">
                      <span className="font-bold text-foreground">{sess.date}</span>
                      <div className="flex gap-3 text-muted-foreground font-mono">
                        <span>Active: {formatDurationSimple(sess.activeDurationMs)}</span>
                        <span>Break: {formatDurationSimple(sess.breakDurationMs)}</span>
                      </div>
                    </div>

                    <div className="relative border-l border-zinc-200 pl-4 space-y-3.5 text-[11px] pt-1">
                      {sess.logs.map((log: any) => (
                        <div key={log.id} className="relative">
                          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full border border-card bg-primary" />
                          <div className="font-bold text-foreground">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Action Event: {log.actionType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === "activity" && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="text-base font-bold">Activity Feed Logs</h3>

            {profile.recentActivity.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground italic">
                No recent activity logs.
              </div>
            ) : (
              <div className="relative border-l border-zinc-200 pl-4 space-y-4 text-xs">
                {profile.recentActivity.map((act: any) => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full border border-card bg-primary" />
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString()}
                    </div>
                    <p className="mt-0.5 font-bold text-foreground">{act.subject}</p>
                    {act.description && <p className="text-muted-foreground mt-0.5 text-[10px]">{act.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Creation Modal Form Popup */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[425px] border border-border bg-card p-6 shadow-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Assign New Task</DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Create and assign a new task to {profile.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignTask} className="space-y-4 text-xs mt-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Task Title *</label>
              <input
                type="text"
                required
                placeholder="Task name"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Description</label>
              <textarea
                placeholder="Task details"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Project Context</label>
              <select
                value={taskProject}
                onChange={(e) => setTaskProject(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
              >
                <option value="">General (No project)</option>
                {profile.projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 hover:bg-accent font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 font-semibold transition shadow-xs"
              >
                {isPending ? "Assigning..." : "Assign Task"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
