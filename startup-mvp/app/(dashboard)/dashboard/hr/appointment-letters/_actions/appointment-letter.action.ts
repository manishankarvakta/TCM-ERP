"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { AppointmentLetterStatus, Prisma } from "@prisma/client";
import { calculateSalaryBreakdown } from "@/lib/hr-payroll/policy-calculation";

export interface CreateAppointmentLetterInput {
  employeeId: string;
  issueDate: string;
  joiningDate?: string;
  designation?: string;
  department?: string;
  employmentType?: string;
  grossSalary?: number;
  probationMonths?: number;
  workLocation?: string;
  termsAndConditions?: string;
}

function parseSafeDate(dateVal: any, fallback?: Date): Date {
  if (!dateVal) return fallback || new Date();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? (fallback || new Date()) : d;
}

/**
 * Get active employees who DO NOT have an appointment letter generated yet
 */
export async function getActiveEmployeesForSelection() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", employees: [] };

    const employees = await prisma.employee.findMany({
      where: {
        appointmentLetters: {
          none: { isTrash: false }
        }
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        designation: true,
        employmentType: true,
        joiningDate: true,
        salary: true,
        employeeType: {
          select: {
            id: true,
            name: true,
            salaryStructurePolicy: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Load default salary structure policy
    const defaultPolicy = await prisma.salaryStructurePolicy.findFirst({
      where: { isDefault: true, status: "active", isTrash: false },
    });

    const serializedEmployees = employees.map((emp) => {
      const rawSalary = Number(emp.salary) || 0;
      const policy = emp.employeeType?.salaryStructurePolicy || defaultPolicy || null;
      const breakdown = calculateSalaryBreakdown({
        grossSalary: rawSalary,
        salaryStructurePolicy: policy,
      });

      return {
        id: emp.id,
        name: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.department || "",
        designation: emp.designation || "",
        employmentType: emp.employmentType || "PERMANENT",
        joiningDate: emp.joiningDate ? emp.joiningDate.toISOString().split("T")[0] : "",
        grossSalary: rawSalary,
        basicSalary: breakdown.basicSalary,
        houseRent: breakdown.houseRent,
        medicalAllowance: breakdown.medical,
        conveyanceAllowance: breakdown.transport,
        foodAllowance: breakdown.food,
      };
    });

    return { success: true, employees: serializedEmployees };
  } catch (error) {
    console.error("getActiveEmployeesForSelection error:", error);
    return { success: false, error: "Failed to fetch employees", employees: [] };
  }
}

/**
 * Create a new Appointment Letter (Enforces one appointment letter per employee)
 */
export async function createAppointmentLetter(input: CreateAppointmentLetterInput) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!input.employeeId) {
      return { success: false, error: "Employee selection is required" };
    }

    // Enforce Rule: An employee can only have ONE active appointment letter generated
    const existingLetter = await prisma.appointmentLetter.findFirst({
      where: {
        employeeId: input.employeeId,
        isTrash: false,
      },
    });

    if (existingLetter) {
      return {
        success: false,
        error: `An appointment letter (${existingLetter.letterNumber}) has already been generated for this employee. Each employee can only have one appointment letter.`,
      };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        employeeType: {
          include: {
            salaryStructurePolicy: true,
          },
        },
      },
    });

    if (!employee) {
      return { success: false, error: "Selected employee not found" };
    }

    const rawSalary = input.grossSalary !== undefined ? Number(input.grossSalary) : Number(employee.salary) || 0;

    // Load default salary structure policy if employee type policy is missing
    const defaultPolicy = await prisma.salaryStructurePolicy.findFirst({
      where: { isDefault: true, status: "active", isTrash: false },
    });

    const resolvedPolicy = employee.employeeType?.salaryStructurePolicy || defaultPolicy || null;
    const breakdown = calculateSalaryBreakdown({
      grossSalary: rawSalary,
      salaryStructurePolicy: resolvedPolicy,
    });

    // Generate unique Letter Number (e.g. AL-2026-0001)
    const year = new Date().getFullYear();
    const count = await prisma.appointmentLetter.count();
    let letterNumber = `AL-${year}-${(count + 1).toString().padStart(4, "0")}`;

    let attempts = 0;
    while (await prisma.appointmentLetter.findUnique({ where: { letterNumber } })) {
      attempts++;
      letterNumber = `AL-${year}-${(count + 1 + attempts).toString().padStart(4, "0")}`;
    }

    const issueDate = parseSafeDate(input.issueDate);
    const joiningDate = parseSafeDate(
      input.joiningDate,
      employee.joiningDate || undefined
    );

    const appointmentLetter = await prisma.appointmentLetter.create({
      data: {
        letterNumber,
        employeeId: employee.id,
        issueDate,
        joiningDate,
        designation: input.designation || employee.designation || "Staff",
        department: input.department || employee.department || null,
        employmentType: input.employmentType || employee.employmentType || "PERMANENT",
        grossSalary: rawSalary,
        basicSalary: breakdown.basicSalary,
        houseRent: breakdown.houseRent,
        medicalAllowance: breakdown.medical,
        conveyanceAllowance: breakdown.transport,
        foodAllowance: breakdown.food,
        probationMonths: input.probationMonths || 3,
        workLocation: input.workLocation || "Head Office",
        termsAndConditions: input.termsAndConditions || null,
        status: "ISSUED",
        createdBy: session.user.id,
      },
    });

    try {
      await logItemCreated(
        session.user.id,
        "AppointmentLetter",
        appointmentLetter.id,
        letterNumber
      );
    } catch (logErr) {
      console.warn("Failed to log activity:", logErr);
    }

    revalidateBothPaths("hr/appointment-letters");

    return {
      success: true,
      id: appointmentLetter.id,
      letterNumber,
      message: "Appointment letter created successfully",
    };
  } catch (error) {
    console.error("createAppointmentLetter error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create appointment letter",
    };
  }
}

/**
 * Get paginated list of Appointment Letters
 */
export async function getAppointmentLetters(
  page = 1,
  limit = 10,
  search = "",
  status = "ALL"
) {
  try {
    const session = await auth();
    if (!session?.user)
      return { success: false, error: "Unauthorized", data: [], pagination: null };

    const skip = (page - 1) * limit;
    const where: Prisma.AppointmentLetterWhereInput = {
      isTrash: false,
    };

    if (status !== "ALL") {
      where.status = status as AppointmentLetterStatus;
    }

    if (search.trim()) {
      where.OR = [
        { letterNumber: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
        { employee: { name: { contains: search, mode: "insensitive" } } },
        { employee: { employeeCode: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.appointmentLetter.count({ where });
    const letters = await prisma.appointmentLetter.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            phone: true,
            photo: true,
          },
        },
        creator: {
          select: { name: true },
        },
      },
    });

    const serialized = letters.map((l) => ({
      ...l,
      grossSalary: Number(l.grossSalary),
      basicSalary: Number(l.basicSalary),
      houseRent: Number(l.houseRent),
      medicalAllowance: Number(l.medicalAllowance),
      conveyanceAllowance: Number(l.conveyanceAllowance),
      foodAllowance: Number(l.foodAllowance),
      issueDate: l.issueDate ? l.issueDate.toISOString().split("T")[0] : "",
      joiningDate: l.joiningDate ? l.joiningDate.toISOString().split("T")[0] : "",
      createdAt: l.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: serialized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    console.error("getAppointmentLetters error:", error);
    return {
      success: false,
      error: "Failed to fetch appointment letters",
      data: [],
      pagination: null,
    };
  }
}

/**
 * Get single Appointment Letter details for viewing / printing
 */
export async function getAppointmentLetterById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const letter = await prisma.appointmentLetter.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            email: true,
            phone: true,
            address: true,
            joiningDate: true,
            designation: true,
            department: true,
            nationalId: true,
          },
        },
        creator: { select: { name: true, email: true } },
      },
    });

    if (!letter || letter.isTrash) {
      return { success: false, error: "Appointment letter not found" };
    }

    // Fetch active Organization details for company header
    const organization = await prisma.organization.findFirst({
      where: { status: "active" },
    });

    const serialized = {
      ...letter,
      grossSalary: Number(letter.grossSalary),
      basicSalary: Number(letter.basicSalary),
      houseRent: Number(letter.houseRent),
      medicalAllowance: Number(letter.medicalAllowance),
      conveyanceAllowance: Number(letter.conveyanceAllowance),
      foodAllowance: Number(letter.foodAllowance),
      issueDate: letter.issueDate ? letter.issueDate.toISOString().split("T")[0] : "",
      joiningDate: letter.joiningDate ? letter.joiningDate.toISOString().split("T")[0] : "",
      createdAt: letter.createdAt.toISOString(),
      organization: organization
        ? {
            name: organization.name,
            address: organization.address,
            phone: organization.phone,
            email: organization.email,
            website: organization.website,
            logo: organization.logo,
          }
        : null,
    };

    return { success: true, letter: serialized };
  } catch (error) {
    console.error("getAppointmentLetterById error:", error);
    return { success: false, error: "Failed to fetch appointment letter details" };
  }
}

/**
 * Update Appointment Letter Status
 */
export async function updateAppointmentLetterStatus(
  id: string,
  status: AppointmentLetterStatus
) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const updated = await prisma.appointmentLetter.update({
      where: { id },
      data: { status },
    });

    try {
      await logItemUpdated(
        session.user.id,
        "AppointmentLetter",
        id,
        [`status:${status}`],
        "Updated Appointment Letter status"
      );
    } catch (logErr) {}

    revalidateBothPaths("hr/appointment-letters");
    revalidateBothPaths(`hr/appointment-letters/${id}`);

    return { success: true, message: `Status updated to ${status}` };
  } catch (error) {
    console.error("updateAppointmentLetterStatus error:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Delete (Soft-delete) Appointment Letter
 */
export async function deleteAppointmentLetter(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await prisma.appointmentLetter.update({
      where: { id },
      data: { isTrash: true },
    });

    try {
      await logItemUpdated(
        session.user.id,
        "AppointmentLetter",
        id,
        ["isTrash:true"],
        "Deleted Appointment Letter"
      );
    } catch (logErr) {}

    revalidateBothPaths("hr/appointment-letters");

    return { success: true, message: "Appointment letter deleted successfully" };
  } catch (error) {
    console.error("deleteAppointmentLetter error:", error);
    return { success: false, error: "Failed to delete appointment letter" };
  }
}
