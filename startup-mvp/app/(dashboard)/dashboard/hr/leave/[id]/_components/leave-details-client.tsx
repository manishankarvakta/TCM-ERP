"use client";

import React, { useTransition, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { FiCalendar, FiUser, FiInfo, FiCheck, FiXCircle, FiClock, FiPrinter, FiPaperclip, FiEye, FiDownload, FiFileText, FiImage, FiExternalLink, FiUploadCloud } from "react-icons/fi";
import { updateLeaveStatus, updateLeaveAttachment } from "../../_actions/leave-application.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { LeaveStatus } from "@prisma/client";
import { useReactToPrint } from "react-to-print";
import LeaveApplicationPrintTemplate from "@/components/hr/print/leave-application-print-template";

interface LeaveDetailsClientProps {
  leaveApplication: any;
  organization?: any;
  permissions: {
    edit: boolean;
    approveManager?: boolean;
    approveHR?: boolean;
    reject?: boolean;
  };
}

export default function LeaveDetailsClient({ leaveApplication, organization, permissions }: LeaveDetailsClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  const canApproveManager = permissions.approveManager ?? permissions.edit;
  const canApproveHR = permissions.approveHR ?? permissions.edit;
  const canReject = permissions.reject ?? permissions.edit;
  const hasAnyApprovalAction = canApproveManager || canApproveHR || canReject;

  const app = leaveApplication;
  const attachmentUrl = app.attachmentUrl;

  const isImage = attachmentUrl && /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(attachmentUrl);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `LeaveApplication-${app.employee.name}`,
  });

  const handleStatusUpdate = async (status: LeaveStatus) => {
    startTransition(async () => {
      const result = await updateLeaveStatus(app.id, status);
      if (result.success) {
        toast({ title: "Success", description: `Leave application marked as ${status}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update status", variant: "destructive" });
      }
    });
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("directory", "leave-attachments");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.url) {
        const updateRes = await updateLeaveAttachment(app.id, json.url);
        if (updateRes.success) {
          toast({ title: "Success", description: "Attachment updated successfully." });
          router.refresh();
        } else {
          throw new Error(updateRes.error || "Failed to link attachment.");
        }
      } else {
        throw new Error(json.error || "File upload failed.");
      }
    } catch (err) {
      console.error("Attachment upload error:", err);
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
          organization={organization}
          signatures={{
            applicantName: app.employee.name,
            supervisorName: app.manager?.name || null,
            hrAdminName: app.hr?.name || null,
            managingDirectorName: null,
          }}
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

          {/* Attachment Card & Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FiPaperclip className="h-5 w-5 text-primary" />
                  Attachment & Supporting Document
                </CardTitle>
                {permissions.edit && (
                  <label className="cursor-pointer">
                    <Input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      disabled={isUploading}
                      onChange={handleAttachmentUpload}
                    />
                    <Button variant="outline" size="sm" asChild disabled={isUploading}>
                      <span>
                        <FiUploadCloud className="mr-2 h-4 w-4" />
                        {attachmentUrl ? "Replace Attachment" : "Attach File"}
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {attachmentUrl ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div 
                      className="h-24 w-24 rounded-lg border bg-background flex items-center justify-center overflow-hidden cursor-pointer shadow-sm relative group flex-shrink-0"
                      onClick={() => setModalOpen(true)}
                    >
                      {isImage ? (
                        <>
                          <img src={attachmentUrl} alt="Attachment Thumbnail" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <FiEye className="h-6 w-6" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-primary">
                          <FiFileText className="h-8 w-8" />
                          <span className="text-[10px] uppercase font-bold">Document</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        {isImage ? <FiImage className="h-4 w-4 text-emerald-600" /> : <FiFileText className="h-4 w-4 text-blue-600" />}
                        <h4 className="font-semibold text-sm truncate max-w-[260px]">
                          {attachmentUrl.split('/').pop()}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click the image or full view button to open high-resolution preview.
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                        <Button variant="default" size="sm" onClick={() => setModalOpen(true)}>
                          <FiEye className="mr-2 h-4 w-4" />
                          Full View
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                            <FiExternalLink className="mr-2 h-4 w-4" />
                            Open Link
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Full View Dialog Modal */}
                  <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
                      <DialogHeader className="pb-3 border-b">
                        <DialogTitle className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-2 text-lg">
                            <FiPaperclip className="h-5 w-5 text-primary" />
                            Document Preview - {app.employee.name}
                          </span>
                          <Button variant="outline" size="sm" asChild className="mr-6">
                            <a href={attachmentUrl} download target="_blank" rel="noopener noreferrer">
                              <FiDownload className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        </DialogTitle>
                      </DialogHeader>

                      <div className="flex-1 overflow-auto py-4 flex items-center justify-center bg-black/5 rounded-lg min-h-[350px]">
                        {isImage ? (
                          <img 
                            src={attachmentUrl} 
                            alt="Full View Attachment" 
                            className="max-h-[70vh] w-auto max-w-full object-contain rounded-md shadow-md" 
                          />
                        ) : (
                          <iframe 
                            src={attachmentUrl} 
                            title="Document Viewer" 
                            className="w-full h-[65vh] rounded-md border" 
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed rounded-lg bg-muted/10">
                  <FiPaperclip className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No document or photo attached to this leave application.</p>
                  {permissions.edit && (
                    <p className="text-xs text-muted-foreground mt-1">Use the "Attach File" button above to upload a document.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {hasAnyApprovalAction && app.status !== "HR_APPROVED" && app.status !== "REJECTED" && app.status !== "CANCELLED" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Approval Actions</CardTitle>
                <CardDescription>Review and take action on this leave request</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {canApproveManager && app.status === "PENDING" && (
                    <Button 
                      onClick={() => handleStatusUpdate("MANAGER_APPROVED")} 
                      disabled={isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <FiCheck className="mr-2 h-4 w-4" />
                      Approve as Manager
                    </Button>
                  )}
                  
                  {canApproveHR && (app.status === "PENDING" || app.status === "MANAGER_APPROVED") && (
                    <Button 
                      onClick={() => handleStatusUpdate("HR_APPROVED")} 
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <FiCheck className="mr-2 h-4 w-4" />
                      Final Approval (HR)
                    </Button>
                  )}

                  {canReject && (
                    <Button 
                      variant="destructive" 
                      onClick={() => handleStatusUpdate("REJECTED")} 
                      disabled={isPending}
                    >
                      <FiXCircle className="mr-2 h-4 w-4" />
                      Reject Request
                    </Button>
                  )}
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
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl overflow-hidden">
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
