import React from "react";

interface GanttHeaderProps {
    months: { label: string; colSpan: number }[];
    days: { date: Date; label: string; dayOfWeek: string; isWeekend: boolean }[];
    dayWidth: number; // e.g. 30px per day
}

export function GanttHeader({ months, days, dayWidth }: GanttHeaderProps) {
    return (
        <div className="flex flex-col border-b border-border/50 sticky top-0 bg-card z-20">
            {/* Months Row */}
            <div className="flex border-b border-border/50">
                {months.map((m, i) => (
                    <div 
                        key={i} 
                        className="px-4 py-2 text-xs font-semibold text-muted-foreground border-r border-border/50 truncate flex-shrink-0"
                        style={{ width: `${m.colSpan * dayWidth}px` }}
                    >
                        {m.label}
                    </div>
                ))}
            </div>
            
            {/* Days Row */}
            <div className="flex">
                {days.map((d, i) => (
                    <div 
                        key={i} 
                        className={`flex flex-col items-center justify-center py-1 border-r border-border/50 flex-shrink-0 ${d.isWeekend ? 'bg-muted/30' : ''}`}
                        style={{ width: `${dayWidth}px` }}
                    >
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{d.dayOfWeek}</span>
                        <span className="text-xs font-semibold">{d.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
