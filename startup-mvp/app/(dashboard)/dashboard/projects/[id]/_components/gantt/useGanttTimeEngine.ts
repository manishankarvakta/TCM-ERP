import { useMemo } from "react";
import { GanttNode } from "./types";
import { differenceInDays, addDays, startOfDay, endOfDay, format } from "date-fns";

export function useGanttTimeEngine(data: GanttNode[], dayWidth: number) {
    // Recursively find min and max dates
    const { minDate, maxDate } = useMemo(() => {
        let min = new Date(8640000000000000); // Max possible date
        let max = new Date(-8640000000000000); // Min possible date
        let found = false;

        const traverse = (nodes: GanttNode[]) => {
            nodes.forEach(n => {
                found = true;
                if (n.startDate < min) min = n.startDate;
                if (n.endDate > max) max = n.endDate;
                if (n.children) traverse(n.children);
            });
        };
        traverse(data);

        // If no data, default to today -> next month
        if (!found) {
            min = new Date();
            max = addDays(new Date(), 30);
        } else {
            // Add padding (e.g. 3 days before and after)
            min = addDays(startOfDay(min), -3);
            max = addDays(endOfDay(max), 3);
        }
        return { minDate: min, maxDate: max };
    }, [data]);

    const totalDays = differenceInDays(maxDate, minDate) + 1;

    // Generate days array for the header
    const days = useMemo(() => {
        const arr = [];
        for (let i = 0; i < totalDays; i++) {
            const current = addDays(minDate, i);
            arr.push({
                date: current,
                label: format(current, "dd"),
                dayOfWeek: format(current, "EEEEEE"), // e.g. "Mo", "Tu"
                isWeekend: current.getDay() === 0 || current.getDay() === 6
            });
        }
        return arr;
    }, [minDate, totalDays]);

    // Generate months array for the top header
    const months = useMemo(() => {
        const arr = [];
        let currentMonth = "";
        let currentMonthDays = 0;
        
        days.forEach(day => {
            const m = format(day.date, "MMMM yyyy");
            if (m !== currentMonth) {
                if (currentMonth !== "") {
                    arr.push({ label: currentMonth, colSpan: currentMonthDays });
                }
                currentMonth = m;
                currentMonthDays = 1;
            } else {
                currentMonthDays++;
            }
        });
        if (currentMonth !== "") {
            arr.push({ label: currentMonth, colSpan: currentMonthDays });
        }
        return arr;
    }, [days]);

    // Helper to calculate CSS left and width in pixels
    const getBarStyles = useMemo(() => {
        return (startDate: Date, endDate: Date) => {
            // Clamp dates
            const start = startDate < minDate ? minDate : startDate;
            const end = endDate > maxDate ? maxDate : endDate;
            
            const leftOffsetDays = differenceInDays(start, minDate);
            const durationDays = differenceInDays(end, start) + 1; // inclusive

            return {
                left: leftOffsetDays * dayWidth,
                width: durationDays * dayWidth
            };
        };
    }, [minDate, maxDate, dayWidth]);

    return {
        minDate,
        maxDate,
        totalDays,
        days,
        months,
        getBarStyles
    };
}
