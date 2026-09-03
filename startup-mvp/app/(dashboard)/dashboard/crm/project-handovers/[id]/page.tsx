import React from "react";
import Link from "next/link";
import {
  getProjectHandover,
  submitProjectHandover,
  acceptProjectHandover,
  rejectProjectHandover,
  createProjectFromHandover,
} from "@/app/actions/crm/project-handover.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Layers,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  FolderPlus,
  Send,
  XCircle,
  FileText,
  User,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectHandoverDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { success, handover, error } = await getProjectHandover(id);

  if (!success || !handover) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link href="/dashboard/crm/project-handovers">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Handovers
          </Button>
        </Link>
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{error || "Project Handover not found"}</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">DRAFT</Badge>;
      case "SUBMITTED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">SUBMITTED</Badge>;
      case "ACCEPTED":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">ACCEPTED</Badge>;
      case "PROJECT_CREATED":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">PROJECT CREATED</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">REJECTED</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-300">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div>
        <Link href="/dashboard/crm/project-handovers">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Project Handovers
          </Button>
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{handover.handoverNumber}</h1>
            {getStatusBadge(handover.status)}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
            <span>Service Sale Ref: {handover.sourceServiceSaleNumberSnapshot}</span>
            <span>•</span>
            <span>Agreement Ref: {handover.sourceAgreementNumberSnapshot} (v{handover.agreementVersionSnapshot})</span>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {handover.status === "DRAFT" && (
            <form action={async () => {
              "use server";
              await submitProjectHandover(handover.id);
            }}>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2">
                <Send className="h-4 w-4" />
                Submit to Delivery
              </Button>
            </form>
          )}

          {(handover.status === "SUBMITTED" || handover.status === "DRAFT") && (
            <>
              <form action={async () => {
                "use server";
                await acceptProjectHandover(handover.id);
              }}>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Accept Handover
                </Button>
              </form>

              <form action={async (formData: FormData) => {
                "use server";
                const reason = formData.get("reason") as string || "Incomplete handover notes";
                await rejectProjectHandover(handover.id, reason);
              }}>
                <Button type="submit" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50 font-medium gap-2">
                  <XCircle className="h-4 w-4" />
                  Reject Handover
                </Button>
              </form>
            </>
          )}

          {(handover.status === "ACCEPTED" || handover.status === "PROJECT_CREATED") && !handover.projectId && (
            <form action={async () => {
              "use server";
              await createProjectFromHandover(handover.id);
            }}>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
                <FolderPlus className="h-4 w-4" />
                Create Execution Project
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Commercial & Delivery Scope</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Scope Summary</p>
                <p className="text-slate-800 text-sm mt-1">{handover.deliveryScopeSummary || "No delivery scope summary provided."}</p>
              </div>

              {handover.deliveryNotes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery / Technical Notes</p>
                  <p className="text-slate-800 text-sm mt-1">{handover.deliveryNotes}</p>
                </div>
              )}

              {handover.kickoffRequirements && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kickoff Prerequisites</p>
                  <p className="text-slate-800 text-sm mt-1">{handover.kickoffRequirements}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract Value Snapshot</p>
                  <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                    {handover.currency} {Number(handover.contractValueSnapshot).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{handover.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Handover Scope Items */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Handover Deliverable Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3 text-right">Amount Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {handover.Items && handover.Items.length > 0 ? (
                    handover.Items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-3 font-mono text-xs text-slate-500">{item.code || "-"}</td>
                        <td className="px-6 py-3 font-medium text-slate-900">{item.description}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-700">{Number(item.quantity)}</td>
                        <td className="px-6 py-3 text-right font-mono font-semibold text-slate-900">
                          {handover.currency} {item.amount ? Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No deliverable items breakdown available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar References */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Commercial Upstream Chain</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</p>
                <p className="font-semibold text-slate-900 mt-1">{handover.Client?.name || handover.Client?.company}</p>
                <p className="text-xs text-slate-500 font-mono">{handover.Client?.clientCode}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source Service Sale</p>
                <Link href={`/dashboard/crm/service-sales/${handover.serviceSaleId}`} className="font-mono font-semibold text-indigo-600 hover:underline mt-1 block">
                  {handover.sourceServiceSaleNumberSnapshot}
                </Link>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source Agreement</p>
                <Link href={`/dashboard/crm/agreements/${handover.agreementId}`} className="font-mono font-semibold text-indigo-600 hover:underline mt-1 block">
                  {handover.sourceAgreementNumberSnapshot} (v{handover.agreementVersionSnapshot})
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Project Linkage */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">Execution Project Link</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {handover.Project ? (
                <div>
                  <Badge className="bg-indigo-100 text-indigo-800 font-mono text-xs">
                    {handover.Project.projectNumber || handover.Project.title}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2">Project initialized and ready for execution planning.</p>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  <p>No execution Project linked yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
