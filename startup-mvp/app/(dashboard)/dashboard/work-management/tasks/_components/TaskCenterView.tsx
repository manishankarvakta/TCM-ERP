"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { getCentralTaskCenterData } from "@/app/actions/projects/work-management-tasks.action";
import { createTask, updateTask, deleteTask } from "@/app/actions/system/task.action";
import { getAllMilestones } from "@/app/actions/projects/project.action";
import {
  CheckSquare,
  Search,
  Filter,
  Plus,
  RefreshCw,
  User,
  Folder,
  AlertCircle,
  Calendar,
  Trash2,
  MessageSquare,
  Sliders,
  ChevronDown,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface Props {
  initialData: any;
  currentUser: any;
}

export default function TaskCenterView({ initialData, currentUser }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selected Task Detail panel
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Filters State
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [dueDatePreset, setDueDatePreset] = useState("");
  const [quickFilter, setQuickFilter] = useState(
    currentUser.role?.toLowerCase() === "admin" || currentUser.role?.toLowerCase() === "manager"
      ? "assigned_by_me"
      : "my_tasks"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Create Task Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProjId, setTaskProjId] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskStatus, setTaskStatus] = useState("todo");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskMilestoneId, setTaskMilestoneId] = useState("");
  const [taskParentId, setTaskParentId] = useState("");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState("");
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [milestonesList, setMilestonesList] = useState<any[]>([]);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  // Fetch milestones on load
  useEffect(() => {
    async function loadMilestones() {
      const res = await getAllMilestones("all");
      if (res.success && res.milestones) {
        setMilestonesList(res.milestones);
      }
    }
    loadMilestones();
  }, []);
  const { socket, isConnected } = useSocket();

  // Fetch / Query Central Task Center Data
  const refreshTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getCentralTaskCenterData({
      projectId: projectId || undefined,
      assigneeId: assigneeId || undefined,
      priority: priority || undefined,
      status: status || undefined,
      dueDatePreset: dueDatePreset || undefined,
      quickFilter: quickFilter || undefined,
      searchQuery: searchQuery || undefined,
    });

    if (res.success) {
      setData(res);
      // Synchronize the selectedTask reference if it's currently open
      if (selectedTask) {
        const updated = res.tasks.find((t: any) => t.id === selectedTask.id);
        if (updated) setSelectedTask(updated);
      }
    } else {
      toast.error(res.error || "Failed to update task records");
    }
    setLoading(false);
  }, [projectId, assigneeId, priority, status, dueDatePreset, quickFilter, searchQuery, selectedTask]);

  // Trigger query on filter changes
  useEffect(() => {
    refreshTasks(true);
  }, [projectId, assigneeId, priority, status, dueDatePreset, quickFilter, searchQuery]);

  // Realtime integration
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_room", { room: "work-management:dashboard" });

    const handleTaskChange = () => {
      refreshTasks(true);
    };

    socket.on("TASK_CREATED", handleTaskChange);
    socket.on("TASK_UPDATED", handleTaskChange);

    return () => {
      socket.emit("leave_room", { room: "work-management:dashboard" });
      socket.off("TASK_CREATED", handleTaskChange);
      socket.off("TASK_UPDATED", handleTaskChange);
    };
  }, [socket, refreshTasks]);

  // Handle task creation submitting
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) {
      toast.error("Task title is required");
      return;
    }

    startTransition(async () => {
      const res = await createTask({
        title: taskTitle,
        description: taskDesc || undefined,
        projectId: taskProjId || undefined,
        assigneeId: taskAssignee || undefined,
        priority: taskPriority,
        status: taskStatus,
        dueDate: taskDueDate ? new Date(taskDueDate) : undefined,
        milestoneId: taskMilestoneId || undefined,
        parentId: taskParentId || undefined,
        estimatedHours: taskEstimatedHours ? parseFloat(taskEstimatedHours) : undefined,
      });

      if (res.success) {
        toast.success("Task created successfully");
        setIsCreateOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        setTaskProjId("");
        setTaskAssignee("");
        setTaskPriority("medium");
        setTaskStatus("todo");
        setTaskDueDate("");
        setTaskMilestoneId("");
        setTaskParentId("");
        setTaskEstimatedHours("");
        setIsMoreOptionsOpen(false);
        refreshTasks();
      } else {
        toast.error(res.error || "Failed to create task");
      }
    });
  };

  // Quick edit status, assignee, priority, or due date inside detail panel
  const handleTaskPropertyUpdate = async (taskId: string, fields: any) => {
    const updateInput: any = {};
    if (fields.status !== undefined) updateInput.status = fields.status;
    if (fields.priority !== undefined) updateInput.priority = fields.priority;
    if (fields.assigneeId !== undefined) updateInput.assigneeId = fields.assigneeId || null;
    if (fields.dueDate !== undefined) updateInput.dueDate = fields.dueDate ? new Date(fields.dueDate) : null;

    const res = await updateTask(taskId, updateInput);
    if (res.success) {
      toast.success("Task updated successfully");
      refreshTasks();
    } else {
      toast.error(res.error || "Failed to update task properties");
    }
  };

  const handleDeleteTaskClick = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    const res = await deleteTask(taskId);
    if (res.success) {
      toast.success("Task deleted successfully");
      setSelectedTask(null);
      refreshTasks();
    } else {
      toast.error(res.error || "Failed to delete task");
    }
  };

  if (!data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs font-semibold">Loading Task Center context...</p>
      </div>
    );
  }

  const { tasks, employees, projects } = data;
  const isManager =
    currentUser.role?.toLowerCase() === "admin" || currentUser.role?.toLowerCase() === "manager";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Central Task Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized project task board, checklists, assignments, and blocker tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
            <span className="text-muted-foreground">{isConnected ? "Realtime Active" : "Realtime Offline"}</span>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition"
          >
            <Plus className="h-4 w-4" /> Create Task
          </button>
        </div>
      </div>

      {/* Quick Filters Tab Headers */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        {[
          { id: "my_tasks", label: "My Tasks" },
          { id: "assigned_by_me", label: "Assigned by Me" },
          { id: "created_by_me", label: "Created by Me" },
          { id: "blocked", label: "Blocked" },
          { id: "overdue", label: "Overdue" },
          { id: "due_today", label: "Due Today" },
          { id: "high_priority", label: "High Priority" },
          { id: "unassigned", label: "Unassigned" },
          { id: "all_tasks", label: "All Tasks" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setQuickFilter(tab.id)}
            className={`border-b-2 px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              quickFilter === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters dropdown panel */}
      <div className="rounded-xl border border-border/60 bg-card p-3 grid gap-3 grid-cols-1 md:grid-cols-5 shadow-xs text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search task title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
          />
        </div>

        {/* Project filter */}
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Projects</option>
          <option value="general">General (No Project)</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        {/* Assignee filter */}
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Assignees</option>
          {employees.map((emp: any) => (
            <option key={emp.id} value={emp.userId || ""}>
              {emp.name}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Main split layout: Tasks list table vs Task details card */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Tasks List */}
        <div className={`rounded-xl border border-border bg-card shadow-sm p-4 overflow-hidden ${selectedTask ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/20 text-muted-foreground font-semibold">
                  <th className="p-3">Task</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Assignee</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task: any) => (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`border-b border-border last:border-0 hover:bg-accent/15 transition cursor-pointer ${
                        selectedTask?.id === task.id ? "bg-accent/30 font-semibold" : ""
                      }`}
                    >
                      <td className="p-3 max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          {task.isBlocked && (
                            <span className="bg-rose-100 text-rose-800 text-[8px] font-extrabold px-1 py-0.5 rounded">
                              Blocked
                            </span>
                          )}
                          <span className="text-foreground font-semibold">{task.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground truncate max-w-[120px]">{task.projectName}</td>
                      <td className="p-3 flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold text-[9px]">
                          {task.assigneeImage ? (
                            <img src={task.assigneeImage} alt={task.assigneeName} />
                          ) : (
                            task.assigneeName[0]
                          )}
                        </div>
                        <span className="truncate">{task.assigneeName}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            task.priority?.toLowerCase() === "high" || task.priority?.toLowerCase() === "urgent"
                              ? "bg-rose-50 text-rose-700"
                              : task.priority?.toLowerCase() === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="capitalize">{task.status.replace("_", " ")}</span>
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{task.dueDate || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Task Details Drawer/Panel */}
        {selectedTask && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-md relative">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-bold"
            >
              ✕
            </button>

            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Task Detail Panel</h3>
            <h2 className="text-lg font-bold text-foreground pr-5">{selectedTask.title}</h2>

            <div className="text-xs space-y-3.5 border-t border-border pt-4">
              {/* Description */}
              <div>
                <span className="font-semibold text-muted-foreground block mb-1">Description</span>
                <p className="text-foreground whitespace-pre-wrap bg-accent/20 rounded p-2.5 italic">
                  {selectedTask.description || "No description provided."}
                </p>
              </div>

              {/* Status workflow */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Status Workflow</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleTaskPropertyUpdate(selectedTask.id, { status: e.target.value })}
                  className="rounded border border-border bg-background py-1 px-2.5 font-bold"
                >
                  <option value="new">New</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Priority Level</span>
                <select
                  value={selectedTask.priority}
                  onChange={(e) => handleTaskPropertyUpdate(selectedTask.id, { priority: e.target.value })}
                  className="rounded border border-border bg-background py-1 px-2.5"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Assignee */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Responsible Assignee</span>
                <select
                  value={selectedTask.assigneeId || ""}
                  onChange={(e) => handleTaskPropertyUpdate(selectedTask.id, { assigneeId: e.target.value })}
                  className="rounded border border-border bg-background py-1 px-2.5 max-w-[150px] truncate"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.userId || ""}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Deadline Date</span>
                <input
                  type="date"
                  value={selectedTask.dueDate || ""}
                  onChange={(e) => handleTaskPropertyUpdate(selectedTask.id, { dueDate: e.target.value })}
                  className="rounded border border-border bg-background py-0.5 px-1.5"
                />
              </div>

              {/* Project integration link */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Project Relation</span>
                {selectedTask.projectId ? (
                  <Link
                    href={`/dashboard/projects/all`}
                    className="text-primary hover:underline font-bold"
                  >
                    {selectedTask.projectName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">General Work</span>
                )}
              </div>

              {/* Blocked by Dependencies */}
              <div>
                <span className="font-semibold text-muted-foreground block mb-1">Blocked By Dependencies</span>
                {selectedTask.blockedByTasks.length === 0 ? (
                  <p className="text-muted-foreground italic">No active blockers.</p>
                ) : (
                  <div className="space-y-1.5 mt-1 bg-rose-50 border border-rose-100 rounded p-2 text-rose-800">
                    {selectedTask.blockedByTasks.map((blocking: any) => (
                      <div key={blocking.id} className="flex items-center justify-between text-[11px]">
                        <span className="truncate pr-3">{blocking.title}</span>
                        <span className="font-mono bg-rose-200 text-rose-900 px-1 rounded text-[8px] uppercase">
                          {blocking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Creator: {selectedTask.creatorName}</span>
                {isManager && (
                  <button
                    onClick={() => handleDeleteTaskClick(selectedTask.id)}
                    className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 text-xs font-semibold py-1.5 px-3 rounded-lg transition animate-pulse"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Task
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Creation Modal Form Popup */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px] border border-border bg-card p-6 shadow-2xl text-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Create Central Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new central task, project relation, priority, and assignees.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-sm mt-3">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground text-xs uppercase">Task Title *</label>
              <input
                type="text"
                required
                placeholder="E.g., SSL Payment Callback Setup"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground text-xs uppercase">Description</label>
              <textarea
                placeholder="Task context details..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm h-20 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground text-xs uppercase">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full h-[38px] rounded-lg border border-border bg-background py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground text-xs uppercase">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full h-[38px] rounded-lg border border-border bg-background py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Assignee Custom Select with Image */}
              <div className="space-y-1 relative">
                <label className="font-semibold text-muted-foreground text-xs uppercase">Assignee</label>
                
                {/* Custom Select Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm flex items-center justify-between shadow-xs transition hover:bg-muted/40 cursor-pointer h-[38px]"
                >
                  {(() => {
                    const selectedAssigneeObj = employees.find((emp: any) => emp.userId === taskAssignee);
                    return selectedAssigneeObj ? (
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-5 w-5 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                          {selectedAssigneeObj.photo ? (
                            <img src={selectedAssigneeObj.photo} alt={selectedAssigneeObj.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold">{selectedAssigneeObj.name.charAt(0)}</span>
                          )}
                        </div>
                        <span className="font-semibold text-foreground text-xs truncate">{selectedAssigneeObj.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Unassigned</span>
                    );
                  })()}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {isAssigneeDropdownOpen && (
                  <>
                    {/* Invisible overlay to close on click outside */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsAssigneeDropdownOpen(false)} />
                    
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-50 p-1 divide-y divide-border/40 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                      <div
                        onClick={() => {
                          setTaskAssignee("");
                          setIsAssigneeDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-muted text-xs cursor-pointer font-semibold text-muted-foreground rounded-md transition"
                      >
                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-3 w-3" />
                        </div>
                        <span>Unassigned</span>
                      </div>
                      
                      {employees.map((emp: any) => (
                        <div
                          key={emp.id}
                          onClick={() => {
                            setTaskAssignee(emp.userId || "");
                            setIsAssigneeDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 hover:bg-muted text-xs cursor-pointer rounded-md transition ${taskAssignee === emp.userId ? "bg-accent/50 font-bold" : ""}`}
                        >
                          <div className="h-5 w-5 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
                            {emp.photo ? (
                              <img src={emp.photo} alt={emp.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold">{emp.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{emp.name}</p>
                            <p className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">{emp.designation || "Employee"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Searchable Select for Project Relation */}
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground text-xs uppercase">Project Relation</label>
                <SearchableSelect
                  options={[
                    { label: "General Work (No Project)", value: "none" },
                    ...projects.map((p: any) => ({ label: p.title, value: p.id }))
                  ]}
                  value={taskProjId || "none"}
                  onChange={(val) => {
                    const mappedVal = val === "none" ? "" : val;
                    setTaskProjId(mappedVal);
                    setTaskMilestoneId("");
                    setTaskParentId("");
                  }}
                  placeholder="Select Project"
                  className="w-full h-[38px] text-xs"
                />
              </div>
            </div>

            {/* Collapsible More Options Panel */}
            <div className="border-t border-border/60 pt-3">
              <button
                type="button"
                onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
                className="flex items-center justify-between w-full text-xs font-semibold text-primary hover:underline transition"
              >
                <span>{isMoreOptionsOpen ? "− Hide options" : "+ More options"}</span>
              </button>

              {isMoreOptionsOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-accent/20 rounded-lg border border-border/40 transition-all duration-300">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground block text-[10px]">Milestone Target</label>
                    <select
                      value={taskMilestoneId}
                      onChange={(e) => setTaskMilestoneId(e.target.value)}
                      disabled={!taskProjId}
                      className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition disabled:opacity-50"
                    >
                      <option value="">No Milestone</option>
                      {milestonesList
                        .filter((m: any) => m.projectId === taskProjId)
                        .map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground block text-[10px]">Parent Task</label>
                    <select
                      value={taskParentId}
                      onChange={(e) => setTaskParentId(e.target.value)}
                      disabled={!taskProjId}
                      className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition disabled:opacity-50"
                    >
                      <option value="">No Parent Task</option>
                      {tasks
                        .filter((t: any) => t.projectId === taskProjId)
                        .map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="font-semibold text-muted-foreground block text-[10px]">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="E.g., 4.5"
                      value={taskEstimatedHours}
                      onChange={(e) => setTaskEstimatedHours(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-border px-4 py-2 hover:bg-accent font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 font-semibold transition shadow-xs"
              >
                {isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
