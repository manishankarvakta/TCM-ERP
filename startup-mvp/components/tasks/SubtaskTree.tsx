"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, GitMerge, Clock } from "lucide-react";
import { createTask, updateTask } from "@/app/actions/system/task.action";
import { toast } from "sonner";
import { format } from "date-fns";

interface SubtaskTreeProps {
    parentTaskId: string;
    subtasks: any[];
    entityType?: string;
    entityId?: string;
    onRefresh: () => void;
}

export default function SubtaskTree({ parentTaskId, subtasks, entityType, entityId, onRefresh }: SubtaskTreeProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCreateSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        const res = await createTask({
            title: newTitle,
            parentId: parentTaskId,
            entityType,
            entityId
        } as any);

        if (res.success) {
            toast.success("Subtask created");
            setNewTitle("");
            setIsAdding(false);
            onRefresh();
        } else {
            toast.error(res.error || "Failed to create subtask");
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = (currentStatus === 'completed' || currentStatus === 'done') ? 'todo' : 'completed';
        const res = await updateTask(id, { status: newStatus });
        
        if (res.success) {
            toast.success("Status updated");
            onRefresh();
        } else {
            // This is where the Dependency Interlock error surfaces safely
            toast.error(res.error || "Failed to update status");
        }
    };

    // Calculate Completion
    const total = subtasks.length;
    const completed = subtasks.filter(t => t.status === 'completed' || t.status === 'done').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-muted-foreground" />
                    Subtasks ({completed}/{total})
                </h4>
                {total > 0 && (
                     <Badge variant={progress === 100 ? "success" : "secondary"} className="text-xs">
                         {progress}%
                     </Badge>
                )}
            </div>

            <div className="space-y-1">
                {subtasks.length === 0 && !isAdding && (
                    <div className="text-sm text-muted-foreground italic py-2 px-1">No subtasks defined.</div>
                )}
                
                {subtasks.map((task) => (
                    <div key={task.id} className="group flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                        <Checkbox 
                            checked={task.status === 'completed' || task.status === 'done'}
                            onCheckedChange={() => handleToggleStatus(task.id, task.status)}
                            className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${task.status === 'completed' || task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                            </p>
                            {task.dueDate && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" /> {format(new Date(task.dueDate), "MMM d")}
                                </p>
                            )}
                        </div>
                        <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase">
                            {task.priority}
                        </Badge>
                    </div>
                ))}

                {isAdding ? (
                    <form onSubmit={handleCreateSubtask} className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
                        <Input 
                            autoFocus
                            size={1}
                            placeholder="Describe subtask..."
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="h-8 text-sm"
                        />
                        <Button type="submit" size="sm" className="h-8 shrink-0">Save</Button>
                        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={() => setIsAdding(false)}>Cancel</Button>
                    </form>
                ) : (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground mt-1 h-8"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add subtask
                    </Button>
                )}
            </div>
        </div>
    );
}
