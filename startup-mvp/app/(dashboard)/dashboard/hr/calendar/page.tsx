import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import HRCalendarClient from "./_components/hr-calendar-client";

export const dynamic = "force-dynamic";

export default async function HRCalendarPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [holidays, leaves] = await Promise.all([
    prisma.holiday.findMany({
      where: { date: { gte: monthStart, lte: monthEnd }, isTrash: false }
    }),
    prisma.leaveApplication.findMany({
      where: { 
        status: 'HR_APPROVED',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart }
      },
      include: { employee: { select: { name: true } }, leaveType: { select: { name: true } } }
    })
  ]);

  return (
    <PageGuard permissionKey="hr.attendance" requiredOperation="view">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR Calendar</h1>
          <p className="text-muted-foreground">Monthly view of holidays and approved employee leaves.</p>
        </div>
        
        <HRCalendarClient initialHolidays={holidays} initialLeaves={leaves} />
      </div>
    </PageGuard>
  );
}
