"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Link2Off, Lock } from "lucide-react";

interface DependencyGraphProps {
    currentTaskTitle: string;
    blockingTasks: { id: string; title: string; status: string }[];
    dependentTasks: { id: string; title: string; status: string }[];
}

export function DependencyGraph({ currentTaskTitle, blockingTasks, dependentTasks }: DependencyGraphProps) {
    if (blockingTasks.length === 0 && dependentTasks.length === 0) {
        return null;
    }

    return (
        <Card className="mt-4 border-dashed border-muted-foreground/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    Dependency Graph
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    
                    {/* Upstream Blockers */}
                    {blockingTasks.length > 0 && (
                        <div className="flex flex-col gap-2 p-3 bg-red-500/10 rounded-md border border-red-500/20">
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                                <Link2Off className="w-3 h-3" /> Waiting on (Upstream)
                            </span>
                            {blockingTasks.map(task => (
                                <div key={task.id} className="flex justify-between items-center text-sm bg-background p-2 rounded shadow-sm">
                                    <span className="truncate">{task.title}</span>
                                    <Badge variant="outline" className="text-[10px] uppercase">{task.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Current Node */}
                    <div className="flex items-center justify-center py-2">
                        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 sm:rotate-0 sm:hidden" />
                    </div>

                    {/* Downstream Dependents */}
                    {dependentTasks.length > 0 && (
                        <div className="flex flex-col gap-2 p-3 bg-primary/10 rounded-md border border-primary/20">
                            <span className="text-xs font-semibold text-primary flex items-center gap-1">
                                Blocking (Downstream)
                            </span>
                            {dependentTasks.map(task => (
                                <div key={task.id} className="flex justify-between items-center text-sm bg-background p-2 rounded shadow-sm">
                                    <span className="truncate">{task.title}</span>
                                    <Badge variant="outline" className="text-[10px] uppercase">{task.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
