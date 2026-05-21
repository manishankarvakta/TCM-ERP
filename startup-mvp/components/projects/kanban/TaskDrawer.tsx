"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DependencyPicker } from "../dependencies/DependencyPicker";
import { DependencyGraph } from "../dependencies/DependencyGraph";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User } from "lucide-react";

interface TaskDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task: any;
    allTasks: any[]; // Needed for the dependency picker to show available links
    projectId: string;
}

export function TaskDrawer({ isOpen, onClose, task, allTasks, projectId }: TaskDrawerProps) {
    if (!task) return null;

    // Isolate tasks that are safe to show in the DependencyPicker
    // Provide a normalized list [{ id, title }]
    const normalizedTasksForPicker = allTasks.map(t => ({ id: t.id, title: t.title }));

    // Extract blocks/dependent relationships from the Prisma fetched relations (if any)
    const blockingTasks = task.DependentTasks?.map((dep: any) => ({
        id: dep.BlockingTask?.id,
        title: dep.BlockingTask?.title || "Unknown Task",
        status: dep.BlockingTask?.status || "Unknown"
    })) || [];

    const dependentTasks = task.BlockingTasks?.map((dep: any) => ({
        id: dep.DependentTask?.id,
        title: dep.DependentTask?.title || "Unknown Task",
        status: dep.DependentTask?.status || "Unknown"
    })) || [];

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 border-l">
                <SheetHeader className="p-6 pb-4 border-b">
                    <div className="flex justify-between items-start mb-2">
                        <SheetTitle className="text-xl leading-tight pr-8">{task.title}</SheetTitle>
                    </div>
                    <SheetDescription className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                            {task.status}
                        </Badge>
                        {task.priority && (
                            <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">
                                {task.priority} Priority
                            </Badge>
                        )}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="flex flex-col gap-6">
                        
                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg border">
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-xs font-semibold">Assignee</span>
                                <span className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    {task.Assignee?.name || "Unassigned"}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-xs font-semibold">Due Date</span>
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date Set"}
                                </span>
                            </div>
                        </div>

                        {/* Description block (if any) */}
                        {task.description && (
                            <div className="flex flex-col gap-2">
                                <h3 className="text-sm font-semibold border-b pb-2">Description</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {task.description}
                                </p>
                            </div>
                        )}

                        {/* Dependency Zone */}
                        <div className="flex flex-col gap-2 mt-4">
                            <h3 className="text-sm font-semibold border-b pb-2">Dependency Management</h3>
                            <p className="text-xs text-muted-foreground mb-2">
                                Link tasks to construct sequential Sprints. Circular loops will be automatically rejected.
                            </p>
                            
                            <DependencyPicker 
                                projectId={projectId}
                                currentTaskId={task.id}
                                availableTasks={normalizedTasksForPicker}
                            />

                            <DependencyGraph 
                                currentTaskTitle={task.title}
                                blockingTasks={blockingTasks}
                                dependentTasks={dependentTasks}
                            />
                        </div>

                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
