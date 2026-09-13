import React from "react";
import { getEmployeeById } from "../_actions/employee.action";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import {
  FiArrowLeft,
  FiEdit,
  FiUser,
  FiMapPin,
  FiPhone,
  FiBriefcase,
  FiDollarSign,
  FiCalendar,
  FiCreditCard,
  FiMail,
  FiAlertTriangle,
  FiBookOpen,
  FiPrinter,
} from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

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
  const employeeStatus = employee.status || "active";

  // Fetch salary structure policy fallback if available
  const defaultPolicy = await prisma.salaryStructurePolicy
    .findFirst({
      include: { employeeType: true },
    })
    .catch(() => null);

  // Calculate salary components based on Policy Resolution Logic
  const grossSalary = employee.salary ? Number(employee.salary) : 0;

  // Fallback defaults: 55% Basic, 26% HR, 5% Med, 4% Transport, 10% Food
  const basicRatio = defaultPolicy?.basicRatio ? Number(defaultPolicy.basicRatio) : 55;
  const houseRentRatio = defaultPolicy?.houseRentRatio ? Number(defaultPolicy.houseRentRatio) : 26;
  const medicalRatio = defaultPolicy?.medicalRatio ? Number(defaultPolicy.medicalRatio) : 5;
  const transportRatio = defaultPolicy?.transportRatio ? Number(defaultPolicy.transportRatio) : 4;
  const foodRatio = defaultPolicy?.foodRatio ? Number(defaultPolicy.foodRatio) : 10;

  const totalPercentage = basicRatio + houseRentRatio + medicalRatio + transportRatio + foodRatio;

  const componentsList = [
    { name: "Basic Salary", percentage: basicRatio, amount: (grossSalary * basicRatio) / 100 },
    { name: "House Rent Allowance", percentage: houseRentRatio, amount: (grossSalary * houseRentRatio) / 100 },
    { name: "Medical Allowance", percentage: medicalRatio, amount: (grossSalary * medicalRatio) / 100 },
    { name: "Transport Allowance", percentage: transportRatio, amount: (grossSalary * transportRatio) / 100 },
    { name: "Food Allowance", percentage: foodRatio, amount: (grossSalary * foodRatio) / 100 },
  ];

  return (
    <PageGuard permissionKey="peoples.employees" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/employees">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/employees/ledger?id=${employee.id}`}>
                <FiBookOpen className="mr-2 h-4 w-4 text-purple-600" />
                View Ledger
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/employees/${employee.id}`}>
                <FiEdit className="mr-2 h-4 w-4" />
                Edit Employee
              </Link>
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Profile & Master Record</CardTitle>
            <CardDescription>Comprehensive details and metadata for {employee.name}</CardDescription>
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
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</label>
                      <p className="text-sm">{employee.gender || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</label>
                      <div className="flex items-center gap-2 text-sm">
                        <FiMail className="text-muted-foreground h-3 w-3" />
                        <span>{employee.email || "-"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</label>
                      <div className="flex items-center gap-2 text-sm">
                        <FiPhone className="text-muted-foreground h-3 w-3" />
                        <span>{employee.phone || "-"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                      <p className="text-sm">
                        {employee.dateOfBirth ? format(new Date(employee.dateOfBirth), "MMM d, yyyy") : "-"}
                      </p>
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
                          <Badge className="bg-emerald-600 font-medium">Active</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked User Account</label>
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
                    <h3 className="font-semibold">Job & Organizational Information</h3>
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
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross Monthly Salary</label>
                      <div className="flex items-center gap-1 text-base font-bold text-primary">
                        <span>৳</span>
                        <span>{grossSalary.toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span>
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
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Warehouse</label>
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
                          "Standard Shift"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown Component Card */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <FiDollarSign className="text-primary" />
                      <h3 className="font-semibold">Salary Structure Breakdown</h3>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      Policy: {defaultPolicy ? defaultPolicy.employeeType.name : "Standard Corporate 100%"}
                    </Badge>
                  </div>

                  {totalPercentage !== 100 && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-amber-800 dark:text-amber-300 text-xs">
                      <FiAlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        Policy ratio warning: Total breakdown percentage is <strong>{totalPercentage}%</strong> (expected 100%).
                      </span>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Salary Component</TableHead>
                          <TableHead className="text-center">Allocation Ratio (%)</TableHead>
                          <TableHead className="text-right">Monthly Amount (BDT)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {componentsList.map((comp, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm">{comp.name}</TableCell>
                            <TableCell className="text-center font-mono text-sm">{comp.percentage.toFixed(2)}%</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-sm">
                              ৳{comp.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/60 font-bold border-t-2">
                          <TableCell className="text-foreground">Total Gross Salary</TableCell>
                          <TableCell className="text-center font-mono text-primary">{totalPercentage.toFixed(2)}%</TableCell>
                          <TableCell className="text-right font-mono text-primary text-base">
                            ৳{grossSalary.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
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
                      <p className="text-sm">{employee.address?.street || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location Details</label>
                      <p className="text-sm">
                        {[employee.address?.city, employee.address?.state, employee.address?.zipCode, employee.address?.country]
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
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Person</label>
                      <p className="text-sm font-medium">{employee.emergencyContact?.name || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Relationship</label>
                      <p className="text-sm">{employee.emergencyContact?.relation || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Emergency Phone</label>
                      <p className="text-sm">{employee.emergencyContact?.phone || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Accounting Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <FiCreditCard className="text-primary" />
                    <h3 className="font-semibold">GL Accounting Mapping</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Salary Payable Account</label>
                      {employee.salaryPayableAccount ? (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <p className="text-sm font-semibold">
                            {employee.salaryPayableAccount.code} - {employee.salaryPayableAccount.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase mt-1">
                            Type: {employee.salaryPayableAccount.type}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Default Payroll Liability Account</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Advance / Loan Account</label>
                      {employee.advanceAccount ? (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <p className="text-sm font-semibold">
                            {employee.advanceAccount.code} - {employee.advanceAccount.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase mt-1">
                            Type: {employee.advanceAccount.type}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Default Employee Advance Asset Account</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Photo & Quick Info (1 column) */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="overflow-hidden border shadow-sm">
                  <div className="aspect-[4/5] relative bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    {employee.photo ? (
                      <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                        <FiUser size={48} />
                        <span className="text-xs text-center font-medium">No Photo Uploaded</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 text-center">
                    <h4 className="font-bold text-lg">{employee.name}</h4>
                    <p className="text-sm text-muted-foreground">{employee.designation || "Staff Member"}</p>
                    <Badge variant="outline" className="mt-2 text-[10px] font-mono uppercase">
                      Code: {employee.employeeCode || employee.id.slice(-6)}
                    </Badge>
                  </CardContent>
                </Card>

                <div className="p-4 rounded-lg border bg-muted/20 space-y-3 text-xs">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground">Metadata Audit</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-mono">{format(new Date(employee.createdAt), "yyyy-MM-dd")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-mono">{format(new Date(employee.updatedAt), "yyyy-MM-dd")}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
