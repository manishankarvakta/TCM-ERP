import UnitForm from "../_components/unitForm";
import PageGuard from "@/components/permissions/page-guard";

export default function AddUnitPage() {
  return (
    <PageGuard permissionKey="master.units" requiredOperation="create">
      <div className="space-y-6">
        <UnitForm mode="create" />
      </div>
    </PageGuard>
  );
}
