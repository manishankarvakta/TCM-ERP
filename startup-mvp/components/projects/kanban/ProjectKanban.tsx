"use client";

import { useState, useEffect, useMemo } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanFilters } from "./KanbanFilters";
import { TaskDrawer } from "./TaskDrawer";
import { updateKanbanTaskStatus } from "@/app/actions/projects/kanban.action";
// @ts-expect-error - Legacy compatibility
import { useProjectSocket } from "@/lib/system/realtime-hooks";
import { toast } from "sonner";

interface ProjectKanbanProps {
    projectId: string;
    initialTasks: any[];
}

const COLUMNS = [
    { id: "backlog", title: "Backlog" },
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "review", title: "Review" },
    { id: "testing", title: "Testing" },
    { id: "done", title: "Done" },
    { id: "blocked", title: "Blocked" }
];

export function ProjectKanban({ projectId, initialTasks }: ProjectKanbanProps) {
    const [tasks, setTasks] = useState(initialTasks);
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("ALL");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Compute active task for the drawer
    const selectedTask = useMemo(() => {
        return selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null;
    }, [selectedTaskId, tasks]);

    // 1. Hook into the Realtime WebSocket layer
    const socket = useProjectSocket(projectId);

    useEffect(() => {
        if (!socket) return;

        const handleTaskUpdate = (event: any) => {
            if (event.type === 'TASK_UPDATED') {
                setTasks(current => 
                    current.map(t => t.id === event.payload.id ? { ...t, ...event.payload } : t)
                );
            }
        };

        socket.on('project_event', handleTaskUpdate);
        return () => { socket.off('project_event', handleTaskUpdate); };
    }, [socket]);

    // 2. Handle Optimistic Drag and Drop
    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId) return; // Order not maintained in DB

        // Optimistic State Snapshot
        const previousTasks = [...tasks];
        
        // Optimistic Update
        const newStatus = destination.droppableId;
        setTasks(current => 
            current.map(t => t.id === draggableId ? { ...t, status: newStatus } : t)
        );

        // Fire Server Action
        const response = await updateKanbanTaskStatus(draggableId, newStatus, projectId);
        
        // Rollback on Failure
        if (!response.success) {
            setTasks(previousTasks);
            toast.error(response.error || "Failed to move task due to RBAC or Server error.");
        }
    };

    // 3. Compute Derived State (Filtering)
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPriority = priorityFilter === "ALL" || task.priority?.toLowerCase() === priorityFilter.toLowerCase();
            return matchesSearch && matchesPriority;
        });
    }, [tasks, searchQuery, priorityFilter]);

    // 4. Render Board
    return (
        <div className="flex flex-col h-full w-full">
            <KanbanFilters 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
            />
            <div className="flex h-full w-full overflow-x-auto gap-4 p-4 pb-8 items-start">
                <DragDropContext onDragEnd={onDragEnd}>
                    {COLUMNS.map(col => (
                        <KanbanColumn 
                            key={col.id} 
                            id={col.id} 
                            title={col.title} 
                            tasks={filteredTasks.filter(t => (t.status || 'todo').toLowerCase() === col.id)} 
                            onTaskClick={(id) => setSelectedTaskId(id)}
                        />
                    ))}
                </DragDropContext>
            </div>

            <TaskDrawer 
                isOpen={!!selectedTask}
                onClose={() => setSelectedTaskId(null)}
                task={selectedTask}
                allTasks={tasks}
                projectId={projectId}
            />
        </div>
    );
}
