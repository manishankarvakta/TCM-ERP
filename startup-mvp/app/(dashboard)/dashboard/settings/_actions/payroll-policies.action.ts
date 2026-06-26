"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { calculatePayrollPolicyPreview } from "@/lib/hr-payroll/policy-calculation";
import { reprocessAttendancePoliciesForDateRange } from "@/lib/hr-payroll/attendance-policy-service";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";

async function checkAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

// Helper to validate HH:mm format
function isValidTimeFormat(time: string | null | undefined): boolean {
  if (!time) return true; // Null/empty is acceptable
  const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
  return regex.test(time);
}

// ===========================================================================
// 1. SalaryStructurePolicy Actions
// ===========================================================================

export async function listSalaryStructurePolicies() {
  try {
    await checkAuth();
    const policies = await prisma.salaryStructurePolicy.findMany({
      where: { isTrash: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, policies };
  } catch (error) {
    console.error("listSalaryStructurePolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load policies", policies: [] };
  }
}

export async function createSalaryStructurePolicy(data: {
  name: string;
  description?: string;
  isDefault?: boolean;
  basedOn?: string;
  basicPercent: number;
  houseRentPercent: number;
  medicalPercent: number;
  transportPercent: number;
  foodPercent: number;
  status?: string;
}) {
  try {
    const session = await checkAuth();
    const creatorId = session.user.id;

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Name is required" };
    }

    if (
      data.basicPercent < 0 ||
      data.houseRentPercent < 0 ||
      data.medicalPercent < 0 ||
      data.transportPercent < 0 ||
      data.foodPercent < 0
    ) {
      return { success: false, error: "Percentages cannot be negative" };
    }

    const totalPercent =
      data.basicPercent +
      data.houseRentPercent +
      data.medicalPercent +
      data.transportPercent +
      data.foodPercent;

    // Use floating point margin error check
    if (Math.abs(totalPercent - 100) > 0.01) {
      return { success: false, error: `Percentages must sum to exactly 100%. Current total: ${totalPercent}%` };
    }

    const isDefault = !!data.isDefault;

    // Use transaction to toggle default status if needed
    const policy = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.salaryStructurePolicy.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.salaryStructurePolicy.create({
        data: {
          name: data.name,
          description: data.description || null,
          isDefault,
          basedOn: data.basedOn || "GROSS",
          basicPercent: new Prisma.Decimal(data.basicPercent),
          houseRentPercent: new Prisma.Decimal(data.houseRentPercent),
          medicalPercent: new Prisma.Decimal(data.medicalPercent),
          transportPercent: new Prisma.Decimal(data.transportPercent),
          foodPercent: new Prisma.Decimal(data.foodPercent),
          status: data.status || "active",
          createdBy: creatorId,
        },
      });
    });

    await logItemCreated(creatorId, "SalaryStructurePolicy", policy.id, policy.name);
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("createSalaryStructurePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create policy" };
  }
}

export async function updateSalaryStructurePolicy(
  id: string,
  data: {
    name?: string;
    description?: string;
    isDefault?: boolean;
    basedOn?: string;
    basicPercent: number;
    houseRentPercent: number;
    medicalPercent: number;
    transportPercent: number;
    foodPercent: number;
    status?: string;
  }
) {
  try {
    const session = await checkAuth();

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      return { success: false, error: "Name is required" };
    }

    if (
      data.basicPercent < 0 ||
      data.houseRentPercent < 0 ||
      data.medicalPercent < 0 ||
      data.transportPercent < 0 ||
      data.foodPercent < 0
    ) {
      return { success: false, error: "Percentages cannot be negative" };
    }

    const totalPercent =
      data.basicPercent +
      data.houseRentPercent +
      data.medicalPercent +
      data.transportPercent +
      data.foodPercent;

    if (Math.abs(totalPercent - 100) > 0.01) {
      return { success: false, error: `Percentages must sum to exactly 100%. Current total: ${totalPercent}%` };
    }

    const isDefault = !!data.isDefault;

    const policy = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.salaryStructurePolicy.updateMany({
          where: { id: { not: id }, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.salaryStructurePolicy.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description !== undefined ? data.description : undefined,
          isDefault,
          basedOn: data.basedOn,
          basicPercent: new Prisma.Decimal(data.basicPercent),
          houseRentPercent: new Prisma.Decimal(data.houseRentPercent),
          medicalPercent: new Prisma.Decimal(data.medicalPercent),
          transportPercent: new Prisma.Decimal(data.transportPercent),
          foodPercent: new Prisma.Decimal(data.foodPercent),
          status: data.status,
        },
      });
    });

    await logItemUpdated(
      session.user.id,
      "SalaryStructurePolicy",
      policy.id,
      Object.keys(data).filter(k => (data as any)[k] !== undefined),
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("updateSalaryStructurePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update policy" };
  }
}

export async function softDeleteSalaryStructurePolicy(id: string) {
  try {
    const session = await checkAuth();

    const policy = await prisma.salaryStructurePolicy.findUnique({ where: { id } });
    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    if (policy.isDefault) {
      return { success: false, error: "Cannot delete the default salary structure policy. Please set another policy as default first." };
    }

    // Check if employee types are using it
    const mappingCount = await prisma.employeeType.count({
      where: { salaryStructurePolicyId: id, isTrash: false },
    });
    if (mappingCount > 0) {
      return { success: false, error: `Cannot delete: this policy is currently assigned to ${mappingCount} employee types.` };
    }

    await prisma.salaryStructurePolicy.update({
      where: { id },
      data: { isTrash: true, status: "inactive" },
    });

    await logItemUpdated(
      session.user.id,
      "SalaryStructurePolicy",
      id,
      ["isTrash:true", "status:inactive"],
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("softDeleteSalaryStructurePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete policy" };
  }
}

export async function setDefaultSalaryStructurePolicy(id: string) {
  try {
    await checkAuth();

    await prisma.$transaction(async (tx) => {
      await tx.salaryStructurePolicy.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      await tx.salaryStructurePolicy.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("setDefaultSalaryStructurePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to set default" };
  }
}

// ===========================================================================
// 2. AttendancePolicy Actions
// ===========================================================================

export async function listAttendancePolicies() {
  try {
    await checkAuth();
    const policies = await prisma.attendancePolicy.findMany({
      where: { isTrash: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, policies };
  } catch (error) {
    console.error("listAttendancePolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load policies", policies: [] };
  }
}

export async function createAttendancePolicy(data: {
  name: string;
  description?: string;
  isEnabled?: boolean;
  isEligibleForAttendanceBonus?: boolean;
  bonusCalculationType?: string;
  attendanceBonusAmount: number;
  applyAbsentPenalty?: boolean;
  applyLatePenalty?: boolean;
  status?: string;
}) {
  try {
    const session = await checkAuth();
    const creatorId = session.user.id;

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Name is required" };
    }

    const bonusCalculationType = data.bonusCalculationType || "NONE";
    const allowedBonusTypes = ["NONE", "FIXED", "CATEGORY_BASED"];
    if (!allowedBonusTypes.includes(bonusCalculationType)) {
      return { success: false, error: "Invalid bonus calculation type" };
    }

    if (data.attendanceBonusAmount < 0) {
      return { success: false, error: "Attendance bonus amount cannot be negative" };
    }

    const policy = await prisma.attendancePolicy.create({
      data: {
        name: data.name,
        description: data.description || null,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        isEligibleForAttendanceBonus: !!data.isEligibleForAttendanceBonus,
        bonusCalculationType,
        attendanceBonusAmount: new Prisma.Decimal(data.attendanceBonusAmount),
        applyAbsentPenalty: data.applyAbsentPenalty !== undefined ? data.applyAbsentPenalty : true,
        applyLatePenalty: data.applyLatePenalty !== undefined ? data.applyLatePenalty : true,
        status: data.status || "active",
        createdBy: creatorId,
      },
    });

    await logItemCreated(creatorId, "AttendancePolicy", policy.id, policy.name);
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("createAttendancePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create policy" };
  }
}

export async function updateAttendancePolicy(
  id: string,
  data: {
    name?: string;
    description?: string;
    isEnabled?: boolean;
    isEligibleForAttendanceBonus?: boolean;
    bonusCalculationType?: string;
    attendanceBonusAmount: number;
    applyAbsentPenalty?: boolean;
    applyLatePenalty?: boolean;
    status?: string;
  }
) {
  try {
    const session = await checkAuth();

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      return { success: false, error: "Name is required" };
    }

    if (data.bonusCalculationType !== undefined) {
      const allowedBonusTypes = ["NONE", "FIXED", "CATEGORY_BASED"];
      if (!allowedBonusTypes.includes(data.bonusCalculationType)) {
        return { success: false, error: "Invalid bonus calculation type" };
      }
    }

    if (data.attendanceBonusAmount < 0) {
      return { success: false, error: "Attendance bonus amount cannot be negative" };
    }

    const policy = await prisma.attendancePolicy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        isEnabled: data.isEnabled,
        isEligibleForAttendanceBonus: data.isEligibleForAttendanceBonus,
        bonusCalculationType: data.bonusCalculationType,
        attendanceBonusAmount: new Prisma.Decimal(data.attendanceBonusAmount),
        applyAbsentPenalty: data.applyAbsentPenalty,
        applyLatePenalty: data.applyLatePenalty,
        status: data.status,
      },
    });

    await logItemUpdated(
      session.user.id,
      "AttendancePolicy",
      policy.id,
      Object.keys(data).filter(k => (data as any)[k] !== undefined),
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("updateAttendancePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update policy" };
  }
}

export async function softDeleteAttendancePolicy(id: string) {
  try {
    const session = await checkAuth();

    // Check if employee types are using it
    const mappingCount = await prisma.employeeType.count({
      where: { attendancePolicyId: id, isTrash: false },
    });
    if (mappingCount > 0) {
      return { success: false, error: `Cannot delete: this policy is currently assigned to ${mappingCount} employee types.` };
    }

    const policy = await prisma.attendancePolicy.findUnique({ where: { id } });
    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    await prisma.attendancePolicy.update({
      where: { id },
      data: { isTrash: true, status: "inactive" },
    });

    await logItemUpdated(
      session.user.id,
      "AttendancePolicy",
      id,
      ["isTrash:true", "status:inactive"],
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("softDeleteAttendancePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete policy" };
  }
}

// ===========================================================================
// 3. LatePolicy Actions
// ===========================================================================

export async function listLatePolicies() {
  try {
    await checkAuth();
    const policies = await prisma.latePolicy.findMany({
      where: { isTrash: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, policies };
  } catch (error) {
    console.error("listLatePolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load policies", policies: [] };
  }
}

export async function createLatePolicy(data: {
  name: string;
  description?: string;
  isEnabled?: boolean;
  resetLateEveryMonth?: boolean;
  lateCountPeriod?: string;
  enableLateToAbsentConversion?: boolean;
  lateDaysForOneAbsent: number;
  lateCountForBonusLoss: number;
  deductSalaryForLate?: boolean;
  deductAttendanceBonusForLate?: boolean;
  status?: string;
}) {
  try {
    const session = await checkAuth();
    const creatorId = session.user.id;

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Name is required" };
    }

    const lateCountPeriod = data.lateCountPeriod || "MONTHLY";
    const allowedPeriods = ["MONTHLY", "PAYROLL_PERIOD"];
    if (!allowedPeriods.includes(lateCountPeriod)) {
      return { success: false, error: "Invalid late count period" };
    }

    if (data.lateDaysForOneAbsent <= 0) {
      return { success: false, error: "Late days for one absent must be greater than 0" };
    }

    if (data.lateCountForBonusLoss <= 0) {
      return { success: false, error: "Late count for bonus loss must be greater than 0" };
    }

    const policy = await prisma.latePolicy.create({
      data: {
        name: data.name,
        description: data.description || null,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        resetLateEveryMonth: data.resetLateEveryMonth !== undefined ? data.resetLateEveryMonth : true,
        lateCountPeriod,
        enableLateToAbsentConversion: !!data.enableLateToAbsentConversion,
        lateDaysForOneAbsent: Math.round(data.lateDaysForOneAbsent),
        lateCountForBonusLoss: Math.round(data.lateCountForBonusLoss),
        deductSalaryForLate: !!data.deductSalaryForLate,
        deductAttendanceBonusForLate: data.deductAttendanceBonusForLate !== undefined ? data.deductAttendanceBonusForLate : true,
        status: data.status || "active",
        createdBy: creatorId,
      },
    });

    await logItemCreated(creatorId, "LatePolicy", policy.id, policy.name);
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("createLatePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create policy" };
  }
}

export async function updateLatePolicy(
  id: string,
  data: {
    name?: string;
    description?: string;
    isEnabled?: boolean;
    resetLateEveryMonth?: boolean;
    lateCountPeriod?: string;
    enableLateToAbsentConversion?: boolean;
    lateDaysForOneAbsent: number;
    lateCountForBonusLoss: number;
    deductSalaryForLate?: boolean;
    deductAttendanceBonusForLate?: boolean;
    status?: string;
  }
) {
  try {
    const session = await checkAuth();

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      return { success: false, error: "Name is required" };
    }

    if (data.lateCountPeriod !== undefined) {
      const allowedPeriods = ["MONTHLY", "PAYROLL_PERIOD"];
      if (!allowedPeriods.includes(data.lateCountPeriod)) {
        return { success: false, error: "Invalid late count period" };
      }
    }

    if (data.lateDaysForOneAbsent <= 0) {
      return { success: false, error: "Late days for one absent must be greater than 0" };
    }

    if (data.lateCountForBonusLoss <= 0) {
      return { success: false, error: "Late count for bonus loss must be greater than 0" };
    }

    const policy = await prisma.latePolicy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        isEnabled: data.isEnabled,
        resetLateEveryMonth: data.resetLateEveryMonth,
        lateCountPeriod: data.lateCountPeriod,
        enableLateToAbsentConversion: data.enableLateToAbsentConversion,
        lateDaysForOneAbsent: Math.round(data.lateDaysForOneAbsent),
        lateCountForBonusLoss: Math.round(data.lateCountForBonusLoss),
        deductSalaryForLate: data.deductSalaryForLate,
        deductAttendanceBonusForLate: data.deductAttendanceBonusForLate,
        status: data.status,
      },
    });

    await logItemUpdated(
      session.user.id,
      "LatePolicy",
      policy.id,
      Object.keys(data).filter(k => (data as any)[k] !== undefined),
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("updateLatePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update policy" };
  }
}

export async function softDeleteLatePolicy(id: string) {
  try {
    const session = await checkAuth();

    // Check if employee types are using it
    const mappingCount = await prisma.employeeType.count({
      where: { latePolicyId: id, isTrash: false },
    });
    if (mappingCount > 0) {
      return { success: false, error: `Cannot delete: this policy is currently assigned to ${mappingCount} employee types.` };
    }

    const policy = await prisma.latePolicy.findUnique({ where: { id } });
    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    await prisma.latePolicy.update({
      where: { id },
      data: { isTrash: true, status: "inactive" },
    });

    await logItemUpdated(
      session.user.id,
      "LatePolicy",
      id,
      ["isTrash:true", "status:inactive"],
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("softDeleteLatePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete policy" };
  }
}

// ===========================================================================
// 4. OvertimePolicy Actions
// ===========================================================================

export async function listOvertimePolicies() {
  try {
    await checkAuth();
    const policies = await prisma.overtimePolicy.findMany({
      where: { isTrash: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, policies };
  } catch (error) {
    console.error("listOvertimePolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load policies", policies: [] };
  }
}

export async function createOvertimePolicy(data: {
  name: string;
  description?: string;
  isEligible?: boolean;
  calculationType?: string;
  basicPercentageFromGross: number;
  monthlyWorkingDays: number;
  hourBasis?: string;
  fixedHourValue?: number | null;
  multiplier: number;
  fixedOTRate?: number | null;
  minimumOTMinutes: number;
  status?: string;
}) {
  try {
    const session = await checkAuth();
    const creatorId = session.user.id;

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Name is required" };
    }

    const calculationType = data.calculationType || "FORMULA";
    const allowedCalcTypes = ["FORMULA", "FIXED_RATE"];
    if (!allowedCalcTypes.includes(calculationType)) {
      return { success: false, error: "Invalid calculation type" };
    }

    const hourBasis = data.hourBasis || "ASSIGNED_SHIFT_HOUR";
    const allowedHourBases = ["ASSIGNED_SHIFT_HOUR", "FIXED_HOUR"];
    if (!allowedHourBases.includes(hourBasis)) {
      return { success: false, error: "Invalid hour basis" };
    }

    if (data.basicPercentageFromGross < 0) {
      return { success: false, error: "Basic percentage from gross cannot be negative" };
    }

    if (data.monthlyWorkingDays <= 0) {
      return { success: false, error: "Monthly working days must be greater than 0" };
    }

    if (data.multiplier < 0) {
      return { success: false, error: "OT Multiplier cannot be negative" };
    }

    if (calculationType === "FIXED_RATE" && (data.fixedOTRate === undefined || data.fixedOTRate === null || data.fixedOTRate < 0)) {
      return { success: false, error: "Fixed OT Rate must be provided and cannot be negative when calculation type is FIXED_RATE" };
    }

    if (hourBasis === "FIXED_HOUR" && (data.fixedHourValue === undefined || data.fixedHourValue === null || data.fixedHourValue <= 0)) {
      return { success: false, error: "Fixed Hour Value must be provided and greater than 0 when hour basis is FIXED_HOUR" };
    }

    if (data.minimumOTMinutes < 0) {
      return { success: false, error: "Minimum OT Minutes cannot be negative" };
    }

    const policy = await prisma.overtimePolicy.create({
      data: {
        name: data.name,
        description: data.description || null,
        isEligible: !!data.isEligible,
        calculationType,
        basicPercentageFromGross: new Prisma.Decimal(data.basicPercentageFromGross),
        monthlyWorkingDays: Math.round(data.monthlyWorkingDays),
        hourBasis,
        fixedHourValue: data.fixedHourValue !== undefined && data.fixedHourValue !== null ? new Prisma.Decimal(data.fixedHourValue) : null,
        multiplier: new Prisma.Decimal(data.multiplier),
        fixedOTRate: data.fixedOTRate !== undefined && data.fixedOTRate !== null ? new Prisma.Decimal(data.fixedOTRate) : null,
        minimumOTMinutes: Math.round(data.minimumOTMinutes),
        status: data.status || "active",
        createdBy: creatorId,
      },
    });

    await logItemCreated(creatorId, "OvertimePolicy", policy.id, policy.name);
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("createOvertimePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create policy" };
  }
}

export async function updateOvertimePolicy(
  id: string,
  data: {
    name?: string;
    description?: string;
    isEligible?: boolean;
    calculationType?: string;
    basicPercentageFromGross: number;
    monthlyWorkingDays: number;
    hourBasis?: string;
    fixedHourValue?: number | null;
    multiplier: number;
    fixedOTRate?: number | null;
    minimumOTMinutes: number;
    status?: string;
  }
) {
  try {
    const session = await checkAuth();

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      return { success: false, error: "Name is required" };
    }

    if (data.calculationType !== undefined) {
      const allowedCalcTypes = ["FORMULA", "FIXED_RATE"];
      if (!allowedCalcTypes.includes(data.calculationType)) {
        return { success: false, error: "Invalid calculation type" };
      }
    }

    if (data.hourBasis !== undefined) {
      const allowedHourBases = ["ASSIGNED_SHIFT_HOUR", "FIXED_HOUR"];
      if (!allowedHourBases.includes(data.hourBasis)) {
        return { success: false, error: "Invalid hour basis" };
      }
    }

    if (data.basicPercentageFromGross < 0) {
      return { success: false, error: "Basic percentage from gross cannot be negative" };
    }

    if (data.monthlyWorkingDays <= 0) {
      return { success: false, error: "Monthly working days must be greater than 0" };
    }

    if (data.multiplier < 0) {
      return { success: false, error: "OT Multiplier cannot be negative" };
    }

    const calcType = data.calculationType || "FORMULA";
    if (calcType === "FIXED_RATE" && (data.fixedOTRate === undefined || data.fixedOTRate === null || data.fixedOTRate < 0)) {
      return { success: false, error: "Fixed OT Rate must be provided and cannot be negative when calculation type is FIXED_RATE" };
    }

    const hrBasis = data.hourBasis || "ASSIGNED_SHIFT_HOUR";
    if (hrBasis === "FIXED_HOUR" && (data.fixedHourValue === undefined || data.fixedHourValue === null || data.fixedHourValue <= 0)) {
      return { success: false, error: "Fixed Hour Value must be provided and greater than 0 when hour basis is FIXED_HOUR" };
    }

    if (data.minimumOTMinutes < 0) {
      return { success: false, error: "Minimum OT Minutes cannot be negative" };
    }

    const policy = await prisma.overtimePolicy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        isEligible: data.isEligible,
        calculationType: data.calculationType,
        basicPercentageFromGross: new Prisma.Decimal(data.basicPercentageFromGross),
        monthlyWorkingDays: Math.round(data.monthlyWorkingDays),
        hourBasis: data.hourBasis,
        fixedHourValue: data.fixedHourValue !== undefined && data.fixedHourValue !== null ? new Prisma.Decimal(data.fixedHourValue) : null,
        multiplier: new Prisma.Decimal(data.multiplier),
        fixedOTRate: data.fixedOTRate !== undefined && data.fixedOTRate !== null ? new Prisma.Decimal(data.fixedOTRate) : null,
        minimumOTMinutes: Math.round(data.minimumOTMinutes),
        status: data.status,
      },
    });

    await logItemUpdated(
      session.user.id,
      "OvertimePolicy",
      policy.id,
      Object.keys(data).filter(k => (data as any)[k] !== undefined),
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("updateOvertimePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update policy" };
  }
}

export async function softDeleteOvertimePolicy(id: string) {
  try {
    const session = await checkAuth();

    // Check if employee types are using it
    const mappingCount = await prisma.employeeType.count({
      where: { overtimePolicyId: id, isTrash: false },
    });
    if (mappingCount > 0) {
      return { success: false, error: `Cannot delete: this policy is currently assigned to ${mappingCount} employee types.` };
    }

    const policy = await prisma.overtimePolicy.findUnique({ where: { id } });
    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    await prisma.overtimePolicy.update({
      where: { id },
      data: { isTrash: true, status: "inactive" },
    });

    await logItemUpdated(
      session.user.id,
      "OvertimePolicy",
      id,
      ["isTrash:true", "status:inactive"],
      policy.name
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("softDeleteOvertimePolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete policy" };
  }
}

// ===========================================================================
// 5. TiffinBillPolicy Actions
// ===========================================================================

export async function listTiffinBillPolicies() {
  try {
    await checkAuth();
    const policies = await prisma.tiffinBillPolicy.findMany({
      where: { isTrash: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, policies };
  } catch (error) {
    console.error("listTiffinBillPolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load policies", policies: [] };
  }
}

export async function createTiffinBillPolicy(data: {
  name: string;
  description?: string;
  isEligible?: boolean;
  allowAfterTime?: string | null;
  amount: number;
  countType?: string;
  maxCountPerDay: number;
  status?: string;
}) {
  try {
    const session = await checkAuth();
    const creatorId = session.user.id;

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Name is required" };
    }

    if (data.amount < 0) {
      return { success: false, error: "Tiffin bill amount cannot be negative" };
    }

    if (data.maxCountPerDay <= 0) {
      return { success: false, error: "Maximum count per day must be greater than 0" };
    }

    if (data.isEligible && data.allowAfterTime) {
      if (!isValidTimeFormat(data.allowAfterTime)) {
        return { success: false, error: "Allow After Time must be in HH:mm format (e.g. 20:00)" };
      }
    }

    const policy = await prisma.tiffinBillPolicy.create({
      data: {
        name: data.name,
        description: data.description || null,
        isEligible: !!data.isEligible,
        allowAfterTime: data.allowAfterTime || null,
        amount: new Prisma.Decimal(data.amount),
        countType: data.countType || "DAILY",
        maxCountPerDay: Math.round(data.maxCountPerDay),
        status: data.status || "active",
        createdBy: creatorId,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("createTiffinBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create policy" };
  }
}

export async function updateTiffinBillPolicy(
  id: string,
  data: {
    name?: string;
    description?: string;
    isEligible?: boolean;
    allowAfterTime?: string | null;
    amount: number;
    countType?: string;
    maxCountPerDay: number;
    status?: string;
  }
) {
  try {
    await checkAuth();

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      return { success: false, error: "Name is required" };
    }

    if (data.amount < 0) {
      return { success: false, error: "Tiffin bill amount cannot be negative" };
    }

    if (data.maxCountPerDay <= 0) {
      return { success: false, error: "Maximum count per day must be greater than 0" };
    }

    const isElig = data.isEligible !== undefined ? data.isEligible : false;
    if (isElig && data.allowAfterTime) {
      if (!isValidTimeFormat(data.allowAfterTime)) {
        return { success: false, error: "Allow After Time must be in HH:mm format (e.g. 20:00)" };
      }
    }

    const policy = await prisma.tiffinBillPolicy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        isEligible: data.isEligible,
        allowAfterTime: data.allowAfterTime,
        amount: new Prisma.Decimal(data.amount),
        countType: data.countType,
        maxCountPerDay: Math.round(data.maxCountPerDay),
        status: data.status,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("updateTiffinBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update policy" };
  }
}

export async function softDeleteTiffinBillPolicy(id: string) {
  try {
    await checkAuth();

    // Check if employee types are using it
    const mappingCount = await prisma.employeeType.count({
      where: { tiffinBillPolicyId: id, isTrash: false },
    });
    if (mappingCount > 0) {
      return { success: false, error: `Cannot delete: this policy is currently assigned to ${mappingCount} employee types.` };
    }

    await prisma.tiffinBillPolicy.update({
      where: { id },
      data: { isTrash: true, status: "inactive" },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("softDeleteTiffinBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete policy" };
  }
}

// ===========================================================================
// 6. NightBillPolicy Actions
// ===========================================================================

export async function listNightBillPolicies() {
  try {
    await checkAuth();
    const policies = await prisma.nightBillPolicy.findMany({
      where: { isTrash: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, policies };
  } catch (error) {
    console.error("listNightBillPolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load policies", policies: [] };
  }
}

export async function createNightBillPolicy(data: {
  name: string;
  description?: string;
  isEligible?: boolean;
  allowAfterTime?: string | null;
  amount: number;
  countType?: string;
  supportsOvernightCheckout?: boolean;
  maxCountPerDay: number;
  status?: string;
}) {
  try {
    const session = await checkAuth();
    const creatorId = session.user.id;

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Name is required" };
    }

    if (data.amount < 0) {
      return { success: false, error: "Night bill amount cannot be negative" };
    }

    if (data.maxCountPerDay <= 0) {
      return { success: false, error: "Maximum count per day must be greater than 0" };
    }

    if (data.isEligible && data.allowAfterTime) {
      if (!isValidTimeFormat(data.allowAfterTime)) {
        return { success: false, error: "Allow After Time must be in HH:mm format (e.g. 23:55)" };
      }
    }

    const policy = await prisma.nightBillPolicy.create({
      data: {
        name: data.name,
        description: data.description || null,
        isEligible: !!data.isEligible,
        allowAfterTime: data.allowAfterTime || null,
        amount: new Prisma.Decimal(data.amount),
        countType: data.countType || "DAILY",
        supportsOvernightCheckout: data.supportsOvernightCheckout !== undefined ? data.supportsOvernightCheckout : true,
        maxCountPerDay: Math.round(data.maxCountPerDay),
        status: data.status || "active",
        createdBy: creatorId,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("createNightBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create policy" };
  }
}

export async function updateNightBillPolicy(
  id: string,
  data: {
    name?: string;
    description?: string;
    isEligible?: boolean;
    allowAfterTime?: string | null;
    amount: number;
    countType?: string;
    supportsOvernightCheckout?: boolean;
    maxCountPerDay: number;
    status?: string;
  }
) {
  try {
    await checkAuth();

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      return { success: false, error: "Name is required" };
    }

    if (data.amount < 0) {
      return { success: false, error: "Night bill amount cannot be negative" };
    }

    if (data.maxCountPerDay <= 0) {
      return { success: false, error: "Maximum count per day must be greater than 0" };
    }

    const isElig = data.isEligible !== undefined ? data.isEligible : false;
    if (isElig && data.allowAfterTime) {
      if (!isValidTimeFormat(data.allowAfterTime)) {
        return { success: false, error: "Allow After Time must be in HH:mm format (e.g. 23:55)" };
      }
    }

    const policy = await prisma.nightBillPolicy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        isEligible: data.isEligible,
        allowAfterTime: data.allowAfterTime,
        amount: new Prisma.Decimal(data.amount),
        countType: data.countType,
        supportsOvernightCheckout: data.supportsOvernightCheckout,
        maxCountPerDay: Math.round(data.maxCountPerDay),
        status: data.status,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("updateNightBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update policy" };
  }
}

export async function softDeleteNightBillPolicy(id: string) {
  try {
    await checkAuth();

    // Check if employee types are using it
    const mappingCount = await prisma.employeeType.count({
      where: { nightBillPolicyId: id, isTrash: false },
    });
    if (mappingCount > 0) {
      return { success: false, error: `Cannot delete: this policy is currently assigned to ${mappingCount} employee types.` };
    }

    await prisma.nightBillPolicy.update({
      where: { id },
      data: { isTrash: true, status: "inactive" },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("softDeleteNightBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete policy" };
  }
}

// ===========================================================================
// 7. HolidayBillPolicy Actions
// ===========================================================================

export async function listHolidayBillPolicies() {
  try {
    await checkAuth();
    const policies = await prisma.holidayBillPolicy.findMany({
      where: { isTrash: false },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, policies };
  } catch (error) {
    console.error("listHolidayBillPolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load policies", policies: [] };
  }
}

export async function createHolidayBillPolicy(data: {
  name: string;
  description?: string;
  isEligible?: boolean;
  calculationType?: string;
  fixedAmount?: number | null;
  allowWithOT?: boolean;
  includeWeekend?: boolean;
  includePublicHoliday?: boolean;
  status?: string;
}) {
  try {
    const session = await checkAuth();
    const creatorId = session.user.id;

    if (!data.name || data.name.trim() === "") {
      return { success: false, error: "Name is required" };
    }

    const calculationType = data.calculationType || "ONE_DAY_GROSS";
    const allowedCalcTypes = ["ONE_DAY_GROSS", "FIXED_AMOUNT", "OT_BASED"];
    if (!allowedCalcTypes.includes(calculationType)) {
      return { success: false, error: "Invalid calculation type" };
    }

    if (calculationType === "FIXED_AMOUNT" && (data.fixedAmount === undefined || data.fixedAmount === null || data.fixedAmount < 0)) {
      return { success: false, error: "Fixed Amount must be provided and cannot be negative when calculation type is FIXED_AMOUNT" };
    }

    const policy = await prisma.holidayBillPolicy.create({
      data: {
        name: data.name,
        description: data.description || null,
        isEligible: !!data.isEligible,
        calculationType,
        fixedAmount: data.fixedAmount !== undefined && data.fixedAmount !== null ? new Prisma.Decimal(data.fixedAmount) : null,
        allowWithOT: !!data.allowWithOT,
        includeWeekend: data.includeWeekend !== undefined ? data.includeWeekend : true,
        includePublicHoliday: data.includePublicHoliday !== undefined ? data.includePublicHoliday : true,
        status: data.status || "active",
        createdBy: creatorId,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("createHolidayBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create policy" };
  }
}

export async function updateHolidayBillPolicy(
  id: string,
  data: {
    name?: string;
    description?: string;
    isEligible?: boolean;
    calculationType?: string;
    fixedAmount?: number | null;
    allowWithOT?: boolean;
    includeWeekend?: boolean;
    includePublicHoliday?: boolean;
    status?: string;
  }
) {
  try {
    await checkAuth();

    if (data.name !== undefined && (!data.name || data.name.trim() === "")) {
      return { success: false, error: "Name is required" };
    }

    if (data.calculationType !== undefined) {
      const allowedCalcTypes = ["ONE_DAY_GROSS", "FIXED_AMOUNT", "OT_BASED"];
      if (!allowedCalcTypes.includes(data.calculationType)) {
        return { success: false, error: "Invalid calculation type" };
      }
    }

    const calcType = data.calculationType || "ONE_DAY_GROSS";
    if (calcType === "FIXED_AMOUNT" && (data.fixedAmount === undefined || data.fixedAmount === null || data.fixedAmount < 0)) {
      return { success: false, error: "Fixed Amount must be provided and cannot be negative when calculation type is FIXED_AMOUNT" };
    }

    const policy = await prisma.holidayBillPolicy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        isEligible: data.isEligible,
        calculationType: data.calculationType,
        fixedAmount: data.fixedAmount !== undefined && data.fixedAmount !== null ? new Prisma.Decimal(data.fixedAmount) : null,
        allowWithOT: data.allowWithOT,
        includeWeekend: data.includeWeekend,
        includePublicHoliday: data.includePublicHoliday,
        status: data.status,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, policy };
  } catch (error) {
    console.error("updateHolidayBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update policy" };
  }
}

export async function softDeleteHolidayBillPolicy(id: string) {
  try {
    await checkAuth();

    // Check if employee types are using it
    const mappingCount = await prisma.employeeType.count({
      where: { holidayBillPolicyId: id, isTrash: false },
    });
    if (mappingCount > 0) {
      return { success: false, error: `Cannot delete: this policy is currently assigned to ${mappingCount} employee types.` };
    }

    await prisma.holidayBillPolicy.update({
      where: { id },
      data: { isTrash: true, status: "inactive" },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("softDeleteHolidayBillPolicy error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete policy" };
  }
}

// ===========================================================================
// 8. PayrollSetting Actions
// ===========================================================================

export async function listPayrollSettings() {
  try {
    await checkAuth();
    const settings = await prisma.payrollSetting.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, settings };
  } catch (error) {
    console.error("listPayrollSettings error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load settings", settings: [] };
  }
}

export async function updateDefaultPayrollSetting(
  id: string,
  data: {
    name?: string;
    defaultMonthlyWorkingDays: number;
    defaultPayDivisor: number;
    defaultCurrency: string;
    roundingMethod: string;
    allowNegativeNetSalary: boolean;
    payrollLockAfterApproval: boolean;
    recalculateLockedPayroll: boolean;
    status?: string;
  }
) {
  try {
    await checkAuth();

    if (data.defaultMonthlyWorkingDays <= 0) {
      return { success: false, error: "Default monthly working days must be greater than 0" };
    }

    if (data.defaultPayDivisor <= 0) {
      return { success: false, error: "Default pay divisor must be greater than 0" };
    }

    if (!data.defaultCurrency || data.defaultCurrency.trim() === "") {
      return { success: false, error: "Default currency is required" };
    }

    const allowedRounding = ["NONE", "NEAREST_INTEGER", "FLOOR", "CEIL"];
    if (data.roundingMethod && !allowedRounding.includes(data.roundingMethod)) {
      return { success: false, error: "Invalid rounding method" };
    }

    const settings = await prisma.payrollSetting.update({
      where: { id },
      data: {
        name: data.name,
        defaultMonthlyWorkingDays: Math.round(data.defaultMonthlyWorkingDays),
        defaultPayDivisor: Math.round(data.defaultPayDivisor),
        defaultCurrency: data.defaultCurrency,
        roundingMethod: data.roundingMethod,
        allowNegativeNetSalary: !!data.allowNegativeNetSalary,
        payrollLockAfterApproval: !!data.payrollLockAfterApproval,
        recalculateLockedPayroll: !!data.recalculateLockedPayroll,
        status: data.status,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, settings };
  } catch (error) {
    console.error("updateDefaultPayrollSetting error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update payroll setting" };
  }
}

// ===========================================================================
// 9. Employee Type Policy Mapping Actions
// ===========================================================================

export async function listEmployeeTypesWithPayrollPolicies() {
  try {
    await checkAuth();
    const employeeTypes = await prisma.employeeType.findMany({
      where: { isTrash: false },
      include: {
        attendancePolicy: true,
        latePolicy: true,
        overtimePolicy: true,
        tiffinBillPolicy: true,
        nightBillPolicy: true,
        holidayBillPolicy: true,
        salaryStructurePolicy: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, employeeTypes };
  } catch (error) {
    console.error("listEmployeeTypesWithPayrollPolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to load employee types", employeeTypes: [] };
  }
}

export async function updateEmployeeTypePayrollPolicies(
  employeeTypeId: string,
  policyIds: {
    attendancePolicyId?: string | null;
    latePolicyId?: string | null;
    overtimePolicyId?: string | null;
    tiffinBillPolicyId?: string | null;
    nightBillPolicyId?: string | null;
    holidayBillPolicyId?: string | null;
    salaryStructurePolicyId?: string | null;
  }
) {
  try {
    const session = await checkAuth();
    const userId = session.user.id;

    const employeeType = await prisma.employeeType.findUnique({
      where: { id: employeeTypeId, isTrash: false },
    });

    if (!employeeType) {
      return { success: false, error: "Employee Type not found" };
    }

    // Verify existing policies if provided
    if (policyIds.attendancePolicyId) {
      const exist = await prisma.attendancePolicy.findUnique({ where: { id: policyIds.attendancePolicyId } });
      if (!exist) return { success: false, error: "Selected Attendance Policy does not exist" };
    }
    if (policyIds.latePolicyId) {
      const exist = await prisma.latePolicy.findUnique({ where: { id: policyIds.latePolicyId } });
      if (!exist) return { success: false, error: "Selected Late Policy does not exist" };
    }
    if (policyIds.overtimePolicyId) {
      const exist = await prisma.overtimePolicy.findUnique({ where: { id: policyIds.overtimePolicyId } });
      if (!exist) return { success: false, error: "Selected Overtime Policy does not exist" };
    }
    if (policyIds.tiffinBillPolicyId) {
      const exist = await prisma.tiffinBillPolicy.findUnique({ where: { id: policyIds.tiffinBillPolicyId } });
      if (!exist) return { success: false, error: "Selected Tiffin Bill Policy does not exist" };
    }
    if (policyIds.nightBillPolicyId) {
      const exist = await prisma.nightBillPolicy.findUnique({ where: { id: policyIds.nightBillPolicyId } });
      if (!exist) return { success: false, error: "Selected Night Bill Policy does not exist" };
    }
    if (policyIds.holidayBillPolicyId) {
      const exist = await prisma.holidayBillPolicy.findUnique({ where: { id: policyIds.holidayBillPolicyId } });
      if (!exist) return { success: false, error: "Selected Holiday Bill Policy does not exist" };
    }
    if (policyIds.salaryStructurePolicyId) {
      const exist = await prisma.salaryStructurePolicy.findUnique({ where: { id: policyIds.salaryStructurePolicyId } });
      if (!exist) return { success: false, error: "Selected Salary Structure Policy does not exist" };
    }

    const updated = await prisma.employeeType.update({
      where: { id: employeeTypeId },
      data: {
        attendancePolicyId: policyIds.attendancePolicyId !== undefined ? policyIds.attendancePolicyId : undefined,
        latePolicyId: policyIds.latePolicyId !== undefined ? policyIds.latePolicyId : undefined,
        overtimePolicyId: policyIds.overtimePolicyId !== undefined ? policyIds.overtimePolicyId : undefined,
        tiffinBillPolicyId: policyIds.tiffinBillPolicyId !== undefined ? policyIds.tiffinBillPolicyId : undefined,
        nightBillPolicyId: policyIds.nightBillPolicyId !== undefined ? policyIds.nightBillPolicyId : undefined,
        holidayBillPolicyId: policyIds.holidayBillPolicyId !== undefined ? policyIds.holidayBillPolicyId : undefined,
        salaryStructurePolicyId: policyIds.salaryStructurePolicyId !== undefined ? policyIds.salaryStructurePolicyId : undefined,
      },
    });

    await logItemUpdated(
      userId,
      "EmployeeTypePolicyMapping",
      employeeTypeId,
      Object.keys(policyIds).filter(key => (policyIds as any)[key] !== undefined),
      `Mapped policies to Employee Type: ${employeeType.name}`
    );

    revalidatePath("/dashboard/settings");
    return { success: true, employeeType: updated };
  } catch (error) {
    console.error("updateEmployeeTypePayrollPolicies error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to map policies to employee type" };
  }
}

export async function previewEmployeePayrollPolicyCalculation(input: {
  employeeId: string;
  checkIn?: string | null;
  checkOut?: string | null;
  otMinutes?: number;
  otHours?: number;
  lateCountInPeriod?: number;
  isWeekend?: boolean;
  isPublicHoliday?: boolean;
  workedOnHoliday?: boolean;
  otherAllowance?: number;
  deductions?: number;
}) {
  try {
    await checkAuth();

    if (!input.employeeId) {
      return { success: false, error: "Employee ID is required" };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        employeeType: {
          include: {
            salaryStructurePolicy: true,
            attendancePolicy: true,
            latePolicy: true,
            overtimePolicy: true,
            tiffinBillPolicy: true,
            nightBillPolicy: true,
            holidayBillPolicy: true,
          },
        },
        shift: true,
      },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    const employeeTypePolicies = {
      name: employee.employeeType?.name || "No Mapped Employee Type",
      salaryStructurePolicy: employee.employeeType?.salaryStructurePolicy || null,
      attendancePolicy: employee.employeeType?.attendancePolicy || null,
      latePolicy: employee.employeeType?.latePolicy || null,
      overtimePolicy: employee.employeeType?.overtimePolicy || null,
      tiffinBillPolicy: employee.employeeType?.tiffinBillPolicy || null,
      nightBillPolicy: employee.employeeType?.nightBillPolicy || null,
      holidayBillPolicy: employee.employeeType?.holidayBillPolicy || null,
    };

    const grossSalary = employee.salary ? Number(employee.salary) : 0;

    const calculationResult = calculatePayrollPolicyPreview({
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
      },
      employeeTypePolicies,
      shift: employee.shift
        ? {
            startTime: employee.shift.startTime,
            endTime: employee.shift.endTime,
          }
        : null,
      grossSalary,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      otMinutes: input.otMinutes,
      otHours: input.otHours,
      lateCountInPeriod: input.lateCountInPeriod,
      isWeekend: input.isWeekend,
      isPublicHoliday: input.isPublicHoliday,
      workedOnHoliday: input.workedOnHoliday,
      otherAllowance: input.otherAllowance,
      deductions: input.deductions,
    });

    return {
      success: true,
      employeeInfo: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        employeeTypeName: employeeTypePolicies.name,
        shiftName: employee.shift?.name || null,
        shiftStart: employee.shift?.startTime || null,
        shiftEnd: employee.shift?.endTime || null,
        grossSalary,
        assignedPolicies: {
          salaryStructure: employee.employeeType?.salaryStructurePolicy?.name || "Default (Gross split)",
          attendance: employee.employeeType?.attendancePolicy?.name || "None",
          late: employee.employeeType?.latePolicy?.name || "None",
          overtime: employee.employeeType?.overtimePolicy?.name || "None",
          tiffin: employee.employeeType?.tiffinBillPolicy?.name || "None",
          night: employee.employeeType?.nightBillPolicy?.name || "None",
          holiday: employee.employeeType?.holidayBillPolicy?.name || "None",
        },
      },
      preview: calculationResult,
    };
  } catch (error) {
    console.error("previewEmployeePayrollPolicyCalculation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to run policy calculation preview",
    };
  }
}

export async function listEmployeesForPreview() {
  try {
    await checkAuth();
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        salary: true,
        employeeType: {
          select: {
            id: true,
            name: true,
          }
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          }
        },
      },
      orderBy: { name: "asc" },
    });
    const serialized = employees.map(emp => ({
      ...emp,
      salary: emp.salary ? Number(emp.salary) : 0,
    }));
    return { success: true, employees: serialized };
  } catch (error) {
    console.error("listEmployeesForPreview error:", error);
    return { success: false, error: "Failed to load employees", employees: [] };
  }
}

export async function reprocessAttendancePolicyCalculations(input: {
  fromDate: string;
  toDate: string;
  employeeId?: string | null;
  force?: boolean;
}) {
  try {
    const session = await checkAuth();

    if (!input.fromDate || !input.toDate) {
      return { success: false, error: "From Date and To Date are required" };
    }

    const summary = await reprocessAttendancePoliciesForDateRange({
      fromDate: input.fromDate,
      toDate: input.toDate,
      employeeId: input.employeeId || undefined,
      force: !!input.force,
    });

    await logItemUpdated(
      session.user.id,
      "AttendancePolicy",
      input.employeeId || "ALL_EMPLOYEES",
      [`fromDate:${input.fromDate}`, `toDate:${input.toDate}`, `force:${!!input.force}`, `processed:${summary.processed}`],
      "Attendance policy calculations reprocessed"
    );

    return { success: true, summary };
  } catch (error) {
    console.error("reprocessAttendancePolicyCalculations error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reprocess attendance policies",
    };
  }
}
