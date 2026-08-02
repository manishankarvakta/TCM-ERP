import React from "react";
import { getHolidays, getHolidayStats } from "./_actions/holiday.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import {
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Sparkles,
} from "lucide-react";
import HolidaysListClient from "./_components/holidays";
import CalendarView from "./_components/calendar-view";
import CalendarControls from "./_components/calendar-controls";
import ExportHolidaysButton from "./_components/ExportHolidaysButton";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { parseISO, format } from "date-fns";

interface HolidaysPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    month?: string;
    limit?: string;
  }>;
}

// ─── helper: days until a date ───────────────────────────────────────────────
function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function HolidaysPage({ searchParams }: HolidaysPageProps) {
  const params = await searchParams;
  const page   = parseInt(params.page  || "1");
  const limit  = parseInt(params.limit || "20");
  const search = params.search || "";
  const tab    = params.tab   || "all";
  const monthParam = params.month;
  
  const calendarDate = monthParam ? parseISO(monthParam + "-01") : new Date();

  const session = await auth();
  const userId  = session?.user?.id;

  const [result, statsResult, canView, canEdit, canMoveToTrash, canDeletePermanently] =
    await Promise.all([
      getHolidays(page, limit, search, tab === "trash" ? "trash" : "all"),
      getHolidayStats(),
      userId ? hasPermission(userId, "hr.holidays", "view")               : false,
      userId ? hasPermission(userId, "hr.holidays", "edit")               : false,
      userId ? hasPermission(userId, "hr.holidays", "move-to-trash")      : false,
      userId ? hasPermission(userId, "hr.holidays", "delete-permanently") : false,
    ]);

  const stats = statsResult.stats;

  // ─── error state ─────────────────────────────────────────────────────────
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Holidays</h1>
            <p className="text-sm text-muted-foreground">Manage company holidays</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load holidays"}</p>
        </div>
      </div>
    );
  }

  // ─── next holiday label ───────────────────────────────────────────────────
  let nextLabel  = "None scheduled";
  let nextSub    = "";
  let nextUrgent = false;
  if (stats?.nextHoliday) {
    const days = daysUntil(stats.nextHoliday.date);
    nextLabel  = stats.nextHoliday.name;
    if (days === 0) { nextSub = "Today! 🎉"; nextUrgent = true; }
    else if (days === 1) { nextSub = "Tomorrow"; nextUrgent = true; }
    else { nextSub = `in ${days} days · ${formatShortDate(stats.nextHoliday.date)}`; }
  }

  return (
    <div className="space-y-4">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Holidays
          </h1>
          <div className="flex items-center gap-2.5 mt-1.5 text-sm text-muted-foreground flex-wrap">
            <span>Manage company holidays</span>
            
            {stats && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {stats.totalThisYear} Total
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" /> {stats.upcoming} Upcoming
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5" /> {stats.thisMonth} in {stats.currentMonth}
                </span>
              </>
            )}

            {stats?.nextHoliday && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium ${
                  nextUrgent
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                }`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Next: {nextLabel} {nextSub ? `(${nextSub})` : ""}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportHolidaysButton search={search} tab={tab} />
          {tab !== "trash" && canEdit && (
            <Button asChild size="sm" className="h-9">
              <Link href="/dashboard/hr/holidays/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Add Holiday
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs + list ─────────────────────────────────────────────────── */}
      <Tabs defaultValue={tab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/hr/holidays?tab=all&page=1">
                List View
                {stats && (
                  <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                    {stats.totalThisYear}
                  </span>
                )}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="calendar" asChild>
              <Link href="/dashboard/hr/holidays?tab=calendar&page=1">Calendar View</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/hr/holidays?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          
          {tab === "calendar" && <CalendarControls />}
        </div>

        <TabsContent value="all" className="mt-4">
          <HolidaysListClient
            initialHolidays={result.holidays || []}
            initialPagination={result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }}
            initialSearch={search}
            isTrash={false}
            userId={userId}
            permissions={{
              view:              canView,
              edit:              canEdit,
              moveToTrash:       canMoveToTrash,
              deletePermanently: canDeletePermanently,
            }}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <CalendarView currentDate={calendarDate} />
        </TabsContent>

        <TabsContent value="trash" className="mt-4">
          <HolidaysListClient
            initialHolidays={result.holidays || []}
            initialPagination={result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }}
            initialSearch={search}
            isTrash={true}
            userId={userId}
            permissions={{
              view:              canView,
              edit:              canEdit,
              moveToTrash:       canMoveToTrash,
              deletePermanently: canDeletePermanently,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
