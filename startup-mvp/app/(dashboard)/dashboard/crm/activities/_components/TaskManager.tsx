"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Clock, 
    MoreVertical, 
    User, 
    Calendar,
    CheckCircle2,
    Circle,
    AlertCircle,
    Plus
} from "lucide-react";
import { format } from "date-fns";
import { updateTask } from "@/app/actions/system/task.action";
import { TaskForm } from "@/app/(dashboard)/dashboard/tasks/_components/TaskForm";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader,
    SheetTitle,
    SheetTrigger 
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskItem {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: Date | string | null;
    User?: {
        id: string;
        name: string | null;
        email: string;
        image?: string | null;
    } | null;
}

interface TaskManagerProps {
    entityId: string;
    entityType: "lead" | "opportunity" | "contact";
    tasks: any[];
    users?: { id: string; name: string | null; email: string; image?: string | null }[];
}

export default function TaskManager({ entityId, entityType, tasks, users }: TaskManagerProps) {
    const [taskList, setTaskList] = useState<TaskItem[]>(tasks);

    // Sync local state when props change (revalidation)
    useEffect(() => {
        setTaskList(tasks);
    }, [tasks]);

    const [loading, setLoading] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
    const router = useRouter();

    const handleToggleComplete = async (task: TaskItem) => {
        try {
            setLoading(task.id);
            const isCompleted = task.status === "completed";
            const newStatus = isCompleted ? "todo" : "completed";
            
            const result = await updateTask(task.id, { 
                status: newStatus 
            });
            
            if (result.success) {
                setTaskList(prev => prev.map(t => 
                    t.id === task.id ? { ...t, status: newStatus } : t
                ));
                toast.success(newStatus === "completed" ? "Task completed" : "Task reopened");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update task");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
             setLoading(null);
        }
    };

    const handleCreateNew = () => {
        setSelectedTask(null);
        setIsSheetOpen(true);
    };

    const handleEditTask = (task: TaskItem) => {
        setSelectedTask(task);
        setIsSheetOpen(true);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toUpperCase()) {
            case "HIGH": return "bg-red-500/10 text-red-600 border-red-200";
            case "NORMAL": return "bg-blue-500/10 text-blue-600 border-blue-200";
            case "LOW": return "bg-slate-500/10 text-slate-600 border-slate-200";
            default: return "bg-slate-500/10 text-slate-600 border-slate-200";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mx-4 pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Tasks
                </h3>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="gap-2" onClick={handleCreateNew}>
                            <Plus className="h-4 w-4" />
                            Add Task
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-md">
                        <SheetHeader className="mb-4">
                            <SheetTitle>{selectedTask ? "Edit Task" : "Create New Task"}</SheetTitle>
                        </SheetHeader>
                        <TaskForm 
                            entityId={entityId}
                            entityType={entityType}
                            initialData={selectedTask ? {
                                ...selectedTask,
                                description: selectedTask.description || undefined,
                                assigneeId: selectedTask.User?.id
                            } as any : null}
                            onSuccess={() => {
                                setIsSheetOpen(false);
                                router.refresh(); 
                            }}
                            onCancel={() => setIsSheetOpen(false)}
                            users={users as any}
                        />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="grid gap-3 p-4 pt-0">
                {taskList.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <p className="text-sm text-muted-foreground font-medium">No tasks found for this {entityType}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Stay organized by creating your first task.</p>
                    </div>
                ) : (
                    taskList.map((task) => {
                        const isCompleted = task.status === "completed";
                        return (
                            <Card key={task.id} className={cn(
                                "group transition-all duration-200 hover:shadow-md border-border/50 cursor-pointer",
                                isCompleted ? "bg-muted/30" : "bg-card"
                            )} onClick={() => handleEditTask(task)}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox 
                                                checked={isCompleted} 
                                                onCheckedChange={() => handleToggleComplete(task)}
                                                disabled={loading === task.id}
                                                className="h-5 w-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className={cn(
                                                        "text-sm font-semibold transition-all truncate",
                                                        isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                                                    )}>
                                                        {task.title}
                                                    </h4>
                                                    {task.description && !isCompleted && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-medium">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider h-5", getPriorityColor(task.priority))}>
                                                        {task.priority}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mt-3">
                                                {task.dueDate && (
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 text-[11px] font-bold",
                                                        new Date(task.dueDate) < new Date() && !isCompleted ? "text-red-500" : "text-muted-foreground"
                                                    )}>
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                                                    </div>
                                                )}
                                                {task.User && (
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                                            Assignee: {task.User.name || "User"}
                                                        </span>
                                                        <div className="h-6 w-6 rounded-full ring-2 ring-background overflow-hidden bg-muted border border-primary/20" title={`Assigned to: ${task.User.name || task.User.email}`}>
                                                            {task.User.image ? (
                                                                <img src={task.User.image} alt={task.User.name || ""} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold uppercase text-primary">
                                                                    {(task.User.name || task.User.email || "?").charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
