import ChartOfAccountForm from "../_components/chart-of-accounts-form";
import PageGuard from "@/components/permissions/page-guard";

export default function AddChartOfAccountPage() {
  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <ChartOfAccountForm mode="create" />
      </div>
    </PageGuard>
  );
}

