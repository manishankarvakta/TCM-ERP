"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { GanttNode } from "./types";
import { getActiveUsers, getCurrentUser } from "@/app/actions/user.action";
import { 
  Play, 
  Pause, 
  Clock, 
  Flag, 
  CheckCircle, 
  Calendar, 
  Plus, 
  Trash2, 
  Send, 
  Paperclip, 
  ListTodo, 
  AlertCircle, 
  ChevronRight, 
  Tag, 
  User, 
  ExternalLink,
  MessageSquare,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { getChecklists, createChecklist, createChecklistItem, toggleChecklistItem, deleteChecklistItem } from "@/app/actions/system/checklist.action";

interface GanttItemSheetProps {
  node: GanttNode | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nodeId: string, updates: Partial<GanttNode>) => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface AttachmentItem {
  id: string;
  name: string;
  size: string;
  url?: string;
}

interface ActivityLog {
  id: string;
  type: "comment" | "activity";
  userName: string;
  userImage?: string;
  text: string;
  time: string;
}

export function GanttItemSheet({ node, isOpen, onOpenChange, onSave }: GanttItemSheetProps) {
  // --- Main Form States ---
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [assigneeId, setAssigneeId] = useState<string>("");

  // --- External Data & User Lists ---
  const [users, setUsers] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any>(null);

  // --- Simulated Time Tracking States ---
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(7265); // Initialize at ~2 hours for premium feel
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Dynamic Collapsible Interactive States ---
  const [checklists, setChecklists] = useState<any[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  useEffect(() => {
    if (isOpen && node?.id) {
        fetchChecklists();
    }
  }, [isOpen, node?.id]);

  const fetchChecklists = async () => {
    if (!node?.id) return;
    const type = node.type === "subtask" ? "task" : node.type;
    const res = await getChecklists(type as "task" | "issue" | "milestone", node.id);
    if (res.success && res.checklists) {
        setChecklists(res.checklists);
        if (res.checklists.length === 0) {
            // Auto create one checklist wrapper so the UI matches the old behavior
            await createChecklist(type as "task" | "issue" | "milestone", node.id, "Tasks");
            const retry = await getChecklists(type as "task" | "issue" | "milestone", node.id);
            if (retry.success && retry.checklists) {
                setChecklists(retry.checklists);
            }
        }
    }
  };
  const [attachments, setAttachments] = useState<AttachmentItem[]>([
    { id: "1", name: "system_architecture_diagram.png", size: "2.4 MB" },
    { id: "2", name: "api_spec_v2.pdf", size: "1.1 MB" }
  ]);
  const [isUploading, setIsUploading] = useState(false);

  // --- Collapsible Sections Toggle ---
  const [showChecklist, setShowChecklist] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);

  // --- Live Activity / Comments States ---
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [commentText, setCommentText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- Load Active System Users and Current Active User profile ---
  useEffect(() => {
    async function loadData() {
      try {
        const [usersRes, currUser] = await Promise.all([
          getActiveUsers(),
          getCurrentUser()
        ]);
        if (usersRes.success) {
          setUsers(usersRes.users || []);
        }
        if (currUser) {
          setActiveUser(currUser);
        }
      } catch (err) {
        console.error("Error loading users in modal:", err);
      }
    }
    loadData();
  }, []);

  // --- Sync State on Node Selection ---
  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setStatus(node.status || "");
      setDescription((node as any).description || "");
      setPriority((node as any).priority || "");
      setStartDate(new Date(node.startDate));
      setEndDate(new Date(node.endDate));
      
      // Pull assigneeId from node.assignee object
      const currentAssignee = (node as any).assignee;
      if (currentAssignee && typeof currentAssignee === "object") {
        setAssigneeId(currentAssignee.id || "");
      } else {
        setAssigneeId("");
      }

      // Generate context-aware chronological activity logs
      const initialLogs: ActivityLog[] = [
        {
          id: "sys-1",
          type: "activity",
          userName: "System Automation",
          text: `Initialized ${node.type} execution context.`,
          time: "Yesterday at 10:24 am"
        },
        {
          id: "sys-2",
          type: "activity",
          userName: "Admin User",
          text: `Modified schedule timeframe coordinates to ${new Date(node.startDate).toLocaleDateString()} -> ${new Date(node.endDate).toLocaleDateString()}`,
          time: "Yesterday at 4:15 pm"
        }
      ];

      if (node.status) {
        initialLogs.push({
          id: "sys-3",
          type: "activity",
          userName: "System Automation",
          text: `Transitioned execution state state to: [${node.status.toUpperCase()}].`,
          time: "Today at 9:05 am"
        });
      }

      setActivities(initialLogs);
      // Reset simulated stopwatch timer
      setIsTimerRunning(false);
      setElapsedSeconds(4250); // Set a fresh visual seed
    }
  }, [node]);

  // --- Simulated stopwatch clock worker ---
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // --- Auto Scroll Comments pane to bottom ---
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activities]);

  if (!node) return null;

  // --- Time Formatter Utility ---
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // --- Handlers ---
  const handleSave = () => {
    const updates: Partial<GanttNode> = {
      title,
      status,
      startDate,
      endDate,
    };
    
    // Add extra advanced schema fields
    (updates as any).description = description;
    (updates as any).priority = priority;
    (updates as any).assigneeId = assigneeId || null;

    onSave(node.id, updates);
    onOpenChange(false);
  };

  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    const senderName = activeUser?.name || "Admin User";
    const senderImage = activeUser?.image || undefined;

    const newComment: ActivityLog = {
      id: Date.now().toString(),
      type: "comment",
      userName: senderName,
      userImage: senderImage,
      text: commentText.trim(),
      time: "Just now"
    };

    setActivities(prev => [...prev, newComment]);
    setCommentText("");
    toast.success("Comment posted successfully");
  };

  const handleToggleChecklist = async (itemId: string, currentDone: boolean) => {
      const res = await toggleChecklistItem(itemId, !currentDone);
      if (res.success) fetchChecklists();
  };

  const handleAddChecklistItem = async (e: React.FormEvent, checklistId: string) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    const res = await createChecklistItem(checklistId, newChecklistItem.trim());
    if (res.success) {
        setNewChecklistItem("");
        fetchChecklists();
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
      const res = await deleteChecklistItem(itemId);
      if (res.success) fetchChecklists();
  };

  const handleFileUploadSimulated = () => {
    setIsUploading(true);
    toast.loading("Uploading attachment...", { id: "attach" });
    
    setTimeout(() => {
      const mockNames = ["api_schema_blueprint.json", "qa_checklist_specs.xlsx", "database_migration_v4.sql", "branding_assets_v2.zip"];
      const sizeStr = ["410 KB", "1.2 MB", "85 KB", "4.8 MB"];
      const randomIndex = Math.floor(Math.random() * mockNames.length);

      const newFile: AttachmentItem = {
        id: Date.now().toString(),
        name: mockNames[randomIndex],
        size: sizeStr[randomIndex]
      };

      setAttachments(prev => [...prev, newFile]);
      setIsUploading(false);
      toast.success("File uploaded successfully!", { id: "attach" });
    }, 1200);
  };

  // --- Render badges dynamically based on node type ---
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "milestone":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-none font-semibold px-2 py-0.5 rounded text-xs gap-1.5"><Flag className="w-3 h-3" /> Milestone</Badge>;
      case "issue":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white border-none font-semibold px-2 py-0.5 rounded text-xs gap-1.5"><AlertCircle className="w-3 h-3" /> Issue</Badge>;
      case "task":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-none font-semibold px-2 py-0.5 rounded text-xs gap-1.5"><CheckCircle className="w-3 h-3" /> Task</Badge>;
      case "subtask":
        return <Badge className="bg-teal-500 hover:bg-teal-600 text-white border-none font-semibold px-2 py-0.5 rounded text-xs gap-1.5"><ChevronRight className="w-3 h-3" /> Subtask</Badge>;
      default:
        return <Badge className="bg-slate-500 text-white font-semibold text-xs">{type}</Badge>;
    }
  };

  // --- ClickUp Priorities Array ---
  const priorities = [
    { label: "None / Clear", value: "", color: "text-slate-400 border-slate-200", bg: "bg-slate-50" },
    { label: "Urgent", value: "urgent", color: "text-red-500 border-red-200 font-bold", bg: "bg-red-50" },
    { label: "High", value: "high", color: "text-amber-500 border-amber-200 font-semibold", bg: "bg-amber-50" },
    { label: "Medium / Normal", value: "medium", color: "text-blue-500 border-blue-200", bg: "bg-blue-50" },
    { label: "Low", value: "low", color: "text-slate-500 border-slate-200", bg: "bg-slate-50" }
  ];

  // Map database priorities (uppercase compatibility for Issues vs lowercase for Tasks)
  const getNormalizedPriority = (p?: string) => {
    if (!p) return "";
    return p.toLowerCase();
  };

  const getPriorityDisplay = (p?: string) => {
    const norm = getNormalizedPriority(p);
    if (norm === "urgent" || norm === "critical") return { label: "Urgent", color: "text-red-600 border-red-300", bg: "bg-red-50", fill: "fill-red-500" };
    if (norm === "high") return { label: "High", color: "text-amber-600 border-amber-300", bg: "bg-amber-50", fill: "fill-amber-500" };
    if (norm === "medium" || norm === "normal") return { label: "Medium", color: "text-blue-600 border-blue-300", bg: "bg-blue-50", fill: "fill-blue-500" };
    if (norm === "low") return { label: "Low", color: "text-slate-600 border-slate-300", bg: "bg-slate-50", fill: "fill-slate-500" };
    return { label: "None", color: "text-slate-400 border-slate-200", bg: "bg-slate-50", fill: "fill-transparent" };
  };

  const activePriorityDetails = getPriorityDisplay(priority);

  // --- Calculate Checklist Progress ---
  const firstChecklist = checklists[0]?.Items || [];
  const completedChecklistCount = firstChecklist.filter((item: any) => item.isCompleted).length;
  const checklistProgressPercent = firstChecklist.length > 0 ? Math.round((completedChecklistCount / firstChecklist.length) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl md:h-[85vh] p-0 overflow-hidden flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.15)] gap-0">
        
        {/* Top Header Row: ClickUp-Style Info/Breadcrumb */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50/80 border-b border-slate-200/60 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              Team Space <ChevronRight className="w-3 h-3" /> Projects <ChevronRight className="w-3 h-3" /> TechSoul ERP
            </span>
            <div className="h-4 w-[1px] bg-slate-200" />
            {getTypeBadge(node.type)}
          </div>
          
          <div className="flex items-center gap-2 mr-6">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              size="sm" 
              className="text-xs font-semibold px-4 shadow-sm bg-primary hover:bg-primary/95 text-white"
              onClick={handleSave}
            >
              Save changes
            </Button>
          </div>
        </div>

        {/* Content Body: Split Screen */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          
          {/* LEFT COLUMN: Properties & Fields (60% width) */}
          <div className="w-full md:w-3/5 overflow-y-auto p-6 md:p-8 space-y-8 border-r border-slate-200/50">
            
            {/* Inline Title Field */}
            <div className="space-y-1 group">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block transition-colors group-hover:text-primary">
                Title
              </Label>
              <textarea 
                className="w-full text-2xl font-bold bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-primary focus:ring-0 px-0 py-1 transition-all resize-none text-slate-800 focus:outline-none min-h-[44px] leading-snug"
                rows={1}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter workspace item title..."
                required
              />
            </div>

            {/* Structured Attributes Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
              
              {/* Status Selector */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                  Status
                </Label>
                <div className="relative">
                  <select
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">No Status</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="TODO">To Do (Issue)</option>
                    <option value="IN_PROGRESS">In Progress (Issue)</option>
                    <option value="COMPLETED">Completed (Issue)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Assignee Selector (Loads real system users!) */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                  Assignee
                </Label>
                <div className="relative">
                  <select
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                  Start Date
                </Label>
                <div className="relative">
                  <Input 
                    type="date"
                    className="text-xs font-medium rounded-lg border border-slate-200 pl-9 py-2 text-slate-700 hover:border-slate-300 focus:border-primary focus:ring-primary focus:ring-1 bg-white h-auto cursor-pointer"
                    value={formatDateForInput(startDate)}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                  />
                  <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                  Due Date
                </Label>
                <div className="relative">
                  <Input 
                    type="date"
                    className="text-xs font-medium rounded-lg border border-slate-200 pl-9 py-2 text-slate-700 hover:border-slate-300 focus:border-primary focus:ring-primary focus:ring-1 bg-white h-auto cursor-pointer"
                    value={formatDateForInput(endDate)}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                  />
                  <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Priority Dropdown */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                  Priority
                </Label>
                <div className="relative">
                  <select
                    className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer pr-8"
                    value={getNormalizedPriority(priority)}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* StopWatch Time Tracker */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                  Time Tracked
                </Label>
                <div className="flex items-center justify-between border border-slate-200 bg-slate-50/50 rounded-lg px-3 py-1.5 h-[34px]">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-3.5 h-3.5 text-slate-400 ${isTimerRunning ? 'animate-spin text-green-500' : ''}`} />
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {formatTime(elapsedSeconds)}
                    </span>
                    {isTimerRunning && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-500 hover:bg-slate-200 rounded-full"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                  >
                    {isTimerRunning ? (
                      <Pause className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-green-600 fill-green-600 ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>

            </div>

            {/* Description Textarea Area */}
            <div className="space-y-2 pt-2">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Description
              </Label>
              <Textarea
                className="w-full text-xs text-slate-700 bg-slate-50/30 hover:bg-white focus:bg-white border border-slate-200/80 hover:border-slate-300 focus:border-primary rounded-xl p-3 min-h-[100px] leading-relaxed transition-all focus:outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Expand upon strategic goals, execution workflows, database structures, or edge cases here..."
              />
            </div>

            {/* Nested Child Items Section */}
            {node.children && node.children.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                  {node.type === "milestone" 
                    ? "Roadmap Issues" 
                    : node.type === "issue" 
                      ? "Associated Tasks" 
                      : "Subtasks"
                  } ({node.children.length})
                </Label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {node.children.map((child) => (
                    <div 
                      key={child.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {child.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        {child.status && (
                          <Badge variant="outline" className="text-[10px] font-medium py-0.5 uppercase tracking-wider text-slate-500 border-slate-200 bg-white">
                            {child.status}
                          </Badge>
                        )}
                        <div className="flex items-center gap-2">
                          <Progress value={child.progress} className="w-12 h-1 bg-slate-100" />
                          <span className="text-[10px] font-bold text-slate-400">{child.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Checklist Component */}
            {checklists.map((activeList) => {
              const items = activeList.Items || [];
              const completedCount = items.filter((item: any) => item.isCompleted).length;
              const percent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
              
              return (
              <div key={activeList.id} className="space-y-3 pt-2 border-t border-slate-100">
                <div 
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => setShowChecklist(!showChecklist)}
                >
                  <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5 select-none group-hover:text-primary">
                    <ListTodo className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary" /> 
                    {activeList.title} ({completedCount}/{items.length})
                  </Label>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-all ${showChecklist ? 'rotate-90' : ''}`} />
                </div>

                {showChecklist && (
                  <div className="space-y-3 pl-1 animate-in fade-in duration-200">
                    {/* Checklist Progress Bar */}
                    {items.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>PROGRESS</span>
                          <span>{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-1 bg-slate-100 accent-primary" />
                      </div>
                    )}

                    {/* Checklist Items list */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between group py-1 border-b border-dashed border-slate-100 hover:border-slate-200/70">
                          <div className="flex items-center gap-2.5">
                            <Checkbox 
                              id={`check-${item.id}`}
                              checked={item.isCompleted}
                              onCheckedChange={() => handleToggleChecklist(item.id, item.isCompleted)}
                              className="w-4 h-4 border-slate-300 data-[state=checked]:bg-primary"
                            />
                            <label 
                              htmlFor={`check-${item.id}`}
                              className={`text-xs font-medium cursor-pointer select-none text-slate-700 ${item.isCompleted ? 'line-through text-slate-400/80 font-normal' : ''}`}
                            >
                              {item.content}
                            </label>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-all"
                            onClick={() => handleDeleteChecklistItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Add Checklist Item Form */}
                    <form onSubmit={(e) => handleAddChecklistItem(e, activeList.id)} className="flex gap-2">
                      <Input 
                        className="text-xs h-8 border border-slate-200 rounded-lg placeholder-slate-400 bg-white"
                        placeholder="Add an actionable sub-step..."
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                      />
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="h-8 text-xs font-semibold px-3 bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        Add
                      </Button>
                    </form>
                  </div>
                )}
              </div>
              )
            })}

            {/* Dynamic Attachments Component */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setShowAttachments(!showAttachments)}
              >
                <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5 select-none group-hover:text-primary">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary" /> 
                  Attachments ({attachments.length})
                </Label>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-all ${showAttachments ? 'rotate-90' : ''}`} />
              </div>

              {showAttachments && (
                <div className="space-y-3 pl-1 animate-in fade-in duration-200">
                  
                  {/* File List */}
                  <div className="grid grid-cols-2 gap-3">
                    {attachments.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <div className="h-8 w-8 bg-blue-100/60 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{file.name}</p>
                            <p className="text-[9px] font-medium text-slate-400">{file.size}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-400 hover:text-red-500 rounded-full shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => setAttachments(prev => prev.filter(f => f.id !== file.id))}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add File Trigger */}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="w-full text-xs font-semibold py-2 border-dashed border-slate-200 hover:border-primary hover:bg-slate-50 text-slate-500 hover:text-primary rounded-xl gap-2"
                    onClick={handleFileUploadSimulated}
                    disabled={isUploading}
                  >
                    <Plus className="w-3.5 h-3.5" /> 
                    {isUploading ? "Uploading..." : "Attach File (Simulate)"}
                  </Button>

                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Activity & Comments Feed (40% width) */}
          <div className="w-full md:w-2/5 overflow-hidden flex flex-col bg-slate-50/50">
            
            {/* Right Pane Title Header */}
            <div className="px-6 py-4 border-b border-slate-200/50 bg-white/70 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-primary" /> Activity & Feed
              </span>
              <Badge className="bg-slate-100 hover:bg-slate-200 text-slate-600 border-none font-semibold text-[10px] rounded-full px-2 py-0.5">
                {activities.length} logs
              </Badge>
            </div>

            {/* Scrollable Feed Logs list */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0"
            >
              {activities.map(log => (
                <div key={log.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {log.type === "activity" ? (
                    // Technical System logs
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold">
                        <Tag className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          <span className="font-bold text-slate-800 mr-1">{log.userName}</span> 
                          {log.text}
                        </p>
                        <p className="text-[9px] font-medium text-slate-400">{log.time}</p>
                      </div>
                    </div>
                  ) : (
                    // Standard User Comment
                    <div className="flex gap-3 items-start">
                      <Avatar className="w-6 h-6 shrink-0 border border-slate-200">
                        <AvatarImage src={log.userImage} />
                        <AvatarFallback className="text-[10px] font-bold bg-purple-100 text-purple-700">
                          {log.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800">{log.userName}</span>
                          <span className="text-[9px] font-medium text-slate-400">{log.time}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-normal font-medium whitespace-pre-line">
                          {log.text}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Rich Interactive Comment Composer Box */}
            <div className="p-4 border-t border-slate-200/60 bg-white sticky bottom-0 z-40 shrink-0">
              <form onSubmit={handleAddComment} className="flex gap-3 items-start">
                <Avatar className="w-6 h-6 shrink-0 border border-slate-200 mt-1">
                  <AvatarImage src={activeUser?.image} />
                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                    {activeUser?.name ? activeUser.name.charAt(0).toUpperCase() : "A"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus-within:bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary border border-slate-200 rounded-2xl p-2 transition-all flex flex-col gap-2">
                  <textarea
                    className="w-full text-xs bg-transparent border-none focus:ring-0 focus:outline-none placeholder-slate-400 text-slate-700 resize-none max-h-24 px-1 pt-1 min-h-[44px]"
                    placeholder="Write an insightful comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  
                  {/* Toolbar & Send */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 px-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                        <Paperclip className="w-3.5 h-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                        <Tag className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      size="icon"
                      className="h-6.5 w-6.5 rounded-xl bg-primary text-white shadow-sm hover:bg-primary/95 transition-all"
                      disabled={!commentText.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
