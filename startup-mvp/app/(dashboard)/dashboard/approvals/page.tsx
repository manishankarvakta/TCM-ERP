import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listApprovalRequestsAction } from "@/app/actions/crm/approval-operations.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle, FiPlus, FiArrowRight, FiShield } from "react-icons/fi";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let requests: any[] = [];
  try {
    requests = await listApprovalRequestsAction();
  } catch (err) {
    console.error("Failed to load approval requests:", err);
  }

  const pendingCount = requests.filter((r) => r.status === "IN_PROGRESS" || r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;
  const staleCount = requests.filter((r) => r.status === "STALE").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FiShield className="h-6 w-6 text-primary" />
            Central Approval Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Canonical, tenant-safe approval workflow governance for ERP completion handoffs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings/approval-policies">
            <Button variant="outline" size="sm">
              Workflow Policies
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 bg-card/60 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Pending / In Progress
              <FiClock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-2xl font-extrabold text-foreground">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting step decisions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-card/60 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Fully Approved
              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-2xl font-extrabold text-foreground">{approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Canonical sign-offs completed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 bg-card/60 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Rejected
              <FiXCircle className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-2xl font-extrabold text-foreground">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Rejected by approvers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-card/60 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              Stale / Invalidated
              <FiAlertTriangle className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-2xl font-extrabold text-foreground">{staleCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Source data modified post-approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Approval Requests Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border/40 py-4">
          <CardTitle className="text-base font-semibold">Approval Requests</CardTitle>
          <CardDescription>
            Authoritative approval instances across Creative, Marketing, Development, and QA/UAT handoffs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FiShield className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No approval requests created yet.</p>
              <p className="text-xs mt-1 text-muted-foreground/80">
                Approval requests are automatically generated when completed ERP handoffs are submitted.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border/40">
                    <th className="py-3 px-4 font-semibold">Request #</th>
                    <th className="py-3 px-4 font-semibold">Source Type</th>
                    <th className="py-3 px-4 font-semibold">Title</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Requested By</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {requests.map((req) => {
                    let statusBadge = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
                    if (req.status === "APPROVED") {
                      statusBadge = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
                    } else if (req.status === "REJECTED") {
                      statusBadge = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
                    } else if (req.status === "IN_PROGRESS" || req.status === "PENDING") {
                      statusBadge = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                    } else if (req.status === "STALE") {
                      statusBadge = "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
                    }

                    return (
                      <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{req.requestNumber}</td>
                        <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{req.sourceType}</td>
                        <td className="py-3 px-4 font-medium">{req.title}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {req.RequestedBy?.name || req.RequestedBy?.email || "System"}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/dashboard/approvals/${req.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary">
                              View <FiArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
