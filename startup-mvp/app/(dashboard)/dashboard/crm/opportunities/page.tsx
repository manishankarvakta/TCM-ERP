import { OpportunityKanban } from "@/components/crm/kanban/OpportunityKanban";
import { getOpportunities } from "@/app/actions/crm/opportunity.action";
import { getActiveClients } from "@/app/actions/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function OpportunitiesPage() {
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

  const [result, clientsResult, canCreate] = await Promise.all([
    getOpportunities(1, 50),
    getActiveClients(),
    checkPermission(session.user.id, "crm.opportunities", "create")
  ]);
  
  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Deals Pipeline</h1>
            <p className="text-muted-foreground">Manage your sales opportunities stages and revenue flow.</p>
         </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {result.success ? (
          <OpportunityKanban 
            initialOpportunities={result.opportunities} 
            initialPagination={result.pagination}
            clients={clientsResult.clients || []}
            canCreate={canCreate}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load opportunities: {result.error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
