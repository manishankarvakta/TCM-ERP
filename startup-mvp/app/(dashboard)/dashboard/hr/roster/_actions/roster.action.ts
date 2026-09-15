"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Fetch employees and their assigned daily roster entries for a target month (YYYY-MM).
 */
export async function getRosterMatrix(
  monthStr: string,
  departmentFilter: string = "all",
  search: string = ""
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const canView =
      (await hasPermission(userId, "hr.roster", "view")) ||
      (await hasPermission(userId, "hr.attendance", "view"));

    if (!canView) {
      return { success: false, error: "Permission denied" };
    }

    // Parse YYYY-MM
    const [yearStr, monthNumStr] = monthStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthNumStr, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return { success: false, error: "Invalid month format. Expected YYYY-MM" };
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(year, month, 0).getDate();

    // Build employee filter
    const employeeWhere: any = {
      status: "active",
    };

    if (departmentFilter && departmentFilter !== "all") {
      employeeWhere.OR = [
        { departmentId: departmentFilter },
        { department: departmentFilter },
      ];
    }

    if (search && search.trim() !== "") {
      const searchClause = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { employeeCode: { contains: search, mode: "insensitive" } },
          { designation: { contains: search, mode: "insensitive" } },
        ],
      };
      if (employeeWhere.OR) {
        employeeWhere.AND = searchClause;
      } else {
        employeeWhere.OR = searchClause.OR;
      }
    }

    // Fetch employees
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        designation: true,
        departmentId: true,
        designationId: true,
        shiftId: true,
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
        departmentRelation: {
          select: {
            id: true,
            name: true,
          },
        },
        designationRelation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const employeeIds = employees.map((e) => e.id);

    // Fetch roster entries for these employees in target month
    const rosterModel = (prisma as any).employeeRoster;
    const rosterEntries = rosterModel
      ? await rosterModel.findMany({
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
              },
            },
          },
        })
      : [];

    // Fetch active shifts for selection dropdowns
    const shifts = await prisma.shift.findMany({
      where: { isTrash: false, status: "active" },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { name: "asc" },
    });

    // Fetch active departments for header filter
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: {
        monthStr,
        daysInMonth,
        employees,
        rosterEntries,
        shifts,
        departments,
      },
    };
  } catch (error: any) {
    console.error("Error in getRosterMatrix:", error);
    return { success: false, error: error.message || "Failed to fetch roster matrix" };
  }
}

/**
 * Upserts a single employee daily roster cell.
 * If shiftId is null and isOffDay is false, deletes any custom override (reverting to default shift).
 */
export async function upsertRosterCell(input: {
  employeeId: string;
  dateStr: string;
  shiftId: string | null;
  isOffDay?: boolean;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const canEdit =
      (await hasPermission(userId, "hr.roster", "edit")) ||
      (await hasPermission(userId, "hr.attendance", "edit"));

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    const { employeeId, dateStr, shiftId, isOffDay = false, notes } = input;
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return { success: false, error: "Invalid date" };
    }

    // Overlay Strategy: If no custom shift and not an off-day, remove override entry
    if (shiftId === null && !isOffDay) {
      await prisma.employeeRoster.deleteMany({
        where: {
          employeeId,
          date: date,
        },
      });
    } else {
      await prisma.employeeRoster.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date,
          },
        },
        create: {
          employeeId,
          date,
          shiftId: isOffDay ? null : shiftId,
          isOffDay,
          notes,
          createdById: userId,
        },
        update: {
          shiftId: isOffDay ? null : shiftId,
          isOffDay,
          notes,
          createdById: userId,
        },
      });
    }

    revalidatePath("/dashboard/hr/roster");
    return { success: true };
  } catch (error: any) {
    console.error("Error in upsertRosterCell:", error);
    return { success: false, error: error.message || "Failed to update roster cell" };
  }
}

/**
 * Bulk generates roster shift assignments across a date range for a department or employee list.
 */
export async function bulkGenerateRoster(input: {
  departmentFilter?: string;
  employeeIds?: string[];
  startDateStr: string;
  endDateStr: string;
  shiftId: string | null;
  offDaysOfWeek?: number[]; // Day numbers: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const canBulkGenerate =
      (await hasPermission(userId, "hr.roster", "bulk_generate")) ||
      (await hasPermission(userId, "hr.roster", "create")) ||
      (await hasPermission(userId, "hr.attendance", "create"));

    if (!canBulkGenerate) {
      return { success: false, error: "Permission denied" };
    }

    const {
      departmentFilter,
      employeeIds,
      startDateStr,
      endDateStr,
      shiftId,
      offDaysOfWeek = [],
    } = input;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: "Invalid date range" };
    }

    if (startDate > endDate) {
      return { success: false, error: "Start date must be before end date" };
    }

    // Determine targeted employees
    let targetEmployeeIds: string[] = [];

    if (employeeIds && employeeIds.length > 0) {
      targetEmployeeIds = employeeIds;
    } else {
      const employeeWhere: any = { status: "active" };
      if (departmentFilter && departmentFilter !== "all") {
        employeeWhere.OR = [
          { departmentId: departmentFilter },
          { department: departmentFilter },
        ];
      }
      const employees = await prisma.employee.findMany({
        where: employeeWhere,
        select: { id: true },
      });
      targetEmployeeIds = employees.map((e) => e.id);
    }

    if (targetEmployeeIds.length === 0) {
      return { success: false, error: "No matching employees found" };
    }

    // Iterate through dates in range
    const currentDate = new Date(startDate);
    const dateEntries: { date: Date; dayOfWeek: number }[] = [];

    while (currentDate <= endDate) {
      dateEntries.push({
        date: new Date(currentDate),
        dayOfWeek: currentDate.getDay(),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Transactional bulk upserts
    await prisma.$transaction(async (tx) => {
      for (const empId of targetEmployeeIds) {
        for (const { date, dayOfWeek } of dateEntries) {
          const isOff = offDaysOfWeek.includes(dayOfWeek);

          if (shiftId === null && !isOff) {
            // Delete override to revert to default
            await tx.employeeRoster.deleteMany({
              where: { employeeId: empId, date },
            });
          } else {
            await tx.employeeRoster.upsert({
              where: {
                employeeId_date: {
                  employeeId: empId,
                  date,
                },
              },
              create: {
                employeeId: empId,
                date,
                shiftId: isOff ? null : shiftId,
                isOffDay: isOff,
                createdById: userId,
              },
              update: {
                shiftId: isOff ? null : shiftId,
                isOffDay: isOff,
                createdById: userId,
              },
            });
          }
        }
      }
    });

    revalidatePath("/dashboard/hr/roster");
    return { success: true, count: targetEmployeeIds.length * dateEntries.length };
  } catch (error: any) {
    console.error("Error in bulkGenerateRoster:", error);
    return { success: false, error: error.message || "Failed to bulk generate roster" };
  }
}

/**
 * Clears roster overrides for a date range, returning target employees to default shifts.
 */
export async function clearRosterRange(input: {
  startDateStr: string;
  endDateStr: string;
  departmentFilter?: string;
  employeeIds?: string[];
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const canClearMonth =
      (await hasPermission(userId, "hr.roster", "clear_month")) ||
      (await hasPermission(userId, "hr.roster", "edit")) ||
      (await hasPermission(userId, "hr.attendance", "edit"));

    if (!canClearMonth) {
      return { success: false, error: "Permission denied" };
    }

    const { startDateStr, endDateStr, departmentFilter, employeeIds } = input;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: "Invalid date range" };
    }

    let targetEmployeeIds: string[] = [];
    if (employeeIds && employeeIds.length > 0) {
      targetEmployeeIds = employeeIds;
    } else if (departmentFilter && departmentFilter !== "all") {
      const employees = await prisma.employee.findMany({
        where: {
          status: "active",
          OR: [
            { departmentId: departmentFilter },
            { department: departmentFilter },
          ],
        },
        select: { id: true },
      });
      targetEmployeeIds = employees.map((e) => e.id);
    }

    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (targetEmployeeIds.length > 0) {
      whereClause.employeeId = { in: targetEmployeeIds };
    }

    const result = await prisma.employeeRoster.deleteMany({
      where: whereClause,
    });

    revalidatePath("/dashboard/hr/roster");
    return { success: true, deletedCount: result.count };
  } catch (error: any) {
    console.error("Error in clearRosterRange:", error);
    return { success: false, error: error.message || "Failed to clear roster range" };
  }
}
