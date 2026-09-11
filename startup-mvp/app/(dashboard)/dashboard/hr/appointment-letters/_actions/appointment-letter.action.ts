"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { getNextSequenceNumber } from "@/lib/sequence";

/**
 * Get paginated list of appointment letters
 */
export async function getAppointmentLetters(page: number = 1, limit: number = 10, search: string = "") {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", letters: [], pagination: null };

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { letterNumber: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
        { employee: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await prisma.appointmentLetter.count({ where });
    const letters = await prisma.appointmentLetter.findMany({
      where,
      skip,
      take: limit,
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const serializedLetters = letters.map((l) => ({
      ...l,
      grossSalary: Number(l.grossSalary),
      basicSalary: Number(l.basicSalary),
    }));

    return {
      success: true,
      letters: serializedLetters,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    console.error("getAppointmentLetters error:", error);
    return { success: false, error: "Failed to fetch appointment letters", letters: [], pagination: null };
  }
}

/**
 * Generate a new appointment letter for an employee
 */
export async function createAppointmentLetter(input: {
  employeeId: string;
  joiningDate: Date;
  probationMonths?: number;
  terms?: string;
  organizationId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: { salaryStructure: true },
    });

    if (!employee) return { success: false, error: "Employee not found" };

    const orgId = input.organizationId || employee.organizationId || "default-org";

    // Generate unique letter number (e.g., AL-2026-10001)
    const letterNumber = await getNextSequenceNumber(orgId, "APPOINTMENT_LETTER", "AL", 2026, 5);

    const grossSalary = Number(employee.salary) || 0;
    const basicSalary = Number(employee.salaryStructure?.basic) || (grossSalary * 0.55);

    const letter = await prisma.appointmentLetter.create({
      data: {
        letterNumber,
        employeeId: employee.id,
        issueDate: new Date(),
        joiningDate: new Date(input.joiningDate),
        designation: employee.designation || "Staff",
        department: employee.department || "General",
        grossSalary,
        basicSalary,
        probationMonths: input.probationMonths ?? 6,
        terms: input.terms || "Standard probation and employment terms apply.",
        status: "ISSUED",
        createdBy: session.user.id,
        organizationId: orgId,
      },
    });

    revalidateBothPaths("/dashboard/hr/appointment-letters");
    return { success: true, letter };
  } catch (error) {
    console.error("createAppointmentLetter error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create appointment letter" };
  }
}

/**
 * Get appointment letter by ID
 */
export async function getAppointmentLetterById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const letter = await prisma.appointmentLetter.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true, designation: true, department: true, email: true, phone: true } },
      },
    });

    if (!letter) return { success: false, error: "Letter not found" };

    return {
      success: true,
      letter: {
        ...letter,
        grossSalary: Number(letter.grossSalary),
        basicSalary: Number(letter.basicSalary),
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch letter" };
  }
}
