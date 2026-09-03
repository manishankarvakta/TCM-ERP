import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTenantAccess } from "@/lib/tenant-context";
import { createApprovalPolicyAction } from "@/app/actions/crm/approval-operations.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiShield, FiPlus, FiCheckCircle } from "react-icons/fi";
import { ApprovalSourceType, ApprovalMode } from "@prisma/client";

export default async function ApprovalPoliciesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

// @ts-expect-error - Legacy compatibility
  const tenantContext = await verifyTenantAccess();
// @ts-expect-error - Legacy compatibility
  const organizationId = tenantContext.organizationId;

  const policies = await prisma.approvalPolicy.findMany({
    where: { organizationId },
    include: {
      Steps: { orderBy: { sequence: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  async function handleCreateDefaultPolicy(formData: FormData) {
    "use server";
    const sourceType = formData.get("sourceType") as ApprovalSourceType;
    const name = formData.get("name") as string;
    if (sourceType && name) {
      await createApprovalPolicyAction({
        name,
        code: `POL_${sourceType}_${Date.now().toString().slice(-4)}`,
        sourceType,
        steps: [
          { sequence: 1, name: "Step 1: Department Manager Sign-off", approvalMode: ApprovalMode.ANY, minimumApprovals: 1 },
          { sequence: 2, name: "Step 2: Executive Final Review", approvalMode: ApprovalMode.ANY, minimumApprovals: 1 },
        ],
      });
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/dashboard/approvals" className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground mb-3">
          <FiArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Approvals
        </Link>
        <div className="flex items-center justify-between border-b border-border/60 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FiShield className="h-5 w-5 text-primary" /> Approval Workflow Policies
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Configure multi-step tenant approval chains for ERP completion handoffs.</p>
          </div>
        </div>
      </div>

      {/* Quick Policy Generator */}
      <Card className="shadow-sm border-dashed">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">Create Workflow Policy</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <form action={handleCreateDefaultPolicy} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Policy Name</label>
              <input type="text" name="name" required placeholder="e.g. Standard QA Completion Policy" className="w-full text-xs px-3 py-2 rounded border border-border bg-background" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Source Module Handoff</label>
              <select name="sourceType" required className="w-full text-xs px-3 py-2 rounded border border-border bg-background">
                <option value="CREATIVE_COMPLETION">CREATIVE_COMPLETION</option>
                <option value="MARKETING_COMPLETION">MARKETING_COMPLETION</option>
                <option value="DEVELOPMENT_COMPLETION">DEVELOPMENT_COMPLETION</option>
                <option value="QA_COMPLETION">QA_COMPLETION</option>
                <option value="UAT_READINESS">UAT_READINESS</option>
              </select>
            </div>
            <Button type="submit" size="sm" className="shrink-0">
              <FiPlus className="mr-1 h-4 w-4" /> Add Policy
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Configured Policies */}
      <div className="space-y-4">
        {policies.map((pol) => (
          <Card key={pol.id} className="shadow-sm">
            <CardHeader className="py-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{pol.name}</CardTitle>
                  <CardDescription className="text-xs font-mono mt-0.5">Code: {pol.code} | Source: {pol.sourceType}</CardDescription>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span>
              </div>
            </CardHeader>
            <CardContent className="py-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configured Policy Steps ({pol.Steps.length}):</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pol.Steps.map((step) => (
                  <div key={step.id} className="p-3 rounded border border-border/60 bg-muted/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Step {step.sequence}: {step.name}</span>
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{step.approvalMode}</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">Minimum approvals: {step.minimumApprovals}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
