"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProjectGanttData, updateMilestone, updateIssue } from "@/app/actions/projects/project.action";
import { updateTask, createTask } from "@/app/actions/system/task.action";
import { getActiveUsers } from "@/app/actions/user.action";
import { GanttNode } from "./gantt/types";
import { GanttItemSheet } from "./gantt/GanttItemSheet";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  CalendarDays, 
  Flag, 
  User, 
  Clock, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Grid,
  List,
  Eye
} from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addDays,
  subDays,
  isWithinInterval
} from "date-fns";

interface ProjectCalendarProps {
  projectId: string;
}

interface CalendarItem {
  id: string;
  title: string;
  type: "milestone" | "issue" | "task" | "subtask";
  startDate: Date;
  endDate: Date;
  progress: number;
  status?: string;
  priority?: string;
  assignee?: { id: string; name: string; image?: string };
  description?: string;
}

// Flatten Gantt Hierarchical data for Calendar rendering
const flattenGanttNodes = (nodes: any[]): CalendarItem[] => {
  let list: CalendarItem[] = [];
  
  const processNode = (node: any) => {
    list.push({
      id: node.id,
      title: node.title,
      type: node.type,
      startDate: new Date(node.startDate),
      endDate: new Date(node.endDate),
      progress: node.progress,
      status: node.status,
      priority: node.priority,
      assignee: node.assignee,
      description: node.description
    });

    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => processNode(child));
    }
  };

  nodes.forEach(node => processNode(node));
  return list;
};

export function ProjectCalendar({ projectId }: ProjectCalendarProps) {
  const router = useRouter();

  // --- Main States ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawGanttData, setRawGanttData] = useState<any[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  // --- Calendar Date/View States ---
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "list">("month");

  // --- Filter States ---
  const [filterMilestones, setFilterMilestones] = useState(true);
  const [filterIssues, setFilterIssues] = useState(true);
  const [filterTasks, setFilterTasks] = useState(true);
  const [filterSubtasks, setFilterSubtasks] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  // --- Edit Details Sheet Modal ---
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // --- Quick Create Task Dialog Modal ---
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState<Date | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");

  // --- Fetch Calendar events & team members ---
  const loadCalendarData = useCallback(async (showSkeleton = true) => {
    try {
      if (showSkeleton) setLoading(true);
      const [res, usersRes] = await Promise.all([
        getProjectGanttData(projectId),
        getActiveUsers()
      ]);

      if (res.success && res.data) {
        setRawGanttData(res.data);
        setItems(flattenGanttNodes(res.data));
        setError(null);
      } else {
        setError(res.error || "Failed to load schedule items");
      }

      if (usersRes.success) {
        setActiveUsers(usersRes.users || []);
      }
    } catch (err) {
      console.error("Load calendar data error:", err);
      setError("An unexpected error occurred while fetching events");
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadCalendarData(true);
  }, [loadCalendarData]);

  // --- Save Changes Handler from Detailed Modal ---
  const handleSaveNodeUpdates = async (nodeId: string, updates: any) => {
    try {
      toast.loading("Persisting changes...", { id: "calendar-save" });
      let res: { success: boolean; error?: string };

      // Find the existing node item type
      const targetItem = items.find(item => item.id === nodeId);
      if (!targetItem) {
        toast.error("Item context not found", { id: "calendar-save" });
        return;
      }

      if (targetItem.type === "task" || targetItem.type === "subtask") {
        const inputUpdates: any = {
          title: updates.title,
          status: updates.status,
          description: updates.description,
          priority: updates.priority,
          assigneeId: updates.assigneeId
        };
        if (updates.endDate) {
          inputUpdates.dueDate = updates.endDate;
        }
        res = await updateTask(nodeId, inputUpdates);
      } else if (targetItem.type === "issue") {
        res = await updateIssue(nodeId, {
          title: updates.title,
          status: updates.status,
          description: updates.description,
          priority: updates.priority,
          assigneeId: updates.assigneeId
        });
      } else if (targetItem.type === "milestone") {
        const inputUpdates: any = {
          title: updates.title,
          status: updates.status,
          description: updates.description
        };
        if (updates.endDate) {
          inputUpdates.dueDate = updates.endDate;
        }
        res = await updateMilestone(nodeId, inputUpdates);
      } else {
        toast.error("Unsupported item type", { id: "calendar-save" });
        return;
      }

      if (res.success) {
        toast.success("Saved schedule successfully!", { id: "calendar-save" });
        await loadCalendarData(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to persist updates", { id: "calendar-save" });
      }
    } catch (err) {
      console.error("Save node updates error:", err);
      toast.error("An error occurred during preservation", { id: "calendar-save" });
    }
  };

  // --- Quick Create Task Form submit ---
  const handleQuickCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !quickCreateDate) return;

    try {
      toast.loading("Creating new task...", { id: "quick-task" });
      
      // Attempt to link to the first Milestone and Issue in raw data if available
      const milestoneId = rawGanttData[0]?.id;
      const issueId = rawGanttData[0]?.children?.[0]?.id;

      const res = await createTask({
        title: quickTaskTitle.trim(),
        projectId,
        milestoneId: milestoneId || undefined,
        issueId: issueId || undefined,
        dueDate: quickCreateDate,
        entityType: "project",
        entityId: projectId
      });

      if (res.success) {
        toast.success("Task logged successfully!", { id: "quick-task" });
        setQuickTaskTitle("");
        setIsQuickCreateOpen(false);
        await loadCalendarData(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to log task", { id: "quick-task" });
      }
    } catch (err) {
      console.error("Quick create task error:", err);
      toast.error("Error creating task", { id: "quick-task" });
    }
  };

  // --- Filtering Logic ---
  const filteredItems = items.filter(item => {
    // 1. Entity Type Filters
    if (item.type === "milestone" && !filterMilestones) return false;
    if (item.type === "issue" && !filterIssues) return false;
    if (item.type === "task" && !filterTasks) return false;
    if (item.type === "subtask" && !filterSubtasks) return false;

    // 2. Priority Filter
    if (filterPriority !== "all") {
      const p = item.priority ? item.priority.toLowerCase() : "";
      if (p !== filterPriority) return false;
    }

    // 3. Assignee Filter
    if (filterAssignee !== "all" && item.assignee?.id !== filterAssignee) {
      return false;
    }

    return true;
  });

  // --- Render Item color pills ---
  const getItemStyles = (type: string) => {
    switch (type) {
      case "milestone":
        return { bg: "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-700", dot: "bg-purple-500" };
      case "issue":
        return { bg: "bg-red-50 hover:bg-red-100/80 border-red-200 text-red-700", dot: "bg-red-500" };
      case "task":
        return { bg: "bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-700", dot: "bg-blue-500" };
      case "subtask":
        return { bg: "bg-teal-50 hover:bg-teal-100/80 border-teal-200 text-teal-700", dot: "bg-teal-500" };
      default:
        return { bg: "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700", dot: "bg-slate-500" };
    }
  };

  // --- Date Calculation helpers ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start week on Monday
  const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const gridDays = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const setToday = () => setCurrentMonth(new Date());

  // Check if item spans the specific day
  const itemActiveOnDay = (item: CalendarItem, day: Date) => {
    const d = new Date(day);
    d.setHours(0,0,0,0);
    const start = new Date(item.startDate);
    start.setHours(0,0,0,0);
    const end = new Date(item.endDate);
    end.setHours(23,59,59,999);
    return isWithinInterval(d, { start, end });
  };

  // --- Render Month View Grid ---
  const renderMonthView = () => {
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
          {weekdays.map(day => (
            <div key={day} className="py-2.5 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0 divide-x divide-y divide-slate-100 border-b border-r border-slate-100">
          {gridDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const activeEvents = filteredItems.filter(item => itemActiveOnDay(item, day));

            return (
              <div 
                key={i} 
                className={`min-h-[90px] flex flex-col p-2 select-none relative group hover:bg-slate-50/30 transition-all ${
                  isCurrentMonth ? "bg-white" : "bg-slate-50/40 text-slate-300"
                }`}
              >
                {/* Date Header inside cell */}
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <span className={`text-xs font-bold w-5.5 h-5.5 rounded-full flex items-center justify-center ${
                    isDayToday 
                      ? "bg-primary text-white shadow-sm" 
                      : isCurrentMonth ? "text-slate-700" : "text-slate-300/80"
                  }`}>
                    {format(day, "d")}
                  </span>
                  
                  {/* Quick create icon */}
                  {isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-slate-200/80 transition-all text-slate-400 hover:text-slate-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickCreateDate(day);
                        setIsQuickCreateOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* Event banners inside cell */}
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-none pr-0.5">
                  {activeEvents.slice(0, 3).map(event => {
                    const styles = getItemStyles(event.type);
                    return (
                      <div
                        key={event.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all ${styles.bg}`}
                        onClick={() => {
                          setSelectedItemId(event.id);
                          setIsEditOpen(true);
                        }}
                        title={event.title}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  })}
                  {activeEvents.length > 3 && (
                    <div className="text-[9px] font-extrabold text-slate-400 pl-1">
                      + {activeEvents.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Render Week View Timeline ---
  const renderWeekView = () => {
    const startWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startWeek, i));

    return (
      <div className="flex-1 flex min-h-0 bg-white divide-x divide-slate-100 overflow-x-auto">
        {weekDays.map((day, i) => {
          const activeEvents = filteredItems.filter(item => itemActiveOnDay(item, day));
          const isDayToday = isToday(day);

          return (
            <div key={i} className="flex-1 min-w-[150px] flex flex-col p-4 bg-white hover:bg-slate-50/20 transition-all">
              {/* Day Header */}
              <div className="border-b border-slate-100 pb-3 mb-4 text-center shrink-0">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  {format(day, "E")}
                </p>
                <p className={`text-xl font-black w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 ${
                  isDayToday ? "bg-primary text-white shadow-sm" : "text-slate-800"
                }`}>
                  {format(day, "d")}
                </p>
              </div>

              {/* Day Items Stack */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {activeEvents.map(event => {
                  const styles = getItemStyles(event.type);
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all space-y-2 flex flex-col justify-between ${styles.bg}`}
                      onClick={() => {
                        setSelectedItemId(event.id);
                        setIsEditOpen(true);
                      }}
                    >
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-white/80 border border-slate-100 shadow-sm inline-block">
                          {event.type}
                        </span>
                        <h4 className="text-xs font-bold leading-snug line-clamp-2">
                          {event.title}
                        </h4>
                      </div>

                      {/* Item Meta Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/40">
                        {event.assignee ? (
                          <Avatar className="w-5 h-5 border border-white shrink-0">
                            <AvatarImage src={event.assignee.image} />
                            <AvatarFallback className="text-[9px] font-bold bg-white text-slate-600">
                              {event.assignee.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-5 h-5 bg-white text-slate-400 rounded-full flex items-center justify-center border border-slate-100 shrink-0">
                            <User className="w-3 h-3" />
                          </div>
                        )}
                        <Badge className="bg-white/80 border-slate-100 text-slate-500 text-[9px] font-bold">
                          {event.progress}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {activeEvents.length === 0 && (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-[10px] font-medium text-slate-400 italic">No events scheduled</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- Render Day View Schedule ---
  const renderDayView = () => {
    const activeEvents = filteredItems.filter(item => itemActiveOnDay(item, selectedDate));

    return (
      <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-white">
        
        {/* Left Side: Dynamic Datepicker Card */}
        <div className="w-full md:w-80 border-r border-slate-100 p-6 flex flex-col gap-6 shrink-0 bg-slate-50/20">
          <div>
            <h3 className="text-lg font-black text-slate-800">Select Date Context</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">Review active events on a specific calendar day</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-600 rounded-full"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-slate-800 text-sm">
                {format(selectedDate, "PPP")}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-600 rounded-full"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button 
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl h-10 shadow-sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Jump to Today
            </Button>
          </div>
        </div>

        {/* Right Side: Day Schedule Event details */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                Events for {format(selectedDate, "MMMM d, yyyy")}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                {activeEvents.length} items active in this schedule frame
              </p>
            </div>
            
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl gap-2 shadow-sm"
              onClick={() => {
                setQuickCreateDate(selectedDate);
                setIsQuickCreateOpen(true);
              }}
            >
              <Plus className="w-4 h-4" /> Quick Add Task
            </Button>
          </div>

          <div className="space-y-4">
            {activeEvents.map(event => {
              const styles = getItemStyles(event.type);
              return (
                <div
                  key={event.id}
                  className={`p-5 rounded-2xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all border-slate-200/60`}
                  onClick={() => {
                    setSelectedItemId(event.id);
                    setIsEditOpen(true);
                  }}
                >
                  <div className="flex gap-4 items-start">
                    {/* Visual indicators */}
                    <div className={`h-10 w-10 text-slate-600 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${styles.bg}`}>
                      <CalendarDays className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge className={`${styles.bg} border border-transparent font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded`}>
                          {event.type}
                        </Badge>
                        {event.status && (
                          <Badge className="bg-slate-100 border-none text-slate-600 font-bold text-[9px] uppercase px-2 py-0.5 rounded">
                            {event.status}
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-800 tracking-tight leading-snug">
                        {event.title}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        Schedule frame: {format(event.startDate, "PP")} &rarr; {format(event.endDate, "PP")}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Meta right pane */}
                  <div className="flex items-center gap-6 self-end md:self-center">
                    {event.assignee && (
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7 border border-slate-200">
                          <AvatarImage src={event.assignee.image} />
                          <AvatarFallback className="text-[10px] font-bold bg-purple-100 text-purple-700">
                            {event.assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left hidden sm:block">
                          <p className="text-xs font-bold text-slate-700">{event.assignee.name}</p>
                          <p className="text-[9px] font-medium text-slate-400">Assignee</p>
                        </div>
                      </div>
                    )}

                    <div className="text-center bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/50">
                      <p className="text-xs font-extrabold text-slate-700">{event.progress}%</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Progress</p>
                    </div>
                  </div>

                </div>
              );
            })}

            {activeEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/20 space-y-4">
                <div className="p-4 bg-white rounded-full text-slate-400 border border-slate-100 shadow-sm">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-slate-800">Clear calendar schedule</h4>
                  <p className="text-xs text-slate-400 font-semibold max-w-xs">
                    There are no milestones, tasks, or issues mapped to this calendar date coordinates.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  // --- Render List View agenda feed ---
  const renderListView = () => {
    const sortedItems = [...filteredItems].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return (
      <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-800">Schedule Agenda Ledger</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">
              Chronologically sorted review of all {filteredItems.length} active project phases and deliverables.
            </p>
          </div>

          <div className="space-y-3">
            {sortedItems.map(event => {
              const styles = getItemStyles(event.type);
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50/20 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedItemId(event.id);
                    setIsEditOpen(true);
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0 mr-4">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles.dot}`} />
                    <Badge className={`${styles.bg} border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded h-5 shrink-0`}>
                      {event.type}
                    </Badge>
                    <h4 className="text-xs font-bold text-slate-700 truncate leading-snug">
                      {event.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {format(event.startDate, "MMM d")} - {format(event.endDate, "MMM d")}
                    </span>

                    {event.assignee && (
                      <Avatar className="w-5.5 h-5.5 border border-slate-200">
                        <AvatarImage src={event.assignee.image} />
                        <AvatarFallback className="text-[9px] font-bold bg-purple-100 text-purple-700">
                          {event.assignee.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="text-right w-12 hidden sm:block">
                      <p className="text-xs font-extrabold text-slate-600">{event.progress}%</p>
                    </div>
                  </div>

                </div>
              );
            })}

            {sortedItems.length === 0 && (
              <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/20 space-y-4">
                <div className="p-4 bg-white rounded-full text-slate-400 border border-slate-100 shadow-sm">
                  <List className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-slate-800">Agenda empty</h4>
                  <p className="text-xs text-slate-400 font-semibold max-w-xs">
                    Modify active filters in the sidebar to sync list contents.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-card">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-destructive/50 rounded-xl bg-destructive/5">
        <p className="text-sm font-semibold text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[600px] overflow-hidden">
      
      {/* 1. FILTER SIDEBAR (Left pane - 20% width) */}
      <div className="w-full md:w-64 border border-slate-200 bg-white rounded-2xl p-5 flex flex-col gap-6 shrink-0 shadow-sm">
        
        {/* Sidebar Header */}
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary" /> Filter Matrix
          </h4>
        </div>

        {/* Entity Type Toggles */}
        <div className="space-y-3.5">
          <Label className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block">
            Deliverable Type
          </Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-purple-500" /> Milestone
              </span>
              <input 
                type="checkbox" 
                checked={filterMilestones} 
                onChange={(e) => setFilterMilestones(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-red-500" /> Issue
              </span>
              <input 
                type="checkbox" 
                checked={filterIssues} 
                onChange={(e) => setFilterIssues(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-blue-500" /> Task
              </span>
              <input 
                type="checkbox" 
                checked={filterTasks} 
                onChange={(e) => setFilterTasks(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-teal-500" /> Subtask
              </span>
              <input 
                type="checkbox" 
                checked={filterSubtasks} 
                onChange={(e) => setFilterSubtasks(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Priority Select */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block">
            Priority Level
          </Label>
          <select
            className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium / Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Assignee Filter Dropdown */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400 block">
            Assigned Specialist
          </Label>
          <select
            className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">All Assignees</option>
            {activeUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* 2. CALENDAR CANVAS (Right pane - 80% width) */}
      <Card className="flex-1 flex flex-col border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
        
        {/* Calendar Header Row */}
        <CardHeader className="bg-slate-50/40 border-b border-slate-100 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Navigation Month */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8.5 w-8.5 text-slate-600 rounded-lg hover:bg-slate-100"
                onClick={prevMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8.5 w-8.5 text-slate-600 rounded-lg hover:bg-slate-100"
                onClick={nextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button 
              variant="outline"
              size="sm"
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl h-9.5 shadow-sm"
              onClick={setToday}
            >
              Today
            </Button>

            <h3 className="text-base font-extrabold text-slate-800 tracking-tight sm:ml-2">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
          </div>

          {/* View Toggles & Trigger */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center bg-slate-100 border border-slate-200/50 rounded-xl p-1 shrink-0">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                className={`h-7.5 px-3.5 text-xs font-semibold rounded-lg shadow-none ${
                  viewMode === "month" 
                    ? "bg-white text-slate-800 shadow-sm hover:bg-white" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>

              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                className={`h-7.5 px-3.5 text-xs font-semibold rounded-lg shadow-none ${
                  viewMode === "week" 
                    ? "bg-white text-slate-800 shadow-sm hover:bg-white" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>

              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                className={`h-7.5 px-3.5 text-xs font-semibold rounded-lg shadow-none ${
                  viewMode === "day" 
                    ? "bg-white text-slate-800 shadow-sm hover:bg-white" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
                onClick={() => setViewMode("day")}
              >
                Day
              </Button>

              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className={`h-7.5 px-3.5 text-xs font-semibold rounded-lg shadow-none ${
                  viewMode === "list" 
                    ? "bg-white text-slate-800 shadow-sm hover:bg-white" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
            </div>
          </div>

        </CardHeader>

        {/* Calendar Canvas Content Grid */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-50/20">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
          {viewMode === "list" && renderListView()}
        </div>

      </Card>

      {/* ClickUp Center Dialog Detailed View modal */}
      {isEditOpen && selectedItemId && (
        <GanttItemSheet 
          node={
            items.find(item => item.id === selectedItemId) 
              ? {
                  id: selectedItemId,
                  title: items.find(item => item.id === selectedItemId)!.title,
                  type: items.find(item => item.id === selectedItemId)!.type,
                  startDate: items.find(item => item.id === selectedItemId)!.startDate,
                  endDate: items.find(item => item.id === selectedItemId)!.endDate,
                  progress: items.find(item => item.id === selectedItemId)!.progress,
                  dependencies: [],
                  children: [],
                  isExpanded: false,
                  assignee: items.find(item => item.id === selectedItemId)!.assignee,
                  status: items.find(item => item.id === selectedItemId)!.status,
                  priority: items.find(item => item.id === selectedItemId)!.priority,
                  description: items.find(item => item.id === selectedItemId)!.description
                } as any
              : null
          }
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSave={handleSaveNodeUpdates}
        />
      )}

      {/* Quick Create Task Modal Dialog */}
      {isQuickCreateOpen && quickCreateDate && (
        <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" /> Log Task for {format(quickCreateDate, "PPP")}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 mt-1">
                Quick-create a dynamic deliverable pre-mapped to this calendar coordinate.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleQuickCreateTask} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="quick-title" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Task Title
                </Label>
                <Input
                  id="quick-title"
                  className="text-xs h-9 rounded-lg border border-slate-200 placeholder-slate-400 bg-white"
                  placeholder="e.g. Docker compose configuration setup..."
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold text-slate-500"
                  onClick={() => setIsQuickCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs font-semibold bg-primary hover:bg-primary/95 text-white"
                  disabled={!quickTaskTitle.trim()}
                >
                  Log Task
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
