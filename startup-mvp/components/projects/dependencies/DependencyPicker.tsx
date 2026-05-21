"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTaskDependency } from "@/app/actions/projects/dependencies.action";
import { toast } from "sonner";
import { Link, Loader2 } from "lucide-react";

interface DependencyPickerProps {
    projectId: string;
    currentTaskId: string;
    availableTasks: { id: string; title: string }[];
}

export function DependencyPicker({ projectId, currentTaskId, availableTasks }: DependencyPickerProps) {
    const [selectedBlockingId, setSelectedBlockingId] = useState<string>("");
    const [isLinking, setIsLinking] = useState(false);

    // Filter out the current task so it cannot block itself
    const validTasks = availableTasks.filter(t => t.id !== currentTaskId);

    const handleLink = async () => {
        if (!selectedBlockingId) return;

        setIsLinking(true);
        const response = await createTaskDependency(projectId, selectedBlockingId, currentTaskId);
        setIsLinking(false);

        if (response.success) {
            toast.success("Dependency linked! This task is now blocked.");
            setSelectedBlockingId("");
        } else {
            // This safely catches the Mathematical Cycle Prevention error
            toast.error(response.error); 
        }
    };

    return (
        <div className="flex items-center gap-2 mt-4 p-4 border rounded-lg bg-muted/20">
            <div className="flex-1">
                <Select value={selectedBlockingId} onValueChange={setSelectedBlockingId} disabled={isLinking}>
                    <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select a task that blocks this..." />
                    </SelectTrigger>
                    <SelectContent>
                        {validTasks.map(task => (
                            <SelectItem key={task.id} value={task.id}>
                                {task.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button 
                onClick={handleLink} 
                disabled={!selectedBlockingId || isLinking}
                className="gap-2 shrink-0"
            >
                {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                Link
            </Button>
        </div>
    );
}
