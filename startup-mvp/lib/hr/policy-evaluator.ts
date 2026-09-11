import { prisma } from "@/lib/prisma";

export interface ResolvedPolicies {
  salaryStructure: {
    basicRatio: number;
    houseRentRatio: number;
    medicalRatio: number;
    transportRatio: number;
    foodRatio: number;
  };
  attendanceBonus: {
    bonusAmount: number;
    allowLate: boolean;
    maxLateDays: number;
  };
  late: {
    lateToAbsentRatio: number;
    deductFromSalary: boolean;
    forfeitBonusOnLate: boolean;
  };
  overtime: {
    isEligible: boolean;
    multiplier: number;
    minMinutes: number;
  };
  tiffinBill: {
    isEligible: boolean;
    cutoffTime: string;
    dailyAmount: number;
  };
  nightBill: {
    isEligible: boolean;
    dailyAmount: number;
  };
  holidayBill: {
    isEligible: boolean;
    dailyAmount: number;
    useDailyRate: number | boolean;
    allowWithOT: boolean;
  };
  settings: {
    workingDaysDivisor: number;
    currency: string;
    negativeNetPay: boolean;
  };
}

// Global Default Policy Fallbacks
export const DEFAULT_POLICIES: ResolvedPolicies = {
  salaryStructure: {
    basicRatio: 55,
    houseRentRatio: 26,
    medicalRatio: 5,
    transportRatio: 4,
    foodRatio: 10,
  },
  attendanceBonus: {
    bonusAmount: 0,
    allowLate: true,
    maxLateDays: 3,
  },
  late: {
    lateToAbsentRatio: 3,
    deductFromSalary: true,
    forfeitBonusOnLate: true,
  },
  overtime: {
    isEligible: true,
    multiplier: 1.5,
    minMinutes: 30,
  },
  tiffinBill: {
    isEligible: true,
    cutoffTime: "20:00",
    dailyAmount: 50,
  },
  nightBill: {
    isEligible: true,
    dailyAmount: 100,
  },
  holidayBill: {
    isEligible: true,
    dailyAmount: 0,
    useDailyRate: true,
    allowWithOT: true,
  },
  settings: {
    workingDaysDivisor: 30,
    currency: "BDT",
    negativeNetPay: false,
  },
};

/**
 * Resolve active policies for an employee by employeeTypeId or global settings
 */
export async function getEmployeePolicies(employeeTypeId?: string | null, organizationId?: string): Promise<ResolvedPolicies> {
  try {
    let settings = { ...DEFAULT_POLICIES.settings };
    if (organizationId) {
      const orgSettings = await prisma.payrollSetting.findUnique({
        where: { organizationId },
      });
      if (orgSettings) {
        settings = {
          workingDaysDivisor: orgSettings.workingDaysDivisor,
          currency: orgSettings.currency,
          negativeNetPay: orgSettings.negativeNetPay,
        };
      }
    }

    if (!employeeTypeId) {
      return { ...DEFAULT_POLICIES, settings };
    }

    const empType = await prisma.employeeType.findUnique({
      where: { id: employeeTypeId },
      include: {
        salaryStructurePolicy: true,
        attendancePolicy: true,
        latePolicy: true,
        overtimePolicy: true,
        tiffinBillPolicy: true,
        nightBillPolicy: true,
        holidayBillPolicy: true,
      },
    });

    if (!empType) {
      return { ...DEFAULT_POLICIES, settings };
    }

    return {
      salaryStructure: empType.salaryStructurePolicy ? {
        basicRatio: Number(empType.salaryStructurePolicy.basicRatio),
        houseRentRatio: Number(empType.salaryStructurePolicy.houseRentRatio),
        medicalRatio: Number(empType.salaryStructurePolicy.medicalRatio),
        transportRatio: Number(empType.salaryStructurePolicy.transportRatio),
        foodRatio: Number(empType.salaryStructurePolicy.foodRatio),
      } : DEFAULT_POLICIES.salaryStructure,

      attendanceBonus: empType.attendancePolicy ? {
        bonusAmount: Number(empType.attendancePolicy.bonusAmount),
        allowLate: empType.attendancePolicy.allowLate,
        maxLateDays: empType.attendancePolicy.maxLateDays,
      } : DEFAULT_POLICIES.attendanceBonus,

      late: empType.latePolicy ? {
        lateToAbsentRatio: empType.latePolicy.lateToAbsentRatio,
        deductFromSalary: empType.latePolicy.deductFromSalary,
        forfeitBonusOnLate: empType.latePolicy.forfeitBonusOnLate,
      } : DEFAULT_POLICIES.late,

      overtime: empType.overtimePolicy ? {
        isEligible: empType.overtimePolicy.isEligible,
        multiplier: Number(empType.overtimePolicy.multiplier),
        minMinutes: empType.overtimePolicy.minMinutes,
      } : DEFAULT_POLICIES.overtime,

      tiffinBill: empType.tiffinBillPolicy ? {
        isEligible: empType.tiffinBillPolicy.isEligible,
        cutoffTime: empType.tiffinBillPolicy.cutoffTime,
        dailyAmount: Number(empType.tiffinBillPolicy.dailyAmount),
      } : DEFAULT_POLICIES.tiffinBill,

      nightBill: empType.nightBillPolicy ? {
        isEligible: empType.nightBillPolicy.isEligible,
        dailyAmount: Number(empType.nightBillPolicy.dailyAmount),
      } : DEFAULT_POLICIES.nightBill,

      holidayBill: empType.holidayBillPolicy ? {
        isEligible: empType.holidayBillPolicy.isEligible,
        dailyAmount: Number(empType.holidayBillPolicy.dailyAmount),
        useDailyRate: empType.holidayBillPolicy.useDailyRate,
        allowWithOT: empType.holidayBillPolicy.allowWithOT,
      } : DEFAULT_POLICIES.holidayBill,

      settings,
    };
  } catch (error) {
    console.error("Error resolving employee policies:", error);
    return DEFAULT_POLICIES;
  }
}
