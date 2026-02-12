import OpportunityManager from "./_components/OpportunityManager";
import PageGuard from "@/components/permissions/page-guard";

export default function AdminOpportunitiesPage() {
  return (
    <PageGuard permissionKey="crm.opportunities">
      <div className="p-6">
        <OpportunityManager />
      </div>
    </PageGuard>
  );
}
