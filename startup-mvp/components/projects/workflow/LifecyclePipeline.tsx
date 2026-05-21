"use client";

import { useState } from "react";
import { ProjectStatus } from "@prisma/client";
import { transitionProjectStatus } from "@/app/actions/projects/workflow.action";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LifecyclePipelineProps {
    projectId: string;
    currentStatus: ProjectStatus;
    onRefresh: () => void;
}

const PIPELINE_STAGES: { id: ProjectStatus; label: string }[] = [
    { id: "DRAFT", label: "Draft" },
    { id: "PLANNING", label: "Planning" },
    { id: "ACTIVE", label: "Active" },
    { id: "COMPLETED", label: "Completed" },
    { id: "ARCHIVED", label: "Archived" }
];

export default function LifecyclePipeline({ projectId, currentStatus, onRefresh }: LifecyclePipelineProps) {
    const [loadingStage, setLoadingStage] = useState<ProjectStatus | null>(null);

    // If cancelled, show a specific isolated view
    if (currentStatus === "CANCELLED") {
        return (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-rose-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Project Cancelled</span>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-rose-200 hover:bg-rose-100 text-rose-700"
                    onClick={() => handleTransition("ARCHIVED")}
                    disabled={loadingStage !== null}
                >
                    {loadingStage === "ARCHIVED" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Move to Archive"}
                </Button>
            </div>
        );
    }

    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStatus);
    
    // ON_HOLD behaves like ACTIVE in the pipeline visualization, just frozen
    const displayIndex = currentStatus === "ON_HOLD" 
        ? PIPELINE_STAGES.findIndex(s => s.id === "ACTIVE") 
        : currentIndex;

    const handleTransition = async (targetStage: ProjectStatus) => {
        setLoadingStage(targetStage);
        const res = await transitionProjectStatus(projectId, targetStage);
        
        if (res.success) {
            toast.success(`Project advanced to ${targetStage}`);
            onRefresh();
        } else {
            // This is where the State Machine Interlock safely rejects the action
            toast.error(res.error || "Transition blocked by workflow rules");
        }
        setLoadingStage(null);
    };

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[600px] flex items-center justify-between gap-2 p-1">
                {PIPELINE_STAGES.map((stage, idx) => {
                    const isCompleted = idx < displayIndex;
                    const isCurrent = idx === displayIndex;
                    const isNext = idx === displayIndex + 1;
                    
                    return (
                        <div key={stage.id} className="flex items-center flex-1">
                            <button
                                disabled={!isNext || loadingStage !== null || currentStatus === "ON_HOLD"}
                                onClick={() => handleTransition(stage.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 relative",
                                    isCompleted ? "bg-emerald-500/10 text-emerald-700" :
                                    isCurrent ? (currentStatus === "ON_HOLD" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105") :
                                    isNext ? "bg-muted text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer border border-border" :
                                    "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <div className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                                        isCurrent ? "bg-white/20 text-white" : "bg-background border border-border"
                                    )}>
                                        {idx + 1}
                                    </div>
                                )}
                                {stage.label}
                                
                                {loadingStage === stage.id && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2" />
                                )}
                            </button>

                            {/* Connector Line */}
                            {idx < PIPELINE_STAGES.length - 1 && (
                                <div className={cn(
                                    "flex-1 h-0.5 mx-2 transition-colors duration-500",
                                    isCompleted ? "bg-emerald-500/30" : "bg-border"
                                )}>
                                    <ChevronRight className={cn(
                                        "w-4 h-4 absolute -mt-1.5 ml-1/2",
                                        isCompleted ? "text-emerald-500" : "text-muted-foreground/30"
                                    )} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {currentStatus === "ACTIVE" && (
                <div className="flex justify-end mt-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 text-xs font-bold"
                        onClick={() => handleTransition("ON_HOLD")}
                        disabled={loadingStage !== null}
                    >
                        Pause Project (On Hold)
                    </Button>
                </div>
            )}
            
            {currentStatus === "ON_HOLD" && (
                <div className="flex justify-end mt-3">
                    <Button 
                        size="sm" 
                        className="bg-amber-500 hover:bg-amber-600 h-8 text-xs font-bold shadow-md shadow-amber-500/20"
                        onClick={() => handleTransition("ACTIVE")}
                        disabled={loadingStage !== null}
                    >
                        Resume Project (Active)
                    </Button>
                </div>
            )}
        </div>
    );
}
