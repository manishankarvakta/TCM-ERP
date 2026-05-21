import React, { useState, useCallback, useEffect } from "react";
import { GanttNode } from "./types";
import { useGanttTimeEngine } from "./useGanttTimeEngine";
import { GanttHeader } from "./GanttHeader";
import { GanttRow } from "./GanttRow";
import { GanttDependencies } from "./GanttDependencies";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface GanttChartProps {
    initialData: GanttNode[];
}

// Deep clone utility for state mutations
const cloneTree = (nodes: GanttNode[]): GanttNode[] => {
    return nodes.map(n => ({
        ...n,
        children: n.children ? cloneTree(n.children) : []
    }));
};

export function GanttChart({ initialData }: GanttChartProps) {
    const [data, setData] = useState<GanttNode[]>([]);
    const [dayWidth, setDayWidth] = useState(30); // pixels per day

    // Initialize data
    useEffect(() => {
        setData(cloneTree(initialData));
    }, [initialData]);

    const { minDate, maxDate, totalDays, days, months, getBarStyles } = useGanttTimeEngine(data);

    // Toggle expand/collapse recursively
    const toggleNode = useCallback((nodes: GanttNode[], id: string): boolean => {
        let mutated = false;
        for (const node of nodes) {
            if (node.id === id) {
                node.isExpanded = !node.isExpanded;
                return true;
            }
            if (node.children && node.children.length > 0) {
                if (toggleNode(node.children, id)) mutated = true;
            }
        }
        return mutated;
    }, []);

    const handleToggleExpand = useCallback((nodeId: string) => {
        setData(prev => {
            const next = cloneTree(prev);
            toggleNode(next, nodeId);
            return next;
        });
    }, [toggleNode]);

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
                    <div className="flex">
                        {/* Empty corner block for left sidebar */}
                        <div className="w-[300px] shrink-0 sticky left-0 z-30 bg-card border-r border-b border-border/50" />
                        {/* Timeline Header Axis */}
                        <div className="flex-1 relative z-20">
                            <GanttHeader months={months} days={days} dayWidth={dayWidth} />
                        </div>
                    </div>

                    {/* Body: Rows & Timelines */}
                    <div className="relative flex">
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
        </Card>
    );
}
