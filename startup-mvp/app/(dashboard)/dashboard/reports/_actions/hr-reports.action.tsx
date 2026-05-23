"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { AttendanceStatus, Prisma } from "@prisma/client";
import { format } from "date-fns";

/**
 * Get Attendance Report
 */
export async function getAttendanceReport(filters: {
  employeeId?: string;
  departmentId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: AttendanceStatus | "all";
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canView = await hasPermission(session.user.id, "reports.view", "view");
    if (!canView) return { success: false, error: "Unauthorized" };

    const where: Prisma.AttendanceWhereInput = {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status && filters.status !== "all" ? { status: filters.status as AttendanceStatus } : {}),
      ...(filters.dateFrom || filters.dateTo ? {
        date: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      } : {}),
      employee: {
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      }
    };

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
          }
        },
      },
      orderBy: [
        { date: "desc" },
        { employee: { name: "asc" } }
      ],
    });

    const reportData = attendance.map(att => ({
      date: format(att.date, "yyyy-MM-dd"),
      employeeCode: att.employee.employeeCode,
      employeeName: att.employee.name,
      department: att.employee.department?.name || "N/A",
      designation: att.employee.designation?.name || "N/A",
      status: att.status,
      checkIn: att.checkIn ? format(att.checkIn, "HH:mm") : "-",
      checkOut: att.checkOut ? format(att.checkOut, "HH:mm") : "-",
      workHours: Number(att.workHours),
      otHours: Number(att.otHours),
      notes: att.notes || "",
    }));

    return { success: true, data: reportData };
  } catch (error) {
    console.error("getAttendanceReport error:", error);
    return { success: false, error: "Failed to fetch attendance report" };
  }
}

/**
 * Get Payroll Summary Report
 */
export async function getPayrollSummary(filters: {
  month?: number;
  year?: number;
  departmentId?: string;
  branchId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canView = await hasPermission(session.user.id, "reports.view", "view");
    if (!canView) return { success: false, error: "Unauthorized" };

    const where: Prisma.PayrollItemWhereInput = {
      payroll: {
        ...(filters.month ? { month: filters.month } : {}),
        ...(filters.year ? { year: filters.year } : {}),
        status: { not: "VOID" as any }, // Using any asVOID might not be in enum yet but we added it
      },
      employee: {
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      }
    };

    const items = await prisma.payrollItem.findMany({
      where,
      include: {
        payroll: true,
        employee: {
          select: {
            name: true,
            employeeCode: true,
            department: { select: { name: true } },
            designation: { select: { name: true } },
            branch: { select: { name: true } },
          }
        }
      },
      orderBy: { employee: { name: "asc" } }
    });

    const reportData = items.map(item => ({
      period: `${item.payroll.year}-${item.payroll.month.toString().padStart(2, "0")}`,
      employeeCode: item.employee.employeeCode,
      employeeName: item.employee.name,
      department: item.employee.department?.name || "N/A",
      designation: item.employee.designation?.name || "N/A",
      branch: item.employee.branch?.name || "N/A",
      grossPay: Number(item.grossPay),
      totalDeduction: Number(item.totalDeduction),
      netPay: Number(item.netPay),
      status: item.status,
    }));

    return { success: true, data: reportData };
  } catch (error) {
    console.error("getPayrollSummary error:", error);
    return { success: false, error: "Failed to fetch payroll summary" };
  }
}

/**
 * Get Employee Joining Report
 */
export async function getEmployeeJoiningReport(filters: {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const where: Prisma.EmployeeWhereInput = {
      ...(filters.dateFrom || filters.dateTo ? {
        joiningDate: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
        }
      } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      isTrash: false,
    };

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        designation: true,
        branch: true,
      },
      orderBy: { joiningDate: "desc" }
    });

    const reportData = employees.map(emp => ({
      joiningDate: emp.joiningDate ? format(emp.joiningDate, "yyyy-MM-dd") : "N/A",
      employeeCode: emp.employeeCode,
      employeeName: emp.name,
      department: emp.department?.name || "N/A",
      designation: emp.designation?.name || "N/A",
      branch: emp.branch?.name || "N/A",
      status: emp.status,
    }));

    return { success: true, data: reportData };
  } catch (error) {
    console.error("getEmployeeJoiningReport error:", error);
    return { success: false, error: "Failed to fetch joining report" };
  }
}
