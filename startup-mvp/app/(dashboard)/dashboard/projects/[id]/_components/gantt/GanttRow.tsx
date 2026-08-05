import React, { useState } from "react";
import { GanttNode } from "./types";
import { FiChevronRight, FiChevronDown, FiTarget, FiAlertCircle, FiCheckSquare, FiCornerDownRight } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GanttRowActions } from "./GanttRowActions";
import { InlineAddRow } from "./InlineAddRow";

interface GanttRowProps {
    node: GanttNode;
    depth: number;
    dayWidth: number;
    totalDays: number;
    getBarStyles: (start: Date, end: Date) => { left: number; width: number };
    onToggleExpand: (nodeId: string) => void;
    onAddChildAction?: (parentId: string, parentType: string, title: string) => void;
    onEditAction?: (nodeId: string) => void;
    onDeleteAction?: (nodeId: string) => void;
    sidebarWidth?: number;
}

export function GanttRow({ 
    node, depth, dayWidth, totalDays, getBarStyles, onToggleExpand,
    onAddChildAction, onEditAction, onDeleteAction,
    onDateChangeAction,
    sidebarWidth = 300
}: GanttRowProps & { onDateChangeAction?: (nodeId: string, newStart: Date, newEnd: Date) => void }) {
    const [isAddingChild, setIsAddingChild] = useState(false);
    
    // Drag & Drop State
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<"move" | "resizeLeft" | "resizeRight" | null>(null);
    const [tempDates, setTempDates] = useState<{ start: Date, end: Date } | null>(null);

    const effectiveStart = tempDates ? tempDates.start : node.startDate;
    const effectiveEnd = tempDates ? tempDates.end : node.endDate;
    const { left, width } = getBarStyles(effectiveStart, effectiveEnd);
    const hasChildren = node.children && node.children.length > 0;

    // Helper to add days to a date
    const addDays = (date: Date, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    };

    const handleMouseDown = (e: React.MouseEvent, type: "move" | "resizeLeft" | "resizeRight") => {
        e.stopPropagation();
        setIsDragging(true);
        setDragType(type);
        setTempDates({ start: node.startDate, end: node.endDate });

        const startX = e.clientX;
        const initialStart = node.startDate;
        const initialEnd = node.endDate;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaDays = Math.round(deltaX / dayWidth);

            if (type === "move") {
                setTempDates({
                    start: addDays(initialStart, deltaDays),
                    end: addDays(initialEnd, deltaDays)
                });
            } else if (type === "resizeRight") {
                const newEnd = addDays(initialEnd, deltaDays);
                if (newEnd >= initialStart) {
                    setTempDates({ start: initialStart, end: newEnd });
                }
            } else if (type === "resizeLeft") {
                const newStart = addDays(initialStart, deltaDays);
                if (newStart <= initialEnd) {
                    setTempDates({ start: newStart, end: initialEnd });
                }
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            setIsDragging(false);
            setDragType(null);
            
            // Calculate final dates using the last known mouse position
            const finalDeltaX = upEvent.clientX - startX;
            const finalDeltaDays = Math.round(finalDeltaX / dayWidth);

            const isClick = Math.abs(finalDeltaX) < 3;
            if (isClick) {
                if (onEditAction) onEditAction(node.id);
                setTempDates(null);
                return;
            }
            
            let finalStart = initialStart;
            let finalEnd = initialEnd;

            if (type === "move") {
                finalStart = addDays(initialStart, finalDeltaDays);
                finalEnd = addDays(initialEnd, finalDeltaDays);
            } else if (type === "resizeRight") {
                finalEnd = addDays(initialEnd, finalDeltaDays);
                if (finalEnd < initialStart) finalEnd = initialStart;
            } else if (type === "resizeLeft") {
                finalStart = addDays(initialStart, finalDeltaDays);
                if (finalStart > initialEnd) finalStart = initialEnd;
            }

            if (finalStart.getTime() !== initialStart.getTime() || finalEnd.getTime() !== initialEnd.getTime()) {
                if (onDateChangeAction) onDateChangeAction(node.id, finalStart, finalEnd);
            }
            setTempDates(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

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
                <div 
                    className="shrink-0 sticky left-0 bg-card group-hover:bg-muted/50 border-r border-border/50 z-10 flex items-center pr-4 transition-colors" 
                    style={{ 
                        width: `${sidebarWidth}px`,
                        paddingLeft: `${(depth * 20) + 16}px` 
                    }}
                >
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
                    
                    {/* Inline Actions (Hidden until hover) */}
                    <div className="ml-2 shrink-0">
                        <GanttRowActions 
                            node={node} 
                            onAddChild={() => {
                                setIsAddingChild(true);
                                if (!node.isExpanded) onToggleExpand(node.id);
                            }}
                            onEdit={onEditAction}
                            onDelete={onDeleteAction}
                        />
                    </div>
                </div>

                {/* Right Timeline Pane */}
                <div className="flex-1 relative min-w-0" style={{ width: `${totalDays * dayWidth}px` }}>
                    {/* Position Container */}
                    <div 
                        id={`gantt-bar-container-${node.id}`}
                        className="absolute top-2.5 h-7 flex items-center"
                        style={{ left: `${left}px`, width: 'max-content' }}
                    >
                        <div 
                            id={`gantt-bar-${node.id}`}
                            className={`h-7 rounded shadow-sm border relative overflow-hidden ${getNodeColor()} hover:brightness-110 transition-all ${isDragging ? 'opacity-80 scale-[1.02] z-50 shadow-md ring-2 ring-primary/50' : 'cursor-pointer'}`}
                            style={{ width: `${width - 2}px` }}
                            title={`${node.title} (${node.progress}%)\nStart: ${effectiveStart.toLocaleDateString()}\nEnd: ${effectiveEnd.toLocaleDateString()}`}
                            onMouseDown={(e) => handleMouseDown(e, "move")}
                        >
                            <div className="h-full bg-white/20 pointer-events-none" style={{ width: `${node.progress}%` }} />
                            <span className="absolute left-2 top-1.5 text-[10px] font-bold text-white drop-shadow-sm truncate pointer-events-none">
                                {node.progress}%
                            </span>
                            
                            {/* Resize Handles */}
                            {(!hasChildren || node.type === "milestone") && (
                                <>
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-20"
                                        onMouseDown={(e) => handleMouseDown(e, "resizeLeft")}
                                    />
                                    <div 
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-20"
                                        onMouseDown={(e) => handleMouseDown(e, "resizeRight")}
                                    />
                                </>
                            )}
                        </div>
                        
                        {/* External Task Label */}
                        <span 
                            className="ml-2 text-xs font-medium text-foreground whitespace-normal line-clamp-2 max-w-[250px] opacity-80 hover:opacity-100 transition-opacity cursor-default"
                            title={node.title}
                        >
                            {node.title}
                        </span>
                    </div>
                </div>
            </div>

            {/* Inline Quick Add Row */}
            {isAddingChild && node.isExpanded && (
                <InlineAddRow 
                    depth={depth + 1}
                    placeholder={`Add a new ${node.type === 'milestone' ? 'issue' : node.type === 'issue' ? 'task' : 'subtask'}...`}
                    onSave={(title) => {
                        setIsAddingChild(false);
                        if (onAddChildAction) onAddChildAction(node.id, node.type, title);
                    }}
                    onCancel={() => setIsAddingChild(false)}
                    sidebarWidth={sidebarWidth}
                />
            )}

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
                    onAddChildAction={onAddChildAction}
                    onEditAction={onEditAction}
                    onDeleteAction={onDeleteAction}
                    onDateChangeAction={onDateChangeAction}
                    sidebarWidth={sidebarWidth}
                />
            ))}
        </>
    );
}
