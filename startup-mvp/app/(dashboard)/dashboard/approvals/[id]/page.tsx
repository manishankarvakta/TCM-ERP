import React from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getApprovalRequestAction, approveApprovalStepAction, rejectApprovalStepAction } from "@/app/actions/crm/approval-operations.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiShield, FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle, FiUser, FiCalendar, FiLock } from "react-icons/fi";

export default async function ApprovalDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const requestId = params.id;
  let request: any = null;

  try {
    request = await getApprovalRequestAction(requestId);
  } catch (err) {
    console.error("Error loading approval request:", err);
  }

  if (!request) {
    notFound();
  }

  // Handle server actions for decision
  async function handleApprove(formData: FormData) {
    "use server";
    const stepId = formData.get("stepInstanceId") as string;
    const comment = formData.get("comment") as string;
    if (stepId) {
      await approveApprovalStepAction(stepId, comment);
    }
  }

  async function handleReject(formData: FormData) {
    "use server";
    const stepId = formData.get("stepInstanceId") as string;
    const comment = formData.get("comment") as string;
    if (stepId) {
      await rejectApprovalStepAction(stepId, comment);
    }
  }

  const currentUserId = session.user.id;
  const isAdmin = session.user.role?.toLowerCase() === "admin";

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back Button & Header */}
      <div>
        <Link href="/dashboard/approvals" className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-3">
          <FiArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Approvals
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                {request.requestNumber}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground">{request.title}</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{request.description || "Authoritative Approval Workflow Request"}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                request.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : request.status === "REJECTED"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : request.status === "STALE"
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {request.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stale Warning Banner */}
      {request.status === "STALE" && (
        <div className="p-4 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/40 dark:border-orange-800 text-orange-900 dark:text-orange-200 text-sm flex items-start gap-3">
          <FiAlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Approval Invalidated (STALE)</p>
            <p className="text-xs mt-0.5 text-orange-800 dark:text-orange-300">
              {request.staleReason || "Source data was modified after approval instantiation. Prior decisions are no longer authoritative."}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Context & Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Request Context */}
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold">Request Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <p className="text-muted-foreground font-medium">Source Type</p>
              <p className="font-mono text-foreground font-semibold mt-0.5">{request.sourceType}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Source ID</p>
              <p className="font-mono text-foreground mt-0.5 truncate">{request.sourceId}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Requested By</p>
              <p className="text-foreground font-medium mt-0.5">{request.RequestedBy?.name || request.RequestedBy?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Requested Date</p>
              <p className="text-foreground mt-0.5">{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "N/A"}</p>
            </div>
            {request.completedAt && (
              <div>
                <p className="text-muted-foreground font-medium">Completed Date</p>
                <p className="text-foreground mt-0.5">{new Date(request.completedAt).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Col: Step Timeline & Actions */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold">Approval Chain & Decisions</CardTitle>
              <CardDescription className="text-xs">Ordered policy step progression and decision audit timeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {request.StepInstances?.map((step: any) => {
                const isCurrentStep = step.status === "IN_PROGRESS";
                const isUserDesignated = step.Approvers?.some((a: any) => a.approverUserId === currentUserId) || isAdmin;

                return (
                  <div key={step.id} className="border border-border/50 rounded-lg p-4 bg-card/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground font-mono text-xs flex items-center justify-center font-bold">
                          {step.sequence}
                        </span>
                        <span className="font-semibold text-sm text-foreground">{step.nameSnapshot}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {step.approvalMode}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          step.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : step.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : step.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>

                    {/* Approvers */}
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <FiUser className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Designated Approvers:</span>
                      <span className="text-foreground font-medium">
                        {step.Approvers?.map((a: any) => a.ApproverUser?.name || a.ApproverUser?.email).join(", ") || "Management"}
                      </span>
                    </div>

                    {/* Existing Decisions */}
                    {step.Decisions && step.Decisions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Recorded Decisions:</p>
                        {step.Decisions.map((d: any) => (
                          <div key={d.id} className="text-xs bg-muted/30 p-2 rounded flex items-start justify-between">
                            <div>
                              <span className="font-semibold">{d.ApproverUser?.name || d.ApproverUser?.email}</span>
                              <span
                                className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  d.decision === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {d.decision}
                              </span>
                              {d.comment && <p className="text-muted-foreground mt-1 italic">&quot;{d.comment}&quot;</p>}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(d.decidedAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Form for Active Step */}
                    {isCurrentStep && request.status !== "STALE" && (
                      <div className="mt-4 pt-3 border-t border-border/40 bg-muted/20 p-3 rounded-lg">
                        {isUserDesignated ? (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <FiShield className="h-4 w-4 text-primary" /> Render Decision for Step {step.sequence}
                            </p>
                            <div className="flex gap-2">
                              <form action={handleApprove} className="flex-1 flex gap-2">
                                <input type="hidden" name="stepInstanceId" value={step.id} />
                                <input
                                  type="text"
                                  name="comment"
                                  placeholder="Optional approval comment..."
                                  className="w-full text-xs px-3 py-1.5 rounded border border-border bg-background"
                                />
                                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                                  Approve
                                </Button>
                              </form>
                              <form action={handleReject}>
                                <input type="hidden" name="stepInstanceId" value={step.id} />
                                <Button type="submit" variant="destructive" size="sm" className="shrink-0">
                                  Reject
                                </Button>
                              </form>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                            <FiLock className="h-3.5 w-3.5" /> Awaiting decision from designated step approvers.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
