"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { OpportunityStage } from "@prisma/client";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { EmptyState } from "@/components/crm/EmptyState";
import { FiTrendingUp } from "react-icons/fi";
import { updateOpportunityStage, getOpportunities } from "@/app/actions/crm/opportunity.action";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import OpportunityForm from "@/app/(dashboard)/dashboard/crm/opportunities/_components/OpportunityForm";
import { FiPlus } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface Opportunity {
  id: string;
  title: string;
  value: number | any;
  stage: OpportunityStage;
  client: { name: string };
  contact: { firstName: string, lastName: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Props {
  initialOpportunities: any[];
  initialPagination?: Pagination;
  clients: any[];
  canCreate: boolean;
}

const STAGES: OpportunityStage[] = [
  "DISCOVERY",
  "QUALIFIED",
  "SOLUTION",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const STAGE_LABELS: Record<OpportunityStage, string> = {
  DISCOVERY: "Discovery",
  QUALIFIED: "Qualified",
  SOLUTION: "Solution",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export function OpportunityKanban({ initialOpportunities, initialPagination, clients, canCreate }: Props) {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<any[]>(initialOpportunities);
  const [pagination, setPagination] = useState<Pagination | undefined>(initialPagination);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStartStage, setActiveStartStage] = useState<OpportunityStage | null>(null);

  const handleCreateSuccess = () => {
    setIsDialogOpen(false);
    router.refresh();
    // Optimistic update or refetch could happen here, but router.refresh() handles server data sync.
    // However, since we have local state 'opportunities', we might need to properly re-sync or append.
    // Ideally router.refresh() updates the server component which passes new props.
    // But since we seed state from props, we need useEffect to update state when props change.
  };

  // Sync state with props when router.refresh() brings new data
  React.useEffect(() => {
    setOpportunities(initialOpportunities);
    setPagination(initialPagination);
  }, [initialOpportunities, initialPagination]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = useMemo(() => {
    return STAGES.map((stage) => ({
      id: stage,
      title: STAGE_LABELS[stage],
      opportunities: opportunities.filter((op) => op.stage === stage),
    }));
  }, [opportunities]);

  // Column-specific pagination state
  const [columnStates, setColumnStates] = useState<Record<string, { page: number; hasMore: boolean; loading: boolean }>>(() => {
    const initial: Record<string, { page: number; hasMore: boolean; loading: boolean }> = {};
    STAGES.forEach(stage => {
        // We assume initially there might be more if we hit the global limit, 
        // but robustly we should probably treat initial load as page 1.
        // For simplicity, we'll start at page 1 for additional fetches.
        initial[stage] = { page: 1, hasMore: true, loading: false };
    });
    return initial;
  });

  const handleColumnLoadMore = async (stage: OpportunityStage) => {
    const currentState = columnStates[stage];
    if (currentState.loading) return;

    setColumnStates(prev => ({
        ...prev,
        [stage]: { ...prev[stage], loading: true }
    }));

    try {
        const nextPage = currentState.page + 1;
        // Fetch only for this stage
        const result = await getOpportunities(nextPage, 10, "", stage);
        
        if (result.success) {
            setOpportunities(prev => {
                // Determine unique new items to avoid duplicates if any overlap exists
                const existingIds = new Set(prev.map(o => o.id));
                const newItems = result.opportunities.filter((o: any) => !existingIds.has(o.id));
                return [...prev, ...newItems];
            });

            setColumnStates(prev => ({
                ...prev,
                [stage]: { 
                    page: nextPage, 
                    loading: false, 
                    hasMore: result.pagination.page < result.pagination.totalPages 
                }
            }));
        } else {
            toast.error("Failed to load more");
            setColumnStates(prev => ({
                ...prev,
                [stage]: { ...prev[stage], loading: false }
            }));
        }
    } catch (error) {
        setColumnStates(prev => ({
            ...prev,
            [stage]: { ...prev[stage], loading: false }
        }));
    }
  };

  const activeOpportunity = useMemo(
    () => opportunities.find((op) => op.id === activeId),
    [activeId, opportunities]
  );
  
  // Removed global handleLoadMore

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    const op = opportunities.find((o) => o.id === id);
    if (op) {
      setActiveStartStage(op.stage);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // We intentionally avoid mutating state here to preserve data integrity until drop.
    // Visual feedback might be less "live" but state remains consistent.
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveStartStage(null);
      return;
    }

    const currentActiveId = active.id as string;
    const overId = over.id as string;
    
    // Find item
    const activeOp = opportunities.find((op) => op.id === currentActiveId);
    if (!activeOp) {
      setActiveId(null);
      setActiveStartStage(null);
      return;
    }

    // Determine New Stage
    const isOverColumn = STAGES.includes(overId as any);
    const newStage = isOverColumn 
        ? (overId as OpportunityStage) 
        : opportunities.find(op => op.id === overId)?.stage;

    // If no stage change, do nothing
    if (!newStage || activeOp.stage === newStage) {
      setActiveId(null);
      setActiveStartStage(null);
      return;
    }

    // Capture Previous State for Rollback
    const previousOpportunities = [...opportunities];

    // Optimistic Update
    setOpportunities((prev) =>
      prev.map((op) =>
        op.id === currentActiveId ? { ...op, stage: newStage } : op
      )
    );

    setActiveId(null);
    setActiveStartStage(null);

    // Persist to DB
    try {
      const result = await updateOpportunityStage(currentActiveId, newStage);
      if (!result.success) {
        throw new Error(result.error || "Failed to update stage");
      }
      toast.success(`Moved to ${STAGE_LABELS[newStage]}`);
    } catch (error) {
      console.error("Drag update failed", error);
      toast.error("Failed to update status. Reverting...");
      setOpportunities(previousOpportunities);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-end">
        {canCreate && (
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <FiPlus /> New Opportunity
            </Button>
        )}
      </div>

      {opportunities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/10 border-dashed">
            <EmptyState 
                icon={FiTrendingUp} 
                title="No Opportunities Yet" 
                description={canCreate ? "Start building your pipeline by creating a new opportunity." : "No opportunities found."}
                actionLabel={canCreate ? "Create Opportunity" : undefined}
                onAction={canCreate ? () => setIsDialogOpen(true) : undefined}
            />
        </div>
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              opportunities={column.opportunities}
              hasMore={columnStates[column.id]?.hasMore}
              loading={columnStates[column.id]?.loading}
              onLoadMore={() => handleColumnLoadMore(column.id as OpportunityStage)}
            />
          ))}
          
          {/* Minimum width spacer to prevent Kanban form collapsing when empty */}
          <div className="min-w-[1px] h-full" />
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: "0.5",
              },
            },
          }),
        }}>
          {activeId && activeOpportunity ? (
            <KanbanCard opportunity={activeOpportunity} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
      )}
      
      {/* Global Pagination Removed in favor of per-column infinite scroll */}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Opportunity</DialogTitle>
            <DialogDescription>
              Create a new deal in the pipeline.
            </DialogDescription>
          </DialogHeader>
          <OpportunityForm 
            clients={clients} 
            onSuccess={handleCreateSuccess} 
            onCancel={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
