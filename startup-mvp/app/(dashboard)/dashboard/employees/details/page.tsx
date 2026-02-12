import React from "react";
import { getEmployeeById } from "../_actions/employee.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiEdit } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/employees">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/dashboard/employees/${employee.id}`}>
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Employee
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>View complete information about this employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Side - Details (3 columns) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Employee Information Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Employee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Employee Code</label>
                    <p className="text-sm font-medium">{employee.employeeCode || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm font-medium">{employee.name}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{employee.email || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm">{employee.phone || "-"}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div>
                      {employeeStatus === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Linked User</label>
                    <p className="text-sm">
                      {employee.user ? (
                        `${employee.user.name || employee.user.email} (${employee.user.email})`
                      ) : (
                        "Not linked"
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="text-sm">{format(new Date(employee.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm">{format(new Date(employee.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </div>
              </div>

              {/* Accounting Fields Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Accounting Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Salary Payable Account</label>
                    {employee.salaryPayableAccount ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {employee.salaryPayableAccount.code} - {employee.salaryPayableAccount.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: {employee.salaryPayableAccount.type}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">-</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Advance Account</label>
                    {employee.advanceAccount ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {employee.advanceAccount.code} - {employee.advanceAccount.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: {employee.advanceAccount.type}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">-</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Reserved for future use (1 column) */}
            <div className="lg:col-span-1">
              {/* Reserved space for future features */}
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
  );
}

