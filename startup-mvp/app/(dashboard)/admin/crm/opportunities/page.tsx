import PageGuard from "@/components/permissions/page-guard";

export default function AdminOpportunitiesPage() {
  return (
    <PageGuard permissionKey="crm.opportunities">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Opportunities (Admin)</h1>
        <div className="p-8 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/50">
          <p>Opportunities Module - Coming Soon</p>
        </div>
      </div>
    </PageGuard>
  );
}
