"use client";

import React, { useState, useMemo, useEffect, useTransition } from "react";
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
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiMove, FiCheck, FiX, FiMap, FiClock, FiSettings, FiSave } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { reorderMilestones } from "@/app/actions/projects/project.action";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string | Date;
  order: number;
}

interface MissionRoadmapPlannerProps {
  projectId: string;
  initialMilestones: Milestone[];
  onRefresh: () => void;
  onEdit: (m: Milestone) => void;
  onDelete: (id: string) => void;
}

interface SortableItemProps {
  milestone: Milestone;
  index: number;
  isPlanningMode: boolean;
  onEdit: (m: Milestone) => void;
  onDelete: (id: string) => void;
}

function SortableMilestoneCard({ milestone, index, isPlanningMode, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id, disabled: !isPlanningMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative pl-24 pb-16 last:pb-8 transition-all duration-500 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      {/* Node */}
      <div 
        {...(isPlanningMode ? { ...attributes, ...listeners } : {})}
        className={`absolute left-6 top-6 h-12 w-12 rounded-3xl bg-card border-[6px] border-primary/20 flex items-center justify-center font-black transition-all duration-700 z-10 shadow-2xl ${
          isPlanningMode 
            ? 'cursor-grab active:cursor-grabbing hover:scale-125 hover:bg-primary hover:border-primary/40 hover:text-primary-foreground text-primary shadow-primary/30' 
            : 'text-primary'
        }`}
      >
        {isPlanningMode ? <FiMove className="h-5 w-5" /> : index + 1}
      </div>

      <div className={`bg-background/80 border border-border/50 p-12 rounded-[3.5rem] transition-all duration-700 relative overflow-hidden ${
        isPlanningMode ? 'hover:border-primary/40 group-hover:bg-background group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] group-hover:-translate-y-2' : ''
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/2 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h5 className="text-3xl font-black tracking-tighter group-hover:text-primary transition-colors">
                {isPlanningMode && <span className="text-primary/40 mr-3 text-2xl">Phase {index + 1}:</span>}
                {milestone.title}
            </h5>
            <div className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="bg-muted/50 border-border/40 font-black uppercase text-[9px] tracking-[0.15em] px-4 py-1 rounded-lg">
                   {milestone.status}
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-4 border-l border-border/40">
                  <FiClock className="h-3 w-3 text-primary/60" /> 
                  <span className="group-hover:text-foreground transition-colors">Phase Target: {milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM dd, yyyy') : 'UNSCHEDULED'}</span>
                </div>
            </div>
          </div>
        </div>
        
        <p className="text-lg text-muted-foreground/80 font-medium mb-10 leading-relaxed max-w-2xl bg-muted/10 p-8 rounded-[2rem] border border-border/20 shadow-inner group-hover:bg-muted/5 transition-all duration-700">
          {milestone.description || "Mission delivery phase objectives and technical parameters currently being synthesized."}
        </p>

        {!isPlanningMode && (
             <div className="flex items-center justify-end px-4 gap-4">
                <Button 
                    variant="ghost" 
                    className="rounded-2xl h-12 font-black uppercase text-xs tracking-widest group-hover:bg-primary/5 group-hover:text-primary px-8" 
                    onClick={() => onEdit(milestone)}
                >
                    View Details <FiSettings className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                    variant="ghost" 
                    className="rounded-2xl h-12 font-black uppercase text-xs tracking-widest hover:bg-rose-500/10 text-rose-500 px-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => onDelete(milestone.id)}
                >
                    Decommission
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}

export default function MissionRoadmapPlanner({ projectId, initialMilestones, onRefresh, onEdit, onDelete }: MissionRoadmapPlannerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeMilestone = useMemo(
    () => milestones.find((m) => m.id === activeId),
    [activeId, milestones]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setMilestones((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    
    setActiveId(null);
  };

  const handleCommitSequence = async () => {
    const sequence = milestones.map((m, index) => ({ id: m.id, order: index }));
    
    startTransition(async () => {
        try {
            const result = await reorderMilestones(projectId, sequence);
            if (result.success) {
                toast.success("Mission sequence reorganized successfully");
                setIsPlanningMode(false);
                onRefresh();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Failed to commit sequence");
        }
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/50">Sequence Control</h4>
            <p className="text-xs font-medium text-muted-foreground/70 italic">Adjust mission parameters and phase orchestration.</p>
        </div>
        <div className="flex items-center gap-4">
            {isPlanningMode ? (
                <>
                    <Button 
                        variant="outline" 
                        className="rounded-xl border-dashed border-2 px-6 h-11 font-black uppercase text-[10px] tracking-wider"
                        onClick={() => {
                            setMilestones(initialMilestones);
                            setIsPlanningMode(false);
                        }}
                    >
                        <FiX className="mr-2 h-4 w-4" /> Discard
                    </Button>
                    <Button 
                        className="rounded-xl px-8 h-11 font-black uppercase text-[10px] tracking-widest bg-primary shadow-lg shadow-primary/20"
                        onClick={handleCommitSequence}
                        disabled={isPending}
                    >
                        {isPending ? "Executing..." : <><FiSave className="mr-2 h-4 w-4" /> Commit Sequence</>}
                    </Button>
                </>
            ) : (
                <Button 
                    variant="ghost" 
                    className="rounded-xl px-6 h-11 font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 text-primary border border-primary/10"
                    onClick={() => setIsPlanningMode(true)}
                >
                    <FiMap className="mr-2 h-4 w-4" /> Re-organize Sequence
                </Button>
            )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-5xl mx-auto">
          <SortableContext
            items={milestones.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            {milestones.map((milestone, index) => (
              <SortableMilestoneCard 
                key={milestone.id} 
                milestone={milestone} 
                index={index}
                isPlanningMode={isPlanningMode}
                onEdit={() => {}} // Handle via ProjectWorkspace
                onDelete={() => {}} // Handle via ProjectWorkspace
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: "0.5" } }
          })
        }}>
          {activeId && activeMilestone ? (
            <div className="bg-primary/10 border-2 border-primary/40 p-12 rounded-[3.5rem] shadow-2xl backdrop-blur-md">
                <h5 className="text-3xl font-black tracking-tighter text-primary">
                    {activeMilestone.title}
                </h5>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {milestones.length === 0 && (
         <div className="text-center py-40 bg-muted/10 border-4 border-dashed rounded-[4rem] border-border/50">
            <FiMap className="h-20 w-20 text-muted-foreground/10 mx-auto mb-8" />
            <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-sm">Sequence Empty</p>
         </div>
      )}
    </div>
  );
}
