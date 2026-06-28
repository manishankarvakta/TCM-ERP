"use client";

import React, { useTransition, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FiCalendar, FiUser, FiInfo, FiCheck, FiXCircle, FiClock, FiPrinter, FiArrowLeft } from "react-icons/fi";
import { updateResignationStatus } from "../../_actions/resignation.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ResignationStatus } from "@prisma/client";
import { useReactToPrint } from "react-to-print";
import ResignationPrintTemplate from "@/components/hr/print/resignation-print-template";

interface ResignationDetailsClientProps {
  resignation: any;
  permissions: {
    edit: boolean;
    approve: boolean;
  };
}

export default function ResignationDetailsClient({ resignation, permissions }: ResignationDetailsClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Resignation-${resignation.employee.name}`,
  });

  const handleStatusUpdate = async (status: ResignationStatus) => {
    startTransition(async () => {
      const result = await updateResignationStatus(resignation.id, status);
      if (result.success) {
        toast({ title: "Success", description: result.message || `Resignation application marked as ${status}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update status", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: ResignationStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending Approval</Badge>;
      case "MANAGER_APPROVED":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Manager Approved</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Fully Approved & Inactive</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const app = resignation;

  return (
    <div className="space-y-6">
      {/* Print template container (hidden from view, used for print) */}
      <div style={{ display: "none" }}>
        <ResignationPrintTemplate
          ref={componentRef}
          dateText={format(new Date(app.resignDate), "dd/MM/yyyy")}
          employeeName={app.employee.name}
          sectionName={app.employee.department || "-"}
          designation={app.employee.designation || "-"}
          reason={app.reason || ""}
          effectiveDate={format(new Date(app.effectiveDate), "dd/MM/yyyy")}
        />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" className="flex items-center gap-2" onClick={() => router.push("/dashboard/hr/resignation")}>
          <FiArrowLeft className="h-4 w-4" />
          Back to List
        </Button>
        <Button variant="outline" className="flex items-center gap-2" onClick={() => handlePrint()}>
          <FiPrinter className="h-4 w-4" />
          Print Exiting Form
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resignation Details</CardTitle>
                  <CardDescription>Resignation timeline and metadata</CardDescription>
                </div>
                {getStatusBadge(app.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submission Date</label>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-muted-foreground" />
                    <span className="font-semibold">{format(new Date(app.resignDate), "MMMM d, yyyy")}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Effective Release Date</label>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-muted-foreground" />
                    <span className="font-semibold text-lg text-rose-600">{format(new Date(app.effectiveDate), "MMMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Reason for Resignation</label>
                <div className="bg-muted/50 p-4 rounded-lg text-sm text-foreground text-justify leading-relaxed whitespace-pre-wrap">
                  {app.reason || "No reason details provided."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log / History summary */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Submitted By</span>
                <span className="font-semibold">{app.creator.name}</span>
              </div>
              {app.manager && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Reviewed/Approved by Manager</span>
                  <span className="font-semibold">{app.manager.name}</span>
                </div>
              )}
              {app.admin && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Final Approved by Admin</span>
                  <span className="font-semibold">{app.admin.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar details (Employee Profile & Approvals panel) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {app.employee.photo ? (
                  <img src={app.employee.photo} alt={app.employee.name} className="h-12 w-12 rounded-full object-cover border" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center border">
                    <FiUser className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground leading-none">{app.employee.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {app.employee.employeeCode || "N/A"} • {app.employee.designation || ""}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{app.employee.department || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employment Status</span>
                  <span className="font-medium">
                    <Badge variant={app.employee.status === "active" ? "default" : "secondary"}>
                      {app.employee.status}
                    </Badge>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Approval panel */}
          {permissions.approve && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Review and advance this resignation workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.status === "PENDING" && (
                  <>
                    <Button className="w-full flex items-center justify-center gap-2" onClick={() => handleStatusUpdate("MANAGER_APPROVED")} disabled={isPending}>
                      <FiCheck className="h-4 w-4" />
                      Approve as Manager
                    </Button>
                    <Button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleStatusUpdate("APPROVED")} disabled={isPending}>
                      <FiCheck className="h-4 w-4" />
                      Approve as Admin
                    </Button>
                    <Button variant="destructive" className="w-full flex items-center justify-center gap-2" onClick={() => handleStatusUpdate("REJECTED")} disabled={isPending}>
                      <FiXCircle className="h-4 w-4" />
                      Reject Application
                    </Button>
                  </>
                )}

                {app.status === "MANAGER_APPROVED" && (
                  <>
                    <Button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleStatusUpdate("APPROVED")} disabled={isPending}>
                      <FiCheck className="h-4 w-4" />
                      Approve as Admin
                    </Button>
                    <Button variant="destructive" className="w-full flex items-center justify-center gap-2" onClick={() => handleStatusUpdate("REJECTED")} disabled={isPending}>
                      <FiXCircle className="h-4 w-4" />
                      Reject Application
                    </Button>
                  </>
                )}

                {app.status === "APPROVED" && (
                  <Button variant="outline" className="w-full flex items-center justify-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleStatusUpdate("CANCELLED")} disabled={isPending}>
                    <FiXCircle className="h-4 w-4" />
                    Cancel Resignation
                  </Button>
                )}

                {isPending && (
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground py-2 animate-pulse">
                    <FiInfo className="h-4 w-4" />
                    Processing state update...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
