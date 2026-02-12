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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LeadStatus } from "@prisma/client";
import { LeadKanbanCard } from "./LeadKanbanCard";
import { EmptyState } from "@/components/crm/EmptyState";
import { FiUser } from "react-icons/fi";
import { updateLeadStatus, getLeads } from "@/app/actions/crm/lead.action";
import { toast } from "sonner";
import { useDroppable } from "@dnd-kit/core";

interface Props {
  initialLeads: any[];
  canCreate: boolean;
  onRefresh: () => void;
}

const STAGES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.UNQUALIFIED,
  LeadStatus.CONVERTED,
];

const STAGE_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "New",
  [LeadStatus.CONTACTED]: "Contacted",
  [LeadStatus.QUALIFIED]: "Qualified",
  [LeadStatus.UNQUALIFIED]: "Unqualified",
  [LeadStatus.CONVERTED]: "Converted",
};

interface ColumnProps {
    id: LeadStatus;
    title: string;
    leads: any[];
}

function KanbanColumn({ id, title, leads }: ColumnProps) {
    const { setNodeRef } = useDroppable({
      id: id,
    });
  
    return (
      <div className="flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg border">
        <div className="p-3 border-b bg-muted/50 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <h3>{title}</h3>
          <span className="bg-background px-2 py-0.5 rounded border">
            {leads.length}
          </span>
        </div>
  
        <div
          ref={setNodeRef}
          className="flex-1 p-2 overflow-y-auto min-h-[150px] space-y-3"
        >
          <SortableContext
            items={leads.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <LeadKanbanCard key={lead.id} lead={lead} />
            ))}
          </SortableContext>
        </div>
      </div>
    );
}

export default function LeadKanban({ initialLeads, canCreate, onRefresh }: Props) {
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = useMemo(() => {
    return STAGES.map((stage) => ({
      id: stage,
      title: STAGE_LABELS[stage],
      leads: leads.filter((lead) => lead.status === stage),
    }));
  }, [leads]);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === activeId),
    [activeId, leads]
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
    
    const activeLead = leads.find((l) => l.id === currentActiveId);
    if (!activeLead) {
      setActiveId(null);
      return;
    }

    const newStatus = STAGES.includes(overId as any) 
        ? (overId as LeadStatus) 
        : leads.find(l => l.id === overId)?.status;

    if (!newStatus || activeLead.status === newStatus) {
      setActiveId(null);
      return;
    }

    // Optimistic Update
    const prevLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => l.id === currentActiveId ? { ...l, status: newStatus } : l)
    );

    setActiveId(null);

    try {
      const result = await updateLeadStatus(currentActiveId, newStatus as LeadStatus);
      if (result.success) {
        toast.success(`Lead moved to ${STAGE_LABELS[newStatus as LeadStatus]}`);
        onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to move lead");
      setLeads(prevLeads);
    }
  };

  if (leads.length === 0) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed min-h-[400px]">
            <EmptyState 
                icon={FiUser} 
                title="No Leads Yet" 
                description="Keep track of your prospects in the pipeline."
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
            leads={column.leads}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: "0.5" } }
        })
      }}>
        {activeId && activeLead ? (
          <LeadKanbanCard lead={activeLead} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
