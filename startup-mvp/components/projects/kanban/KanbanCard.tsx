"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlockedIndicator } from "../dependencies/BlockedIndicator";

interface KanbanCardProps {
    task: any;
    index: number;
}

const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
};

export function KanbanCard({ task, index }: KanbanCardProps) {
    // Determine blocking tasks. Prisma usually includes DependentTasks if fetched.
    const blockingCount = task.DependentTasks ? task.DependentTasks.length : 0;

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                        "mb-3",
                        snapshot.isDragging && "opacity-80 rotate-2 scale-105 transition-transform shadow-xl"
                    )}
                >
                    <Card className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors">
                        <CardHeader className="p-3 pb-0">
                            <div className="flex justify-between items-start mb-2">
                                <CardTitle className="text-sm font-medium leading-tight">
                                    {task.title}
                                </CardTitle>
                                {task.priority && (
                                    <Badge variant="outline" className={cn("text-[10px] uppercase", priorityColors[task.priority.toLowerCase()] || "bg-gray-100")}>
                                        {task.priority}
                                    </Badge>
                                )}
                            </div>
                            <BlockedIndicator blockingTasksCount={blockingCount} />
                        </CardHeader>
                        <CardContent className="p-3 pt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                <div className="flex items-center gap-1">
                                    {task.dueDate ? (
                                        <>
                                            <Calendar className="h-3 w-3" />
                                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-3 w-3 text-orange-400" />
                                            <span>No Date</span>
                                        </>
                                    )}
                                </div>
                                {task.Assignee && (
                                    <Avatar className="h-6 w-6 border">
                                        <AvatarFallback className="text-[10px]">
                                            {task.Assignee.name?.substring(0, 2).toUpperCase() || "UN"}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </Draggable>
    );
}
