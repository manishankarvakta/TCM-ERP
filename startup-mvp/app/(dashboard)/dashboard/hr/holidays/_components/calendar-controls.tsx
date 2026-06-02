"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { addMonths, subMonths, format, parseISO } from "date-fns";

export default function CalendarControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const monthParam = searchParams.get("month");
  const currentDate = monthParam ? parseISO(monthParam + "-01") : new Date();

  const setMonth = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(date, "yyyy-MM"));
    router.push(`?${params.toString()}`);
  };

  const nextMonth = () => setMonth(addMonths(currentDate, 1));
  const prevMonth = () => setMonth(subMonths(currentDate, 1));
  const goToday = () => setMonth(new Date());

  return (
    <div className="flex items-center gap-4 border rounded-md px-3 py-1 bg-card shadow-sm h-10">
      <h2 className="text-sm font-semibold w-24">
        {format(currentDate, "MMM yyyy")}
      </h2>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <FiChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={goToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <FiChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
