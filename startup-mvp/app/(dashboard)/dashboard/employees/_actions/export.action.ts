"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { getPayrollSettings } from "@/lib/payroll-settings";

export async function getEmployeesForExport(filters: {
  search?: string;
  status?: string;
  employeeTypeId?: string;
  gender?: string;
  departmentId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canView = await hasPermission(session.user.id, "peoples.employees", "view");
    if (!canView) {
      return { success: false, error: "Permission denied" };
    }

    const where: Prisma.EmployeeWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { employeeCode: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        {
          deviceMappings: {
            some: {
              deviceUserId: { contains: filters.search, mode: "insensitive" }
            }
          }
        }
      ];
    }

    if (filters.status && filters.status !== "all" && filters.status !== "all-status") {
      where.status = filters.status;
    } else {
      where.status = { not: "trash" };
    }

    if (filters.employeeTypeId && filters.employeeTypeId !== "all") {
      where.employeeTypeId = filters.employeeTypeId;
    }

    if (filters.gender && filters.gender !== "all") {
      where.gender = filters.gender;
    }

    if (filters.departmentId && filters.departmentId !== "all") {
      where.departmentId = filters.departmentId;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        employeeType: true,
        departmentRelation: true,
        shift: true,
        deviceMappings: true
      },
      orderBy: { name: "asc" }
    });

    // Serialize to standard object to avoid Decimal serialization issues
    const serialized = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      employeeCode: emp.employeeCode,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation,
      department: emp.department,
      status: emp.status,
      joiningDate: emp.joiningDate ? emp.joiningDate.toISOString() : null,
      employeeType: emp.employeeType ? { name: emp.employeeType.name } : null,
      salary: emp.salary ? Number(emp.salary) : 0,
      departmentRelation: emp.departmentRelation ? { name: emp.departmentRelation.name } : null,
      deviceMappings: emp.deviceMappings.map(m => ({ deviceUserId: m.deviceUserId }))
    }));

    return { success: true, employees: serialized };
  } catch (error) {
    console.error("getEmployeesForExport error:", error);
    return { success: false, error: "Failed to fetch employees for export" };
  }
}

export async function getAttendancesForExport(filters: {
  fromDate: string;
  toDate: string;
  employeeTypeId?: string;
  departmentId?: string;
  search?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canView = await hasPermission(session.user.id, "hr.attendance", "view");
    if (!canView) {
      return { success: false, error: "Permission denied" };
    }

    const start = new Date(filters.fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.toDate);
    end.setHours(23, 59, 59, 999);

    // Find matching employee IDs based on type/dept/search
    const empWhere: Prisma.EmployeeWhereInput = {};
    
    if (filters.search) {
      empWhere.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { employeeCode: { contains: filters.search, mode: "insensitive" } }
      ];
    }

    if (filters.employeeTypeId && filters.employeeTypeId !== "all") {
      empWhere.employeeTypeId = filters.employeeTypeId;
    }

    if (filters.departmentId && filters.departmentId !== "all") {
      empWhere.departmentId = filters.departmentId;
    }

    const matchingEmployees = await prisma.employee.findMany({
      where: empWhere,
      include: {
        departmentRelation: true
      },
      orderBy: { name: "asc" }
    });

    const employeeIds = matchingEmployees.map(e => e.id);

    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: start, lte: end },
        employeeId: { in: employeeIds }
      },
      orderBy: { date: "asc" }
    });

    const serializedEmployees = matchingEmployees.map(emp => ({
      id: emp.id,
      name: emp.name,
      employeeCode: emp.employeeCode,
      designation: emp.designation,
      department: emp.department,
      departmentRelation: emp.departmentRelation ? { name: emp.departmentRelation.name } : null
    }));

    const serializedAttendances = attendances.map(att => ({
      id: att.id,
      date: att.date.toISOString(),
      employeeId: att.employeeId,
      workHours: att.workHours ? Number(att.workHours) : 0,
      otHours: att.otHours ? Number(att.otHours) : 0,
      lateMinutes: att.lateMinutes || 0,
      status: att.status
    }));

    const payrollSettings = await getPayrollSettings();
    const weekends = payrollSettings?.calculation?.weekends || [0, 6];

    return { success: true, employees: serializedEmployees, attendances: serializedAttendances, weekends };
  } catch (error) {
    console.error("getAttendancesForExport error:", error);
    return { success: false, error: "Failed to fetch attendances for export" };
  }
}

export async function getSingleEmployeeAttendanceForExport(
  employeeId: string,
  fromDate: string,
  toDate: string
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canView = await hasPermission(session.user.id, "hr.attendance", "view");
    if (!canView) {
      return { success: false, error: "Permission denied" };
    }

    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        departmentRelation: true,
        employeeType: true,
        shift: true,
      }
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: start, lte: end }
      },
      orderBy: { date: "asc" }
    });

    const serializedEmployee = {
      id: employee.id,
      name: employee.name,
      employeeCode: employee.employeeCode,
      designation: employee.designation,
      department: employee.departmentRelation?.name || employee.department || "N/A",
      employeeType: employee.employeeType?.name || "N/A",
      shift: employee.shift ? {
        id: employee.shift.id,
        name: employee.shift.name,
        breakType: employee.shift.breakType,
        breakDuration: employee.shift.breakDuration,
        breakStartTime: employee.shift.breakStartTime,
        breakEndTime: employee.shift.breakEndTime
      } : null
    };

    const serializedAttendances = attendances.map(att => ({
      id: att.id,
      date: att.date.toISOString(),
      workHours: att.workHours ? Number(att.workHours) : 0,
      otHours: att.otHours ? Number(att.otHours) : 0,
      lateMinutes: att.lateMinutes || 0,
      status: att.status,
      checkIn: att.checkIn ? att.checkIn.toISOString() : null,
      checkOut: att.checkOut ? att.checkOut.toISOString() : null,
      breakCheckOut: att.breakCheckOut ? att.breakCheckOut.toISOString() : null,
      breakCheckIn: att.breakCheckIn ? att.breakCheckIn.toISOString() : null,
      breakLateMinutes: att.breakLateMinutes || 0,
    }));

    const payrollSettings = await getPayrollSettings();
    const weekends = payrollSettings?.calculation?.weekends || [0, 6];

    return {
      success: true,
      employee: serializedEmployee,
      attendances: serializedAttendances,
      weekends
    };
  } catch (error) {
    console.error("getSingleEmployeeAttendanceForExport error:", error);
    return { success: false, error: "Failed to fetch single employee attendance for export" };
  }
}
