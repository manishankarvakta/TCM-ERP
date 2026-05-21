"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { DndContext, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { updateIssue } from "@/app/actions/projects/project.action";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    MoreVertical, Edit3, Trash2, ChevronRight, ChevronDown,
    CheckSquare, AlertCircle, Target, CornerDownRight,
    LayoutList, LayoutGrid, Circle, Clock, User
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    Assignee?: { id: string; name: string; image?: string };
}

interface Issue {
    id: string;
    issueNumber: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    type: string;
    milestoneId: string;
    assigneeId?: string;
    createdAt: string | Date;
    Assignee?: { id: string; name: string; image?: string };
    Reporter: { id: string; name: string };
    Tasks?: Task[];
}

interface Milestone {
    id: string;
    title: string;
    status: string;
    Issues?: Issue[];
}

interface ProjectIssuesKanbanProps {
    project: any;
    onRefresh: () => void;
    onEditIssue: (issue: any) => void;
    onDeleteIssue: (id: string) => void;
    hasOp: (key: string, op: any) => boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LANES = [
    { id: "OPEN",        title: "Open",        color: "bg-slate-500",   bg: "bg-slate-50/60 dark:bg-slate-900/30",  ring: "ring-slate-200",   badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    { id: "IN_PROGRESS", title: "In Progress",  color: "bg-amber-500",   bg: "bg-amber-50/60 dark:bg-amber-900/20",  ring: "ring-amber-200",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    { id: "REVIEW",      title: "Under Review", color: "bg-blue-500",    bg: "bg-blue-50/60 dark:bg-blue-900/20",    ring: "ring-blue-200",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    { id: "COMPLETED",   title: "Completed",    color: "bg-emerald-500", bg: "bg-emerald-50/60 dark:bg-emerald-900/20", ring: "ring-emerald-200", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
    { id: "CLOSED",      title: "Closed",       color: "bg-gray-400",    bg: "bg-gray-50/60 dark:bg-gray-900/20",    ring: "ring-gray-200",    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
];

const PRIORITY_STYLES: Record<string, string> = {
    CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
    HIGH:     "bg-amber-100 text-amber-700 border-amber-200",
    NORMAL:   "bg-blue-100 text-blue-700 border-blue-200",
    LOW:      "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    OPEN:        <Circle className="w-3.5 h-3.5 text-slate-400" />,
    IN_PROGRESS: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    REVIEW:      <AlertCircle className="w-3.5 h-3.5 text-blue-500" />,
    COMPLETED:   <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />,
    CLOSED:      <CheckSquare className="w-3.5 h-3.5 text-gray-400" />,
};

// ─── Board View ───────────────────────────────────────────────────────────────

function BoardCard({ issue, onEdit, onDelete, hasOp }: { issue: Issue; onEdit: (i: any) => void; onDelete: (id: string) => void; hasOp: (k: string, op: any) => boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: issue.id });
    const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50 } : undefined;
    const completedTasks = issue.Tasks?.filter(t => t.status === "COMPLETED").length ?? 0;
    const totalTasks = issue.Tasks?.length ?? 0;
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-background border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all p-4 space-y-3 ${isDragging ? "opacity-40 scale-95" : ""}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div {...listeners} {...attributes} className="flex-1 cursor-grab active:cursor-grabbing">
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                        {issue.issueNumber || `#${issue.id.slice(0, 6)}`}
                    </span>
                    <h5 className="text-sm font-bold leading-snug mt-0.5 line-clamp-2">{issue.title}</h5>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {hasOp("projects.issues", "edit") && (
                            <DropdownMenuItem onClick={() => onEdit(issue)} className="cursor-pointer">
                                <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                        )}
                        {(hasOp("projects.issues", "delete-permanently") || hasOp("projects.issues", "move-to-trash")) && (
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => onDelete(issue.id)}>
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Description */}
            {issue.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{issue.description}</p>
            )}

            {/* Task Progress */}
            {totalTasks > 0 && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                        <span>Tasks</span>
                        <span>{completedTasks}/{totalTasks}</span>
                    </div>
                    <Progress value={taskProgress} className="h-1 [&>div]:bg-primary" />
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${PRIORITY_STYLES[issue.priority] ?? ""}`}>
                    {issue.priority}
                </Badge>
                <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                        <AvatarImage src={issue.Assignee?.image} />
                        <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                            {issue.Assignee?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[70px]">
                        {issue.Assignee?.name ?? "Unassigned"}
                    </span>
                </div>
            </div>
        </div>
    );
}

function BoardLane({ lane, issues, onEdit, onDelete, hasOp }: { lane: typeof LANES[0]; issues: Issue[]; onEdit: (i: any) => void; onDelete: (id: string) => void; hasOp: (k: string, op: any) => boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id: lane.id });
    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-3 min-h-[500px] rounded-2xl border p-4 transition-all duration-200 ${lane.bg} ${isOver ? `ring-2 ${lane.ring}` : "border-border/40"}`}
        >
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${lane.color}`} />
                    <h4 className="font-bold text-sm">{lane.title}</h4>
                </div>
                <Badge className={`text-[10px] font-bold rounded-full px-2 py-0.5 shadow-none border-0 ${lane.badge}`}>
                    {issues.length}
                </Badge>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[560px] pr-0.5">
                {issues.map(issue => (
                    <BoardCard key={issue.id} issue={issue} onEdit={onEdit} onDelete={onDelete} hasOp={hasOp} />
                ))}
                {issues.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-16 text-xs text-muted-foreground/50 border-2 border-dashed border-border/40 rounded-xl">
                        No issues
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── List View ────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
    return (
        <div className="flex items-center gap-3 py-2.5 px-4 pl-20 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
            <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-sm flex-1 truncate text-muted-foreground">{task.title}</span>
            <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_STYLES[task.priority] ?? ""}`}>
                    {task.priority}
                </Badge>
                {STATUS_ICON[task.status]}
                {task.Assignee && (
                    <Avatar className="h-5 w-5">
                        <AvatarImage src={task.Assignee.image} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{task.Assignee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </div>
    );
}

function IssueRow({ issue, onEdit, onDelete, hasOp }: { issue: Issue; onEdit: (i: any) => void; onDelete: (id: string) => void; hasOp: (k: string, op: any) => boolean }) {
    const [expanded, setExpanded] = useState(false);
    const hasTasks = issue.Tasks && issue.Tasks.length > 0;
    const lane = LANES.find(l => l.id === issue.status);

    return (
        <>
            <div
                className="flex items-center gap-3 py-3 px-4 pl-10 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors group cursor-pointer"
                onClick={() => hasTasks && setExpanded(v => !v)}
            >
                {hasTasks ? (
                    expanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : <span className="w-3.5 shrink-0" />}

                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />

                <span className="text-[10px] font-bold text-muted-foreground w-16 shrink-0">
                    {issue.issueNumber || `#${issue.id.slice(0, 5)}`}
                </span>

                <span className="text-sm font-semibold flex-1 truncate">{issue.title}</span>

                <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_STYLES[issue.priority] ?? ""}`}>
                        {issue.priority}
                    </Badge>
                    {lane && (
                        <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${lane.color}`} />
                            <span className="text-[11px] font-medium text-muted-foreground hidden md:inline">{lane.title}</span>
                        </div>
                    )}
                    {issue.Assignee && (
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={issue.Assignee.image} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{issue.Assignee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {hasOp("projects.issues", "edit") && (
                                <DropdownMenuItem onClick={() => onEdit(issue)} className="cursor-pointer">
                                    <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                            )}
                            {(hasOp("projects.issues", "delete-permanently") || hasOp("projects.issues", "move-to-trash")) && (
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => onDelete(issue.id)}>
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {expanded && issue.Tasks?.map(task => <TaskRow key={task.id} task={task} />)}
        </>
    );
}

function MilestoneRow({ milestone, onEdit, onDelete, hasOp }: { milestone: Milestone; onEdit: (i: any) => void; onDelete: (id: string) => void; hasOp: (k: string, op: any) => boolean }) {
    const [expanded, setExpanded] = useState(true);
    const issues = milestone.Issues ?? [];
    const completedIssues = issues.filter(i => i.status === "COMPLETED" || i.status === "CLOSED").length;
    const progress = issues.length > 0 ? (completedIssues / issues.length) * 100 : 0;

    return (
        <div className="border border-border/50 rounded-xl overflow-hidden mb-3 shadow-sm">
            {/* Milestone Header */}
            <div
                className="flex items-center gap-3 px-4 py-3.5 bg-muted/40 border-b border-border/40 cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                {expanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="font-bold text-sm flex-1 truncate">{milestone.title}</span>

                {/* Progress */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 w-24">
                        <Progress value={progress} className="h-1.5 flex-1 [&>div]:bg-indigo-500" />
                        <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{Math.round(progress)}%</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 border-indigo-200">
                        {issues.length} issues
                    </Badge>
                </div>
            </div>

            {/* List View Header Row */}
            {expanded && (
                <div>
                    <div className="flex items-center gap-3 px-4 py-2 pl-10 bg-muted/20 border-b border-border/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        <span className="w-3.5" />
                        <span className="w-4" />
                        <span className="w-16">ID</span>
                        <span className="flex-1">Title</span>
                        <span className="hidden md:block w-20 text-right">Priority</span>
                        <span className="hidden md:block w-24 text-right">Status</span>
                        <span className="hidden md:block w-10 text-right">Owner</span>
                        <span className="w-8" />
                    </div>
                    {issues.length > 0
                        ? issues.map(issue => (
                            <IssueRow key={issue.id} issue={issue} onEdit={onEdit} onDelete={onDelete} hasOp={hasOp} />
                        ))
                        : (
                            <div className="py-8 text-center text-xs text-muted-foreground/50">
                                No issues in this milestone.
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectIssuesKanban({ project, onRefresh, onEditIssue, onDeleteIssue, hasOp }: ProjectIssuesKanbanProps) {
    const [view, setView] = useState<"board" | "list">("board");
    const [localIssues, setLocalIssues] = useState<Issue[]>([]);
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        const list = project.Milestones?.flatMap((m: any) => m.Issues || []) || [];
        setLocalIssues(list);
    }, [project]);

    // Realtime sync
    useEffect(() => {
        if (!socket || !isConnected || !project?.id) return;
        const room = `entity:project:${project.id}`;
        socket.emit("join_room", { room });
        const handleRefresh = (payload: any) => {
            if (payload?.actorId === socket.auth?.userId && payload?.metadata?.optimistic) return;
            onRefresh();
        };
        socket.on("ISSUE_UPDATED", handleRefresh);
        socket.on("ISSUE_CREATED", handleRefresh);
        socket.on("ISSUE_DELETED", handleRefresh);
        return () => {
            socket.off("ISSUE_UPDATED", handleRefresh);
            socket.off("ISSUE_CREATED", handleRefresh);
            socket.off("ISSUE_DELETED", handleRefresh);
            socket.emit("leave_room", { room });
        };
    }, [socket, isConnected, project?.id, onRefresh]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        const issueId = active.id as string;
        const targetStatus = over.id as string;
        const issue = localIssues.find(i => i.id === issueId);
        if (!issue || issue.status === targetStatus) return;

        const previous = [...localIssues];
        setLocalIssues(cur => cur.map(i => i.id === issueId ? { ...i, status: targetStatus } : i));

        const res = await updateIssue(issueId, { status: targetStatus });
        if (res.success) {
            toast.success(`Status updated to ${targetStatus}`);
            onRefresh();
        } else {
            toast.error(res.error || "Failed to update status");
            setLocalIssues(previous);
        }
    };

    // Milestones with local issue state injected
    const milestonesWithIssues: Milestone[] = (project.Milestones || []).map((m: any) => ({
        ...m,
        Issues: localIssues.filter(i => i.milestoneId === m.id)
    }));

    return (
        <div className="space-y-4">
            {/* View Toggle Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border/50">
                    <button
                        onClick={() => setView("board")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === "board" ? "bg-background shadow text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" /> Board
                    </button>
                    <button
                        onClick={() => setView("list")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === "list" ? "bg-background shadow text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <LayoutList className="w-3.5 h-3.5" /> List
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">{localIssues.length} total issues</span>
                </div>
            </div>

            {/* Board View */}
            {view === "board" && (
                <DndContext onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {LANES.map(lane => {
                            const laneIssues = localIssues.filter(i => i.status === lane.id);
                            return (
                                <BoardLane
                                    key={lane.id}
                                    lane={lane}
                                    issues={laneIssues}
                                    onEdit={onEditIssue}
                                    onDelete={onDeleteIssue}
                                    hasOp={hasOp}
                                />
                            );
                        })}
                    </div>
                </DndContext>
            )}

            {/* List View */}
            {view === "list" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {milestonesWithIssues.length > 0
                        ? milestonesWithIssues.map(milestone => (
                            <MilestoneRow
                                key={milestone.id}
                                milestone={milestone}
                                onEdit={onEditIssue}
                                onDelete={onDeleteIssue}
                                hasOp={hasOp}
                            />
                        ))
                        : (
                            <div className="py-16 text-center text-muted-foreground">
                                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="font-medium">No milestones yet</p>
                                <p className="text-sm mt-1">Create a milestone first to start tracking issues.</p>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}
