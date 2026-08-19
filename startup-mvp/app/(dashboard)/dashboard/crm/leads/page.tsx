import { auth } from "@/lib/auth";
import { getLeads, getLeadOwners, getActiveCategories, getLeadSources } from "@/app/actions/crm/lead.action";
import { hasPermission } from "@/lib/permissions";
import LeadManager from "./_components/LeadManager";
import PageGuard from "@/components/permissions/page-guard";

interface LeadsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    owner?: string;
    category?: string;
    source?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AdminLeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const owner = params.owner || "all";
  const category = params.category || "all";
  const source = params.source || "all";
  const status = params.status || "all";
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = params.sortOrder || "desc";
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const [leadsResult, ownersResult, categoriesResult, sourcesResult, canCreate] = await Promise.all([
    getLeads(page, 10, search, status, sortBy, sortOrder, dateFrom, dateTo, false, owner, category, source),
    getLeadOwners(),
    getActiveCategories(),
    getLeadSources(),
    hasPermission(userId, "crm.leads", "create"),
  ]);

  return (
    <PageGuard permissionKey="crm.leads">
      <div className="">
        <LeadManager
          initialLeads={leadsResult.leads || []}
          initialPagination={leadsResult.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
          initialOwners={ownersResult.owners || []}
          canCreate={canCreate}
          categories={categoriesResult.categories || []}
          sources={sourcesResult.sources || []}
        />
      </div>
    </PageGuard>
  );
}
