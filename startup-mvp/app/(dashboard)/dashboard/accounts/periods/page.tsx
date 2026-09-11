import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { listPeriods } from "./_actions/period.action";
import PeriodsListView from "./_components/periods-list-view";

export default async function AccountingPeriodsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const organizationId = (session?.user as any)?.organizationId;

  const canCreate = userId
    ? await hasPermission(userId, "accounts.periods", "create")
    : false;

  const { periods = [] } = await listPeriods(organizationId);

  return (
    <PageGuard permissionKey="accounts.periods">
      <PeriodsListView initialPeriods={periods} canCreate={canCreate} />
    </PageGuard>
  );
}
