import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLeadById } from "@/app/actions/crm/lead.action";
import { listActivitiesByLead } from "@/app/actions/crm/activity.action";
import { checkPermission } from "@/lib/permissions";
import ActivitySection from "../../activities/_components/ActivitySection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeftIcon, MailIcon, PhoneIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "crm.leads", "view");
  if (!canView) {
      return (
        <div className="p-6">
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            You do not have permission to view Leads.
          </div>
        </div>
      );
  }

  const { id } = await params;

  const [leadResult, activityResult] = await Promise.all([
    getLeadById(id),
    listActivitiesByLead(id)
  ]);

  if (!leadResult.success || !leadResult.lead) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {leadResult.error || "Lead not found"}
        </div>
      </div>
    );
  }

  const lead = leadResult.lead;
  const activities = activityResult.success ? activityResult.activities : [];

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | null | undefined> = {
    NEW: "default",
    CONTACTED: "secondary",
    QUALIFIED: "success",
    UNQUALIFIED: "destructive",
    CONVERTED: "outline",
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/crm/leads">
                <ArrowLeftIcon className="h-4 w-4" />
            </Link>
        </Button>
        <div>
           <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            <Badge variant={statusColors[lead.status] || "default"}>{lead.status}</Badge>
           </div>
           <p className="text-muted-foreground text-sm">
             {lead.company} • Created on {lead.createdAt ? format(new Date(lead.createdAt), "PPP") : "-"}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content: Activities */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <ActivitySection 
                        entityId={lead.id} 
                        entityType="lead" 
                        activities={activities}
                    />
                </CardContent>
            </Card>
        </div>

        {/* Sidebar: Details */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                     {lead.email && (
                        <div className="flex items-center gap-2">
                            <MailIcon className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${lead.email}`} className="hover:underline">
                                {lead.email}
                            </a>
                        </div>
                    )}
                    {lead.phone && (
                        <div className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${lead.phone}`} className="hover:underline">
                                {lead.phone}
                            </a>
                        </div>
                    )}
                    {lead.company && (
                         <div className="pt-4 border-t">
                            <span className="text-muted-foreground block mb-2">Company</span>
                            <div className="flex items-center gap-2">
                                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{lead.company}</span>
                            </div>
                         </div>
                    )}

                    <div className="pt-4 border-t">
                        <span className="text-muted-foreground block mb-2">Owner</span>
                         <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">
                                {lead.owner?.name?.[0] || "?"}
                            </div>
                            <span>{lead.owner?.name}</span>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
