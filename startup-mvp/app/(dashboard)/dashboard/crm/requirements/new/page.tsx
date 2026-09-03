import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createRequirement } from "@/app/actions/crm/requirement.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileCheck } from "lucide-react";
import { RequirementPriority } from "@prisma/client";

interface NewRequirementPageProps {
  searchParams: Promise<{
    opportunityId?: string;
  }>;
}

export default async function NewRequirementPage({ searchParams }: NewRequirementPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { organizationId } = await getTenantContext();
  const params = await searchParams;
  const preselectedOpportunityId = params.opportunityId;

  // Fetch opportunities for selection dropdown
  const opportunities = await prisma.opportunity.findMany({
    where: { organizationId },
    select: {
      id: true,
      title: true,
      opportunityNumber: true,
      clientId: true,
      contactId: true,
      Client: { select: { name: true, company: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  async function handleCreate(formData: FormData) {
    "use server";
    const opportunityId = formData.get("opportunityId") as string;
    const title = formData.get("title") as string;
    const summary = formData.get("summary") as string;
    const businessObjective = formData.get("businessObjective") as string;
    const scopeOverview = formData.get("scopeOverview") as string;
    const priority = (formData.get("priority") as RequirementPriority) || RequirementPriority.MEDIUM;
    const budgetExpectation = formData.get("budgetExpectation") ? parseFloat(formData.get("budgetExpectation") as string) : undefined;

    if (!opportunityId || !title) return;

    const res = await createRequirement({
      opportunityId,
      title,
      summary,
      businessObjective,
      scopeOverview,
      priority,
      budgetExpectation,
    });

    if (res.success && res.requirementId) {
      redirect(`/dashboard/crm/requirements/${res.requirementId}`);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/crm/requirements">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Requirements
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Requirement Package</h1>
          <p className="text-sm text-muted-foreground">Attach a new discovery scope to a commercial Opportunity.</p>
        </div>
      </div>

      <Card className="shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-indigo-600" />
            Requirement Discovery Metadata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1">Associated Commercial Opportunity *</label>
              <select
                name="opportunityId"
                required
                defaultValue={preselectedOpportunityId || ""}
                className="w-full h-10 px-3 border rounded-md text-sm bg-background"
              >
                <option value="" disabled>Select Opportunity...</option>
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.opportunityNumber ? `${opp.opportunityNumber} - ` : ""}{opp.title} ({opp.Client?.company || opp.Client?.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Requirement Title *</label>
              <Input
                name="title"
                required
                placeholder="e.g. ERP System Requirements & Core Scope"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Priority</label>
                <select name="priority" defaultValue="MEDIUM" className="w-full h-10 px-3 border rounded-md text-sm bg-background">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Client Budget Expectation (BDT / ৳)</label>
                <Input
                  name="budgetExpectation"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500000"
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Executive Summary</label>
              <Textarea
                name="summary"
                rows={2}
                placeholder="High-level summary of what the client wants to achieve..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Business Objectives</label>
              <Textarea
                name="businessObjective"
                rows={3}
                placeholder="What key business outcomes or KPIs must be met by this solution?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">High-Level Scope Overview</label>
              <Textarea
                name="scopeOverview"
                rows={3}
                placeholder="Overview of included vs excluded scope domains..."
              />
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Link href="/dashboard/crm/requirements">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Create & Continue to Builder
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
