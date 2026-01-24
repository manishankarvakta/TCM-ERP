import { getUnitById } from "../_actions/unit.action";
import UnitForm from "../_components/unitForm";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

interface EditUnitPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditUnitPage({ params }: EditUnitPageProps) {
  const { id } = await params;
  const result = await getUnitById(id);

  if (!result.success || !result.unit) {
    notFound();
  }

  return (
    <PageGuard permissionKey="master.units" requiredOperation="edit">
      <div className="space-y-6">
        <UnitForm
          mode="edit"
          initialData={{
            id: result.unit.id,
            details: result.unit.details,
            symbol: result.unit.symbol,
            status: result.unit.status,
          }}
        />
      </div>
    </PageGuard>
  );
}
