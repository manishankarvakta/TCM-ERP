import React from "react";
import { getEmployeeById } from "../_actions/employee.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiEdit, FiUser, FiMapPin, FiPhone, FiBriefcase, FiDollarSign, FiCalendar, FiCreditCard, FiMail, FiPrinter, FiBook } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";
import { prisma } from "@/lib/prisma";
import PrintIdCardDialog from "../_components/print-id-card-dialog";
import ExportSingleAttendance from "../_components/export-single-attendance";
import { serializeDecimalAndDate } from "@/lib/utils/serialization";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function getEmployeeDutyStatus(attendanceLogs?: { timestamp: Date | string }[]): boolean {
  if (!attendanceLogs || attendanceLogs.length === 0) return false;

  const latestPunch = new Date(attendanceLogs[0].timestamp);
  const now = new Date();

  // If latest punch is older than 14 hours, they are automatically off duty
  const hoursSinceLatest = (now.getTime() - latestPunch.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLatest > 14) {
    return false;
  }

  // If we only have 1 punch and it's within 14 hours, they are on duty
  if (attendanceLogs.length === 1) {
    return true;
  }

  // If we have 2 punches, check if they occurred on the same calendar date
  const prevPunch = new Date(attendanceLogs[1].timestamp);
  
  const latestDateString = latestPunch.getFullYear() + "-" + latestPunch.getMonth() + "-" + latestPunch.getDate();
  const prevDateString = prevPunch.getFullYear() + "-" + prevPunch.getMonth() + "-" + prevPunch.getDate();

  if (latestDateString === prevDateString) {
    // Both punches are on the same day -> Even count -> Checked out
    return false;
  }

  // Punches are on different days -> Latest punch is the start of a new day -> Checked in
  return true;
}

interface EmployeeDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function EmployeeDetailsPage({ searchParams }: EmployeeDetailsPageProps) {
  const params = await searchParams;
  const employeeId = params.id;

  if (!employeeId) {
    notFound();
  }

  const result = await getEmployeeById(employeeId);

  if (!result.success || !result.employee) {
    notFound();
  }

  const employee = result.employee;
  const salaryStructure = (result as any).salaryStructure;
  const employeeStatus = employee.status || "active";

  const orgInfo = await prisma.organization.findFirst({
    where: { status: "active" }
  });

  const session = await auth();
  const userId = session?.user?.id;
  const canViewLedger = userId ? await hasPermission(userId, "peoples.employees", "ledger") : false;

  return (
    <PageGuard permissionKey="peoples.employees" requiredOperation="view">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/employees">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Link>
        </Button>
        <div className="flex gap-2">
          {canViewLedger && (
            <Button variant="outline" asChild className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary">
              <Link href={`/dashboard/employees/ledger?id=${employee.id}`}>
                <FiBook className="mr-2 h-4 w-4" />
                Employee Ledger
              </Link>
            </Button>
          )}
          <PrintIdCardDialog
            employee={serializeDecimalAndDate(employee)}
            orgInfo={serializeDecimalAndDate(orgInfo)}
          />
          <ExportSingleAttendance
            employeeId={employee.id}
            employeeName={employee.name}
          />
          <Button asChild>
            <Link href={`/dashboard/employees/${employee.id}`}>
              <FiEdit className="mr-2 h-4 w-4" />
              Edit Employee
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>View complete information about this employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Side - Details (3 columns) */}
            <div className="lg:col-span-3 space-y-8">
              {/* Employee Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiUser className="text-primary" />
                  <h3 className="font-semibold">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Row 1: Code, Name, Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee Code</label>
                    <p className="text-sm font-mono font-medium bg-muted/50 px-2 py-1 rounded inline-block">
                      {employee.employeeCode || "-"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                    <p className="text-sm font-semibold text-foreground">{employee.name}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</label>
                    <div className="flex items-center gap-2 text-sm">
                      <FiMail className="text-muted-foreground h-3 w-3" />
                      <span>{employee.email || "-"}</span>
                    </div>
                  </div>

                  {/* Row 2: Phone, National ID, Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</label>
                    <div className="flex items-center gap-2 text-sm">
                      <FiPhone className="text-muted-foreground h-3 w-3" />
                      <span>{employee.phone || "-"}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">National ID / Passport</label>
                    <p className="text-sm">{employee.nationalId || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                    <div>
                      {employeeStatus === "inactive" ? (
                        <Badge variant="secondary" className="font-medium">Inactive</Badge>
                      ) : (
                        <Badge variant="default" className="font-medium">Active</Badge>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Gender, Blood Group, Date of Birth */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</label>
                    <p className="text-sm">{employee.gender || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Blood Group</label>
                    <p className="text-sm font-semibold text-indigo-700">{employee.bloodGroup || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                    <p className="text-sm">
                      {employee.dateOfBirth ? format(new Date(employee.dateOfBirth), "MMM d, yyyy") : "-"}
                    </p>
                  </div>

                  {/* Row 4: Linked User */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked User</label>
                    <p className="text-sm text-muted-foreground">
                      {employee.user ? (
                        <span className="font-medium text-foreground">{employee.user.name || employee.user.email}</span>
                      ) : (
                        "Not linked"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Job Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiBriefcase className="text-primary" />
                  <h3 className="font-semibold">Job Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Designation</label>
                    <p className="text-sm font-medium">{employee.designation || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</label>
                    <p className="text-sm">{employee.department || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Salary</label>
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <span>৳</span>
                      <span>{employee.salary ? Number(employee.salary).toLocaleString() : "0.00"}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Joining Date</label>
                    <div className="flex items-center gap-2 text-sm">
                      <FiCalendar className="text-muted-foreground h-3 w-3" />
                      <span>{employee.joiningDate ? format(new Date(employee.joiningDate), "MMM d, yyyy") : "-"}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Warehouse</label>
                    <p className="text-sm">{employee.warehouse?.name || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Shift</label>
                    <p className="text-sm font-medium">
                      {(employee as any).shift ? (
                        <span>
                          {(employee as any).shift.name} ({(employee as any).shift.startTime} - {(employee as any).shift.endTime})
                        </span>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
                    <p className="text-sm">{(employee as any).type || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Biometric Device ID</label>
                    <p className="text-sm font-medium">{(employee as any).biometricDeviceId || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiMapPin className="text-primary" />
                  <h3 className="font-semibold">Address Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Street Address</label>
                    <p className="text-sm">{(employee.address as any)?.street || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</label>
                    <p className="text-sm">
                      {[(employee.address as any)?.city, (employee.address as any)?.state, (employee.address as any)?.zipCode, (employee.address as any)?.country]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiPhone className="text-primary" />
                  <h3 className="font-semibold">Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Name</label>
                    <p className="text-sm font-medium">{(employee.emergencyContact as any)?.name || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Relation</label>
                    <p className="text-sm">{(employee.emergencyContact as any)?.relation || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</label>
                    <p className="text-sm">{(employee.emergencyContact as any)?.phone || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Nominee Section */}
              {employee.nominee && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FiUser className="text-primary" />
                    <h3 className="font-semibold">Nominee Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nominee Name</label>
                      <p className="text-sm font-medium">{(employee.nominee as any)?.name || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</label>
                      <p className="text-sm">{(employee.nominee as any)?.phone || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</label>
                      <p className="text-sm">{(employee.nominee as any)?.address || "-"}</p>
                    </div>
                  </div>
                  {(employee.nominee as any)?.photos && (employee.nominee as any).photos.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photos</label>
                      <div className="flex flex-wrap gap-4 mt-1">
                        {(employee.nominee as any).photos.map((photo: string, idx: number) => (
                          <div key={idx} className="relative h-20 w-20 rounded overflow-hidden border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo} alt={`Nominee ${idx + 1}`} className="object-cover w-full h-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accounting Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiCreditCard className="text-primary" />
                  <h3 className="font-semibold">Accounting Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Salary Payable Account</label>
                    {employee.salaryPayableAccount ? (
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <p className="text-sm font-medium">
                          {employee.salaryPayableAccount.code} - {employee.salaryPayableAccount.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">
                          Type: {employee.salaryPayableAccount.type}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">-</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Advance Account</label>
                    {employee.advanceAccount ? (
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <p className="text-sm font-medium">
                          {employee.advanceAccount.code} - {employee.advanceAccount.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase mt-1">
                          Type: {employee.advanceAccount.type}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">-</p>
                    )}
                </div>
              </div>
            </div>

            {/* Salary Structure Breakdown Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FiDollarSign className="text-primary" />
                  <h3 className="font-semibold">Salary Structure Breakdown</h3>
                </div>

                {!employee.salary || Number(employee.salary) === 0 ? (
                  <div className="p-4 text-sm rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/25">
                    Salary not configured for this employee.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-lg border bg-muted/20">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-medium">Structure Policy</span>
                        <p className="text-sm font-semibold">{salaryStructure?.name || "Fallback"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {salaryStructure?.isFallback 
                            ? "Using hardcoded fallback policy (55/26/5/4/10)"
                            : !employee.employeeType?.salaryStructurePolicyId
                            ? "Using active default company policy"
                            : "Using assigned employee type policy"
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-medium">Gross Salary</span>
                        <p className="text-sm font-semibold text-primary">
                          ৳{Number(employee.salary).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                        </p>
                      </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="text-left p-3 font-medium text-muted-foreground">Salary Component</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">Percentage</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">Amount (BDT)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr>
                            <td className="p-3 font-medium">Basic Salary</td>
                            <td className="text-right p-3 text-muted-foreground">{salaryStructure.basicPercent}%</td>
                            <td className="text-right p-3 font-mono font-medium">
                              ৳{((Number(employee.salary) * salaryStructure.basicPercent) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">House Rent</td>
                            <td className="text-right p-3 text-muted-foreground">{salaryStructure.houseRentPercent}%</td>
                            <td className="text-right p-3 font-mono font-medium">
                              ৳{((Number(employee.salary) * salaryStructure.houseRentPercent) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">Medical Allowance</td>
                            <td className="text-right p-3 text-muted-foreground">{salaryStructure.medicalPercent}%</td>
                            <td className="text-right p-3 font-mono font-medium">
                              ৳{((Number(employee.salary) * salaryStructure.medicalPercent) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">Transport Allowance</td>
                            <td className="text-right p-3 text-muted-foreground">{salaryStructure.transportPercent}%</td>
                            <td className="text-right p-3 font-mono font-medium">
                              ৳{((Number(employee.salary) * salaryStructure.transportPercent) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-medium">Food Allowance</td>
                            <td className="text-right p-3 text-muted-foreground">{salaryStructure.foodPercent}%</td>
                            <td className="text-right p-3 font-mono font-medium">
                              ৳{((Number(employee.salary) * salaryStructure.foodPercent) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-muted/30 border-t font-semibold">
                            <td className="p-3">Base Gross Salary</td>
                            <td className="text-right p-3">
                              {salaryStructure.basicPercent + salaryStructure.houseRentPercent + salaryStructure.medicalPercent + salaryStructure.transportPercent + salaryStructure.foodPercent}%
                            </td>
                            <td className="text-right p-3 font-mono text-primary">
                              ৳{Number(employee.salary).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Safe Percentage Warning */}
                    {Math.abs((salaryStructure.basicPercent + salaryStructure.houseRentPercent + salaryStructure.medicalPercent + salaryStructure.transportPercent + salaryStructure.foodPercent) - 100) > 0.01 && (
                      <div className="p-3 text-xs rounded-lg bg-red-500/10 text-red-500 border border-red-500/25">
                        Warning: The total percentage of the salary structure components equals {salaryStructure.basicPercent + salaryStructure.houseRentPercent + salaryStructure.medicalPercent + salaryStructure.transportPercent + salaryStructure.foodPercent}%, which is not exactly 100%. Please review the policy mappings.
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground italic">
                      “This breakdown is generated from the assigned salary structure. Payroll uses the same structure during payroll generation.”
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Photo & Quick Actions (1 column) */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="overflow-hidden max-w-[200px] mx-auto">
                <div className="aspect-[4/5] relative bg-muted flex items-center justify-center">
                  {/* Status Indicator Overlaid on Photo */}
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-border/50">
                    <span className={`w-2 h-2 rounded-full ${
                      getEmployeeDutyStatus((employee as any).attendanceLogs)
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-muted-foreground/30"
                    }`} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      {getEmployeeDutyStatus((employee as any).attendanceLogs) ? "ON" : "OFF"}
                    </span>
                  </div>

                  {employee.photo ? (
                    <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                      <FiUser size={32} />
                      <span className="text-[10px] text-center">No Photo Available</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h4 className="font-bold text-lg">{employee.name}</h4>
                    <p className="text-sm text-muted-foreground">{employee.designation || "Employee"}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 rounded-lg border bg-muted/20 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Info</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{format(new Date(employee.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="font-medium">{format(new Date(employee.updatedAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Placeholders */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>Employee ledger transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>Historical payroll records</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>
      </div>
    </PageGuard>
  );
}

