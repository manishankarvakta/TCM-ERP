"use client";

import { Droppable } from "@hello-pangea/dnd";
import { KanbanCard } from "./KanbanCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
    id: string;
    title: string;
    tasks: any[];
}

export function KanbanColumn({ id, title, tasks }: KanbanColumnProps) {
    return (
        <div className="flex flex-col flex-shrink-0 w-80 bg-muted/50 rounded-xl overflow-hidden border border-border/50 h-full max-h-[calc(100vh-12rem)]">
            {/* Column Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/80 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {title}
                </h3>
                <Badge variant="secondary" className="bg-background">
                    {tasks.length}
                </Badge>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                            "flex-1 p-3 overflow-y-auto transition-colors duration-200",
                            snapshot.isDraggingOver ? "bg-primary/5" : ""
                        )}
                    >
                        {tasks.map((task, index) => (
                            <KanbanCard key={task.id} task={task} index={index} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
