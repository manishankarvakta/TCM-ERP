"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ProjectKanbanCard } from "./ProjectKanbanCard";
import { EmptyState } from "@/components/crm/EmptyState";
import { FiBriefcase } from "react-icons/fi";
import { updateProject } from "@/app/actions/projects/project.action";
import { toast } from "sonner";

interface Props {
  initialProjects: any[];
  onRefresh: () => void;
}

const STAGES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

const STAGE_LABELS: Record<string, string> = {
  "PLANNING": "Planning",
  "ACTIVE": "Active",
  "ON_HOLD": "On Hold",
  "COMPLETED": "Completed",
  "CANCELLED": "Cancelled",
};

interface ColumnProps {
    id: string;
    title: string;
    projects: any[];
}

function KanbanColumn({ id, title, projects }: ColumnProps) {
    const { setNodeRef } = useDroppable({
      id: id,
    });
  
    return (
      <div className="flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg border">
        <div className="p-3 border-b bg-muted/50 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <h3>{title}</h3>
          <span className="bg-background px-2 py-0.5 rounded border">
            {projects.length}
          </span>
        </div>
  
        <div
          ref={setNodeRef}
          className="flex-1 p-2 overflow-y-auto min-h-[150px] space-y-3"
        >
          <SortableContext
            items={projects.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {projects.map((project) => (
              <ProjectKanbanCard key={project.id} project={project} />
            ))}
          </SortableContext>
        </div>
      </div>
    );
}

export default function ProjectKanban({ initialProjects, onRefresh }: Props) {
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = useMemo(() => {
    return STAGES.map((stage) => ({
      id: stage,
      title: STAGE_LABELS[stage],
      projects: projects.filter((project) => project.status === stage),
    }));
  }, [projects]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeId),
    [activeId, projects]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const currentActiveId = active.id as string;
    const overId = over.id as string;
    
    const activeProject = projects.find((p) => p.id === currentActiveId);
    if (!activeProject) {
      setActiveId(null);
      return;
    }

    const newStatus = STAGES.includes(overId) 
        ? overId 
        : projects.find(p => p.id === overId)?.status;

    if (!newStatus || activeProject.status === newStatus) {
      setActiveId(null);
      return;
    }

    // Optimistic Update
    const prevProjects = [...projects];
    setProjects((prev) =>
      prev.map((p) => p.id === currentActiveId ? { ...p, status: newStatus } : p)
    );

    setActiveId(null);

    try {
      const result = await updateProject(currentActiveId, { status: newStatus });
      if (result.success) {
        toast.success(`Project moved to ${STAGE_LABELS[newStatus]}`);
        onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to move project");
      setProjects(prevProjects);
    }
  };

  if (projects.length === 0) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed min-h-[400px]">
            <EmptyState 
                icon={FiBriefcase} 
                title="No Projects Yet" 
                description="Keep track of your projects in the pipeline."
            />
        </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-250px)]">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            projects={column.projects}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: "0.5" } }
        })
      }}>
        {activeId && activeProject ? (
          <ProjectKanbanCard project={activeProject} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
