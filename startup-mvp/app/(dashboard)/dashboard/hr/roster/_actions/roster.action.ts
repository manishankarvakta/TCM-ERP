"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRosterMatrix(
  monthStr: string, // YYYY-MM e.g. "2026-09"
  departmentFilter: string = "all",
  search: string = ""
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", employees: [], daysInMonth: [], rosterMap: {} };
    }

    const [year, month] = monthStr.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Generate days array for the month
    const daysInMonth: { dateStr: string; dayName: string; dayNumber: number; dayOfWeek: number }[] = [];
    const daysCount = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysCount; day++) {
      const d = new Date(Date.UTC(year, month - 1, day));
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getUTCDay();
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      daysInMonth.push({
        dateStr,
        dayName: dayNames[dayOfWeek],
        dayNumber: day,
        dayOfWeek,
      });
    }

    // Build employee filter where clause
    const employeeWhere: any = {
      status: { not: "trash" },
    };

    if (search) {
      employeeWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (departmentFilter && departmentFilter !== "all") {
      employeeWhere.OR = [
        ...(employeeWhere.OR || []),
        { department: departmentFilter },
        { DepartmentRef: { name: departmentFilter } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        designation: true,
        photo: true,
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const employeeIds = employees.map((e) => e.id);

    // Query Roster Entries for the month
    const rosters = await prisma.employeeRoster.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            isNightShift: true,
          },
        },
      },
    });

    // Map by key `${employeeId}_${dateStr}`
    const rosterMap: Record<string, any> = {};
    rosters.forEach((r) => {
      const dateStr = new Date(r.date).toISOString().split("T")[0];
      const key = `${r.employeeId}_${dateStr}`;
      rosterMap[key] = {
        id: r.id,
        shiftId: r.shiftId,
        shiftName: r.shift ? r.shift.name : r.isOffDay ? "OFF" : null,
        startTime: r.shift?.startTime || null,
        endTime: r.shift?.endTime || null,
        isOffDay: r.isOffDay,
        notes: r.notes,
      };
    });

    return {
      success: true,
      employees,
      daysInMonth,
      rosterMap,
    };
  } catch (error: any) {
    console.error("getRosterMatrix error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch roster matrix",
      employees: [],
      daysInMonth: [],
      rosterMap: {},
    };
  }
}

export async function upsertRosterCell(input: {
  employeeId: string;
  dateStr: string; // YYYY-MM-DD
  shiftId: string | null;
  isOffDay?: boolean;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const date = new Date(`${input.dateStr}T00:00:00.000Z`);
    const isOffDay = input.isOffDay || input.shiftId === "OFF";
    const effectiveShiftId = isOffDay ? null : input.shiftId;

    if (!isOffDay && !effectiveShiftId) {
      await prisma.employeeRoster.deleteMany({
        where: {
          employeeId: input.employeeId,
          date,
        },
      });
      revalidatePath("/dashboard/hr/roster");
      return { success: true, data: null };
    }

    const roster = await prisma.employeeRoster.upsert({
      where: {
        employeeId_date: {
          employeeId: input.employeeId,
          date,
        },
      },
      update: {
        shiftId: effectiveShiftId,
        isOffDay,
        notes: input.notes || null,
        createdById: session.user.id,
      },
      create: {
        employeeId: input.employeeId,
        date,
        shiftId: effectiveShiftId,
        isOffDay,
        notes: input.notes || null,
        createdById: session.user.id,
      },
    });

    revalidatePath("/dashboard/hr/roster");
    return { success: true, data: roster };
  } catch (error: any) {
    console.error("upsertRosterCell error:", error);
    return { success: false, error: error.message || "Failed to update roster cell" };
  }
}

export async function bulkGenerateRoster(input: {
  departmentFilter?: string;
  employeeIds?: string[];
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  shiftId: string | null;
  offDaysOfWeek?: number[]; // Array of day indices e.g. [5] for Friday
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Determine target employees
    let targetEmployeeIds: string[] = [];
    if (input.employeeIds && input.employeeIds.length > 0) {
      targetEmployeeIds = input.employeeIds;
    } else {
      const where: any = { status: { not: "trash" } };
      if (input.departmentFilter && input.departmentFilter !== "all") {
        where.OR = [
          { department: input.departmentFilter },
          { DepartmentRef: { name: input.departmentFilter } },
        ];
      }
      const employees = await prisma.employee.findMany({
        where,
        select: { id: true },
      });
      targetEmployeeIds = employees.map((e) => e.id);
    }

    if (targetEmployeeIds.length === 0) {
      return { success: false, error: "No target employees found for roster generation" };
    }

    const start = new Date(`${input.startDateStr}T00:00:00.000Z`);
    const end = new Date(`${input.endDateStr}T00:00:00.000Z`);
    const offDays = input.offDaysOfWeek || [];

    const upsertPromises: any[] = [];
    let current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      const date = new Date(`${dateStr}T00:00:00.000Z`);
      const dayOfWeek = current.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat

      const isOffDay = offDays.includes(dayOfWeek) || input.shiftId === "OFF" || input.shiftId === null;
      const effectiveShiftId = isOffDay ? null : input.shiftId;

      for (const empId of targetEmployeeIds) {
        upsertPromises.push(
          prisma.employeeRoster.upsert({
            where: {
              employeeId_date: {
                employeeId: empId,
                date,
              },
            },
            update: {
              shiftId: effectiveShiftId,
              isOffDay,
              createdById: session.user.id,
            },
            create: {
              employeeId: empId,
              date,
              shiftId: effectiveShiftId,
              isOffDay,
              createdById: session.user.id,
            },
          })
        );
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    await prisma.$transaction(upsertPromises);
    revalidatePath("/dashboard/hr/roster");

    return { success: true, count: upsertPromises.length };
  } catch (error: any) {
    console.error("bulkGenerateRoster error:", error);
    return { success: false, error: error.message || "Failed to bulk generate roster" };
  }
}

export async function clearRosterRange(input: {
  employeeIds?: string[];
  startDateStr: string;
  endDateStr: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const start = new Date(`${input.startDateStr}T00:00:00.000Z`);
    const end = new Date(`${input.endDateStr}T23:59:59.999Z`);

    const where: any = {
      date: {
        gte: start,
        lte: end,
      },
    };

    if (input.employeeIds && input.employeeIds.length > 0) {
      where.employeeId = { in: input.employeeIds };
    }

    const res = await prisma.employeeRoster.deleteMany({ where });
    revalidatePath("/dashboard/hr/roster");

    return { success: true, count: res.count };
  } catch (error: any) {
    console.error("clearRosterRange error:", error);
    return { success: false, error: error.message || "Failed to clear roster range" };
  }
}
