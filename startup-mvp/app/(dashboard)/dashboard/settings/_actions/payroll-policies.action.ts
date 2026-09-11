"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { hasPermission } from "@/lib/permissions";

/**
 * Get all EmployeeTypes with policies
 */
export async function getEmployeeTypes() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", employeeTypes: [] };

    const employeeTypes = await prisma.employeeType.findMany({
      include: {
        salaryStructurePolicy: true,
        attendancePolicy: true,
        latePolicy: true,
        overtimePolicy: true,
        tiffinBillPolicy: true,
        nightBillPolicy: true,
        holidayBillPolicy: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, employeeTypes };
  } catch (error) {
    console.error("getEmployeeTypes error:", error);
    return { success: false, error: "Failed to fetch employee types", employeeTypes: [] };
  }
}

/**
 * Create or update EmployeeType
 */
export async function upsertEmployeeType(input: {
  id?: string;
  name: string;
  code: string;
  description?: string;
  organizationId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const orgId = input.organizationId || "default-org";

    const data = {
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      organizationId: orgId,
    };

    let empType;
    if (input.id) {
      empType = await prisma.employeeType.update({
        where: { id: input.id },
        data,
      });
    } else {
      empType = await prisma.employeeType.create({
        data,
      });
    }

    revalidateBothPaths("/dashboard/settings");
    return { success: true, employeeType: empType };
  } catch (error) {
    console.error("upsertEmployeeType error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to save employee type" };
  }
}

/**
 * Save Policy Matrix for an EmployeeType
 */
export async function saveEmployeeTypePolicyMatrix(input: {
  employeeTypeId: string;
  salaryStructure?: { basicRatio: number; houseRentRatio: number; medicalRatio: number; transportRatio: number; foodRatio: number };
  attendanceBonus?: { bonusAmount: number; allowLate: boolean; maxLateDays: number };
  late?: { lateToAbsentRatio: number; deductFromSalary: boolean; forfeitBonusOnLate: boolean };
  overtime?: { isEligible: boolean; multiplier: number; minMinutes: number };
  tiffinBill?: { isEligible: boolean; cutoffTime: string; dailyAmount: number };
  nightBill?: { isEligible: boolean; dailyAmount: number };
  holidayBill?: { isEligible: boolean; dailyAmount: number; useDailyRate: boolean; allowWithOT: boolean };
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const { employeeTypeId } = input;

    await prisma.$transaction(async (tx) => {
      // 1. Salary Structure Policy
      if (input.salaryStructure) {
        await tx.salaryStructurePolicy.upsert({
          where: { employeeTypeId },
          create: { employeeTypeId, ...input.salaryStructure },
          update: input.salaryStructure,
        });
      }

      // 2. Attendance Bonus Policy
      if (input.attendanceBonus) {
        await tx.attendancePolicy.upsert({
          where: { employeeTypeId },
          create: { employeeTypeId, ...input.attendanceBonus },
          update: input.attendanceBonus,
        });
      }

      // 3. Late Policy
      if (input.late) {
        await tx.latePolicy.upsert({
          where: { employeeTypeId },
          create: { employeeTypeId, ...input.late },
          update: input.late,
        });
      }

      // 4. Overtime Policy
      if (input.overtime) {
        await tx.overtimePolicy.upsert({
          where: { employeeTypeId },
          create: { employeeTypeId, ...input.overtime },
          update: input.overtime,
        });
      }

      // 5. Tiffin Bill Policy
      if (input.tiffinBill) {
        await tx.tiffinBillPolicy.upsert({
          where: { employeeTypeId },
          create: { employeeTypeId, ...input.tiffinBill },
          update: input.tiffinBill,
        });
      }

      // 6. Night Bill Policy
      if (input.nightBill) {
        await tx.nightBillPolicy.upsert({
          where: { employeeTypeId },
          create: { employeeTypeId, ...input.nightBill },
          update: input.nightBill,
        });
      }

      // 7. Holiday Bill Policy
      if (input.holidayBill) {
        await tx.holidayBillPolicy.upsert({
          where: { employeeTypeId },
          create: { employeeTypeId, ...input.holidayBill },
          update: input.holidayBill,
        });
      }
    });

    revalidateBothPaths("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("saveEmployeeTypePolicyMatrix error:", error);
    return { success: false, error: "Failed to save policies" };
  }
}

/**
 * Save Organization System-Wide Payroll Settings
 */
export async function savePayrollSettings(input: {
  organizationId?: string;
  workingDaysDivisor: number;
  currency: string;
  negativeNetPay: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const orgId = input.organizationId || "default-org";

    const settings = await prisma.payrollSetting.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        workingDaysDivisor: input.workingDaysDivisor,
        currency: input.currency,
        negativeNetPay: input.negativeNetPay,
      },
      update: {
        workingDaysDivisor: input.workingDaysDivisor,
        currency: input.currency,
        negativeNetPay: input.negativeNetPay,
      },
    });

    revalidateBothPaths("/dashboard/settings");
    return { success: true, settings };
  } catch (error) {
    console.error("savePayrollSettings error:", error);
    return { success: false, error: "Failed to save settings" };
  }
}
