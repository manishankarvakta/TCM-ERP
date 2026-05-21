import React from "react";
import { GanttNode } from "./types";
import { FiChevronRight, FiChevronDown, FiTarget, FiAlertCircle, FiCheckSquare, FiCornerDownRight } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GanttRowProps {
    node: GanttNode;
    depth: number;
    dayWidth: number;
    totalDays: number;
    getBarStyles: (start: Date, end: Date) => { left: string; width: string };
    onToggleExpand: (nodeId: string) => void;
}

export function GanttRow({ node, depth, dayWidth, totalDays, getBarStyles, onToggleExpand }: GanttRowProps) {
    const { left, width } = getBarStyles(node.startDate, node.endDate);
    const hasChildren = node.children && node.children.length > 0;

    const getNodeIcon = () => {
        switch (node.type) {
            case "milestone": return <FiTarget className="w-4 h-4 text-indigo-500 shrink-0" />;
            case "issue": return <FiAlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
            case "task": return <FiCheckSquare className="w-4 h-4 text-blue-500 shrink-0" />;
            case "subtask": return <FiCornerDownRight className="w-4 h-4 text-slate-400 shrink-0" />;
            default: return null;
        }
    };

    const getNodeColor = () => {
        switch (node.type) {
            case "milestone": return "bg-indigo-500 border-indigo-600";
            case "issue": return "bg-rose-500 border-rose-600";
            case "task": return "bg-blue-500 border-blue-600";
            case "subtask": return "bg-slate-400 border-slate-500";
            default: return "bg-primary";
        }
    };

    return (
        <>
            <div className="flex border-b border-border/50 group hover:bg-muted/30 transition-colors h-12" id={`gantt-row-${node.id}`}>
                {/* Sticky Left Sidebar */}
                <div className="w-[300px] shrink-0 sticky left-0 bg-card group-hover:bg-muted/50 border-r border-border/50 z-10 flex items-center pr-4 transition-colors" style={{ paddingLeft: `${(depth * 20) + 16}px` }}>
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        {hasChildren ? (
                            <button onClick={() => onToggleExpand(node.id)} className="p-0.5 hover:bg-muted rounded shrink-0">
                                {node.isExpanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
                            </button>
                        ) : (
                            <span className="w-5 shrink-0" />
                        )}
                        {getNodeIcon()}
                        <span className="text-sm font-medium truncate" title={node.title}>{node.title}</span>
                    </div>
                    {node.assignee && (
                        <Avatar className="w-6 h-6 border shrink-0 ml-2">
                            <AvatarImage src={node.assignee.image} />
                            <AvatarFallback className="text-[10px]">{node.assignee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                </div>

                {/* Right Timeline Pane */}
                <div className="flex-1 relative min-w-0" style={{ width: `${totalDays * dayWidth}px` }}>
                    {/* The Task Bar */}
                    <div 
                        id={`gantt-bar-${node.id}`}
                        className={`absolute top-2.5 h-7 rounded shadow-sm border flex items-center overflow-hidden ${getNodeColor()} cursor-pointer hover:brightness-110 transition-all`}
                        style={{ left, width: `calc(${width} - 2px)` }}
                        title={`${node.title} (${node.progress}%)\nStart: ${node.startDate.toLocaleDateString()}\nEnd: ${node.endDate.toLocaleDateString()}`}
                    >
                        {/* Progress Fill */}
                        <div className="h-full bg-white/20" style={{ width: `${node.progress}%` }} />
                        {/* Label if space permits */}
                        <span className="absolute left-2 text-[10px] font-bold text-white drop-shadow-sm truncate pr-2 pointer-events-none">
                            {node.progress}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Recursive Children */}
            {hasChildren && node.isExpanded && node.children.map(child => (
                <GanttRow 
                    key={child.id} 
                    node={child} 
                    depth={depth + 1} 
                    dayWidth={dayWidth}
                    totalDays={totalDays}
                    getBarStyles={getBarStyles}
                    onToggleExpand={onToggleExpand}
                />
            ))}
        </>
    );
}
