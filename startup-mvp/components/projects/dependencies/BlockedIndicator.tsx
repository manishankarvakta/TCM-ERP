"use client";

import { Badge } from "@/components/ui/badge";
import { Link2Off } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BlockedIndicatorProps {
    blockingTasksCount: number;
}

export function BlockedIndicator({ blockingTasksCount }: BlockedIndicatorProps) {
    if (blockingTasksCount <= 0) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant="destructive" className="flex items-center gap-1 text-[10px] h-5 px-1.5 cursor-help">
                        <Link2Off className="w-3 h-3" />
                        <span>Blocked ({blockingTasksCount})</span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p className="text-xs">This task cannot be started until {blockingTasksCount} upstream tasks are marked as Done.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
