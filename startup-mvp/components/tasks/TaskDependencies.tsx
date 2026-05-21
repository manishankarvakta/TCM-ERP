"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Link as LinkIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { linkTaskDependency } from "@/app/actions/system/task.action";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface TaskDependenciesProps {
    taskId: string;
    blockers: any[];
    onRefresh: () => void;
}

export default function TaskDependencies({ taskId, blockers, onRefresh }: TaskDependenciesProps) {
    const [isLinking, setIsLinking] = useState(false);
    const [blockerId, setBlockerId] = useState("");
    const [loading, setLoading] = useState(false);

    const activeBlockers = blockers.filter(b => b.BlockingTask.status !== 'completed' && b.BlockingTask.status !== 'done');
    const clearedBlockers = blockers.filter(b => b.BlockingTask.status === 'completed' || b.BlockingTask.status === 'done');

    const handleLinkDependency = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!blockerId.trim()) return;

        setLoading(true);
        const res = await linkTaskDependency(blockerId, taskId);
        
        if (res.success) {
            toast.success("Dependency interlock established");
            setBlockerId("");
            setIsLinking(false);
            onRefresh();
        } else {
            toast.error(res.error || "Failed to link dependency");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    Dependencies ({blockers.length})
                </h4>
            </div>

            <div className="space-y-2">
                {blockers.length === 0 && !isLinking && (
                    <div className="text-sm text-muted-foreground italic py-2 px-1">No active blockers.</div>
                )}
                
                {activeBlockers.length > 0 && (
                    <div className="bg-rose-50/50 border border-rose-200/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-2">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Active Blockers
                        </div>
                        {activeBlockers.map((dep) => (
                            <div key={dep.id} className="flex items-center justify-between bg-background p-2 rounded border border-rose-100 shadow-sm">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{dep.BlockingTask.title}</p>
                                    <p className="text-[10px] text-muted-foreground">ID: {dep.blockingTaskId.substring(0, 8)}...</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 ml-2 bg-rose-100 text-rose-700 border-rose-200">
                                    {dep.BlockingTask.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}

                {clearedBlockers.length > 0 && (
                    <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-lg p-3 space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cleared
                        </div>
                        {clearedBlockers.map((dep) => (
                            <div key={dep.id} className="flex items-center justify-between bg-background/50 p-2 rounded border border-emerald-100 opacity-60">
                                <p className="text-sm font-medium truncate line-through text-muted-foreground">{dep.BlockingTask.title}</p>
                            </div>
                        ))}
                    </div>
                )}

                {isLinking ? (
                    <form onSubmit={handleLinkDependency} className="flex items-center gap-2 mt-4 pt-2 border-t border-border/40">
                        <Input 
                            autoFocus
                            placeholder="Enter Blocking Task ID..."
                            value={blockerId}
                            onChange={e => setBlockerId(e.target.value)}
                            className="h-8 text-sm font-mono text-xs"
                            disabled={loading}
                        />
                        <Button type="submit" size="sm" className="h-8 shrink-0 bg-rose-600 hover:bg-rose-700" disabled={loading}>Link</Button>
                        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={() => setIsLinking(false)} disabled={loading}>Cancel</Button>
                    </form>
                ) : (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground mt-2 h-8 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => setIsLinking(true)}
                    >
                        <LinkIcon className="w-4 h-4 mr-2" /> Link Blocker
                    </Button>
                )}
            </div>
        </div>
    );
}
