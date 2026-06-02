"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  FiZap,
} from "react-icons/fi";
import {
  Banknote,
  Calculator,
  Clock,
  Calendar,
  TrendingUp,
  ShieldCheck,
  Wallet,
  AlertTriangle,
  Gift,
  Settings2,
  Building2,
} from "lucide-react";
import {
  getPayrollSettingsAction,
  updatePayrollSettings,
} from "../_actions/payroll-settings.action";
import { getChartOfAccounts } from "../../accounts/chart-of-accounts/_actions/chart-of-accounts.action";

// ---------------------------------------------------------------------------
// Zod Schema (client-side — mirrors server schema)
// ---------------------------------------------------------------------------

const formSchema = z.object({
  // Accounts
  salaryExpenseAccountId:        z.string(),
  defaultSalaryPayableAccountId: z.string(),
  taxPayableAccountId:           z.string(),
  pfPayableAccountId:            z.string(),
  defaultAdvanceAccountId:       z.string(),
  employerPfExpenseAccountId:    z.string(),
  employerPfPayableAccountId:    z.string(),
  festivalBonusExpenseAccountId: z.string(),
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
  standardWorkingDays:     z.number().int().min(20).max(31),
  defaultHouseRentPct:     z.number().min(0).max(100),
  defaultMedicalPct:       z.number().min(0).max(100),
  defaultTransportPct:     z.number().min(0).max(100),
  defaultFoodAllowancePct: z.number().min(0).max(100),
  taxCalculationMethod:    z.enum(["flat", "slab"]),
  employerPfPct:           z.number().min(0).max(100),
  defaultFestivalBonusPct: z.number().min(0).max(100),
  netPayRounding:          z.enum(["none", "nearest10", "nearest100"]),
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

// ---------------------------------------------------------------------------
// Month names
// ---------------------------------------------------------------------------
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ---------------------------------------------------------------------------
// Rounding helper
// ---------------------------------------------------------------------------
function applyRounding(v: number, mode: string): number {
  if (mode === "nearest10")  return Math.round(v / 10) * 10;
  if (mode === "nearest100") return Math.round(v / 100) * 100;
  return v;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PayrollSettings() {
  const [loading, setLoading]       = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accounts, setAccounts]     = useState<Account[]>([]);
  const [isGlobal, setIsGlobal]     = useState(false);
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");

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
      salaryExpenseAccountId:        "",
      defaultSalaryPayableAccountId: "",
      taxPayableAccountId:           "",
      pfPayableAccountId:            "",
      defaultAdvanceAccountId:       "",
      employerPfExpenseAccountId:    "",
      employerPfPayableAccountId:    "",
      festivalBonusExpenseAccountId: "",
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
      standardWorkingDays:     26,
      defaultHouseRentPct:     0,
      defaultMedicalPct:       0,
      defaultTransportPct:     0,
      defaultFoodAllowancePct: 0,
      taxCalculationMethod:    "flat",
      employerPfPct:           0,
      defaultFestivalBonusPct: 0,
      netPayRounding:          "none",
      maxLoanMultiplier: 0,
      maxActiveLoans:    0,
    },
  });

  const absentMode          = watch("absentDeductionMode");
  const taxMethod           = watch("taxCalculationMethod");
  const employerPfPct       = watch("employerPfPct");
  const netPayRounding      = watch("netPayRounding");
  const payFrequency        = watch("payFrequency");

  // Load accounts + saved settings
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingData(true);
        const [accountsResult, settingsResult] = await Promise.all([
          getChartOfAccounts(1, 1000, "", "active"),
          getPayrollSettingsAction(),
        ]);

        if (accountsResult.success) {
          setAccounts(
            accountsResult.accounts.map((a) => ({
              id: a.id, code: a.code, name: a.name, type: a.type as AccountType,
            }))
          );
        }

        if (settingsResult.success && settingsResult.settings) {
          const s = settingsResult.settings;
          setIsGlobal(settingsResult.isGlobal ?? false);
          reset({
            salaryExpenseAccountId:        s.accounts.salaryExpenseAccountId,
            defaultSalaryPayableAccountId: s.accounts.defaultSalaryPayableAccountId,
            taxPayableAccountId:           s.accounts.taxPayableAccountId,
            pfPayableAccountId:            s.accounts.pfPayableAccountId,
            defaultAdvanceAccountId:       s.accounts.defaultAdvanceAccountId,
            employerPfExpenseAccountId:    s.accounts.employerPfExpenseAccountId,
            employerPfPayableAccountId:    s.accounts.employerPfPayableAccountId,
            festivalBonusExpenseAccountId: s.accounts.festivalBonusExpenseAccountId,
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
            standardWorkingDays:     s.calculation.standardWorkingDays,
            defaultHouseRentPct:     s.calculation.defaultHouseRentPct,
            defaultMedicalPct:       s.calculation.defaultMedicalPct,
            defaultTransportPct:     s.calculation.defaultTransportPct,
            defaultFoodAllowancePct: s.calculation.defaultFoodAllowancePct,
            taxCalculationMethod:    s.calculation.taxCalculationMethod,
            employerPfPct:           s.calculation.employerPfPct,
            defaultFestivalBonusPct: s.calculation.defaultFestivalBonusPct,
            netPayRounding:          s.calculation.netPayRounding,
            maxLoanMultiplier: s.policy.maxLoanMultiplier,
            maxActiveLoans:    s.policy.maxActiveLoans,
          });
        }
      } catch {
        setError("Failed to load payroll settings");
      } finally {
        setLoadingData(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-suggest accounts by name keyword matching
  const onAutoSuggest = () => {
    const find = (keywords: string[], types: AccountType[]) =>
      accounts.find(
        (a) => types.includes(a.type) &&
               keywords.some((kw) => a.name.toLowerCase().includes(kw.toLowerCase()))
      )?.id ?? "";

    reset((prev) => ({
      ...prev,
      salaryExpenseAccountId:        find(["salary expense","salaries","wages"], [AccountType.EXPENSE]),
      defaultSalaryPayableAccountId: find(["salary payable","salaries payable","wages payable"], [AccountType.LIABILITY]),
      taxPayableAccountId:           find(["tax payable","income tax","withholding tax"], [AccountType.LIABILITY]),
      pfPayableAccountId:            find(["provident fund","pf payable","employee pf"], [AccountType.LIABILITY]),
      defaultAdvanceAccountId:       find(["advance","loan","employee advance"], [AccountType.LIABILITY, AccountType.ASSET]),
      employerPfExpenseAccountId:    find(["employer pf","employer provident","company pf expense"], [AccountType.EXPENSE]),
      employerPfPayableAccountId:    find(["employer pf payable","company pf payable"], [AccountType.LIABILITY]),
      festivalBonusExpenseAccountId: find(["festival bonus","bonus expense","eid bonus"], [AccountType.EXPENSE]),
    }));
    setSuccess("Suggested accounts populated based on name matching!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const result = await updatePayrollSettings(
        {
          accounts: {
            salaryExpenseAccountId:        data.salaryExpenseAccountId,
            defaultSalaryPayableAccountId: data.defaultSalaryPayableAccountId,
            taxPayableAccountId:           data.taxPayableAccountId,
            pfPayableAccountId:            data.pfPayableAccountId,
            defaultAdvanceAccountId:       data.defaultAdvanceAccountId,
            employerPfExpenseAccountId:    data.employerPfExpenseAccountId,
            employerPfPayableAccountId:    data.employerPfPayableAccountId,
            festivalBonusExpenseAccountId: data.festivalBonusExpenseAccountId,
          },
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
            standardWorkingDays:     data.standardWorkingDays,
            defaultHouseRentPct:     data.defaultHouseRentPct,
            defaultMedicalPct:       data.defaultMedicalPct,
            defaultTransportPct:     data.defaultTransportPct,
            defaultFoodAllowancePct: data.defaultFoodAllowancePct,
            taxCalculationMethod:    data.taxCalculationMethod,
            employerPfPct:           data.employerPfPct,
            defaultFestivalBonusPct: data.defaultFestivalBonusPct,
            netPayRounding:          data.netPayRounding,
          },
          policy: {
            maxLoanMultiplier: data.maxLoanMultiplier,
            maxActiveLoans:    data.maxActiveLoans,
          },
        },
        isGlobal
      );

      if (!result.success) throw new Error(result.error ?? "Failed to save");
      setSuccess(result.isUpdate ? "Payroll settings updated!" : "Payroll settings saved!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" />
          Payroll Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure default accounts, calculation rules, schedule, and compliance settings
          for the payroll engine. Per-employee configurations always take precedence.
        </p>
      </div>

      {/* Info + auto-suggest */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-300">
        <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">How these settings are used</p>
          <p className="mt-1 text-blue-700 dark:text-blue-400">
            Accounts here are used as <strong>defaults</strong> during payroll posting.
            Allowance percentages apply only when an employee has no individual salary structure.
            Employer PF and festival bonus only post if their expense accounts are configured.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAutoSuggest}
          className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300">
          <FiZap className="mr-1 h-3 w-3" /> Auto-suggest
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ================================================================
            CARD 1 — Default Ledger Accounts
        ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SectionBadge n={1} /> Default Ledger Accounts
            </CardTitle>
            <CardDescription>
              Double-entry accounts used when payroll vouchers are posted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2">Employee Payroll</p>
            <AccountRow name="salaryExpenseAccountId" label="Salary Expense" side="DR" sideColor="text-red-600"
              description="Total gross salary cost" types={[AccountType.EXPENSE]}
              icon={<TrendingUp className="h-4 w-4 text-red-500" />}
              accounts={accounts} control={control} errors={errors} />
            <AccountRow name="defaultSalaryPayableAccountId" label="Default Salary Payable" side="CR" sideColor="text-green-600"
              description="Net salary owed to employees (fallback)" types={[AccountType.LIABILITY]}
              icon={<Wallet className="h-4 w-4 text-green-500" />}
              accounts={accounts} control={control} errors={errors} />
            <AccountRow name="taxPayableAccountId" label="Employee Tax Payable" side="CR" sideColor="text-green-600"
              description="Withheld income tax deductions" types={[AccountType.LIABILITY]}
              icon={<ShieldCheck className="h-4 w-4 text-orange-500" />}
              accounts={accounts} control={control} errors={errors} />
            <AccountRow name="pfPayableAccountId" label="Employee PF Payable" side="CR" sideColor="text-green-600"
              description="Employee provident fund deductions withheld" types={[AccountType.LIABILITY]}
              icon={<ShieldCheck className="h-4 w-4 text-purple-500" />}
              accounts={accounts} control={control} errors={errors} />
            <AccountRow name="defaultAdvanceAccountId" label="Default Advance / Loan Account" side="CR" sideColor="text-green-600"
              description="Loan installment deductions (fallback)" types={[AccountType.LIABILITY, AccountType.ASSET]}
              icon={<Banknote className="h-4 w-4 text-blue-500" />}
              accounts={accounts} control={control} errors={errors} />

            <div className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2">Employer Contributions</p>
            </div>
            <AccountRow name="employerPfExpenseAccountId" label="Employer PF Expense" side="DR" sideColor="text-red-600"
              description="Company's PF matching contribution cost (only if Employer PF % > 0)" types={[AccountType.EXPENSE]}
              icon={<Building2 className="h-4 w-4 text-red-400" />}
              accounts={accounts} control={control} errors={errors} />
            <AccountRow name="employerPfPayableAccountId" label="Employer PF Payable" side="CR" sideColor="text-green-600"
              description="Company's PF contribution owed to fund" types={[AccountType.LIABILITY]}
              icon={<Building2 className="h-4 w-4 text-indigo-500" />}
              accounts={accounts} control={control} errors={errors} />
            <AccountRow name="festivalBonusExpenseAccountId" label="Festival Bonus Expense" side="DR" sideColor="text-red-600"
              description="Festival/Eid bonus cost (only posted when bonus run is triggered)" types={[AccountType.EXPENSE]}
              icon={<Gift className="h-4 w-4 text-pink-500" />}
              accounts={accounts} control={control} errors={errors} />
          </CardContent>
        </Card>

        {/* ================================================================
            CARD 2 — Pay Schedule & Calendar
        ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SectionBadge n={2} /> Pay Schedule & Calendar
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
            CARD 3 — Calculation Rules
        ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SectionBadge n={3} /> Calculation Rules
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Absent Deduction Basis</p>
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
                              ? "Daily rate = Basic ÷ total days in month (28–31)"
                              : "Daily rate = Basic ÷ standard working days (below)"}
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
          </CardContent>
        </Card>

        {/* ================================================================
            CARD 4 — Statutory & Compliance
        ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SectionBadge n={4} /> Statutory & Compliance
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
                    Configure the accounts above.
                  </span>
                </div>
              )}
              {errors.employerPfPct && <p className="text-xs text-destructive">{errors.employerPfPct.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            CARD 5 — Festival Bonus & Loan Policy
        ================================================================ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SectionBadge n={5} /> Festival Bonus & Loan Policy
            </CardTitle>
            <CardDescription>
              Default festival bonus rate and company-wide loan limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Festival Bonus */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-muted-foreground" /> Default Festival Bonus (% of Basic)
              </Label>
              <div className="flex items-center gap-2">
                <Input type="number" step="5" min="0" max="200"
                  {...register("defaultFestivalBonusPct", { valueAsNumber: true })} className="w-28" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-pink-50 dark:bg-pink-950/30 border border-pink-200 p-3 text-xs text-pink-800 dark:text-pink-300">
                <FiInfo className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Festival bonus is <strong>only applied</strong> when you explicitly trigger a bonus payroll run
                  (checkbox in Generate Payroll). Regular monthly runs are never affected.
                  Set to 0 to disable.
                </span>
              </div>
              {errors.defaultFestivalBonusPct && <p className="text-xs text-destructive">{errors.defaultFestivalBonusPct.message}</p>}
            </div>

            {/* Loan Policy */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loan / Advance Policy Limits</p>
              <p className="text-xs text-muted-foreground">Set to 0 to disable each limit. These are enforced at the loan application stage.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">Max Loan Amount</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" step="0.5" min="0"
                      {...register("maxLoanMultiplier", { valueAsNumber: true })} className="w-24" />
                    <span className="text-sm text-muted-foreground">× monthly Basic (0 = no limit)</span>
                  </div>
                  {errors.maxLoanMultiplier && <p className="text-xs text-destructive">{errors.maxLoanMultiplier.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Max Active Loans per Employee</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" step="1" min="0" max="50"
                      {...register("maxActiveLoans", { valueAsNumber: true })} className="w-24" />
                    <span className="text-sm text-muted-foreground">loans (0 = no limit)</span>
                  </div>
                  {errors.maxActiveLoans && <p className="text-xs text-destructive">{errors.maxActiveLoans.message}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================================================================
            Footer
        ================================================================ */}
        <div className="pt-2 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isGlobal" checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <Label htmlFor="isGlobal" className="text-sm cursor-pointer font-normal">
              Apply globally (for all users)
            </Label>
          </div>
          <Button type="submit" size="lg" className="w-full md:w-auto" disabled={loading || loadingData}>
            <FiSave className="mr-2" />
            {loading ? "Saving..." : "Save Payroll Settings"}
          </Button>
        </div>
      </form>

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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function SectionBadge({ n }: { n: number }) {
  return (
    <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
      {n}
    </span>
  );
}

interface AccountRowProps {
  name: keyof FormData;
  label: string;
  side: "DR" | "CR";
  sideColor: string;
  description: string;
  types: AccountType[];
  accounts: Account[];
  control: any;
  errors: any;
  icon?: React.ReactNode;
}

const AccountRow = ({
  name, label, side, sideColor, description, types, accounts, control, errors, icon,
}: AccountRowProps) => {
  const options = accounts
    .filter((a) => types.includes(a.type))
    .map((a) => ({ label: `${a.code} – ${a.name}`, value: a.id, description: a.type }));
  const fieldError = errors[name];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-4 py-3 border-b border-dashed border-muted-foreground/20 last:border-0">
      <div className="flex items-start gap-2">
        {icon}
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold font-mono ${sideColor}`}>{side}</span>
            <span className="text-sm font-medium">{label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <div className="md:col-span-2 space-y-1">
        <Controller name={name} control={control} render={({ field }) => (
          <SearchableSelect
            options={options}
            value={(field.value as string) ?? ""}
            onValueChange={field.onChange}
            placeholder="Select account (optional)..."
            searchPlaceholder="Search accounts..."
          />
        )} />
        {fieldError && <p className="text-xs text-destructive">{fieldError.message}</p>}
      </div>
    </div>
  );
};
