import { auth } from "@/lib/auth";
import { getLeads, getLeadOwners } from "@/app/actions/crm/lead.action";
import { hasPermission } from "@/lib/permissions";
import LeadManager from "./_components/LeadManager";
import PageGuard from "@/components/permissions/page-guard";

interface LeadsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function AdminLeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const [leadsResult, ownersResult, canCreate] = await Promise.all([
    getLeads(page, 10, search, "all"),
    getLeadOwners(),
    hasPermission(userId, "crm.leads", "create"),
  ]);

  return (
    <PageGuard permissionKey="crm.leads">
      <div className="p-6">
        <LeadManager
          initialLeads={leadsResult.leads || []}
          initialPagination={leadsResult.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
          initialOwners={ownersResult.owners || []}
          canCreate={canCreate}
        />
      </div>
    </PageGuard>
  );
}
