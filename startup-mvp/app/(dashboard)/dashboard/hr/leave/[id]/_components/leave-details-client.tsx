"use client";

import React, { useTransition, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FiCalendar, FiUser, FiInfo, FiCheck, FiXCircle, FiClock, FiPrinter } from "react-icons/fi";
import { updateLeaveStatus } from "../../_actions/leave-application.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { LeaveStatus } from "@prisma/client";
import { useReactToPrint } from "react-to-print";
import LeaveApplicationPrintTemplate from "@/components/hr/print/leave-application-print-template";

interface LeaveDetailsClientProps {
  leaveApplication: any;
  permissions: {
    edit: boolean;
  };
}

export default function LeaveDetailsClient({ leaveApplication, permissions }: LeaveDetailsClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `LeaveApplication-${leaveApplication.employee.name}`,
  });

  const handleStatusUpdate = async (status: LeaveStatus) => {
    startTransition(async () => {
      const result = await updateLeaveStatus(leaveApplication.id, status);
      if (result.success) {
        toast({ title: "Success", description: `Leave application marked as ${status}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update status", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending Approval</Badge>;
      case "MANAGER_APPROVED":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Manager Approved</Badge>;
      case "HR_APPROVED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Fully Approved (HR)</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const app = leaveApplication;

  return (
    <div className="space-y-6">
      {/* Hidden printable template */}
      <div style={{ display: "none" }}>
        <LeaveApplicationPrintTemplate
          ref={componentRef}
          cardNoOrDept={app.employee.department || "-"}
          employeeName={app.employee.name}
          designation={app.employee.designation || "-"}
          reason={app.reason || ""}
          dateText={
            format(new Date(app.startDate), "dd/MM/yyyy") === format(new Date(app.endDate), "dd/MM/yyyy")
              ? format(new Date(app.startDate), "dd/MM/yyyy")
              : `${format(new Date(app.startDate), "dd/MM/yyyy")} হতে ${format(new Date(app.endDate), "dd/MM/yyyy")}`
          }
          daysCount={`${app.totalDays}`}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" className="flex items-center gap-2" onClick={() => handlePrint()}>
          <FiPrinter className="h-4 w-4" />
          Print Leave Application
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Leave Information</CardTitle>
                <CardDescription>Request details and duration</CardDescription>
              </div>
              {getStatusBadge(app.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Leave Type</label>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{app.leaveType.name}</span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {app.leaveType.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Duration</label>
                <div className="flex items-center gap-2">
                  <FiClock className="text-muted-foreground" />
                  <span className="font-semibold text-lg">{app.totalDays} {app.totalDays > 1 ? "Days" : "Day"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</label>
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-muted-foreground" />
                  <span>{format(new Date(app.startDate), "MMMM d, yyyy")}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</label>
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-muted-foreground" />
                  <span>{format(new Date(app.endDate), "MMMM d, yyyy")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason for Leave</label>
              <div className="p-4 rounded-lg bg-muted/30 border italic text-sm">
                {app.reason || "No reason provided."}
              </div>
            </div>
          </CardContent>
        </Card>

        {permissions.edit && app.status !== "HR_APPROVED" && app.status !== "REJECTED" && app.status !== "CANCELLED" && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Approval Actions</CardTitle>
              <CardDescription>Review and take action on this leave request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {app.status === "PENDING" && (
                  <Button 
                    onClick={() => handleStatusUpdate("MANAGER_APPROVED")} 
                    disabled={isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Approve as Manager
                  </Button>
                )}
                
                {(app.status === "PENDING" || app.status === "MANAGER_APPROVED") && (
                  <Button 
                    onClick={() => handleStatusUpdate("HR_APPROVED")} 
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Final Approval (HR)
                  </Button>
                )}

                <Button 
                  variant="destructive" 
                  onClick={() => handleStatusUpdate("REJECTED")} 
                  disabled={isPending}
                >
                  <FiXCircle className="mr-2 h-4 w-4" />
                  Reject Request
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employee</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {app.employee.photo ? (
                  <img src={app.employee.photo} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  app.employee.name.charAt(0)
                )}
              </div>
              <div>
                <div className="font-bold">{app.employee.name}</div>
                <div className="text-xs text-muted-foreground">{app.employee.employeeCode}</div>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{app.employee.department || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Designation:</span>
                <span className="font-medium">{app.employee.designation || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FiInfo className="h-4 w-4 text-muted-foreground" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <FiUser className="mt-1 h-3 w-3 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Applied By</div>
                  <div className="font-medium">{app.creator?.name || "System"}</div>
                  <div className="text-[10px] text-muted-foreground">{format(new Date(app.createdAt), "MMM d, yyyy HH:mm")}</div>
                </div>
              </div>

              {app.manager && (
                <div className="flex items-start gap-3 text-sm border-t pt-3">
                  <FiCheck className="mt-1 h-3 w-3 text-blue-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Manager Approval</div>
                    <div className="font-medium">{app.manager.name}</div>
                  </div>
                </div>
              )}

              {app.hr && (
                <div className="flex items-start gap-3 text-sm border-t pt-3">
                  <FiCheck className="mt-1 h-3 w-3 text-emerald-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">HR Approval</div>
                    <div className="font-medium">{app.hr.name}</div>
                  </div>
                </div>
              )}

              {app.status === "REJECTED" && (
                <div className="flex items-start gap-3 text-sm border-t pt-3">
                  <FiXCircle className="mt-1 h-3 w-3 text-destructive" />
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="font-medium text-destructive">Rejected</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}
