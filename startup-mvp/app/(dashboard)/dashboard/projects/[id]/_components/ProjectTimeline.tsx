"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GanttChart } from "./gantt/GanttChart";
import { GanttNode } from "./gantt/types";
import { getProjectGanttData } from "@/app/actions/projects/project.action";
import { Skeleton } from "@/components/ui/skeleton";
import { FiCalendar } from "react-icons/fi";

interface SerializedGanttNode {
    id: string;
    title: string;
    type: "milestone" | "issue" | "task" | "subtask";
    startDate: string;
    endDate: string;
    progress: number;
    dependencies: string[];
    children?: SerializedGanttNode[];
    isExpanded?: boolean;
    assignee?: { name: string; image: string | null };
    status: string;
}

interface ProjectTimelineProps {
    projectId: string;
}

const parseDatesInTree = (nodes: SerializedGanttNode[]): GanttNode[] => {
// @ts-expect-error - Legacy compatibility
    return nodes.map(node => ({
        ...node,
        startDate: new Date(node.startDate),
        endDate: new Date(node.endDate),
        children: node.children ? parseDatesInTree(node.children) : []
    }));
};

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
    const [data, setData] = useState<GanttNode[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadGanttData = useCallback(async (showSkeleton = true) => {
        try {
            if (showSkeleton) setLoading(true);
            const res = await getProjectGanttData(projectId);
            if (res.success && res.data) {
// @ts-expect-error - Legacy compatibility
                setData(parseDatesInTree(res.data));
                setError(null);
            } else {
                setError(res.error || "Failed to load timeline");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            setError(message);
        } finally {
            if (showSkeleton) setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadGanttData(true);
    }, [loadGanttData]);

    if (loading) {
        return (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-card">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-destructive/50 rounded-xl bg-destructive/5">
                <p className="text-sm font-semibold text-destructive">{error}</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-border rounded-xl bg-card space-y-4">
                <div className="p-4 bg-slate-50 rounded-full text-muted-foreground">
                    <FiCalendar className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-semibold text-base">No timeline data available</h4>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Create milestones and project issues to populate the interactive Gantt chart schedule.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <GanttChart initialData={data} onRefresh={() => loadGanttData(false)} />
        </div>
    );
}
