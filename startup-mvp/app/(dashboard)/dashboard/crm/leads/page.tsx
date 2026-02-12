import LeadManager from "./_components/LeadManager";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getLeads } from "@/app/actions/crm/lead.action";
import { Card, CardContent } from "@/components/ui/card";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const params = await searchParams;
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

  const page = Number(params.page) || 1;
  const search = params.search || "";
  const status = (params.status as any) || "all";

  const [leadsResult, ownersResult, canCreate] = await Promise.all([
    getLeads(page, 100, search, status),
    import("@/app/actions/crm/lead.action").then(mod => mod.getLeadOwners()),
    checkPermission(session.user.id, "crm.leads", "create")
  ]);

  if (!leadsResult.success) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load leads: {leadsResult.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <LeadManager 
        initialLeads={leadsResult.leads || []} 
        initialPagination={leadsResult.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 }} 
        initialOwners={ownersResult.owners || []}
        canCreate={canCreate}
      />
    </div>
  );
}
