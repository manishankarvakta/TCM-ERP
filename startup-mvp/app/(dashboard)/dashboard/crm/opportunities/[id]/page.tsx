import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOpportunityById } from "@/app/actions/crm/opportunity.action";
import { listActivitiesByOpportunity } from "@/app/actions/crm/activity.action";
import { checkPermission } from "@/lib/permissions";
import ActivitySection from "../../activities/_components/ActivitySection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "crm.opportunities", "view");
  if (!canView) {
      return (
        <div className="p-6">
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            You do not have permission to view Opportunities.
          </div>
        </div>
      );
  }



  const [oppResult, activityResult] = await Promise.all([
    getOpportunityById(id),
    listActivitiesByOpportunity(id)
  ]);

  if (!oppResult.success || !oppResult.opportunity) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {oppResult.error || "Opportunity not found"}
        </div>
      </div>
    );
  }

  const opportunity = oppResult.opportunity;
  const activities = activityResult.success ? activityResult.activities : [];

  return (
    <div className="space-y-6 mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/crm/opportunities">
                <ArrowLeftIcon className="h-4 w-4" />
            </Link>
        </Button>
        <div>
           <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{opportunity.title}</h1>
            <Badge variant="outline">{opportunity.stage}</Badge>
           </div>
           <p className="text-muted-foreground text-sm">
             {opportunity.client?.name} • Created on {opportunity.createdAt ? format(new Date(opportunity.createdAt), "PPP") : "-"}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content: Activities & Notes */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <ActivitySection 
                        entityId={opportunity.id} 
                        entityType="opportunity" 
                        activities={activities}
                    />
                </CardContent>
            </Card>
        </div>

        {/* Sidebar: Details */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <span className="text-muted-foreground block">Value</span>
                        <span className="font-semibold text-lg">
                            ${Number(opportunity.value ?? 0).toLocaleString() ?? "0"}
                        </span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block">Expected Close</span>
                        <span>{opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), "PPP") : "-"}</span>
                    </div>
                    
                    <div className="pt-4 border-t">
                        <span className="text-muted-foreground block mb-2">Key Contact</span>
                        {opportunity.contact ? (
                             <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {opportunity.contact.firstName?.[0]}
                                </div>
                                <div>
                                    <div className="font-medium">
                                        {opportunity.contact.firstName} {opportunity.contact.lastName}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {opportunity.contact.email}
                                    </div>
                                </div>
                             </div>
                        ) : (
                            <span className="text-muted-foreground italic">No contact assigned</span>
                        )}
                    </div>

                     <div className="pt-4 border-t">
                        <span className="text-muted-foreground block mb-2">Owner</span>
                         <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                                {opportunity.owner?.name?.[0] || "?"}
                            </div>
                            <span>{opportunity.owner?.name}</span>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
