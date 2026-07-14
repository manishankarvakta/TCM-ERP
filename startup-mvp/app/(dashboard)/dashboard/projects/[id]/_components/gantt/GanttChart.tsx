"use client";

import React, { useState, useCallback, useEffect } from "react";
import { GanttNode } from "./types";
import { useGanttTimeEngine } from "./useGanttTimeEngine";
import { GanttHeader } from "./GanttHeader";
import { GanttRow } from "./GanttRow";
import { GanttDependencies } from "./GanttDependencies";
import { GanttItemSheet } from "./GanttItemSheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { createIssue, deleteIssue, updateIssue, updateMilestone } from "@/app/actions/projects/project.action";
import { createTask, deleteTask, updateTask } from "@/app/actions/system/task.action";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface GanttChartProps {
    initialData: GanttNode[];
    onRefresh?: () => void;
}

// Deep clone utility for state mutations
const cloneTree = (nodes: GanttNode[]): GanttNode[] => {
    return nodes.map(n => ({
        ...n,
        children: n.children ? cloneTree(n.children) : []
    }));
};

// Toggle expand/collapse recursively
const toggleNodeRecursive = (nodes: GanttNode[], id: string): boolean => {
    let mutated = false;
    for (const node of nodes) {
        if (node.id === id) {
            node.isExpanded = !node.isExpanded;
            return true;
        }
        if (node.children && node.children.length > 0) {
            if (toggleNodeRecursive(node.children, id)) mutated = true;
        }
    }
    return mutated;
};

// Find node recursively
const findNodeRecursive = (nodes: GanttNode[], id: string): GanttNode | null => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNodeRecursive(node.children, id);
            if (found) return found;
        }
    }
    return null;
};

// Update node recursively
const updateNodeRecursive = (nodes: GanttNode[], id: string, updates: Partial<GanttNode>): boolean => {
    let mutated = false;
    for (const node of nodes) {
        if (node.id === id) {
            Object.assign(node, updates);
            return true;
        }
        if (node.children && node.children.length > 0) {
            if (updateNodeRecursive(node.children, id, updates)) mutated = true;
        }
    }
    return mutated;
};

const shiftChildrenLocal = (node: GanttNode, delta: number) => {
    node.startDate = new Date(node.startDate.getTime() + delta);
    node.endDate = new Date(node.endDate.getTime() + delta);
    if (node.children) {
        node.children.forEach(child => shiftChildrenLocal(child, delta));
    }
};

const updateAndShiftNodeRecursive = (nodes: GanttNode[], id: string, newStart: Date, newEnd: Date): boolean => {
    for (const node of nodes) {
        if (node.id === id) {
            const oldDuration = node.endDate.getTime() - node.startDate.getTime();
            const newDuration = newEnd.getTime() - newStart.getTime();
            const isMove = Math.abs(newDuration - oldDuration) < 1000;
            
            if (isMove) {
                const delta = newStart.getTime() - node.startDate.getTime();
                shiftChildrenLocal(node, delta);
            } else {
                node.startDate = newStart;
                node.endDate = newEnd;
            }
            return true;
        }
        if (node.children && node.children.length > 0) {
            if (updateAndShiftNodeRecursive(node.children, id, newStart, newEnd)) return true;
        }
    }
    return false;
};

export function GanttChart({ initialData, onRefresh }: GanttChartProps) {
    const [data, setData] = useState<GanttNode[]>([]);
    const [dayWidth, setDayWidth] = useState(30); // pixels per day
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    // Helper: Find parent milestone ID of an issue
    const findMilestoneIdForIssue = (nodes: GanttNode[], issueId: string): string | null => {
        for (const milestone of nodes) {
            if (milestone.children) {
                for (const issue of milestone.children) {
                    if (issue.id === issueId) return milestone.id;
                }
            }
        }
        return null;
    };

    // Helper: Find milestone and issue IDs of a task
    const findParentIdsForTask = (nodes: GanttNode[], taskId: string): { milestoneId: string | null, issueId: string | null } => {
        for (const milestone of nodes) {
            if (milestone.children) {
                for (const issue of milestone.children) {
                    if (issue.children) {
                        for (const task of issue.children) {
                            if (task.id === taskId) {
                                return { milestoneId: milestone.id, issueId: issue.id };
                            }
                        }
                    }
                }
            }
        }
        return { milestoneId: null, issueId: null };
    };

    // Initialize data
    useEffect(() => {
        setData(cloneTree(initialData));
    }, [initialData]);

    const { totalDays, days, months, getBarStyles } = useGanttTimeEngine(data, dayWidth);

    const handleToggleExpand = useCallback((nodeId: string) => {
        setData(prev => {
            const next = cloneTree(prev);
            toggleNodeRecursive(next, nodeId);
            return next;
        });
    }, []);

    if (!data.length) return null;

    return (
        <Card className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden flex flex-col h-[600px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-slate-50/50">
                <h3 className="font-semibold text-base">Project Schedule</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Zoom:</span>
                    <input 
                        type="range" 
                        min="15" 
                        max="60" 
                        value={dayWidth} 
                        onChange={(e) => setDayWidth(Number(e.target.value))}
                        className="w-24 accent-primary"
                    />
                </div>
            </div>

            {/* Scrollable Canvas */}
            <ScrollArea className="flex-1 overflow-auto bg-background/50">
                <div className="min-w-max relative" style={{ paddingBottom: '20px' }}>
                    {/* Header: Months & Days */}
                    <div className="flex sticky top-0 z-40 bg-card shadow-sm">
                        {/* Empty corner block for left sidebar */}
                        <div className="w-[300px] shrink-0 sticky left-0 z-50 bg-card border-r border-b border-border/50" />
                        {/* Timeline Header Axis */}
                        <div className="flex-1 relative z-40">
                            <GanttHeader months={months} days={days} dayWidth={dayWidth} />
                        </div>
                    </div>

                    {/* Body: Rows & Timelines */}
                    <div className="relative flex min-h-[100px]">
                        {/* Background Grid Layer */}
                        <div className="absolute top-0 bottom-0 pointer-events-none z-10 flex" style={{ left: '300px' }}>
                            {days.map((d, i) => {
                                const isToday = d.date.toDateString() === new Date().toDateString();
                                return (
                                    <div 
                                        key={i} 
                                        className={`h-full border-r border-border/30 border-dashed ${d.isWeekend ? 'bg-muted/30' : ''} relative`}
                                        style={{ width: `${dayWidth}px` }}
                                    >
                                        {isToday && (
                                            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-red-500 z-50 -translate-x-1/2 shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                                <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-red-500 -translate-x-1/2" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* The rows layer handles both the sticky sidebar and the inner timelines */}
                        <div className="flex-1 flex flex-col relative z-20">
                            {data.map(node => (
                                <GanttRow 
                                    key={node.id} 
                                    node={node} 
                                    depth={0} 
                                    dayWidth={dayWidth}
                                    totalDays={totalDays}
                                    getBarStyles={getBarStyles}
                                    onToggleExpand={handleToggleExpand}
                                    onAddChildAction={async (parentId, parentType, title) => {
                                        try {
                                            if (parentType === "milestone") {
                                                toast.loading("Creating issue...", { id: "gantt-action" });
                                                const res = await createIssue({
                                                    title,
                                                    milestoneId: parentId,
                                                    priority: "NORMAL",
                                                    type: "TASK"
                                                });
                                                if (res.success) {
                                                    toast.success("Issue created successfully!", { id: "gantt-action" });
                                                    onRefresh?.();
                                                    router.refresh();
                                                } else {
                                                    toast.error(res.error || "Failed to create issue", { id: "gantt-action" });
                                                }
                                            } else if (parentType === "issue") {
                                                const milestoneId = findMilestoneIdForIssue(data, parentId);
                                                toast.loading("Creating task...", { id: "gantt-action" });
                                                const res = await createTask({
                                                    title,
                                                    projectId,
                                                    milestoneId: milestoneId || undefined,
                                                    issueId: parentId,
                                                    entityType: "project",
                                                    entityId: projectId
                                                });
                                                if (res.success) {
                                                    toast.success("Task created successfully!", { id: "gantt-action" });
                                                    onRefresh?.();
                                                    router.refresh();
                                                } else {
                                                    toast.error(res.error || "Failed to create task", { id: "gantt-action" });
                                                }
                                            } else if (parentType === "task") {
                                                const { milestoneId, issueId } = findParentIdsForTask(data, parentId);
                                                toast.loading("Creating subtask...", { id: "gantt-action" });
                                                const res = await createTask({
                                                    title,
                                                    projectId,
                                                    milestoneId: milestoneId || undefined,
                                                    issueId: issueId || undefined,
                                                    parentId,
                                                    entityType: "project",
                                                    entityId: projectId
                                                });
                                                if (res.success) {
                                                    toast.success("Subtask created successfully!", { id: "gantt-action" });
                                                    onRefresh?.();
                                                    router.refresh();
                                                } else {
                                                    toast.error(res.error || "Failed to create subtask", { id: "gantt-action" });
                                                }
                                            }
                                        } catch (err) {
                                            console.error("Add child error:", err);
                                            toast.error("An error occurred while creating item", { id: "gantt-action" });
                                        }
                                    }}
                                    onEditAction={(nodeId) => {
                                        setSelectedNodeId(nodeId);
                                        setIsSheetOpen(true);
                                    }}
                                    onDeleteAction={async (nodeId) => {
                                        try {
                                            const node = findNodeRecursive(data, nodeId);
                                            if (!node) return;

                                            toast.loading(`Deleting ${node.type}...`, { id: "gantt-action" });
                                            let res: { success: boolean; error?: string };

                                            if (node.type === "issue") {
                                                res = await deleteIssue(nodeId);
                                            } else if (node.type === "task" || node.type === "subtask") {
                                                res = await deleteTask(nodeId);
                                            } else {
                                                toast.error("Milestones cannot be deleted directly from timeline", { id: "gantt-action" });
                                                return;
                                            }

                                            if (res.success) {
                                                toast.success(`${node.type === "issue" ? "Issue" : "Task"} deleted successfully!`, { id: "gantt-action" });
                                                onRefresh?.();
                                                router.refresh();
                                            } else {
                                                toast.error(res.error || "Failed to delete item", { id: "gantt-action" });
                                            }
                                        } catch (err) {
                                            console.error("Delete node error:", err);
                                            toast.error("An error occurred while deleting item", { id: "gantt-action" });
                                        }
                                    }}
                                    onDateChangeAction={async (nodeId, newStart, newEnd) => {
                                        setData(prev => {
                                            const next = cloneTree(prev);
                                            updateAndShiftNodeRecursive(next, nodeId, newStart, newEnd);
                                            return next;
                                        });

                                        try {
                                            const node = findNodeRecursive(data, nodeId);
                                            if (!node) return;

                                            toast.loading("Saving timeline adjustments...", { id: "gantt-date-change" });

                                            const oldDuration = node.endDate.getTime() - node.startDate.getTime();
                                            const newDuration = newEnd.getTime() - newStart.getTime();
                                            const isMove = Math.abs(newDuration - oldDuration) < 1000;

                                            const persistShift = async (currNode: GanttNode, delta: number, isRoot: boolean) => {
                                                const shiftedStart = isRoot ? newStart : new Date(currNode.startDate.getTime() + delta);
                                                const shiftedEnd = isRoot ? newEnd : new Date(currNode.endDate.getTime() + delta);

                                                let res: { success: boolean; error?: string } = { success: true };

                                                if (currNode.type === "milestone") {
                                                    res = await updateMilestone(currNode.id, {
                                                        startDate: shiftedStart,
                                                        dueDate: shiftedEnd
                                                     });
                                                } else if (currNode.type === "issue") {
                                                    res = await updateIssue(currNode.id, {
                                                        startDate: shiftedStart
                                                    });
                                                } else if (currNode.type === "task" || currNode.type === "subtask") {
                                                    res = await updateTask(currNode.id, {
                                                        startDate: shiftedStart,
                                                        dueDate: shiftedEnd
                                                    });
                                                }

                                                if (res && !res.success) {
                                                    throw new Error(res.error || "Failed to update schedule item");
                                                }

                                                if (isMove && currNode.children && currNode.children.length > 0) {
                                                    for (const child of currNode.children) {
                                                        await persistShift(child, delta, false);
                                                    }
                                                }
                                            };

                                            const delta = newStart.getTime() - node.startDate.getTime();
                                            await persistShift(node, delta, true);

                                            toast.success("Timeline successfully synchronized", { id: "gantt-date-change" });
                                            onRefresh?.();
                                            router.refresh();
                                        } catch (err: any) {
                                            console.error("Date change error:", err);
                                            toast.error(err.message || "Failed to persist timeline adjustments", { id: "gantt-date-change" });
                                            router.refresh();
                                        }
                                    }}
                                />
                            ))}
                        </div>

                        {/* The SVG Dependencies Layer (absolutely positioned inside the right pane) */}
                        <div className="absolute top-0 bottom-0 pointer-events-none z-30" style={{ left: '300px' }}>
                            <GanttDependencies 
                                data={data} 
                                getBarStyles={getBarStyles} 
                                totalDays={totalDays}
                                dayWidth={dayWidth}
                            />
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Editing Sheet */}
            <GanttItemSheet 
                node={selectedNodeId ? findNodeRecursive(data, selectedNodeId) : null}
                isOpen={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                onSave={async (nodeId, updates) => {
                    setData(prev => {
                        const next = cloneTree(prev);
                        updateNodeRecursive(next, nodeId, updates);
                        return next;
                    });

                    try {
                        const node = findNodeRecursive(data, nodeId);
                        if (!node) return;

                        toast.loading("Saving changes...", { id: "gantt-action" });
                        let res: { success: boolean; error?: string };

                        if (node.type === "task" || node.type === "subtask") {
                            const inputUpdates: any = {
                                title: updates.title,
                                status: updates.status,
                                description: updates.description,
                                priority: updates.priority,
                                assigneeId: updates.assigneeId
                            };
                            if (updates.endDate) {
                                inputUpdates.dueDate = updates.endDate;
                            }
                            res = await updateTask(nodeId, inputUpdates);
                        } else if (node.type === "issue") {
                            res = await updateIssue(nodeId, {
                                title: updates.title,
                                status: updates.status,
                                description: updates.description,
                                priority: updates.priority,
                                assigneeId: updates.assigneeId
                            });
                        } else if (node.type === "milestone") {
                            const inputUpdates: any = {
                                title: updates.title,
                                status: updates.status,
                                description: updates.description
                            };
                            if (updates.endDate) {
                                inputUpdates.dueDate = updates.endDate;
                            }
                            res = await updateMilestone(nodeId, inputUpdates);
                        } else {
                            toast.error("Updates not supported for this type", { id: "gantt-action" });
                            return;
                        }

                        if (res.success) {
                            toast.success("Saved changes successfully!", { id: "gantt-action" });
                            onRefresh?.();
                            router.refresh();
                        } else {
                            toast.error(res.error || "Failed to save changes", { id: "gantt-action" });
                            router.refresh();
                        }
                    } catch (err) {
                        console.error("Save node error:", err);
                        toast.error("An error occurred while saving changes", { id: "gantt-action" });
                        router.refresh();
                    }
                }}
            />
        </Card>
    );
}
