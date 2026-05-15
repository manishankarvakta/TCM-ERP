"use client";

import React, { useState } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface HRCalendarClientProps {
  initialHolidays: any[];
  initialLeaves: any[];
}

export default function HRCalendarClient({ initialHolidays, initialLeaves }: HRCalendarClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">
          {format(currentMonth, "MMMM yyyy")}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <FiChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <FiChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-muted border rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="bg-background py-2 text-center text-sm font-semibold">
              {day}
            </div>
          ))}
          {days.map((day, dayIdx) => {
            const dayHolidays = initialHolidays.filter(h => isSameDay(new Date(h.date), day));
            const dayLeaves = initialLeaves.filter(l => {
              const start = new Date(l.startDate);
              const end = new Date(l.endDate);
              return day >= start && day <= end;
            });

            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div
                key={day.toString()}
                className={`min-h-[120px] bg-background p-2 border-t ${
                  !isCurrentMonth ? "text-muted-foreground bg-muted/20" : ""
                }`}
              >
                <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground h-6 w-6 inline-flex items-center justify-center rounded-full" : ""}`}>
                  {format(day, "d")}
                </span>
                <div className="mt-2 space-y-1">
                  {dayHolidays.map((h, i) => (
                    <div key={i} className="text-[10px] p-1 bg-rose-100 text-rose-700 rounded border border-rose-200 truncate" title={h.name}>
                      📍 {h.name}
                    </div>
                  ))}
                  {dayLeaves.map((l, i) => (
                    <div key={i} className="text-[10px] p-1 bg-blue-100 text-blue-700 rounded border border-blue-200 truncate" title={`${l.employee.name} - ${l.leaveType.name}`}>
                      👤 {l.employee.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
