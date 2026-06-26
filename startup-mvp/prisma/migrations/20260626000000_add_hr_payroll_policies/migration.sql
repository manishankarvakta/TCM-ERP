-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "employeeTypeId" TEXT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "calculatedOvertimeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "holidayBillAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateCountValue" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateDeductionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nightBillAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "policyCalculationNote" TEXT,
ADD COLUMN     "tiffinBillAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PayrollItem" ADD COLUMN     "holidayAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "nightAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tiffinAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EmployeeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attendancePolicyId" TEXT,
    "latePolicyId" TEXT,
    "overtimePolicyId" TEXT,
    "tiffinBillPolicyId" TEXT,
    "nightBillPolicyId" TEXT,
    "holidayBillPolicyId" TEXT,
    "salaryStructurePolicyId" TEXT,

    CONSTRAINT "EmployeeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructurePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "basedOn" TEXT NOT NULL DEFAULT 'GROSS',
    "basicPercent" DECIMAL(5,2) NOT NULL DEFAULT 55.00,
    "houseRentPercent" DECIMAL(5,2) NOT NULL DEFAULT 26.00,
    "medicalPercent" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "transportPercent" DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    "foodPercent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryStructurePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isEligibleForAttendanceBonus" BOOLEAN NOT NULL DEFAULT false,
    "bonusCalculationType" TEXT NOT NULL DEFAULT 'NONE',
    "attendanceBonusAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "applyAbsentPenalty" BOOLEAN NOT NULL DEFAULT true,
    "applyLatePenalty" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LatePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "resetLateEveryMonth" BOOLEAN NOT NULL DEFAULT true,
    "lateCountPeriod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "enableLateToAbsentConversion" BOOLEAN NOT NULL DEFAULT false,
    "lateDaysForOneAbsent" INTEGER NOT NULL DEFAULT 3,
    "lateCountForBonusLoss" INTEGER NOT NULL DEFAULT 3,
    "deductSalaryForLate" BOOLEAN NOT NULL DEFAULT false,
    "deductAttendanceBonusForLate" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LatePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "calculationType" TEXT NOT NULL DEFAULT 'FORMULA',
    "basicPercentageFromGross" DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    "monthlyWorkingDays" INTEGER NOT NULL DEFAULT 30,
    "hourBasis" TEXT NOT NULL DEFAULT 'ASSIGNED_SHIFT_HOUR',
    "fixedHourValue" DECIMAL(5,2),
    "multiplier" DECIMAL(3,2) NOT NULL DEFAULT 2.00,
    "fixedOTRate" DECIMAL(10,2),
    "minimumOTMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiffinBillPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "allowAfterTime" TEXT,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "countType" TEXT NOT NULL DEFAULT 'DAILY',
    "maxCountPerDay" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TiffinBillPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NightBillPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "allowAfterTime" TEXT,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "countType" TEXT NOT NULL DEFAULT 'DAILY',
    "supportsOvernightCheckout" BOOLEAN NOT NULL DEFAULT true,
    "maxCountPerDay" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NightBillPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayBillPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "calculationType" TEXT NOT NULL DEFAULT 'ONE_DAY_GROSS',
    "fixedAmount" DECIMAL(10,2),
    "allowWithOT" BOOLEAN NOT NULL DEFAULT false,
    "includeWeekend" BOOLEAN NOT NULL DEFAULT true,
    "includePublicHoliday" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayBillPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSetting" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMonthlyWorkingDays" INTEGER NOT NULL DEFAULT 30,
    "defaultPayDivisor" INTEGER NOT NULL DEFAULT 30,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'BDT',
    "roundingMethod" TEXT NOT NULL DEFAULT 'NONE',
    "allowNegativeNetSalary" BOOLEAN NOT NULL DEFAULT false,
    "payrollLockAfterApproval" BOOLEAN NOT NULL DEFAULT true,
    "recalculateLockedPayroll" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeType_attendancePolicyId_idx" ON "EmployeeType"("attendancePolicyId");

-- CreateIndex
CREATE INDEX "EmployeeType_latePolicyId_idx" ON "EmployeeType"("latePolicyId");

-- CreateIndex
CREATE INDEX "EmployeeType_overtimePolicyId_idx" ON "EmployeeType"("overtimePolicyId");

-- CreateIndex
CREATE INDEX "EmployeeType_tiffinBillPolicyId_idx" ON "EmployeeType"("tiffinBillPolicyId");

-- CreateIndex
CREATE INDEX "EmployeeType_nightBillPolicyId_idx" ON "EmployeeType"("nightBillPolicyId");

-- CreateIndex
CREATE INDEX "EmployeeType_holidayBillPolicyId_idx" ON "EmployeeType"("holidayBillPolicyId");

-- CreateIndex
CREATE INDEX "EmployeeType_salaryStructurePolicyId_idx" ON "EmployeeType"("salaryStructurePolicyId");

-- CreateIndex
CREATE INDEX "SalaryStructurePolicy_status_idx" ON "SalaryStructurePolicy"("status");

-- CreateIndex
CREATE INDEX "SalaryStructurePolicy_isTrash_idx" ON "SalaryStructurePolicy"("isTrash");

-- CreateIndex
CREATE INDEX "SalaryStructurePolicy_createdBy_idx" ON "SalaryStructurePolicy"("createdBy");

-- CreateIndex
CREATE INDEX "AttendancePolicy_status_idx" ON "AttendancePolicy"("status");

-- CreateIndex
CREATE INDEX "AttendancePolicy_isTrash_idx" ON "AttendancePolicy"("isTrash");

-- CreateIndex
CREATE INDEX "AttendancePolicy_createdBy_idx" ON "AttendancePolicy"("createdBy");

-- CreateIndex
CREATE INDEX "LatePolicy_status_idx" ON "LatePolicy"("status");

-- CreateIndex
CREATE INDEX "LatePolicy_isTrash_idx" ON "LatePolicy"("isTrash");

-- CreateIndex
CREATE INDEX "LatePolicy_createdBy_idx" ON "LatePolicy"("createdBy");

-- CreateIndex
CREATE INDEX "OvertimePolicy_status_idx" ON "OvertimePolicy"("status");

-- CreateIndex
CREATE INDEX "OvertimePolicy_isTrash_idx" ON "OvertimePolicy"("isTrash");

-- CreateIndex
CREATE INDEX "OvertimePolicy_createdBy_idx" ON "OvertimePolicy"("createdBy");

-- CreateIndex
CREATE INDEX "TiffinBillPolicy_status_idx" ON "TiffinBillPolicy"("status");

-- CreateIndex
CREATE INDEX "TiffinBillPolicy_isTrash_idx" ON "TiffinBillPolicy"("isTrash");

-- CreateIndex
CREATE INDEX "TiffinBillPolicy_createdBy_idx" ON "TiffinBillPolicy"("createdBy");

-- CreateIndex
CREATE INDEX "NightBillPolicy_status_idx" ON "NightBillPolicy"("status");

-- CreateIndex
CREATE INDEX "NightBillPolicy_isTrash_idx" ON "NightBillPolicy"("isTrash");

-- CreateIndex
CREATE INDEX "NightBillPolicy_createdBy_idx" ON "NightBillPolicy"("createdBy");

-- CreateIndex
CREATE INDEX "HolidayBillPolicy_status_idx" ON "HolidayBillPolicy"("status");

-- CreateIndex
CREATE INDEX "HolidayBillPolicy_isTrash_idx" ON "HolidayBillPolicy"("isTrash");

-- CreateIndex
CREATE INDEX "HolidayBillPolicy_createdBy_idx" ON "HolidayBillPolicy"("createdBy");

-- CreateIndex
CREATE INDEX "PayrollSetting_status_idx" ON "PayrollSetting"("status");

-- CreateIndex
CREATE INDEX "PayrollSetting_isDefault_idx" ON "PayrollSetting"("isDefault");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employeeTypeId_fkey" FOREIGN KEY ("employeeTypeId") REFERENCES "EmployeeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_attendancePolicyId_fkey" FOREIGN KEY ("attendancePolicyId") REFERENCES "AttendancePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_latePolicyId_fkey" FOREIGN KEY ("latePolicyId") REFERENCES "LatePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_overtimePolicyId_fkey" FOREIGN KEY ("overtimePolicyId") REFERENCES "OvertimePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_tiffinBillPolicyId_fkey" FOREIGN KEY ("tiffinBillPolicyId") REFERENCES "TiffinBillPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_nightBillPolicyId_fkey" FOREIGN KEY ("nightBillPolicyId") REFERENCES "NightBillPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_holidayBillPolicyId_fkey" FOREIGN KEY ("holidayBillPolicyId") REFERENCES "HolidayBillPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeType" ADD CONSTRAINT "EmployeeType_salaryStructurePolicyId_fkey" FOREIGN KEY ("salaryStructurePolicyId") REFERENCES "SalaryStructurePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructurePolicy" ADD CONSTRAINT "SalaryStructurePolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatePolicy" ADD CONSTRAINT "LatePolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimePolicy" ADD CONSTRAINT "OvertimePolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TiffinBillPolicy" ADD CONSTRAINT "TiffinBillPolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NightBillPolicy" ADD CONSTRAINT "NightBillPolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayBillPolicy" ADD CONSTRAINT "HolidayBillPolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
