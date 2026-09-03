import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequirement } from "@/app/actions/crm/requirement.action";
import { createEstimation } from "@/app/actions/crm/estimation.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calculator, ShieldAlert, CheckCircle2 } from "lucide-react";

interface NewEstimationPageProps {
  searchParams: Promise<{
    requirementId?: string;
  }>;
}

export default async function NewEstimationPage({ searchParams }: NewEstimationPageProps) {
  const params = await searchParams;
  const requirementId = params.requirementId;

  if (!requirementId) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
            <div>
              <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-300">Requirement Mandatory</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Internal Estimations must originate from a confirmed Requirement package that is marked Ready for Estimation.
              </p>
              <Button asChild className="mt-4 bg-amber-700 hover:bg-amber-800 text-white">
                <Link href="/dashboard/crm/requirements">Select a Requirement Package</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reqRes = await getRequirement(requirementId);
  if (!reqRes.success || !reqRes.requirement) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-lg text-destructive">Requirement Not Found</h3>
              <p className="text-sm text-muted-foreground">{reqRes.error || "The selected requirement does not exist."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requirement = reqRes.requirement;

  if (requirement.status !== "READY_FOR_ESTIMATION") {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Button asChild variant="ghost">
          <Link href={`/dashboard/crm/requirements/${requirement.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Requirement
          </Link>
        </Button>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300 font-semibold text-lg">
              <ShieldAlert className="h-6 w-6" /> Requirement Readiness Required
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Requirement <strong>{requirement.requirementNumber}</strong> is currently in status <strong>{requirement.status}</strong>.
              It must be reviewed and marked <strong>READY_FOR_ESTIMATION</strong> before an internal estimation can be created.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleCreateEstimation(formData: FormData) {
    "use server";
    const reqId = formData.get("requirementId") as string;
    const title = formData.get("title") as string;
    const currency = formData.get("currency") as string;
    const targetMarginPercent = parseFloat(formData.get("targetMarginPercent") as string || "20");
    const notes = formData.get("notes") as string;
    const assumptions = formData.get("assumptions") as string;
    const riskNotes = formData.get("riskNotes") as string;

    const res = await createEstimation({
      requirementId: reqId,
      title,
      currency,
      targetMarginPercent,
      notes,
      assumptions,
      riskNotes,
    });

    if (res.success && res.estimationId) {
      redirect(`/dashboard/crm/estimations/${res.estimationId}`);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost">
        <Link href={`/dashboard/crm/requirements/${requirement.id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Requirement
        </Link>
      </Button>

      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Internal Estimation</h1>
          <p className="text-muted-foreground mt-1">
            Initialize commercial costing package for {requirement.requirementNumber} ({requirement.Client?.company || requirement.Client?.name}).
          </p>
        </div>
      </div>

      <Card className="border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20">
        <CardContent className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="font-semibold text-sm">Source Requirement Package</div>
              <div className="text-xs text-muted-foreground">
                {requirement.title} ({requirement.requirementNumber})
              </div>
            </div>
          </div>
          <div className="text-xs font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-1 rounded">
            READY_FOR_ESTIMATION
          </div>
        </CardContent>
      </Card>

      <Card>
        <form action={handleCreateEstimation}>
          <input type="hidden" name="requirementId" value={requirement.id} />
          <CardHeader>
            <CardTitle>Estimation Details</CardTitle>
            <CardDescription>
              Internal work breakdown, contingency buffer, and commercial selling target.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Estimation Title *</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={`Estimation - ${requirement.title}`}
                placeholder="e.g. Estimation - E-Commerce Platform"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue="TK"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="TK">BDT (TK)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetMarginPercent">Target Commercial Margin %</Label>
                <Input
                  id="targetMarginPercent"
                  name="targetMarginPercent"
                  type="number"
                  step="0.01"
                  defaultValue="20.00"
                  placeholder="20.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assumptions">Internal Assumptions</Label>
              <Textarea
                id="assumptions"
                name="assumptions"
                rows={3}
                placeholder="e.g. Existing API available; 2 design iterations included; client content provided by week 2."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskNotes">Risk Buffer & Technical Contingencies</Label>
              <Textarea
                id="riskNotes"
                name="riskNotes"
                rows={2}
                placeholder="e.g. Legacy database migration risk; third-party payment gateway latency."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Management / Reviewer Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Internal confidential notes for management review..."
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t pt-4">
            <Button asChild variant="outline">
              <Link href={`/dashboard/crm/requirements/${requirement.id}`}>Cancel</Link>
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Initialize Work Breakdown
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
