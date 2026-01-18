import { getChartOfAccountById } from "../../_actions/chart-of-accounts.action";
import ChartOfAccountForm from "../../_components/chart-of-accounts-form";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

interface EditChartOfAccountPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditChartOfAccountPage({ params }: EditChartOfAccountPageProps) {
  const { id } = await params;
  const result = await getChartOfAccountById(id);

  if (!result.success || !result.account) {
    notFound();
  }

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <ChartOfAccountForm
          mode="edit"
          initialData={{
            id: result.account.id,
            code: result.account.code,
            name: result.account.name,
            type: result.account.type,
            parentId: result.account.parentId,
            description: result.account.description,
            status: result.account.status,
          }}
        />
      </div>
    </PageGuard>
  );
}

