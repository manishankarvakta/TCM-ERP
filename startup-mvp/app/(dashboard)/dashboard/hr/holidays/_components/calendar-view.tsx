"use client";

import { useState, useEffect, useTransition } from "react";
import { getYearHolidays } from "../_actions/holiday.action";
import { Button } from "@/components/ui/button";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay } from "date-fns";

interface Holiday {
  id: string;
  name: string;
  date: Date;
  warehouseId: string | null;
  status: string;
  warehouse?: {
    id: string;
    name: string;
  } | null;
}

export default function CalendarView({ currentDate }: { currentDate: Date }) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const year = currentDate.getFullYear();

  // Fetch holidays when year changes
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      setLoading(true);
      const res = await getYearHolidays(year);
      if (active && res.success) {
        setHolidays(res.holidays || []);
      }
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [year]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getHolidaysForDay = (day: Date) => {
    return holidays.filter(h => isSameDay(new Date(h.date), day));
  };

  return (
    <div className="space-y-4">
      {loading && <div className="text-sm text-muted-foreground animate-pulse text-right">Loading holidays...</div>}

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0 border-border/50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px] bg-border gap-[1px]">
          {days.map((day, i) => {
            const dayHolidays = getHolidaysForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);

            return (
              <div
                key={day.toISOString() + i}
                className={`bg-card p-2 flex flex-col gap-1 transition-colors hover:bg-muted/50 ${
                  !isCurrentMonth ? "opacity-40" : ""
                } ${isDayToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full ${
                      isDayToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {dayHolidays.length > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {dayHolidays.length} event{dayHolidays.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto mt-1 custom-scrollbar">
                  {dayHolidays.map(h => (
                    <div
                      key={h.id}
                      className="text-[10px] sm:text-xs px-1.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 truncate"
                      title={h.name + (h.warehouse ? ` (${h.warehouse.name})` : "")}
                    >
                      <span className="font-semibold mr-1">•</span>
                      {h.name}
                      {h.warehouse && <span className="opacity-75"> ({h.warehouse.name})</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
