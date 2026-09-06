"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { FiPlus, FiFileText, FiCheck, FiInfo } from "react-icons/fi";
import {
  getActiveEmployeesForSelection,
  createAppointmentLetter,
} from "../_actions/appointment-letter.action";

interface EmployeeOption {
  id: string;
  name: string;
  employeeCode: string | null;
  department: string;
  designation: string;
  employmentType: string;
  joiningDate: string;
  grossSalary: number;
  basicSalary: number;
  houseRent: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  foodAllowance: number;
}

const DEFAULT_TERMS = `1. Probationary Period: The employee will be on probation for the specified period from the date of joining.
2. Duties & Responsibilities: The employee shall perform all duties associated with their designation and follow company policies.
3. Termination & Notice: Either party may terminate employment during probation with 15 days notice, or after confirmation with 30 days notice.
4. Confidentiality: The employee agrees to safeguard all proprietary business information and non-disclosure obligations.`;

interface CreateAppointmentLetterDialogProps {
  onSuccess?: (newLetterId: string) => void;
  trigger?: React.ReactNode;
}

export function CreateAppointmentLetterDialog({
  onSuccess,
  trigger,
}: CreateAppointmentLetterDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");

  // Form Fields
  const [issueDate, setIssueDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [joiningDate, setJoiningDate] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [employmentType, setEmploymentType] = useState<string>("PERMANENT");
  const [grossSalary, setGrossSalary] = useState<number>(0);
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [houseRent, setHouseRent] = useState<number>(0);
  const [medicalAllowance, setMedicalAllowance] = useState<number>(0);
  const [conveyanceAllowance, setConveyanceAllowance] = useState<number>(0);
  const [foodAllowance, setFoodAllowance] = useState<number>(0);
  const [probationMonths, setProbationMonths] = useState<number>(3);
  const [workLocation, setWorkLocation] = useState<string>("Head Office");
  const [termsAndConditions, setTermsAndConditions] =
    useState<string>(DEFAULT_TERMS);

  // Load Active Employees when modal opens
  useEffect(() => {
    if (open) {
      setFetchingEmployees(true);
      getActiveEmployeesForSelection()
        .then((res) => {
          if (res.success && res.employees) {
            setEmployees(res.employees);
          } else {
            toast({
              title: "Error",
              description: res.error || "Failed to load employees",
              variant: "destructive",
            });
          }
        })
        .finally(() => setFetchingEmployees(false));
    }
  }, [open, toast]);

  // Handle Employee Selection and Auto-population
  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmpId(employeeId);
    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      setDesignation(emp.designation || "Staff");
      setDepartment(emp.department || "");
      setEmploymentType(emp.employmentType || "PERMANENT");
      setJoiningDate(emp.joiningDate || new Date().toISOString().split("T")[0]);
      setGrossSalary(emp.grossSalary);
      setBasicSalary(emp.basicSalary);
      setHouseRent(emp.houseRent);
      setMedicalAllowance(emp.medicalAllowance);
      setConveyanceAllowance(emp.conveyanceAllowance);
      setFoodAllowance(emp.foodAllowance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee first.",
        variant: "destructive",
      });
      return;
    }

    if (!issueDate) {
      toast({
        title: "Validation Error",
        description: "Issue date is required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await createAppointmentLetter({
        employeeId: selectedEmpId,
        issueDate,
        joiningDate: joiningDate || undefined,
        designation,
        department: department || undefined,
        employmentType,
        grossSalary,
        probationMonths,
        workLocation,
        termsAndConditions,
      });

      if (res.success && res.id) {
        toast({
          title: "Appointment Letter Created",
          description: `Generated Appointment Letter #${res.letterNumber} successfully.`,
        });
        setOpen(false);
        resetForm();
        router.refresh();
        if (onSuccess) {
          onSuccess(res.id);
        }
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to generate appointment letter",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmpId("");
    setDesignation("");
    setDepartment("");
    setGrossSalary(0);
    setBasicSalary(0);
    setHouseRent(0);
    setMedicalAllowance(0);
    setConveyanceAllowance(0);
    setFoodAllowance(0);
    setProbationMonths(3);
    setWorkLocation("Head Office");
    setTermsAndConditions(DEFAULT_TERMS);
  };

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.name} ${emp.employeeCode ? `(${emp.employeeCode})` : ""} - ${emp.designation || "No Designation"}`,
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <FiPlus className="w-4 h-4" />
            <span>Create Appointment Letter</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FiFileText className="w-5 h-5 text-primary" />
            <span>Generate Appointment Letter</span>
          </DialogTitle>
          <DialogDescription>
            Select an employee to auto-fill their profile, designation, department, and salary breakdown into a formal appointment letter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Select Employee <span className="text-red-500">*</span>
            </Label>
            {fetchingEmployees ? (
              <div className="text-sm text-muted-foreground py-2">Loading active employees...</div>
            ) : (
              <SearchableSelect
                options={employeeOptions}
                value={selectedEmpId}
                onValueChange={(val) => handleEmployeeChange(val || "")}
                placeholder="Search employee by name, code or designation..."
              />
            )}
          </div>

          {selectedEmpId && (
            <>
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Designation</Label>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Designation"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Department"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Employment Type</Label>
                  <Select
                    value={employmentType}
                    onValueChange={setEmploymentType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERMANENT">PERMANENT</SelectItem>
                      <SelectItem value="TEMPORARY">TEMPORARY</SelectItem>
                      <SelectItem value="CONTRACT">CONTRACT</SelectItem>
                      <SelectItem value="INTERN">INTERN</SelectItem>
                      <SelectItem value="DAILY_WORKER">DAILY WORKER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates & Location Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Issue Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Joining Date</Label>
                  <Input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Probation (Months)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={probationMonths}
                    onChange={(e) => setProbationMonths(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Work Location</Label>
                  <Input
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="e.g. Head Office"
                  />
                </div>
              </div>

              {/* Salary Breakdown Summary Card */}
              <div className="space-y-2 p-4 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-900">
                  <div className="flex items-center gap-2">
                    <FiInfo className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      Calculated Salary Breakdown
                    </span>
                  </div>
                  <div className="text-base font-bold text-blue-900 dark:text-blue-100">
                    Gross: BDT {grossSalary.toLocaleString("en-BD")}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-muted-foreground block">Basic Salary</span>
                    <span className="font-semibold">BDT {basicSalary.toLocaleString("en-BD")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">House Rent</span>
                    <span className="font-semibold">BDT {houseRent.toLocaleString("en-BD")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Medical Allowance</span>
                    <span className="font-semibold">BDT {medicalAllowance.toLocaleString("en-BD")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Conveyance</span>
                    <span className="font-semibold">BDT {conveyanceAllowance.toLocaleString("en-BD")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Food Allowance</span>
                    <span className="font-semibold">BDT {foodAllowance.toLocaleString("en-BD")}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Terms & Conditions
                </Label>
                <Textarea
                  rows={4}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Enter terms of employment..."
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedEmpId}>
              {loading ? (
                "Generating..."
              ) : (
                <>
                  <FiCheck className="w-4 h-4 mr-2" />
                  <span>Generate Appointment Letter</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
