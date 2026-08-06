"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AccountType } from "@prisma/client";
import {
  FiAlertCircle,
  FiSave,
  FiInfo,
  FiPlus,
  FiTrash2,
  FiEdit,
  FiCheck,
} from "react-icons/fi";
import {
  Banknote,
  Calculator,
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Gift,
  Settings2,
  Building2,
  Shield,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  getPayrollSettingsAction,
  updatePayrollSettings,
} from "../_actions/payroll-settings.action";
import { getChartOfAccounts } from "../../accounts/chart-of-accounts/_actions/chart-of-accounts.action";
import {
  listSalaryStructurePolicies,
  createSalaryStructurePolicy,
  updateSalaryStructurePolicy,
  softDeleteSalaryStructurePolicy,
  setDefaultSalaryStructurePolicy,
  listAttendancePolicies,
  createAttendancePolicy,
  updateAttendancePolicy,
  softDeleteAttendancePolicy,
  listLatePolicies,
  createLatePolicy,
  updateLatePolicy,
  softDeleteLatePolicy,
  listOvertimePolicies,
  createOvertimePolicy,
  updateOvertimePolicy,
  softDeleteOvertimePolicy,
  listTiffinBillPolicies,
  createTiffinBillPolicy,
  updateTiffinBillPolicy,
  softDeleteTiffinBillPolicy,
  listNightBillPolicies,
  createNightBillPolicy,
  updateNightBillPolicy,
  softDeleteNightBillPolicy,
  listHolidayBillPolicies,
  createHolidayBillPolicy,
  updateHolidayBillPolicy,
  softDeleteHolidayBillPolicy,
  listPayrollSettings,
  updateDefaultPayrollSetting,
  listEmployeeTypesWithPayrollPolicies,
  updateEmployeeTypePayrollPolicies,
  previewEmployeePayrollPolicyCalculation,
  listEmployeesForPreview,
  reprocessAttendancePolicyCalculations,
} from "../_actions/payroll-policies.action";

// ---------------------------------------------------------------------------
// Zod Schema (client-side legacy form — mirrors server schema)
// ---------------------------------------------------------------------------

const formSchema = z.object({
  // Schedule
  payFrequency:        z.enum(["monthly", "biweekly", "weekly"]),
  payDayOfMonth:       z.number().int().min(1).max(31),
  attendanceCutoffDay: z.number().int().min(1).max(31),
  taxYearStartMonth:   z.number().int().min(1).max(12),
  // Calculation
  otMultiplier:            z.number().min(1).max(5),
  workingHoursPerDay:      z.number().min(1).max(24),
  dailyOtThresholdHours:   z.number().min(0).max(24),
  weekendOtMultiplier:     z.number().min(1).max(10),
  holidayOtMultiplier:     z.number().min(1).max(10),
  absentDeductionMode:     z.enum(["calendar", "working"]),
  absentDeductionBasis:    z.enum(["GROSS", "BASIC"]),
  standardWorkingDays:     z.number().int().min(20).max(31),
  defaultHouseRentPct:     z.number().min(0).max(100),
  defaultMedicalPct:       z.number().min(0).max(100),
  defaultTransportPct:     z.number().min(0).max(100),
  defaultFoodAllowancePct: z.number().min(0).max(100),
  taxCalculationMethod:    z.enum(["flat", "slab"]),
  employerPfPct:           z.number().min(0).max(100),
  defaultFestivalBonusPct: z.number().min(0).max(100),
  netPayRounding:          z.enum(["none", "nearest10", "nearest100"]),
  weekends:                z.array(z.number().int().min(0).max(6)),
  // Policy
  maxLoanMultiplier: z.number().min(0).max(100),
  maxActiveLoans:    z.number().int().min(0).max(50),
});

type FormData = z.infer<typeof formSchema>;

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Helper to convert any prisma decimal object or string safely to a number
function parseDecimal(val: any): number {
  if (val === null || val === undefined) return 0;
  return parseFloat(val.toString());
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PayrollSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", "payroll");
    params.set("tab", newTab);
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false });
  };

  const [loading, setLoading]       = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accounts, setAccounts]     = useState<Account[]>([]);
  const [isGlobal, setIsGlobal]     = useState(false);
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");

  // Lists state
  const [salaryStructurePolicies, setSalaryStructurePolicies] = useState<any[]>([]);
  const [attendancePolicies, setAttendancePolicies] = useState<any[]>([]);
  const [latePolicies, setLatePolicies] = useState<any[]>([]);
  const [overtimePolicies, setOvertimePolicies] = useState<any[]>([]);
  const [tiffinBillPolicies, setTiffinBillPolicies] = useState<any[]>([]);
  const [nightBillPolicies, setNightBillPolicies] = useState<any[]>([]);
  const [holidayBillPolicies, setHolidayBillPolicies] = useState<any[]>([]);
  const [policySettings, setPolicySettings] = useState<any[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);

  const [previewForm, setPreviewForm] = useState({
    employeeId: "",
    grossSalary: 0,
    checkIn: "",
    checkOut: "",
    otHours: 0,
    lateCountInPeriod: 0,
    isWeekend: false,
    isPublicHoliday: false,
    workedOnHoliday: false,
    otherAllowance: 0,
    deductions: 0,
  });

  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<any | null>(null);
  const [reprocessForm, setReprocessForm] = useState({
    fromDate: "",
    toDate: "",
    employeeId: "all",
    force: false,
  });

  const handleRunReprocess = async () => {
    if (!reprocessForm.fromDate || !reprocessForm.toDate) {
      setError("Please select both From and To dates");
      return;
    }
    setReprocessLoading(true);
    setReprocessResult(null);
    setError("");
    setSuccess("");
    try {
      const res = await reprocessAttendancePolicyCalculations({
        fromDate: reprocessForm.fromDate,
        toDate: reprocessForm.toDate,
        employeeId: reprocessForm.employeeId === "all" ? null : reprocessForm.employeeId,
        force: reprocessForm.force,
      });

      if (res.success && res.summary) {
        setReprocessResult(res.summary);
        setSuccess(`Reprocess complete! Processed ${res.summary.processed} records.`);
      } else {
        setError(res.error || "Failed to run reprocess");
      }
    } catch (e) {
      console.error(e);
      setError("An unexpected error occurred during reprocess");
    } finally {
      setReprocessLoading(false);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      
      const shiftStart = emp.shift?.startTime || "09:00";
      let shiftEnd = emp.shift?.endTime || "17:00";
      
      const checkInVal = `${yyyy}-${mm}-${dd}T${shiftStart}`;
      
      // If overnight, checkout is tomorrow
      let checkOutVal = `${yyyy}-${mm}-${dd}T${shiftEnd}`;
      if (shiftEnd <= shiftStart) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tyyyy = tomorrow.getFullYear();
        const tmm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const tdd = String(tomorrow.getDate()).padStart(2, '0');
        checkOutVal = `${tyyyy}-${tmm}-${tdd}T${shiftEnd}`;
      }

      setPreviewForm(prev => ({
        ...prev,
        employeeId: empId,
        grossSalary: emp.salary || 0,
        checkIn: checkInVal,
        checkOut: checkOutVal,
        otHours: 0,
        lateCountInPeriod: 0,
        isWeekend: false,
        isPublicHoliday: false,
        workedOnHoliday: false,
      }));
    } else {
      setPreviewForm(prev => ({
        ...prev,
        employeeId: empId,
        grossSalary: 0,
      }));
    }
  };

  const handleRunPreview = async () => {
    if (!previewForm.employeeId) {
      setError("Please select an employee first");
      return;
    }
    setPreviewLoading(true);
    setPreviewResult(null);
    setError("");
    setSuccess("");
    try {
      const checkInISO = previewForm.checkIn ? new Date(previewForm.checkIn).toISOString() : null;
      const checkOutISO = previewForm.checkOut ? new Date(previewForm.checkOut).toISOString() : null;
      
      const res = await previewEmployeePayrollPolicyCalculation({
        employeeId: previewForm.employeeId,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        otHours: Number(previewForm.otHours) || 0,
        lateCountInPeriod: Number(previewForm.lateCountInPeriod) || 0,
        isWeekend: previewForm.isWeekend,
        isPublicHoliday: previewForm.isPublicHoliday,
        workedOnHoliday: previewForm.workedOnHoliday,
        otherAllowance: Number(previewForm.otherAllowance) || 0,
        deductions: Number(previewForm.deductions) || 0,
      });

      if (res.success) {
        setPreviewResult(res);
        setSuccess("Dry-run preview calculated successfully!");
      } else {
        setError(res.error || "Failed to calculate preview");
      }
    } catch (e) {
      console.error(e);
      setError("An unexpected error occurred during preview calculation");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Employee type mapping selections state
  const [etMappings, setEtMappings] = useState<Record<string, {
    salaryStructurePolicyId: string | null;
    attendancePolicyId: string | null;
    latePolicyId: string | null;
    overtimePolicyId: string | null;
    tiffinBillPolicyId: string | null;
    nightBillPolicyId: string | null;
    holidayBillPolicyId: string | null;
  }>>({});

  // Dialog configurations & CRUD form state
  const [modalOpen, setModalOpen] = useState<Record<string, boolean>>({
    salary: false,
    attendance: false,
    late: false,
    overtime: false,
    tiffin: false,
    night: false,
    holiday: false,
  });

  const [activeEditId, setActiveEditId] = useState<Record<string, string | null>>({
    salary: null,
    attendance: null,
    late: null,
    overtime: null,
    tiffin: null,
    night: null,
    holiday: null,
  });

  // Policy Form States
  const [ssForm, setSsForm] = useState({
    name: "",
    description: "",
    isDefault: false,
    basicPercent: 55,
    houseRentPercent: 26,
    medicalPercent: 5,
    transportPercent: 4,
    foodPercent: 10,
    status: "active",
  });
  const [grossCalculatorInput, setGrossCalculatorInput] = useState(20000);

  const [attForm, setAttForm] = useState({
    name: "",
    description: "",
    isEnabled: true,
    isEligibleForAttendanceBonus: false,
    bonusCalculationType: "NONE",
    attendanceBonusAmount: 0,
    applyAbsentPenalty: true,
    applyLatePenalty: true,
    status: "active",
  });

  const [lateForm, setLateForm] = useState({
    name: "",
    description: "",
    isEnabled: true,
    resetLateEveryMonth: true,
    lateCountPeriod: "MONTHLY",
    enableLateToAbsentConversion: false,
    lateDaysForOneAbsent: 3,
    lateCountForBonusLoss: 3,
    deductSalaryForLate: false,
    deductAttendanceBonusForLate: true,
    status: "active",
  });

  const [otForm, setOtForm] = useState({
    name: "",
    description: "",
    isEligible: false,
    calculationType: "FORMULA",
    basicPercentageFromGross: 60,
    monthlyWorkingDays: 30,
    hourBasis: "ASSIGNED_SHIFT_HOUR",
    fixedHourValue: 8,
    multiplier: 2.0,
    fixedOTRate: 0,
    minimumOTMinutes: 0,
    status: "active",
  });

  const [tiffinForm, setTiffinForm] = useState({
    name: "",
    description: "",
    isEligible: false,
    allowAfterTime: "20:00",
    amount: 0,
    countType: "DAILY",
    maxCountPerDay: 1,
    status: "active",
  });

  const [nightForm, setNightForm] = useState({
    name: "",
    description: "",
    isEligible: false,
    allowAfterTime: "23:55",
    amount: 0,
    countType: "DAILY",
    supportsOvernightCheckout: true,
    maxCountPerDay: 1,
    status: "active",
  });

  const [holidayForm, setHolidayForm] = useState({
    name: "",
    description: "",
    isEligible: false,
    calculationType: "ONE_DAY_GROSS",
    fixedAmount: 0,
    allowWithOT: false,
    includeWeekend: true,
    includePublicHoliday: true,
    status: "active",
  });

  const [globalSettingsForm, setGlobalSettingsForm] = useState({
    id: "default-payroll-setting",
    name: "Default Payroll Setting",
    defaultMonthlyWorkingDays: 30,
    defaultPayDivisor: 30,
    defaultCurrency: "BDT",
    roundingMethod: "NONE",
    allowNegativeNetSalary: false,
    payrollLockAfterApproval: true,
    recalculateLockedPayroll: false,
    status: "active",
  });

  // Legacy React Hook Form
  const {
    control,
    handleSubmit,
    register,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payFrequency:        "monthly",
      payDayOfMonth:       25,
      attendanceCutoffDay: 24,
      taxYearStartMonth:   7,
      otMultiplier:            1.5,
      workingHoursPerDay:      8,
      dailyOtThresholdHours:   8,
      weekendOtMultiplier:     2.0,
      holidayOtMultiplier:     2.0,
      absentDeductionMode:     "calendar",
      absentDeductionBasis:    "BASIC",
      standardWorkingDays:     26,
      defaultHouseRentPct:     0,
      defaultMedicalPct:       0,
      defaultTransportPct:     0,
      defaultFoodAllowancePct: 0,
      taxCalculationMethod:    "flat",
      employerPfPct:           0,
      defaultFestivalBonusPct: 0,
      netPayRounding:          "none",
      weekends:                [0, 6],
      maxLoanMultiplier: 0,
      maxActiveLoans:    0,
    },
  });

  const absentMode          = watch("absentDeductionMode");
  const employerPfPct       = watch("employerPfPct");
  const payFrequency        = watch("payFrequency");

  const loadAllData = async () => {
    try {
      setLoadingData(true);
      const [
        accountsResult,
        settingsResult,
        ssPoliciesResult,
        attPoliciesResult,
        latePoliciesResult,
        otPoliciesResult,
        tiffinPoliciesResult,
        nightPoliciesResult,
        holidayPoliciesResult,
        policySettingsResult,
        empTypesResult,
        employeesResult
      ] = await Promise.all([
        getChartOfAccounts(1, 1000, "", "active"),
        getPayrollSettingsAction(),
        listSalaryStructurePolicies(),
        listAttendancePolicies(),
        listLatePolicies(),
        listOvertimePolicies(),
        listTiffinBillPolicies(),
        listNightBillPolicies(),
        listHolidayBillPolicies(),
        listPayrollSettings(),
        listEmployeeTypesWithPayrollPolicies(),
        listEmployeesForPreview()
      ]);

      if (accountsResult.success) {
        setAccounts(
          accountsResult.accounts.map((a) => ({
            id: a.id, code: a.code, name: a.name, type: a.type as AccountType,
          }))
        );
      }

      // Populate policy lists
      if (ssPoliciesResult.success) setSalaryStructurePolicies(ssPoliciesResult.policies || []);
      if (attPoliciesResult.success) setAttendancePolicies(attPoliciesResult.policies || []);
      if (latePoliciesResult.success) setLatePolicies(latePoliciesResult.policies || []);
      if (otPoliciesResult.success) setOvertimePolicies(otPoliciesResult.policies || []);
      if (tiffinPoliciesResult.success) setTiffinBillPolicies(tiffinPoliciesResult.policies || []);
      if (nightPoliciesResult.success) setNightBillPolicies(nightPoliciesResult.policies || []);
      if (holidayPoliciesResult.success) setHolidayBillPolicies(holidayPoliciesResult.policies || []);
      if (policySettingsResult.success) setPolicySettings(policySettingsResult.settings || []);
      if (empTypesResult.success) setEmployeeTypes(empTypesResult.employeeTypes || []);
      if (employeesResult.success) setEmployees(employeesResult.employees || []);

      // Legacy settings parsing
      if (settingsResult.success && settingsResult.settings) {
        const s = settingsResult.settings;
        setIsGlobal(settingsResult.isGlobal ?? false);
        reset({
          payFrequency:        s.schedule.payFrequency,
          payDayOfMonth:       s.schedule.payDayOfMonth,
          attendanceCutoffDay: s.schedule.attendanceCutoffDay,
          taxYearStartMonth:   s.schedule.taxYearStartMonth,
          otMultiplier:            s.calculation.otMultiplier,
          workingHoursPerDay:      s.calculation.workingHoursPerDay,
          dailyOtThresholdHours:   s.calculation.dailyOtThresholdHours,
          weekendOtMultiplier:     s.calculation.weekendOtMultiplier,
          holidayOtMultiplier:     s.calculation.holidayOtMultiplier,
          absentDeductionMode:     s.calculation.absentDeductionMode,
          absentDeductionBasis:    s.calculation.absentDeductionBasis || "BASIC",
          standardWorkingDays:     s.calculation.standardWorkingDays,
          defaultHouseRentPct:     s.calculation.defaultHouseRentPct,
          defaultMedicalPct:       s.calculation.defaultMedicalPct,
          defaultTransportPct:     s.calculation.defaultTransportPct,
          defaultFoodAllowancePct: s.calculation.defaultFoodAllowancePct,
          taxCalculationMethod:    s.calculation.taxCalculationMethod,
          employerPfPct:           s.calculation.employerPfPct,
          defaultFestivalBonusPct: s.calculation.defaultFestivalBonusPct,
          netPayRounding:          s.calculation.netPayRounding,
          weekends:                s.calculation.weekends || [0, 6],
          maxLoanMultiplier: s.policy.maxLoanMultiplier,
          maxActiveLoans:    s.policy.maxActiveLoans,
        });
      }

      // Populate new global settings form
      if (policySettingsResult.success && policySettingsResult.settings && policySettingsResult.settings.length > 0) {
        const s = policySettingsResult.settings[0];
        setGlobalSettingsForm({
          id: s.id,
          name: s.name,
          defaultMonthlyWorkingDays: s.defaultMonthlyWorkingDays,
          defaultPayDivisor: s.defaultPayDivisor,
          defaultCurrency: s.defaultCurrency,
          roundingMethod: s.roundingMethod,
          allowNegativeNetSalary: s.allowNegativeNetSalary,
          payrollLockAfterApproval: s.payrollLockAfterApproval,
          recalculateLockedPayroll: s.recalculateLockedPayroll,
          status: s.status,
        });
      }
    } catch (e) {
      setError("Failed to load dashboard data");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update employee type mapping selector states when type list refreshes
  useEffect(() => {
    const mappings: typeof etMappings = {};
    employeeTypes.forEach((et: any) => {
      mappings[et.id] = {
        salaryStructurePolicyId: et.salaryStructurePolicyId || null,
        attendancePolicyId: et.attendancePolicyId || null,
        latePolicyId: et.latePolicyId || null,
        overtimePolicyId: et.overtimePolicyId || null,
        tiffinBillPolicyId: et.tiffinBillPolicyId || null,
        nightBillPolicyId: et.nightBillPolicyId || null,
        holidayBillPolicyId: et.holidayBillPolicyId || null,
      };
    });
    setEtMappings(mappings);
  }, [employeeTypes]);

  // Legacy settings submit handler
  const onSubmitLegacy = async (data: FormData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const result = await updatePayrollSettings(
        {
          schedule: {
            payFrequency:        data.payFrequency,
            payDayOfMonth:       data.payDayOfMonth,
            attendanceCutoffDay: data.attendanceCutoffDay,
            taxYearStartMonth:   data.taxYearStartMonth,
          },
          calculation: {
            otMultiplier:            data.otMultiplier,
            workingHoursPerDay:      data.workingHoursPerDay,
            dailyOtThresholdHours:   data.dailyOtThresholdHours,
            weekendOtMultiplier:     data.weekendOtMultiplier,
            holidayOtMultiplier:     data.holidayOtMultiplier,
            absentDeductionMode:     data.absentDeductionMode,
            absentDeductionBasis:    data.absentDeductionBasis,
            standardWorkingDays:     data.standardWorkingDays,
            defaultHouseRentPct:     data.defaultHouseRentPct,
            defaultMedicalPct:       data.defaultMedicalPct,
            defaultTransportPct:     data.defaultTransportPct,
            defaultFoodAllowancePct: data.defaultFoodAllowancePct,
            taxCalculationMethod:    data.taxCalculationMethod,
            employerPfPct:           data.employerPfPct,
            defaultFestivalBonusPct: data.defaultFestivalBonusPct,
            netPayRounding:          data.netPayRounding,
            weekends:                data.weekends || [0, 6],
          },
          policy: {
            maxLoanMultiplier: data.maxLoanMultiplier,
            maxActiveLoans:    data.maxActiveLoans,
          },
        },
        isGlobal
      );

      if (!result.success) throw new Error(result.error ?? "Failed to save");
      setSuccess(result.isUpdate ? "Legacy settings updated!" : "Legacy settings saved!");
      setTimeout(() => setSuccess(""), 4000);
      loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  // Helper trigger modal closes and resets
  const triggerModal = (type: string, open: boolean, editData: any = null) => {
    setModalOpen((prev) => ({ ...prev, [type]: open }));
    setActiveEditId((prev) => ({ ...prev, [type]: editData ? editData.id : null }));

    if (open) {
      if (type === "salary") {
        setSsForm({
          name: editData ? editData.name : "",
          description: editData ? (editData.description || "") : "",
          isDefault: editData ? !!editData.isDefault : false,
          basicPercent: editData ? parseDecimal(editData.basicPercent) : 55,
          houseRentPercent: editData ? parseDecimal(editData.houseRentPercent) : 26,
          medicalPercent: editData ? parseDecimal(editData.medicalPercent) : 5,
          transportPercent: editData ? parseDecimal(editData.transportPercent) : 4,
          foodPercent: editData ? parseDecimal(editData.foodPercent) : 10,
          status: editData ? editData.status : "active",
        });
      } else if (type === "attendance") {
        setAttForm({
          name: editData ? editData.name : "",
          description: editData ? (editData.description || "") : "",
          isEnabled: editData ? !!editData.isEnabled : true,
          isEligibleForAttendanceBonus: editData ? !!editData.isEligibleForAttendanceBonus : false,
          bonusCalculationType: editData ? editData.bonusCalculationType : "NONE",
          attendanceBonusAmount: editData ? parseDecimal(editData.attendanceBonusAmount) : 0,
          applyAbsentPenalty: editData ? !!editData.applyAbsentPenalty : true,
          applyLatePenalty: editData ? !!editData.applyLatePenalty : true,
          status: editData ? editData.status : "active",
        });
      } else if (type === "late") {
        setLateForm({
          name: editData ? editData.name : "",
          description: editData ? (editData.description || "") : "",
          isEnabled: editData ? !!editData.isEnabled : true,
          resetLateEveryMonth: editData ? !!editData.resetLateEveryMonth : true,
          lateCountPeriod: editData ? editData.lateCountPeriod : "MONTHLY",
          enableLateToAbsentConversion: editData ? !!editData.enableLateToAbsentConversion : false,
          lateDaysForOneAbsent: editData ? editData.lateDaysForOneAbsent : 3,
          lateCountForBonusLoss: editData ? editData.lateCountForBonusLoss : 3,
          deductSalaryForLate: editData ? !!editData.deductSalaryForLate : false,
          deductAttendanceBonusForLate: editData ? !!editData.deductAttendanceBonusForLate : true,
          status: editData ? editData.status : "active",
        });
      } else if (type === "overtime") {
        setOtForm({
          name: editData ? editData.name : "",
          description: editData ? (editData.description || "") : "",
          isEligible: editData ? !!editData.isEligible : false,
          calculationType: editData ? editData.calculationType : "FORMULA",
          basicPercentageFromGross: editData ? parseDecimal(editData.basicPercentageFromGross) : 60,
          monthlyWorkingDays: editData ? editData.monthlyWorkingDays : 30,
          hourBasis: editData ? editData.hourBasis : "ASSIGNED_SHIFT_HOUR",
          fixedHourValue: editData ? (editData.fixedHourValue ? parseDecimal(editData.fixedHourValue) : 8) : 8,
          multiplier: editData ? parseDecimal(editData.multiplier) : 2.0,
          fixedOTRate: editData ? (editData.fixedOTRate ? parseDecimal(editData.fixedOTRate) : 0) : 0,
          minimumOTMinutes: editData ? editData.minimumOTMinutes : 0,
          status: editData ? editData.status : "active",
        });
      } else if (type === "tiffin") {
        setTiffinForm({
          name: editData ? editData.name : "",
          description: editData ? (editData.description || "") : "",
          isEligible: editData ? !!editData.isEligible : false,
          allowAfterTime: editData ? (editData.allowAfterTime || "20:00") : "20:00",
          amount: editData ? parseDecimal(editData.amount) : 0,
          countType: editData ? editData.countType : "DAILY",
          maxCountPerDay: editData ? editData.maxCountPerDay : 1,
          status: editData ? editData.status : "active",
        });
      } else if (type === "night") {
        setNightForm({
          name: editData ? editData.name : "",
          description: editData ? (editData.description || "") : "",
          isEligible: editData ? !!editData.isEligible : false,
          allowAfterTime: editData ? (editData.allowAfterTime || "23:55") : "23:55",
          amount: editData ? parseDecimal(editData.amount) : 0,
          countType: editData ? editData.countType : "DAILY",
          supportsOvernightCheckout: editData ? !!editData.supportsOvernightCheckout : true,
          maxCountPerDay: editData ? editData.maxCountPerDay : 1,
          status: editData ? editData.status : "active",
        });
      } else if (type === "holiday") {
        setHolidayForm({
          name: editData ? editData.name : "",
          description: editData ? (editData.description || "") : "",
          isEligible: editData ? !!editData.isEligible : false,
          calculationType: editData ? editData.calculationType : "ONE_DAY_GROSS",
          fixedAmount: editData ? (editData.fixedAmount ? parseDecimal(editData.fixedAmount) : 0) : 0,
          allowWithOT: editData ? !!editData.allowWithOT : false,
          includeWeekend: editData ? !!editData.includeWeekend : true,
          includePublicHoliday: editData ? !!editData.includePublicHoliday : true,
          status: editData ? editData.status : "active",
        });
      }
    }
  };

  // Helper trigger action success display and reload lists
  const handleActionSuccess = (msg: string, type: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
    triggerModal(type, false);
    loadAllData();
  };

  // ===========================================================================
  // Submit handlers for server actions
  // ===========================================================================

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const isEdit = !!activeEditId.salary;
      const res = isEdit
        ? await updateSalaryStructurePolicy(activeEditId.salary!, ssForm)
        : await createSalaryStructurePolicy(ssForm);

      if (res.success) {
        handleActionSuccess(isEdit ? "Salary structure updated!" : "Salary structure created!", "salary");
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const isEdit = !!activeEditId.attendance;
      const res = isEdit
        ? await updateAttendancePolicy(activeEditId.attendance!, attForm)
        : await createAttendancePolicy(attForm);

      if (res.success) {
        handleActionSuccess(isEdit ? "Attendance policy updated!" : "Attendance policy created!", "attendance");
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleLateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const isEdit = !!activeEditId.late;
      const res = isEdit
        ? await updateLatePolicy(activeEditId.late!, lateForm)
        : await createLatePolicy(lateForm);

      if (res.success) {
        handleActionSuccess(isEdit ? "Late policy updated!" : "Late policy created!", "late");
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleOTSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const isEdit = !!activeEditId.overtime;
      const res = isEdit
        ? await updateOvertimePolicy(activeEditId.overtime!, otForm)
        : await createOvertimePolicy(otForm);

      if (res.success) {
        handleActionSuccess(isEdit ? "Overtime policy updated!" : "Overtime policy created!", "overtime");
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleTiffinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const isEdit = !!activeEditId.tiffin;
      const res = isEdit
        ? await updateTiffinBillPolicy(activeEditId.tiffin!, tiffinForm)
        : await createTiffinBillPolicy(tiffinForm);

      if (res.success) {
        handleActionSuccess(isEdit ? "Tiffin bill policy updated!" : "Tiffin bill policy created!", "tiffin");
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleNightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const isEdit = !!activeEditId.night;
      const res = isEdit
        ? await updateNightBillPolicy(activeEditId.night!, nightForm)
        : await createNightBillPolicy(nightForm);

      if (res.success) {
        handleActionSuccess(isEdit ? "Night bill policy updated!" : "Night bill policy created!", "night");
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const isEdit = !!activeEditId.holiday;
      const res = isEdit
        ? await updateHolidayBillPolicy(activeEditId.holiday!, holidayForm)
        : await createHolidayBillPolicy(holidayForm);

      if (res.success) {
        handleActionSuccess(isEdit ? "Holiday bill policy updated!" : "Holiday bill policy created!", "holiday");
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleGlobalSettingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await updateDefaultPayrollSetting(globalSettingsForm.id, globalSettingsForm);
      if (res.success) {
        setSuccess("Global rules saved!");
        setTimeout(() => setSuccess(""), 4000);
        loadAllData();
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleMappingSave = async (etId: string) => {
    setError("");
    try {
      const mapping = etMappings[etId];
      if (!mapping) return;

      const res = await updateEmployeeTypePayrollPolicies(etId, mapping);
      if (res.success) {
        setSuccess("Mapping saved successfully!");
        setTimeout(() => setSuccess(""), 4000);
        loadAllData();
      } else {
        setError(res.error || "Action failed");
      }
    } catch (err) {
      setError("Failed to save mapping");
    }
  };

  const [deletePolicyTarget, setDeletePolicyTarget] = useState<{ type: string; id: string } | null>(null);

  const handleDeletePolicy = (type: string, id: string) => {
    setDeletePolicyTarget({ type, id });
  };

  const confirmDeletePolicy = async () => {
    if (!deletePolicyTarget) return;
    const { type, id } = deletePolicyTarget;
    setDeletePolicyTarget(null);
    setError("");
    try {
      let res;
      if (type === "salary") res = await softDeleteSalaryStructurePolicy(id);
      else if (type === "attendance") res = await softDeleteAttendancePolicy(id);
      else if (type === "late") res = await softDeleteLatePolicy(id);
      else if (type === "overtime") res = await softDeleteOvertimePolicy(id);
      else if (type === "tiffin") res = await softDeleteTiffinBillPolicy(id);
      else if (type === "night") res = await softDeleteNightBillPolicy(id);
      else if (type === "holiday") res = await softDeleteHolidayBillPolicy(id);

      if (res?.success) {
        setSuccess("Policy deleted successfully");
        setTimeout(() => setSuccess(""), 4000);
        loadAllData();
      } else {
        setError(res?.error || "Delete failed");
      }
    } catch (e) {
      setError("Delete failed");
    }
  };

  // Helper trigger set default structure
  const handleSetDefaultStructure = async (id: string) => {
    setError("");
    try {
      const res = await setDefaultSalaryStructurePolicy(id);
      if (res.success) {
        setSuccess("Default salary structure updated");
        setTimeout(() => setSuccess(""), 4000);
        loadAllData();
      } else {
        setError(res.error || "Action failed");
      }
    } catch (e) {
      setError("Action failed");
    }
  };

  const handleMappingChange = (etId: string, field: string, val: string | null) => {
    setEtMappings((prev) => ({
      ...prev,
      [etId]: {
        ...prev[etId],
        [field]: val === "none" ? null : val,
      },
    }));
  };

  if (loadingData) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  // Pre-calculate Salary Structure Form total sum
  const ssFormTotalPercent =
    ssForm.basicPercent +
    ssForm.houseRentPercent +
    ssForm.medicalPercent +
    ssForm.transportPercent +
    ssForm.foodPercent;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" />
          Payroll & HR Policy Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage dynamic policy templates (money, eligibility, allowance, and deductions) and map them to Employee Types.
        </p>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs rounded-md p-3 mt-3 flex items-start gap-2 max-w-2xl">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <span>
            <strong>Policy Notice:</strong> Policy changes affect future calculations. Existing approved/posted payrolls are not recalculated automatically.
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex flex-wrap bg-muted p-1 rounded-lg gap-1.5 mb-6 justify-start">
          <TabsTrigger value="overview" className="text-xs px-3 py-2 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="salary" className="text-xs px-3 py-2 flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Salary Structure</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs px-3 py-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Attendance</TabsTrigger>
          <TabsTrigger value="late" className="text-xs px-3 py-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Late</TabsTrigger>
          <TabsTrigger value="overtime" className="text-xs px-3 py-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Overtime</TabsTrigger>
          <TabsTrigger value="tiffin" className="text-xs px-3 py-2 flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Tiffin</TabsTrigger>
          <TabsTrigger value="night" className="text-xs px-3 py-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Night</TabsTrigger>
          <TabsTrigger value="holiday" className="text-xs px-3 py-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Holiday</TabsTrigger>
          <TabsTrigger value="mapping" className="text-xs px-3 py-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Mappings</TabsTrigger>
          <TabsTrigger value="global" className="text-xs px-3 py-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Global Rules</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs px-3 py-2 flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" /> Calculation Preview</TabsTrigger>
        </TabsList>

        {/* ================================================================
            TAB 1 — OVERVIEW
        ================================================================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Salary Structures</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{salaryStructurePolicies.length}</span>
                  <span className="text-xs text-primary font-medium">Templates Active</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance & Late Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{attendancePolicies.length + latePolicies.length}</span>
                  <span className="text-xs text-primary font-medium">Rules Defined</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Allowances (OT/Tiffin/Night)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{overtimePolicies.length + tiffinBillPolicies.length + nightBillPolicies.length}</span>
                  <span className="text-xs text-primary font-medium">Add-ons Available</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Employee Types Mapped</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{employeeTypes.length}</span>
                  <span className="text-xs text-primary font-medium">Dynamic Classes</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Active Policy Map Overview
              </CardTitle>
              <CardDescription>
                Summary of active policy assignments for dynamic Employee Types.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Type</TableHead>
                      <TableHead>Salary structure</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Late Deduction</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Tiffin & Night</TableHead>
                      <TableHead>Holiday</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No employee types found. Setup employee types in Settings.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeeTypes.map((et: any) => (
                        <TableRow key={et.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-medium">
                            {et.name}
                            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{et.description || "No description"}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={et.salaryStructurePolicy ? "default" : "outline"} className="text-[10px]">
                              {et.salaryStructurePolicy?.name || "Inherited Default"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={et.attendancePolicy ? "secondary" : "outline"} className="text-[10px]">
                              {et.attendancePolicy?.name || "Inherited Default"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={et.latePolicy ? "secondary" : "outline"} className="text-[10px]">
                              {et.latePolicy?.name || "Inherited Default"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={et.overtimePolicy ? "secondary" : "outline"} className="text-[10px]">
                              {et.overtimePolicy?.name || "No OT"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-muted-foreground">Tiffin: {et.tiffinBillPolicy?.name || "None"}</span>
                              <span className="text-[10px] text-muted-foreground">Night: {et.nightBillPolicy?.name || "None"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={et.holidayBillPolicy ? "secondary" : "outline"} className="text-[10px]">
                              {et.holidayBillPolicy?.name || "No Holiday Pay"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================
            TAB 2 — SALARY STRUCTURE
        ================================================================ */}
        <TabsContent value="salary" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Salary Structure Templates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Define percentage breakdowns of Gross salary into basic, housing, medical, food, and transport.</p>
            </div>
            <Button size="sm" onClick={() => triggerModal("salary", true)} className="flex items-center gap-1.5">
              <FiPlus /> Add Template
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Basic</TableHead>
                      <TableHead>House Rent</TableHead>
                      <TableHead>Medical</TableHead>
                      <TableHead>Transport</TableHead>
                      <TableHead>Food</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryStructurePolicies.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            {p.name}
                            {p.isDefault && <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">Default</Badge>}
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{p.description}</p>}
                        </TableCell>
                        <TableCell>{parseDecimal(p.basicPercent)}%</TableCell>
                        <TableCell>{parseDecimal(p.houseRentPercent)}%</TableCell>
                        <TableCell>{parseDecimal(p.medicalPercent)}%</TableCell>
                        <TableCell>{parseDecimal(p.transportPercent)}%</TableCell>
                        <TableCell>{parseDecimal(p.foodPercent)}%</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <div className="flex items-center justify-end gap-1">
                            {!p.isDefault && (
                              <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => handleSetDefaultStructure(p.id)}>
                                Set Default
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => triggerModal("salary", true, p)}>
                              <FiEdit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0" onClick={() => handleDeletePolicy("salary", p.id)}>
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Salary Structure Dialog */}
          <Dialog open={modalOpen.salary} onOpenChange={(open) => triggerModal("salary", open)}>
            <DialogContent className="max-w-xl">
              <form onSubmit={handleSalarySubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{activeEditId.salary ? "Edit Salary Structure" : "New Salary Structure"}</DialogTitle>
                  <DialogDescription>Percentages must sum to exactly 100%.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Template Name *</Label>
                    <Input value={ssForm.name} onChange={(e) => setSsForm({ ...ssForm, name: e.target.value })} placeholder="e.g. Workers Gross Breakdown" required />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description</Label>
                    <Input value={ssForm.description} onChange={(e) => setSsForm({ ...ssForm, description: e.target.value })} placeholder="Policy notes..." />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Basic Salary (%)</Label>
                    <Input type="number" min="0" max="100" value={ssForm.basicPercent} onChange={(e) => setSsForm({ ...ssForm, basicPercent: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>House Rent (%)</Label>
                    <Input type="number" min="0" max="100" value={ssForm.houseRentPercent} onChange={(e) => setSsForm({ ...ssForm, houseRentPercent: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Medical (%)</Label>
                    <Input type="number" min="0" max="100" value={ssForm.medicalPercent} onChange={(e) => setSsForm({ ...ssForm, medicalPercent: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Transport (%)</Label>
                    <Input type="number" min="0" max="100" value={ssForm.transportPercent} onChange={(e) => setSsForm({ ...ssForm, transportPercent: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Food Allowance (%)</Label>
                    <Input type="number" min="0" max="100" value={ssForm.foodPercent} onChange={(e) => setSsForm({ ...ssForm, foodPercent: parseFloat(e.target.value) || 0 })} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={ssForm.status} onValueChange={(val) => setSsForm({ ...ssForm, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 md:col-span-2 pt-2">
                    <Switch checked={ssForm.isDefault} onCheckedChange={(checked) => setSsForm({ ...ssForm, isDefault: checked })} />
                    <Label>Set as Default Structure</Label>
                  </div>
                </div>

                <div className="border p-4 rounded-lg bg-muted/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Percentage Total:</span>
                    <span className={`text-sm font-bold ${Math.abs(ssFormTotalPercent - 100) < 0.01 ? "text-green-600" : "text-destructive"}`}>
                      {ssFormTotalPercent}%
                    </span>
                  </div>
                  {Math.abs(ssFormTotalPercent - 100) > 0.01 && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                      <FiAlertCircle /> Percentages must sum to exactly 100% to save.
                    </div>
                  )}

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Sample Gross Salary (BDT)</Label>
                      <Input type="number" className="w-28 h-7 text-xs" value={grossCalculatorInput} onChange={(e) => setGrossCalculatorInput(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] text-muted-foreground pt-1">
                      <div>Basic: <strong>{((grossCalculatorInput * ssForm.basicPercent) / 100).toFixed(2)}</strong></div>
                      <div>House Rent: <strong>{((grossCalculatorInput * ssForm.houseRentPercent) / 100).toFixed(2)}</strong></div>
                      <div>Medical: <strong>{((grossCalculatorInput * ssForm.medicalPercent) / 100).toFixed(2)}</strong></div>
                      <div>Transport: <strong>{((grossCalculatorInput * ssForm.transportPercent) / 100).toFixed(2)}</strong></div>
                      <div>Food: <strong>{((grossCalculatorInput * ssForm.foodPercent) / 100).toFixed(2)}</strong></div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => triggerModal("salary", false)}>Cancel</Button>
                  <Button type="submit" disabled={Math.abs(ssFormTotalPercent - 100) > 0.01}>Save Template</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            TAB 3 — ATTENDANCE POLICY
        ================================================================ */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Attendance Policies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Control employee attendance bonus eligibility and absence/late penalty triggers.</p>
            </div>
            <Button size="sm" onClick={() => triggerModal("attendance", true)} className="flex items-center gap-1.5">
              <FiPlus /> Add Policy
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Bonus Eligible</TableHead>
                    <TableHead>Bonus Calculation</TableHead>
                    <TableHead>Bonus Amount</TableHead>
                    <TableHead>Absent Penalty</TableHead>
                    <TableHead>Late Penalty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendancePolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">
                        {p.name}
                        {p.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{p.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isEligibleForAttendanceBonus ? "default" : "secondary"}>
                          {p.isEligibleForAttendanceBonus ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{p.bonusCalculationType.toLowerCase().replace("_", " ")}</TableCell>
                      <TableCell>{parseDecimal(p.attendanceBonusAmount)} BDT</TableCell>
                      <TableCell>
                        <Badge variant={p.applyAbsentPenalty ? "destructive" : "secondary"}>
                          {p.applyAbsentPenalty ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.applyLatePenalty ? "destructive" : "secondary"}>
                          {p.applyLatePenalty ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => triggerModal("attendance", true, p)}>
                          <FiEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => handleDeletePolicy("attendance", p.id)}>
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={modalOpen.attendance} onOpenChange={(open) => triggerModal("attendance", open)}>
            <DialogContent className="max-w-lg">
              <form onSubmit={handleAttendanceSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{activeEditId.attendance ? "Edit Attendance Policy" : "New Attendance Policy"}</DialogTitle>
                  <DialogDescription>
                    Configure rules for perfect attendance rewards and penalties.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Policy Name *</Label>
                    <Input value={attForm.name} onChange={(e) => setAttForm({ ...attForm, name: e.target.value })} placeholder="e.g. Standard Worker Attendance" required />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description</Label>
                    <Input value={attForm.description} onChange={(e) => setAttForm({ ...attForm, description: e.target.value })} placeholder="e.g. Applies penalty for late check-in" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={attForm.isEnabled} onCheckedChange={(checked) => setAttForm({ ...attForm, isEnabled: checked })} />
                    <Label>Enable Policy</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={attForm.isEligibleForAttendanceBonus} onCheckedChange={(checked) => setAttForm({ ...attForm, isEligibleForAttendanceBonus: checked })} />
                    <Label>Attendance Bonus Eligible</Label>
                  </div>

                  {attForm.isEligibleForAttendanceBonus && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Bonus Calculation Type</Label>
                        <Select value={attForm.bonusCalculationType} onValueChange={(val) => setAttForm({ ...attForm, bonusCalculationType: val })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            <SelectItem value="FIXED">Fixed Amount</SelectItem>
                            <SelectItem value="CATEGORY_BASED">Category Based</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Attendance Bonus Amount (BDT)</Label>
                        <Input type="number" min="0" value={attForm.attendanceBonusAmount} onChange={(e) => setAttForm({ ...attForm, attendanceBonusAmount: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={attForm.applyAbsentPenalty} onCheckedChange={(checked) => setAttForm({ ...attForm, applyAbsentPenalty: checked })} />
                    <Label>Apply Absent Penalty</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={attForm.applyLatePenalty} onCheckedChange={(checked) => setAttForm({ ...attForm, applyLatePenalty: checked })} />
                    <Label>Apply Late Penalty</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={attForm.status} onValueChange={(val) => setAttForm({ ...attForm, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-3 flex items-start gap-1">
                  <FiInfo className="mt-0.5 flex-shrink-0" />
                  <span>Attendance policy controls bonus and penalty eligibility. Shift controls timing.</span>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => triggerModal("attendance", false)}>Cancel</Button>
                  <Button type="submit">Save Policy</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            TAB 4 — LATE POLICY
        ================================================================ */}
        <TabsContent value="late" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Late Policies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Determine how tardiness converts to absences and affects attendance bonuses or basic salary deductions.</p>
            </div>
            <Button size="sm" onClick={() => triggerModal("late", true)} className="flex items-center gap-1.5">
              <FiPlus /> Add Policy
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Reset Period</TableHead>
                    <TableHead>Late to Absent Conversion</TableHead>
                    <TableHead>Deduct Salary</TableHead>
                    <TableHead>Deduct Bonus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latePolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">
                        {p.name}
                        {p.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{p.description}</p>}
                      </TableCell>
                      <TableCell className="capitalize">{p.lateCountPeriod.toLowerCase()}</TableCell>
                      <TableCell>
                        {p.enableLateToAbsentConversion ? (
                          <Badge variant="destructive">{p.lateDaysForOneAbsent} Days = 1 Absent</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.deductSalaryForLate ? "destructive" : "secondary"}>
                          {p.deductSalaryForLate ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.deductAttendanceBonusForLate ? "destructive" : "secondary"}>
                          {p.deductAttendanceBonusForLate ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => triggerModal("late", true, p)}>
                          <FiEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => handleDeletePolicy("late", p.id)}>
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={modalOpen.late} onOpenChange={(open) => triggerModal("late", open)}>
            <DialogContent className="max-w-lg">
              <form onSubmit={handleLateSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{activeEditId.late ? "Edit Late Policy" : "New Late Policy"}</DialogTitle>
                  <DialogDescription>
                    Define threshold values for tardiness conversion and bonus deduction.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Policy Name *</Label>
                    <Input value={lateForm.name} onChange={(e) => setLateForm({ ...lateForm, name: e.target.value })} placeholder="e.g. Grace Late policy" required />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description</Label>
                    <Input value={lateForm.description} onChange={(e) => setLateForm({ ...lateForm, description: e.target.value })} placeholder="Notes..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={lateForm.isEnabled} onCheckedChange={(checked) => setLateForm({ ...lateForm, isEnabled: checked })} />
                    <Label>Enable Policy</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={lateForm.resetLateEveryMonth} onCheckedChange={(checked) => setLateForm({ ...lateForm, resetLateEveryMonth: checked })} />
                    <Label>Reset Late Every Month</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Late Count Period</Label>
                    <Select value={lateForm.lateCountPeriod} onValueChange={(val) => setLateForm({ ...lateForm, lateCountPeriod: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="PAYROLL_PERIOD">Payroll Period</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={lateForm.enableLateToAbsentConversion} onCheckedChange={(checked) => setLateForm({ ...lateForm, enableLateToAbsentConversion: checked })} />
                    <Label>Late To Absent Conversion</Label>
                  </div>

                  {lateForm.enableLateToAbsentConversion && (
                    <div className="space-y-1.5">
                      <Label>Late Days For 1 Absent</Label>
                      <Input type="number" min="1" value={lateForm.lateDaysForOneAbsent} onChange={(e) => setLateForm({ ...lateForm, lateDaysForOneAbsent: parseInt(e.target.value) || 3 })} />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Late Days For Bonus Loss</Label>
                    <Input type="number" min="1" value={lateForm.lateCountForBonusLoss} onChange={(e) => setLateForm({ ...lateForm, lateCountForBonusLoss: parseInt(e.target.value) || 3 })} />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={lateForm.deductSalaryForLate} onCheckedChange={(checked) => setLateForm({ ...lateForm, deductSalaryForLate: checked })} />
                    <Label>Deduct Basic Salary For Late</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={lateForm.deductAttendanceBonusForLate} onCheckedChange={(checked) => setLateForm({ ...lateForm, deductAttendanceBonusForLate: checked })} />
                    <Label>Deduct Attendance Bonus</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={lateForm.status} onValueChange={(val) => setLateForm({ ...lateForm, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-3 flex items-start gap-1">
                  <FiInfo className="mt-0.5 flex-shrink-0" />
                  <span>Shift marks an employee late. Late policy decides salary/bonus impact.</span>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => triggerModal("late", false)}>Cancel</Button>
                  <Button type="submit">Save Policy</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            TAB 5 — OVERTIME POLICY
        ================================================================ */}
        <TabsContent value="overtime" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Overtime Policies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configure overtime eligibility, multipliers, and fixed rate calculations.</p>
            </div>
            <Button size="sm" onClick={() => triggerModal("overtime", true)} className="flex items-center gap-1.5">
              <FiPlus /> Add Policy
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>OT Type</TableHead>
                    <TableHead>Multiplier</TableHead>
                    <TableHead>Basic Pct</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Hour Basis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtimePolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">
                        {p.name}
                        {p.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{p.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isEligible ? "default" : "secondary"}>
                          {p.isEligible ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{p.calculationType.toLowerCase().replace("_", " ")}</TableCell>
                      <TableCell>{parseDecimal(p.multiplier)}x</TableCell>
                      <TableCell>{parseDecimal(p.basicPercentageFromGross)}%</TableCell>
                      <TableCell>{p.monthlyWorkingDays} Days</TableCell>
                      <TableCell className="text-xs">{p.hourBasis.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => triggerModal("overtime", true, p)}>
                          <FiEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => handleDeletePolicy("overtime", p.id)}>
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={modalOpen.overtime} onOpenChange={(open) => triggerModal("overtime", open)}>
            <DialogContent className="max-w-xl">
              <form onSubmit={handleOTSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{activeEditId.overtime ? "Edit Overtime Policy" : "New Overtime Policy"}</DialogTitle>
                  <DialogDescription>
                    Configure overtime salary calculation models.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Policy Name *</Label>
                    <Input value={otForm.name} onChange={(e) => setOtForm({ ...otForm, name: e.target.value })} placeholder="e.g. Standard Worker 2x OT" required />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description</Label>
                    <Input value={otForm.description} onChange={(e) => setOtForm({ ...otForm, description: e.target.value })} placeholder="Notes..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={otForm.isEligible} onCheckedChange={(checked) => setOtForm({ ...otForm, isEligible: checked })} />
                    <Label>OT Eligible</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Calculation Type</Label>
                    <Select value={otForm.calculationType} onValueChange={(val) => setOtForm({ ...otForm, calculationType: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FORMULA">Formula Based</SelectItem>
                        <SelectItem value="FIXED_RATE">Fixed Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {otForm.calculationType === "FORMULA" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>Basic Salary Pct From Gross (%)</Label>
                        <Input type="number" min="0" max="100" value={otForm.basicPercentageFromGross} onChange={(e) => setOtForm({ ...otForm, basicPercentageFromGross: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Monthly Working Days</Label>
                        <Input type="number" min="1" value={otForm.monthlyWorkingDays} onChange={(e) => setOtForm({ ...otForm, monthlyWorkingDays: parseInt(e.target.value) || 30 })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Hour Basis</Label>
                        <Select value={otForm.hourBasis} onValueChange={(val) => setOtForm({ ...otForm, hourBasis: val })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASSIGNED_SHIFT_HOUR">Assigned Shift Hours</SelectItem>
                            <SelectItem value="FIXED_HOUR">Fixed Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {otForm.hourBasis === "FIXED_HOUR" && (
                        <div className="space-y-1.5">
                          <Label>Fixed Hour Value</Label>
                          <Input type="number" step="0.1" min="1" value={otForm.fixedHourValue || 8} onChange={(e) => setOtForm({ ...otForm, fixedHourValue: parseFloat(e.target.value) || 8 })} />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label>OT Multiplier</Label>
                        <Input type="number" step="0.1" min="0" value={otForm.multiplier} onChange={(e) => setOtForm({ ...otForm, multiplier: parseFloat(e.target.value) || 2 })} />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Fixed OT Rate (BDT / hour)</Label>
                      <Input type="number" min="0" value={otForm.fixedOTRate} onChange={(e) => setOtForm({ ...otForm, fixedOTRate: parseFloat(e.target.value) || 0 })} />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Minimum OT Minutes (Threshold)</Label>
                    <Input type="number" min="0" value={otForm.minimumOTMinutes} onChange={(e) => setOtForm({ ...otForm, minimumOTMinutes: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={otForm.status} onValueChange={(val) => setOtForm({ ...otForm, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border p-3 rounded bg-muted/30 text-xs space-y-1">
                  <p className="font-semibold">Calculation Formula Preview:</p>
                  <p className="text-muted-foreground">Basic = Gross × {otForm.basicPercentageFromGross}%</p>
                  <p className="text-muted-foreground">Day Basic = Basic / {otForm.monthlyWorkingDays}</p>
                  <p className="text-muted-foreground">Hourly Basic = Day Basic / {otForm.hourBasis === "FIXED_HOUR" ? otForm.fixedHourValue : "Shift Hours"}</p>
                  <p className="text-muted-foreground">OT Rate = Hourly Basic × {otForm.multiplier}</p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => triggerModal("overtime", false)}>Cancel</Button>
                  <Button type="submit">Save Policy</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            TAB 6 — TIFFIN BILL POLICY
        ================================================================ */}
        <TabsContent value="tiffin" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Tiffin Bill Policies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage daily tiffin bill eligibility and checkout time limits.</p>
            </div>
            <Button size="sm" onClick={() => triggerModal("tiffin", true)} className="flex items-center gap-1.5">
              <FiPlus /> Add Policy
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Allow After Time</TableHead>
                    <TableHead>Daily Amount</TableHead>
                    <TableHead>Max Count / Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiffinBillPolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">
                        {p.name}
                        {p.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{p.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isEligible ? "default" : "secondary"}>
                          {p.isEligible ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.allowAfterTime || "Immediate Checkout"}</TableCell>
                      <TableCell>{parseDecimal(p.amount)} BDT</TableCell>
                      <TableCell>{p.maxCountPerDay}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => triggerModal("tiffin", true, p)}>
                          <FiEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => handleDeletePolicy("tiffin", p.id)}>
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={modalOpen.tiffin} onOpenChange={(open) => triggerModal("tiffin", open)}>
            <DialogContent className="max-w-md">
              <form onSubmit={handleTiffinSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{activeEditId.tiffin ? "Edit Tiffin Policy" : "New Tiffin Policy"}</DialogTitle>
                  <DialogDescription>
                    Define daily tiffin bill parameters.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Policy Name *</Label>
                    <Input value={tiffinForm.name} onChange={(e) => setTiffinForm({ ...tiffinForm, name: e.target.value })} placeholder="e.g. Standard 8PM Tiffin" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input value={tiffinForm.description} onChange={(e) => setTiffinForm({ ...tiffinForm, description: e.target.value })} placeholder="Notes..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={tiffinForm.isEligible} onCheckedChange={(checked) => setTiffinForm({ ...tiffinForm, isEligible: checked })} />
                    <Label>Is Eligible</Label>
                  </div>

                  {tiffinForm.isEligible && (
                    <div className="space-y-1.5">
                      <Label>Allow After Checkout Time (HH:mm)</Label>
                      <Input value={tiffinForm.allowAfterTime} onChange={(e) => setTiffinForm({ ...tiffinForm, allowAfterTime: e.target.value })} placeholder="e.g. 20:00" required />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Tiffin Allowance Amount (BDT)</Label>
                    <Input type="number" min="0" value={tiffinForm.amount} onChange={(e) => setTiffinForm({ ...tiffinForm, amount: parseFloat(e.target.value) || 0 })} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Max Count Per Day</Label>
                    <Input type="number" min="1" value={tiffinForm.maxCountPerDay} onChange={(e) => setTiffinForm({ ...tiffinForm, maxCountPerDay: parseInt(e.target.value) || 1 })} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={tiffinForm.status} onValueChange={(val) => setTiffinForm({ ...tiffinForm, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-3 flex items-start gap-1">
                  <FiInfo className="mt-0.5 flex-shrink-0" />
                  <span>Tiffin bill is calculated by checkout time, not by shift start time.</span>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => triggerModal("tiffin", false)}>Cancel</Button>
                  <Button type="submit">Save Policy</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            TAB 7 — NIGHT BILL POLICY
        ================================================================ */}
        <TabsContent value="night" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Night Bill Policies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configure night shift checkout allowance details and overnight validations.</p>
            </div>
            <Button size="sm" onClick={() => triggerModal("night", true)} className="flex items-center gap-1.5">
              <FiPlus /> Add Policy
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Allow After Time</TableHead>
                    <TableHead>Overnight Support</TableHead>
                    <TableHead>Daily Amount</TableHead>
                    <TableHead>Max Count / Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nightBillPolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">
                        {p.name}
                        {p.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{p.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isEligible ? "default" : "secondary"}>
                          {p.isEligible ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.allowAfterTime || "Immediate Checkout"}</TableCell>
                      <TableCell>
                        <Badge variant={p.supportsOvernightCheckout ? "default" : "secondary"}>
                          {p.supportsOvernightCheckout ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{parseDecimal(p.amount)} BDT</TableCell>
                      <TableCell>{p.maxCountPerDay}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => triggerModal("night", true, p)}>
                          <FiEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => handleDeletePolicy("night", p.id)}>
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={modalOpen.night} onOpenChange={(open) => triggerModal("night", open)}>
            <DialogContent className="max-w-md">
              <form onSubmit={handleNightSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{activeEditId.night ? "Edit Night Bill Policy" : "New Night Bill Policy"}</DialogTitle>
                  <DialogDescription>
                    Define night shift checkout criteria.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Policy Name *</Label>
                    <Input value={nightForm.name} onChange={(e) => setNightForm({ ...nightForm, name: e.target.value })} placeholder="e.g. Standard Night Bill" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input value={nightForm.description} onChange={(e) => setNightForm({ ...nightForm, description: e.target.value })} placeholder="Notes..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={nightForm.isEligible} onCheckedChange={(checked) => setNightForm({ ...nightForm, isEligible: checked })} />
                    <Label>Is Eligible</Label>
                  </div>

                  {nightForm.isEligible && (
                    <div className="space-y-1.5">
                      <Label>Allow After Checkout Time (HH:mm)</Label>
                      <Input value={nightForm.allowAfterTime} onChange={(e) => setNightForm({ ...nightForm, allowAfterTime: e.target.value })} placeholder="e.g. 23:55" required />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Night Allowance Amount (BDT)</Label>
                    <Input type="number" min="0" value={nightForm.amount} onChange={(e) => setNightForm({ ...nightForm, amount: parseFloat(e.target.value) || 0 })} required />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={nightForm.supportsOvernightCheckout} onCheckedChange={(checked) => setNightForm({ ...nightForm, supportsOvernightCheckout: checked })} />
                    <Label>Supports Overnight Checkout (Next Day)</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Max Count Per Day</Label>
                    <Input type="number" min="1" value={nightForm.maxCountPerDay} onChange={(e) => setNightForm({ ...nightForm, maxCountPerDay: parseInt(e.target.value) || 1 })} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={nightForm.status} onValueChange={(val) => setNightForm({ ...nightForm, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-3 flex items-start gap-1">
                  <FiInfo className="mt-0.5 flex-shrink-0" />
                  <span>Night bill must support next-day checkout for overnight work.</span>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => triggerModal("night", false)}>Cancel</Button>
                  <Button type="submit">Save Policy</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            TAB 8 — HOLIDAY BILL POLICY
        ================================================================ */}
        <TabsContent value="holiday" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">Holiday Bill Policies</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Control daily premium allowances when working on weekends and public holidays.</p>
            </div>
            <Button size="sm" onClick={() => triggerModal("holiday", true)} className="flex items-center gap-1.5">
              <FiPlus /> Add Policy
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Calculation Basis</TableHead>
                    <TableHead>Fixed Amount</TableHead>
                    <TableHead>Allow with OT</TableHead>
                    <TableHead>Include Weekend</TableHead>
                    <TableHead>Include Holiday</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidayBillPolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">
                        {p.name}
                        {p.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{p.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isEligible ? "default" : "secondary"}>
                          {p.isEligible ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{p.calculationType.toLowerCase().replace("_", " ")}</TableCell>
                      <TableCell>{p.fixedAmount ? `${parseDecimal(p.fixedAmount)} BDT` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.allowWithOT ? "default" : "secondary"}>
                          {p.allowWithOT ? "Allowed" : "Blocked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.includeWeekend ? "default" : "secondary"}>
                          {p.includeWeekend ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.includePublicHoliday ? "default" : "secondary"}>
                          {p.includePublicHoliday ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => triggerModal("holiday", true, p)}>
                          <FiEdit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 inline-flex items-center justify-center" onClick={() => handleDeletePolicy("holiday", p.id)}>
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={modalOpen.holiday} onOpenChange={(open) => triggerModal("holiday", open)}>
            <DialogContent className="max-w-md">
              <form onSubmit={handleHolidaySubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{activeEditId.holiday ? "Edit Holiday Policy" : "New Holiday Policy"}</DialogTitle>
                  <DialogDescription>
                    Define holiday work rewards.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Policy Name *</Label>
                    <Input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="e.g. Standard Holiday premium" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input value={holidayForm.description} onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })} placeholder="Notes..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={holidayForm.isEligible} onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, isEligible: checked })} />
                    <Label>Is Eligible</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Calculation Basis</Label>
                    <Select value={holidayForm.calculationType} onValueChange={(val) => setHolidayForm({ ...holidayForm, calculationType: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONE_DAY_GROSS">1-Day Gross Salary (Gross / 30)</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Fixed Allowance Amount</SelectItem>
                        <SelectItem value="OT_BASED">Overtime Formula Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {holidayForm.calculationType === "FIXED_AMOUNT" && (
                    <div className="space-y-1.5">
                      <Label>Fixed Allowance Amount (BDT)</Label>
                      <Input type="number" min="0" value={holidayForm.fixedAmount} onChange={(e) => setHolidayForm({ ...holidayForm, fixedAmount: parseFloat(e.target.value) || 0 })} required />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={holidayForm.allowWithOT} onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, allowWithOT: checked })} />
                    <Label>Allow concurrently with Overtime Pay</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={holidayForm.includeWeekend} onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, includeWeekend: checked })} />
                    <Label>Include Weekend Work</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={holidayForm.includePublicHoliday} onCheckedChange={(checked) => setHolidayForm({ ...holidayForm, includePublicHoliday: checked })} />
                    <Label>Include Public Holiday Work</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={holidayForm.status} onValueChange={(val) => setHolidayForm({ ...holidayForm, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border p-2 rounded bg-muted/40 text-[11px] text-muted-foreground leading-relaxed">
                  Formula Note: <br />
                  <strong>ONE_DAY_GROSS</strong> = Gross Salary / 30
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => triggerModal("holiday", false)}>Cancel</Button>
                  <Button type="submit">Save Policy</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ================================================================
            TAB 9 — EMPLOYEE TYPE MAPPING
        ================================================================ */}
        <TabsContent value="mapping" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">Employee Type Policy Assignments</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Assign policy templates dynamically to custom Employee Types. Changes apply instantly to workers belonging to the category.</p>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Type</TableHead>
                      <TableHead className="w-[160px]">Salary structure</TableHead>
                      <TableHead className="w-[160px]">Attendance</TableHead>
                      <TableHead className="w-[160px]">Late Policy</TableHead>
                      <TableHead className="w-[160px]">Overtime</TableHead>
                      <TableHead className="w-[160px]">Tiffin Policy</TableHead>
                      <TableHead className="w-[160px]">Night Policy</TableHead>
                      <TableHead className="w-[160px]">Holiday Policy</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No employee types found. Setup employee types in Settings first.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeeTypes.map((et: any) => (
                        <TableRow key={et.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-semibold text-xs min-w-[120px]">
                            {et.name}
                            <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{et.description || "No description"}</p>
                          </TableCell>

                          {/* Salary Structure Select */}
                          <TableCell>
                            <Select
                              value={etMappings[et.id]?.salaryStructurePolicyId || "none"}
                              onValueChange={(val) => handleMappingChange(et.id, "salaryStructurePolicyId", val)}
                            >
                              <SelectTrigger className="w-[140px] text-xs h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default (None)</SelectItem>
                                {salaryStructurePolicies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Attendance Select */}
                          <TableCell>
                            <Select
                              value={etMappings[et.id]?.attendancePolicyId || "none"}
                              onValueChange={(val) => handleMappingChange(et.id, "attendancePolicyId", val)}
                            >
                              <SelectTrigger className="w-[140px] text-xs h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default (None)</SelectItem>
                                {attendancePolicies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Late Select */}
                          <TableCell>
                            <Select
                              value={etMappings[et.id]?.latePolicyId || "none"}
                              onValueChange={(val) => handleMappingChange(et.id, "latePolicyId", val)}
                            >
                              <SelectTrigger className="w-[140px] text-xs h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default (None)</SelectItem>
                                {latePolicies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Overtime Select */}
                          <TableCell>
                            <Select
                              value={etMappings[et.id]?.overtimePolicyId || "none"}
                              onValueChange={(val) => handleMappingChange(et.id, "overtimePolicyId", val)}
                            >
                              <SelectTrigger className="w-[140px] text-xs h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default (None)</SelectItem>
                                {overtimePolicies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Tiffin Select */}
                          <TableCell>
                            <Select
                              value={etMappings[et.id]?.tiffinBillPolicyId || "none"}
                              onValueChange={(val) => handleMappingChange(et.id, "tiffinBillPolicyId", val)}
                            >
                              <SelectTrigger className="w-[140px] text-xs h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default (None)</SelectItem>
                                {tiffinBillPolicies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Night Select */}
                          <TableCell>
                            <Select
                              value={etMappings[et.id]?.nightBillPolicyId || "none"}
                              onValueChange={(val) => handleMappingChange(et.id, "nightBillPolicyId", val)}
                            >
                              <SelectTrigger className="w-[140px] text-xs h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default (None)</SelectItem>
                                {nightBillPolicies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Holiday Select */}
                          <TableCell>
                            <Select
                              value={etMappings[et.id]?.holidayBillPolicyId || "none"}
                              onValueChange={(val) => handleMappingChange(et.id, "holidayBillPolicyId", val)}
                            >
                              <SelectTrigger className="w-[140px] text-xs h-8">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default (None)</SelectItem>
                                {holidayBillPolicies.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button size="sm" className="flex items-center gap-1 ml-auto h-7 px-2 text-xs" onClick={() => handleMappingSave(et.id)}>
                              <FiCheck className="h-3 w-3" /> Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================
            TAB 10 — GLOBAL RULES (POLICY + LEGACY)
        ================================================================ */}
        <TabsContent value="global" className="space-y-6">
          {/* Policy settings form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-5 w-5 text-primary" /> Policy Engine Global Defaults
              </CardTitle>
              <CardDescription>
                Define rounding methods, currency codes, lock parameters, and default work calculation periods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGlobalSettingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Default Monthly Working Days</Label>
                    <Input type="number" min="1" value={globalSettingsForm.defaultMonthlyWorkingDays} onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, defaultMonthlyWorkingDays: parseInt(e.target.value) || 30 })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Default Pay Divisor</Label>
                    <Input type="number" min="1" value={globalSettingsForm.defaultPayDivisor} onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, defaultPayDivisor: parseInt(e.target.value) || 30 })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Default Currency (Code)</Label>
                    <Input value={globalSettingsForm.defaultCurrency} onChange={(e) => setGlobalSettingsForm({ ...globalSettingsForm, defaultCurrency: e.target.value })} placeholder="BDT" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rounding Method</Label>
                    <Select value={globalSettingsForm.roundingMethod} onValueChange={(val) => setGlobalSettingsForm({ ...globalSettingsForm, roundingMethod: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None (Full Decimals)</SelectItem>
                        <SelectItem value="NEAREST_INTEGER">Nearest Integer</SelectItem>
                        <SelectItem value="FLOOR">Floor (Round Down)</SelectItem>
                        <SelectItem value="CEIL">Ceil (Round Up)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={globalSettingsForm.allowNegativeNetSalary} onCheckedChange={(checked) => setGlobalSettingsForm({ ...globalSettingsForm, allowNegativeNetSalary: checked })} />
                    <Label>Allow Negative Net Salary</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={globalSettingsForm.payrollLockAfterApproval} onCheckedChange={(checked) => setGlobalSettingsForm({ ...globalSettingsForm, payrollLockAfterApproval: checked })} />
                    <Label>Lock Payroll After Approval</Label>
                  </div>
                  <div className="flex items-center gap-2 pt-2 md:col-span-2">
                    <Switch checked={globalSettingsForm.recalculateLockedPayroll} onCheckedChange={(checked) => setGlobalSettingsForm({ ...globalSettingsForm, recalculateLockedPayroll: checked })} />
                    <Label>Recalculate Locked Payrolls</Label>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t">
                  <Button type="submit" className="flex items-center gap-1.5">
                    <FiSave /> Save Policy Defaults
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Legacy forms */}
          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-muted-foreground mb-4">Legacy Settings & Parameters</h3>
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-300 mb-6">
              <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">How these settings are used</p>
                <p className="mt-1 text-blue-700 dark:text-blue-400">
                  Allowance percentages apply only when an employee has no individual salary structure.
                  Employer PF and festival bonus only post if their expense accounts are configured in Accounting Settings.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmitLegacy)} className="space-y-6">
              {/* ================================================================
                  CARD 1 — Pay Schedule & Calendar
              ================================================================ */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SectionBadge n={1} /> Pay Schedule & Calendar
                  </CardTitle>
                  <CardDescription>
                    Controls payroll frequency, disbursement day, attendance cutoff, and the fiscal/tax year.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pay Frequency */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" /> Pay Frequency
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Controller name="payFrequency" control={control} render={({ field }) => (
                        <>
                          {(["monthly", "biweekly", "weekly"] as const).map((freq) => (
                            <button key={freq} type="button" onClick={() => field.onChange(freq)}
                              className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all ${
                                field.value === freq ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                              }`}>
                              <div className={`h-3 w-3 rounded-full border-2 ${field.value === freq ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                              <span className="text-sm font-medium capitalize">{freq === "biweekly" ? "Bi-weekly" : freq}</span>
                            </button>
                          ))}
                        </>
                      )} />
                    </div>
                  </div>

                  {/* Pay Day + Cutoff */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm">Pay Day of Month</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="1" max="31"
                          {...register("payDayOfMonth", { valueAsNumber: true })} className="w-24" />
                        <span className="text-sm text-muted-foreground">
                          {payFrequency === "monthly" ? "of each month" : "— (not used for non-monthly)"}
                        </span>
                      </div>
                      {errors.payDayOfMonth && <p className="text-xs text-destructive">{errors.payDayOfMonth.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Attendance Cutoff Day</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="1" max="31"
                          {...register("attendanceCutoffDay", { valueAsNumber: true })} className="w-24" />
                        <span className="text-sm text-muted-foreground">of each month</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Attendance after this day goes to next month&apos;s payroll</p>
                      {errors.attendanceCutoffDay && <p className="text-xs text-destructive">{errors.attendanceCutoffDay.message}</p>}
                    </div>
                  </div>

                  {/* Tax Year Start */}
                  <div className="space-y-2">
                    <Label className="text-sm">Tax Year Starts In</Label>
                    <Controller name="taxYearStartMonth" control={control} render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        {MONTHS.map((m, i) => (
                          <button key={m} type="button" onClick={() => field.onChange(i + 1)}
                            className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                              field.value === i + 1
                                ? "border-primary bg-primary text-primary-foreground font-medium"
                                : "border-border hover:border-primary/50"
                            }`}>
                            {m.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    )} />
                    <p className="text-xs text-muted-foreground">Used for annual tax calculations and leave accrual resets</p>
                  </div>
                </CardContent>
              </Card>

              {/* ================================================================
                  CARD 2 — Calculation Rules
              ================================================================ */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SectionBadge n={2} /> Calculation Rules
                  </CardTitle>
                  <CardDescription>
                    OT multipliers, absent deduction basis, and default allowance percentages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* OT Grid */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overtime (OT)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {([
                        { name: "workingHoursPerDay",    label: "Work hrs/day",     step: "0.5", suffix: "hrs", tip: "Standard shift length" },
                        { name: "dailyOtThresholdHours", label: "OT starts after",  step: "0.5", suffix: "hrs", tip: "Hours/day before OT kicks in" },
                        { name: "otMultiplier",          label: "Weekday OT rate",  step: "0.1", suffix: "×",   tip: "e.g. 1.5 = time-and-a-half" },
                        { name: "weekendOtMultiplier",   label: "Weekend OT rate",  step: "0.1", suffix: "×",   tip: "Sat/Sun OT multiplier" },
                        { name: "holidayOtMultiplier",   label: "Holiday OT rate",  step: "0.1", suffix: "×",   tip: "Public holiday OT multiplier" },
                      ] as const).map(({ name, label, step, suffix, tip }) => (
                        <div key={name} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <div className="flex items-center gap-1">
                            <Input type="number" step={step} min="0"
                              {...register(name, { valueAsNumber: true })} className="h-9" />
                            <span className="text-sm text-muted-foreground shrink-0">{suffix}</span>
                          </div>
                          <p className="text-xs text-muted-foreground/70">{tip}</p>
                          {errors[name] && <p className="text-xs text-destructive">{(errors[name] as any)?.message}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Absent Deduction Mode */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent Deduction Days Basis</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Controller name="absentDeductionMode" control={control} render={({ field }) => (
                        <>
                          {(["calendar", "working"] as const).map((mode) => (
                            <button key={mode} type="button" onClick={() => field.onChange(mode)}
                              className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                                field.value === mode ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                              }`}>
                              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                field.value === mode ? "border-primary" : "border-muted-foreground"
                              }`}>
                                {field.value === mode && <div className="h-2 w-2 rounded-full bg-primary" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{mode === "calendar" ? "Calendar Days" : "Fixed Working Days"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {mode === "calendar"
                                    ? "Daily rate = Rate ÷ total days in month (28–31)"
                                    : "Daily rate = Rate ÷ standard working days (below)"}
                                </p>
                              </div>
                            </button>
                          ))}
                        </>
                      )} />
                    </div>
                    {absentMode === "working" && (
                      <div className="flex items-center gap-3 pl-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Standard working days/month:</Label>
                        <Input type="number" min="20" max="31"
                          {...register("standardWorkingDays", { valueAsNumber: true })} className="w-24" />
                        {errors.standardWorkingDays && <p className="text-xs text-destructive">{errors.standardWorkingDays.message}</p>}
                      </div>
                    )}
                  </div>

                  {/* Absent Deduction Salary Rate Basis (Gross vs Basic) */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent Deduction Salary Rate Basis</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Controller name="absentDeductionBasis" control={control} render={({ field }) => (
                        <>
                          {(["BASIC", "GROSS"] as const).map((basis) => (
                            <button key={basis} type="button" onClick={() => field.onChange(basis)}
                              className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                                field.value === basis ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                              }`}>
                              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                field.value === basis ? "border-primary" : "border-muted-foreground"
                              }`}>
                                {field.value === basis && <div className="h-2 w-2 rounded-full bg-primary" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{basis === "BASIC" ? "Basic Salary Basis (55%)" : "Total Gross Salary Basis (100%)"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {basis === "BASIC"
                                    ? "Daily rate = Basic Salary ÷ month days (Executive / Corporate Standard)"
                                    : "Daily rate = Total Gross Salary ÷ month days (Garments / Industrial Standard)"}
                                </p>
                              </div>
                            </button>
                          ))}
                        </>
                      )} />
                    </div>
                  </div>

                  {/* Default Allowances */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Allowances (% of Basic)</p>
                      <Badge variant="outline" className="text-xs">Used when no per-employee salary structure exists</Badge>
                    </div>
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>Set to <strong>0</strong> to disable. Individual employees&apos; salary structures take precedence.</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {([
                        { name: "defaultHouseRentPct",     label: "House Rent" },
                        { name: "defaultMedicalPct",       label: "Medical" },
                        { name: "defaultTransportPct",     label: "Transport" },
                        { name: "defaultFoodAllowancePct", label: "Food Allowance" },
                      ] as const).map(({ name, label }) => (
                        <div key={name} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <div className="flex items-center gap-1">
                            <Input type="number" step="0.5" min="0" max="100"
                              {...register(name, { valueAsNumber: true })} className="h-9" />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          {errors[name] && <p className="text-xs text-destructive">{(errors[name] as any)?.message}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Net Pay Rounding */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Pay Rounding</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Controller name="netPayRounding" control={control} render={({ field }) => (
                        <>
                          {([
                            { v: "none",       label: "No Rounding",   desc: "Full decimal" },
                            { v: "nearest10",  label: "Nearest 10",    desc: "e.g. 1234 → 1230" },
                            { v: "nearest100", label: "Nearest 100",   desc: "e.g. 1234 → 1200" },
                          ] as const).map(({ v, label, desc }) => (
                            <button key={v} type="button" onClick={() => field.onChange(v)}
                              className={`flex flex-col gap-1 rounded-lg border-2 p-3 text-left transition-all ${
                                field.value === v ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                              }`}>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full border-2 ${field.value === v ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                                <span className="text-sm font-medium">{label}</span>
                              </div>
                              <span className="text-xs text-muted-foreground pl-5">{desc}</span>
                            </button>
                          ))}
                        </>
                      )} />
                    </div>
                  </div>

                  {/* Weekly Holidays (Weekends) */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weekly Holidays (Weekends)</p>
                    <Controller name="weekends" control={control} render={({ field }) => {
                      const days = [
                        { v: 0, label: "Sunday" },
                        { v: 1, label: "Monday" },
                        { v: 2, label: "Tuesday" },
                        { v: 3, label: "Wednesday" },
                        { v: 4, label: "Thursday" },
                        { v: 5, label: "Friday" },
                        { v: 6, label: "Saturday" },
                      ];
                      const currentValue = field.value || [0, 6];
                      const handleCheckboxChange = (dayVal: number, checked: boolean) => {
                        if (checked) {
                          field.onChange([...currentValue, dayVal].sort());
                        } else {
                          field.onChange(currentValue.filter((v: number) => v !== dayVal));
                        }
                      };
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                          {days.map((day) => {
                            const isChecked = currentValue.includes(day.v);
                            return (
                              <button
                                key={day.v}
                                type="button"
                                onClick={() => handleCheckboxChange(day.v, !isChecked)}
                                className={`flex items-center gap-2 rounded-lg border-2 p-2.5 text-left transition-all ${
                                  isChecked ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                                }`}
                              >
                                <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                  isChecked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                                }`}>
                                  {isChecked && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm font-medium">{day.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    }} />
                    <p className="text-xs text-muted-foreground">Select the days of the week that represent weekend holidays in your organization. Default is Saturday & Sunday.</p>
                  </div>
                </CardContent>
              </Card>

              {/* ================================================================
                  CARD 3 — Statutory & Compliance
              ================================================================ */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SectionBadge n={3} /> Statutory & Compliance
                  </CardTitle>
                  <CardDescription>
                    Tax method and employer provident fund (PF) matching contribution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tax Method */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Tax Calculation Method
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Controller name="taxCalculationMethod" control={control} render={({ field }) => (
                        <>
                          <button type="button" onClick={() => field.onChange("flat")}
                            className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                              field.value === "flat" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                            }`}>
                            <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              field.value === "flat" ? "border-primary" : "border-muted-foreground"
                            }`}>
                              {field.value === "flat" && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">Flat Rate</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Fixed % from employee salary profile. Simple and fast.</p>
                            </div>
                          </button>
                          <button type="button" onClick={() => field.onChange("slab")} disabled
                            className="flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all border-border opacity-50 cursor-not-allowed">
                            <div className="mt-0.5 h-4 w-4 rounded-full border-2 border-muted-foreground flex items-center justify-center flex-shrink-0">
                              {field.value === "slab" && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">Progressive Tax Slab</p>
                                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">Bracket-based tax (e.g. NBR tax slabs). Requires slab configuration.</p>
                            </div>
                          </button>
                        </>
                      )} />
                    </div>
                  </div>

                  {/* Employer PF */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" /> Employer PF Contribution
                      </Label>
                      {employerPfPct > 0 && (
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border-0 text-xs">
                          Active — {employerPfPct}% of Basic
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.5" min="0" max="100"
                          {...register("employerPfPct", { valueAsNumber: true })} className="w-24" />
                        <span className="text-sm text-muted-foreground">% of Basic (0 = disabled)</span>
                      </div>
                    </div>
                    {employerPfPct > 0 && (
                      <div className="flex items-start gap-2 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 p-3 text-xs text-indigo-800 dark:text-indigo-300">
                        <FiInfo className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          Employer PF will generate two additional voucher lines per payroll:
                          <strong> DR Employer PF Expense</strong> + <strong>CR Employer PF Payable</strong>.
                          Configure these accounts in Accounting Settings.
                        </span>
                      </div>
                    )}
                    {errors.employerPfPct && <p className="text-xs text-destructive">{errors.employerPfPct.message}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* ================================================================
                  CARD 4 — Festival Bonus & Loan Policy
              ================================================================ */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SectionBadge n={4} /> Festival Bonus & Loan Policy
                  </CardTitle>
                  <CardDescription>
                    Loan limits and defaults for festival bonuses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Festival Bonus */}
                  <div className="space-y-2">
                    <Label className="text-sm">Default Festival Bonus Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" step="0.5" min="0" max="100"
                        {...register("defaultFestivalBonusPct", { valueAsNumber: true })} className="w-24" />
                      <span className="text-sm text-muted-foreground">% of Basic Salary</span>
                    </div>
                    {errors.defaultFestivalBonusPct && <p className="text-xs text-destructive">{errors.defaultFestivalBonusPct.message}</p>}
                  </div>

                  {/* Loan multipliers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-dashed">
                    <div className="space-y-2">
                      <Label className="text-sm">Max Loan Limit Multiplier</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.1" min="0"
                          {...register("maxLoanMultiplier", { valueAsNumber: true })} className="w-24" />
                        <span className="text-sm text-muted-foreground">× gross salary (0 = unlimited)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Caps total unpaid principal an employee can borrow</p>
                      {errors.maxLoanMultiplier && <p className="text-xs text-destructive">{errors.maxLoanMultiplier.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Max Concurrent Active Loans</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="0" max="50"
                          {...register("maxActiveLoans", { valueAsNumber: true })} className="w-24" />
                        <span className="text-sm text-muted-foreground">loans (0 = unlimited)</span>
                      </div>
                      {errors.maxActiveLoans && <p className="text-xs text-destructive">{errors.maxActiveLoans.message}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-3">
                <Button type="submit" disabled={loading} className="flex items-center gap-2">
                  <FiSave className="mr-2" />
                  {loading ? "Saving..." : "Save Legacy Global Settings"}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Input Form Column */}
            <div className="space-y-6 xl:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    Preview Parameters
                  </CardTitle>
                  <CardDescription>
                    Select an employee and provide mock attendance values to dry-run payroll calculations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="preview-employee">Select Employee</Label>
                    <SearchableSelect
                      options={employees.map(emp => ({
                        label: emp.name,
                        value: emp.id,
                        description: [emp.employeeCode, emp.designation].filter(Boolean).join(" • "),
                      }))}
                      value={previewForm.employeeId}
                      onValueChange={(val) => handleEmployeeChange(val || "")}
                      placeholder="Search and select employee for calculation preview..."
                      searchPlaceholder="Type employee name, code, designation..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="preview-gross">Sample Gross Salary (BDT)</Label>
                    <Input
                      id="preview-gross"
                      type="number"
                      min="0"
                      value={previewForm.grossSalary}
                      onChange={e => setPreviewForm(p => ({ ...p, grossSalary: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="preview-checkin">Check-in Time</Label>
                      <Input
                        id="preview-checkin"
                        type="datetime-local"
                        value={previewForm.checkIn}
                        onChange={e => setPreviewForm(p => ({ ...p, checkIn: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="preview-checkout">Check-out Time</Label>
                      <Input
                        id="preview-checkout"
                        type="datetime-local"
                        value={previewForm.checkOut}
                        onChange={e => setPreviewForm(p => ({ ...p, checkOut: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="preview-othours">Overtime Hours</Label>
                      <Input
                        id="preview-othours"
                        type="number"
                        step="0.1"
                        min="0"
                        value={previewForm.otHours}
                        onChange={e => setPreviewForm(p => ({ ...p, otHours: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="preview-lates">Monthly Late Count</Label>
                      <Input
                        id="preview-lates"
                        type="number"
                        min="0"
                        value={previewForm.lateCountInPeriod}
                        onChange={e => setPreviewForm(p => ({ ...p, lateCountInPeriod: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Holiday Work Rules</Label>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="preview-weekend" className="cursor-pointer">Is Weekend?</Label>
                      <Switch
                        id="preview-weekend"
                        checked={previewForm.isWeekend}
                        onCheckedChange={checked => setPreviewForm(p => ({ ...p, isWeekend: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="preview-publicholiday" className="cursor-pointer">Is Public Holiday?</Label>
                      <Switch
                        id="preview-publicholiday"
                        checked={previewForm.isPublicHoliday}
                        onCheckedChange={checked => setPreviewForm(p => ({ ...p, isPublicHoliday: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="preview-workedholiday" className="cursor-pointer">Worked on Holiday?</Label>
                      <Switch
                        id="preview-workedholiday"
                        checked={previewForm.workedOnHoliday}
                        onCheckedChange={checked => setPreviewForm(p => ({ ...p, workedOnHoliday: checked }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="space-y-1.5">
                      <Label htmlFor="preview-otherallowance">Other Allowance</Label>
                      <Input
                        id="preview-otherallowance"
                        type="number"
                        min="0"
                        value={previewForm.otherAllowance}
                        onChange={e => setPreviewForm(p => ({ ...p, otherAllowance: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="preview-deductions">Other Deduction</Label>
                      <Input
                        id="preview-deductions"
                        type="number"
                        min="0"
                        value={previewForm.deductions}
                        onChange={e => setPreviewForm(p => ({ ...p, deductions: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleRunPreview}
                    disabled={previewLoading || !previewForm.employeeId}
                    className="w-full mt-4 flex items-center justify-center gap-2"
                  >
                    {previewLoading ? (
                      <span>Calculating...</span>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        Calculate Preview
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Column */}
            <div className="xl:col-span-2 space-y-6">
              {!previewResult ? (
                <Card className="h-full flex flex-col items-center justify-center text-center p-12 border-dashed">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Calculator className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">No Calculation Loaded</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Select an employee on the left, modify mock parameters as needed, and run the preview calculation.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Warnings section */}
                  {(!previewResult.employeeInfo.shiftName || previewResult.employeeInfo.employeeTypeName === "No Mapped Employee Type") && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-sm">Policy Mappings Warning</h4>
                          <ul className="text-xs list-disc pl-4 space-y-1 mt-1">
                            {!previewResult.employeeInfo.shiftName && (
                              <li>This employee has no shift assigned. Calculation fell back to standard 8-hour shift default.</li>
                            )}
                            {previewResult.employeeInfo.employeeTypeName === "No Mapped Employee Type" && (
                              <li>This employee has no Employee Type assigned, meaning no custom policies are active. Fallbacks are active.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employee Info Header */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-medium flex items-center justify-between">
                        <span>Employee Mappings Summary</span>
                        <Badge variant="outline">{previewResult.employeeInfo.employeeTypeName}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Employee Name</span>
                        <span className="font-medium">{previewResult.employeeInfo.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Employee Code</span>
                        <span className="font-medium">{previewResult.employeeInfo.employeeCode || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Shift Assigned</span>
                        <span className="font-medium">
                          {previewResult.employeeInfo.shiftName
                            ? `${previewResult.employeeInfo.shiftName} (${previewResult.employeeInfo.shiftStart} - ${previewResult.employeeInfo.shiftEnd})`
                            : "None (Fallback 09:00-17:00)"
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Gross Salary</span>
                        <span className="font-semibold text-primary">{previewResult.employeeInfo.grossSalary.toLocaleString()} BDT</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Salary Breakdown & Net Salary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Salary Breakdown */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                          <Banknote className="h-4 w-4 text-green-500" />
                          Salary Structure Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-1">
                          <span>Component</span>
                          <span>Value</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Basic Salary (55%)</span>
                          <span>{previewResult.preview.salaryBreakdown.basicSalary.toLocaleString()} BDT</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>House Rent (26%)</span>
                          <span>{previewResult.preview.salaryBreakdown.houseRent.toLocaleString()} BDT</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Medical Allowance (5%)</span>
                          <span>{previewResult.preview.salaryBreakdown.medical.toLocaleString()} BDT</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Transport Allowance (4%)</span>
                          <span>{previewResult.preview.salaryBreakdown.transport.toLocaleString()} BDT</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Food Allowance (10%)</span>
                          <span>{previewResult.preview.salaryBreakdown.food.toLocaleString()} BDT</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                          <span>Total Components</span>
                          <span>{previewResult.preview.salaryBreakdown.totalComponents.toLocaleString()} BDT</span>
                        </div>
                        {!previewResult.preview.salaryBreakdown.isValid && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Percentage total does not equal 100%. Using fallbacks.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Net Salary Preview */}
                    <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                          <Calculator className="h-4 w-4" />
                          Net Payable Calculation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-1">
                          <span>Earning / Deduction</span>
                          <span>Amount</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Gross Salary</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">+{previewResult.preview.earningsSummary.grossSalary.toLocaleString()} BDT</span>
                        </div>
                        {previewResult.preview.earningsSummary.otAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Overtime Pay</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">+{previewResult.preview.earningsSummary.otAmount.toLocaleString()} BDT</span>
                          </div>
                        )}
                        {previewResult.preview.earningsSummary.holidayBillAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Holiday Bill</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">+{previewResult.preview.earningsSummary.holidayBillAmount.toLocaleString()} BDT</span>
                          </div>
                        )}
                        {previewResult.preview.earningsSummary.nightBillAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Night Bill Allowance</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">+{previewResult.preview.earningsSummary.nightBillAmount.toLocaleString()} BDT</span>
                          </div>
                        )}
                        {previewResult.preview.earningsSummary.tiffinBillAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Tiffin Bill Allowance</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">+{previewResult.preview.earningsSummary.tiffinBillAmount.toLocaleString()} BDT</span>
                          </div>
                        )}
                        {previewResult.preview.earningsSummary.otherAllowance > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Other Allowance</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">+{previewResult.preview.earningsSummary.otherAllowance.toLocaleString()} BDT</span>
                          </div>
                        )}

                        {previewResult.preview.deductionSummary.deductions > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Other Deductions</span>
                            <span className="text-destructive font-medium">-{previewResult.preview.deductionSummary.deductions.toLocaleString()} BDT</span>
                          </div>
                        )}
                        {previewResult.preview.deductionSummary.lateDeduction > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Late Penalty Salary Deductions</span>
                            <span className="text-destructive font-medium">-{previewResult.preview.deductionSummary.lateDeduction.toLocaleString()} BDT</span>
                          </div>
                        )}
                        {previewResult.preview.deductionSummary.attendanceBonusDeduction > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Attendance Bonus Deduction (Lost)</span>
                            <span className="text-destructive font-medium">-{previewResult.preview.deductionSummary.attendanceBonusDeduction.toLocaleString()} BDT</span>
                          </div>
                        )}

                        <div className="flex justify-between text-base font-bold border-t pt-2 mt-2 text-primary">
                          <span>Net Salary Preview</span>
                          <span>{previewResult.preview.netSalaryPreview.toLocaleString()} BDT</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Policies Detailed Evaluations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Rules Verification Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Overtime evaluation */}
                      <div className="border-b pb-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <h4 className="font-semibold text-sm">Overtime Pay Preview</h4>
                          {previewResult.preview.overtime.isEligible ? (
                            <Badge className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">Eligible</Badge>
                          ) : (
                            <Badge variant="secondary">Not Eligible</Badge>
                          )}
                        </div>
                        {previewResult.preview.overtime.isEligible && (
                          <div className="text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-2 pt-1.5">
                            <div>OT Hours: <span className="font-medium text-foreground">{previewResult.preview.overtime.otHours} hrs</span></div>
                            <div>Hourly OT Rate: <span className="font-medium text-foreground">{previewResult.preview.overtime.otRate} BDT/hr</span></div>
                            <div>Total OT Paid: <span className="font-semibold text-foreground">{previewResult.preview.overtime.otAmount} BDT</span></div>
                            <div className="md:col-span-3 mt-1 bg-muted/50 p-2 rounded text-[11px] font-mono leading-relaxed">
                              {previewResult.preview.overtime.formulaUsed}
                            </div>
                            <div className="md:col-span-3 mt-0.5 text-xs font-sans text-muted-foreground italic">
                              Note: {previewResult.preview.overtime.notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tiffin Bill evaluation */}
                      <div className="border-b pb-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-purple-500" />
                          <h4 className="font-semibold text-sm">Tiffin Meal Allowance</h4>
                          {previewResult.preview.tiffin.isEligible ? (
                            <Badge className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">Eligible</Badge>
                          ) : (
                            <Badge variant="secondary">Not Eligible</Badge>
                          )}
                        </div>
                        {previewResult.preview.tiffin.isEligible && (
                          <div className="text-xs text-muted-foreground space-y-1 pt-1.5">
                            <div className="flex flex-wrap gap-x-4">
                              <div>Threshold Checkout: <span className="font-medium text-foreground">{previewResult.preview.tiffin.thresholdDateTime ? new Date(previewResult.preview.tiffin.thresholdDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}</span></div>
                              <div>Allowed: <span className="font-medium text-foreground">{previewResult.preview.tiffin.allowed ? "Yes" : "No"}</span></div>
                              <div>Amount: <span className="font-semibold text-foreground">{previewResult.preview.tiffin.amount} BDT</span></div>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">{previewResult.preview.tiffin.reason}</p>
                          </div>
                        )}
                      </div>

                      {/* Night Bill evaluation */}
                      <div className="border-b pb-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <h4 className="font-semibold text-sm">Night Shift Bill</h4>
                          {previewResult.preview.nightBill.isEligible ? (
                            <Badge className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">Eligible</Badge>
                          ) : (
                            <Badge variant="secondary">Not Eligible</Badge>
                          )}
                        </div>
                        {previewResult.preview.nightBill.isEligible && (
                          <div className="text-xs text-muted-foreground space-y-1 pt-1.5">
                            <div className="flex flex-wrap gap-x-4">
                              <div>Threshold Checkout: <span className="font-medium text-foreground">{previewResult.preview.nightBill.thresholdDateTime ? new Date(previewResult.preview.nightBill.thresholdDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}</span></div>
                              <div>Overnight Applied: <span className="font-medium text-foreground">{previewResult.preview.nightBill.overnightApplied ? "Yes" : "No"}</span></div>
                              <div>Allowed: <span className="font-medium text-foreground">{previewResult.preview.nightBill.allowed ? "Yes" : "No"}</span></div>
                              <div>Amount: <span className="font-semibold text-foreground">{previewResult.preview.nightBill.amount} BDT</span></div>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">{previewResult.preview.nightBill.reason}</p>
                          </div>
                        )}
                      </div>

                      {/* Holiday Bill evaluation */}
                      <div className="border-b pb-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-red-500" />
                          <h4 className="font-semibold text-sm">Holiday Premium Allowance</h4>
                          {previewResult.preview.holidayBill.isEligible ? (
                            <Badge className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">Eligible</Badge>
                          ) : (
                            <Badge variant="secondary">Not Eligible</Badge>
                          )}
                        </div>
                        {previewResult.preview.holidayBill.isEligible && (
                          <div className="text-xs text-muted-foreground space-y-1 pt-1.5">
                            <div className="flex flex-wrap gap-x-4">
                              <div>Calculation Type: <span className="font-medium text-foreground">{previewResult.preview.holidayBill.calculationType}</span></div>
                              <div>Allowed: <span className="font-medium text-foreground">{previewResult.preview.holidayBill.allowed ? "Yes" : "No"}</span></div>
                              <div>Amount: <span className="font-semibold text-foreground">{previewResult.preview.holidayBill.amount} BDT</span></div>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">{previewResult.preview.holidayBill.reason}</p>
                          </div>
                        )}
                      </div>

                      {/* Late Policy evaluation */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <h4 className="font-semibold text-sm">Late Penalties Evaluation</h4>
                          <Badge variant="outline">Period: Monthly</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pt-1.5">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div>Monthly Lates: <span className="font-medium text-foreground">{previewResult.preview.latePolicy.lateCountInPeriod} lates</span></div>
                            <div>Converted Absents: <span className="font-medium text-foreground">{previewResult.preview.latePolicy.convertedAbsentDays} days</span></div>
                            <div>Salary Deduction: <span className="font-semibold text-foreground">{previewResult.preview.latePolicy.lateDeductionAmount} BDT</span></div>
                            <div>Bonus Forfeited: <span className="font-medium text-foreground">{previewResult.preview.latePolicy.attendanceBonusLost ? "Yes" : "No"}</span></div>
                            <div>Bonus Loss Deduction: <span className="font-semibold text-foreground">{previewResult.preview.latePolicy.attendanceBonusDeduction} BDT</span></div>
                          </div>
                          <p className="text-[11px] text-muted-foreground italic mt-1">{previewResult.preview.latePolicy.notes}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Reprocess section */}
            <div className="xl:col-span-3 border-t pt-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Attendance Policy Reprocess
                  </CardTitle>
                  <CardDescription>
                    Recalculate daily policy values (late minutes, OT, Night, Tiffin, and Holiday bills) for existing attendance records within a date range.
                  </CardDescription>
                  <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 p-2.5 rounded-md mt-2 flex items-start gap-1">
                    <FiInfo className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span><strong>Note:</strong> This recalculates daily policy values only. It does not generate payroll or change approved payrolls.</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label htmlFor="reprocess-from">From Date</Label>
                      <Input
                        id="reprocess-from"
                        type="date"
                        value={reprocessForm.fromDate}
                        onChange={e => setReprocessForm(p => ({ ...p, fromDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reprocess-to">To Date</Label>
                      <Input
                        id="reprocess-to"
                        type="date"
                        value={reprocessForm.toDate}
                        onChange={e => setReprocessForm(p => ({ ...p, toDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reprocess-employee">Employee (Optional)</Label>
                      <SearchableSelect
                        options={[
                          { label: "All Employees", value: "all", description: "Process for all active employees" },
                          ...employees.map(emp => ({
                            label: emp.name,
                            value: emp.id,
                            description: [emp.employeeCode, emp.designation].filter(Boolean).join(" • "),
                          }))
                        ]}
                        value={reprocessForm.employeeId || "all"}
                        onValueChange={val => setReprocessForm(p => ({ ...p, employeeId: val || "all" }))}
                        placeholder="Search and select employee..."
                        searchPlaceholder="Type name, code, designation..."
                      />
                    </div>
                    <div className="flex items-center gap-6 h-10">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="reprocess-force"
                          checked={reprocessForm.force}
                          onCheckedChange={checked => setReprocessForm(p => ({ ...p, force: checked }))}
                        />
                        <Label htmlFor="reprocess-force" className="cursor-pointer">Force Locked?</Label>
                      </div>
                      <Button
                        onClick={handleRunReprocess}
                        disabled={reprocessLoading || !reprocessForm.fromDate || !reprocessForm.toDate}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        {reprocessLoading ? "Reprocessing..." : "Run Reprocess"}
                      </Button>
                    </div>
                  </div>

                  {reprocessResult && (
                    <div className="mt-6 border-t pt-4 space-y-4">
                      <h4 className="font-semibold text-sm">Reprocess Run Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block">Total Found</span>
                          <span className="text-xl font-bold">{reprocessResult.totalFound}</span>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block text-green-600 dark:text-green-400">Processed</span>
                          <span className="text-xl font-bold text-green-600 dark:text-green-400">{reprocessResult.processed}</span>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block text-yellow-600 dark:text-yellow-400">Skipped Locked</span>
                          <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{reprocessResult.skippedLocked}</span>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block text-orange-600 dark:text-orange-400">Skipped Missing Shift</span>
                          <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{reprocessResult.skippedMissingShift}</span>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground block text-destructive">Errors</span>
                          <span className="text-xl font-bold text-destructive">{reprocessResult.errors.length}</span>
                        </div>
                      </div>

                      {reprocessResult.sampleResults.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h5 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Sample Calculations</h5>
                          <div className="border rounded-md overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Employee</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Late Min</TableHead>
                                  <TableHead>OT Amt</TableHead>
                                  <TableHead>Tiffin</TableHead>
                                  <TableHead>Night</TableHead>
                                  <TableHead>Holiday</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {reprocessResult.sampleResults.map((sample: any, idx: number) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{sample.employeeName}</TableCell>
                                    <TableCell>{sample.date}</TableCell>
                                    <TableCell>{sample.lateMinutes} mins</TableCell>
                                    <TableCell>{sample.otAmount} BDT</TableCell>
                                    <TableCell>{sample.tiffin} BDT</TableCell>
                                    <TableCell>{sample.night} BDT</TableCell>
                                    <TableCell>{sample.holiday} BDT</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {reprocessResult.errors.length > 0 && (
                        <div className="bg-destructive/5 border border-destructive/20 text-destructive text-xs p-3 rounded-md max-h-32 overflow-y-auto space-y-1">
                          <span className="font-semibold block">Errors Log:</span>
                          {reprocessResult.errors.map((err: string, idx: number) => (
                            <p key={idx}>{err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Toast notifications */}
      {success && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
            <FiSave /> {success}
          </div>
        </div>
      )}
      {error && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-destructive text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
            <FiAlertCircle /> {error}
          </div>
        </div>
      )}

      <AlertDialog open={!!deletePolicyTarget} onOpenChange={(open) => !open && setDeletePolicyTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this policy template?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePolicyTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePolicy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionBadge({ n }: { n: number }) {
  return (
    <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
      {n}
    </span>
  );
}
